"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { registerLocale } from "react-datepicker";
import { ru } from "date-fns/locale";

registerLocale("ru", ru);

import { supabase } from "../../../lib/supabase";

function toBookingDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

export default function ItemPage() {
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<any>(null);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);

  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [relatedItems, setRelatedItems] = useState<any[]>([]);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activeImage, setActiveImage] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    loadItem();
    loadBookings();
    loadReviews();
    checkFavorite();
  }, [id]);

  useEffect(() => {
  if (item?.owner_id) {
    loadOwnerProfile();
  }

  if (item?.category) {
    loadRelatedItems();
  }
}, [item]);

async function loadRelatedItems() {
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("category", item.category)
    .neq("id", item.id)
    .limit(4);

  setRelatedItems(data || []);
}

  async function loadItem() {
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  setItem(data);
  setActiveImage(data?.image || "");
}
  

  async function loadOwnerProfile() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", item.owner_id)
      .single();

    setOwnerProfile(data);
  }

  async function loadBookings() {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("item_id", id);

    setBookings(data || []);
  }

  async function loadReviews() {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("item_id", id)
      .order("created_at", { ascending: false });

    setReviews(data || []);
  }

  async function checkFavorite() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) return;

    const { data: favorite } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .eq("item_id", id)
      .maybeSingle();

    setIsFavorite(!!favorite);
  }

  async function toggleFavorite() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      alert("Войдите");
      return;
    }

    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", id);

      setIsFavorite(false);
    } else {
      await supabase.from("favorites").insert([
        {
          user_id: user.id,
          item_id: id,
        },
      ]);

      setIsFavorite(true);
    }
  }

  async function handleBooking() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      alert("Войдите в аккаунт");
      return;
    }

    if (!startDate || !endDate) {
      alert("Выберите даты");
      return;
    }

    const normalizedStartDate = toBookingDate(startDate);
    const normalizedEndDate = toBookingDate(endDate);

    const hasConflict = bookings.some((booking: any) => {
      return (
        normalizedStartDate <= new Date(booking.end_date) &&
        normalizedEndDate >= new Date(booking.start_date)
      );
    });

    if (hasConflict) {
      alert("Эти даты уже заняты");
      return;
    }

    const { error } = await supabase.from("bookings").insert([
      {
        item_id: item.id,
        renter_id: user.id,
        start_date: normalizedStartDate.toISOString(),
        end_date: normalizedEndDate.toISOString(),
        status: "pending",
        payment_status: "unpaid",
      },
    ]);

    if (error) {
      console.log("BOOKING ERROR:", error);
      alert("Ошибка бронирования");
      return;
    }

    await supabase.from("notifications").insert([
      {
        user_id: item.owner_id,
        type: "booking",
        text: `Новая заявка на аренду: ${item.name}. Проверьте даты и подтвердите бронь в личном кабинете.`,
        link: "/profile",
      },
    ]);

    alert("Бронирование отправлено");

    loadBookings();
    setStartDate(null);
    setEndDate(null);
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] px-6 pb-32 pt-32 text-[#111111] lg:pb-20">
        Загрузка...
      </main>
    );
  }
function getRentalDays() {
  if (!startDate || !endDate) return 0;

  const diff =
    endDate.getTime() - startDate.getTime();

  return Math.max(
    1,
    Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
  );
}

function getTotalPrice() {
  const days = getRentalDays();
  const pricePerDay = Number(item.price) || 0;

  return days * pricePerDay;
}

function getDepositAmount() {
  return Number(item.deposit) || 0;
}

function getTotalWithDeposit() {
  return getTotalPrice() + getDepositAmount();
}

const ownerDisplayName =
  ownerProfile?.full_name ||
  ownerProfile?.username ||
  ownerProfile?.email ||
  "Пользователь";
const latitude = Number(item.latitude);
const longitude = Number(item.longitude);
const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
const mapSrc = hasCoordinates
  ? `https://yandex.ru/map-widget/v1/?ll=${longitude},${latitude}&z=16&pt=${longitude},${latitude},pm2grm`
  : `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(item.location || "Россия")}&z=15`;

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-4 pb-44 pt-28 text-[#111111] sm:px-6 lg:pb-20 lg:pt-32">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* LEFT */}
        <div>
          <button
  onClick={() => setGalleryOpen(true)}
  className="block w-full overflow-hidden rounded-[28px] bg-white shadow-xl lg:rounded-[36px]"
>
  <img
    src={activeImage || item.image}
    alt={item.name}
    className="h-[330px] w-full object-cover sm:h-[420px] lg:h-[620px]"
  />
</button>
<div className="mt-4 flex gap-3 overflow-x-auto pb-1">
  {(item.images?.length ? item.images : [item.image]).map(
  (img: string, index: number) => (
    <button
      key={index}
      onClick={() => setActiveImage(img)}
      className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 transition sm:h-20 sm:w-20 ${
        activeImage === img
          ? "border-[#7BC47F]"
          : "border-transparent"
      }`}
    >
      <img
        src={img}
        alt=""
        className="h-full w-full object-cover"
      />
    </button>
  )
)}
</div>

          <p className="mt-4 break-words text-sm leading-6 text-[#6B6B6B] sm:text-base">
            📍 {item.location}
          </p>

          <div className="mt-8 overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm lg:mt-10 lg:rounded-[32px]">
  <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
    {/* OWNER INFO */}
    <div className="min-w-0 overflow-hidden p-5 sm:p-6 lg:p-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4 lg:gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] text-2xl font-black text-white lg:h-20 lg:w-20 lg:text-4xl">
          {ownerProfile?.avatar ? (
            <img
              src={ownerProfile.avatar}
              className="h-full w-full object-cover"
              alt="Владелец"
            />
          ) : (
            ownerProfile?.full_name?.[0] ||
            ownerProfile?.email?.[0] ||
            "П"
          )}
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="text-sm text-[#6B6B6B]">
            Владелец
          </div>

          <a
            href={`/user/${item.owner_id}`}
            className="block max-w-full break-words text-xl font-black leading-tight sm:text-2xl lg:text-4xl"
            title={ownerDisplayName}
          >
            {ownerDisplayName}
          </a>
        </div>
      </div>

      <div className="mt-7 grid min-w-0 gap-3 text-base text-[#111111] sm:text-[17px]">
        {ownerProfile?.verified && (
  <div className="flex min-w-0 items-start gap-3 leading-snug">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#7BC47F] text-[#7BC47F]">
      ✓
    </span>

    <span className="min-w-0">Проверенный профиль</span>
  </div>
)}

{ownerProfile?.phone_verified && (
  <div className="flex min-w-0 items-start gap-3 leading-snug">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#7BC47F] text-[#7BC47F]">
      📱
    </span>

    <span className="min-w-0">Телефон подтверждён</span>
  </div>
)}
        <div className="flex min-w-0 items-start gap-3 leading-snug">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#7BC47F] text-[#7BC47F]">
            ✓
          </span>
          <span className="min-w-0">Профиль подтверждён</span>
        </div>

        <div className="flex min-w-0 items-start gap-3 leading-snug">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#7BC47F] text-[#7BC47F]">
            💬
          </span>
          <span className="min-w-0">Быстро отвечает на сообщения</span>
        </div>

        <div className="flex min-w-0 items-start gap-3 leading-snug">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#7BC47F] text-[#7BC47F]">
            📍
          </span>
          <span className="min-w-0 break-words leading-snug">{item.location || "Адрес не указан"}</span>
        </div>

        <div className="flex min-w-0 items-start gap-3 leading-snug">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#7BC47F] text-[#7BC47F]">
            🛡
          </span>
          <span className="min-w-0">
            Сделка защищена правилами сервиса
          </span>
        </div>
      </div>

      <a
        href={`/chat/${item.id}?owner=${item.owner_id}`}
        className="mt-8 block rounded-full border border-[#7BC47F] px-6 py-4 text-center font-bold text-[#111111] transition hover:bg-[#7BC47F] hover:text-white"
      >
        Написать владельцу
      </a>
    </div>

    {/* MAP */}
    <div className="relative min-h-[260px] overflow-hidden border-t border-black/5 bg-[#F7F7F5] lg:border-l lg:border-t-0">
      <iframe
        src={mapSrc}
        title={`Адрес передачи: ${item.location || "Россия"}`}
        className="h-full min-h-[320px] w-full border-0"
        loading="lazy"
      />
      {item.location && (
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/95 px-4 py-3 text-sm font-bold leading-5 text-[#111111] shadow-lg backdrop-blur">
          📍 {item.location}
        </div>
      )}
    </div>
  </div>
</div>

          <div className="mt-6 rounded-[28px] bg-white p-5 shadow-sm sm:p-6 lg:p-8">
            <h2 className="text-2xl font-black lg:text-3xl">Описание</h2>

            <p className="mt-5 break-words text-base leading-relaxed text-[#555555] sm:text-lg">
              {item.description || "Описание не указано"}
            </p>
          </div>

          <div className="mt-8 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6 lg:mt-10 lg:rounded-[32px] lg:p-8">
            <h2 className="text-2xl font-black">Отзывы</h2>

            <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">
              Отзыв о вещи может оставить только арендатор после завершения возврата.
            </p>

            <div className="mt-6 space-y-4">
              {reviews.length === 0 ? (
                <div className="text-[#6B6B6B]">Пока нет отзывов</div>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl bg-[#F7F7F5] p-5"
                  >
                    <div className="text-xl text-[#7BC47F]">
                      {"★".repeat(review.rating)}
                    </div>

                    <p className="mt-3 text-[#555555]">{review.text}</p>

                    <div className="mt-4 text-sm text-[#8D8D8D]">
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="h-fit">
          <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-lg">
            <h1 className="text-2xl font-black leading-tight lg:text-4xl">
  {item.name}
</h1>
            

            <button
              onClick={toggleFavorite}
              className={`mt-5 w-full rounded-full px-5 py-3.5 text-sm font-bold transition ${
                isFavorite
                  ? "border border-[#7BC47F] bg-[#F1FAF2] text-[#3F9E47]"
                  : "border border-black/10 bg-white text-[#555555] hover:bg-[#F7F7F5]"
              }`}
            >
              {isFavorite ? "❤️ В избранном" : "🤍 В избранное"}
            </button>

            <div className="mt-5 rounded-[26px] bg-[#F7F7F5] p-5">
              <h2 className="mb-4 text-xl font-black">
                Выберите даты
              </h2>
<div className="item-booking-calendar mx-auto w-full max-w-[280px] overflow-visible">
              <DatePicker
              locale="ru"
calendarStartDay={1}
                selected={startDate}
                onChange={(dates) => {
                  if (!dates) return;

                  const [start, end] = dates as [Date | null, Date | null];

                  setStartDate(start);
                  setEndDate(end);
                }}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                inline
                excludeDateIntervals={bookings.map((booking) => ({
                  start: new Date(booking.start_date),
                  end: new Date(booking.end_date),
                }))}
              />
            </div></div>
<div className="mt-5 rounded-[24px] border border-black/5 bg-white p-4 shadow-sm">
  <div className="flex items-start justify-between gap-4">
    <div>
      <div className="text-sm font-bold uppercase tracking-wide text-[#8D8D8D]">
        Цена
      </div>
      <div className="mt-1 text-2xl font-black tracking-tight">
        {Number(item.price) || 0} ₽
      </div>
      <div className="mt-1 text-sm text-[#6B6B6B]">
        за день аренды
      </div>
    </div>

    {getDepositAmount() > 0 && (
      <div className="rounded-2xl bg-[#F7F7F5] px-4 py-3 text-right">
        <div className="text-xs font-bold uppercase text-[#8D8D8D]">
          Залог
        </div>
        <div className="mt-1 text-xl font-black">
          {getDepositAmount()} ₽
        </div>
      </div>
    )}
  </div>

  {startDate && endDate ? (
    <div className="mt-6 space-y-3 border-t border-black/10 pt-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#6B6B6B]">
          {getRentalDays()} дн. аренды
        </span>
        <span className="font-bold">
          {getTotalPrice()} ₽
        </span>
      </div>

      {getDepositAmount() > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#6B6B6B]">
            Возвратный залог
          </span>
          <span className="font-bold">
            {getDepositAmount()} ₽
          </span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-black/10 pt-4">
        <span className="font-bold">Итого</span>
        <span className="text-2xl font-black">
          {getTotalWithDeposit()} ₽
        </span>
      </div>

      <button
        onClick={() => {
          setStartDate(null);
          setEndDate(null);
        }}
        className="text-sm font-bold text-[#7BC47F]"
      >
        Очистить даты
      </button>
    </div>
  ) : (
    <div className="mt-6 rounded-2xl bg-[#F7F7F5] p-4 text-sm leading-relaxed text-[#6B6B6B]">
      Выберите даты в календаре, чтобы увидеть итоговую стоимость.
    </div>
  )}
</div>
            <button
  onClick={handleBooking}
  className="mt-5 w-full rounded-full bg-[#7BC47F] px-5 py-4 text-base font-bold text-white transition hover:bg-[#69B56E]"
>
  Забронировать
</button>

            <a
              href={`/chat/${item.id}?owner=${item.owner_id}`}
              className="mt-4 block w-full rounded-full border border-black/10 bg-white py-4 text-center text-base font-bold transition hover:bg-[#F7F7F5]"
            >
              Написать владельцу
            </a>
          </div>

          <div className="mt-6 rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Занятые даты</h2>

            <div className="mt-4 space-y-3">
              {bookings.length === 0 ? (
                <div className="text-[#6B6B6B]">Пока свободно</div>
              ) : (
                bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-xl bg-[#F7F7F5] p-4 text-sm"
                  >
                    📅 {new Date(booking.start_date).toLocaleDateString()} →{" "}
                    {new Date(booking.end_date).toLocaleDateString()}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {/* RELATED ITEMS */}
{relatedItems.length > 0 && (
  <section className="mx-auto mt-20 max-w-7xl">
    <h2 className="mb-8 text-2xl font-black">
      Похожие вещи
    </h2>

    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {relatedItems.map((related) => (
        <a
          key={related.id}
          href={`/item/${related.id}`}
          className="group block"
        >
          <div className="relative min-w-[260px] overflow-hidden rounded-[28px] bg-white shadow-sm transition hover:-translate-y-1">
            <img
              src={related.image}
              alt={related.name}
              className="h-[225px] w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm">
  ♡
</div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            <div className="absolute bottom-4 left-4 text-white">
              <div className="text-lg font-black">
                {related.name}
              </div>

              <div className="mt-1 text-sm text-white/80">
                {related.price} ₽ / день
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  </section>
)}
      {galleryOpen && (
  <div className="fixed inset-0 z-[200] bg-black/95 px-6 py-8 text-white">
    <button
      onClick={() => setGalleryOpen(false)}
      className="absolute right-8 top-6 text-4xl"
    >
      ×
    </button>

    <div className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center">
      <img
        src={activeImage || item.image}
        alt={item.name}
        className="max-h-[75vh] max-w-full rounded-[32px] object-contain"
      />

      <div className="mt-6 flex gap-3 overflow-x-auto">
        {(item.images?.length ? item.images : [item.image]).map(
          (img: string, index: number) => (
            <button
              key={index}
              onClick={() => setActiveImage(img)}
              className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 ${
                activeImage === img
                  ? "border-[#7BC47F]"
                  : "border-white/20"
              }`}
            >
              <img
                src={img}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          )
        )}
      </div>
    </div>
  </div>
)}

{/* MOBILE BOOKING BAR */}
<div className="fixed bottom-[76px] left-0 right-0 z-[90] border-t border-black/10 bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <div className="truncate text-lg font-black">
        {startDate && endDate
          ? `${getTotalPrice()} ₽`
          : `${item.price} ₽`}
      </div>

      <div className="text-xs text-[#6B6B6B]">
        {startDate && endDate
          ? `За ${getRentalDays()} дн.`
          : "за день аренды"}
      </div>
    </div>

    <button
      onClick={handleBooking}
      className="shrink-0 rounded-full bg-[#7BC47F] px-6 py-4 text-sm font-bold text-white"
    >
      Забронировать
    </button>
  </div>
</div>
{/* RELATED ITEMS */}
<section className="mt-16 lg:mt-24">
  <h2 className="text-2xl font-black lg:text-3xl">
    Похожие вещи
  </h2>

  <div className="mt-6 flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
    {relatedItems.map((related) => (
      <a
        key={related.id}
        href={`/item/${related.id}`}
        className="min-w-[260px] overflow-hidden rounded-[28px] bg-white shadow-sm transition hover:-translate-y-1"
      >
        <img
          src={related.image}
          className="h-48 w-full object-cover"
        />

        <div className="p-4">
          <h3 className="line-clamp-1 text-lg font-black">
            {related.name}
          </h3>

          <p className="mt-1 text-sm text-[#6B6B6B]">
            📍 {related.location}
          </p>

          <div className="mt-4 text-2xl font-black">
            {related.price} ₽
          </div>
        </div>
      </a>
    ))}
  </div>
</section>
    </main>
  );
}

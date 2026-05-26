"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { registerLocale } from "react-datepicker";
import { ru } from "date-fns/locale";

registerLocale("ru", ru);

import { supabase } from "../../../lib/supabase";

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

  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);

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

    const hasConflict = bookings.some((booking: any) => {
      return (
        startDate <= new Date(booking.end_date) &&
        endDate >= new Date(booking.start_date)
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
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: "pending",
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
        text: `Новая бронь: ${item.name}`,
        link: "/profile",
      },
    ]);

    alert("Бронирование отправлено");

    loadBookings();
    setStartDate(null);
    setEndDate(null);
  }

  async function handleReview() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      alert("Войдите в аккаунт");
      return;
    }

    const { error } = await supabase.from("reviews").insert([
      {
        item_id: item.id,
        owner_id: item.owner_id,
        author_id: user.id,
        rating,
        text: reviewText,
      },
    ]);

    if (error) {
      console.log(error);
      alert("Ошибка отзыва");
      return;
    }

    setReviewText("");
    setRating(5);
    loadReviews();
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
  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-32 pt-28 text-[#111111] lg:pb-20 lg:pt-32">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[1fr_420px]">
        {/* LEFT */}
        <div>
          <button
  onClick={() => setGalleryOpen(true)}
  className="block w-full overflow-hidden rounded-[36px] bg-white shadow-xl"
>
  <img
    src={activeImage || item.image}
    alt={item.name}
    className="h-[360px] w-full object-cover lg:h-[620px]"
  />
</button>
<div className="mt-4 flex gap-3">
  {(item.images?.length ? item.images : [item.image]).map(
  (img: string, index: number) => (
    <button
      key={index}
      onClick={() => setActiveImage(img)}
      className={`h-20 w-20 overflow-hidden rounded-2xl border-2 transition ${
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

          <p className="mt-4 text-lg text-[#6B6B6B]">
            📍 {item.location}
          </p>

          <div className="mt-10 overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">
  <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
    {/* OWNER INFO */}
    <div className="p-8">
      <div className="flex items-start gap-4 lg:items-center lg:gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7BC47F] text-2xl font-black text-white lg:h-24 lg:w-24 lg:text-5xl">
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

        <div>
          <div className="text-sm text-[#6B6B6B]">
            Владелец
          </div>

          <a
            href={`/user/${item.owner_id}`}
            className="max-w-[190px] truncate text-2xl font-black leading-tight lg:max-w-none lg:text-5xl"
          >
            {ownerProfile?.full_name || "Пользователь"}
          </a>
        </div>
      </div>

      <div className="mt-8 grid gap-4 text-lg text-[#111111]">
        <div className="flex items-start gap-3 text-base leading-snug lg:text-xl">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#7BC47F] text-[#7BC47F]">
            ✓
          </span>
          <span>Профиль подтверждён</span>
        </div>

        <div className="flex items-start gap-3 text-base leading-snug lg:text-xl">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#7BC47F] text-[#7BC47F]">
            💬
          </span>
          <span>Быстро отвечает на сообщения</span>
        </div>

        <div className="flex items-start gap-3 text-base leading-snug lg:text-xl">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#7BC47F] text-[#7BC47F]">
            📍
          </span>
          <span>{item.location}</span>
        </div>

        <div className="flex items-start gap-3 text-base leading-snug lg:text-xl">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#7BC47F] text-[#7BC47F]">
            🛡
          </span>
          <span>
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
    <div className="min-h-[260px] overflow-hidden bg-[#F7F7F5]">
      <iframe
        src={`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(
          item.location || "Россия"
        )}&z=13`}
        className="h-full min-h-[320px] w-full border-0"
      />
    </div>
  </div>
</div>

          <div className="mt-6 rounded-[28px] bg-white p-6 shadow-sm lg:p-8">
            <h2 className="text-2xl font-black lg:text-3xl">Описание</h2>

            <p className="mt-5 text-lg leading-relaxed text-[#555555]">
              {item.description || "Описание не указано"}
            </p>
          </div>

          <div className="mt-10 rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black">Отзывы</h2>

            <div className="mt-6 space-y-4">
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full rounded-2xl bg-[#F7F7F5] p-4 outline-none"
              >
                <option value={5}>★★★★★</option>
                <option value={4}>★★★★</option>
                <option value={3}>★★★</option>
                <option value={2}>★★</option>
                <option value={1}>★</option>
              </select>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Напишите отзыв..."
                className="min-h-[120px] w-full rounded-2xl bg-[#F7F7F5] p-4 outline-none"
              />

              <button
                onClick={handleReview}
                className="rounded-full bg-[#7BC47F] px-8 py-4 font-bold text-white transition hover:bg-[#69B56E]"
              >
                Оставить отзыв
              </button>
            </div>

            <div className="mt-10 space-y-4">
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
        <div className="h-fit lg:sticky lg:top-32">
          <div className="sticky top-28 rounded-[32px] border border-black/5 bg-white p-8 shadow-xl">
            <h1 className="text-3xl font-black leading-tight lg:text-5xl">
  {item.name}
</h1>
            

            <button
              onClick={toggleFavorite}
              className={`mt-6 w-full rounded-full px-6 py-5 text-lg font-bold transition ${
                isFavorite
                  ? "bg-[#7BC47F] text-white"
                  : "border border-black/10 bg-white text-[#111111]"
              }`}
            >
              {isFavorite ? "❤️ В избранном" : "🤍 В избранное"}
            </button>

            <div className="rounded-[32px] bg-[#F7F7F5] p-5 lg:p-8">
              <h2 className="mb-6 text-2xl font-black">
                Выберите даты
              </h2>
<div className="mx-auto w-full max-w-[330px] overflow-visible">
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
<div className="mt-6">
  <div className="text-sm font-bold uppercase tracking-wide text-[#8D8D8D]">
    Цены
  </div>

  <div className="grid grid-cols-3 gap-3">
    <div className="rounded-[24px] border border-black/10 bg-white p-4 text-center">
      <div className="text-2xl font-black leading-tight lg:text-3xl">
        {item.price} ₽
      </div>
      <div className="mt-1 text-xs leading-snug text-[#6B6B6B] lg:text-sm">
  за день
</div>
      <div className="mt-1 text-sm text-[#6B6B6B]">
        1 день
      </div>
    </div>

    <div className="rounded-2xl border border-black/10 bg-white p-4 text-center">
      <div className="text-2xl font-black">
        {Number(item.price) * 3} ₽
      </div>
      <div className="mt-1 text-sm text-[#6B6B6B]">
        3 дня
      </div>
    </div>

    <div className="rounded-2xl border border-black/10 bg-white p-4 text-center">
      <div className="text-2xl font-black">
        {Number(item.price) * 7} ₽
      </div>
      <div className="mt-1 text-sm text-[#6B6B6B]">
        7 дней
      </div>
    </div>
  </div>
</div>
{startDate && endDate && (
  <div className="mt-6 border-t border-black/10 pt-6 text-center">
    <div className="text-4xl font-black">
      {getTotalPrice()} ₽
    </div>

    <div className="mt-2 text-[#6B6B6B]">
      За {getRentalDays()} дн. аренды
    </div>

    <button
      onClick={() => {
        setStartDate(null);
        setEndDate(null);
      }}
      className="mt-4 text-sm font-bold text-[#7BC47F]"
    >
      Очистить даты
    </button>
  </div>
)}
            <button
  onClick={handleBooking}
  className="mt-5 w-full rounded-full bg-[#7BC47F] px-6 py-5 text-lg font-bold text-white transition hover:bg-[#69B56E]"
>
  Забронировать
</button>

            <a
              href={`/chat/${item.id}?owner=${item.owner_id}`}
              className="mt-6 block w-full rounded-full border border-black/10 bg-white py-4 text-center text-base font-bold transition hover:bg-[#F7F7F5] lg:py-5 lg:text-lg"
            >
              Написать владельцу
            </a>
          </div>

          <div className="mt-8 rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
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
    <h2 className="mb-8 text-3xl font-black">
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
<div className="fixed bottom-0 left-0 right-0 z-[90] border-t border-black/10 bg-white p-4 shadow-2xl lg:hidden">
  <div className="flex items-center justify-between gap-4">
    <div>
      <div className="text-lg font-black">
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
      className="rounded-full bg-[#7BC47F] px-6 py-4 text-sm font-bold text-white"
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
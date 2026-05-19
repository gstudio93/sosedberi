"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams } from "next/navigation";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function ItemPage() {
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<any>(null);

  const [bookings, setBookings] = useState<any[]>([]);

  const [startDate, setStartDate] =
    useState<Date | null>(null);

  const [endDate, setEndDate] =
    useState<Date | null>(null);
  const [reviewText, setReviewText] =
  useState("");

const [rating, setRating] =
  useState(5);

const [reviews, setReviews] =
  useState<any[]>([]);

useEffect(() => {
  if (id) {
    loadItem();
    loadBookings();
    loadReviews();
    checkFavorite();
  }
}, [id]);

useEffect(() => {
  if (item?.owner_id) {
    loadOwnerProfile();
  }
}, [item]);

const [isFavorite, setIsFavorite] =
  useState(false);

const [ownerProfile, setOwnerProfile] =
  useState<any>(null);
  
  async function loadOwnerProfile() {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", item.owner_id)
    .single();

  setOwnerProfile(data);
}

  async function loadItem() {
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .single();

    setItem(data);
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
    .order("created_at", {
      ascending: false,
    });

  setReviews(data || []);
}
  async function checkFavorite() {
  const { data } =
    await supabase.auth.getUser();

  const user = data.user;

  if (!user) return;

  const { data: favorite } =
    await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .eq("item_id", id)
      .single();

  setIsFavorite(!!favorite);
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
  

  async function toggleFavorite() {
  const { data } =
    await supabase.auth.getUser();

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
    await supabase
      .from("favorites")
      .insert([
        {
          user_id: user.id,
          item_id: id,
        },
      ]);

    setIsFavorite(true);
  }
}
    // ПРОВЕРКА ПЕРЕСЕЧЕНИЯ ДАТ
    const hasConflict = bookings.some(
      (booking: any) => {
        return (
          startDate <=
            new Date(booking.end_date) &&
          endDate >=
            new Date(booking.start_date)
        );
      }
    );

    if (hasConflict) {
      alert("Эти даты уже заняты");
      return;
    }

    // СОЗДАНИЕ БРОНИ
    const { error } = await supabase
      .from("bookings")
      .insert([
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

    // 🔔 УВЕДОМЛЕНИЕ ВЛАДЕЛЬЦУ
    const { error: notificationError } =
      await supabase
        .from("notifications")
        .insert([
          {
            user_id: item.owner_id,
            text: `Новая бронь: ${item.name}`,
            link: "/profile",
          },
        ]);

    if (notificationError) {
      console.log(
        "NOTIFICATION ERROR:",
        notificationError
      );
    }

    alert("Бронирование отправлено");

    // ОБНОВЛЯЕМ BOOKING LIST
    loadBookings();

    // СБРОС ДАТ
    setStartDate(null);
    setEndDate(null);
  }
async function handleReview() {
  const { data } =
    await supabase.auth.getUser();

  const user = data.user;

  if (!user) {
    alert("Войдите в аккаунт");
    return;
  }

  const { error } = await supabase
    .from("reviews")
    .insert([
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
 async function toggleFavorite() {
  const { data } =
    await supabase.auth.getUser();

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
    await supabase
      .from("favorites")
      .insert([
        {
          user_id: user.id,
          item_id: id,
        },
      ]);

    setIsFavorite(true);
  }
}
  if (!item) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        Загрузка...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">

        {/* IMAGE */}
        <img
          src={item.image}
          className="h-96 w-full rounded-3xl object-cover"
        />

        {/* TITLE */}
        <h1 className="mt-6 text-4xl font-black">
          {item.name}
        </h1>

        {/* LOCATION */}
        <p className="mt-2 text-neutral-400">
          📍 {item.location}
        </p>
             <a
  href={`/user/${item.owner_id}`}
  className="mt-3 inline-block text-sm text-blue-400"
>
  Открыть профиль владельца →
</a>
<div className="mt-2 flex items-center gap-2 text-sm">

  <div
    className={`h-3 w-3 rounded-full ${
      ownerProfile?.is_online
        ? "bg-green-500"
        : "bg-neutral-500"
    }`}
  />

  {ownerProfile?.is_online
    ? "Онлайн"
    : ownerProfile?.last_seen
    ? `Был: ${new Date(
        ownerProfile.last_seen
      ).toLocaleString()}`
    : "Недавно"}
</div>

        {/* PRICE */}
        <p className="mt-6 text-xl font-bold">
          {item.price}
        </p>
        <button
  onClick={toggleFavorite}
  className={`mt-4 rounded-2xl px-6 py-4 font-bold transition ${
    isFavorite
      ? "bg-red-500 text-white"
      : "bg-white/10 text-white"
  }`}
>
  {isFavorite
    ? "❤️ В избранном"
    : "🤍 В избранное"}
</button>

        {/* DATEPICKER */}
        <div className="mt-6 rounded-2xl bg-white/5 p-6">
          <h2 className="mb-4 text-xl font-bold">
            Выберите даты
          </h2>

          <DatePicker
            selected={startDate}
            onChange={(dates) => {
  if (!dates) return;

  const [start, end] = dates as [
    Date | null,
    Date | null
  ];

  setStartDate(start);
  setEndDate(end);
}}
            startDate={startDate}
            endDate={endDate}
            selectsRange
            inline
            excludeDateIntervals={bookings.map(
              (booking) => ({
                start: new Date(
                  booking.start_date
                ),
                end: new Date(
                  booking.end_date
                ),
              })
            )}
          />
        </div>

        {/* BOOK BUTTON */}
        <button
          onClick={handleBooking}
          className="mt-4 w-full rounded-2xl bg-white px-6 py-4 font-bold text-black"
        >
          Забронировать
        </button>

        {/* BUSY DATES */}
        <div className="mt-8 rounded-2xl bg-white/5 p-6">
          <h2 className="text-xl font-bold">
            Занятые даты
          </h2>

          <div className="mt-4 space-y-3">
            {bookings.length === 0 ? (
              <div className="text-neutral-400">
                Пока свободно
              </div>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl bg-white/5 p-4"
                >
                  📅{" "}
                  {new Date(
                    booking.start_date
                  ).toLocaleDateString()}
                  {" → "}
                  {new Date(
                    booking.end_date
                  ).toLocaleDateString()}
                </div>
              ))
            )}
          </div>
        </div>
        {/* REVIEWS */}
<div className="mt-10 rounded-3xl bg-white/5 p-6">

  <h2 className="text-2xl font-bold">
    Отзывы
  </h2>

  {/* ADD REVIEW */}
  <div className="mt-6 space-y-4">

    <select
      value={rating}
      onChange={(e) =>
        setRating(Number(e.target.value))
      }
      className="w-full rounded-2xl bg-white/5 p-4"
    >
      <option value={5}>★★★★★</option>
      <option value={4}>★★★★</option>
      <option value={3}>★★★</option>
      <option value={2}>★★</option>
      <option value={1}>★</option>
    </select>

    <textarea
      value={reviewText}
      onChange={(e) =>
        setReviewText(e.target.value)
      }
      placeholder="Напишите отзыв..."
      className="min-h-[120px] w-full rounded-2xl bg-white/5 p-4 outline-none"
    />

    <button
      onClick={handleReview}
      className="rounded-2xl bg-white px-6 py-4 font-bold text-black"
    >
      Оставить отзыв
    </button>

  </div>

  {/* LIST */}
  <div className="mt-10 space-y-4">

    {reviews.length === 0 ? (
      <div className="text-neutral-400">
        Пока нет отзывов
      </div>
    ) : (
      reviews.map((review) => (
        <div
          key={review.id}
          className="rounded-2xl bg-white/5 p-5"
        >
          <div className="text-xl">
            {"★".repeat(review.rating)}
          </div>

          <p className="mt-3 text-neutral-300">
            {review.text}
          </p>

          <div className="mt-4 text-sm text-neutral-500">
            {new Date(
              review.created_at
            ).toLocaleDateString()}
          </div>
        </div>
      ))
    )}

  </div>
</div>
        {/* DESCRIPTION */}
        <div className="mt-6 rounded-2xl bg-white/5 p-6">
          <p className="text-neutral-300">
            {item.description}
          </p>
        </div>

        {/* CHAT */}
        <a
          href={`/chat/${item.id}?owner=${item.owner_id}`}
          className="mt-8 block w-full rounded-2xl bg-white/10 py-4 text-center font-bold"
        >
          Написать владельцу
        </a>

      </div>
    </main>
  );
}
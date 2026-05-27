"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function UserPage() {
  const params = useParams();

  const id = params.id as string;
  const [completedRentals, setCompletedRentals] = useState(0);

  const [items, setItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
const [activeTab, setActiveTab] = useState("items");

  const [reviews, setReviews] =
    useState<any[]>([]);

  const [avgRating, setAvgRating] =
    useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // PROFILE
const { data: profileData } = await supabase
  .from("reviews")
.select(`
  *,
  profiles:author_id (
    username,
    avatar
  )
`)
.eq("owner_id", id)
  .single();

setProfile(profileData);
    // ITEMS
    const { data: itemsData } =
      await supabase
        .from("items")
        .select("*")
        .eq("owner_id", id);

    setItems(itemsData || []);

    // REVIEWS
    const { data: reviewsData } =
      await supabase
        .from("reviews")
        .select("*")
        .eq("owner_id", id)
        .order("created_at", {
          ascending: false,
        });

    setReviews(reviewsData || []);

    if (reviewsData?.length) {
      const avg =
        reviewsData.reduce(
          (acc, review) =>
            acc + review.rating,
          0
        ) / reviewsData.length;

      setAvgRating(avg);
    }
    const { data: completedBookings } = await supabase
  .from("bookings")
  .select("*")
  .eq("status", "approved")
  .in(
    "item_id",
    (itemsData || []).map((item) => item.id)
  );

setCompletedRentals(completedBookings?.length || 0);
  }
  

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">
      <div className="mx-auto max-w-7xl">

        {/* HERO PROFILE */}
<div className="mb-12 rounded-[36px] border border-black/5 bg-white p-10 shadow-sm">

  <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">

    {/* LEFT */}
    <div className="flex flex-col gap-6 md:flex-row md:items-center">

      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#7BC47F] text-5xl font-black text-white shadow-lg">
        {profile?.username?.[0]?.toUpperCase() || "U"}
      </div>

      <div>

        <h1 className="text-5xl font-black tracking-tight">
          {profile?.first_name || "Пользователь"}{" "}
          {profile?.last_name || ""}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3">

          <div className="rounded-full bg-[#F7F7F5] px-4 py-2 text-sm font-bold">
            ⭐ {avgRating.toFixed(1)}
          </div>

          <div className="rounded-full bg-[#F7F7F5] px-4 py-2 text-sm font-bold">
            {reviews.length} отзывов
          </div>

          <div className="rounded-full bg-[#E8F7EA] px-4 py-2 text-sm font-bold text-[#3F9E47]">
            ✔ Email подтвержден
          </div>
          {profile?.verified && (
  <div className="rounded-full bg-[#E8F7EA] px-4 py-2 text-sm font-bold text-[#3F9E47]">
    ✓ Профиль проверен
  </div>
)}

{profile?.phone_verified && (
  <div className="rounded-full bg-[#E8F7EA] px-4 py-2 text-sm font-bold text-[#3F9E47]">
    📱 Телефон подтверждён
  </div>
)}

        
        </div>

        <div className="mt-6 flex flex-wrap gap-6 text-sm font-medium text-[#6B6B6B]">

          <div>
            📍 {profile?.city || "Город не указан"}
          </div>

          <div>
            🕒 На сайте с{" "}
            {profile?.created_at
              ? new Date(
                  profile.created_at
                ).getFullYear()
              : "2026"}
          </div>

          <div>
            📦 {items.length} объявлений
          </div>
          <div>
  ✅ {completedRentals} успешных аренд
</div>
<div>
  💬 {profile?.response_time || "Обычно отвечает быстро"}
</div>
<div>
  🛡 Сделки проходят через SosedBeri
</div>

        </div>

        {profile?.bio && (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#555555]">
            {profile.bio}
          </p>
        )}

      </div>
    </div>

    {/* RIGHT */}
    <div className="flex flex-col gap-4">

      <a
  href={`/chat/${items[0]?.id || "new"}?owner=${id}`}
  className="rounded-full bg-[#7BC47F] px-8 py-4 text-center font-bold text-white transition hover:scale-[1.02]"
>
  Написать владельцу
</a>

      <button className="rounded-full border border-black/10 bg-white px-8 py-4 font-bold transition hover:bg-[#F7F7F5]">
        Поделиться профилем
      </button>

    </div>

  </div>
</div>
{/* TABS */}
<div className="mb-10 flex gap-3 rounded-full bg-white p-2 shadow-sm">
  <button
    onClick={() => setActiveTab("items")}
    className={`flex-1 rounded-full px-6 py-4 font-bold transition ${
      activeTab === "items"
        ? "bg-[#7BC47F] text-white"
        : "text-[#6B6B6B] hover:bg-[#F7F7F5]"
    }`}
  >
    Объявления
  </button>

  <button
    onClick={() => setActiveTab("reviews")}
    className={`flex-1 rounded-full px-6 py-4 font-bold transition ${
      activeTab === "reviews"
        ? "bg-[#7BC47F] text-white"
        : "text-[#6B6B6B] hover:bg-[#F7F7F5]"
    }`}
  >
    Отзывы
  </button>

  <button
    onClick={() => setActiveTab("about")}
    className={`flex-1 rounded-full px-6 py-4 font-bold transition ${
      activeTab === "about"
        ? "bg-[#7BC47F] text-white"
        : "text-[#6B6B6B] hover:bg-[#F7F7F5]"
    }`}
  >
    О владельце
  </button>
</div>
{activeTab === "items" && (
  <>
        {/* ITEMS */}
        <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <h2 className="mb-8 text-3xl font-black">
            Объявления
          </h2>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <a
                key={item.id}
                href={`/item/${item.id}`}
                className="overflow-hidden rounded-[28px] border border-black/5 bg-[#F7F7F5] transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {item.image && (
                  <img
                    src={item.image}
                    className="h-48 w-full object-cover"
                  />
                )}

                <div className="p-5">
                  <h3 className="text-xl font-black">
                    {item.name}
                  </h3>

                  <p className="mt-2 text-sm text-[#6B6B6B]">
                    📍 {item.location}
                  </p>
             

                  <div className="mt-4 text-2xl font-black">
  {item.price} ₽ / день
</div>
                </div>
              </a>
            ))}
          </div>
        </section>
          </>
)}
{activeTab === "reviews" && (
  <>

        {/* REVIEWS */}
        <section className="rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">

  <div>
    <h2 className="text-3xl font-black">
      Отзывы
    </h2>

    <p className="mt-2 text-[#6B6B6B]">
      Опыт аренды у этого владельца
    </p>
  </div>

  <div className="flex items-center gap-3 rounded-full bg-[#F7F7F5] px-5 py-3">
    <span className="text-xl">
      ⭐
    </span>

    <div className="font-black">
      {avgRating.toFixed(1)}
    </div>

    <div className="text-sm text-[#6B6B6B]">
      ({reviews.length} отзывов)
    </div>
  </div>

</div>

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl bg-white/5 p-6 text-neutral-400">
                Пока нет отзывов
              </div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-[28px] border border-black/5 bg-[#F7F7F5] p-6 transition duration-300 hover:shadow-lg"
                >
                  <div className="mb-5 flex items-center gap-4">
  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] text-lg font-black text-white">
    {review.profiles?.avatar ? (
      <img
        src={review.profiles.avatar}
        className="h-full w-full object-cover"
        alt=""
      />
    ) : (
      review.profiles?.username?.[0]?.toUpperCase() || "П"
    )}
  </div>

  <div>
    <div className="font-black">
      {review.profiles?.username || "Пользователь"}
    </div>

    <div className="text-sm text-[#8D8D8D]">
      Арендатор
    </div>
  </div>
</div>
                  <div className="flex items-center gap-3">
                    <div className="text-xl text-[#FFB800]">
  {"★".repeat(review.rating)}
</div>

<div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#3F9E47]">
  ✔ Проверенная аренда
</div>
                  </div>

                  <p className="mt-4 text-lg leading-relaxed text-[#555555]">
                    {review.text}
                  </p>

                  <div className="mt-5 text-sm font-medium text-[#8D8D8D]">
                    {new Date(
                      review.created_at
                    ).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
          </>
)}
{activeTab === "about" && (
  <section className="rounded-[36px] border border-black/5 bg-white p-10 shadow-sm">
    <h2 className="text-3xl font-black">
      О владельце
    </h2>

    <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#555555]">
      {profile?.bio || "Пользователь пока не добавил информацию о себе."}
    </p>

    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-[28px] bg-[#F7F7F5] p-6">
        <div className="text-sm text-[#6B6B6B]">
          Объявлений
        </div>
        <div className="mt-2 text-4xl font-black">
          {items.length}
        </div>
      </div>

      <div className="rounded-[28px] bg-[#F7F7F5] p-6">
        <div className="text-sm text-[#6B6B6B]">
          Отзывов
        </div>
        <div className="mt-2 text-4xl font-black">
          {reviews.length}
        </div>
      </div>

      <div className="rounded-[28px] bg-[#F7F7F5] p-6">
        <div className="text-sm text-[#6B6B6B]">
          Рейтинг
        </div>
        <div className="mt-2 text-4xl font-black">
          {avgRating.toFixed(1)}
        </div>
      </div>
    </div>
  </section>
)}

      </div>
    </main>
  );
}
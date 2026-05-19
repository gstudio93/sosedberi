"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CITIES } from "@/lib/cities";
import { CATEGORIES } from "@/lib/categories";

export default function HomePage() {
  const [items, setItems] = useState<any[]>([]);
  const [latestReviews, setLatestReviews] =
  useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
  loadItems(city, search, category);
  loadLatestReviews();
}, [city, search, category]);

  async function loadItems(
    selectedCity?: string,
    searchQuery?: string,
    selectedCategory?: string
  ) {
    let query = supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectedCity) {
      query = query.eq("location", selectedCity);
    }

    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`);
    }

    if (selectedCategory) {
      query = query.eq("category", selectedCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.log(error);
      return;
    }

    setItems(data || []);
  }
  async function loadLatestReviews() {
  const { data } = await supabase
    .from("reviews")
    .select(`
      *,
      items (
        id,
        name
      ),
      profiles (
        full_name
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(4);

  setLatestReviews(data || []);
}

  return (<main className="min-h-screen bg-black text-white">
    {/* HERO */}
    
    <section className="relative min-h-screen overflow-hidden">

      <div className="grid min-h-screen lg:grid-cols-[1fr_420px]">

        {/* LEFT SIDE */}
        <div className="relative overflow-hidden">

          {/* BG */}
          <img
            src="/hero.jpg"
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* OVERLAY */}
          <div className="absolute inset-0 bg-black/45" />

          {/* CONTENT */}
          <div className="relative z-10 flex h-full flex-col justify-center px-8 lg:px-20">

            {/* TITLE */}
            <div className="max-w-4xl">

              <h1 className="text-5xl font-black leading-[0.95] md:text-8xl">
                Не покупай - 
                <br />
                бери в аренду
              </h1>

              <p className="mt-6 text-xl text-white/80">
                Бери рядом в любое время
              </p>

            </div>

            {/* SEARCH */}
            <div className="mt-10 max-w-5xl rounded-full bg-[#111111]/95 p-3 backdrop-blur">

              <div className="flex flex-col gap-3 md:flex-row">

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Что вы хотите взять в аренду?"
                  className="flex-1 rounded-full bg-transparent px-6 py-5 text-lg outline-none"
                />

                <button
                  className="rounded-full bg-[#6FCF97] px-10 py-5 font-bold text-black transition hover:scale-[1.02]"
                >
                  Найти
                </button>

              </div>

            </div>

            {/* MINI FILTERS */}
            <div className="mt-5 flex flex-wrap gap-5 text-sm text-white/80">

              <div>📍 Местоположение</div>

              <div>📅 Выбор даты</div>

              <div>⚡ Быстрая бронь</div>

            </div>

          </div>

        </div>

        {/* RIGHT SIDEBAR */}
        <div className="hidden bg-[#111111] p-10 pt-30 lg:block">

          <h2 className="text-2xl font-black leading-tight">
           ...либо выбери из популярных категорий
          </h2>

          {/* TABS */}
          <div className="mt-10 flex rounded-full bg-[#1A1A1A] p-2">

            <button className="flex-1 rounded-full bg-[#B44AC0] px-6 py-4 font-bold">
              Все
            </button>

            <button className="flex-1 rounded-full px-6 py-4 text-white/50">
              Техника
            </button>

          </div>

          {/* TAGS */}
          <div className="mt-10 flex flex-wrap gap-4">

            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className="rounded-full border border-[#B44AC0] px-5 py-3 text-sm text-[#D86EE3] transition hover:bg-[#B44AC0] hover:text-white"
              >
                {cat}
              </button>
            ))}

          </div>

          {/* CTA */}
          <button
            className="mt-12 rounded-full border border-[#B44AC0] px-8 py-5 font-bold text-[#D86EE3] transition hover:bg-[#B44AC0] hover:text-white"
          >
            Открыть все категории
          </button>

        </div>

      </div>

    </section>
    

   


   {/* RECENTLY ACTIVE */}
<section className="mx-auto max-w-7xl px-6 py-20">

  <div className="mb-10 flex items-end justify-between">

    <div>
      <p className="text-sm uppercase tracking-[0.3em] text-white/40">
        
      </p>

      <h2 className="mt-3 text-3xl font-black">
        Недавно арендованые товары
      </h2>
    </div>

    

  </div>

  <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

    {items.slice(0, 6).map((item) => (
  <a
    key={item.id}
    href={`/item/${item.id}`}
    className="group block"
  >

    {/* CARD */}
    <div>

      {/* IMAGE */}
      <div className="relative overflow-hidden rounded-[28px]">

        <img
          src={item.image}
          alt={item.name}
          className="h-[225px] w-full object-cover transition duration-500 group-hover:scale-105"
        />

        {/* DARK GRADIENT */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* RATING */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1 text-sm text-white">

          <span>⭐</span>
          <span>⭐</span>
          <span>⭐</span>
          <span>⭐</span>
          <span>⭐</span>

          <span className="ml-2 text-white/70">
            5.0
          </span>

        </div>

        {/* AVATAR */}
        <div className="absolute bottom-4 right-4">

          <img
            src={
              item.owner_avatar ||
              "https://i.pravatar.cc/100"
            }
            className="h-14 w-14 rounded-full border-4 border-white object-cover"
          />

        </div>

      </div>

      {/* INFO */}
      <div className="px-1 pb-2 pt-4">

        <div className="flex items-start justify-between gap-4">

          <div>

            <h3 className="text-lg font-bold">
              {item.name}
            </h3>

            <p className="mt-1 text-sm text-white/50">
              {item.location}
            </p>

          </div>

          <div className="text-right">

            <div className="text-lg font-black">
              {item.price}
            </div>

            <div className="text-sm text-white/50">
              в день
            </div>

          </div>

        </div>

      </div>

    </div>

  </a>
))}

  </div>

</section>

{/* REVIEWS */}
<section className="mx-auto max-w-7xl px-6 pb-24">

  <div className="mb-10">

  
    <h2 className="mt-3 text-3xl font-black">
      Свежие отзывы
    </h2>

  </div>

  <div className="grid gap-6 md:grid-cols-2">

    {latestReviews.map((review) => {

      const createdDate = new Date(
        review.created_at
      );

      const diffMinutes = Math.floor(
        (Date.now() - createdDate.getTime()) /
          1000 /
          60
      );

      let timeAgo = `${diffMinutes} мин назад`;

      if (diffMinutes > 60) {
        timeAgo = `${Math.floor(
          diffMinutes / 60
        )} ч назад`;
      }

      return (
        <div
          key={review.id}
          className="flex h-[156px] flex-col justify-between rounded-[32px] bg-[#111111] p-6"
        >

          {/* TOP */}
          <div className="flex items-start justify-between">

            <div className="text-sm text-white/40">
              {timeAgo}
            </div>

            <div className="flex gap-1 text-sm">
              {"★".repeat(review.rating)}
            </div>

          </div>

          {/* TEXT */}
          <p className="line-clamp-2 text-lg leading-relaxed text-white/90">
            {review.text}
          </p>

          {/* BOTTOM */}
          <div className="flex items-center gap-2 text-sm">

            <span className="font-bold">
              {review.profiles?.full_name ||
                "User"}
            </span>

            <span className="text-white/30">
              on
            </span>

            <a
              href={`/item/${review.items?.id}`}
              className="text-[#B44AC0] transition hover:text-[#D86EE3]"
            >
              {review.items?.name}
            </a>

          </div>

        </div>
      );
    })}

  </div>

</section>

    
  </main>);
}
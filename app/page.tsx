"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CITIES } from "@/lib/cities";
import { CATEGORIES } from "@/lib/categories";
import { YMaps, Map } from "@pbe/react-yandex-maps";

export default function HomePage() {
  const [items, setItems] = useState<any[]>([]);
  const [latestReviews, setLatestReviews] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([
  45.0355,
  38.9753,
]);
  const [category, setCategory] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [dateModalOpen, setDateModalOpen] = useState(false);
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");
  const [currentCity, setCurrentCity] = useState("Определяем...");
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  useEffect(() => {
    loadItems(city, search, category);
    loadLatestReviews();
    loadFavorites();
  }, [city, search, category]);
useEffect(() => {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;

        const response = await fetch(
          `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&format=json&geocode=${longitude},${latitude}`
        );

        const data = await response.json();

        const geoObject =
          data.response.GeoObjectCollection.featureMember[0];

        const addressDetails =
  geoObject.GeoObject.metaDataProperty
    .GeocoderMetaData.Address.Components;

const cityComponent = addressDetails.find(
  (component: any) =>
    component.kind === "locality"
);

const countryComponent = addressDetails.find(
  (component: any) =>
    component.kind === "country"
);

if (
  countryComponent?.name === "Россия" &&
  cityComponent?.name
) {
  setCurrentCity(cityComponent.name);
} else {
  setCurrentCity("Россия");
}
      } catch (e) {
        console.log(e);
        setCurrentCity("Ваш город");
      }
    },
    () => {
      setCurrentCity("Ваш город");
    }
  );
}, []);
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
        profiles:author_id (
          full_name
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(4);

    setLatestReviews(data || []);
  }
async function selectMapLocation() {
  try {
    const response = await fetch(
      `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&format=json&geocode=${mapCenter[1]},${mapCenter[0]}`
    );

    const data = await response.json();

    const geoObject =
      data.response.GeoObjectCollection.featureMember[0];

    const components =
      geoObject.GeoObject.metaDataProperty.GeocoderMetaData.Address.Components;

    const country = components.find(
      (c: any) => c.kind === "country"
    );

    const city = components.find(
  (c: any) =>
    c.kind === "locality"
);

    if (
  country?.name === "Россия" &&
  city?.name
){
      setCurrentCity(city.name);
      setCity(city.name);
    } else {
      setCurrentCity("Россия");
      setCity("");
    }

    setLocationModalOpen(false);
  } catch (error) {
    console.log(error);
    setCurrentCity("Ваш город");
    setLocationModalOpen(false);
  }
}
async function loadFavorites() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) return;

  const { data } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("user_id", user.id);

  setFavoriteIds((data || []).map((f) => f.item_id));
}

async function toggleFavorite(itemId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    alert("Войдите в аккаунт");
    return;
  }

  const isFav = favoriteIds.includes(itemId);

  if (isFav) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("item_id", itemId);

    setFavoriteIds((prev) => prev.filter((id) => id !== itemId));
  } else {
    await supabase.from("favorites").insert([
      {
        user_id: user.id,
        item_id: itemId,
      },
    ]);

    setFavoriteIds((prev) => [...prev, itemId]);
  }
}
  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#111111]">
     {/* HERO */}
<section className="relative overflow-hidden">
  <div className="grid min-h-[700px] lg:min-h-[560px] lg:grid-cols-[minmax(0,1fr)_380px]">
    <div className="relative overflow-hidden">
      <img
        src="/hero.jpg"
        className="absolute inset-0 h-full w-full object-cover"
        alt="Hero"
      />

      <div className="absolute inset-0 bg-white/10" />

      <div className="relative z-10 flex h-full flex-col justify-center px-6 pb-20 pt-28 lg:px-20 lg:pt-32">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-extrabold leading-[0.95] text-[#111111] sm:text-6xl lg:text-[64px]">
            Не покупай —
            <br />
            бери в аренду
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#111111]/75 lg:text-lg">
            Бери вещи рядом и в удобное время
          </p>
        </div>

        <div className="mt-8 w-full max-w-3xl rounded-[28px] bg-white p-2.5 shadow-lg lg:rounded-full">
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Что вы хотите взять в аренду?"
              className="min-w-0 flex-1 bg-transparent px-5 py-3.5 text-base text-[#111111] outline-none placeholder:text-[#8D8D8D]"
            />

            <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7BC47F] text-sm font-bold text-[#111111] transition hover:bg-[#69B56E] lg:h-auto lg:w-auto lg:px-8 lg:py-3.5">
  <span className="lg:hidden">🔍</span>
  <span className="hidden lg:inline">Найти</span>
</button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm font-bold text-[#111111] lg:gap-6">
        {/* MOBILE CATEGORIES */}
<div className="mt-8 -mx-6 overflow-x-auto px-6 lg:hidden">
  <div className="flex gap-3 pb-2">
    {CATEGORIES.slice(0, 8).map((cat, index) => {
      const icons = ["📷", "🔨", "🚲", "🎮", "🏕", "🎧", "⚽", "🧰"];

      return (
        <button
          key={cat}
          onClick={() => setCategory(cat)}
          className={`flex min-w-[128px] flex-col items-start rounded-[28px] p-4 text-left shadow-sm transition ${
            category === cat
              ? "bg-[#7BC47F] text-[#111111]"
              : "bg-white/95 text-[#111111]"
          }`}
        >
          <span className="text-2xl">
            {icons[index % icons.length]}
          </span>

          <span className="mt-3 line-clamp-1 text-sm font-bold">
            {cat}
          </span>
        </button>
      );
    })}
  </div>
</div>
          <button
  type="button"
  onClick={() => setLocationModalOpen(true)}
  className="flex items-center gap-2 transition hover:opacity-70"
>
  <span>⌖</span>
  <span>{currentCity}</span>
</button>

          <button
  type="button"
  onClick={() => setDateModalOpen(true)}
  className="flex items-center gap-2 transition hover:opacity-70"
>
  <span>▣</span>
  <span>
    {startDate && endDate
      ? `${startDate} — ${endDate}`
      : "Выбор даты"}
  </span>
</button>

        </div>
      </div>
    </div>

    <div className="hidden border-l border-black/5 bg-white px-9 py-24 lg:block">
      <h2 className="text-xl font-extrabold leading-tight">
        Выберите популярную категорию
      </h2>

      <div className="mt-8 flex rounded-full bg-[#F3F3F0] p-1.5">
        <button className="flex-1 rounded-full bg-[#7BC47F] px-5 py-3 text-sm font-bold text-[#111111]">
          Все
        </button>

        <button className="flex-1 rounded-full px-5 py-3 text-sm font-bold text-[#6B6B6B]">
          Техника
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="rounded-full border border-[#DADAD5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] transition hover:border-[#7BC47F] hover:bg-[#F1FAF2]"
          >
            {cat}
          </button>
        ))}
      </div>

      <button
        onClick={() => setCategory("")}
        className="mt-10 rounded-full bg-[#7BC47F] px-7 py-4 text-sm font-bold text-[#111111] transition hover:bg-[#69B56E]"
      >
        Открыть все категории
      </button>
    </div>
  </div>
</section>
      {/* RECENTLY ACTIVE */}
      <section className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold lg:text-[28px]">
              Недавно арендованные товары
            </h2>
          </div>
        </div>

        <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <a
              key={item.id}
              href={`/item/${item.id}`}
              className="group block"
            >
              <div>
                <div className="relative overflow-hidden rounded-[26px] bg-white shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md group-active:scale-[0.98]">
                  {item.image ? (
  <>
    <img
      src={item.image}
      alt={item.name}
      className="h-[210px] w-full object-cover transition duration-500 group-hover:scale-105 lg:h-[220px]"
    />

    <button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    toggleFavorite(item.id);
  }}
  className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm transition hover:scale-105"
>
  {favoriteIds.includes(item.id) ? "♥" : "♡"}
</button>
  </>
) : (
  <div className="flex h-[225px] items-center justify-center text-5xl">
    📦
  </div>
)}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  <div className="absolute bottom-4 left-4 flex items-center gap-1 text-xs font-bold text-white">
                    <span>⭐</span>
                    <span>⭐</span>
                    <span>⭐</span>
                    <span>⭐</span>
                    <span>⭐</span>

                    <span className="ml-2 text-white/70">
                      5.0
                    </span>
                  </div>

                  <div className="absolute bottom-4 right-4">
                    <img
                      src={
                        item.owner_avatar ||
                        "https://i.pravatar.cc/100"
                      }
                      className="h-11 w-11 rounded-full border-[3px] border-white object-cover lg:h-12 lg:w-12"
                      alt="Арендодатель"
                    />
                  </div>
                </div>

                <div className="px-2 pb-2 pt-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="line-clamp-1 text-base font-extrabold">
                        {item.name}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#6B6B6B]">
                        {item.location}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-lg font-extrabold">
                        {item.price} ₽
                      </div>

                      <div className="text-xs font-medium uppercase text-[#8D8D8D]">
  / день
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
      <section className="mx-auto max-w-7xl px-6 pb-28 lg:pb-20">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold lg:text-[28px]">
            Свежие отзывы
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {latestReviews.map((review) => {
            const createdDate = new Date(review.created_at);

            

           const timeAgo = createdDate.toLocaleDateString("ru-RU");

            return (
              <div
                key={review.id}
                className="flex min-h-[150px] flex-col justify-between rounded-[26px] bg-white p-5 shadow-sm lg:p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="text-sm text-[#8D8D8D]">
                    {timeAgo}
                  </div>

                  <div className="flex gap-1 text-sm text-[#7BC47F]">
                    {"★".repeat(review.rating)}
                  </div>
                </div>

                <p className="mt-4 line-clamp-3 text-base leading-relaxed text-[#111111] lg:text-lg">
                  {review.text}
                </p>

                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold">
                    {review.profiles?.full_name || "Пользователь"}
                  </span>

                  <span className="text-[#8D8D8D]">
                    о товаре
                  </span>

                  <a
                    href={`/item/${review.items?.id}`}
                    className="text-[#7BC47F] transition hover:opacity-70"
                  >
                    {review.items?.name}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {locationModalOpen && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
    <div className="relative w-full max-w-2xl rounded-[32px] bg-[#111111] p-6 text-white shadow-2xl">
      <button
        onClick={() => setLocationModalOpen(false)}
        className="absolute right-6 top-6 text-3xl"
      >
        ×
      </button>

      <h2 className="text-center text-3xl font-extrabold">
        Где хотите арендовать?
      </h2>

      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Выберите город"
        className="mt-6 w-full rounded-full border border-white/10 bg-transparent px-6 py-4 outline-none"
      />

      <div className="relative mt-6 overflow-hidden rounded-[24px]">

  <YMaps
    query={{
      apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY,
    }}
  >

    <Map
      defaultState={{
        center: mapCenter,
        zoom: 13,
      }}
      width="100%"
      height="420px"

      onBoundsChange={(e: any) => {
        const center = e.get("newCenter");
        setMapCenter(center);
      }}
    />

  </YMaps>

  {/* CENTER PIN */}

  <div
    className="
      pointer-events-none
      absolute
      left-1/2
      top-1/2
      z-10
      -translate-x-1/2
      -translate-y-full
      text-5xl
    "
  >
    📍
  </div>

  {/* HINT */}

  <div
    className="
      absolute
      bottom-5
      left-1/2
      z-10
      -translate-x-1/2
      rounded-full
      bg-black/80
      px-5
      py-3
      text-sm
      text-white
    "
  >
    Передвиньте карту, чтобы выбрать место
  </div>

</div>

      <button
  onClick={selectMapLocation}
  className="mt-6 w-full rounded-full bg-[#7BC47F] px-6 py-4 font-bold text-[#111111]"
>
  Выбрать это место
</button>
    </div>
  </div>
)}
{dateModalOpen && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
    <div className="relative w-full max-w-xl rounded-[32px] bg-white p-6 text-[#111111] shadow-2xl">
      <button
        onClick={() => setDateModalOpen(false)}
        className="absolute right-6 top-5 text-3xl"
      >
        ×
      </button>

      <h2 className="text-center text-3xl font-extrabold">
        Когда хотите арендовать?
      </h2>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-bold text-[#6B6B6B]">
            Дата начала
          </label>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#F7F7F5] p-4 outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-[#6B6B6B]">
            Дата окончания
          </label>

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#F7F7F5] p-4 outline-none"
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
          className="flex-1 rounded-full border border-black/10 px-6 py-4 font-bold"
        >
          Сбросить
        </button>

        <button
          onClick={() => setDateModalOpen(false)}
          className="flex-1 rounded-full bg-[#7BC47F] px-6 py-4 font-bold text-[#111111]"
        >
          Применить
        </button>
      </div>
    </div>
  </div>
)}
    </main>
  );
}

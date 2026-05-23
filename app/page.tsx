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
  const [dateModalOpen, setDateModalOpen] = useState(false);
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");
  const [currentCity, setCurrentCity] = useState("Определяем...");
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  useEffect(() => {
    loadItems(city, search, category);
    loadLatestReviews();
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
  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#111111]">
     {/* HERO */}
<section className="relative overflow-hidden">
  <div className="grid min-h-[620px] lg:grid-cols-[1fr_420px]">
    <div className="relative overflow-hidden">
      <img
        src="/hero.jpg"
        className="absolute inset-0 h-full w-full object-cover"
        alt="Hero"
      />

      <div className="absolute inset-0 bg-white/10" />

      <div className="relative z-10 flex h-full flex-col justify-center px-8 pb-24 pt-36 lg:px-20">
        <div className="max-w-4xl">
          <h1 className="text-5xl font-black leading-[0.95] text-[#111111] md:text-7xl">
            Не покупай —
            <br />
            бери в аренду
          </h1>

          <p className="mt-6 text-xl text-[#111111]/80">
            Бери вещи рядом и в удобное время
          </p>
        </div>

        <div className="mt-8 max-w-4xl rounded-full bg-white p-3 shadow-2xl">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Что вы хотите взять в аренду?"
              className="flex-1 rounded-full bg-transparent px-6 py-4 text-lg text-[#111111] outline-none"
            />

            <button className="rounded-full bg-[#7BC47F] px-10 py-4 font-bold text-[#111111] transition hover:bg-[#69B56E]">
              Найти
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-8 text-sm font-medium text-[#111111]">
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

    <div className="hidden border-l border-black/5 bg-white p-10 pt-26 lg:block">
      <h2 className="text-2xl font-black leading-tight">
        ...либо выбери из популярных категорий
      </h2>

      <div className="mt-10 flex rounded-full bg-[#F3F3F0] p-2">
        <button className="flex-1 rounded-full bg-[#7BC47F] px-6 py-4 font-bold text-[#111111]">
          Все
        </button>

        <button className="flex-1 rounded-full px-6 py-4 text-[#6B6B6B]">
          Техника
        </button>
      </div>

      <div className="mt-10 flex flex-wrap gap-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="rounded-full border border-[#DADAD5] bg-white px-5 py-3 text-sm text-[#111111] transition hover:border-[#7BC47F] hover:bg-[#7BC47F]"
          >
            {cat}
          </button>
        ))}
      </div>

      <button
        onClick={() => setCategory("")}
        className="mt-12 rounded-full bg-[#7BC47F] px-8 py-5 font-bold text-[#111111] transition hover:bg-[#69B56E]"
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
            <h2 className="text-3xl font-black">
              Недавно арендованные товары
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
              <div>
                <div className="relative overflow-hidden rounded-[28px] bg-white shadow-sm">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-[225px] w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-[225px] items-center justify-center text-5xl">
                      📦
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

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

                  <div className="absolute bottom-4 right-4">
                    <img
                      src={
                        item.owner_avatar ||
                        "https://i.pravatar.cc/100"
                      }
                      className="h-14 w-14 rounded-full border-4 border-white object-cover"
                      alt="Арендодатель"
                    />
                  </div>
                </div>

                <div className="px-1 pb-2 pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">
                        {item.name}
                      </h3>

                      <p className="mt-1 text-sm text-[#6B6B6B]">
                        {item.location}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black">
                        {item.price}
                      </div>

                      <div className="text-sm text-[#6B6B6B]">
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
          <h2 className="text-3xl font-black">
            Свежие отзывы
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {latestReviews.map((review) => {
            const createdDate = new Date(review.created_at);

            const diffMinutes = Math.floor(
              (Date.now() - createdDate.getTime()) / 1000 / 60
            );

            let timeAgo = `${diffMinutes} мин назад`;

            if (diffMinutes > 60) {
              timeAgo = `${Math.floor(diffMinutes / 60)} ч назад`;
            }

            return (
              <div
                key={review.id}
                className="flex h-[156px] flex-col justify-between rounded-[32px] bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="text-sm text-[#8D8D8D]">
                    {timeAgo}
                  </div>

                  <div className="flex gap-1 text-sm text-[#7BC47F]">
                    {"★".repeat(review.rating)}
                  </div>
                </div>

                <p className="line-clamp-2 text-lg leading-relaxed text-[#111111]">
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

      <h2 className="text-center text-3xl font-black">
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

      <h2 className="text-center text-3xl font-black">
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
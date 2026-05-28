"use client";

import { useEffect, useMemo, useState } from "react";
import { YMaps, Map as YandexMap } from "@pbe/react-yandex-maps";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "../lib/supabase";

type Item = {
  id: string;
  owner_id?: string | null;
  name: string;
  price: number;
  location?: string | null;
  image?: string | null;
  owner_avatar?: string | null;
  category?: string | null;
  owner_profile?: Profile | null;
  rating?: ItemRating;
};

type Profile = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar?: string | null;
};

type ItemRating = {
  average: number;
  count: number;
};

type ItemReview = {
  item_id: string;
  rating: number;
};

type Review = {
  id: string;
  rating: number;
  text: string;
  created_at: string;
  items?: {
    id: string;
    name: string;
  } | null;
  profiles?: {
    full_name: string | null;
  } | null;
};

const quickCategories = [
  "Инструменты",
  "Техника",
  "Для дома",
  "Для отдыха",
  "Спорт",
  "Транспорт",
  "Фото и видео",
  "Сад и дача",
  "Другое",
];

const benefitCards = [
  {
    icon: "✓",
    title: "Проверенные пользователи",
    text: "Профили, телефон и история сделок помогают выбрать надежного владельца.",
  },
  {
    icon: "₽",
    title: "Дешевле покупки",
    text: "Берите вещь на пару дней и не храните дома то, что нужно редко.",
  },
  {
    icon: "⌖",
    title: "Рядом с вами",
    text: "Поиск по городу и адресу помогает найти вещь поблизости.",
  },
  {
    icon: "↔",
    title: "Гибкие сроки",
    text: "Выбирайте удобные даты и договаривайтесь с владельцем в чате.",
  },
  {
    icon: "●",
    title: "Больше пользы вещам",
    text: "То, что простаивает у одного человека, работает для другого.",
  },
  {
    icon: "★",
    title: "Отзывы после аренды",
    text: "Рейтинг и отзывы постепенно делают сервис прозрачнее.",
  },
];

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [latestReviews, setLatestReviews] = useState<Review[]>([]);
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
  const [currentCity, setCurrentCity] = useState("Ваш город");
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const visibleCategories = useMemo(
    () => quickCategories.filter((cat) => CATEGORIES.includes(cat)),
    []
  );

  useEffect(() => {
    loadItems(city, search, category);
    loadLatestReviews();
    loadFavorites();
  }, [city, search, category]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&format=json&geocode=${longitude},${latitude}`
          );
          const data = await response.json();
          const geoObject = data.response.GeoObjectCollection.featureMember[0];
          const components =
            geoObject.GeoObject.metaDataProperty.GeocoderMetaData.Address
              .Components;
          const cityComponent = components.find(
            (component: any) => component.kind === "locality"
          );
          const countryComponent = components.find(
            (component: any) => component.kind === "country"
          );

          if (countryComponent?.name === "Россия" && cityComponent?.name) {
            setCurrentCity(cityComponent.name);
          } else {
            setCurrentCity("Россия");
          }
        } catch (error) {
          console.log(error);
          setCurrentCity("Ваш город");
        }
      },
      () => setCurrentCity("Ваш город")
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
      .order("created_at", { ascending: false })
      .limit(6);

    if (selectedCity) query = query.eq("location", selectedCity);
    if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
    if (selectedCategory) query = query.eq("category", selectedCategory);

    const { data, error } = await query;

    if (error) {
      console.log(error);
      return;
    }

    const rows = (data || []) as Item[];
    const itemIds = rows.map((item) => item.id);
    const ownerIds = Array.from(
      new Set(rows.map((item) => item.owner_id).filter(Boolean))
    ) as string[];

    if (!rows.length) {
      setItems([]);
      return;
    }

    const [profilesResult, reviewsResult] = await Promise.all([
      ownerIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, username, avatar")
            .in("id", ownerIds)
        : Promise.resolve({ data: [] }),
      supabase.from("reviews").select("item_id, rating").in("item_id", itemIds),
    ]);

    const profilesById = new Map(
      ((profilesResult.data || []) as Profile[]).map((profile) => [
        profile.id,
        profile,
      ])
    );
    const ratingBuckets = new Map<string, number[]>();

    ((reviewsResult.data || []) as ItemReview[]).forEach((review) => {
      const ratings = ratingBuckets.get(review.item_id) || [];
      ratings.push(review.rating);
      ratingBuckets.set(review.item_id, ratings);
    });

    setItems(
      rows.map((item) => ({
        ...item,
        owner_profile: item.owner_id
          ? profilesById.get(item.owner_id) || null
          : null,
        rating: getItemRating(ratingBuckets.get(item.id) || []),
      }))
    );
  }

  async function loadLatestReviews() {
    const { data } = await supabase
      .from("reviews")
      .select(
        `
        *,
        items (
          id,
          name
        ),
        profiles:author_id (
          full_name
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(4);

    setLatestReviews(data || []);
  }

  async function loadFavorites() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) return;

    const { data } = await supabase
      .from("favorites")
      .select("item_id")
      .eq("user_id", user.id);

    setFavoriteIds((data || []).map((favorite) => favorite.item_id));
  }

  async function toggleFavorite(itemId: string) {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      alert("Войдите в аккаунт");
      return;
    }

    const isFavorite = favoriteIds.includes(itemId);

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", itemId);

      if (error) {
        console.log(error);
        return;
      }

      setFavoriteIds((prev) => prev.filter((id) => id !== itemId));
    } else {
      const { error } = await supabase
        .from("favorites")
        .upsert(
          {
            user_id: user.id,
            item_id: itemId,
          },
          { onConflict: "user_id,item_id" }
        );

      if (error) {
        console.log(error);
        return;
      }

      setFavoriteIds((prev) => [...prev, itemId]);
    }
  }

  async function selectMapLocation() {
    try {
      const response = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&format=json&geocode=${mapCenter[1]},${mapCenter[0]}`
      );
      const data = await response.json();
      const geoObject = data.response.GeoObjectCollection.featureMember[0];
      const components =
        geoObject.GeoObject.metaDataProperty.GeocoderMetaData.Address
          .Components;
      const country = components.find((component: any) => component.kind === "country");
      const selectedCity = components.find(
        (component: any) => component.kind === "locality"
      );

      if (country?.name === "Россия" && selectedCity?.name) {
        setCurrentCity(selectedCity.name);
        setCity(selectedCity.name);
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

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadItems(city, search, category);
  }

  function toDateInputValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function addDays(date: Date, days: number) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);

    return nextDate;
  }

  function selectDateRange(start: Date, end: Date) {
    setStartDate(toDateInputValue(start));
    setEndDate(toDateInputValue(end));
  }

  function selectWeekend() {
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntilSaturday = currentDay === 6 ? 0 : (6 - currentDay + 7) % 7;
    const saturday = addDays(today, daysUntilSaturday);
    const sunday = addDays(saturday, 1);

    selectDateRange(saturday, sunday);
  }

  function formatSelectedRange() {
    if (!startDate || !endDate) return "Выбор даты";

    return `${new Date(startDate).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    })} — ${new Date(endDate).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    })}`;
  }

  function getOwnerInitial(item: Item) {
    return (
      item.owner_profile?.full_name ||
      item.owner_profile?.username ||
      "S"
    ).slice(0, 1).toUpperCase();
  }

  function getItemRating(ratings: number[]): ItemRating {
    if (!ratings.length) {
      return {
        average: 0,
        count: 0,
      };
    }

    const total = ratings.reduce((sum, rating) => sum + rating, 0);

    return {
      average: Math.round((total / ratings.length) * 10) / 10,
      count: ratings.length,
    };
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#111111]">
      <section className="relative overflow-hidden bg-[#F7F7F5]">
        <div className="grid min-h-[660px] lg:min-h-[620px] lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="relative overflow-hidden">
            <img
              src="/hero.jpg"
              className="absolute inset-0 h-full w-full object-cover"
              alt="Отдых у озера"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/45 to-white/5" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#F7F7F5] via-transparent to-transparent" />

            <div className="relative z-10 flex h-full flex-col justify-center px-5 pb-16 pt-28 sm:px-10 lg:px-20 lg:pb-20 lg:pt-32">
              <div className="max-w-4xl">
                <p className="mb-4 inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-bold shadow-sm sm:text-sm">
                  Аренда вещей у людей рядом
                </p>
                <h1 className="max-w-3xl text-[44px] font-black leading-[0.92] tracking-[-0.01em] sm:text-6xl lg:text-[76px]">
                  Не покупай —
                  <br />
                  бери в аренду
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-[#3F3F3F] sm:text-lg">
                  Инструменты, технику, товары для отдыха и дома можно взять на
                  пару дней у соседей.
                </p>
              </div>

              <form
                onSubmit={submitSearch}
                className="mt-7 w-full max-w-3xl rounded-[26px] bg-white p-2.5 shadow-xl shadow-black/10 lg:rounded-full"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Что хотите взять в аренду?"
                    className="min-w-0 flex-1 bg-transparent px-5 py-4 text-base outline-none placeholder:text-[#8D8D8D]"
                  />
                  <button className="rounded-full bg-[#7BC47F] px-8 py-4 text-base font-black transition hover:bg-[#69B56E]">
                    Найти
                  </button>
                </div>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-bold">
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="rounded-full bg-white/85 px-4 py-2 shadow-sm transition hover:bg-white"
                >
                  ⌖ {currentCity}
                </button>
                <button
                  type="button"
                  onClick={() => setDateModalOpen(true)}
                  className="rounded-full bg-white/85 px-4 py-2 shadow-sm transition hover:bg-white"
                >
                  ▣{" "}
                  {formatSelectedRange()}
                </button>
              </div>

              <div className="mt-8 -mx-6 overflow-x-auto px-6 lg:hidden">
                <div className="flex gap-3 pb-2">
                  {visibleCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`min-w-fit rounded-full border px-5 py-3 text-sm font-bold transition ${
                        category === cat
                          ? "border-[#7BC47F] bg-[#7BC47F]"
                          : "border-black/10 bg-white/90"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="hidden bg-white px-9 pb-14 pt-32 lg:block">
            <h2 className="text-2xl font-black leading-tight">
              Выберите популярную категорию
            </h2>

            <div className="mt-8 flex rounded-full bg-[#F3F3F0] p-1.5">
              <button
                onClick={() => setCategory("")}
                className={`flex-1 rounded-full px-5 py-3 text-sm font-black transition ${
                  !category ? "bg-[#7BC47F]" : "text-[#6B6B6B]"
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setCategory("Техника")}
                className={`flex-1 rounded-full px-5 py-3 text-sm font-black transition ${
                  category === "Техника" ? "bg-[#7BC47F]" : "text-[#6B6B6B]"
                }`}
              >
                Техника
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {visibleCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-full border px-4 py-2.5 text-sm font-bold transition ${
                    category === cat
                      ? "border-[#7BC47F] bg-[#F1FAF2] text-[#29933D]"
                      : "border-[#DADAD5] bg-white hover:border-[#7BC47F]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCategory("")}
              className="mt-10 rounded-full bg-[#7BC47F] px-7 py-4 text-sm font-black transition hover:bg-[#69B56E]"
            >
              Открыть все категории
            </button>
          </aside>
        </div>
      </section>

      <section id="recent-items" className="mx-auto max-w-7xl px-6 py-14 lg:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-[#7BC47F]">
              Активные объявления
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.01em] lg:text-[34px]">
              Недавно добавленные вещи
            </h2>
          </div>
          <a
            href="#recent-items"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black transition hover:border-[#7BC47F]"
          >
            Смотреть каталог
          </a>
        </div>

        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <a key={item.id} href={`/item/${item.id}`} className="group block">
              <div className="relative overflow-hidden rounded-[22px] bg-white shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                <div className="relative h-[235px] overflow-hidden bg-[#EFEFEB]">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl">
                      📦
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm transition hover:scale-105"
                    aria-label="Добавить в избранное"
                  >
                    {favoriteIds.includes(item.id) ? "♥" : "♡"}
                  </button>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-xs font-black text-white backdrop-blur-sm">
                    {item.rating?.count ? (
                      <>
                        <span className="text-[#FFD746]">★</span>
                        <span>{item.rating.average.toFixed(1)}</span>
                        <span className="text-white/70">
                          {item.rating.count} отзывов
                        </span>
                      </>
                    ) : (
                      <span className="text-white/80">Нет отзывов</span>
                    )}
                  </div>
                  {item.owner_profile?.avatar || item.owner_avatar ? (
                    <img
                      src={item.owner_profile?.avatar || item.owner_avatar || ""}
                      className="absolute bottom-3 right-4 h-12 w-12 rounded-full border-[3px] border-white bg-[#7BC47F] object-cover"
                      alt="Владелец"
                    />
                  ) : (
                    <div className="absolute bottom-3 right-4 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-[#7BC47F] text-lg font-black text-white">
                      {getOwnerInitial(item)}
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 text-lg font-black">
                      {item.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#6B6B6B]">
                      {item.location || "Город не указан"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xl font-black">{item.price} ₽</div>
                    <div className="text-xs font-bold uppercase text-[#8D8D8D]">
                      / день
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="border-y border-black/5 bg-white/65 py-14">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-black">Свежие отзывы</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {(latestReviews.length ? latestReviews : []).map((review) => (
              <div
                key={review.id}
                className="min-h-[160px] rounded-[18px] border border-black/8 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8D8D8D]">
                    {new Date(review.created_at).toLocaleDateString("ru-RU")}
                  </span>
                  <span className="font-black text-[#7BC47F]">
                    {"★".repeat(review.rating)}
                  </span>
                </div>
                <p className="mt-4 line-clamp-3 text-sm font-bold leading-relaxed">
                  {review.text}
                </p>
                <div className="mt-5 text-xs text-[#6B6B6B]">
                  <b className="text-[#111111]">
                    {review.profiles?.full_name || "Пользователь"}
                  </b>{" "}
                  о вещи{" "}
                  <a
                    href={`/item/${review.items?.id}`}
                    className="font-bold text-[#29933D]"
                  >
                    {review.items?.name}
                  </a>
                </div>
              </div>
            ))}
            {!latestReviews.length && (
              <div className="col-span-full rounded-[22px] bg-white p-8 text-center text-[#6B6B6B] shadow-sm">
                Отзывы появятся здесь после завершенных аренд.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <h2 className="text-center text-3xl font-black lg:text-[36px]">
          Почему выбирают SosedBeri?
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {benefitCards.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-[24px] bg-white p-7 text-center shadow-sm"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#7BC47F] text-3xl font-black">
                {benefit.icon}
              </div>
              <h3 className="mt-5 text-xl font-black">{benefit.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">
                {benefit.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {locationModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 px-4">
          <div className="relative max-h-[calc(100dvh-32px)] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white p-5 text-[#111111] shadow-2xl sm:p-6">
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
              onChange={(event) => setCity(event.target.value)}
              placeholder="Выберите город"
              className="mt-6 w-full rounded-full border border-black/10 bg-[#F7F7F5] px-6 py-4 outline-none"
            />
            <div className="relative mt-6 overflow-hidden rounded-[24px]">
              <YMaps query={{ apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY }}>
                <YandexMap
                  defaultState={{ center: mapCenter, zoom: 13 }}
                  width="100%"
                  height="420px"
                  onBoundsChange={(event: any) => {
                    const center = event.get("newCenter");
                    setMapCenter(center);
                  }}
                />
              </YMaps>
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full text-5xl">
                📍
              </div>
              <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/80 px-5 py-3 text-sm text-white">
                Передвиньте карту, чтобы выбрать место
              </div>
            </div>
            <button
              onClick={selectMapLocation}
              className="mt-6 w-full rounded-full bg-[#7BC47F] px-6 py-4 font-black"
            >
              Выбрать это место
            </button>
          </div>
        </div>
      )}

      {dateModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 px-4">
          <div className="relative max-h-[calc(100dvh-32px)] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-5 text-[#111111] shadow-2xl sm:rounded-[32px] sm:p-7">
            <button
              onClick={() => setDateModalOpen(false)}
              className="absolute right-6 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F3F0] text-2xl font-black transition hover:bg-[#E8E8E2]"
            >
              ×
            </button>
            <div className="pr-12">
              <p className="text-sm font-bold uppercase text-[#7BC47F]">
                Период аренды
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Когда нужна вещь?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">
                Выберите быстрый вариант или задайте даты вручную.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <DatePreset
                title="Сегодня"
                subtitle={new Date().toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                })}
                onClick={() => {
                  const today = new Date();
                  selectDateRange(today, today);
                }}
              />
              <DatePreset
                title="Завтра"
                subtitle={addDays(new Date(), 1).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                })}
                onClick={() => {
                  const tomorrow = addDays(new Date(), 1);
                  selectDateRange(tomorrow, tomorrow);
                }}
              />
              <DatePreset
                title="Выходные"
                subtitle="сб - вс"
                onClick={selectWeekend}
              />
              <DatePreset
                title="На 3 дня"
                subtitle="удобно для поездки"
                onClick={() => {
                  const today = new Date();
                  selectDateRange(today, addDays(today, 2));
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const today = new Date();
                selectDateRange(today, addDays(today, 6));
              }}
              className="mt-3 w-full rounded-[22px] border border-[#BDE8C0] bg-[#F1FAF2] px-5 py-4 text-left transition hover:border-[#7BC47F]"
            >
              <span className="block text-base font-black">На неделю</span>
              <span className="mt-1 block text-sm text-[#6B6B6B]">
                Хорошо для ремонта, отдыха или теста техники
              </span>
            </button>

            {startDate && endDate && (
              <div className="mt-5 rounded-[22px] bg-[#F7F7F5] px-5 py-4">
                <div className="text-xs font-bold uppercase text-[#8D8D8D]">
                  Выбранный период
                </div>
                <div className="mt-1 text-xl font-black">
                  {formatSelectedRange()}
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-[#6B6B6B]">
                  Дата начала
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[#F7F7F5] p-4 outline-none transition focus:border-[#7BC47F]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#6B6B6B]">
                  Дата окончания
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[#F7F7F5] p-4 outline-none transition focus:border-[#7BC47F]"
                />
              </div>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="flex-1 rounded-full border border-black/10 px-6 py-4 font-black transition hover:bg-[#F7F7F5]"
              >
                Сбросить
              </button>
              <button
                onClick={() => setDateModalOpen(false)}
                className="flex-1 rounded-full bg-[#7BC47F] px-6 py-4 font-black transition hover:bg-[#69B56E]"
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

function DatePreset({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[22px] border border-black/10 bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-[#7BC47F] hover:shadow-sm"
    >
      <span className="block text-base font-black">{title}</span>
      <span className="mt-1 block text-xs font-bold text-[#8D8D8D]">
        {subtitle}
      </span>
    </button>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getItemUrl } from "@/lib/item-url";

type Item = {
  id: string;
  owner_id?: string | null;
  name: string;
  description?: string | null;
  price?: number | string | null;
  deposit?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  location?: string | null;
  city?: string | null;
  category?: string | null;
  image?: string | null;
  owner_profile?: Profile | null;
  rating?: ItemRating;
};

type Profile = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar?: string | null;
};

type ItemReview = {
  item_id: string;
  rating: number;
};

type ItemRating = {
  average: number;
  count: number;
};

type SortMode = "new" | "price_asc" | "price_desc";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type Collection = {
  title: string;
  text: string;
  category: string;
  query?: string;
  city?: string;
};

const CATALOG_CATEGORIES = [
  "Инструменты",
  "Техника",
  "Для дома",
  "Для отдыха",
  "Спорт",
  "Транспорт",
  "Детские товары",
  "Фото и видео",
  "Сад и дача",
  "Другое",
];

const CATALOG_CITIES = [
  "Краснодар",
  "Сочи",
  "Новороссийск",
  "Армавир",
  "Анапа",
  "Ейск",
  "Геленджик",
  "Кропоткин",
  "Славянск-на-Кубани",
  "Туапсе",
  "Темрюк",
  "Крымск",
  "Белореченск",
  "Горячий Ключ",
  "Тихорецк",
];

const COLLECTIONS: Collection[] = [
  {
    title: "Инструменты для ремонта",
    text: "Перфораторы, пилы, уровни и техника для работ дома.",
    category: "Инструменты",
    query: "",
  },
  {
    title: "Отдых у моря",
    text: "Палатки, SUP-доски, матрасы и снаряжение для поездки.",
    category: "Для отдыха",
    city: "Сочи",
  },
  {
    title: "Для детей",
    text: "Коляски, велосипеды, самокаты и автокресла.",
    category: "Детские товары",
  },
  {
    title: "Для дома",
    text: "Пылесосы, пароочистители, проекторы и полезная техника.",
    category: "Для дома",
  },
];

const INITIAL_VISIBLE_COUNT = 18;
const LOAD_MORE_COUNT = 12;
const NEARBY_RADIUS_KM = 30;

export default function CatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [depositMax, setDepositMax] = useState("");
  const [nearMe, setNearMe] = useState(false);
  const [nearLoading, setNearLoading] = useState(false);
  const [nearError, setNearError] = useState("");
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [initialFiltersLoaded, setInitialFiltersLoaded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setSearch(params.get("q") || "");
    setCategory(params.get("category") || "");
    setCity(params.get("city") || "");
    setPriceMin(params.get("priceMin") || "");
    setPriceMax(params.get("priceMax") || "");
    setDepositMax(params.get("depositMax") || "");
    const coordinates = parseCoordinates(params.get("lat"), params.get("lng"));

    setNearMe(params.get("near") === "1" && Boolean(coordinates));
    setUserCoords(coordinates);
    setOnlyWithPhoto(params.get("photo") === "1");
    setSortMode((params.get("sort") as SortMode) || "new");
    setInitialFiltersLoaded(true);
    loadItems();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (!initialFiltersLoaded) return;

    setVisibleCount(INITIAL_VISIBLE_COUNT);

    const params = new URLSearchParams();

    if (search.trim()) params.set("q", search.trim());
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (priceMin) params.set("priceMin", priceMin);
    if (priceMax) params.set("priceMax", priceMax);
    if (depositMax) params.set("depositMax", depositMax);
    if (nearMe && userCoords) {
      params.set("near", "1");
      params.set("lat", String(userCoords.latitude));
      params.set("lng", String(userCoords.longitude));
    }
    if (onlyWithPhoto) params.set("photo", "1");
    if (sortMode !== "new") params.set("sort", sortMode);

    const queryString = params.toString();
    const nextUrl = queryString ? `/catalog?${queryString}` : "/catalog";

    window.history.replaceState({}, "", nextUrl);
  }, [
    category,
    city,
    depositMax,
    initialFiltersLoaded,
    nearMe,
    onlyWithPhoto,
    priceMax,
    priceMin,
    search,
    sortMode,
    userCoords,
  ]);

  async function loadItems() {
    setLoading(true);

    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("status", "active")
      .neq("moderation_status", "rejected")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.log(error);
      setItems([]);
      setLoading(false);
      return;
    }

    const rows = ((data || []) as Item[]).filter((item) => item.name);
    const ownerIds = Array.from(
      new Set(rows.map((item) => item.owner_id).filter(Boolean))
    ) as string[];
    const itemIds = rows.map((item) => item.id);

    const [profilesResult, reviewsResult] = await Promise.all([
      ownerIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, username, avatar")
            .in("id", ownerIds)
        : Promise.resolve({ data: [] }),
      itemIds.length
        ? supabase.from("reviews").select("item_id, rating").in("item_id", itemIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profilesById = new Map(
      ((profilesResult.data || []) as Profile[]).map((profile) => [
        profile.id,
        profile,
      ])
    );
    const ratingBuckets = new Map<string, number[]>();

    ((reviewsResult.data || []) as ItemReview[]).forEach((review) => {
      const bucket = ratingBuckets.get(review.item_id) || [];
      bucket.push(Number(review.rating) || 0);
      ratingBuckets.set(review.item_id, bucket);
    });

    setItems(
      rows.map((item) => ({
        ...item,
        owner_profile: item.owner_id
          ? profilesById.get(item.owner_id) || null
          : null,
        rating: getRating(ratingBuckets.get(item.id) || []),
      }))
    );
    setLoading(false);
  }

  async function loadFavorites() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      setFavoriteIds([]);
      return;
    }

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
      alert("Войдите или зарегистрируйтесь, чтобы добавлять вещи в избранное.");
      return;
    }

    const isFavorite = favoriteIds.includes(itemId);

    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", itemId);

      setFavoriteIds((current) => current.filter((id) => id !== itemId));
      return;
    }

    await supabase
      .from("favorites")
      .upsert({ user_id: user.id, item_id: itemId }, { onConflict: "user_id,item_id" });

    setFavoriteIds((current) => [...current, itemId]);
  }

  function resetFilters() {
    setSearch("");
    setCategory("");
    setCity("");
    setPriceMin("");
    setPriceMax("");
    setDepositMax("");
    setNearMe(false);
    setNearError("");
    setUserCoords(null);
    setOnlyWithPhoto(false);
    setSortMode("new");
  }

  function clearNearMe() {
    setNearMe(false);
    setNearError("");
    setUserCoords(null);
  }

  function changeCityFilter(value: string) {
    setCity(value);

    if (value) {
      clearNearMe();
    }
  }

  function requestNearbyItems() {
    setNearError("");

    if (!navigator.geolocation) {
      setNearError("Браузер не поддерживает определение местоположения.");
      return;
    }

    setNearLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setNearMe(true);
        setCity("");
        setNearLoading(false);
      },
      () => {
        setNearError("Не удалось получить геолокацию. Разрешите доступ к местоположению.");
        setNearLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      }
    );
  }

  function applyCollection(collection: Collection) {
    setSearch(collection.query || "");
    setCategory(collection.category);
    setCity(collection.city || "");
    setPriceMin("");
    setPriceMax("");
    setDepositMax("");
    clearNearMe();
    setOnlyWithPhoto(false);
    setSortMode("new");
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const min = Number(priceMin) || 0;
    const max = Number(priceMax) || 0;
    const maxDeposit = Number(depositMax) || 0;

    const filtered = items.filter((item) => {
      const itemName = item.name.toLowerCase();
      const itemDescription = (item.description || "").toLowerCase();
      const itemLocation = (item.location || item.city || "").toLowerCase();
      const itemPrice = Number(item.price) || 0;
      const itemDeposit = Number(item.deposit) || 0;
      const itemCoords = getItemCoordinates(item);

      if (
        normalizedSearch &&
        !itemName.includes(normalizedSearch) &&
        !itemDescription.includes(normalizedSearch) &&
        !itemLocation.includes(normalizedSearch)
      ) {
        return false;
      }

      if (category && item.category !== category) return false;
      if (city && !itemLocation.includes(city.toLowerCase())) return false;
      if (nearMe) {
        if (!userCoords || !itemCoords) return false;

        const distance = getDistanceKm(userCoords, itemCoords);
        if (distance > NEARBY_RADIUS_KM) return false;
      }
      if (min && itemPrice < min) return false;
      if (max && itemPrice > max) return false;
      if (maxDeposit && itemDeposit > maxDeposit) return false;
      if (onlyWithPhoto && !item.image) return false;

      return true;
    });

    return filtered.sort((first, second) => {
      const firstPrice = Number(first.price) || 0;
      const secondPrice = Number(second.price) || 0;

      if (sortMode === "price_asc") return firstPrice - secondPrice;
      if (sortMode === "price_desc") return secondPrice - firstPrice;
      return 0;
    });
  }, [
    category,
    city,
    depositMax,
    items,
    nearMe,
    onlyWithPhoto,
    priceMax,
    priceMin,
    search,
    sortMode,
    userCoords,
  ]);

  const categoryCounts = useMemo(
    () => countBy(items, (item) => item.category || ""),
    [items]
  );
  const cityCounts = useMemo(
    () => countBy(items, (item) => item.location || item.city || ""),
    [items]
  );
  const availableCategories = useMemo(
    () =>
      CATALOG_CATEGORIES.filter((item) => categoryCounts.get(item)).concat(
        Array.from(categoryCounts.keys()).filter(
          (item) => item && !CATALOG_CATEGORIES.includes(item)
        )
      ),
    [categoryCounts]
  );
  const availableCities = useMemo(
    () =>
      CATALOG_CITIES.filter((item) => cityCounts.get(item)).concat(
        Array.from(cityCounts.keys()).filter(
          (item) => item && !CATALOG_CITIES.includes(item)
        )
      ),
    [cityCounts]
  );

  const activeFiltersCount = [
    search,
    category,
    city,
    priceMin,
    priceMax,
    depositMax,
    nearMe ? "near" : "",
    onlyWithPhoto ? "photo" : "",
    sortMode !== "new" ? sortMode : "",
  ].filter(Boolean).length;

  const activeFilterLabels = [
    search.trim()
      ? { key: "search", label: `Поиск: ${search.trim()}`, onRemove: () => setSearch("") }
      : null,
    category
      ? { key: "category", label: category, onRemove: () => setCategory("") }
      : null,
    city ? { key: "city", label: city, onRemove: () => setCity("") } : null,
    nearMe
      ? { key: "near", label: `Рядом со мной до ${NEARBY_RADIUS_KM} км`, onRemove: clearNearMe }
      : null,
    priceMin
      ? {
          key: "priceMin",
          label: `от ${Number(priceMin).toLocaleString("ru-RU")} ₽`,
          onRemove: () => setPriceMin(""),
        }
      : null,
    priceMax
      ? {
          key: "priceMax",
          label: `до ${Number(priceMax).toLocaleString("ru-RU")} ₽`,
          onRemove: () => setPriceMax(""),
        }
      : null,
    depositMax
      ? {
          key: "depositMax",
          label: `залог до ${Number(depositMax).toLocaleString("ru-RU")} ₽`,
          onRemove: () => setDepositMax(""),
        }
      : null,
    onlyWithPhoto
      ? { key: "photo", label: "только с фото", onRemove: () => setOnlyWithPhoto(false) }
      : null,
    sortMode === "price_asc"
      ? { key: "priceAsc", label: "сначала дешевле", onRemove: () => setSortMode("new") }
      : null,
    sortMode === "price_desc"
      ? { key: "priceDesc", label: "сначала дороже", onRemove: () => setSortMode("new") }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    onRemove: () => void;
  }>;
  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMoreItems = filteredItems.length > visibleItems.length;

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-4 pb-24 pt-28 text-[#111111] sm:px-6 lg:pt-32">
      <div className="mx-auto max-w-7xl">
        <section className="mb-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-[#E8F7EA] px-3 py-1 text-xs font-extrabold text-[#3F9E47]">
                Каталог вещей
              </div>
              <h1 className="text-[36px] font-black leading-none sm:text-5xl">
                Найдите вещь рядом
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6B6B6B] sm:text-base">
                Фильтруйте объявления по категории, городу, цене и залогу. На
                телефоне карточки собраны компактно, чтобы быстрее сравнивать.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-[22px] bg-[#F7F7F5] p-2 text-center">
              <Metric label="Всего" value={items.length} />
              <Metric label="Найдено" value={filteredItems.length} />
              <Metric label="С фото" value={items.filter((item) => item.image).length} />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg">
                ⌕
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Что ищем? Например: палатка, перфоратор, кресло"
                className="h-14 w-full rounded-full border border-black/10 bg-[#F7F7F5] pl-12 pr-5 text-sm font-semibold outline-none transition focus:border-[#7BC47F] focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-lg font-black text-[#8D8D8D] transition hover:text-[#111111]"
                  aria-label="Очистить поиск"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={requestNearbyItems}
              disabled={nearLoading}
              className={`flex h-14 items-center justify-center gap-2 rounded-full border px-5 text-sm font-black shadow-sm transition disabled:cursor-wait disabled:opacity-70 ${
                nearMe
                  ? "border-[#7BC47F] bg-[#7BC47F] text-white"
                  : "border-black/10 bg-white text-[#111111] hover:border-[#7BC47F]"
              }`}
            >
              <span>⌖</span>
              <span>{nearLoading ? "Ищем..." : "Рядом"}</span>
            </button>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex h-14 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm font-black shadow-sm lg:hidden"
            >
              Фильтры
              {activeFiltersCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#7BC47F] px-2 text-xs text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="hidden h-14 rounded-full border border-black/10 bg-white px-5 text-sm font-black outline-none lg:block"
            >
              <option value="new">Сначала новые</option>
              <option value="price_asc">Сначала дешевле</option>
              <option value="price_desc">Сначала дороже</option>
            </select>
          </div>

          {nearError && (
            <div className="mt-3 rounded-2xl bg-[#FFF4E8] px-4 py-3 text-sm font-bold text-[#9A5A00]">
              {nearError}
            </div>
          )}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <QuickFilter active={!category} onClick={() => setCategory("")}>
              Все
            </QuickFilter>
            {availableCategories.slice(0, 8).map((item) => (
              <QuickFilter
                key={item}
                active={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </QuickFilter>
            ))}
          </div>
        </section>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {COLLECTIONS.map((collection) => {
            const active =
              category === collection.category &&
              (!collection.city || city === collection.city) &&
              (!collection.query || search === collection.query);

            return (
              <button
                key={collection.title}
                type="button"
                onClick={() => applyCollection(collection)}
                className={`rounded-[22px] border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  active
                    ? "border-[#7BC47F] bg-[#F1FAF2]"
                    : "border-black/5 bg-white"
                }`}
              >
                <div className="text-sm font-black text-[#111111]">
                  {collection.title}
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6B6B6B]">
                  {collection.text}
                </p>
              </button>
            );
          })}
        </section>

        <div className="grid gap-6 lg:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <FiltersPanel
              category={category}
              city={city}
              depositMax={depositMax}
              nearError={nearError}
              nearLoading={nearLoading}
              nearMe={nearMe}
              onlyWithPhoto={onlyWithPhoto}
              priceMax={priceMax}
              priceMin={priceMin}
              sortMode={sortMode}
              availableCategories={availableCategories}
              availableCities={availableCities}
              categoryCounts={categoryCounts}
              cityCounts={cityCounts}
              onCategoryChange={setCategory}
              onCityChange={changeCityFilter}
              onDepositMaxChange={setDepositMax}
              onNearMeClick={requestNearbyItems}
              onOnlyWithPhotoChange={setOnlyWithPhoto}
              onPriceMaxChange={setPriceMax}
              onPriceMinChange={setPriceMin}
              onReset={resetFilters}
              onSortModeChange={setSortMode}
            />
          </aside>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-bold text-[#6B6B6B]">
                {loading
                  ? "Загружаем объявления..."
                  : `${filteredItems.length} ${pluralize(filteredItems.length, "объявление", "объявления", "объявлений")}`}
              </div>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#6B6B6B] shadow-sm transition hover:text-[#111111]"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>

            {activeFilterLabels.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {activeFilterLabels.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={filter.onRemove}
                    className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-black text-[#5F5F5F] shadow-sm transition hover:text-[#111111]"
                  >
                    {filter.label} <span className="ml-1 text-[#9A9A9A]">×</span>
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-[24px] bg-white shadow-sm"
                  />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7F7F5] text-2xl">
                  ⌕
                </div>
                <h2 className="mt-4 text-2xl font-black">Ничего не найдено</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6B6B6B]">
                  Попробуйте убрать часть фильтров или поискать похожее название.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-6 rounded-full bg-[#7BC47F] px-6 py-3 text-sm font-black text-white"
                >
                  Показать все
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map((item) => (
                  <CatalogCard
                    key={item.id}
                    favorite={favoriteIds.includes(item.id)}
                    item={item}
                    onFavorite={() => toggleFavorite(item.id)}
                  />
                ))}
              </div>
            )}

            {hasMoreItems && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((current) => current + LOAD_MORE_COUNT)
                  }
                  className="rounded-full bg-[#111111] px-7 py-4 text-sm font-black text-white shadow-sm transition hover:bg-[#2A2A2A]"
                >
                  Показать еще {Math.min(
                    LOAD_MORE_COUNT,
                    filteredItems.length - visibleItems.length
                  )}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[150] bg-black/35 lg:hidden">
          <div className="absolute bottom-0 left-0 right-0 max-h-[88dvh] overflow-y-auto rounded-t-[30px] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">Фильтры</h2>
                <p className="text-sm text-[#6B6B6B]">Уточните поиск</p>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F5] text-xl font-black"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <FiltersPanel
              category={category}
              city={city}
              depositMax={depositMax}
              nearError={nearError}
              nearLoading={nearLoading}
              nearMe={nearMe}
              onlyWithPhoto={onlyWithPhoto}
              priceMax={priceMax}
              priceMin={priceMin}
              sortMode={sortMode}
              availableCategories={availableCategories}
              availableCities={availableCities}
              categoryCounts={categoryCounts}
              cityCounts={cityCounts}
              onCategoryChange={setCategory}
              onCityChange={changeCityFilter}
              onDepositMaxChange={setDepositMax}
              onNearMeClick={requestNearbyItems}
              onOnlyWithPhotoChange={setOnlyWithPhoto}
              onPriceMaxChange={setPriceMax}
              onPriceMinChange={setPriceMin}
              onReset={resetFilters}
              onSortModeChange={setSortMode}
            />

            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="mt-4 w-full rounded-full bg-[#7BC47F] px-5 py-4 text-sm font-black text-white"
            >
              Показать {filteredItems.length}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function FiltersPanel({
  availableCategories,
  availableCities,
  category,
  categoryCounts,
  city,
  cityCounts,
  depositMax,
  nearError,
  nearLoading,
  nearMe,
  onlyWithPhoto,
  priceMax,
  priceMin,
  sortMode,
  onCategoryChange,
  onCityChange,
  onDepositMaxChange,
  onNearMeClick,
  onOnlyWithPhotoChange,
  onPriceMaxChange,
  onPriceMinChange,
  onReset,
  onSortModeChange,
}: {
  availableCategories: string[];
  availableCities: string[];
  category: string;
  categoryCounts: Map<string, number>;
  city: string;
  cityCounts: Map<string, number>;
  depositMax: string;
  nearError: string;
  nearLoading: boolean;
  nearMe: boolean;
  onlyWithPhoto: boolean;
  priceMax: string;
  priceMin: string;
  sortMode: SortMode;
  onCategoryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onDepositMaxChange: (value: string) => void;
  onNearMeClick: () => void;
  onOnlyWithPhotoChange: (value: boolean) => void;
  onPriceMaxChange: (value: string) => void;
  onPriceMinChange: (value: string) => void;
  onReset: () => void;
  onSortModeChange: (value: SortMode) => void;
}) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm lg:sticky lg:top-28">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">Фильтры</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-black text-[#3F9E47]"
        >
          Сбросить
        </button>
      </div>

      <FilterBlock title="Категория">
        <div className="flex flex-wrap gap-2">
          <Chip active={!category} onClick={() => onCategoryChange("")}>
            Все
          </Chip>
          {availableCategories.map((item) => (
            <Chip
              key={item}
              active={category === item}
              onClick={() => onCategoryChange(item)}
              count={categoryCounts.get(item) || 0}
            >
              {item}
            </Chip>
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title="Город">
        <button
          type="button"
          onClick={onNearMeClick}
          disabled={nearLoading}
          className={`mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-black transition disabled:cursor-wait disabled:opacity-70 ${
            nearMe
              ? "border-[#7BC47F] bg-[#7BC47F] text-white"
              : "border-black/10 bg-white text-[#111111] hover:border-[#7BC47F]"
          }`}
        >
          <span>⌖</span>
          <span>{nearLoading ? "Ищем рядом..." : "Показать рядом со мной"}</span>
        </button>
        {nearError && (
          <p className="mb-3 rounded-2xl bg-[#FFF4E8] px-3 py-2 text-xs font-bold leading-relaxed text-[#9A5A00]">
            {nearError}
          </p>
        )}
        <select
          value={city}
          onChange={(event) => onCityChange(event.target.value)}
          className="h-12 w-full rounded-2xl border border-black/10 bg-[#F7F7F5] px-4 text-sm font-bold outline-none focus:border-[#7BC47F]"
        >
          <option value="">Все города</option>
          {availableCities.map((item) => (
            <option key={item} value={item}>
              {item} {cityCounts.get(item) ? `(${cityCounts.get(item)})` : ""}
            </option>
          ))}
        </select>
      </FilterBlock>

      <FilterBlock title="Цена за сутки">
        <div className="grid grid-cols-2 gap-2">
          <NumberInput value={priceMin} onChange={onPriceMinChange} placeholder="от" />
          <NumberInput value={priceMax} onChange={onPriceMaxChange} placeholder="до" />
        </div>
      </FilterBlock>

      <FilterBlock title="Залог">
        <NumberInput
          value={depositMax}
          onChange={onDepositMaxChange}
          placeholder="до, ₽"
        />
      </FilterBlock>

      <FilterBlock title="Сортировка">
        <select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as SortMode)}
          className="h-12 w-full rounded-2xl border border-black/10 bg-[#F7F7F5] px-4 text-sm font-bold outline-none focus:border-[#7BC47F]"
        >
          <option value="new">Сначала новые</option>
          <option value="price_asc">Сначала дешевле</option>
          <option value="price_desc">Сначала дороже</option>
        </select>
      </FilterBlock>

      <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl bg-[#F7F7F5] px-4 py-3 text-sm font-black">
        Только с фото
        <input
          checked={onlyWithPhoto}
          onChange={(event) => onOnlyWithPhotoChange(event.target.checked)}
          type="checkbox"
          className="h-5 w-5 accent-[#7BC47F]"
        />
      </label>
    </div>
  );
}

function CatalogCard({
  favorite,
  item,
  onFavorite,
}: {
  favorite: boolean;
  item: Item;
  onFavorite: () => void;
}) {
  const location = item.location || item.city || "Город не указан";
  const price = Number(item.price) || 0;
  const deposit = Number(item.deposit) || 0;
  const ownerName =
    item.owner_profile?.full_name || item.owner_profile?.username || "Владелец";
  const initial = ownerName.slice(0, 1).toUpperCase();

  return (
    <article className="group overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:rounded-[24px]">
      <Link href={getItemUrl(item)} className="block">
        <div className="relative aspect-[1.16/1] overflow-hidden bg-[#EFEFEB] sm:aspect-[4/3]">
          <img
            src={item.image || "/hero.jpg"}
            alt={item.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onFavorite();
            }}
            className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-base shadow-sm transition hover:scale-105 sm:right-3 sm:top-3 sm:h-10 sm:w-10 sm:text-lg ${
              favorite ? "bg-[#111111] text-white" : "bg-white text-[#111111]"
            }`}
            aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"}
          >
            {favorite ? "♥" : "♡"}
          </button>

          <div className="absolute bottom-2 left-2 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-[#111111] shadow-sm sm:bottom-3 sm:left-3 sm:text-xs">
            {item.rating?.count ? (
              <span>
                ★ {item.rating.average.toFixed(1)} · {item.rating.count}
              </span>
            ) : (
              <span>Нет отзывов</span>
            )}
          </div>

          <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#7BC47F] text-xs font-black text-white sm:bottom-3 sm:right-3 sm:h-11 sm:w-11 sm:text-base">
            {item.owner_profile?.avatar ? (
              <img
                src={item.owner_profile.avatar}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {item.category && (
              <span className="rounded-full bg-[#F1FAF2] px-2.5 py-1 text-[10px] font-black text-[#3F9E47] sm:text-xs">
                {item.category}
              </span>
            )}
            {deposit > 0 && (
              <span className="rounded-full bg-[#F7F7F5] px-2.5 py-1 text-[10px] font-black text-[#6B6B6B] sm:text-xs">
                Залог {deposit.toLocaleString("ru-RU")} ₽
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 min-h-[36px] text-sm font-black leading-tight sm:min-h-0 sm:text-lg">
            {item.name}
          </h3>
          <p className="mt-1 line-clamp-2 min-h-[32px] text-xs leading-snug text-[#6B6B6B] sm:text-sm">
            {location}
          </p>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <div className="text-lg font-black sm:text-2xl">
                {price.toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-[10px] font-bold uppercase text-[#8D8D8D]">
                в день
              </div>
            </div>

            <span className="hidden rounded-full bg-[#111111] px-4 py-2 text-xs font-black text-white sm:inline-flex">
              Открыть
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function Chip({
  active,
  children,
  count,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-black transition ${
        active
          ? "border-[#7BC47F] bg-[#7BC47F] text-white"
          : "border-black/10 bg-white text-[#5F5F5F] hover:border-[#7BC47F] hover:text-[#111111]"
      }`}
    >
      {children}
      {typeof count === "number" && count > 0 && (
        <span className={active ? "text-white/80" : "text-[#9A9A9A]"}>
          {count}
        </span>
      )}
    </button>
  );
}

function QuickFilter({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${
        active
          ? "bg-[#111111] text-white"
          : "bg-[#F7F7F5] text-[#5F5F5F] hover:text-[#111111]"
      }`}
    >
      {children}
    </button>
  );
}

function FilterBlock({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="border-t border-black/5 py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-sm font-black text-[#111111]">{title}</h3>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[82px] rounded-[18px] bg-white px-3 py-3 shadow-sm">
      <div className="text-xl font-black">{value}</div>
      <div className="text-[10px] font-bold uppercase text-[#8D8D8D]">
        {label}
      </div>
    </div>
  );
}

function NumberInput({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <input
      inputMode="numeric"
      min="0"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="number"
      value={value}
      className="h-12 w-full rounded-2xl border border-black/10 bg-[#F7F7F5] px-4 text-sm font-bold outline-none focus:border-[#7BC47F]"
    />
  );
}

function getRating(ratings: number[]): ItemRating {
  const cleanRatings = ratings.filter((rating) => rating > 0);

  if (!cleanRatings.length) {
    return { average: 0, count: 0 };
  }

  const total = cleanRatings.reduce((sum, rating) => sum + rating, 0);

  return {
    average: Math.round((total / cleanRatings.length) * 10) / 10,
    count: cleanRatings.length,
  };
}

function pluralize(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const key = getKey(item).trim();
    if (!key) return;

    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return counts;
}

function parseCoordinates(
  latitude?: string | null,
  longitude?: string | null
): Coordinates | null {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return null;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

function getItemCoordinates(item: Item): Coordinates | null {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function getDistanceKm(first: Coordinates, second: Coordinates) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

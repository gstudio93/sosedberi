"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SafeImage from "@/components/SafeImage";
import { getItemUrl } from "@/lib/item-url";
import { supabase } from "../../lib/supabase";

type Favorite = {
  id: string;
  item_id: string;
  created_at?: string;
  items?: {
    id: string;
    name: string;
    image?: string | null;
    location?: string | null;
    city?: string | null;
    category?: string | null;
    price?: string | number | null;
    deposit?: string | number | null;
    owner_avatar?: string | null;
  } | null;
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const currentUser = auth.user;

    if (!currentUser) {
      setUserId(null);
      setFavorites([]);
      setLoading(false);
      return;
    }

    setUserId(currentUser.id);

    const { data } = await supabase
      .from("favorites")
      .select(
        `
        *,
        items (*)
      `
      )
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    setFavorites((data || []) as Favorite[]);
    setLoading(false);
  }

  async function removeFavorite(itemId: string) {
    if (!userId) return;

    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("item_id", itemId);

    setFavorites((prev) => prev.filter((fav) => fav.item_id !== itemId));
  }

  const visibleFavorites = favorites.filter((favorite) => favorite.items);

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[28px] border border-black/5 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-[#E8F7EA] px-3 py-1 text-xs font-extrabold text-[#3F9E47]">
                Личная подборка
              </div>
              <h1 className="text-4xl font-extrabold md:text-5xl">
                Избранное
              </h1>
              <p className="mt-3 max-w-2xl text-base text-[#6B6B6B]">
                Сохраняйте вещи, чтобы быстро вернуться к ним перед арендой.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
              <Stat label="Сохранено" value={visibleFavorites.length} />
              <Stat
                label="Готово к аренде"
                value={visibleFavorites.filter((fav) => fav.items).length}
              />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[28px] border border-black/5 bg-white p-8 shadow-sm">
            Загружаем избранное...
          </div>
        ) : !userId ? (
          <EmptyState
            title="Войдите, чтобы сохранять вещи"
            text="После входа избранные объявления будут доступны на любом устройстве."
            actionHref="/login"
            actionLabel="Войти"
          />
        ) : visibleFavorites.length === 0 ? (
          <EmptyState
            title="Пока ничего не сохранено"
            text="Добавляйте объявления в избранное, чтобы сравнить цены, районы и условия аренды."
            actionHref="/catalog"
            actionLabel="Смотреть каталог"
          />
        ) : (
          <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">Сохраненные вещи</h2>
                <p className="mt-1 text-sm text-[#6B6B6B]">
                  {visibleFavorites.length} объявлений в списке.
                </p>
              </div>

              <Link
                href="/catalog"
                className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold transition hover:bg-[#F7F7F5]"
              >
                Добавить еще
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleFavorites.map((favorite) => {
                const item = favorite.items!;
                const location = item.location || item.city || "Местоположение не указано";

                return (
                  <article
                    key={favorite.id}
                    className="group overflow-hidden rounded-[22px] border border-black/5 bg-[#F7F7F5] transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link href={getItemUrl(item)} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-white">
                        <SafeImage
                          src={item.image || "/hero.jpg"}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          fallbackLabel="Фото товара"
                        />

                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            removeFavorite(item.id);
                          }}
                          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-lg text-red-500 shadow-sm transition hover:scale-105"
                          aria-label="Убрать из избранного"
                        >
                          ♥
                        </button>

                        {item.category && (
                          <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#111111] shadow-sm">
                            {item.category}
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="line-clamp-1 text-lg font-extrabold">
                              {item.name}
                            </h3>
                            <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-snug text-[#6B6B6B]">
                              {location}
                            </p>
                          </div>

                          {item.owner_avatar && (
                            <SafeImage
                              src={item.owner_avatar}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-full border-2 border-white object-cover"
                              fallbackClassName="h-10 w-10 shrink-0 rounded-full border-2 border-white bg-[#7BC47F] text-white"
                              fallbackLabel={(item.name || "S").slice(0, 1).toUpperCase()}
                            />
                          )}
                        </div>

                        <div className="mt-5 flex items-end justify-between gap-3">
                          <div>
                            <div className="text-2xl font-extrabold">
                              {Number(item.price || 0).toLocaleString("ru-RU")} ₽
                            </div>
                            <div className="text-xs font-bold uppercase text-[#8D8D8D]">
                              в день
                            </div>
                          </div>

                          {Number(item.deposit || 0) > 0 && (
                            <div className="rounded-2xl bg-white px-3 py-2 text-right">
                              <div className="text-xs font-bold uppercase text-[#8D8D8D]">
                                Залог
                              </div>
                              <div className="text-sm font-extrabold">
                                {Number(item.deposit).toLocaleString("ru-RU")} ₽
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] bg-[#F7F7F5] p-4">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase text-[#8D8D8D]">
        {label}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  text,
  actionHref,
  actionLabel,
}: {
  title: string;
  text: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-sm lg:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F7F5] text-3xl">
        ♡
      </div>

      <h2 className="mt-5 text-2xl font-extrabold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-[#6B6B6B]">{text}</p>

      <Link
        href={actionHref}
        className="mt-7 inline-flex rounded-full bg-[#7BC47F] px-7 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#69B56E]"
      >
        {actionLabel}
      </Link>
    </section>
  );
}

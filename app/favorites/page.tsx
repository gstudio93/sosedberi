"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    const { data: auth } = await supabase.auth.getUser();
    const currentUser = auth.user;

    if (!currentUser) return;

    setUser(currentUser);

    const { data } = await supabase
      .from("favorites")
      .select(`
        *,
        items (*)
      `)
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    setFavorites(data || []);
  }

  async function removeFavorite(itemId: string) {
    if (!user) return;

    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("item_id", itemId);

    setFavorites((prev) =>
      prev.filter((fav) => fav.item_id !== itemId)
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-32 pt-32 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <h1 className="text-5xl font-black">
            Избранное
          </h1>

          <p className="mt-3 text-lg text-[#6B6B6B]">
            Сохранённые вещи, к которым можно вернуться позже
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="rounded-[32px] bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">♡</div>

            <h2 className="mt-4 text-2xl font-black">
              Пока ничего не сохранено
            </h2>

            <p className="mt-2 text-[#6B6B6B]">
              Добавляйте вещи в избранное, чтобы быстро найти их позже.
            </p>

            <a
              href="/"
              className="mt-6 inline-block rounded-full bg-[#7BC47F] px-8 py-4 font-bold text-white"
            >
              Смотреть товары
            </a>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) => {
              const item = fav.items;

              if (!item) return null;

              return (
                <div
                  key={fav.id}
                  className="group overflow-hidden rounded-[32px] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <a href={`/item/${item.id}`}>
                    <div className="relative">
                      <img
                        src={item.image || "/hero.jpg"}
                        alt={item.name}
                        className="h-[240px] w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          removeFavorite(item.id);
                        }}
                        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm"
                      >
                        ♥
                      </button>
                    </div>

                    <div className="p-5">
                      <h3 className="line-clamp-1 text-xl font-black">
                        {item.name}
                      </h3>

                      <p className="mt-2 text-sm text-[#6B6B6B]">
                        📍 {item.location}
                      </p>

                      <div className="mt-4 text-2xl font-black">
                        {item.price} ₽
                      </div>

                      <div className="text-sm text-[#6B6B6B]">
                        в день
                      </div>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function FavoritesPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    const { data: authData } =
      await supabase.auth.getUser();

    const user = authData.user;

    if (!user) return;

    const { data } = await supabase
      .from("favorites")
      .select(`
        *,
        items (*)
      `)
      .eq("user_id", user.id);

    const mapped =
      data?.map((f) => f.items) || [];

    setItems(mapped);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">

        <h1 className="mb-10 text-5xl font-black">
          Избранное
        </h1>

        {items.length === 0 ? (
          <div className="rounded-3xl bg-white/5 p-10 text-neutral-400">
            Пока пусто
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <a
                key={item.id}
                href={`/item/${item.id}`}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              >
                {item.image && (
                  <img
                    src={item.image}
                    className="h-56 w-full object-cover"
                  />
                )}

                <div className="p-5">
                  <h3 className="text-xl font-bold">
                    {item.name}
                  </h3>

                  <p className="mt-2 text-neutral-400">
                    📍 {item.location}
                  </p>

                  <div className="mt-4 text-2xl font-black">
                    {item.price}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
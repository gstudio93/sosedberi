"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MyItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setItems(data || []);
    }

    setLoading(false);
  }

  async function deleteItem(id: string) {
    const confirmed = confirm("Удалить вещь?");

    if (!confirmed) return;

    await supabase
      .from("items")
      .delete()
      .eq("id", id);

    setItems(items.filter((item) => item.id !== id));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        Загрузка...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="text-5xl font-black">
            Мои объявления
          </h1>

          <a
            href="/add"
            className="rounded-2xl bg-white px-6 py-3 font-semibold text-black"
          >
            + Добавить
          </a>
        </div>

        {items.length === 0 ? (
          <div className="mt-20 rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-neutral-400">
            У вас пока нет объявлений
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-4"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-56 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center rounded-2xl bg-black text-6xl">
                    {item.emoji}
                  </div>
                )}

                <h2 className="mt-4 text-2xl font-bold">
                  {item.name}
                </h2>

                <p className="mt-2 text-neutral-400">
                  📍 {item.location}
                </p>

                <div className="mt-4 text-xl font-bold">
                  {item.price}
                </div>

                <button
                  onClick={() => deleteItem(item.id)}
                  className="mt-6 w-full rounded-2xl border border-red-500/20 bg-red-500/10 py-3 text-red-400"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
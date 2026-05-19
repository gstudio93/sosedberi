"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const [loading, setLoading] =
    useState(true);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [users, setUsers] =
    useState<any[]>([]);

  const [items, setItems] =
    useState<any[]>([]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data } =
      await supabase.auth.getUser();

    const user = data.user;

    if (!user) return;

    const { data: profile } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    loadUsers();
    loadItems();

    setLoading(false);
  }

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*");

    setUsers(data || []);
  }

  async function loadItems() {
    const { data } = await supabase
      .from("items")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setItems(data || []);
  }

  async function deleteItem(id: string) {
    const confirmed = confirm(
      "Удалить объявление?"
    );

    if (!confirmed) return;

    await supabase
      .from("items")
      .delete()
      .eq("id", id);

    setItems((prev) =>
      prev.filter((item) => item.id !== id)
    );
  }

  async function toggleVerify(
    userId: string,
    verified: boolean
  ) {
    await supabase
      .from("profiles")
      .update({
        verified: !verified,
      })
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              verified: !verified,
            }
          : user
      )
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        Загрузка...
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        Нет доступа
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">

      <div className="mx-auto max-w-7xl">

        <h1 className="mb-10 text-5xl font-black">
          Admin Panel
        </h1>

        {/* USERS */}
        <section className="mb-20">

          <h2 className="mb-6 text-3xl font-bold">
            Пользователи
          </h2>

          <div className="space-y-4">

            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-3xl bg-white/5 p-6"
              >
                <div>
                  <div className="text-xl font-bold">
                    {user.username ||
                      "Без имени"}
                  </div>

                  <div className="mt-2 text-sm text-neutral-400">
                    {user.id}
                  </div>
                </div>

                <button
                  onClick={() =>
                    toggleVerify(
                      user.id,
                      user.verified
                    )
                  }
                  className={`rounded-2xl px-5 py-3 font-bold ${
                    user.verified
                      ? "bg-green-500"
                      : "bg-white text-black"
                  }`}
                >
                  {user.verified
                    ? "VERIFIED"
                    : "Verify"}
                </button>
              </div>
            ))}

          </div>
        </section>

        {/* ITEMS */}
        <section>

          <h2 className="mb-6 text-3xl font-bold">
            Объявления
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-3xl bg-white/5"
              >
                {item.image && (
                  <img
                    src={item.image}
                    className="h-52 w-full object-cover"
                  />
                )}

                <div className="p-5">

                  <h3 className="text-2xl font-bold">
                    {item.name}
                  </h3>

                  <p className="mt-2 text-neutral-400">
                    📍 {item.location}
                  </p>

                  <div className="mt-5 flex gap-3">

                    <a
                      href={`/item/${item.id}`}
                      className="flex-1 rounded-2xl bg-white px-4 py-3 text-center font-bold text-black"
                    >
                      Открыть
                    </a>

                    <button
                      onClick={() =>
                        deleteItem(item.id)
                      }
                      className="rounded-2xl bg-red-500 px-4 py-3 font-bold"
                    >
                      ✕
                    </button>

                  </div>

                </div>
              </div>
            ))}

          </div>

        </section>

      </div>

    </main>
  );
}
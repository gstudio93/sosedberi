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
  <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">
    <div className="mx-auto max-w-7xl">
      <div className="mb-10">
        <h1 className="text-5xl font-black">Админ-панель</h1>
        <p className="mt-3 text-lg text-[#6B6B6B]">
          Управление пользователями, проверками и объявлениями
        </p>
      </div>

      <div className="mb-10 grid gap-5 md:grid-cols-3">
        <div className="rounded-[28px] bg-white p-6 shadow-sm">
          <div className="text-sm text-[#6B6B6B]">Пользователи</div>
          <div className="mt-2 text-4xl font-black">{users.length}</div>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-sm">
          <div className="text-sm text-[#6B6B6B]">Проверенные</div>
          <div className="mt-2 text-4xl font-black">
            {users.filter((u) => u.verified).length}
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-sm">
          <div className="text-sm text-[#6B6B6B]">Объявления</div>
          <div className="mt-2 text-4xl font-black">{items.length}</div>
        </div>
      </div>

      <section className="rounded-[36px] bg-white p-8 shadow-sm">
        <h2 className="text-3xl font-black">Пользователи</h2>

        <div className="mt-6 space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-5 rounded-[28px] border border-black/5 bg-[#F7F7F5] p-5 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-xl font-black">
                  {user.full_name || "Без имени"}
                </div>

                <div className="mt-1 text-sm text-[#6B6B6B]">
                  {user.email || user.phone || user.id}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {user.verified && (
                    <span className="rounded-full bg-[#E8F7EA] px-3 py-1 text-xs font-bold text-[#3F9E47]">
                      ✓ Профиль проверен
                    </span>
                  )}

                  {user.phone_verified && (
                    <span className="rounded-full bg-[#E8F7EA] px-3 py-1 text-xs font-bold text-[#3F9E47]">
                      📱 Телефон подтверждён
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 md:items-end">
                <button
                  onClick={() => toggleVerify(user.id, user.verified)}
                  className={`rounded-full px-6 py-3 font-bold ${
                    user.verified
                      ? "bg-[#111111] text-white"
                      : "bg-[#7BC47F] text-white"
                  }`}
                >
                  {user.verified ? "Снять проверку" : "Проверить профиль"}
                </button>

                <button
                  onClick={async () => {
                    await supabase
                      .from("profiles")
                      .update({
                        phone_verified: !user.phone_verified,
                      })
                      .eq("id", user.id);

                    loadUsers();
                  }}
                  className={`rounded-full px-6 py-3 font-bold ${
                    user.phone_verified
                      ? "bg-[#111111] text-white"
                      : "border border-black/10 bg-white text-[#111111]"
                  }`}
                >
                  {user.phone_verified
                    ? "Снять телефон"
                    : "Подтвердить телефон"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[36px] bg-white p-8 shadow-sm">
        <h2 className="text-3xl font-black">Объявления</h2>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-[28px] border border-black/5 bg-[#F7F7F5]"
            >
              {item.image && (
                <img
                  src={item.image}
                  className="h-52 w-full object-cover"
                  alt=""
                />
              )}

              <div className="p-5">
                <h3 className="text-xl font-black">{item.name}</h3>

                <p className="mt-2 text-sm text-[#6B6B6B]">
                  📍 {item.location}
                </p>

                <div className="mt-5 flex gap-3">
                  <a
                    href={`/item/${item.id}`}
                    className="flex-1 rounded-full bg-white px-4 py-3 text-center font-bold"
                  >
                    Открыть
                  </a>

                  <button
                    onClick={() => deleteItem(item.id)}
                    className="rounded-full bg-red-500 px-5 py-3 font-bold text-white"
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
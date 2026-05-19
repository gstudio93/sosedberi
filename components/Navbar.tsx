"use client";

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [menuOpen, setMenuOpen] =
    useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data } =
      await supabase.auth.getUser();

    const currentUser = data.user;

    if (!currentUser) return;

    setUser(currentUser);

    loadUnread(currentUser.id);

    const channel = supabase
      .channel("navbar-notifications")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function loadUnread(
    userId: string
  ) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("read", false);

    setUnreadCount(data?.length || 0);
  }

  async function logout() {
    await supabase.auth.signOut();

    window.location.href = "/";
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50">

      <div className="mx-auto mt-5 flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-black/40 px-6 py-4 backdrop-blur-xl">

        {/* LOGO */}
        <Link
          href="/"
          className="text-2xl font-black tracking-tight"
        >
          SosedBeri
        </Link>

        {/* CENTER MENU */}
        <div className="hidden items-center gap-8 lg:flex">

          <Link
            href="/"
            className="text-sm text-white/70 transition hover:text-white"
          >
            Каталог
          </Link>

          <Link
            href="/favorites"
            className="text-sm text-white/70 transition hover:text-white"
          >
            Избранное
          </Link>

          <Link
            href="/add"
            className="rounded-full bg-[#B44AC0] px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.03]"
          >
            Сдать вещь
          </Link>

        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">

          {/* NOTIFICATIONS */}
          {user && (
            <Link
              href="/notifications"
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-lg transition hover:bg-white/10"
            >
              🔔

              {unreadCount > 0 && (
                <div className="absolute right-0 top-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                  {unreadCount}
                </div>
              )}
            </Link>
          )}

          {/* CHAT */}
          {user && (
            <Link
              href="/chats"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-lg transition hover:bg-white/10"
            >
              💬
            </Link>
          )}

          {/* USER */}
          {user ? (
            <div className="relative">

              <button
                onClick={() =>
                  setMenuOpen(!menuOpen)
                }
                className="flex items-center gap-3 rounded-full bg-white px-2 py-2 pr-5 text-black transition hover:scale-[1.02]"
              >

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B44AC0] text-sm font-bold text-white">
                  {user.email?.[0]
                    ?.toUpperCase()}
                </div>

                <span className="text-sm font-bold">
                  Профиль
                </span>

              </button>

              {/* DROPDOWN */}
              {menuOpen && (
                <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-3xl border border-white/10 bg-[#111111] shadow-2xl">

                  <div className="border-b border-white/5 p-5">

                    <div className="text-sm text-white/40">
                      Вы вошли как
                    </div>

                    <div className="mt-1 font-bold">
                      {user.email}
                    </div>

                  </div>

                  <div className="p-2">

                    <Link
                      href="/profile"
                      className="block rounded-2xl px-4 py-3 text-sm transition hover:bg-white/5"
                    >
                      Профиль
                    </Link>

                    <Link
                      href="/favorites"
                      className="block rounded-2xl px-4 py-3 text-sm transition hover:bg-white/5"
                    >
                      Избранное
                    </Link>

                    <Link
                      href="/add"
                      className="block rounded-2xl px-4 py-3 text-sm transition hover:bg-white/5"
                    >
                      Добавить объявление
                    </Link>

                    <button
                      onClick={logout}
                      className="mt-2 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
                    >
                      Выход
                    </button>

                  </div>

                </div>
              )}

            </div>
          ) : (
            <div className="flex items-center gap-3">

              <Link
                href="/login"
                className="rounded-full px-5 py-3 text-sm text-white/70 transition hover:text-white"
              >
                Вход
              </Link>

              <Link
                href="/register"
                className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:scale-[1.03]"
              >
                Регистрация
              </Link>

            </div>
          )}

        </div>

      </div>

    </header>
  );
}
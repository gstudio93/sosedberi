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
    <header className="absolute left-0 right-0 top-0 z-50 px-6 py-4">

      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full bg-white/85 px-6 py-3 shadow-sm backdrop-blur-xl">

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
            className="text-sm font-medium text-[#111111]/70 transition hover:text-[#111111]"
          >
            Каталог
          </Link>

          <Link
            href="/favorites"
            className="text-sm font-medium text-[#111111]/70 transition hover:text-[#111111]"
          >
            Избранное
          </Link>

          <Link
            href="/add"
            className="rounded-full bg-[#7BC47F] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#69B56E]"
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
            <div className="relative group">

              <button
  onClick={() => setMenuOpen(!menuOpen)}
  className="flex items-center gap-3 rounded-full bg-white px-2 py-2 pr-5 text-black transition hover:scale-[1.02]"
>
              

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7BC47F] text-sm font-bold text-white">
                  {user.email?.[0]
                    ?.toUpperCase()}
                </div>

                <span className="text-sm font-bold">
                  Профиль
                </span>

              </button>

              {/* DROPDOWN */}
             <div
  className={`
    absolute right-0 top-full z-50 mt-3
    transition-all duration-200

    ${menuOpen ? "visible opacity-100" : "invisible opacity-0"}

    lg:invisible lg:opacity-0
    lg:group-hover:visible lg:group-hover:opacity-100
  `}
>
  <div className="w-72 overflow-hidden rounded-[28px] border border-black/10 bg-white p-2 shadow-2xl">
    <div className="rounded-3xl bg-[#F7F7F5] p-5">
      <div className="text-xs font-medium text-[#6B6B6B]">
        Вы вошли как
      </div>

      <div className="mt-1 truncate text-sm font-bold text-[#111111]">
        {user.email}
      </div>
    </div>

    <div className="mt-2 space-y-1">
      <Link
        href="/profile"
        onClick={() => setMenuOpen(false)}
        className="block rounded-2xl px-4 py-3 text-sm font-medium text-[#111111] transition hover:bg-[#F7F7F5]"
      >
        Профиль
      </Link>

      <Link
        href="/favorites"
        onClick={() => setMenuOpen(false)}
        className="block rounded-2xl px-4 py-3 text-sm font-medium text-[#111111] transition hover:bg-[#F7F7F5]"
      >
        Избранное
      </Link>

      <Link
        href="/add"
        onClick={() => setMenuOpen(false)}
        className="block rounded-2xl px-4 py-3 text-sm font-medium text-[#111111] transition hover:bg-[#F7F7F5]"
      >
        Добавить объявление
      </Link>

      <button
        onClick={logout}
        className="mt-2 w-full rounded-full bg-[#7BC47F] px-4 py-3 text-sm font-bold text-[#111111] transition hover:bg-[#69B56E]"
      >
        Выйти
      </button>
    </div>
  </div>
  </div>
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
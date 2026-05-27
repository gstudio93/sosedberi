"use client";

"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [mounted, setMounted] =
  useState(false);
const [notificationsOpen, setNotificationsOpen] = useState(false);
const unreadNotifications =
  notifications.filter(
    (n) => !n.is_read
  ).length;
  const [user, setUser] = useState<any>(null);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [menuOpen, setMenuOpen] =
    useState(false);

 useEffect(() => {
  setMounted(true);
  init();
}, []);

  async function init() {
    const { data } =
      await supabase.auth.getUser();

    const currentUser = data.user;

    if (!currentUser) return;

    setUser(currentUser);
    loadNotifications(currentUser.id);

    loadUnread(currentUser.id);
   
    const channel = supabase
  .channel(
    `navbar-notifications-${currentUser.id}`
  )
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${currentUser.id}`,
    },
    async () => {
      await loadNotifications(
        currentUser.id
      );
    }
  )
  .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
  async function markNotificationsRead() {
  if (!user) return;

  await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", user.id)
    .eq("is_read", false);

  setNotifications((prev) =>
    prev.map((n) => ({
      ...n,
      is_read: true,
    }))
  );
}
async function loadNotifications(userId: string) {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  setNotifications(data || []);
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
    <header className="absolute left-0 right-0 top-0 z-50 px-4 py-4 lg:px-6">

      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl lg:px-6">

        {/* LOGO */}
        <Link
          href="/"
          className="text-xl font-black tracking-tight lg:text-2xl"
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
        <div className="flex items-center gap-2 lg:gap-3">

          {/* NOTIFICATIONS */}
          {user && (
            <div className="relative">
  <button
    onClick={() => {
  setNotificationsOpen(
    !notificationsOpen
  );

  if (!notificationsOpen) {
    markNotificationsRead();
  }
}}
    className="relative hidden rounded-full bg-white px-5 py-3 text-sm font-bold text-[#111111] transition hover:bg-[#F7F7F5] lg:block"
  >
    🔔

    {unreadNotifications > 0 && (
      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7BC47F] px-1 text-xs text-white">
        {unreadNotifications}
      </span>
    )}
  </button>

  {notificationsOpen && (
    <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-[28px] border border-black/10 bg-white p-2 shadow-2xl">
      {notifications.length === 0 ? (
        <div className="p-5 text-sm text-[#6B6B6B]">
          Пока нет уведомлений
        </div>
      ) : (
        notifications.map((n) => (
          <a
            key={n.id}
            href={n.link || "/profile"}
            className="block rounded-2xl px-4 py-3 transition hover:bg-[#F7F7F5]"
          >
            <div className="text-sm font-bold text-[#111111]">
              {n.text}
            </div>

            <div className="mt-1 text-xs text-[#8D8D8D]">
              {mounted
  ? new Date(
      n.created_at
    ).toLocaleString()
  : ""}
            </div>
          </a>
        ))
      )}
    </div>
  )}
</div>
          )}

          {/* CHAT */}
          {user && (
           <a
  href="/messages"
  className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-[#111111] transition hover:bg-[#F7F7F5] lg:h-auto lg:w-auto lg:px-5 lg:py-3 lg:text-sm lg:font-bold"
>
  <span className="lg:hidden">💬</span>
  <span className="hidden lg:inline">💬 Сообщения</span>
</a>
          )}

          {/* USER */}
          {user ? (
            <div className="relative group">

              <button
  onClick={() => setMenuOpen(!menuOpen)}
  className="flex items-center gap-2 rounded-full bg-white px-2 py-2 text-black transition hover:scale-[1.02] lg:gap-3 lg:pr-5"
>
              

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7BC47F] text-sm font-bold text-white">
                  {user.email?.[0]
                    ?.toUpperCase()}
                </div>

                <span className="hidden text-sm font-bold lg:block">
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
  href="/login"
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
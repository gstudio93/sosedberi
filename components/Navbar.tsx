"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Notice = {
  id: string;
  text: string | null;
  link: string | null;
  created_at: string;
  is_read: boolean | null;
};

type Profile = {
  full_name: string | null;
  avatar: string | null;
};

const navLinks = [
  { href: "/", label: "Каталог" },
  { href: "/favorites", label: "Избранное" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notice[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const unreadNotifications = useMemo(
    () => notifications.filter((notice) => !notice.is_read).length,
    [notifications]
  );

  const displayName =
    profile?.full_name?.trim() || user?.email?.split("@")[0] || "Профиль";

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let active = true;

    function clearUserState() {
      setUser(null);
      setProfile(null);
      setNotifications([]);
      setNotificationsOpen(false);
      setMenuOpen(false);
    }

    async function setupUser(currentUser: User | null) {
      if (!active) return;

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      if (!currentUser) {
        clearUserState();
        return;
      }

      setUser(currentUser);
      await Promise.all([
        loadNotifications(currentUser.id),
        loadProfile(currentUser.id),
      ]);

      channel = supabase
        .channel(`navbar-notifications-${currentUser.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUser.id}`,
          },
          () => loadNotifications(currentUser.id)
        )
        .subscribe();
    }

    async function init() {
      setMounted(true);

      const { data } = await supabase.auth.getUser();
      await setupUser(data.user);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setupUser(session?.user || null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    setNotificationsOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar")
      .eq("id", userId)
      .maybeSingle();

    setProfile((data as Profile | null) || null);
  }

  async function loadNotifications(userId: string) {
    const { data } = await supabase
      .from("notifications")
      .select("id, text, link, created_at, is_read")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    setNotifications((data as Notice[]) || []);
  }

  async function markNotificationsRead() {
    if (!user || unreadNotifications === 0) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((current) =>
      current.map((notice) => ({ ...notice, is_read: true }))
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function toggleNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    setMenuOpen(false);

    if (nextOpen) {
      markNotificationsRead();
    }
  }

  const isCatalogActive = pathname === "/" || pathname.startsWith("/item");

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-3 py-2 lg:px-6 lg:py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-[24px] border border-black/5 bg-white/92 px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:gap-4 lg:rounded-[28px] lg:px-5 lg:py-3">
        <Link
          href="/"
          className="shrink-0 text-xl font-black leading-none text-[#111111] lg:text-2xl"
          aria-label="SosedBeri"
        >
          SosedBeri
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-[#F7F7F5] p-1 lg:flex">
          {navLinks.map((link) => {
            const active =
              link.href === "/" ? isCatalogActive : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-white text-[#111111] shadow-sm"
                    : "text-[#5F5F5F] hover:text-[#111111]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/add"
            className="hidden rounded-full bg-[#75C57B] px-6 py-3 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(117,197,123,0.28)] transition hover:bg-[#65B96C] lg:inline-flex"
          >
            Сдать вещь
          </Link>

          {user ? (
            <>
              <div className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={toggleNotifications}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F7F5] text-lg transition hover:bg-[#EEEEEA]"
                  aria-label="Уведомления"
                >
                  <span aria-hidden="true">🔔</span>

                  {unreadNotifications > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#75C57B] px-1 text-xs font-extrabold text-white">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-3 w-80 overflow-hidden rounded-[24px] border border-black/10 bg-white p-2 shadow-2xl">
                    <div className="px-4 py-3 text-sm font-extrabold">
                      Уведомления
                    </div>

                    {notifications.length === 0 ? (
                      <div className="rounded-2xl bg-[#F7F7F5] p-4 text-sm text-[#6B6B6B]">
                        Пока нет уведомлений
                      </div>
                    ) : (
                      notifications.map((notice) => (
                        <Link
                          key={notice.id}
                          href={notice.link || "/notifications"}
                          className="block rounded-2xl px-4 py-3 transition hover:bg-[#F7F7F5]"
                        >
                          <div className="text-sm font-bold text-[#111111]">
                            {notice.text || "Новое уведомление"}
                          </div>

                          <div className="mt-1 text-xs text-[#8D8D8D]">
                            {mounted
                              ? new Date(notice.created_at).toLocaleString("ru-RU")
                              : ""}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>

              <Link
                href="/messages"
                className={`hidden items-center gap-2 rounded-full px-4 py-3 text-sm font-extrabold transition lg:inline-flex ${
                  pathname.startsWith("/messages") || pathname.startsWith("/chat")
                    ? "bg-[#111111] text-white"
                    : "bg-[#F7F7F5] text-[#111111] hover:bg-[#EEEEEA]"
                }`}
              >
                <span aria-hidden="true">💬</span>
                Сообщения
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen((open) => !open);
                    setNotificationsOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition ${
                    pathname.startsWith("/profile")
                      ? "bg-[#111111] text-white"
                      : "bg-[#F7F7F5] text-[#111111] hover:bg-[#EEEEEA]"
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#75C57B] text-sm font-extrabold text-white">
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      displayName[0]?.toUpperCase()
                    )}
                  </span>

                  <span className="hidden max-w-32 truncate text-sm font-extrabold lg:block">
                    {displayName}
                  </span>

                  <span className="hidden text-sm opacity-60 lg:block">⌄</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-[24px] border border-black/10 bg-white p-2 text-[#111111] shadow-2xl">
                    <div className="rounded-[20px] bg-[#F7F7F5] p-4">
                      <div className="text-xs font-semibold text-[#6B6B6B]">
                        Вы вошли как
                      </div>
                      <div className="mt-1 truncate text-sm font-extrabold">
                        {user.email}
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <MenuLink href="/profile" label="Личный кабинет" />
                      <MenuLink href="/notifications" label="Уведомления" />
                      <MenuLink href="/favorites" label="Избранное" />
                      <MenuLink href="/add" label="Сдать вещь" />

                      <button
                        type="button"
                        onClick={logout}
                        className="mt-2 w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-500 transition hover:bg-red-50"
                      >
                        Выйти
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-4 py-2.5 text-sm font-bold text-[#111111] transition hover:bg-[#F7F7F5]"
              >
                Войти
              </Link>

              <Link
                href="/register"
                className="hidden rounded-full bg-[#111111] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#2A2A2A] sm:inline-flex"
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

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl px-4 py-3 text-sm font-bold transition hover:bg-[#F7F7F5]"
    >
      {label}
    </Link>
  );
}

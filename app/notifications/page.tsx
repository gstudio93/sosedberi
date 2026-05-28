"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState<any[]>([]);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data } = await supabase.auth.getUser();

    const currentUser = data.user;

    if (!currentUser) return;

    setUser(currentUser);

    loadNotifications(currentUser.id);

    // REALTIME
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setNotifications((prev) => [
            payload.new,
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function loadNotifications(
    userId: string
  ) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    setNotifications(data || []);
  }

  async function markAsRead(id: string) {
    await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true }
          : notification
      )
    );
  }

  async function markAllAsRead() {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, is_read: true }))
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] px-4 pb-28 pt-24 text-[#111111] lg:px-6 lg:pt-32">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-6 shadow-sm">
          Загрузка...
        </div>
      </main>
    );
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-4 pb-28 pt-24 text-[#111111] lg:px-6 lg:pt-32">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-[#E8F7EA] px-3 py-1 text-xs font-extrabold text-[#3F9E47]">
              Центр событий
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-5xl">
              Уведомления
            </h1>
            <p className="mt-2 text-sm text-[#6B6B6B] sm:text-base">
              Брони, сообщения, модерация объявлений и решения по спорам.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
              {unreadCount} новых
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="rounded-full bg-[#111111] px-4 py-2 text-sm font-bold text-white"
              >
                Прочитать
              </button>
            )}
          </div>
        </div>

        <section className="rounded-[28px] border border-black/5 bg-white p-3 shadow-sm sm:p-4">
          {notifications.length === 0 ? (
            <div className="rounded-[22px] bg-[#F7F7F5] p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                🔔
              </div>
              <h2 className="mt-4 text-xl font-black">Пока нет уведомлений</h2>
              <p className="mt-2 text-sm text-[#6B6B6B]">
                Когда появятся брони, сообщения или решения админа, они будут здесь.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.link || "/profile"}
                onClick={() =>
                  markAsRead(notification.id)
                }
                className={`block rounded-[22px] border p-4 transition sm:p-5 ${
                  notification.is_read
                    ? "border-black/5 bg-[#F7F7F5]"
                    : "border-[#7BC47F]/35 bg-[#F8FFF8]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-base font-extrabold leading-snug sm:text-lg">
                    {notification.text}
                  </div>

                    <div className="mt-2 text-sm text-[#8D8D8D]">
                      {new Date(notification.created_at).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {!notification.is_read && (
                    <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#7BC47F]" />
                  )}
                </div>
              </Link>
            ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

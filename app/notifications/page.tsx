"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type NotificationItem = {
  id: string;
  user_id: string;
  type: string | null;
  text: string | null;
  link: string | null;
  created_at: string;
  is_read: boolean | null;
};

const notificationMeta: Record<string, { label: string; short: string; className: string }> = {
  booking: {
    label: "Бронь",
    short: "Б",
    className: "bg-[#E8F7EA] text-[#2F8F3A]",
  },
  payment: {
    label: "Оплата",
    short: "₽",
    className: "bg-[#F4F0E5] text-[#8A6A18]",
  },
  handover: {
    label: "Передача",
    short: "П",
    className: "bg-[#EEF3FF] text-[#4164A8]",
  },
  return: {
    label: "Возврат",
    short: "В",
    className: "bg-[#F0F5EF] text-[#4D814F]",
  },
  dispute: {
    label: "Спор",
    short: "!",
    className: "bg-[#FFF0F0] text-[#D83A3A]",
  },
  review: {
    label: "Отзыв",
    short: "О",
    className: "bg-[#F4F0FF] text-[#6A4BB5]",
  },
  moderation: {
    label: "Модерация",
    short: "М",
    className: "bg-[#F1F1F1] text-[#555555]",
  },
  message: {
    label: "Сообщение",
    short: "Ч",
    className: "bg-[#111111] text-white",
  },
};

function getNotificationMeta(type: string | null) {
  return notificationMeta[type || ""] || {
    label: "Событие",
    short: "С",
    className: "bg-[#F1F1F1] text-[#555555]",
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let active = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;

      if (!active) return;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      setUserId(currentUser.id);
      await loadNotifications(currentUser.id);

      channel = supabase
        .channel(`notifications-page-${currentUser.id}`)
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

      setLoading(false);
    }

    init();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function loadNotifications(currentUserId: string) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    setNotifications((data as NotificationItem[]) || []);
  }

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification
      )
    );
  }

  async function markAllAsRead() {
    if (!userId || unreadCount === 0) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, is_read: true }))
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] px-4 pb-28 pt-28 text-[#111111] lg:px-6 lg:pt-32">
        <section className="mx-auto max-w-4xl rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
          <div className="h-5 w-36 rounded-full bg-[#F1F1EF]" />
          <div className="mt-5 h-12 w-64 rounded-2xl bg-[#F1F1EF]" />
        </section>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] px-4 pb-28 pt-28 text-[#111111] lg:px-6 lg:pt-32">
        <section className="mx-auto max-w-3xl rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-black">Нужен вход</h1>
          <p className="mx-auto mt-3 max-w-md text-[#6B6B6B]">
            Уведомления доступны после авторизации. Войдите или зарегистрируйтесь, чтобы видеть брони, сообщения и решения по аренде.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-[#75C57B] px-6 py-3 text-sm font-extrabold text-white"
          >
            Войти
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-4 pb-28 pt-28 text-[#111111] lg:px-6 lg:pt-32">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-[#E8F7EA] px-3 py-1 text-xs font-extrabold text-[#3F9E47]">
              Центр событий
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">Уведомления</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B6B6B] sm:text-base">
              Брони, сообщения, акты передачи, возвраты, споры и отзывы собраны в одном месте.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
              {unreadCount} новых
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
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
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-black shadow-sm">
                0
              </div>
              <h2 className="mt-4 text-xl font-black">Пока нет уведомлений</h2>
              <p className="mt-2 text-sm text-[#6B6B6B]">
                Когда появятся брони, сообщения или решения по аренде, они будут здесь.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const meta = getNotificationMeta(notification.type);

                return (
                  <Link
                    key={notification.id}
                    href={notification.link || "/profile"}
                    onClick={() => markAsRead(notification.id)}
                    className={`block rounded-[22px] border p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
                      notification.is_read
                        ? "border-black/5 bg-[#F7F7F5]"
                        : "border-[#7BC47F]/35 bg-[#F8FFF8]"
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${meta.className}`}
                      >
                        {meta.short}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-[#6B6B6B] shadow-sm">
                            {meta.label}
                          </span>
                          {!notification.is_read && (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#7BC47F]" />
                          )}
                        </div>

                        <div className="mt-2 break-words text-base font-extrabold leading-snug sm:text-lg">
                          {notification.text || "Новое уведомление"}
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
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

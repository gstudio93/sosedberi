"use client";

import { useEffect, useState } from "react";
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
        read: true,
      })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        Загрузка...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">

        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-4xl font-black">
            Уведомления
          </h1>

          <div className="rounded-full bg-white/10 px-4 py-2 text-sm">
            {
              notifications.filter(
                (n) => !n.read
              ).length
            }{" "}
            новых
          </div>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="rounded-2xl bg-white/5 p-6 text-neutral-400">
              Пока нет уведомлений
            </div>
          ) : (
            notifications.map((notification) => (
              <a
                key={notification.id}
                href={notification.link}
                onClick={() =>
                  markAsRead(notification.id)
                }
                className={`block rounded-2xl border p-5 transition ${
                  notification.read
                    ? "border-white/5 bg-white/5"
                    : "border-white/20 bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between">

                  <div className="text-lg">
                    {notification.text}
                  </div>

                  {!notification.read && (
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  )}

                </div>

                <div className="mt-3 text-sm text-neutral-500">
                  {new Date(
                    notification.created_at
                  ).toLocaleString()}
                </div>
              </a>
            ))
          )}
        </div>

      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

function parseChatLink(link?: string | null) {
  if (!link?.startsWith("/chat/")) return null;

  try {
    const url = new URL(link, "https://sosedberi.local");
    const itemId = url.pathname.split("/chat/")[1];
    const peerId = url.searchParams.get("owner");

    if (!itemId || !peerId) return null;

    return {
      itemId,
      peerId,
      href: `${url.pathname}${url.search}`,
    };
  } catch {
    return null;
  }
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] =
    useState<any[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, any>>({});
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "booking">("all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-list-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        loadData
      )
      .subscribe();

    const intervalId = window.setInterval(loadData, 15000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function loadData() {
    const { data } =
      await supabase.auth.getUser();

    const currentUser = data.user;

    if (!currentUser) {
      setUser(null);
      setConversations([]);
      setProfilesById({});
      return;
    }

    setUser(currentUser);

    const { data: convs, error } =
      await supabase
        .from("conversations")
        .select(`
          *,
          items (*),
          messages (
            id,
            text,
            created_at,
            sender_id,
            receiver_id,
            is_read
          )
        `)
        .or(
          `user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`
        );

    if (error) {
      console.log(error);
    }

    const { data: messageRows, error: messagesError } = await supabase
      .from("messages")
      .select(`
        *,
        conversations (
          *,
          items (*)
        )
      `)
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (messagesError) {
      console.log("DIRECT MESSAGES LOAD ERROR:", messagesError);
    }

    const { data: messageNotifications } = await supabase
      .from("notifications")
      .select("id, text, link, created_at, is_read")
      .eq("user_id", currentUser.id)
      .eq("type", "message")
      .order("created_at", { ascending: false })
      .limit(50);

    const conversationMap = new Map<string, any>();

    (convs || []).forEach((conv: any) => {
      conversationMap.set(conv.id, {
        ...conv,
        messages: conv.messages || [],
      });
    });

    (messageRows || []).forEach((message: any) => {
      const conv = message.conversations;
      if (!conv?.id) return;

      const current = conversationMap.get(conv.id) || {
        ...conv,
        items: conv.items,
        messages: [],
      };

      if (!current.messages.some((item: any) => item.id === message.id)) {
        const relatedNotice = (messageNotifications || []).find((notice: any) =>
          notice.link?.startsWith(`/chat/${message.item_id}`)
        );

        current.messages.push({
          id: message.id,
          text: message.text,
          created_at: message.created_at,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          is_read:
            message.is_read ||
            (relatedNotice?.is_read && message.receiver_id === currentUser.id),
        });
      }

      conversationMap.set(conv.id, current);
    });

    const notificationChatLinks = (messageNotifications || [])
      .map((notice: any) => {
        const parsed = parseChatLink(notice.link);
        return parsed ? { notice, ...parsed } : null;
      })
      .filter(Boolean) as {
      notice: any;
      itemId: string;
      peerId: string;
      href: string;
    }[];

    const missingItemIds = Array.from(
      new Set(
        notificationChatLinks
          .map((entry) => entry.itemId)
          .filter((itemId) => !Array.from(conversationMap.values()).some((conv) => conv.item_id === itemId))
      )
    );

    const itemsById: Record<string, any> = {};

    if (missingItemIds.length > 0) {
      const { data: notificationItems } = await supabase
        .from("items")
        .select("*")
        .in("id", missingItemIds);

      (notificationItems || []).forEach((item: any) => {
        itemsById[item.id] = item;
      });
    }

    notificationChatLinks.forEach(({ notice, itemId, peerId, href }) => {
      const existing = Array.from(conversationMap.values()).find(
        (conv) => conv.item_id === itemId && [conv.user1_id, conv.user2_id].includes(peerId)
      );

      if (existing) return;

      conversationMap.set(`notice-${notice.id}`, {
        id: `notice-${notice.id}`,
        item_id: itemId,
        user1_id: currentUser.id,
        user2_id: peerId,
        href,
        items: itemsById[itemId],
        messages: [
          {
            id: notice.id,
            text: notice.text || "Новое сообщение",
            created_at: notice.created_at,
            sender_id: peerId,
            receiver_id: currentUser.id,
            is_read: !!notice.is_read,
          },
        ],
      });
    });

    const sorted = Array.from(conversationMap.values())
      .map((conv) => ({
        ...conv,
        messages: (
          conv.messages || []
        ).sort(
          (a: any, b: any) =>
            new Date(
              a.created_at
            ).getTime() -
            new Date(
              b.created_at
            ).getTime()
        ),
      }))
      .sort((a, b) => {
        const aLast =
          a.messages?.[
            a.messages.length - 1
          ]?.created_at || "";

        const bLast =
          b.messages?.[
            b.messages.length - 1
          ]?.created_at || "";

        return (
          new Date(bLast).getTime() -
          new Date(aLast).getTime()
        );
      });

    const itemIds = Array.from(
      new Set(sorted.map((conv) => conv.item_id).filter(Boolean))
    );

    let bookings: any[] = [];

    if (itemIds.length > 0) {
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select(`
          id,
          item_id,
          renter_id,
          status,
          items (owner_id)
        `)
        .in("item_id", itemIds);

      bookings = bookingRows || [];
    }

    const withBookings = sorted.map((conv) => {
      const peerId =
        conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id;

      const relatedBooking = bookings.find((booking) => {
        const ownerId = booking.items?.owner_id || conv.items?.owner_id;
        return (
          booking.item_id === conv.item_id &&
          ((booking.renter_id === currentUser.id && ownerId === peerId) ||
            (booking.renter_id === peerId && ownerId === currentUser.id))
        );
      });

      return {
        ...conv,
        booking: relatedBooking || null,
      };
    });

    const peerIds = Array.from(
      new Set(
        withBookings
          .map((conv) =>
            conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id
          )
          .filter(Boolean)
      )
    );

    if (peerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar, verified")
        .in("id", peerIds);

      const nextProfiles = (profiles || []).reduce(
        (acc: Record<string, any>, profile: any) => {
          acc[profile.id] = profile;
          return acc;
        },
        {}
      );

      setProfilesById(nextProfiles);
    } else {
      setProfilesById({});
    }

    setConversations(withBookings);
  }

  const unreadCount = useMemo(
    () =>
      conversations.reduce(
        (total, conv) =>
          total +
          (conv.messages?.filter(
            (msg: any) => msg.receiver_id === user?.id && msg.is_read === false
          ).length || 0),
        0
      ),
    [conversations, user?.id]
  );

  const bookingCount = useMemo(
    () => conversations.filter((conv) => conv.booking).length,
    [conversations]
  );

  const visibleConversations = useMemo(() => {
    if (activeFilter === "unread") {
      return conversations.filter((conv) =>
        conv.messages?.some(
          (msg: any) => msg.receiver_id === user?.id && msg.is_read === false
        )
      );
    }

    if (activeFilter === "booking") {
      return conversations.filter((conv) => conv.booking);
    }

    return conversations;
  }, [activeFilter, conversations, user?.id]);

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">

      <div className="mx-auto max-w-5xl">

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <h1 className="text-4xl font-black sm:text-5xl">
            Сообщения
          </h1>

          <p className="mt-3 text-base text-[#6B6B6B] sm:text-lg">
            Все ваши диалоги
          </p>
          </div>

          {user && (
            <div className="flex rounded-full bg-white p-1 shadow-sm">
              {[
                { id: "all", label: "Все", count: conversations.length },
                { id: "unread", label: "Новые", count: unreadCount },
                { id: "booking", label: "Брони", count: bookingCount },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id as "all" | "unread" | "booking")}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    activeFilter === filter.id
                      ? "bg-[#111111] text-white"
                      : "text-[#6B6B6B] hover:bg-[#F7F7F5]"
                  }`}
                >
                  {filter.label}
                  {filter.count > 0 && (
                    <span className="ml-2 text-xs opacity-70">{filter.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">

          {!user && (
            <div className="p-8 text-center sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F7EA] text-2xl">
                💬
              </div>
              <h2 className="mt-5 text-2xl font-black">Войдите, чтобы увидеть чаты</h2>
              <p className="mx-auto mt-2 max-w-md text-[#6B6B6B]">
                Диалоги доступны после авторизации. Так сообщения привязаны к вашему профилю и бронированиям.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/login" className="rounded-full bg-[#7BC47F] px-6 py-3 font-black text-white">
                  Войти
                </Link>
                <Link href="/login?mode=register" className="rounded-full border border-black/10 px-6 py-3 font-black">
                  Регистрация
                </Link>
              </div>
            </div>
          )}

          {user && visibleConversations.length === 0 && (
            <div className="p-10 text-center text-[#6B6B6B]">
              {conversations.length === 0
                ? "Пока нет сообщений"
                : "По этому фильтру пока ничего нет"}
            </div>
          )}

          {user && visibleConversations.map((conv) => {
            const unread =
              conv.messages?.filter(
                (msg: any) =>
                  msg.receiver_id ===
                    user?.id &&
                  msg.is_read === false
              ).length || 0;

            const lastMessage =
              conv.messages?.[
                conv.messages.length - 1
              ];
            const peerId =
              conv.user1_id === user?.id ? conv.user2_id : conv.user1_id;
            const peerProfile = profilesById[peerId];
            const peerName =
              peerProfile?.full_name || peerProfile?.username || "Пользователь";

            return (
              <a
                key={conv.id}
                href={
                  conv.href ||
                  `/chat/${conv.item_id}?owner=${
                    conv.user1_id === user?.id
                      ? conv.user2_id
                      : conv.user1_id
                  }`
                }
                className="flex items-center gap-4 border-b border-black/5 p-4 transition hover:bg-[#F7F7F5] sm:gap-5 sm:p-5"
              >

                {/* IMAGE */}
                {conv.items?.image ? (
                  <img
                    src={conv.items.image}
                    className="h-24 w-24 rounded-[24px] object-cover"
                    alt=""
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-[24px] bg-[#7BC47F] text-3xl text-white">
                    📦
                  </div>
                )}

                {/* CONTENT */}
                <div className="min-w-0 flex-1">

                  <div className="flex items-center justify-between gap-4">

                    <h2 className="truncate text-xl font-black">
                      {conv.items?.name ||
                        "Объявление"}
                    </h2>

                    {lastMessage && (
                      <div className="text-sm text-[#8D8D8D]">
                        {new Date(
                          lastMessage.created_at
                        ).toLocaleDateString()}
                      </div>
                    )}

                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#6B6B6B]">
                    <span>{peerName}</span>
                    <span>·</span>
                    <span>{conv.items?.price || 0} ₽ / день</span>
                    {conv.booking && (
                      <span className="rounded-full bg-[#FFF3C4] px-2 py-1 text-xs font-bold text-[#9A6A00]">
                        Бронь
                      </span>
                    )}
                  </div>

                  <div className="mt-3 truncate text-[#555555]">
                    {lastMessage?.text ||
                      "Нет сообщений"}
                  </div>

                </div>

                {/* UNREAD */}
                {unread > 0 && (
                  <div className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#7BC47F] px-2 text-sm font-black text-white">
                    {unread}
                  </div>
                )}

              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}

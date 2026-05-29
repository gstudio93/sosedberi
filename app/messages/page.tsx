"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] =
    useState<any[]>([]);

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

    if (!currentUser) return;

    setUser(currentUser);

    const { data: convs, error } =
      await supabase
        .from("conversations")
        .select(`
          *,
          items (*),
          messages (
            text,
            created_at,
            receiver_id,
            is_read
          )
        `)
        .or(
          `user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`
        );

    if (error) {
      console.log(error);
      return;
    }

    const sorted = (convs || [])
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

    setConversations(sorted);
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">

      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-5xl font-black">
            Сообщения
          </h1>

          <p className="mt-3 text-lg text-[#6B6B6B]">
            Все ваши диалоги
          </p>
        </div>

        {/* LIST */}
        <div className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">

          {conversations.length === 0 && (
            <div className="p-10 text-center text-[#6B6B6B]">
              Пока нет сообщений
            </div>
          )}

          {conversations.map((conv) => {
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

            return (
              <a
                key={conv.id}
                href={`/chat/${conv.item_id}?owner=${
                  conv.user1_id === user?.id
                    ? conv.user2_id
                    : conv.user1_id
                }`}
                className="flex items-center gap-5 border-b border-black/5 p-5 transition hover:bg-[#F7F7F5]"
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

                  <div className="mt-2 text-sm text-[#6B6B6B]">
                    {conv.items?.price || 0} ₽
                    / день
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

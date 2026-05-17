"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ChatsPage() {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
const user = data.user;

    const { data: conversations, error } = await supabase
     
  .from("conversations")
  .select(`
    id,
    item_id,
    user1_id,
    user2_id,
    created_at,
    items (
      name
    )
  `)
  .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
  .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setChats(conversations || []);
  }

  return (
  <main className="min-h-screen bg-black px-6 py-10 text-white">
    <div className="mx-auto max-w-2xl">

      <h1 className="text-3xl font-bold">
        Диалоги
      </h1>

      <div className="mt-6 space-y-4">
        {chats.map((chat: any) => (
          <a
            key={chat.id}
            href={`/chat/${chat.item_id}?owner=${
  chat.user1_id === user?.id
    ? chat.user2_id
    : chat.user1_id
}`}
            className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
          >
            <div className="text-sm text-neutral-400">
              Диалог
            </div>

            <div className="mt-2 font-semibold">
              {chat.items?.name || "Без названия"}
            </div>

            <div className="mt-1 text-xs text-neutral-500">
              {new Date(chat.created_at).toLocaleString()}
            </div>
          </a>
        ))}
      </div>

    </div>
  </main>
);
}
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useSearchParams } from "next/navigation";

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const itemId = params.itemId as string;
  const ownerId = searchParams.get("owner");
  console.log("OWNER ID:", ownerId);
console.log("ITEM ID:", itemId);

  const [user, setUser] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [item, setItem] = useState<any>(null);
  useEffect(() => {
  console.log("CURRENT CONVERSATION:", conversation);
}, [conversation]);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const messagesEndRef =
  useRef<HTMLDivElement | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  // ---------------- USER ----------------
  async function loadConversations(currentUserId: string) {
  const { data, error } = await supabase
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
    .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

  if (error) {
    console.log("CONVERSATIONS ERROR:", error);
    return;
  }

  const sortedConversations = (data || [])
  .map((conv) => ({
    ...conv,
    messages: (conv.messages || []).sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    ),
  }))
  .sort((a, b) => {
    const aLast =
      a.messages?.[a.messages.length - 1]?.created_at || "";
    const bLast =
      b.messages?.[b.messages.length - 1]?.created_at || "";

    return (
      new Date(bLast).getTime() -
      new Date(aLast).getTime()
    );
  });

setConversations(sortedConversations);
}
  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    if (data.user) {
  loadConversations(data.user.id);
}
    const { data: itemData } = await supabase
  .from("items")
  .select("*")
  .eq("id", itemId)
  .single();

setItem(itemData);
  }

  // ---------------- CONVERSATION (FIXED) ----------------
  async function initConversation(currentUser: any) {
    if (currentUser.id === ownerId) {
  console.log("SELF CHAT BLOCKED");
  return;
}
  if (!currentUser || !itemId || !ownerId) return;

  const userIds = [currentUser.id, ownerId].sort();

  const { data: existing, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("item_id", itemId)
    .eq("user1_id", userIds[0])
    .eq("user2_id", userIds[1])
    .maybeSingle();

  if (error) {
    console.log("CONV LOAD ERROR:", error);
    return;
  }

  if (existing) {
    setConversation(existing);
    return;
  }

  const { data, error: insertError } = await supabase
    .from("conversations")
    .insert({
      item_id: itemId,
      user1_id: userIds[0],
      user2_id: userIds[1],
    })
    .select()
    .single();

  if (insertError) {
    console.log("CONV INSERT ERROR:", insertError);
    return;
  }

  setConversation(data);
}

  // ---------------- LOAD MESSAGES ----------------
  async function loadMessages(conv: any) {
    if (!conv) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("MESSAGES ERROR:", error);
      return;
    }
console.log("LOADED MESSAGES:", data);
    setMessages(data || []);
    const { data: authData } =
  await supabase.auth.getUser();

const currentUser = authData.user;

if (currentUser) {
  await supabase
    .from("messages")
    .update({
      is_read: true,
    })
    .eq("receiver_id", currentUser.id)
    .eq("item_id", itemId);
}
  }

  // ---------------- SEND MESSAGE (FIXED SAFE) ----------------
  async function sendMessage() {
    if (!text || !user || !conversation) return;
console.log("SEND:", {
  conversationId: conversation.id,
  sender: user.id,
  ownerId,
  text
});
    const receiverId =
  user.id === conversation.user1_id
    ? conversation.user2_id
    : conversation.user1_id;

    const { error } = await supabase.from("messages").insert([
      {
        conversation_id: conversation.id,
        item_id: itemId,
        sender_id: user.id,
        receiver_id: receiverId,
        text,
        is_read: false,
      },
    ]);

    if (error) {
      console.log("SEND ERROR:", error);
      return;
    }

await supabase
  .from("notifications")
  .insert({
    user_id: receiverId,
    type: "message",
    text: "💬 Новое сообщение",
    link: `/chat/${itemId}?owner=${user.id}`,
  });
    setText("");
  }

  // ---------------- INIT ----------------
  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      initConversation(user);
    }
  }, [user]);

  useEffect(() => {
    if (conversation) {
      loadMessages(conversation);
    }
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ---------------- REALTIME (SAFE) ----------------
  useEffect(() => {
    if (!conversation) return;

  const channel = supabase
    .channel(`messages-${conversation.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversation.id}`,
      },
      (payload) => {
        console.log("REALTIME EVENT:", payload);

        setMessages((prev) => [...prev, payload.new]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversation]);
  // ---------------- UI ----------------
  return (
  <main className="min-h-screen bg-[#F7F7F5] px-6 pb-10 pt-32 text-[#111111]">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[340px_1fr]">

        {/* SIDEBAR */}
<div className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">

  <div className="border-b border-black/5 p-6">
    <h2 className="text-2xl font-black">
      Сообщения
    </h2>

    <p className="mt-2 text-sm text-[#6B6B6B]">
      Ваши диалоги
    </p>
  </div>

  <div className="p-3">
    {conversations.length === 0 && (
  <div className="rounded-[24px] bg-[#F7F7F5] p-6 text-center text-sm text-[#6B6B6B]">
    Пока нет диалогов
  </div>
)}
    {conversations.map((conv) => (
  <a
    key={conv.id}
    href={`/chat/${conv.item_id}?owner=${
      conv.user1_id === user?.id
        ? conv.user2_id
        : conv.user1_id
    }`}
    className={`mb-2 flex items-center gap-4 rounded-[24px] p-4 transition ${
      conv.id === conversation?.id
        ? "bg-[#F7F7F5]"
        : "hover:bg-[#F7F7F5]"
    }`}
  >

    {conv.items?.image ? (
      <img
        src={conv.items.image}
        className="h-16 w-16 rounded-2xl object-cover"
        alt=""
      />
    ) : (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7BC47F] font-black text-white">
        📦
      </div>
    )}

    <div className="min-w-0 flex-1">

      <div className="truncate font-black">
        {conv.items?.name || "Объявление"}
      </div>

      <div className="mt-1 truncate text-sm text-[#6B6B6B]">
        {conv.messages?.length
  ? conv.messages[conv.messages.length - 1].text
  : "Диалог по аренде"}
      </div>

    </div>
{conv.messages?.filter(
  (msg: any) =>
    msg.receiver_id === user?.id &&
    msg.is_read === false
).length > 0 && (
  <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#7BC47F] px-2 text-xs font-bold text-white">
    {
      conv.messages.filter(
        (msg: any) =>
          msg.receiver_id === user?.id &&
          msg.is_read === false
      ).length
    }
  </div>
)}
  </a>
))}

  </div>
</div>

{/* CHAT */}
<div className="flex h-[78vh] flex-col overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">

  {/* HEADER */}
  <div className="flex items-center justify-between border-b border-black/5 p-6">

    <div className="flex items-center gap-4">
      {item?.image && (
  <img
    src={item.image}
    className="h-16 w-16 rounded-2xl object-cover"
    alt=""
  />
)}

      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7BC47F] text-xl font-black text-white">
        {ownerId?.[0]?.toUpperCase() || "U"}
      </div>

      <div>
        <div className="font-black">
  {item?.name || "Объявление"}
</div>

        <div className="text-sm text-[#6B6B6B]">
  {item?.price || 0} ₽ / день
</div>
      </div>

    </div>

    <div className="rounded-full bg-[#F7F7F5] px-4 py-2 text-sm font-bold text-[#6B6B6B]">
      Онлайн
    </div>

  </div>

  {/* MESSAGES */}
  <div className="flex-1 space-y-4 overflow-y-auto bg-[#FCFCFB] p-6">

    {messages.length === 0 && (
      <div className="flex h-full items-center justify-center text-[#8D8D8D]">
        Начните диалог 👋
      </div>
    )}

    {messages.map((msg) => (
      <div
        key={msg.id}
        className={`flex ${
          msg.sender_id === user?.id
            ? "justify-end"
            : "justify-start"
        }`}
      >

        <div
          className={`max-w-[75%] rounded-[24px] px-5 py-4 text-[15px] leading-relaxed shadow-sm ${
            msg.sender_id === user?.id
              ? "bg-[#7BC47F] text-white"
              : "bg-white border border-black/5"
          }`}
        >
          {msg.text}

          <div
            className={`mt-2 text-xs ${
              msg.sender_id === user?.id
                ? "text-white/70"
                : "text-[#8D8D8D]"
            }`}
          >
            {new Date(
              msg.created_at
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

        </div>

      </div>
    ))}
    <div ref={messagesEndRef} />

  </div>

  {/* INPUT */}
  <div className="border-t border-black/5 bg-white p-5">

    <div className="flex gap-3">

      <input
  value={text}
  onChange={(e) =>
    setText(e.target.value)
  }
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  }}
        placeholder="Написать сообщение..."
        className="flex-1 rounded-full border border-black/5 bg-[#F7F7F5] px-6 py-4 outline-none transition focus:border-[#7BC47F]"
      />

      <button
        onClick={sendMessage}
        className="rounded-full bg-[#7BC47F] px-8 font-bold text-white transition hover:scale-[1.02]"
      >
        Отправить
      </button>

    </div>

  </div>

</div>
         
       
      </div>
    </main>
  );
}
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useParams, useSearchParams } from "next/navigation";

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const itemId = params.itemId as string;
  const ownerId = searchParams.get("owner");
  const bookingId = searchParams.get("booking");
  console.log("OWNER ID:", ownerId);
console.log("ITEM ID:", itemId);

  const [user, setUser] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [item, setItem] = useState<any>(null);
  const [peerProfile, setPeerProfile] = useState<any>(null);
  const [bookingContext, setBookingContext] = useState<any>(null);
  const [conversationProfiles, setConversationProfiles] = useState<Record<string, any>>({});
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
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

const peerIds = Array.from(
  new Set(
    sortedConversations.map((conv) =>
      conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id
    )
  )
);

if (peerIds.length > 0) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar, verified")
    .in("id", peerIds);

  const profileMap = (profiles || []).reduce((acc: Record<string, any>, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});

  setConversationProfiles(profileMap);
}
}

  async function loadPeerProfile(peerId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar, verified, location")
      .eq("id", peerId)
      .maybeSingle();

    setPeerProfile(data);
  }
  async function loadBookingContext(currentUserId: string) {
    if (!bookingId) return;

    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        items (*)
      `)
      .eq("id", bookingId)
      .maybeSingle();

    if (!data) return;

    const isParticipant =
      data.renter_id === currentUserId || data.items?.owner_id === currentUserId;

    if (isParticipant) {
      setBookingContext(data);
    }
  }
  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    if (data.user) {
  loadConversations(data.user.id);
  loadBookingContext(data.user.id);
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
    .eq("conversation_id", conv.id);
}
  }

  // ---------------- SEND MESSAGE (FIXED SAFE) ----------------
  async function sendMessage() {
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }

    const messageText = text.trim();

    if (!messageText || !conversation) return;
console.log("SEND:", {
  conversationId: conversation.id,
  sender: user.id,
  ownerId,
  text: messageText
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
        text: messageText,
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
    link: `/chat/${itemId}?owner=${user.id}${bookingId ? `&booking=${bookingId}` : ""}`,
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
      const peerId =
        conversation.user1_id === user?.id
          ? conversation.user2_id
          : conversation.user1_id;

      if (peerId) {
        loadPeerProfile(peerId);
      }
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

        if (payload.new.receiver_id === user?.id) {
          supabase
            .from("messages")
            .update({ is_read: true })
            .eq("id", payload.new.id);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversation]);
  const peerId = useMemo(() => {
    if (!conversation || !user) return ownerId || "";
    return conversation.user1_id === user.id
      ? conversation.user2_id
      : conversation.user1_id;
  }, [conversation, ownerId, user]);

  const peerName =
    peerProfile?.full_name ||
    peerProfile?.username ||
    peerProfile?.email ||
    "Пользователь";

  const peerInitial = peerName[0]?.toUpperCase() || "П";
  const bookingDays = bookingContext
    ? Math.max(
        1,
        Math.ceil(
          (new Date(bookingContext.end_date).getTime() -
            new Date(bookingContext.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      )
    : 0;
  const bookingTotal = bookingContext
    ? Number(bookingContext.total_price) ||
      bookingDays * Number(bookingContext.items?.price || item?.price || 0)
    : 0;
  // ---------------- UI ----------------
  return (
  <main className="min-h-screen bg-[#F7F7F5] px-3 pb-24 pt-24 text-[#111111] sm:px-6 lg:pb-10 lg:pt-32">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[340px_1fr] lg:gap-6">

        {/* SIDEBAR */}
<div className="hidden overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm lg:block lg:rounded-[32px]">

  <div className="border-b border-black/5 p-5 lg:p-6">
    <h2 className="text-xl font-black lg:text-2xl">
      Сообщения
    </h2>

    <p className="mt-2 text-sm text-[#6B6B6B]">
      Ваши диалоги
    </p>
  </div>

  <div className="max-h-44 overflow-y-auto p-3 lg:max-h-none">
    {conversations.length === 0 && (
  <div className="rounded-[24px] bg-[#F7F7F5] p-6 text-center text-sm text-[#6B6B6B]">
    Пока нет диалогов
  </div>
)}
    {conversations.map((conv) => {
      const convPeerId =
        conv.user1_id === user?.id ? conv.user2_id : conv.user1_id;
      const convPeer = conversationProfiles[convPeerId];
      const convPeerName =
        convPeer?.full_name || convPeer?.username || "Пользователь";

      return (
  <a
    key={conv.id}
    href={`/chat/${conv.item_id}?owner=${
      conv.user1_id === user?.id
        ? conv.user2_id
        : conv.user1_id
    }`}
    className={`mb-2 flex items-center gap-3 rounded-[22px] p-3 transition lg:gap-4 lg:rounded-[24px] lg:p-4 ${
      conv.id === conversation?.id
        ? "bg-[#F7F7F5]"
        : "hover:bg-[#F7F7F5]"
    }`}
  >

    {conv.items?.image ? (
      <img
        src={conv.items.image}
        className="h-12 w-12 rounded-2xl object-cover lg:h-16 lg:w-16"
        alt=""
      />
    ) : (
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7BC47F] font-black text-white lg:h-16 lg:w-16">
        📦
      </div>
    )}

    <div className="min-w-0 flex-1">

      <div className="truncate font-black">
        {conv.items?.name || "Объявление"}
      </div>

      <div className="mt-1 truncate text-xs font-bold text-[#3F9E47]">
        {convPeerName}
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
)
    })}

  </div>
</div>

{/* CHAT */}
<div className="flex h-[calc(100dvh-170px)] min-h-[520px] flex-col overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm lg:h-[78vh] lg:rounded-[32px]">

  {/* HEADER */}
  <div className="flex items-center gap-3 border-b border-black/5 p-3 lg:justify-between lg:p-6">

    <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
      {item?.image && (
  <img
    src={item.image}
    className="h-12 w-12 shrink-0 rounded-2xl object-cover lg:h-16 lg:w-16"
    alt=""
  />
)}

      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] text-base font-black text-white lg:h-14 lg:w-14 lg:text-xl">
        {peerProfile?.avatar ? (
          <img src={peerProfile.avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          peerInitial
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Link
            href={peerId ? `/user/${peerId}` : "#"}
            className="truncate font-black transition hover:text-[#3F9E47]"
          >
            {peerName}
          </Link>

          {peerProfile?.verified && (
            <span className="rounded-full bg-[#E8F7EA] px-2 py-1 text-xs font-bold text-[#3F9E47]">
              Проверен
            </span>
          )}
        </div>
        <div className="truncate text-sm font-black lg:text-base">
  {item?.name || "Объявление"}
</div>

        <div className="text-xs text-[#6B6B6B] lg:text-sm">
  {item?.price || 0} ₽ / день
</div>
      </div>

    </div>

    {peerId && (
      <Link
        href={`/user/${peerId}`}
        className="hidden rounded-full bg-[#E8F7EA] px-4 py-2 text-sm font-bold text-[#3F9E47] transition hover:bg-[#DDF3E0] sm:inline-flex"
      >
        Открыть профиль
      </Link>
    )}

    <div className="hidden rounded-full bg-[#F7F7F5] px-4 py-2 text-sm font-bold text-[#6B6B6B] lg:block">
      Онлайн
    </div>

  </div>

  {bookingContext && (
    <div className="border-b border-black/5 bg-[#F8FFF8] px-4 py-3 lg:px-6 lg:py-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div>
          <div className="font-black">Диалог по бронированию</div>
          <div className="mt-1 text-[#6B6B6B]">
            {new Date(bookingContext.start_date).toLocaleDateString("ru-RU")} -{" "}
            {new Date(bookingContext.end_date).toLocaleDateString("ru-RU")} ·{" "}
            {bookingDays} дн. · {bookingTotal.toLocaleString("ru-RU")} ₽
          </div>
        </div>
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
          {bookingContext.status}
        </span>
      </div>
    </div>
  )}

  {/* MESSAGES */}
  <div className="flex-1 space-y-3 overflow-y-auto bg-[#FCFCFB] p-4 lg:space-y-4 lg:p-6">

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
          className={`max-w-[86%] rounded-[22px] px-4 py-3 text-[15px] leading-relaxed shadow-sm lg:max-w-[75%] lg:rounded-[24px] lg:px-5 lg:py-4 ${
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
  <div className="border-t border-black/5 bg-white p-3 lg:p-5">

    <div className="flex gap-2 lg:gap-3">

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
        className="min-w-0 flex-1 rounded-full border border-black/5 bg-[#F7F7F5] px-4 py-3 text-sm outline-none transition focus:border-[#7BC47F] lg:px-6 lg:py-4 lg:text-base"
      />

      <button
        onClick={sendMessage}
        className="shrink-0 rounded-full bg-[#7BC47F] px-4 text-sm font-bold text-white transition hover:scale-[1.02] lg:px-8 lg:text-base"
      >
        <span className="hidden sm:inline">Отправить</span>
        <span className="sm:hidden">OK</span>
      </button>

    </div>

  </div>

</div>
        
       
      </div>

      {authPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 px-4 pb-24 sm:items-center sm:justify-center sm:pb-0">
          <div className="w-full rounded-[28px] bg-white p-6 text-[#111111] shadow-2xl sm:max-w-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Войдите, чтобы написать</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">
                  Сообщения доступны только авторизованным пользователям. Так владельцы и арендаторы понимают, с кем общаются.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAuthPromptOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F7F5] text-xl font-black"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/login"
                className="rounded-full bg-[#7BC47F] px-5 py-4 text-center font-black text-white transition hover:scale-[1.02]"
              >
                Войти
              </Link>

              <Link
                href="/login?mode=register"
                className="rounded-full border border-black/10 bg-white px-5 py-4 text-center font-black transition hover:bg-[#F7F7F5]"
              >
                Регистрация
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

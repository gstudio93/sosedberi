"use client";

import { useEffect, useState } from "react";
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
  useEffect(() => {
  console.log("CURRENT CONVERSATION:", conversation);
}, [conversation]);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  // ---------------- USER ----------------
  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
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
    const { error } = await supabase.from("messages").insert([
      {
        conversation_id: conversation.id,
        sender_id: user.id,
        text,
      },
    ]);

    if (error) {
      console.log("SEND ERROR:", error);
      return;
    }

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
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">

        <h1 className="text-3xl font-bold">Чат</h1>

        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                msg.sender_id === user?.id
                  ? "ml-auto bg-white text-black"
                  : "bg-white/10"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Написать сообщение..."
            className="flex-1 rounded-2xl bg-white/5 p-4 outline-none"
          />

          <button
            onClick={sendMessage}
            className="rounded-2xl bg-white px-6 font-bold text-black"
          >
            ➤
          </button>
        </div>

      </div>
    </main>
  );
}
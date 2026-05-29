import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function getUnreadMessagesCount(
  supabase: SupabaseClient,
  userId: string
) {
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("is_read", false);

  if (error) {
    console.log("UNREAD MESSAGES COUNT ERROR:", error);
    return 0;
  }

  return count || 0;
}

export function subscribeUnreadMessages(
  supabase: SupabaseClient,
  user: User,
  onChange: (count: number) => void
) {
  let active = true;

  async function refresh() {
    const count = await getUnreadMessagesCount(supabase, user.id);
    if (active) onChange(count);
  }

  refresh();

  const channel = supabase
    .channel(`unread-messages-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${user.id}`,
      },
      refresh
    )
    .subscribe();

  const intervalId = window.setInterval(refresh, 15000);

  return () => {
    active = false;
    window.clearInterval(intervalId);
    supabase.removeChannel(channel);
  };
}

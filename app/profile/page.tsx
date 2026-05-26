"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] =
  useState("");

const [bio, setBio] =
  useState("");
const [activeTab, setActiveTab] =
  useState<any>("overview");
const [avatar, setAvatar] =
  useState("");
  const [myItems, setMyItems] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [incomingBookings, setIncomingBookings] =
    useState<any[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data } = await supabase.auth.getUser();

    const currentUser = data.user;

    if (!currentUser) return;

    setUser(currentUser);
    const { data: profile } =
  await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

if (profile) {
  setUsername(profile.username || "");
  setBio(profile.bio || "");
  setAvatar(profile.avatar || "");
}

    // МОИ ОБЪЯВЛЕНИЯ
    const { data: items } = await supabase
      .from("items")
      .select("*")
      .eq("owner_id", currentUser.id)
      .order("created_at", { ascending: false });

    setMyItems(items || []);

    // МОИ БРОНИ
    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        *,
        items (*)
      `)
      .eq("renter_id", currentUser.id)
      .order("created_at", { ascending: false });

    setMyBookings(bookings || []);

    // ВХОДЯЩИЕ БРОНИ
    const { data: incoming } = await supabase
      .from("bookings")
      .select(`
        *,
        items (*)
      `)
      .in(
        "item_id",
        (items || []).map((i) => i.id)
      );

    setIncomingBookings(incoming || []);
  }

  async function deleteItem(id: string) {
    const confirmed = confirm("Удалить объявление?");

    if (!confirmed) return;

    await supabase
      .from("items")
      .delete()
      .eq("id", id);

    setMyItems((prev) =>
      prev.filter((item) => item.id !== id)
    );
  }
  async function toggleItemStatus(
  itemId: string,
  currentStatus: string
) {
  const newStatus =
    currentStatus === "paused"
      ? "active"
      : "paused";

  await supabase
    .from("items")
    .update({
      status: newStatus,
    })
    .eq("id", itemId);

  setMyItems((prev) =>
    prev.map((item) =>
      item.id === itemId
        ? {
            ...item,
            status: newStatus,
          }
        : item
    )
  );
}
  async function handlePayment(
  bookingId: string
) {
  await supabase
    .from("bookings")
    .update({
      payment_status: "paid",
    })
    .eq("id", bookingId);

  setMyBookings((prev) =>
    prev.map((booking) =>
      booking.id === bookingId
        ? {
            ...booking,
            payment_status: "paid",
          }
        : booking
    )
  );

  alert("Оплата прошла успешно");
}
  async function saveProfile() {
  if (!user) return;

  await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      username,
      bio,
      avatar,
    });

  alert("Профиль сохранен");
}

  async function updateBookingStatus(
  bookingId: string,
  status: string
) {
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      *,
      items (*)
    `)
    .eq("id", bookingId)
    .single();

  await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  setIncomingBookings((prev) =>
    prev.map((b) =>
      b.id === bookingId
        ? { ...b, status }
        : b
    )
  );

  if (booking) {
    await supabase.from("notifications").insert([
      {
        user_id: booking.renter_id,
        text:
          status === "approved"
            ? `Бронь подтверждена: ${booking.items?.name}`
            : `Бронь отклонена: ${booking.items?.name}`,
        link: "/profile",
      },
    ]);
  }
} 

  if (!user) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        Загрузка...
      </main>
    );
  }
  function getBookingDays(booking: any) {
  if (!booking.start_date || !booking.end_date) return 1;

  const start = new Date(booking.start_date);
  const end = new Date(booking.end_date);

  const diff = end.getTime() - start.getTime();

  return Math.max(
    1,
    Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
  );
}

function getBookingTotal(booking: any) {
  const days = getBookingDays(booking);
  const price = Number(booking.items?.price) || 0;

  return days * price;
}

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
        {/* SIDEBAR */}
<aside className="h-fit rounded-[32px] border border-black/5 bg-white p-6 shadow-sm lg:sticky lg:top-32">
  <div className="flex items-center gap-4">
    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] text-2xl font-black text-white">
      {avatar ? (
        <img
          src={avatar}
          alt="avatar"
          className="h-full w-full object-cover"
        />
      ) : (
        username?.[0]?.toUpperCase() ||
        user.email?.[0]?.toUpperCase()
      )}
    </div>

    <div>
      <div className="text-lg font-black">
        {username || "Пользователь"}
      </div>

      <div className="text-sm text-[#6B6B6B]">
        На сайте
      </div>
    </div>
  </div>

  <div className="mt-6 rounded-2xl bg-[#F7F7F5] px-4 py-3 text-sm text-[#6B6B6B]">
    {user.email}
  </div>

  <button
  onClick={() => setActiveTab("overview")}
  className={`block w-full rounded-2xl px-4 py-3 text-left font-bold transition ${
    activeTab === "overview"
      ? "bg-[#7BC47F]/15 text-[#3F9E47]"
      : "text-[#555555] hover:bg-[#F7F7F5]"
  }`}
>
  Обзор
</button>

<button
  onClick={() => setActiveTab("items")}
  className={`block w-full rounded-2xl px-4 py-3 text-left font-bold transition ${
    activeTab === "items"
      ? "bg-[#7BC47F]/15 text-[#3F9E47]"
      : "text-[#555555] hover:bg-[#F7F7F5]"
  }`}
>
  Мои объявления
</button>

<button
  onClick={() => setActiveTab("bookings")}
  className={`block w-full rounded-2xl px-4 py-3 text-left font-bold transition ${
    activeTab === "bookings"
      ? "bg-[#7BC47F]/15 text-[#3F9E47]"
      : "text-[#555555] hover:bg-[#F7F7F5]"
  }`}
>
  Бронирования
</button>

<button
  onClick={() => setActiveTab("settings")}
  className={`block w-full rounded-2xl px-4 py-3 text-left font-bold transition ${
    activeTab === "settings"
      ? "bg-[#7BC47F]/15 text-[#3F9E47]"
      : "text-[#555555] hover:bg-[#F7F7F5]"
  }`}
>
  Настройки
</button>

  <a
    href="/add"
    className="mt-8 block rounded-full bg-[#7BC47F] px-5 py-4 text-center font-bold text-white"
  >
    Сдать вещь
  </a>
</aside>
{/* CONTENT */}
<section>

       {/* HEADER */}
<div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
  <div>
    <h1 className="text-5xl font-black">
  {activeTab === "overview" && "Обзор"}
  {activeTab === "items" && "Мои объявления"}
  {activeTab === "bookings" && "Бронирования"}
  {activeTab === "settings" && "Настройки"}
</h1>

    <p className="mt-3 text-lg text-[#6B6B6B]">
      {activeTab === "overview" && `Добро пожаловать, ${username || "пользователь"}.`}
{activeTab === "items" && "Управляйте своими объявлениями и добавляйте новые вещи."}
{activeTab === "bookings" && "Следите за своими бронями и входящими заявками."}
{activeTab === "settings" && "Обновите имя, описание и аватар профиля."}
    </p>
  </div>

  <a
    href={`/user/${user.id}`}
    className="rounded-2xl border border-black/10 bg-white px-6 py-4 font-bold shadow-sm transition hover:bg-[#F7F7F5]"
  >
    Посмотреть профиль
  </a>
</div>
{activeTab === "overview" && (
<>
{/* STATS */}
<div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
  <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
    <div className="text-sm text-[#6B6B6B]">
      Мои объявления
    </div>

    <div className="mt-3 text-4xl font-black">
      {myItems.length}
    </div>

    <div className="mt-1 text-sm text-[#6B6B6B]">
      Активные
    </div>
  </div>

  <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
    <div className="text-sm text-[#6B6B6B]">
      Мои бронирования
    </div>

    <div className="mt-3 text-4xl font-black">
      {myBookings.length}
    </div>

    <div className="mt-1 text-sm text-[#6B6B6B]">
      Всего
    </div>
  </div>

  <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
    <div className="text-sm text-[#6B6B6B]">
      Входящие заявки
    </div>

    <div className="mt-3 text-4xl font-black">
      {incomingBookings.length}
    </div>

    <div className="mt-1 text-sm text-[#6B6B6B]">
      На мои вещи
    </div>
  </div>

  <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
    <div className="text-sm text-[#6B6B6B]">
      Оплачено броней
    </div>

    <div className="mt-3 text-4xl font-black">
      {
        myBookings.filter(
          (b) => b.payment_status === "paid"
        ).length
      }
    </div>

    <div className="mt-1 text-sm text-[#6B6B6B]">
      Успешные оплаты
    </div>
  </div>
</div>
{activeTab === "settings" && (
<>
        <section
  id="settings"
  className="mb-8 rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">

  <h2 className="mb-6 text-3xl font-bold">
    Настройки профиля
  </h2>

  <div className="space-y-4">

    <input
      value={username}
      onChange={(e) =>
        setUsername(e.target.value)
      }
      placeholder="Имя"
      className="w-full rounded-2xl bg-[#F7F7F5] p-4 outline-none"
    />

    <input
      value={avatar}
      onChange={(e) =>
        setAvatar(e.target.value)
      }
      placeholder="Ссылка на фото"
      className="w-full rounded-2xl bg-[#F7F7F5] p-4 outline-none"
    />

    <textarea
      value={bio}
      onChange={(e) =>
        setBio(e.target.value)
      }
      placeholder="О себе"
      className="min-h-[120px] w-full rounded-2xl bg-[#F7F7F5] p-4 outline-none"
    />

    <button
      onClick={saveProfile}
      className="rounded-full bg-[#7BC47F] px-8 py-4 font-bold text-white transition hover:bg-[#69B56E]"
    >
      Сохранить
    </button>

  </div>

</section>
</>
)}
</>
)}
{activeTab === "items" && (
<>
        {/* MY ITEMS */}
        <section
  id="items"
  className="mt-8 rounded-[32px] border border-black/5 bg-white p-8 shadow-sm"
>
          <div className="mb-6 flex items-center justify-between">
  <h2 className="text-3xl font-black">
    Мои объявления
  </h2>

  <a
    href="/add"
    className="text-sm font-bold text-[#3F9E47]"
  >
    Добавить →
  </a>
</div>

          {myItems.length === 0 ? (
            <div className="rounded-2xl bg-[#F7F7F5] p-6 text-[#6B6B6B]">
              У вас пока нет объявлений
            </div>
          ) : (
           <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {myItems.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-[28px] border border-black/5 bg-[#F7F7F5] transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      className="h-48 w-full object-cover"
                    />
                  )}

                  <div className="p-5">
                    <h3 className="text-xl font-black">
                      {item.name}
                    </h3>
                    <div className="mt-3 flex items-center gap-2">
  <span
    className={`rounded-full px-3 py-1 text-xs font-bold ${
      item.status === "paused"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-[#7BC47F]/15 text-[#3F9E47]"
    }`}
  >
    {item.status === "paused"
      ? "На паузе"
      : "Активно"}
  </span>

  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#6B6B6B]">
    👁 {item.views || 0}
  </span>
</div>

                    <p className="mt-2 text-sm text-neutral-400">
                      📍 {item.location}
                    </p>

                    <div className="mt-4 text-2xl font-black">
  {item.price} ₽
</div>

                    <div className="mt-6 flex gap-3">
                      <a
                        href={`/item/${item.id}`}
                        className="flex-1 rounded-full bg-white px-4 py-3 text-center font-bold"
                      >
                        Открыть
                      </a>
<button
  onClick={() =>
    toggleItemStatus(
      item.id,
      item.status
    )
  }
  className="rounded-full bg-white px-4 py-3 text-sm font-bold"
>
  {item.status === "paused"
    ? "▶"
    : "⏸"}
</button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="rounded-full bg-red-500 px-4 py-3 font-bold text-white"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
</>
)}
{activeTab === "bookings" && (
<>
        {/* MY BOOKINGS */}
        <section
  className="mt-8 rounded-[32px] border border-black/5 bg-white p-8 shadow-sm"
>
          <h2 className="mb-6 text-3xl font-black">
  Мои бронирования
</h2>

          {myBookings.length === 0 ? (
            <div className="rounded-2xl bg-[#F7F7F5] p-6 text-[#6B6B6B]">
              Пока нет бронирований
            </div>
          ) : (
            <div className="space-y-4">
              {myBookings.map((booking) => (
                <div
  key={booking.id}
  className="grid gap-4 rounded-[24px] border border-black/5 p-4 md:grid-cols-[120px_1fr_auto]"
>
  <img
    src={booking.items?.image || "/hero.jpg"}
    className="h-28 w-full rounded-2xl object-cover"
    alt=""
  />

  <div>
    <h3 className="text-xl font-black">
      {booking.items?.name}
    </h3>
                        
                      <p className="mt-2 text-sm text-[#6B6B6B]">
                        📅 {booking.start_date} → {booking.end_date}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
  <span className="rounded-full bg-[#F7F7F5] px-3 py-1 font-bold text-[#6B6B6B]">
    {getBookingDays(booking)} дн.
  </span>

  <span className="rounded-full bg-[#F7F7F5] px-3 py-1 font-bold text-[#111111]">
    {getBookingTotal(booking)} ₽
  </span>

  <span className="rounded-full bg-[#F7F7F5] px-3 py-1 font-bold text-[#6B6B6B]">
    Оплата: {booking.payment_status || "не оплачено"}
  </span>
</div>

                      <p className="mt-2">
                        Статус:{" "}
                        
                        <span
  className={`rounded-full px-3 py-1 text-sm font-bold ${
    booking.status === "approved"
      ? "bg-[#7BC47F] text-white"
      : booking.status === "rejected"
      ? "bg-red-100 text-red-600"
      : "bg-yellow-100 text-yellow-700"
  }`}
>
  {booking.status === "approved"
    ? "Подтверждена"
    : booking.status === "rejected"
    ? "Отклонена"
    : "Ожидает"}
</span>
                      </p>
                      <p className="mt-2">
  Оплата:{" "}
  <span className="font-bold">
    {booking.payment_status}
  </span>
</p>{booking.payment_status !== "paid" && (
  <button
    onClick={() =>
      handlePayment(booking.id)
    }
    className="mt-4 rounded-full bg-[#7BC47F] px-5 py-3 font-bold text-white"
  >
    Оплатить
  </button>
)}
                    </div>

                  </div>
                
              ))}
            </div>
          )}
        </section>
        </>
)}

        {/* INCOMING BOOKINGS */}
        <section
  id="bookings"
  className="mt-8 rounded-[32px] border border-black/5 bg-white p-8 shadow-sm"
>
          <h2 className="mb-6 text-3xl font-bold">
            Брони моих вещей
          </h2>

          {incomingBookings.length === 0 ? (
            <div className="rounded-2xl bg-[#F7F7F5] p-6 text-[#6B6B6B]">
              Пока нет запросов
            </div>
          ) : (
            <div className="space-y-4">
              {incomingBookings.map((booking) => (
  <div
    key={booking.id}
    className={`grid gap-4 rounded-[24px] border p-4 transition duration-300 hover:shadow-lg md:grid-cols-[120px_1fr_auto] ${
  booking.status === "pending"
    ? "border-[#7BC47F]/30 bg-[#F8FFF8]"
    : "border-black/5 bg-white"
}`}
  >
    <img
      src={booking.items?.image || "/hero.jpg"}
      className="h-28 w-full rounded-2xl object-cover"
      alt=""
    />

    <div>
      <h3 className="text-xl font-black">
        {booking.items?.name}
      </h3>

      <p className="mt-2 text-sm text-[#6B6B6B]">
        📅 {booking.start_date} → {booking.end_date}
      </p>

      <div className="mt-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            booking.status === "approved"
              ? "bg-[#7BC47F] text-white"
              : booking.status === "rejected"
              ? "bg-red-100 text-red-600"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {booking.status === "approved"
            ? "Подтверждена"
            : booking.status === "rejected"
            ? "Отклонена"
            : "Ожидает"}
        </span>
      </div>
    </div>

    {booking.status === "pending" && (
      <div className="flex flex-col justify-center gap-3">
        <button
          onClick={() =>
            updateBookingStatus(booking.id, "approved")
          }
          className="rounded-full bg-[#7BC47F] px-5 py-3 font-bold text-white shadow-lg shadow-[#7BC47F]/20 transition hover:scale-[1.02]"
        >
          Подтвердить
        </button>

        <button
          onClick={() =>
            updateBookingStatus(booking.id, "rejected")
          }
          className="flex flex-col gap-4 rounded-[24px] border border-black/5 bg-white p-4 transition duration-300 hover:shadow-lg md:flex-row md:items-center"
        >
          Отклонить
        </button>
      </div>
    )}
  </div>
))}
            </div>
          )}
        </section>
</section>
      </div>
    </main>
  );
}
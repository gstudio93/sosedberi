"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] =
  useState("");

const [bio, setBio] =
  useState("");

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
    await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    const booking = incomingBookings.find(
      (b) => b.id === bookingId
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

    setIncomingBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId
          ? { ...booking, status }
          : booking
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
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black">
              Личный кабинет
            </h1>

            <p className="mt-2 text-neutral-400">
              {user.email}
            </p>
          </div>

          <a
            href="/add"
            className="rounded-2xl bg-white px-6 py-4 font-bold text-black"
          >
            + Добавить вещь
          </a>
        </div>
        <section className="mb-16 rounded-3xl bg-white/5 p-8">

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
      className="w-full rounded-2xl bg-black/30 p-4 outline-none"
    />

    <input
      value={avatar}
      onChange={(e) =>
        setAvatar(e.target.value)
      }
      placeholder="Ссылка на фото"
      className="w-full rounded-2xl bg-black/30 p-4 outline-none"
    />

    <textarea
      value={bio}
      onChange={(e) =>
        setBio(e.target.value)
      }
      placeholder="О себе"
      className="min-h-[120px] w-full rounded-2xl bg-black/30 p-4 outline-none"
    />

    <button
      onClick={saveProfile}
      className="rounded-2xl bg-white px-6 py-4 font-bold text-black"
    >
      Сохранить
    </button>

  </div>

</section>
        {/* MY ITEMS */}
        <section className="mb-16">
          <h2 className="mb-6 text-3xl font-bold">
            Мои объявления
          </h2>

          {myItems.length === 0 ? (
            <div className="rounded-2xl bg-white/5 p-6 text-neutral-400">
              У вас пока нет объявлений
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myItems.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      className="h-56 w-full object-cover"
                    />
                  )}

                  <div className="p-5">
                    <h3 className="text-xl font-bold">
                      {item.name}
                    </h3>

                    <p className="mt-2 text-sm text-neutral-400">
                      📍 {item.location}
                    </p>

                    <div className="mt-4 text-2xl font-black">
                      {item.price}
                    </div>

                    <div className="mt-6 flex gap-3">
                      <a
                        href={`/item/${item.id}`}
                        className="flex-1 rounded-2xl bg-white px-4 py-3 text-center font-bold text-black"
                      >
                        Открыть
                      </a>

                      <button
                        onClick={() => deleteItem(item.id)}
                        className="rounded-2xl bg-red-500 px-4 py-3 font-bold"
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

        {/* MY BOOKINGS */}
        <section>
          <h2 className="mb-6 text-3xl font-bold">
            Мои бронирования
          </h2>

          {myBookings.length === 0 ? (
            <div className="rounded-2xl bg-white/5 p-6 text-neutral-400">
              Пока нет бронирований
            </div>
          ) : (
            <div className="space-y-4">
              {myBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-center gap-4">

                    {booking.items?.image && (
                      <img
                        src={booking.items.image}
                        className="h-24 w-24 rounded-2xl object-cover"
                      />
                    )}

                    <div>
                      <h3 className="text-xl font-bold">
                        {booking.items?.name}
                      </h3>

                      <p className="mt-2 text-neutral-400">
                        📅 {booking.start_date} → {booking.end_date}
                      </p>

                      <p className="mt-2">
                        Статус:{" "}
                        
                        <span className="font-bold">
                          {booking.status}
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
    className="mt-4 rounded-2xl bg-green-500 px-5 py-3 font-bold"
  >
    Оплатить
  </button>
)}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* INCOMING BOOKINGS */}
        <section className="mt-20">
          <h2 className="mb-6 text-3xl font-bold">
            Брони моих вещей
          </h2>

          {incomingBookings.length === 0 ? (
            <div className="rounded-2xl bg-white/5 p-6 text-neutral-400">
              Пока нет запросов
            </div>
          ) : (
            <div className="space-y-4">
              {incomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <h3 className="text-xl font-bold">
                    {booking.items?.name}
                  </h3>

                  <p className="mt-2 text-neutral-400">
                    📅 {booking.start_date} → {booking.end_date}
                  </p>

                  <p className="mt-2">
                    Статус:{" "}
                    <span className="font-bold">
                      {booking.status}
                    </span>
                  </p>

                  {booking.status === "pending" && (
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() =>
                          updateBookingStatus(
                            booking.id,
                            "approved"
                          )
                        }
                        className="rounded-2xl bg-green-500 px-5 py-3 font-bold"
                      >
                        Подтвердить
                      </button>

                      <button
                        onClick={() =>
                          updateBookingStatus(
                            booking.id,
                            "rejected"
                          )
                        }
                        className="rounded-2xl bg-red-500 px-5 py-3 font-bold"
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

      </div>
    </main>
  );
}
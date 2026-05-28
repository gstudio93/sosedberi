"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const COMMISSION_RATE = 0.1;

type AdminTab = "finance" | "bookings" | "users" | "moderation";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("finance");
  const [adminUserId, setAdminUserId] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;

    if (!currentUser) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      setLoading(false);
      return;
    }

    setAdminUserId(currentUser.id);
    setIsAdmin(true);
    await Promise.all([loadUsers(), loadItems(), loadBookings()]);
    setLoading(false);
  }

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(data || []);
  }

  async function loadItems() {
    const { data } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    setItems(data || []);
  }

  async function loadBookings() {
    const { data } = await supabase
      .from("bookings")
      .select(
        `
        *,
        items (
          id,
          name,
          image,
          owner_id,
          price,
          deposit,
          location
        )
      `
      )
      .order("created_at", { ascending: false });

    setBookings(data || []);
  }

  async function approveItem(id: string) {
    const moderatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("items")
      .update({
        moderation_status: "approved",
        moderation_comment: null,
        moderated_at: moderatedAt,
        moderated_by: adminUserId,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              moderation_status: "approved",
              moderation_comment: null,
              moderated_at: moderatedAt,
              moderated_by: adminUserId,
            }
          : item
      )
    );
  }

  async function rejectItem(id: string) {
    const comment = prompt("Причина блокировки объявления");

    if (!comment?.trim()) return;

    const targetItem = items.find((item) => item.id === id);
    const moderatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("items")
      .update({
        status: "archived",
        moderation_status: "rejected",
        moderation_comment: comment.trim(),
        moderated_at: moderatedAt,
        moderated_by: adminUserId,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "archived",
              moderation_status: "rejected",
              moderation_comment: comment.trim(),
              moderated_at: moderatedAt,
              moderated_by: adminUserId,
            }
          : item
      )
    );

    if (targetItem?.owner_id) {
      await supabase.from("notifications").insert({
        user_id: targetItem.owner_id,
        type: "moderation",
        text: `Объявление заблокировано: ${targetItem.name}`,
        link: "/profile",
      });
    }
  }

  async function toggleVerify(userId: string, verified: boolean) {
    await supabase
      .from("profiles")
      .update({ verified: !verified })
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, verified: !verified } : user
      )
    );
  }

  async function togglePhone(userId: string, phoneVerified: boolean) {
    await supabase
      .from("profiles")
      .update({ phone_verified: !phoneVerified })
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? { ...user, phone_verified: !phoneVerified }
          : user
      )
    );
  }

  const paidBookings = bookings.filter((booking) => booking.payment_status === "paid");
  const activeBookings = bookings.filter((booking) =>
    ["pending", "approved", "active"].includes(booking.status)
  );
  const pendingUsers = users.filter((user) => !user.verified || !user.phone_verified);
  const moderationQueue = items.filter(
    (item) => (item.moderation_status || "pending") === "pending"
  );

  const finance = useMemo(() => {
    const paidVolume = paidBookings.reduce(
      (sum, booking) => sum + getBookingAmount(booking),
      0
    );
    const deposits = paidBookings.reduce(
      (sum, booking) => sum + Number(booking.deposit_amount || booking.items?.deposit || 0),
      0
    );

    return {
      paidVolume,
      commission: paidVolume * COMMISSION_RATE,
      deposits,
      averageOrder: paidBookings.length ? paidVolume / paidBookings.length : 0,
    };
  }, [paidBookings]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">
        <div className="mx-auto max-w-7xl rounded-[24px] bg-white p-6 shadow-sm">
          Загружаем админ-панель...
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">
        <div className="mx-auto max-w-2xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-extrabold">Нет доступа</h1>
          <p className="mt-3 text-[#6B6B6B]">
            Эта страница доступна только администраторам SosedBeri.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-[#7BC47F] px-6 py-3 text-sm font-extrabold text-white"
          >
            Вернуться в каталог
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[28px] border border-black/5 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-[#E8F7EA] px-3 py-1 text-xs font-extrabold text-[#3F9E47]">
                Операционная панель
              </div>
              <h1 className="text-4xl font-extrabold md:text-5xl">
                Админ-панель
              </h1>
              <p className="mt-3 max-w-2xl text-base text-[#6B6B6B]">
                Деньги, бронирования, проверки пользователей и модерация проекта.
              </p>
            </div>

            <div className="rounded-[20px] bg-[#F7F7F5] px-5 py-4">
              <div className="text-xs font-bold uppercase text-[#8D8D8D]">
                Комиссия сервиса
              </div>
              <div className="mt-1 text-2xl font-extrabold">
                {(COMMISSION_RATE * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Оборот оплаченных броней" value={formatMoney(finance.paidVolume)} />
          <StatCard label="Выручка комиссии" value={formatMoney(finance.commission)} tone="green" />
          <StatCard label="Залогов под контролем" value={formatMoney(finance.deposits)} />
          <StatCard label="Активных броней" value={activeBookings.length} />
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Пользователей" value={users.length} />
          <MiniStat label="Ожидают проверки" value={pendingUsers.length} />
          <MiniStat label="Объявлений" value={items.length} />
          <MiniStat label="На модерации" value={moderationQueue.length} />
        </section>

        <nav className="mb-6 grid rounded-[22px] border border-black/5 bg-white p-1.5 shadow-sm md:grid-cols-4">
          <TabButton active={activeTab === "finance"} onClick={() => setActiveTab("finance")}>
            Финансы
          </TabButton>
          <TabButton active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")}>
            Брони
          </TabButton>
          <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")}>
            Пользователи
          </TabButton>
          <TabButton active={activeTab === "moderation"} onClick={() => setActiveTab("moderation")}>
            Модерация
          </TabButton>
        </nav>

        {activeTab === "finance" && (
          <Panel title="Финансы проекта" subtitle="Расчет по оплаченным броням. Сейчас комиссия считается модельно, по ставке сервиса.">
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <div className="overflow-hidden rounded-[20px] border border-black/5">
                <TableHeader cols="grid-cols-[1.4fr_1fr_1fr_1fr]">
                  <span>Бронь</span>
                  <span>Сумма</span>
                  <span>Комиссия</span>
                  <span>Статус</span>
                </TableHeader>

                {paidBookings.length === 0 ? (
                  <Empty text="Пока нет оплаченных броней." />
                ) : (
                  paidBookings.slice(0, 8).map((booking) => (
                    <div
                      key={booking.id}
                      className="grid grid-cols-1 gap-2 border-t border-black/5 p-4 text-sm md:grid-cols-[1.4fr_1fr_1fr_1fr]"
                    >
                      <div className="font-bold">{booking.items?.name || "Бронь"}</div>
                      <div>{formatMoney(getBookingAmount(booking))}</div>
                      <div className="font-bold text-[#3F9E47]">
                        {formatMoney(getBookingAmount(booking) * COMMISSION_RATE)}
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-[20px] bg-[#F7F7F5] p-5">
                <h3 className="text-lg font-extrabold">Сводка</h3>
                <SummaryRow label="Средний чек" value={formatMoney(finance.averageOrder)} />
                <SummaryRow label="Комиссия к получению" value={formatMoney(finance.commission)} />
                <SummaryRow label="Залогов в бронях" value={formatMoney(finance.deposits)} />
                <SummaryRow label="Оплаченных сделок" value={paidBookings.length} />
              </div>
            </div>
          </Panel>
        )}

        {activeTab === "bookings" && (
          <Panel title="Бронирования" subtitle="Контроль входящих заявок, оплат и активных аренд.">
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <Empty text="Пока нет бронирований." />
              ) : (
                bookings.slice(0, 12).map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))
              )}
            </div>
          </Panel>
        )}

        {activeTab === "users" && (
          <Panel title="Проверки пользователей" subtitle="Здесь важнее не все пользователи подряд, а те, кто требует внимания.">
            <div className="space-y-3">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  toggleVerify={toggleVerify}
                  togglePhone={togglePhone}
                />
              ))}
            </div>
          </Panel>
        )}

        {activeTab === "moderation" && (
          <Panel title="Очередь модерации" subtitle="Сюда попадают новые и отредактированные объявления. После проверки они уходят из очереди.">
            <div className="overflow-hidden rounded-[20px] border border-black/5">
              <TableHeader cols="grid-cols-[1.5fr_1fr_0.8fr_1.1fr]">
                <span>Объявление</span>
                <span>Локация</span>
                <span>Цена</span>
                <span>Действия</span>
              </TableHeader>

              {moderationQueue.length === 0 ? (
                <Empty text="Очередь модерации пуста." />
              ) : (
                moderationQueue.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 gap-3 border-t border-black/5 p-4 text-sm md:grid-cols-[1.5fr_1fr_0.8fr_1.1fr] md:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image || "/hero.jpg"}
                        alt=""
                        className="h-14 w-16 rounded-xl object-cover"
                      />
                      <div>
                        <div className="font-extrabold">{item.name}</div>
                        <div className="text-xs text-yellow-700">На проверке</div>
                      </div>
                    </div>
                    <div className="text-[#6B6B6B]">{item.location || item.city || "Не указано"}</div>
                    <div className="font-extrabold">{formatMoney(Number(item.price || 0))}</div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/item/${item.id}`}
                        className="rounded-full bg-white px-4 py-2 text-xs font-bold"
                      >
                        Открыть
                      </Link>
                      <button
                        onClick={() => approveItem(item.id)}
                        className="rounded-full bg-[#7BC47F] px-4 py-2 text-xs font-bold text-white"
                      >
                        Одобрить
                      </button>
                      <button
                        onClick={() => rejectItem(item.id)}
                        className="rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white"
                      >
                        Блокировать
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        )}
      </div>
    </main>
  );
}

function getBookingAmount(booking: any) {
  if (booking.total_price) return Number(booking.total_price);

  const start = new Date(booking.start_date);
  const end = new Date(booking.end_date);
  const days = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  return days * Number(booking.items?.price || 0);
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "green";
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
      <div className="text-sm text-[#6B6B6B]">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold ${tone === "green" ? "text-[#3F9E47]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[20px] bg-white px-5 py-4 shadow-sm">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase text-[#8D8D8D]">{label}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[18px] px-5 py-3 text-sm font-extrabold transition ${
        active
          ? "bg-[#7BC47F] text-white shadow-sm"
          : "text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#111111]"
      }`}
    >
      {children}
    </button>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <p className="mt-1 text-sm text-[#6B6B6B]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function TableHeader({
  cols,
  children,
}: {
  cols: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`hidden ${cols} bg-[#F7F7F5] px-4 py-3 text-xs font-bold uppercase text-[#8D8D8D] md:grid`}
    >
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="p-5 text-sm text-[#6B6B6B]">{text}</div>;
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 border-t border-black/5 pt-4 text-sm">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="font-extrabold">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Ожидает",
    approved: "Одобрена",
    rejected: "Отклонена",
    active: "Активна",
    completed: "Завершена",
    cancelled: "Отменена",
  };

  return (
    <span className="w-fit rounded-full bg-[#F7F7F5] px-3 py-1 text-xs font-bold">
      {labels[status] || status}
    </span>
  );
}

function BookingRow({ booking }: { booking: any }) {
  return (
    <div className="grid gap-4 rounded-[20px] border border-black/5 bg-[#F7F7F5] p-4 md:grid-cols-[1fr_160px_160px_120px] md:items-center">
      <div className="flex items-center gap-3">
        <img
          src={booking.items?.image || "/hero.jpg"}
          alt=""
          className="h-14 w-16 rounded-xl object-cover"
        />
        <div>
          <div className="font-extrabold">{booking.items?.name || "Бронь"}</div>
          <div className="text-xs text-[#8D8D8D]">
            {new Date(booking.start_date).toLocaleDateString("ru-RU")} -{" "}
            {new Date(booking.end_date).toLocaleDateString("ru-RU")}
          </div>
        </div>
      </div>
      <div className="font-extrabold">{formatMoney(getBookingAmount(booking))}</div>
      <div className="text-sm text-[#6B6B6B]">Оплата: {booking.payment_status}</div>
      <StatusBadge status={booking.status} />
    </div>
  );
}

function UserRow({
  user,
  toggleVerify,
  togglePhone,
}: {
  user: any;
  toggleVerify: (userId: string, verified: boolean) => void;
  togglePhone: (userId: string, phoneVerified: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-[20px] border border-black/5 bg-[#F7F7F5] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] font-extrabold text-white">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            (user.full_name || user.username || user.email || "П")[0]?.toUpperCase()
          )}
        </div>
        <div>
          <div className="font-extrabold">
            {user.full_name || user.username || "Без имени"}
          </div>
          <div className="text-sm text-[#6B6B6B]">{user.email || user.phone || user.id}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.verified && <SmallBadge>Профиль проверен</SmallBadge>}
            {user.phone_verified && <SmallBadge>Телефон подтвержден</SmallBadge>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        <button
          onClick={() => toggleVerify(user.id, !!user.verified)}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            user.verified ? "bg-[#111111] text-white" : "bg-[#7BC47F] text-white"
          }`}
        >
          {user.verified ? "Снять проверку" : "Проверить профиль"}
        </button>
        <button
          onClick={() => togglePhone(user.id, !!user.phone_verified)}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            user.phone_verified
              ? "bg-[#111111] text-white"
              : "border border-black/10 bg-white"
          }`}
        >
          {user.phone_verified ? "Снять телефон" : "Подтвердить телефон"}
        </button>
      </div>
    </div>
  );
}

function SmallBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#E8F7EA] px-2.5 py-1 text-xs font-bold text-[#3F9E47]">
      {children}
    </span>
  );
}

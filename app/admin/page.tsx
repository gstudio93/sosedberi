"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getItemUrl } from "@/lib/item-url";
import { supabase } from "../../lib/supabase";

const COMMISSION_RATE = 0.1;

type AdminTab = "finance" | "bookings" | "users" | "moderation" | "disputes";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("finance");
  const [adminUserId, setAdminUserId] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [expandedModerationId, setExpandedModerationId] = useState("");
  const [rejectComments, setRejectComments] = useState<Record<string, string>>({});

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
    await Promise.all([loadUsers(), loadItems(), loadBookings(), loadDisputes()]);
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

  async function loadDisputes() {
    const { data, error } = await supabase
      .from("rental_handover_reports")
      .select(
        `
        *,
        bookings (
          id,
          renter_id,
          start_date,
          end_date,
          status,
          total_price,
          deposit_amount,
          items (
            id,
            name,
            image,
            owner_id,
            price,
            deposit,
            location
          )
        )
      `
      )
      .in("status", ["disputed", "resolved"])
      .order("created_at", { ascending: false });

    if (error) {
      console.log("DISPUTES ERROR:", error);
      return;
    }

    setDisputes(data || []);
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

  async function rejectItem(id: string, comment: string) {
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

  async function resolveDispute(report: any, resolution: "full_refund" | "partial_refund" | "withhold") {
    const deposit = Number(report.bookings?.deposit_amount || report.bookings?.items?.deposit || 0);
    const resolutionLabels = {
      full_refund: "Вернуть залог полностью",
      partial_refund: "Вернуть залог частично",
      withhold: "Удержать залог полностью",
    };
    const amountInput =
      resolution === "partial_refund"
        ? prompt(`Сколько вернуть арендатору? Максимум: ${formatMoney(deposit)}`, String(deposit))
        : null;
    const refundAmount =
      resolution === "full_refund"
        ? deposit
        : resolution === "withhold"
          ? 0
          : Math.max(0, Math.min(deposit, Number(amountInput || 0)));

    if (resolution === "partial_refund" && amountInput === null) return;

    const comment = prompt("Комментарий к решению для участников сделки") || "";
    const resolvedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("rental_handover_reports")
      .update({
        status: "resolved",
        resolution,
        resolution_comment: comment.trim(),
        deposit_refund_amount: refundAmount,
        deposit_withheld_amount: Math.max(0, deposit - refundAmount),
        resolved_at: resolvedAt,
        resolved_by: adminUserId,
      })
      .eq("id", report.id)
      .select(
        `
        *,
        bookings (
          id,
          renter_id,
          start_date,
          end_date,
          status,
          total_price,
          deposit_amount,
          items (
            id,
            name,
            image,
            owner_id,
            price,
            deposit,
            location
          )
        )
      `
      )
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("bookings").update({ status: "completed" }).eq("id", report.booking_id);
    setDisputes((prev) => prev.map((item) => (item.id === report.id ? data : item)));

    const participants = [report.bookings?.renter_id, report.bookings?.items?.owner_id].filter(Boolean);
    await supabase.from("notifications").insert(
      participants.map((userId: string) => ({
        user_id: userId,
        type: "dispute",
        text: `Решение по спору: ${resolutionLabels[resolution]}`,
        link: "/profile",
      }))
    );
  }

  const paidBookings = bookings.filter((booking) => booking.payment_status === "paid");
  const activeBookings = bookings.filter((booking) =>
    ["pending", "approved", "handover_pending", "active", "return_pending", "dispute"].includes(booking.status)
  );
  const pendingUsers = users.filter((user) => !user.verified || !user.phone_verified);
  const moderationQueue = items.filter(
    (item) => (item.moderation_status || "pending") === "pending"
  );
  const reviewedItems = items.filter(
    (item) => (item.moderation_status || "pending") !== "pending"
  );
  const openDisputes = disputes.filter((report) => report.status === "disputed");
  const closedDisputes = disputes.filter((report) => report.status === "resolved");
  const userById = useMemo(
    () =>
      users.reduce((acc: Record<string, any>, user) => {
        acc[user.id] = user;
        return acc;
      }, {}),
    [users]
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
          <MiniStat label="Открытых споров" value={openDisputes.length} />
        </section>

        <nav className="mb-6 grid rounded-[22px] border border-black/5 bg-white p-1.5 shadow-sm md:grid-cols-5">
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
          <TabButton active={activeTab === "disputes"} onClick={() => setActiveTab("disputes")}>
            Споры
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
          <Panel title="Модерация объявлений" subtitle="Новые и отредактированные объявления проверяются по фото, описанию, комплекту, условиям передачи и цене.">
            <div className="mb-7">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-extrabold">На модерации</h3>
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                  {moderationQueue.length}
                </span>
              </div>

              <div className="space-y-4">
                {moderationQueue.length === 0 ? (
                  <Empty text="Очередь модерации пуста." />
                ) : (
                  moderationQueue.map((item) => (
                    <ModerationItemCard
                      key={item.id}
                      item={item}
                      owner={userById[item.owner_id]}
                      expanded={expandedModerationId === item.id}
                      rejectComment={rejectComments[item.id] || ""}
                      onToggle={() =>
                        setExpandedModerationId((current) => (current === item.id ? "" : item.id))
                      }
                      onRejectCommentChange={(value) =>
                        setRejectComments((prev) => ({ ...prev, [item.id]: value }))
                      }
                      onApprove={() => approveItem(item.id)}
                      onReject={() => rejectItem(item.id, rejectComments[item.id] || "")}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-extrabold">Проверенные</h3>
                <span className="rounded-full bg-[#F7F7F5] px-3 py-1 text-xs font-bold text-[#6B6B6B]">
                  {reviewedItems.length}
                </span>
              </div>

              <div className="space-y-3">
                {reviewedItems.length === 0 ? (
                  <Empty text="Проверенных объявлений пока нет." />
                ) : (
                  reviewedItems.slice(0, 12).map((item) => (
                    <ReviewedModerationRow
                      key={item.id}
                      item={item}
                      owner={userById[item.owner_id]}
                    />
                  ))
                )}
              </div>
            </div>
          </Panel>
        )}

        {activeTab === "disputes" && (
          <Panel title="Споры по аренде" subtitle="Открытые споры требуют решения по залогу. Закрытые остаются в истории.">
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-extrabold">Открытые</h3>
              <div className="space-y-3">
                {openDisputes.length === 0 ? (
                  <Empty text="Открытых споров нет." />
                ) : (
                  openDisputes.map((report) => (
                    <DisputeRow
                      key={report.id}
                      report={report}
                      userById={userById}
                      resolveDispute={resolveDispute}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-extrabold">Закрытые</h3>
              <div className="space-y-3">
                {closedDisputes.length === 0 ? (
                  <Empty text="Закрытых споров пока нет." />
                ) : (
                  closedDisputes.map((report) => (
                    <DisputeRow
                      key={report.id}
                      report={report}
                      userById={userById}
                      resolveDispute={resolveDispute}
                    />
                  ))
                )}
              </div>
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
    handover_pending: "Передача",
    active: "Активна",
    return_pending: "Возврат",
    completed: "Завершена",
    cancelled: "Отменена",
    dispute: "Спор",
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

function ModerationItemCard({
  item,
  owner,
  expanded,
  rejectComment,
  onToggle,
  onRejectCommentChange,
  onApprove,
  onReject,
}: {
  item: any;
  owner?: any;
  expanded: boolean;
  rejectComment: string;
  onToggle: () => void;
  onRejectCommentChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const ownerName = getProfileName(owner, "Владелец");
  const updatedAt = item.updated_at || item.created_at;

  return (
    <div className="rounded-[24px] border border-black/5 bg-[#F7F7F5] p-4">
      <div className="grid gap-4 lg:grid-cols-[120px_minmax(0,1fr)_260px] lg:items-start">
        <img
          src={item.image || "/hero.jpg"}
          alt=""
          className="h-36 w-full rounded-2xl object-cover lg:h-24"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-extrabold">{item.name || "Без названия"}</h3>
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
              На проверке
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#6B6B6B]">
            <span>{item.category || "Категория не указана"}</span>
            <span>{item.location || item.city || "Адрес не указан"}</span>
            <span>{formatMoney(Number(item.price || 0))} / день</span>
            <span>Залог {formatMoney(Number(item.deposit || 0))}</span>
          </div>

          <div className="mt-2 text-xs font-bold text-[#8D8D8D]">
            Владелец: {ownerName} · Изменено:{" "}
            {updatedAt ? new Date(updatedAt).toLocaleString("ru-RU") : "нет даты"}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={getItemUrl(item)}
            className="rounded-full bg-white px-4 py-2.5 text-center text-sm font-bold"
          >
            Открыть
          </Link>
          <button
            onClick={onToggle}
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold"
          >
            {expanded ? "Скрыть детали" : "Проверить детали"}
          </button>
          <button
            onClick={onApprove}
            className="rounded-full bg-[#7BC47F] px-4 py-2.5 text-sm font-bold text-white"
          >
            Одобрить
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-4 border-t border-black/5 pt-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-3 md:grid-cols-2">
            <ModerationDetail title="Описание" text={item.description || "Описание не заполнено."} />
            <ModerationDetail title="Комплектация" text={item.equipment || "Комплектация не заполнена."} />
            <ModerationDetail title="Условия передачи" text={item.handover_terms || "Условия передачи не заполнены."} />
            <ModerationDetail
              title="Служебно"
              text={`ID: ${item.id}\nВладелец: ${owner?.email || ownerName}\nСтатус объявления: ${item.status || "active"}`}
            />
          </div>

          <div className="rounded-[22px] bg-white p-4">
            <label className="text-sm font-extrabold">Комментарий при блокировке</label>
            <textarea
              value={rejectComment}
              onChange={(event) => onRejectCommentChange(event.target.value)}
              placeholder="Например: фото не соответствует товару, нет описания комплекта, запрещенный товар"
              className="mt-3 min-h-28 w-full rounded-2xl bg-[#F7F7F5] p-3 text-sm outline-none"
            />
            <button
              onClick={onReject}
              disabled={!rejectComment.trim()}
              className="mt-3 w-full rounded-full bg-red-500 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-red-200"
            >
              Заблокировать с комментарием
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewedModerationRow({ item, owner }: { item: any; owner?: any }) {
  const status = item.moderation_status || "pending";
  const statusClass =
    status === "approved"
      ? "bg-[#E8F7EA] text-[#3F9E47]"
      : "bg-red-50 text-red-600";

  return (
    <div className="grid gap-3 rounded-[20px] border border-black/5 bg-[#F7F7F5] p-4 text-sm md:grid-cols-[minmax(0,1fr)_150px_160px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={item.image || "/hero.jpg"}
          alt=""
          className="h-14 w-16 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0">
          <div className="truncate font-extrabold">{item.name || "Без названия"}</div>
          <div className="truncate text-xs text-[#8D8D8D]">
            {getProfileName(owner, "Владелец")} · {item.location || item.city || "Адрес не указан"}
          </div>
          {item.moderation_comment && (
            <div className="mt-1 line-clamp-2 text-xs text-red-600">
              {item.moderation_comment}
            </div>
          )}
        </div>
      </div>
      <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
        {status === "approved" ? "Одобрено" : "Заблокировано"}
      </span>
      <Link
        href={getItemUrl(item)}
        className="rounded-full bg-white px-4 py-2 text-center text-xs font-bold"
      >
        Открыть
      </Link>
    </div>
  );
}

function ModerationDetail({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[20px] bg-white p-4">
      <div className="mb-2 text-xs font-bold uppercase text-[#8D8D8D]">{title}</div>
      <p className="whitespace-pre-line break-words text-sm leading-6 text-[#333333]">{text}</p>
    </div>
  );
}

function DisputeRow({
  report,
  userById,
  resolveDispute,
}: {
  report: any;
  userById: Record<string, any>;
  resolveDispute: (report: any, resolution: "full_refund" | "partial_refund" | "withhold") => void;
}) {
  const booking = report.bookings;
  const item = booking?.items;
  const renter = booking?.renter_id ? userById[booking.renter_id] : null;
  const owner = item?.owner_id ? userById[item.owner_id] : null;
  const renterName = getProfileName(renter, "Арендатор");
  const ownerName = getProfileName(owner, "Владелец");
  const deposit = Number(booking?.deposit_amount || item?.deposit || 0);
  const resolutionLabel: Record<string, string> = {
    full_refund: "Залог вернуть полностью",
    partial_refund: "Залог вернуть частично",
    withhold: "Залог удержать",
  };

  return (
    <div className="rounded-[20px] border border-black/5 bg-[#F7F7F5] p-4">
      <div className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)_220px] md:items-start">
        <img
          src={item?.image || "/hero.jpg"}
          alt=""
          className="h-20 w-full rounded-2xl object-cover"
        />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold">{item?.name || "Бронь"}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              report.status === "resolved" ? "bg-[#E8F7EA] text-[#3F9E47]" : "bg-red-50 text-red-600"
            }`}>
              {report.status === "resolved" ? "Закрыт" : "Открыт"}
            </span>
          </div>
          <div className="mt-1 text-sm text-[#6B6B6B]">
            {report.type === "return" ? "Спор при возврате" : "Спор при передаче"} · Залог: {formatMoney(deposit)}
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <ParticipantLink label="Владелец" userId={item?.owner_id} name={ownerName} />
            <ParticipantLink label="Арендатор" userId={booking?.renter_id} name={renterName} />
          </div>
          {booking?.start_date && booking?.end_date && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-sm text-[#6B6B6B]">
              Даты аренды:{" "}
              <span className="font-bold text-[#111111]">
                {new Date(booking.start_date).toLocaleDateString("ru-RU")} -{" "}
                {new Date(booking.end_date).toLocaleDateString("ru-RU")}
              </span>
            </div>
          )}
          {report.dispute_comment && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-sm text-[#333333]">
              <div className="mb-1 text-xs font-bold uppercase text-[#8D8D8D]">Описание проблемы</div>
              {report.dispute_comment}
            </div>
          )}
          {report.photos?.length > 0 && (
            <PhotoStrip title="Фото акта" photos={report.photos} />
          )}
          {report.dispute_photos?.length > 0 && (
            <PhotoStrip title="Фото проблемы" photos={report.dispute_photos} />
          )}
          {report.status === "resolved" && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-sm">
              <div className="font-bold">{resolutionLabel[report.resolution] || "Решение принято"}</div>
              <div className="mt-1 text-[#6B6B6B]">
                Вернуть: {formatMoney(Number(report.deposit_refund_amount || 0))} · Удержать:{" "}
                {formatMoney(Number(report.deposit_withheld_amount || 0))}
              </div>
              {report.resolution_comment && (
                <div className="mt-2 text-[#555555]">{report.resolution_comment}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={item?.id ? getItemUrl(item) : "/admin"}
            className="rounded-full bg-white px-4 py-2.5 text-center text-sm font-bold"
          >
            Открыть объявление
          </Link>
          {report.status !== "resolved" && (
            <>
              <button
                onClick={() => resolveDispute(report, "full_refund")}
                className="rounded-full bg-[#7BC47F] px-4 py-2.5 text-sm font-bold text-white"
              >
                Вернуть залог
              </button>
              <button
                onClick={() => resolveDispute(report, "partial_refund")}
                className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold"
              >
                Вернуть частично
              </button>
              <button
                onClick={() => resolveDispute(report, "withhold")}
                className="rounded-full bg-[#111111] px-4 py-2.5 text-sm font-bold text-white"
              >
                Удержать залог
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getProfileName(profile: any, fallback: string) {
  return profile?.full_name || profile?.username || profile?.email || fallback;
}

function ParticipantLink({
  label,
  userId,
  name,
}: {
  label: string;
  userId?: string;
  name: string;
}) {
  const content = (
    <div className="rounded-2xl bg-white p-3">
      <div className="text-xs font-bold uppercase text-[#8D8D8D]">{label}</div>
      <div className="mt-1 break-words font-extrabold text-[#111111]">{name}</div>
    </div>
  );

  if (!userId) return content;

  return (
    <Link href={`/user/${userId}`} className="block transition hover:-translate-y-0.5">
      {content}
    </Link>
  );
}

function PhotoStrip({ title, photos }: { title: string; photos: string[] }) {
  return (
    <div className="mt-3 rounded-2xl bg-white p-3">
      <div className="mb-2 text-xs font-bold uppercase text-[#8D8D8D]">{title}</div>
      <div className="flex gap-2 overflow-x-auto">
        {photos.map((photo) => (
          <a key={photo} href={photo} target="_blank" className="shrink-0">
            <img src={photo} alt="" className="h-16 w-16 rounded-xl object-cover" />
          </a>
        ))}
      </div>
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

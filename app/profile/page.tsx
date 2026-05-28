"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Tab = "overview" | "items" | "bookings" | "messages" | "favorites" | "wallet" | "reviews" | "settings";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [avatar, setAvatar] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [myItems, setMyItems] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [incomingBookings, setIncomingBookings] = useState<any[]>([]);
  const [bookingProfiles, setBookingProfiles] = useState<Record<string, any>>({});
  const [handoverReports, setHandoverReports] = useState<any[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;

    if (!currentUser) return;

    setUser(currentUser);
    setEmailVerified(!!currentUser.email_confirmed_at);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    if (profile) {
      setUsername(profile.username || profile.full_name || "");
      setAvatar(profile.avatar || "");
      setLocation(profile.location || "");
      setPhone(profile.phone || "");
      setPhoneVerified(!!profile.phone_verified);
    }

    const { data: items } = await supabase
      .from("items")
      .select("*")
      .eq("owner_id", currentUser.id)
      .order("created_at", { ascending: false });

    const ownedItems = items || [];
    setMyItems(ownedItems);

    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        *,
        items (*)
      `)
      .eq("renter_id", currentUser.id)
      .order("created_at", { ascending: false });

    const renterBookings = bookings || [];
    setMyBookings(renterBookings);

    if (ownedItems.length === 0) {
      setIncomingBookings([]);
      await Promise.all([loadBookingProfiles(renterBookings), loadHandoverReports(renterBookings)]);
      return;
    }

    const { data: incoming } = await supabase
      .from("bookings")
      .select(`
        *,
        items (*)
      `)
      .in(
        "item_id",
        ownedItems.map((item) => item.id)
      )
      .order("created_at", { ascending: false });

    const ownerBookings = incoming || [];
    setIncomingBookings(ownerBookings);
    const allBookings = [...renterBookings, ...ownerBookings];
    await Promise.all([loadBookingProfiles(allBookings), loadHandoverReports(allBookings)]);
  }

  async function loadHandoverReports(bookings: any[]) {
    const bookingIds = Array.from(new Set(bookings.map((booking) => booking.id).filter(Boolean)));

    if (bookingIds.length === 0) {
      setHandoverReports([]);
      return;
    }

    const { data, error } = await supabase
      .from("rental_handover_reports")
      .select("*")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("HANDOVER REPORTS ERROR:", error);
      return;
    }

    setHandoverReports(data || []);
  }

  async function loadBookingProfiles(bookings: any[]) {
    const ids = Array.from(
      new Set(
        bookings.flatMap((booking) =>
          [booking.renter_id, booking.items?.owner_id].filter(Boolean)
        )
      )
    );

    if (ids.length === 0) {
      setBookingProfiles({});
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar, verified, phone_verified")
      .in("id", ids);

    const profileMap = (data || []).reduce((acc: Record<string, any>, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    setBookingProfiles(profileMap);
  }

  async function deleteItem(id: string) {
    const confirmed = confirm("Удалить объявление?");

    if (!confirmed) return;

    await supabase.from("items").delete().eq("id", id);
    setMyItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function toggleItemStatus(itemId: string, currentStatus: string) {
    const newStatus = currentStatus === "paused" ? "active" : "paused";

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

  async function handlePayment(bookingId: string) {
    await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        status: "handover_pending",
      })
      .eq("id", bookingId);

    setMyBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              payment_status: "paid",
              status: "handover_pending",
            }
          : booking
      )
    );
  }

  async function updateMyBooking(bookingId: string, updates: Record<string, string>) {
    await supabase.from("bookings").update(updates).eq("id", bookingId);

    setMyBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId ? { ...booking, ...updates } : booking
      )
    );
  }

  async function saveProfile() {
    if (!user) return;

    setSavingProfile(true);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
      full_name: username,
      avatar,
      location,
      phone,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert("Не удалось сохранить профиль. Проверьте колонку profiles.location в Supabase.");
      setSavingProfile(false);
      return;
    }

    await supabase
      .from("items")
      .update({ owner_avatar: avatar })
      .eq("owner_id", user.id);

    alert("Профиль сохранен");
    setSavingProfile(false);
  }

  async function uploadAvatar(file: File | null) {
    if (!user || !file) return;

    if (!file.type.startsWith("image/")) {
      alert("Выберите изображение для аватара.");
      return;
    }

    setUploadingAvatar(true);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const fileName = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.log(error);
      alert("Не удалось загрузить аватар. Проверьте Storage bucket avatars.");
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

    setAvatar(data.publicUrl);
    setUploadingAvatar(false);
  }

  async function updateBookingStatus(bookingId: string, status: string) {
    const { data: booking } = await supabase
      .from("bookings")
      .select(`
        *,
        items (*)
      `)
      .eq("id", bookingId)
      .single();

    await supabase.from("bookings").update({ status }).eq("id", bookingId);

    setIncomingBookings((prev) =>
      prev.map((item) => (item.id === bookingId ? { ...item, status } : item))
    );

    if (booking) {
      await supabase.from("notifications").insert([
        {
          user_id: booking.renter_id,
          type: "booking",
          text:
            status === "approved"
              ? `Бронь подтверждена: ${booking.items?.name}`
              : `Бронь отклонена: ${booking.items?.name}`,
          link: "/profile",
        },
      ]);
    }
  }

  async function uploadReportPhotos(files: File[], bookingId: string, reportType: string) {
    const uploadedUrls: string[] = [];

    for (const file of files.slice(0, 5)) {
      if (!file.type.startsWith("image/")) continue;

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileName = `handover/${bookingId}/${reportType}/${crypto.randomUUID()}-${safeName}`;

      const { error } = await supabase.storage.from("items").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        console.log("REPORT PHOTO ERROR:", error);
        throw new Error("Не удалось загрузить фото акта.");
      }

      const { data } = supabase.storage.from("items").getPublicUrl(fileName);
      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  }

  function upsertLocalReport(report: any) {
    setHandoverReports((prev) => {
      const exists = prev.some((item) => item.id === report.id);

      if (exists) {
        return prev.map((item) => (item.id === report.id ? report : item));
      }

      return [...prev, report];
    });
  }

  function patchBookingState(bookingId: string, updates: Record<string, string>) {
    setMyBookings((prev) =>
      prev.map((booking) => (booking.id === bookingId ? { ...booking, ...updates } : booking))
    );
    setIncomingBookings((prev) =>
      prev.map((booking) => (booking.id === bookingId ? { ...booking, ...updates } : booking))
    );
  }

  async function createRentalReport(
    booking: any,
    reportType: "handover" | "return",
    files: File[],
    comment: string
  ) {
    if (!user) return;

    if (files.length === 0) {
      alert("Добавьте хотя бы одно фото состояния вещи.");
      return;
    }

    const photos = await uploadReportPhotos(files, booking.id, reportType);
    const nextStatus = reportType === "handover" ? "handover_pending" : "return_pending";

    const { data, error } = await supabase
      .from("rental_handover_reports")
      .insert({
        booking_id: booking.id,
        type: reportType,
        created_by: user.id,
        photos,
        comment: comment.trim(),
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("bookings").update({ status: nextStatus }).eq("id", booking.id);
    upsertLocalReport(data);
    patchBookingState(booking.id, { status: nextStatus });
  }

  async function confirmRentalReport(booking: any, report: any) {
    if (!user) return;

    const confirmedAt = new Date().toISOString();
    const nextStatus = report.type === "handover" ? "active" : "completed";
    const { data, error } = await supabase
      .from("rental_handover_reports")
      .update({
        status: "confirmed",
        confirmed_by: user.id,
        confirmed_at: confirmedAt,
      })
      .eq("id", report.id)
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("bookings").update({ status: nextStatus }).eq("id", booking.id);
    upsertLocalReport(data);
    patchBookingState(booking.id, { status: nextStatus });
  }

  async function openRentalDispute(booking: any, report?: any) {
    const reason = prompt("Коротко опишите проблему");

    if (!reason?.trim()) return;

    await supabase.from("bookings").update({ status: "dispute" }).eq("id", booking.id);

    if (report) {
      const { data } = await supabase
        .from("rental_handover_reports")
        .update({
          status: "disputed",
          dispute_comment: reason.trim(),
        })
        .eq("id", report.id)
        .select("*")
        .single();

      if (data) upsertLocalReport(data);
    }

    patchBookingState(booking.id, { status: "dispute" });
  }

  async function resendConfirmation() {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;

    setEmailVerified(!!currentUser?.email_confirmed_at);

    if (!currentUser?.email) return;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: currentUser.email,
    });

    if (error) {
      alert("Не удалось отправить письмо");
      return;
    }

    alert("Письмо отправлено повторно");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function getBookingDays(booking: any) {
    if (!booking.start_date || !booking.end_date) return 1;

    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    const diff = end.getTime() - start.getTime();

    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  function getBookingTotal(booking: any) {
    const days = getBookingDays(booking);
    const price = Number(booking.items?.price) || 0;

    return days * price;
  }

  function formatDateRange(booking: any) {
    if (!booking.start_date || !booking.end_date) return "Даты не выбраны";

    return `${new Date(booking.start_date).toLocaleDateString("ru-RU")} - ${new Date(
      booking.end_date
    ).toLocaleDateString("ru-RU")}`;
  }

  const displayName = username || user?.email?.split("@")[0] || "Пользователь";
  const pendingIncoming = incomingBookings.filter((booking) => booking.status === "pending");
  const completedCount = [
    ...myBookings,
    ...incomingBookings,
  ].filter((booking) => booking.status === "completed").length;
  const paidTotal = useMemo(
    () =>
      incomingBookings
        .filter((booking) => booking.payment_status === "paid")
        .reduce((sum, booking) => sum + getBookingTotal(booking), 0),
    [incomingBookings]
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] px-6 pt-32 text-[#111111]">
        Загрузка...
      </main>
    );
  }

  const navItems = [
    { id: "overview", label: "Обзор", icon: "⌂" },
    { id: "items", label: "Мои объявления", icon: "▣" },
    { id: "bookings", label: "Бронирования", icon: "□", badge: pendingIncoming.length },
    { id: "messages", label: "Сообщения", icon: "◌" },
    { id: "favorites", label: "Избранное", icon: "♡" },
    { id: "wallet", label: "Кошелек", icon: "₽" },
    { id: "reviews", label: "Отзывы", icon: "☆" },
    { id: "settings", label: "Настройки", icon: "⚙" },
  ] as const;

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">
      {!emailVerified && (
        <div className="mx-auto mb-6 max-w-7xl rounded-[24px] border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-[#111111]">
          <div className="font-bold">Подтвердите email</div>
          <div className="mt-1 text-[#6B6B6B]">
            Мы отправили письмо с подтверждением на вашу почту.
          </div>
          <button
            onClick={resendConfirmation}
            className="mt-3 rounded-full bg-[#111111] px-4 py-2 text-xs font-bold text-white"
          >
            Отправить повторно
          </button>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[270px_1fr]">
        <aside className="h-fit overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm">
          <div className="border-b border-black/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] text-xl font-extrabold text-white">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  displayName[0]?.toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <div className="truncate text-base font-extrabold">{displayName}</div>
                <div className="text-sm text-[#6B6B6B]">На сайте</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="rounded-xl bg-[#F7F7F5] px-3 py-2 text-xs text-[#6B6B6B]">
                ID: {user.id.slice(0, 6)}
              </div>

              <Link href={`/user/${user.id}`} className="text-xl text-[#6B6B6B]">
                ›
              </Link>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {emailVerified && (
                <span className="rounded-full bg-[#E8F7EA] px-3 py-1 text-xs font-bold text-[#3F9E47]">
                  Email
                </span>
              )}

              {phoneVerified && (
                <span className="rounded-full bg-[#E8F7EA] px-3 py-1 text-xs font-bold text-[#3F9E47]">
                  Телефон
                </span>
              )}
            </div>
          </div>

          <nav className="p-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`mb-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                  activeTab === item.id
                    ? "bg-[#E8F7EA] text-[#3F9E47]"
                    : "text-[#333333] hover:bg-[#F7F7F5]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-5 text-center text-lg text-[#6B6B6B]">{item.icon}</span>
                  {item.label}
                </span>

                {"badge" in item && !!item.badge && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-5 pt-2">
            <button
              onClick={logout}
              className="w-full rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-bold transition hover:bg-[#F7F7F5]"
            >
              Выйти
            </button>
          </div>
        </aside>

        <section>
          <ProfileHeader activeTab={activeTab} displayName={displayName} userId={user.id} />

          {activeTab === "overview" && (
            <>
              <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon="▧" label="Мои объявления" value={myItems.length} caption="Активные" />
                <StatCard icon="□" label="Бронирования" value={myBookings.length} caption="В этом месяце" />
                <StatCard icon="✓" label="Завершенные" value={completedCount} caption="Всего" />
                <StatCard icon="₽" label="Заработано" value={`${paidTotal.toLocaleString("ru-RU")} ₽`} caption="За все время" />
              </div>

              <DashboardSection title="Входящие бронирования" hrefLabel="Смотреть все" onClick={() => setActiveTab("bookings")}>
                {pendingIncoming.length === 0 ? (
                  <EmptyState text="Новых заявок пока нет" />
                ) : (
                  <div className="space-y-3">
                    {pendingIncoming.slice(0, 3).map((booking) => (
                      <IncomingBookingRow
                        key={booking.id}
                        booking={booking}
                        renterProfile={bookingProfiles[booking.renter_id]}
                        getBookingDays={getBookingDays}
                        getBookingTotal={getBookingTotal}
                        formatDateRange={formatDateRange}
                        updateBookingStatus={updateBookingStatus}
                        handoverReport={getRentalReport(handoverReports, booking.id, "handover")}
                        returnReport={getRentalReport(handoverReports, booking.id, "return")}
                        createRentalReport={createRentalReport}
                        confirmRentalReport={confirmRentalReport}
                        openRentalDispute={openRentalDispute}
                      />
                    ))}
                  </div>
                )}
              </DashboardSection>

              <DashboardSection title="Мои объявления" hrefLabel="Смотреть все" onClick={() => setActiveTab("items")}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {myItems.slice(0, 3).map((item) => (
                    <MiniItemCard key={item.id} item={item} />
                  ))}

                  <Link
                    href="/add"
                    className="flex min-h-[150px] flex-col items-center justify-center rounded-[20px] border border-dashed border-black/15 bg-white text-center transition hover:border-[#7BC47F] hover:bg-[#F8FFF8]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 text-3xl">
                      +
                    </span>
                    <span className="mt-3 text-sm font-bold">Добавить объявление</span>
                  </Link>
                </div>
              </DashboardSection>
            </>
          )}

          {activeTab === "items" && (
            <DashboardSection title="Мои объявления" hrefLabel="Добавить" href="/add">
              {myItems.length === 0 ? (
                <EmptyState text="У вас пока нет объявлений" />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {myItems.map((item) => (
                    <OwnerItemCard
                      key={item.id}
                      item={item}
                      toggleItemStatus={toggleItemStatus}
                      deleteItem={deleteItem}
                    />
                  ))}
                </div>
              )}
            </DashboardSection>
          )}

          {activeTab === "bookings" && (
            <>
              <DashboardSection title="Мои бронирования">
                {myBookings.length === 0 ? (
                  <EmptyState text="Пока нет бронирований" />
                ) : (
                  <div className="space-y-3">
                    {myBookings.map((booking) => (
                      <MyBookingRow
                        key={booking.id}
                        booking={booking}
                        ownerProfile={bookingProfiles[booking.items?.owner_id]}
                        getBookingDays={getBookingDays}
                        getBookingTotal={getBookingTotal}
                        formatDateRange={formatDateRange}
                        handlePayment={handlePayment}
                        updateMyBooking={updateMyBooking}
                        handoverReport={getRentalReport(handoverReports, booking.id, "handover")}
                        returnReport={getRentalReport(handoverReports, booking.id, "return")}
                        createRentalReport={createRentalReport}
                        confirmRentalReport={confirmRentalReport}
                        openRentalDispute={openRentalDispute}
                      />
                    ))}
                  </div>
                )}
              </DashboardSection>

              <DashboardSection title="Входящие бронирования">
                {incomingBookings.length === 0 ? (
                  <EmptyState text="Пока нет запросов на ваши вещи" />
                ) : (
                  <div className="space-y-3">
                    {incomingBookings.map((booking) => (
                      <IncomingBookingRow
                        key={booking.id}
                        booking={booking}
                        renterProfile={bookingProfiles[booking.renter_id]}
                        getBookingDays={getBookingDays}
                        getBookingTotal={getBookingTotal}
                        formatDateRange={formatDateRange}
                        updateBookingStatus={updateBookingStatus}
                        handoverReport={getRentalReport(handoverReports, booking.id, "handover")}
                        returnReport={getRentalReport(handoverReports, booking.id, "return")}
                        createRentalReport={createRentalReport}
                        confirmRentalReport={confirmRentalReport}
                        openRentalDispute={openRentalDispute}
                      />
                    ))}
                  </div>
                )}
              </DashboardSection>
            </>
          )}

          {activeTab === "settings" && (
            <DashboardSection title="Настройки профиля">
              <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                <div className="rounded-[22px] bg-[#F7F7F5] p-4">
                  <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] text-4xl font-extrabold text-white">
                    {avatar ? (
                      <img src={avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      username[0]?.toUpperCase() || "П"
                    )}
                  </div>

                  <label className="mt-4 flex cursor-pointer justify-center rounded-full bg-white px-4 py-3 text-sm font-bold transition hover:bg-[#EEEEEA]">
                    {uploadingAvatar ? "Загружаем..." : "Загрузить фото"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => uploadAvatar(e.target.files?.[0] || null)}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>

                  <p className="mt-3 text-center text-xs leading-relaxed text-[#6B6B6B]">
                    Фото будет видно в профиле, карточках и сообщениях.
                  </p>
                </div>

                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-bold">
                    Имя
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Как вас зовут"
                      className="w-full rounded-2xl bg-[#F7F7F5] p-4 font-normal outline-none"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    Телефон
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 999 123 45 67"
                      className="w-full rounded-2xl bg-[#F7F7F5] p-4 font-normal outline-none"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    Местоположение
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Россия, Краснодар"
                      className="w-full rounded-2xl bg-[#F7F7F5] p-4 font-normal outline-none"
                    />
                  </label>

                  <button
                    onClick={saveProfile}
                    disabled={savingProfile || uploadingAvatar}
                    className="w-fit rounded-full bg-[#7BC47F] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#69B56E] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? "Сохраняем..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </DashboardSection>
          )}

          {["messages", "favorites", "wallet", "reviews"].includes(activeTab) && (
            <DashboardSection title={getTabTitle(activeTab)}>
              <EmptyState text="Раздел скоро будет доступен в личном кабинете" />
            </DashboardSection>
          )}
        </section>
      </div>
    </main>
  );
}

function getTabTitle(tab: Tab) {
  const titles: Record<Tab, string> = {
    overview: "Обзор",
    items: "Мои объявления",
    bookings: "Бронирования",
    messages: "Сообщения",
    favorites: "Избранное",
    wallet: "Кошелек",
    reviews: "Отзывы",
    settings: "Настройки",
  };

  return titles[tab];
}

function getTabDescription(tab: Tab, displayName: string) {
  const descriptions: Record<Tab, string> = {
    overview: `Добро пожаловать, ${displayName}! Вот что происходит с вашими объявлениями.`,
    items: "Управляйте своими объявлениями, статусом и заявками.",
    bookings: "Следите за своими бронями и входящими заявками.",
    messages: "Диалоги с владельцами и арендаторами.",
    favorites: "Сохраненные вещи для будущей аренды.",
    wallet: "Баланс, выплаты и история платежей.",
    reviews: "Отзывы о вас и ваших вещах.",
    settings: "Обновите имя, телефон, местоположение и аватар.",
  };

  return descriptions[tab];
}

function ProfileHeader({
  activeTab,
  displayName,
  userId,
}: {
  activeTab: Tab;
  displayName: string;
  userId: string;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        <h1 className="text-4xl font-extrabold">{getTabTitle(activeTab)}</h1>
        <p className="mt-3 max-w-2xl text-base text-[#6B6B6B]">
          {getTabDescription(activeTab, displayName)}
        </p>
      </div>

      <Link
        href={`/user/${userId}`}
        className="rounded-2xl border border-black/10 bg-white px-5 py-3.5 text-sm font-bold shadow-sm transition hover:bg-[#F7F7F5]"
      >
        Посмотреть профиль ↗
      </Link>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  caption,
}: {
  icon: string;
  label: string;
  value: string | number;
  caption: string;
}) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E8F7EA] text-2xl text-[#3F9E47]">
          {icon}
        </div>
        <div>
          <div className="text-sm text-[#6B6B6B]">{label}</div>
          <div className="mt-1 text-2xl font-extrabold">{value}</div>
          <div className="mt-1 text-sm text-[#6B6B6B]">{caption}</div>
        </div>
      </div>
    </div>
  );
}

function DashboardSection({
  title,
  children,
  href,
  hrefLabel,
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  onClick?: () => void;
}) {
  return (
    <section className="mt-5 rounded-[24px] border border-black/5 bg-white p-5 shadow-sm lg:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold">{title}</h2>

        {href ? (
          <Link href={href} className="text-sm font-bold text-[#3F9E47]">
            {hrefLabel}
          </Link>
        ) : onClick ? (
          <button onClick={onClick} className="text-sm font-bold text-[#3F9E47]">
            {hrefLabel}
          </button>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-[#F7F7F5] px-5 py-4 text-sm text-[#6B6B6B]">
      {text}
    </div>
  );
}

function IncomingBookingRow({
  booking,
  renterProfile,
  getBookingDays,
  getBookingTotal,
  formatDateRange,
  updateBookingStatus,
  handoverReport,
  returnReport,
  createRentalReport,
  confirmRentalReport,
  openRentalDispute,
}: {
  booking: any;
  renterProfile?: any;
  getBookingDays: (booking: any) => number;
  getBookingTotal: (booking: any) => number;
  formatDateRange: (booking: any) => string;
  updateBookingStatus: (bookingId: string, status: string) => void;
  handoverReport?: any;
  returnReport?: any;
  createRentalReport: (booking: any, reportType: "handover" | "return", files: File[], comment: string) => void;
  confirmRentalReport: (booking: any, report: any) => void;
  openRentalDispute: (booking: any, report?: any) => void;
}) {
  const renterName = renterProfile?.full_name || renterProfile?.username || "Арендатор";
  const renterInitial = renterName[0]?.toUpperCase() || "А";
  const statusText = getBookingStatusText(booking.status, booking.payment_status);

  return (
    <div className="grid gap-4 rounded-[20px] border border-[#7BC47F]/25 bg-[#F8FFF8] p-3 md:grid-cols-[110px_minmax(0,1fr)_160px] md:items-center">
      <img
        src={booking.items?.image || "/hero.jpg"}
        alt=""
        className="h-24 w-full rounded-2xl object-cover"
      />

      <div className="min-w-0">
        <h3 className="line-clamp-1 text-base font-extrabold">
          {booking.items?.name || "Объявление"}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] text-xs font-extrabold text-white">
            {renterProfile?.avatar ? (
              <img src={renterProfile.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              renterInitial
            )}
          </div>
          <Link href={`/user/${booking.renter_id}`} className="font-bold text-[#3F9E47]">
            {renterName}
          </Link>
          {renterProfile?.verified && (
            <span className="rounded-full bg-[#E8F7EA] px-2 py-1 text-xs font-bold text-[#3F9E47]">
              Проверен
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#555555]">
          <span>{formatDateRange(booking)}</span>
          <span>{getBookingDays(booking)} дн.</span>
          <span className="font-bold text-[#111111]">
            {getBookingTotal(booking)} ₽
          </span>
        </div>
        <span className="mt-3 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
          {statusText}
        </span>
      </div>

      <div className="flex flex-col gap-2">
          <Link
            href={`/chat/${booking.item_id}?owner=${booking.renter_id}&booking=${booking.id}`}
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-center text-sm font-bold transition hover:bg-[#F7F7F5]"
          >
            Написать
          </Link>
      {booking.status === "pending" && (
        <>
          <button
            onClick={() => updateBookingStatus(booking.id, "approved")}
            className="rounded-full bg-[#7BC47F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#69B56E]"
          >
            Подтвердить
          </button>
          <button
            onClick={() => updateBookingStatus(booking.id, "rejected")}
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold transition hover:bg-[#F7F7F5]"
          >
            Отклонить
          </button>
        </>
      )}
      {["approved", "handover_pending"].includes(booking.status) && booking.payment_status === "paid" && !handoverReport && (
        <ReportForm
          buttonLabel="Передал вещь"
          placeholder="Комплектация, состояние, заметные дефекты"
          onSubmit={(files, comment) => createRentalReport(booking, "handover", files, comment)}
        />
      )}
      {handoverReport && booking.status === "handover_pending" && (
        <ReportSummary
          title="Акт передачи отправлен"
          report={handoverReport}
          hint="Ждем подтверждение арендатора."
          onDispute={() => openRentalDispute(booking, handoverReport)}
        />
      )}
      {returnReport && booking.status === "return_pending" && (
        <ReportSummary
          title="Арендатор вернул вещь"
          report={returnReport}
          hint="Проверьте состояние и подтвердите возврат."
          confirmLabel="Принять возврат"
          onConfirm={() => confirmRentalReport(booking, returnReport)}
          onDispute={() => openRentalDispute(booking, returnReport)}
        />
      )}
      </div>
    </div>
  );
}

function MyBookingRow({
  booking,
  ownerProfile,
  getBookingDays,
  getBookingTotal,
  formatDateRange,
  handlePayment,
  updateMyBooking,
  handoverReport,
  returnReport,
  createRentalReport,
  confirmRentalReport,
  openRentalDispute,
}: {
  booking: any;
  ownerProfile?: any;
  getBookingDays: (booking: any) => number;
  getBookingTotal: (booking: any) => number;
  formatDateRange: (booking: any) => string;
  handlePayment: (bookingId: string) => void;
  updateMyBooking: (bookingId: string, updates: Record<string, string>) => void;
  handoverReport?: any;
  returnReport?: any;
  createRentalReport: (booking: any, reportType: "handover" | "return", files: File[], comment: string) => void;
  confirmRentalReport: (booking: any, report: any) => void;
  openRentalDispute: (booking: any, report?: any) => void;
}) {
  const ownerName = ownerProfile?.full_name || ownerProfile?.username || "Владелец";
  const statusText = getBookingStatusText(booking.status, booking.payment_status);

  return (
    <div className="grid gap-4 rounded-[20px] border border-black/5 bg-white p-3 md:grid-cols-[92px_minmax(0,1fr)_140px] md:items-center">
      <img
        src={booking.items?.image || "/hero.jpg"}
        alt=""
        className="h-20 w-full rounded-2xl object-cover"
      />

      <div>
        <h3 className="line-clamp-1 text-base font-extrabold">
          {booking.items?.name || "Объявление"}
        </h3>
        {booking.items?.owner_id && (
          <Link
            href={`/user/${booking.items.owner_id}`}
            className="mt-1 inline-block text-sm font-bold text-[#3F9E47]"
          >
            {ownerName}
          </Link>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#6B6B6B]">
          <span>{formatDateRange(booking)}</span>
          <span>{getBookingDays(booking)} дн.</span>
          <span className="font-bold text-[#111111]">{getBookingTotal(booking)} ₽</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-center text-xs font-bold text-yellow-700">
        {statusText}
      </span>
      {booking.status === "approved" && booking.payment_status !== "paid" && (
        <button
          onClick={() => handlePayment(booking.id)}
          className="rounded-full bg-[#7BC47F] px-4 py-2.5 text-sm font-bold text-white"
        >
          Оплатить
        </button>
      )}
      {booking.status === "pending" && (
        <button
          onClick={() => updateMyBooking(booking.id, { status: "cancelled" })}
          className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-bold transition hover:bg-[#F7F7F5]"
        >
          Отменить
        </button>
      )}
      {handoverReport && booking.status === "handover_pending" && (
        <ReportSummary
          title="Владелец передал вещь"
          report={handoverReport}
          hint="Проверьте фото и подтвердите получение."
          confirmLabel="Принял вещь"
          onConfirm={() => confirmRentalReport(booking, handoverReport)}
          onDispute={() => openRentalDispute(booking, handoverReport)}
        />
      )}
      {booking.status === "active" && !returnReport && (
        <ReportForm
          buttonLabel="Вернул вещь"
          placeholder="Состояние при возврате, комплектация"
          onSubmit={(files, comment) => createRentalReport(booking, "return", files, comment)}
        />
      )}
      {returnReport && booking.status === "return_pending" && (
        <ReportSummary
          title="Акт возврата отправлен"
          report={returnReport}
          hint="Ждем подтверждение владельца."
          onDispute={() => openRentalDispute(booking, returnReport)}
        />
      )}
      {booking.status === "completed" && (
        <Link
          href={`/item/${booking.item_id}`}
          className="rounded-full bg-[#111111] px-4 py-2.5 text-center text-sm font-bold text-white"
        >
          Оставить отзыв
        </Link>
      )}
      </div>
    </div>
  );
}

function getBookingStatusText(status: string, paymentStatus?: string) {
  if (status === "pending") return "Ожидает подтверждения";
  if (status === "approved" && paymentStatus !== "paid") return "Подтверждена, ожидает оплату";
  if (status === "approved" && paymentStatus === "paid") return "Оплачена, ждет передачу";
  if (status === "handover_pending") return "Ожидает подтверждение передачи";
  if (status === "active") return "Аренда активна";
  if (status === "return_pending") return "Ожидает подтверждение возврата";
  if (status === "completed") return "Завершена";
  if (status === "dispute") return "Открыт спор";
  if (status === "rejected") return "Отклонена";
  if (status === "cancelled") return "Отменена";
  return status;
}

function getRentalReport(reports: any[], bookingId: string, type: "handover" | "return") {
  return reports.find((report) => report.booking_id === bookingId && report.type === type);
}

function ReportForm({
  buttonLabel,
  placeholder,
  onSubmit,
}: {
  buttonLabel: string;
  placeholder: string;
  onSubmit: (files: File[], comment: string) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await onSubmit(files, comment);
    setSaving(false);
    setFiles([]);
    setComment("");
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-3">
      <label className="block text-xs font-bold text-[#6B6B6B]">
        Фото состояния
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))}
          className="mt-2 w-full text-xs"
        />
      </label>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-20 w-full rounded-2xl bg-[#F7F7F5] p-3 text-xs outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={saving || files.length === 0}
        className="mt-2 w-full rounded-full bg-[#7BC47F] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {saving ? "Сохраняем..." : buttonLabel}
      </button>
    </div>
  );
}

function ReportSummary({
  title,
  report,
  hint,
  confirmLabel,
  onConfirm,
  onDispute,
}: {
  title: string;
  report: any;
  hint: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  onDispute: () => void;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-3 text-xs">
      <div className="font-extrabold">{title}</div>
      <div className="mt-1 text-[#6B6B6B]">{hint}</div>
      {report.comment && (
        <div className="mt-2 rounded-xl bg-[#F7F7F5] p-2 text-[#555555]">
          {report.comment}
        </div>
      )}
      {report.photos?.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {report.photos.map((photo: string) => (
            <a key={photo} href={photo} target="_blank" className="shrink-0">
              <img src={photo} alt="" className="h-14 w-14 rounded-xl object-cover" />
            </a>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {confirmLabel && onConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-[#7BC47F] px-4 py-2.5 text-sm font-bold text-white"
          >
            {confirmLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onDispute}
          className="rounded-full border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600"
        >
          Открыть спор
        </button>
      </div>
    </div>
  );
}

function MiniItemCard({ item }: { item: any }) {
  const moderation = getItemModerationLabel(item);

  return (
    <Link
      href={`/item/${item.id}`}
      className="grid min-h-[150px] grid-cols-[120px_1fr] overflow-hidden rounded-[20px] border border-black/5 bg-white transition hover:shadow-md"
    >
      <img
        src={item.image || "/hero.jpg"}
        alt=""
        className="h-full min-h-[150px] w-full object-cover"
      />
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-extrabold">{item.name}</h3>
        <div className="mt-2 text-base font-extrabold">{item.price} ₽</div>
        <div className="text-xs text-[#6B6B6B]">/ день</div>
        <div className={`mt-3 text-xs font-bold ${moderation.className}`}>
          {moderation.label}
        </div>
      </div>
    </Link>
  );
}

function OwnerItemCard({
  item,
  toggleItemStatus,
  deleteItem,
}: {
  item: any;
  toggleItemStatus: (itemId: string, currentStatus: string) => void;
  deleteItem: (id: string) => void;
}) {
  const moderation = getItemModerationLabel(item);

  return (
    <div className="overflow-hidden rounded-[22px] border border-black/5 bg-[#F7F7F5] transition hover:shadow-md">
      {item.image && (
        <img src={item.image} alt="" className="h-40 w-full object-cover" />
      )}

      <div className="p-4">
        <h3 className="line-clamp-1 text-base font-extrabold">{item.name}</h3>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              item.status === "paused"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-[#E8F7EA] text-[#3F9E47]"
            }`}
          >
            {item.status === "paused" ? "На паузе" : "Активно"}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#6B6B6B]">
            {item.views || 0} просмотров
          </span>
        </div>

        <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${moderation.badgeClassName}`}>
          {moderation.label}
        </div>

        {item.moderation_status === "rejected" && item.moderation_comment && (
          <div className="mt-3 rounded-2xl bg-red-50 p-3 text-xs leading-relaxed text-red-700">
            <span className="font-bold">Комментарий администратора: </span>
            {item.moderation_comment}
          </div>
        )}

        <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-snug text-[#6B6B6B]">
          {item.location}
        </p>

        <div className="mt-4 text-xl font-extrabold">{item.price} ₽</div>
        <div className="text-xs uppercase text-[#8D8D8D]">/ день</div>

        <div className="mt-5 flex gap-2">
          <Link
            href={`/item/${item.id}`}
            className="flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-bold"
          >
            Открыть
          </Link>
          <Link
            href={`/add?edit=${item.id}`}
            className="rounded-full bg-white px-4 py-3 text-sm font-bold"
          >
            Изм.
          </Link>
          <button
            onClick={() => toggleItemStatus(item.id, item.status)}
            className="rounded-full bg-white px-4 py-3 text-sm font-bold"
          >
            {item.status === "paused" ? "Вкл." : "Пауза"}
          </button>
          <button
            onClick={() => deleteItem(item.id)}
            className="rounded-full bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

function getItemModerationLabel(item: any) {
  if (item.moderation_status === "approved") {
    return {
      label: "Проверено",
      className: "text-[#3F9E47]",
      badgeClassName: "bg-[#E8F7EA] text-[#3F9E47]",
    };
  }

  if (item.moderation_status === "rejected") {
    return {
      label: "Заблокировано",
      className: "text-red-600",
      badgeClassName: "bg-red-50 text-red-600",
    };
  }

  return {
    label: "На проверке",
    className: "text-yellow-700",
    badgeClassName: "bg-yellow-100 text-yellow-700",
  };
}

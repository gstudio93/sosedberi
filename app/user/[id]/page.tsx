"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ItemCard from "@/components/ItemCard";
import { supabase } from "../../../lib/supabase";

type Tab = "items" | "reviews" | "details";

export default function UserPage() {
  const params = useParams();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("items");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [renterReviews, setRenterReviews] = useState<any[]>([]);
  const [completedRentals, setCompletedRentals] = useState(0);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    setProfile(profileData);

    const { data: itemsData } = await supabase
      .from("items")
      .select("*")
      .eq("owner_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const ownerItems = itemsData || [];
    setItems(ownerItems);

    const { data: reviewsData } = await supabase
      .from("reviews")
      .select(
        `
        *,
        profiles:author_id (
          username,
          full_name,
          avatar
        )
      `
      )
      .eq("owner_id", id)
      .eq("review_type", "item")
      .order("created_at", { ascending: false });

    setReviews(reviewsData || []);

    const { data: renterReviewsData } = await supabase
      .from("reviews")
      .select(
        `
        *,
        profiles:author_id (
          username,
          full_name,
          avatar
        )
      `
      )
      .eq("target_user_id", id)
      .eq("review_type", "renter")
      .order("created_at", { ascending: false });

    let renterReviewRows = renterReviewsData || [];

    if (renterReviewRows.length === 0) {
      const { data: renterBookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("renter_id", id)
        .eq("status", "completed");

      const bookingIds = (renterBookings || []).map((booking) => booking.id);

      if (bookingIds.length > 0) {
        const { data: fallbackRenterReviews } = await supabase
          .from("reviews")
          .select(
            `
            *,
            profiles:author_id (
              username,
              full_name,
              avatar
            )
          `
          )
          .eq("review_type", "renter")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false });

        renterReviewRows = fallbackRenterReviews || [];
      }
    }

    setRenterReviews(renterReviewRows);

    if (ownerItems.length > 0) {
      const { data: completedBookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("status", "completed")
        .in(
          "item_id",
          ownerItems.map((item) => item.id)
        );

      setCompletedRentals(completedBookings?.length || 0);
    } else {
      setCompletedRentals(0);
    }

    setLoading(false);
  }

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);
  const renterRating = useMemo(() => {
    if (renterReviews.length === 0) return 0;
    return renterReviews.reduce((sum, review) => sum + review.rating, 0) / renterReviews.length;
  }, [renterReviews]);

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    profile?.email?.split("@")[0] ||
    "Пользователь";

  const avatarLetter = displayName[0]?.toUpperCase() || "П";
  const primaryItem = items[0];
  const trustItems = [
    { label: "Профиль", done: Boolean(profile?.verified) },
    { label: "Телефон", done: Boolean(profile?.phone_verified) },
    { label: "Отзывы", done: reviews.length + renterReviews.length > 0 },
    { label: "Завершенные аренды", done: completedRentals > 0 },
    { label: "Активные объявления", done: items.length > 0 },
  ];
  const trustScore = Math.round(
    (trustItems.filter((item) => item.done).length / trustItems.length) * 100
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">
        <div className="mx-auto max-w-7xl rounded-[24px] bg-white p-6 shadow-sm">
          Загружаем профиль...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-24 pt-32 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px] lg:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] text-4xl font-extrabold text-white shadow-sm">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  avatarLetter
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">
                    {displayName}
                  </h1>

                  {profile?.verified && (
                    <span className="rounded-full bg-[#E8F7EA] px-3 py-1 text-xs font-bold text-[#3F9E47]">
                      Проверен
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Pill>{avgRating.toFixed(1)} рейтинг</Pill>
                  <Pill>{reviews.length} отзывов</Pill>
                  <Pill tone="green">
                    {renterRating.toFixed(1)} рейтинг арендатора
                  </Pill>
                  {profile?.phone_verified && (
                    <Pill tone="green">Телефон подтвержден</Pill>
                  )}
                  <Pill tone="green">Сделки через SosedBeri</Pill>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6B6B6B]">
                  <span>{profile?.location || "Город не указан"}</span>
                  <span>
                    На сайте с{" "}
                    {profile?.created_at
                      ? new Date(profile.created_at).getFullYear()
                      : "2026"}
                  </span>
                  <span>{items.length} объявлений</span>
                  <span>{completedRentals} завершенных аренд</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3">
              {primaryItem ? (
                <Link
                  href={`/chat/${primaryItem.id}?owner=${id}`}
                  className="rounded-full bg-[#7BC47F] px-6 py-3.5 text-center text-sm font-extrabold text-white transition hover:bg-[#69B56E]"
                >
                  Написать владельцу
                </Link>
              ) : (
                <button
                  disabled
                  className="rounded-full bg-[#E5E5E1] px-6 py-3.5 text-center text-sm font-extrabold text-[#8D8D8D]"
                >
                  Нет активных объявлений
                </button>
              )}

              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="rounded-full border border-black/10 bg-white px-6 py-3.5 text-sm font-extrabold transition hover:bg-[#F7F7F5]"
              >
                Поделиться профилем
              </button>
            </div>
          </div>

          <div className="grid border-t border-black/5 bg-[#FBFBFA] md:grid-cols-4">
            <Metric label="Объявления" value={items.length} />
            <Metric label="Отзывы" value={reviews.length} />
            <Metric label="Рейтинг" value={avgRating.toFixed(1)} />
            <Metric label="Рейтинг арендатора" value={renterRating.toFixed(1)} />
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-[#7BC47F]">Доверие</p>
                <h2 className="mt-1 text-2xl font-extrabold">Профиль доверия</h2>
              </div>
              <div className="rounded-2xl bg-[#F1FAF2] px-4 py-3 text-right">
                <div className="text-2xl font-black text-[#3F9E47]">{trustScore}%</div>
                <div className="text-xs font-bold text-[#6B6B6B]">заполнено</div>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl bg-[#F7F7F5] px-4 py-3 text-sm font-bold"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                      item.done ? "bg-[#7BC47F] text-white" : "bg-white text-[#8D8D8D]"
                    }`}
                  >
                    {item.done ? "✓" : "·"}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm lg:p-6">
            <p className="text-sm font-bold uppercase text-[#7BC47F]">Активность</p>
            <h2 className="mt-1 text-2xl font-extrabold">Что видно по профилю</h2>
            <div className="mt-5 space-y-3">
              <TrustFact label="Как владелец" value={`${items.length} объявлений · ${completedRentals} завершенных аренд`} />
              <TrustFact label="Отзывы о вещах" value={`${reviews.length} отзывов · ${avgRating.toFixed(1)} из 5`} />
              <TrustFact label="Как арендатор" value={`${renterReviews.length} оценок · ${renterRating.toFixed(1)} из 5`} />
            </div>
          </div>
        </section>

        <nav className="mt-6 grid rounded-[22px] border border-black/5 bg-white p-1.5 shadow-sm md:grid-cols-3">
          <TabButton active={activeTab === "items"} onClick={() => setActiveTab("items")}>
            Объявления
          </TabButton>
          <TabButton active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")}>
            Отзывы
          </TabButton>
          <TabButton active={activeTab === "details"} onClick={() => setActiveTab("details")}>
            Информация
          </TabButton>
        </nav>

        {activeTab === "items" && (
          <section className="mt-6 rounded-[28px] border border-black/5 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">Объявления</h2>
                <p className="mt-1 text-sm text-[#6B6B6B]">
                  Активные вещи, которые можно арендовать у пользователя.
                </p>
              </div>
            </div>

            {items.length === 0 ? (
              <EmptyState text="У пользователя пока нет активных объявлений." />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={{
                      ...item,
                      owner_profile: profile,
                    }}
                    tone="soft"
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "reviews" && (
          <section className="mt-6 rounded-[28px] border border-black/5 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">Отзывы</h2>
                <p className="mt-1 text-sm text-[#6B6B6B]">
                  Отзывы о вещах владельца и оценка пользователя как арендатора.
                </p>
              </div>
              <Pill>{avgRating.toFixed(1)} из 5</Pill>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-lg font-extrabold">О вещах владельца</h3>
                {reviews.length === 0 ? (
                  <EmptyState text="Пока нет отзывов о вещах." />
                ) : (
                  <div className="grid gap-4">
                    {reviews.map((review) => {
                      const authorName =
                        review.profiles?.full_name ||
                        review.profiles?.username ||
                        "Пользователь";

                      return (
                        <ReviewArticle
                          key={review.id}
                          review={review}
                          authorName={authorName}
                          label="Отзыв о вещи"
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-lg font-extrabold">Как арендатор</h3>
                {renterReviews.length === 0 ? (
                  <EmptyState text="Пока нет оценок от арендодателей." />
                ) : (
                  <div className="grid gap-4">
                    {renterReviews.map((review) => {
                      const authorName =
                        review.profiles?.full_name ||
                        review.profiles?.username ||
                        "Арендодатель";

                      return (
                        <ReviewArticle
                          key={review.id}
                          review={review}
                          authorName={authorName}
                          label="Оценка арендатора"
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "details" && (
          <section className="mt-6 rounded-[28px] border border-black/5 bg-white p-6 shadow-sm lg:p-8">
            <h2 className="text-2xl font-extrabold">Информация</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Местоположение" value={profile?.location || "Не указано"} />
              <InfoCard
                label="На сайте"
                value={
                  profile?.created_at
                    ? `с ${new Date(profile.created_at).getFullYear()}`
                    : "Недавно"
                }
              />
              <InfoCard label="Проверка" value={profile?.verified ? "Профиль проверен" : "Базовый профиль"} />
              <InfoCard label="Связь" value="Через чат SosedBeri" />
            </div>

            <div className="mt-6 rounded-[24px] bg-[#F7F7F5] p-5">
              <h3 className="text-xl font-extrabold">Как безопасно арендовать</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <TrustStep title="1. Проверьте объявление" text="Смотрите фото, условия передачи, залог и отзывы по вещи." />
                <TrustStep title="2. Общайтесь в чате" text="Уточните комплект, место передачи и состояние перед бронью." />
                <TrustStep title="3. Фиксируйте передачу" text="Используйте акт с фото при передаче и возврате вещи." />
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green";
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        tone === "green"
          ? "bg-[#E8F7EA] text-[#3F9E47]"
          : "bg-[#F7F7F5] text-[#111111]"
      }`}
    >
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-black/5 p-5 md:border-r last:border-r-0">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-sm text-[#6B6B6B]">{label}</div>
    </div>
  );
}

function TrustFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F7F7F5] px-4 py-3">
      <div className="text-xs font-bold uppercase text-[#8D8D8D]">{label}</div>
      <div className="mt-1 text-sm font-extrabold">{value}</div>
    </div>
  );
}

function TrustStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="text-sm font-black">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">{text}</p>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] bg-[#F7F7F5] px-5 py-4 text-sm text-[#6B6B6B]">
      {text}
    </div>
  );
}

function ReviewArticle({
  review,
  authorName,
  label,
}: {
  review: any;
  authorName: string;
  label: string;
}) {
  return (
    <article className="rounded-[22px] border border-black/5 bg-[#F7F7F5] p-5">
      <div className="flex items-start gap-3">
        <a
          href={`/user/${review.author_id}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] text-sm font-extrabold text-white"
          aria-label={`Профиль: ${authorName}`}
        >
          {review.profiles?.avatar ? (
            <img
              src={review.profiles.avatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            authorName[0]?.toUpperCase()
          )}
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/user/${review.author_id}`}
              className="max-w-full break-words font-extrabold hover:text-[#3F9E47]"
            >
              {authorName}
            </a>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#6B6B6B]">
              {label}
            </span>
          </div>

          <div className="mt-1 text-xs text-[#8D8D8D]">
            {new Date(review.created_at).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm font-bold text-[#FFB800]">
        {"★".repeat(review.rating)}
        <span className="text-[#D7D7D7]">
          {"★".repeat(Math.max(0, 5 - Number(review.rating || 0)))}
        </span>
      </div>
      <p className="mt-3 break-words leading-relaxed text-[#555555]">
        {review.text || "Без текста"}
      </p>
    </article>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[#F7F7F5] p-5">
      <div className="text-sm text-[#6B6B6B]">{label}</div>
      <div className="mt-2 font-extrabold">{value}</div>
    </div>
  );
}

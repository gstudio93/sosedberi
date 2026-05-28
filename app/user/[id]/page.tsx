"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
      .order("created_at", { ascending: false });

    setReviews(reviewsData || []);

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

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    profile?.email?.split("@")[0] ||
    "Пользователь";

  const avatarLetter = displayName[0]?.toUpperCase() || "П";
  const primaryItem = items[0];

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
            <Metric label="Аренд завершено" value={completedRentals} />
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
                  <Link
                    key={item.id}
                    href={`/item/${item.id}`}
                    className="group overflow-hidden rounded-[22px] border border-black/5 bg-[#F7F7F5] transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-white">
                      <img
                        src={item.image || "/hero.jpg"}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    </div>

                    <div className="p-5">
                      <h3 className="line-clamp-1 text-lg font-extrabold">
                        {item.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 min-h-10 text-sm text-[#6B6B6B]">
                        {item.location || item.city || "Местоположение не указано"}
                      </p>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div className="text-2xl font-extrabold">
                          {Number(item.price || 0).toLocaleString("ru-RU")} ₽
                        </div>
                        <div className="pb-1 text-xs font-bold uppercase text-[#8D8D8D]">
                          в день
                        </div>
                      </div>
                    </div>
                  </Link>
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
                  Опыт аренды у этого владельца.
                </p>
              </div>
              <Pill>{avgRating.toFixed(1)} из 5</Pill>
            </div>

            {reviews.length === 0 ? (
              <EmptyState text="Пока нет отзывов." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {reviews.map((review) => {
                  const authorName =
                    review.profiles?.full_name ||
                    review.profiles?.username ||
                    "Пользователь";

                  return (
                    <article
                      key={review.id}
                      className="rounded-[22px] border border-black/5 bg-[#F7F7F5] p-5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#7BC47F] text-sm font-extrabold text-white">
                          {review.profiles?.avatar ? (
                            <img
                              src={review.profiles.avatar}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            authorName[0]?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold">{authorName}</div>
                          <div className="text-xs text-[#8D8D8D]">
                            {new Date(review.created_at).toLocaleDateString("ru-RU")}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm font-bold text-[#FFB800]">
                        {"★".repeat(review.rating)}
                      </div>
                      <p className="mt-3 leading-relaxed text-[#555555]">
                        {review.text || "Без текста"}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[#F7F7F5] p-5">
      <div className="text-sm text-[#6B6B6B]">{label}</div>
      <div className="mt-2 font-extrabold">{value}</div>
    </div>
  );
}

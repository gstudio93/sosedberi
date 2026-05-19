"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function UserPage() {
  const params = useParams();

  const id = params.id as string;

  const [items, setItems] = useState<any[]>([]);

  const [reviews, setReviews] =
    useState<any[]>([]);

  const [avgRating, setAvgRating] =
    useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // ITEMS
    const { data: itemsData } =
      await supabase
        .from("items")
        .select("*")
        .eq("owner_id", id);

    setItems(itemsData || []);

    // REVIEWS
    const { data: reviewsData } =
      await supabase
        .from("reviews")
        .select("*")
        .eq("owner_id", id)
        .order("created_at", {
          ascending: false,
        });

    setReviews(reviewsData || []);

    if (reviewsData?.length) {
      const avg =
        reviewsData.reduce(
          (acc, review) =>
            acc + review.rating,
          0
        ) / reviewsData.length;

      setAvgRating(avg);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-12 rounded-3xl bg-white/5 p-8">

          <div className="flex items-center gap-6">

            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-4xl">
              👤
            </div>

            <div>
              <h1 className="text-4xl font-black">
                Владелец
              </h1>

              <div className="mt-3 text-xl">
                ⭐ {avgRating.toFixed(1)}
              </div>

              <div className="mt-2 text-neutral-400">
                {reviews.length} отзывов
              </div>
            </div>

          </div>
        </div>

        {/* ITEMS */}
        <section className="mb-20">
          <h2 className="mb-6 text-3xl font-bold">
            Объявления
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <a
                key={item.id}
                href={`/item/${item.id}`}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              >
                {item.image && (
                  <img
                    src={item.image}
                    className="h-56 w-full object-cover"
                  />
                )}

                <div className="p-5">
                  <h3 className="text-2xl font-bold">
                    {item.name}
                  </h3>

                  <p className="mt-2 text-neutral-400">
                    📍 {item.location}
                  </p>
             

                  <div className="mt-4 text-2xl font-black">
                    {item.price}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* REVIEWS */}
        <section>
          <h2 className="mb-6 text-3xl font-bold">
            Отзывы
          </h2>

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl bg-white/5 p-6 text-neutral-400">
                Пока нет отзывов
              </div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-3xl bg-white/5 p-6"
                >
                  <div className="text-xl">
                    {"★".repeat(review.rating)}
                  </div>

                  <p className="mt-4 text-neutral-300">
                    {review.text}
                  </p>

                  <div className="mt-4 text-sm text-neutral-500">
                    {new Date(
                      review.created_at
                    ).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
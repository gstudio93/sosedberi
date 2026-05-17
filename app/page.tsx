"use client";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [items, setItems] = useState<any[]>([]);
const [search, setSearch] = useState("");
const [selectedCategory, setSelectedCategory] = useState("Все");
const [selectedCity, setSelectedCity] = useState("Все города");
useEffect(() => {
  loadItems();
}, []);

async function loadItems() {
  const { data } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  setItems(data || []);
}
 

  return (
    <main className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-xl font-bold">SosedBeri</div>

        <div className="flex gap-4 text-sm text-neutral-300">
          <a href="#" className="hover:text-white">
            Каталог
          </a>

          <a
            href="/add"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
          >
            Сдать вещь
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-300">
            Краснодар • Аренда вещей между людьми
          </div>

          <h1 className="text-6xl font-black leading-tight">
            Возьми вещь
            <br />
            рядом с тобой
          </h1>

          <p className="mt-6 text-lg text-neutral-400">
            Инструменты, техника, спорт и электроника — не покупай,
            просто возьми у соседей.
          </p>
        </div>
      </section>
<div className="mb-8 flex flex-wrap gap-3">
  <select
  value={selectedCity}
  onChange={(e) => setSelectedCity(e.target.value)}
  className="mb-8 rounded-2xl bg-white/5 px-5 py-3 text-white outline-none"
>
  <option>Все города</option>
  <option>Краснодар</option>
  <option>Москва</option>
  <option>Сочи</option>
</select>
  {[
    "Все",
    "Техника",
    "Инструменты",
    "Спорт",
    "Отдых"
  ].map((cat) => (
    <button
      key={cat}
      onClick={() => setSelectedCategory(cat)}
      className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${
        selectedCategory === cat
          ? "bg-white text-black"
          : "bg-white/5 text-white"
      }`}
    >
      {cat}
    </button>
  ))}
</div>
      {/* CATALOG */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <h2 className="mb-8 text-3xl font-bold">
          Каталог вещей
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {items
  .filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "Все" ||
      item.category === selectedCategory;

    const matchesCity =
  selectedCity === "Все города" ||
  item.location === selectedCity;

return (
  matchesSearch &&
  matchesCategory &&
  matchesCity
);
  })
  .map((item) => (
            <a
              key={item.id}
              href={`/item/${item.id}`}
              className="cursor-pointer rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
            >
              {item.image ? (
  <img
    src={item.image}
    alt={item.name}
    className="h-48 w-full rounded-2xl object-cover"
  />
) : (
  <div className="text-4xl">{item.emoji}</div>
)}

              <h3 className="mt-4 text-xl font-semibold">
                {item.name}
              </h3>

              <p className="mt-2 text-sm text-neutral-400">
                📍 {item.location}
              </p>

              <div className="mt-4 font-bold text-white">
                {item.price}
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { CITIES } from "@/lib/cities";
import { CATEGORIES } from "@/lib/categories";
const { data: { user } } = await supabase.auth.getUser();
export default function AddItemPage() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [emoji, setEmoji] = useState("📦");
  const [file, setFile] = useState<any>(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] =
  useState<any[]>([]);
  async function fetchSuggestions(query: string) {
  if (query.length < 3) {
    setSuggestions([]);
    return;
  }

  try {
    const response = await fetch(
      `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&format=json&results=5&geocode=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    const results =
      data.response.GeoObjectCollection.featureMember || [];

    setSuggestions(results);
  } catch (error) {
    console.log("SUGGEST ERROR:", error);
    setSuggestions([]);
  }
}
  async function getCoordinates(address: string) {
  try {
    const response = await fetch(
      `https://geocode-maps.yandex.ru/1.x/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&format=json&geocode=${encodeURIComponent(address)}`
    );

    const data = await response.json();

    const feature =
      data.response.GeoObjectCollection
        .featureMember[0];

    if (!feature) {
      return {
        latitude: null,
        longitude: null,
      };
    }

    const pos =
      feature.GeoObject.Point.pos;

    const [longitude, latitude] =
      pos.split(" ").map(Number);

    return {
      latitude,
      longitude,
    };
  } catch (error) {
    console.log(error);

    return {
      latitude: null,
      longitude: null,
    };
  }
}
async function uploadImages(files: File[]) {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("items")
      .upload(fileName, file);

    if (error) {
      console.log(error);
      alert("Ошибка загрузки фото");
      return;
    }

    const { data } = supabase.storage
      .from("items")
      .getPublicUrl(fileName);

    uploadedUrls.push(data.publicUrl);
  }

  setImages(uploadedUrls);
  setImage(uploadedUrls[0] || "");
}
async function handleSubmit(e: any) {
  e.preventDefault();

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    alert("Войдите");
    return;
  }

  const coords = await getCoordinates(location);

  console.log("COORDS:", coords);

  const { error } = await supabase.from("items").insert([
    {
      name,
      description,
      price,
      location,
      category,
      image,
      image: images[0] || image,
images,

      latitude: coords.latitude,
      longitude: coords.longitude,

      owner_id: user.id,
    },
  ]);

  if (error) {
    console.log("CREATE ITEM ERROR:", error);
    alert(error.message);
    return;
  }

  alert("Объявление создано");
}
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-xl">
        <h1 className="text-4xl font-bold">
          Добавить вещь
        </h1>

        <p className="mt-3 text-neutral-400">
          Размести вещь для аренды
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-4"
        >
          <input
            className="w-full rounded-xl bg-white/5 p-4 outline-none"
            placeholder="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="w-full rounded-xl bg-white/5 p-4 outline-none"
            placeholder="Цена"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
            <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание вещи"
            className="w-full rounded-2xl bg-white/5 p-4 text-white outline-none"
          />
            <div className="relative">

  <input
    value={location}
    onChange={(e) => {
      setLocation(e.target.value);

      fetchSuggestions(
        e.target.value
      );
    }}
    placeholder="Город, улица, дом"
    className="w-full rounded-2xl bg-white/5 p-4 outline-none"
  />

  {/* DROPDOWN */}
  {suggestions.length > 0 && (
    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl bg-[#111111] shadow-2xl">

      {suggestions.map(
        (item: any, index) => (
          <button
  key={index}
  type="button"
  onClick={() => {
    setLocation(
      item.GeoObject.metaDataProperty.GeocoderMetaData.text
    );

    setSuggestions([]);
  }}
  className="w-full border-b border-white/5 px-5 py-4 text-left transition hover:bg-white/5"
>
  {item.GeoObject.metaDataProperty.GeocoderMetaData.text}
</button>
        )
      )}

    </div>
  )}

</div>
          <select
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  className="w-full rounded-xl bg-white/5 p-4 text-white outline-none"
>
  <option value="">Выберите категорию</option>

  {CATEGORIES.map((cat) => (
    <option key={cat} value={cat}>
      {cat}
    </option>
  ))}
</select>

          
          <input
  type="file"
  multiple
  accept="image/*"
  onChange={(e) => {
    const files = Array.from(e.target.files || []);
    uploadImages(files);
  }}
  className="w-full rounded-2xl bg-white/5 p-4"
/>

          <button
  type="submit"
  className="rounded-2xl bg-white px-6 py-4 font-bold text-black"
>
  Добавить
</button>
        </form>
      </div>
    </main>
  );
}
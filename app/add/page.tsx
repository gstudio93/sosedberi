"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
const { data: { user } } = await supabase.auth.getUser();
export default function AddItemPage() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [emoji, setEmoji] = useState("📦");
  const [file, setFile] = useState<any>(null);
const [category, setCategory] = useState("Техника");
const [description, setDescription] = useState("");
 async function handleSubmit(e: any) {
  e.preventDefault();

  console.log("START");

  const {
    data: { user }
  } = await supabase.auth.getUser();

  console.log("USER", user);

  if (!user) {
    alert("Войдите в аккаунт");
    return;
  }

  let imageUrl = "";

  if (file) {
    console.log("UPLOAD START");

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("items")
      .upload(fileName, file);

    console.log("UPLOAD END");

    if (uploadError) {
      console.log(uploadError);
      alert(JSON.stringify(uploadError));
      return;
    }

    const { data } = supabase.storage
      .from("items")
      .getPublicUrl(fileName);

    imageUrl = data.publicUrl;

    console.log("IMAGE URL", imageUrl);
  }

  console.log("INSERT START");

  const { error } = await supabase
    .from("items")
    .insert([
      {
        name,
        price,
        category,
        location,
        emoji,
        image: imageUrl,
        description,
        owner_id: user.id
      }
    ]);

  console.log("INSERT END");

  if (error) {
    console.log(error);
    alert(JSON.stringify(error));
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
          <input
            className="w-full rounded-xl bg-white/5 p-4 outline-none"
            placeholder="Город"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <input
            className="w-full rounded-xl bg-white/5 p-4 outline-none"
            placeholder="Emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
          />

          <input
  type="file"
  onChange={(e: any) => setFile(e.target.files[0])}
  className="w-full rounded-xl bg-white/5 p-4"
/><select
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  className="w-full rounded-2xl bg-white/5 p-4 outline-none"
>
  <option>Техника</option>
  <option>Инструменты</option>
  <option>Спорт</option>
  <option>Отдых</option>
</select>
          <button
            type="submit"
            className="w-full rounded-xl bg-white py-4 font-semibold text-black"
          >
            Добавить
          </button>
        </form>
      </div>
    </main>
  );
}
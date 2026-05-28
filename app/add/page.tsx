"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/lib/supabase";

type Suggestion = {
  GeoObject: {
    metaDataProperty: {
      GeocoderMetaData: {
        text: string;
      };
    };
  };
};

export default function AddItemPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const previewImage = images[0] || image || "/hero.jpg";
  const priceNumber = Number(price) || 0;
  const depositNumber = Number(deposit) || 0;

  const formReady = useMemo(
    () => name.trim() && priceNumber > 0 && location.trim() && category,
    [category, location, name, priceNumber]
  );

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
        data.response?.GeoObjectCollection?.featureMember || [];

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
        data.response?.GeoObjectCollection?.featureMember?.[0];

      if (!feature) {
        return {
          latitude: null,
          longitude: null,
        };
      }

      const pos = feature.GeoObject.Point.pos;
      const [longitude, latitude] = pos.split(" ").map(Number);

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
    if (!files.length) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileName = `${crypto.randomUUID()}-${file.name}`;

      const { error } = await supabase.storage
        .from("items")
        .upload(fileName, file);

      if (error) {
        console.log(error);
        alert("Не удалось загрузить фото. Проверьте Storage bucket items.");
        setUploading(false);
        return;
      }

      const { data } = supabase.storage
        .from("items")
        .getPublicUrl(fileName);

      uploadedUrls.push(data.publicUrl);
    }

    setImages(uploadedUrls);
    setImage(uploadedUrls[0] || "");
    setUploading(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formReady) {
      alert("Заполните название, цену, адрес и категорию.");
      return;
    }

    setSubmitting(true);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setSubmitting(false);
      alert("Войдите в аккаунт, чтобы сдать вещь.");
      return;
    }

    const coords = await getCoordinates(location);

    const { data: createdItems, error } = await supabase
      .from("items")
      .insert([
        {
          name: name.trim(),
          description: description.trim(),
          price: priceNumber,
          deposit: depositNumber,
          location: location.trim(),
          category,
          image: images[0] || image,
          images,
          latitude: coords.latitude,
          longitude: coords.longitude,
          owner_id: user.id,
          status: "active",
        },
      ])
      .select("id")
      .single();

    setSubmitting(false);

    if (error) {
      console.log("CREATE ITEM ERROR:", error);
      alert(error.message);
      return;
    }

    router.push(createdItems?.id ? `/item/${createdItems.id}` : "/profile");
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-28 pt-32 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-4 inline-flex rounded-full bg-[#7BC47F]/15 px-4 py-2 text-sm font-bold text-[#3F9E47]">
              Новое объявление
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight lg:text-6xl">
              Сдайте вещь соседям за пару минут
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#6B6B6B]">
              Добавьте фото, адрес, цену и описание. После публикации вещь
              появится в каталоге и на карте.
            </p>
          </div>

          <div className="rounded-[28px] bg-white px-6 py-5 text-sm font-bold text-[#6B6B6B] shadow-sm">
            Комиссию и залог можно настроить позже в платежном сценарии.
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-8 lg:grid-cols-[1fr_420px]"
        >
          <section className="space-y-6 rounded-[32px] border border-black/5 bg-white p-5 shadow-sm lg:p-8">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#6B6B6B]">
                Название вещи
              </label>
              <input
                className="w-full rounded-2xl bg-[#F7F7F5] px-5 py-4 text-lg outline-none transition focus:ring-2 focus:ring-[#7BC47F]"
                placeholder="Например, перфоратор Bosch"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-[#6B6B6B]">
                  Цена за день
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-2xl bg-[#F7F7F5] px-5 py-4 pr-12 text-lg outline-none transition focus:ring-2 focus:ring-[#7BC47F]"
                    placeholder="700"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-[#8D8D8D]">
                    ₽
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#6B6B6B]">
                  Залог
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-2xl bg-[#F7F7F5] px-5 py-4 pr-12 text-lg outline-none transition focus:ring-2 focus:ring-[#7BC47F]"
                    placeholder="3000"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-[#8D8D8D]">
                    ₽
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#6B6B6B]">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Состояние, комплектация, условия передачи"
                className="min-h-[150px] w-full rounded-2xl bg-[#F7F7F5] px-5 py-4 text-lg outline-none transition focus:ring-2 focus:ring-[#7BC47F]"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="relative">
                <label className="mb-2 block text-sm font-bold text-[#6B6B6B]">
                  Адрес передачи
                </label>
                <input
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    fetchSuggestions(e.target.value);
                  }}
                  placeholder="Город, улица, дом"
                  className="w-full rounded-2xl bg-[#F7F7F5] px-5 py-4 text-lg outline-none transition focus:ring-2 focus:ring-[#7BC47F]"
                />

                {suggestions.length > 0 && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl">
                    {suggestions.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setLocation(
                            item.GeoObject.metaDataProperty.GeocoderMetaData
                              .text
                          );
                          setSuggestions([]);
                        }}
                        className="w-full border-b border-black/5 px-5 py-4 text-left text-sm transition hover:bg-[#F7F7F5]"
                      >
                        {item.GeoObject.metaDataProperty.GeocoderMetaData.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#6B6B6B]">
                  Категория
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl bg-[#F7F7F5] px-5 py-4 text-lg outline-none transition focus:ring-2 focus:ring-[#7BC47F]"
                >
                  <option value="">Выберите категорию</option>

                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#6B6B6B]">
                Фотографии
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-black/15 bg-[#F7F7F5] px-6 py-10 text-center transition hover:border-[#7BC47F] hover:bg-[#F1FAF2]">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    uploadImages(files);
                  }}
                  className="sr-only"
                />
                <span className="text-4xl">📷</span>
                <span className="mt-3 text-lg font-black">
                  {uploading ? "Загружаем фото..." : "Выбрать фото"}
                </span>
                <span className="mt-1 text-sm text-[#6B6B6B]">
                  Лучше добавить 3-5 фото с разных ракурсов
                </span>
              </label>
            </div>
          </section>

          <aside className="h-fit space-y-5 lg:sticky lg:top-32">
            <div className="overflow-hidden rounded-[32px] bg-white shadow-sm">
              <img
                src={previewImage}
                alt="Превью объявления"
                className="h-[280px] w-full object-cover"
              />

              <div className="p-6">
                <div className="text-sm font-bold text-[#7BC47F]">
                  {category || "Категория"}
                </div>

                <h2 className="mt-2 line-clamp-2 text-2xl font-black">
                  {name || "Название вещи"}
                </h2>

                <p className="mt-2 line-clamp-2 text-sm text-[#6B6B6B]">
                  {location || "Адрес передачи"}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#F7F7F5] p-4">
                    <div className="text-xs font-bold uppercase text-[#8D8D8D]">
                      Цена
                    </div>
                    <div className="mt-1 text-2xl font-black">
                      {priceNumber || 0} ₽
                    </div>
                    <div className="text-sm text-[#6B6B6B]">в день</div>
                  </div>

                  <div className="rounded-2xl bg-[#F7F7F5] p-4">
                    <div className="text-xs font-bold uppercase text-[#8D8D8D]">
                      Залог
                    </div>
                    <div className="mt-1 text-2xl font-black">
                      {depositNumber || 0} ₽
                    </div>
                    <div className="text-sm text-[#6B6B6B]">возвратный</div>
                  </div>
                </div>

                {images.length > 1 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto">
                    {images.map((img) => (
                      <img
                        key={img}
                        src={img}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!formReady || uploading || submitting}
              className="w-full rounded-full bg-[#7BC47F] px-8 py-5 text-lg font-black text-white shadow-lg shadow-[#7BC47F]/20 transition hover:bg-[#69B56E] disabled:cursor-not-allowed disabled:bg-[#B8DDBA]"
            >
              {submitting ? "Публикуем..." : "Опубликовать вещь"}
            </button>

            <div className="rounded-[28px] bg-white p-6 text-sm leading-relaxed text-[#6B6B6B] shadow-sm">
              После публикации вы сможете принимать заявки, отвечать в чате и
              управлять объявлением в профиле.
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}

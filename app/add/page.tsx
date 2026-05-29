"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/lib/supabase";

type Suggestion = {
  title: string;
  subtitle: string;
  address: string;
};

const MAX_ITEM_PHOTO_SIZE = 20 * 1024 * 1024;

function inferImageMimeType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";

  return "";
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || Boolean(inferImageMimeType(file.name));
}

export default function AddItemPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F7F7F5] px-6 pb-28 pt-32 text-[#111111]">
          <div className="mx-auto max-w-7xl rounded-[28px] bg-white p-8 shadow-sm">
            Загружаем форму...
          </div>
        </main>
      }
    >
      <AddItemContent />
    </Suspense>
  );
}

function AddItemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsMessage, setSuggestionsMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingItem, setLoadingItem] = useState(!!editId);
  const suggestRequestId = useRef(0);
  const isEditMode = !!editId;

  const previewImage = images[0] || "/hero.jpg";
  const priceNumber = Number(price) || 0;
  const depositNumber = Number(deposit) || 0;

  const formReady = useMemo(
    () => name.trim() && priceNumber > 0 && location.trim() && category,
    [category, location, name, priceNumber]
  );

  useEffect(() => {
    if (!editId) return;

    loadEditableItem(editId);
  }, [editId]);

  async function loadEditableItem(itemId: string) {
    setLoadingItem(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      alert("Войдите в аккаунт, чтобы редактировать объявление.");
      router.push("/login");
      return;
    }

    const { data: item, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", itemId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error || !item) {
      console.log("LOAD EDIT ITEM ERROR:", error);
      alert("Не удалось открыть объявление для редактирования.");
      router.push("/profile");
      return;
    }

    setName(item.name || "");
    setPrice(String(Number(item.price || 0) || ""));
    setDeposit(String(Number(item.deposit || 0) || ""));
    setLocation(item.location || "");
    setImages(item.images?.length ? item.images : item.image ? [item.image] : []);
    setCategory(item.category || "");
    setDescription(item.description || "");
    setLoadingItem(false);
  }

  async function fetchSuggestions(query: string) {
    const trimmedQuery = query.trim();
    const requestId = suggestRequestId.current + 1;
    suggestRequestId.current = requestId;

    if (trimmedQuery.length < 3) {
      setSuggestions([]);
      setSuggestionsMessage("");
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    setSuggestionsMessage("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    try {
      const response = await fetch(
        `/api/address-suggest?text=${encodeURIComponent(trimmedQuery)}`,
        { signal: controller.signal }
      );

      const data = await response.json();

      if (requestId === suggestRequestId.current) {
        setSuggestions(data.suggestions || []);
        setSuggestionsMessage(
          data.suggestions?.length
            ? ""
            : data.message || getSuggestDebugMessage(data.debug)
        );
      }
    } catch (error) {
      console.log("SUGGEST ERROR:", error);
      if (requestId === suggestRequestId.current) {
        setSuggestions([]);
        setSuggestionsMessage("Не удалось получить подсказки. Адрес можно ввести вручную.");
      }
    } finally {
      clearTimeout(timeout);
      if (requestId === suggestRequestId.current) {
        setSuggestionsLoading(false);
      }
    }
  }

  async function getCoordinates(address: string) {
    try {
      const response = await fetch(
        `/api/geocode?address=${encodeURIComponent(address)}`
      );

      const data = await response.json();

      if (!data.latitude || !data.longitude) {
        return {
          latitude: null,
          longitude: null,
        };
      }

      return {
        latitude: data.latitude,
        longitude: data.longitude,
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
    setUploadError("");
    const uploadedUrls: string[] = [];

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      setUploadError("Войдите в аккаунт, чтобы загрузить фото.");
      setUploading(false);
      return;
    }

    try {
      for (const file of files) {
        if (!isImageFile(file)) {
          setUploadError("Можно загружать только изображения.");
          continue;
        }

        if (file.size > MAX_ITEM_PHOTO_SIZE) {
          setUploadError("Фото слишком большое. Максимальный размер — 20 МБ.");
          continue;
        }

        const contentType = file.type || inferImageMimeType(file.name) || "image/jpeg";
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const fileName = `${user.id}/${crypto.randomUUID()}-${safeName}`;

        const { error } = await supabase.storage
          .from("items")
          .upload(fileName, file, {
            cacheControl: "3600",
            contentType,
            upsert: false,
          });

        if (error) {
          console.log("ITEM PHOTO UPLOAD ERROR:", error);
          setUploadError(error.message || "Не удалось загрузить фото. Проверьте Storage bucket items.");
          setUploading(false);
          return;
        }

        const { data } = supabase.storage
          .from("items")
          .getPublicUrl(fileName);

        uploadedUrls.push(data.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        setImages((current) => [...current, ...uploadedUrls]);
      }
    } catch (error) {
      console.log("ITEM PHOTO UPLOAD EXCEPTION:", error);
      setUploadError("Не удалось загрузить фото. Попробуйте выбрать другое изображение.");
    } finally {
      setUploading(false);
    }
  }

  function makeMainImage(selectedImage: string) {
    setImages((current) => [
      selectedImage,
      ...current.filter((img) => img !== selectedImage),
    ]);
  }

  function removeImage(selectedImage: string) {
    setImages((current) => current.filter((img) => img !== selectedImage));
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

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: priceNumber,
      deposit: depositNumber,
      location: location.trim(),
      category,
      image: images[0] || "",
      images,
      latitude: coords.latitude,
      longitude: coords.longitude,
      status: "active",
      moderation_status: "pending",
      moderation_comment: null,
      moderated_at: null,
      moderated_by: null,
      updated_at: new Date().toISOString(),
    };

    const { data: savedItem, error } = isEditMode
      ? await supabase
          .from("items")
          .update(payload)
          .eq("id", editId)
          .eq("owner_id", user.id)
          .select("id")
          .single()
      : await supabase
          .from("items")
          .insert([
            {
              ...payload,
              owner_id: user.id,
            },
          ])
          .select("id")
          .single();

    setSubmitting(false);

    if (error) {
      console.log("SAVE ITEM ERROR:", error);
      alert(error.message);
      return;
    }

    router.push(savedItem?.id ? `/item/${savedItem.id}` : "/profile");
  }

  if (loadingItem) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] px-6 pb-28 pt-32 text-[#111111]">
        <div className="mx-auto max-w-7xl rounded-[28px] bg-white p-8 shadow-sm">
          Загружаем объявление...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] px-6 pb-28 pt-32 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-4 inline-flex rounded-full bg-[#7BC47F]/15 px-4 py-2 text-sm font-bold text-[#3F9E47]">
              {isEditMode ? "Редактирование" : "Новое объявление"}
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight lg:text-6xl">
              {isEditMode ? "Обновите объявление" : "Сдайте вещь соседям за пару минут"}
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#6B6B6B]">
              {isEditMode
                ? "После сохранения объявление останется опубликованным, но снова попадет администратору на проверку."
                : "Добавьте фото, адрес, цену и описание. После публикации вещь появится в каталоге и на карте."}
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
                  onFocus={() => fetchSuggestions(location)}
                  placeholder="Город, улица, дом"
                  className="w-full rounded-2xl bg-[#F7F7F5] px-5 py-4 text-lg outline-none transition focus:ring-2 focus:ring-[#7BC47F]"
                />

                {(suggestions.length > 0 || suggestionsLoading || suggestionsMessage) && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl">
                    {suggestionsLoading && suggestions.length === 0 && (
                      <div className="px-5 py-4 text-sm text-[#6B6B6B]">
                        Ищем адрес...
                      </div>
                    )}

                    {!suggestionsLoading && suggestions.length === 0 && suggestionsMessage && (
                      <div className="px-5 py-4 text-sm text-[#6B6B6B]">
                        {suggestionsMessage}
                      </div>
                    )}

                    {suggestions.map((item) => (
                      <button
                        key={item.address}
                        type="button"
                        onClick={() => {
                          setLocation(item.address);
                          setSuggestions([]);
                        }}
                        className="w-full border-b border-black/5 px-5 py-4 text-left text-sm transition hover:bg-[#F7F7F5]"
                      >
                        <span className="block font-bold text-[#111111]">
                          {item.title || item.address}
                        </span>
                        {item.subtitle && (
                          <span className="mt-1 block text-xs text-[#6B6B6B]">
                            {item.subtitle}
                          </span>
                        )}
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
                    e.target.value = "";
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
              {uploadError && (
                <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  {uploadError}
                </div>
              )}
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((img, index) => (
                    <div
                      key={img}
                      className={`relative overflow-hidden rounded-2xl border bg-[#F7F7F5] ${
                        index === 0 ? "border-[#7BC47F]" : "border-black/10"
                      }`}
                    >
                      <img src={img} alt="" className="h-28 w-full object-cover" />

                      {index === 0 && (
                        <div className="absolute left-2 top-2 rounded-full bg-[#7BC47F] px-2 py-1 text-xs font-bold text-white">
                          Главное
                        </div>
                      )}

                      <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => makeMainImage(img)}
                            className="flex-1 rounded-full bg-white/95 px-3 py-2 text-xs font-bold shadow-sm"
                          >
                            Главным
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => removeImage(img)}
                          className="rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-red-500 shadow-sm"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

                {images.length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto">
                    {images.map((img, index) => (
                      <button
                        key={img}
                        type="button"
                        onClick={() => makeMainImage(img)}
                        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border ${
                          index === 0 ? "border-[#7BC47F]" : "border-transparent"
                        }`}
                        title={index === 0 ? "Главное фото" : "Сделать главным"}
                      >
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </button>
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
              {submitting
                ? isEditMode
                  ? "Сохраняем..."
                  : "Публикуем..."
                : isEditMode
                  ? "Сохранить изменения"
                  : "Опубликовать вещь"}
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

function getSuggestDebugMessage(debug: any) {
  const suggestStatus = debug?.suggest?.status;
  const geocoderStatus = debug?.geocoder?.status;

  if (suggestStatus === 403 || geocoderStatus === 403) {
    return "Ключ Яндекс API не разрешает подсказки адресов. Адрес можно ввести вручную.";
  }

  if (suggestStatus === 401 || geocoderStatus === 401) {
    return "Ключ Яндекс API не принят. Проверьте переменную в Vercel.";
  }

  if (debug?.suggest?.error || debug?.geocoder?.error) {
    return "Яндекс не вернул адреса. Адрес можно ввести вручную.";
  }

  return "Адрес не найден. Попробуйте указать город и улицу точнее.";
}

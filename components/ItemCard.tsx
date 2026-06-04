"use client";

import Link from "next/link";
import { getItemUrl } from "@/lib/item-url";
import SafeImage from "@/components/SafeImage";

type ItemCardItem = {
  id: string;
  name: string;
  price?: number | string | null;
  deposit?: number | string | null;
  location?: string | null;
  city?: string | null;
  category?: string | null;
  image?: string | null;
  owner_avatar?: string | null;
  owner_profile?: {
    full_name?: string | null;
    username?: string | null;
    avatar?: string | null;
    verified?: boolean | null;
  } | null;
  rating?: {
    average: number;
    count: number;
  } | null;
  distanceKm?: number;
  slug?: string | null;
};

type ItemCardProps = {
  favorite?: boolean;
  favoriteLabel?: string;
  item: ItemCardItem;
  onFavorite?: () => void;
  tone?: "white" | "soft";
};

export default function ItemCard({
  favorite = false,
  favoriteLabel,
  item,
  onFavorite,
  tone = "white",
}: ItemCardProps) {
  const location = item.location || item.city || "Город не указан";
  const price = Number(item.price) || 0;
  const deposit = Number(item.deposit) || 0;
  const ownerName =
    item.owner_profile?.full_name || item.owner_profile?.username || "Владелец";
  const initial = ownerName.slice(0, 1).toUpperCase();
  const ownerAvatar = item.owner_profile?.avatar || item.owner_avatar || "";

  return (
    <article
      className={`group overflow-hidden rounded-[20px] border border-black/5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:rounded-[24px] ${
        tone === "soft" ? "bg-[#F7F7F5]" : "bg-white"
      }`}
    >
      <Link href={getItemUrl(item)} className="block">
        <div className="relative aspect-[1.16/1] overflow-hidden bg-[#EFEFEB] sm:aspect-[4/3]">
          <SafeImage
            src={item.image || "/hero.jpg"}
            alt={item.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            fallbackLabel="Фото товара"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />

          {onFavorite && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onFavorite();
              }}
              className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-base shadow-sm transition hover:scale-105 sm:right-3 sm:top-3 sm:h-10 sm:w-10 sm:text-lg ${
                favorite ? "bg-[#111111] text-white" : "bg-white text-[#111111]"
              }`}
              aria-label={favoriteLabel || (favorite ? "Убрать из избранного" : "Добавить в избранное")}
            >
              {favorite ? "♥" : "♡"}
            </button>
          )}

          <div className="absolute bottom-2 left-2 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-[#111111] shadow-sm sm:bottom-3 sm:left-3 sm:text-xs">
            {item.rating?.count ? (
              <span>
                ★ {item.rating.average.toFixed(1)} · {item.rating.count}
              </span>
            ) : (
              <span>Нет отзывов</span>
            )}
          </div>

          <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#7BC47F] text-xs font-black text-white sm:bottom-3 sm:right-3 sm:h-11 sm:w-11 sm:text-base">
            {ownerAvatar ? (
              <SafeImage
                src={ownerAvatar}
                alt=""
                className="h-full w-full object-cover"
                fallbackClassName="h-full w-full bg-[#7BC47F] text-white"
                fallbackLabel={initial}
              />
            ) : (
              initial
            )}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {item.category && (
              <span className="rounded-full bg-[#F1FAF2] px-2.5 py-1 text-[10px] font-black text-[#3F9E47] sm:text-xs">
                {item.category}
              </span>
            )}
            {deposit > 0 && (
              <span className="rounded-full bg-[#F7F7F5] px-2.5 py-1 text-[10px] font-black text-[#6B6B6B] sm:text-xs">
                Залог {deposit.toLocaleString("ru-RU")} ₽
              </span>
            )}
            {item.owner_profile?.verified && (
              <span className="rounded-full bg-[#E8F7EA] px-2.5 py-1 text-[10px] font-black text-[#3F9E47] sm:text-xs">
                Владелец проверен
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 min-h-[36px] text-sm font-black leading-tight sm:min-h-0 sm:text-lg">
            {item.name}
          </h3>
          <p className="mt-1 line-clamp-2 min-h-[32px] text-xs leading-snug text-[#6B6B6B] sm:text-sm">
            {location}
          </p>
          {typeof item.distanceKm === "number" && (
            <p className="mt-1 text-xs font-black text-[#3F9E47]">
              {formatDistance(item.distanceKm)} от вас
            </p>
          )}

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <div className="text-lg font-black sm:text-2xl">
                {price.toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-[10px] font-bold uppercase text-[#8D8D8D]">
                в день
              </div>
            </div>

            <span className="hidden rounded-full bg-[#111111] px-4 py-2 text-xs font-black text-white sm:inline-flex">
              Открыть
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.max(100, Math.round((distanceKm * 1000) / 50) * 50)} м`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1).replace(".", ",")} км`;
  }

  return `${Math.round(distanceKm)} км`;
}

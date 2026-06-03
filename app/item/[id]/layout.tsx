import type { Metadata } from "next";
import { getItemIdFromParam, getItemUrl } from "@/lib/item-url";
import { supabase } from "@/lib/supabase";

type ItemLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
};

type ItemMeta = {
  id: string;
  name: string | null;
  description: string | null;
  price: number | string | null;
  deposit: number | string | null;
  location: string | null;
  category: string | null;
  image: string | null;
  moderation_status: string | null;
  status: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = getItemIdFromParam(rawId);

  const { data: item } = await supabase
    .from("items")
    .select("id, name, description, price, deposit, location, category, image, moderation_status, status")
    .eq("id", id)
    .maybeSingle();

  if (!item) {
    return {
      title: "Объявление не найдено",
      description: "Это объявление недоступно или было удалено.",
    };
  }

  const typedItem = item as ItemMeta;
  const title = buildItemTitle(typedItem);
  const description = buildItemDescription(typedItem);
  const canonical = getItemUrl(typedItem);
  const images = typedItem.image
    ? [
        {
          url: typedItem.image,
          alt: typedItem.name || "Объявление SosedBeri",
        },
      ]
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "SosedBeri",
      locale: "ru_RU",
      images,
    },
    twitter: {
      card: typedItem.image ? "summary_large_image" : "summary",
      title,
      description,
      images: typedItem.image ? [typedItem.image] : undefined,
    },
    robots:
      typedItem.status === "active" && typedItem.moderation_status !== "rejected"
        ? undefined
        : {
            index: false,
            follow: false,
          },
  };
}

export default function ItemLayout({ children }: ItemLayoutProps) {
  return children;
}

function buildItemTitle(item: ItemMeta) {
  const name = item.name || "Вещь";
  const location = item.location ? ` в ${item.location}` : "";

  return `${name} в аренду${location}`;
}

function buildItemDescription(item: ItemMeta) {
  const parts = [
    item.name ? `${item.name} можно взять в аренду` : "Вещь можно взять в аренду",
    item.location ? `в городе ${item.location}` : "",
    item.price ? `за ${Number(item.price).toLocaleString("ru-RU")} ₽ в день` : "",
    item.deposit ? `залог ${Number(item.deposit).toLocaleString("ru-RU")} ₽` : "",
  ].filter(Boolean);

  const details = parts.join(", ");
  const text = item.description?.trim();

  return text ? `${details}. ${text}`.slice(0, 220) : `${details}. SosedBeri.`;
}

import { NextResponse } from "next/server";

const yandexKey =
  process.env.YANDEX_MAPS_API_KEY || process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();

  if (!address) {
    return NextResponse.json({ latitude: null, longitude: null });
  }

  if (!yandexKey) {
    return NextResponse.json(
      { error: "Missing Yandex Maps API key", latitude: null, longitude: null },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://geocode-maps.yandex.ru/1.x/");
    url.searchParams.set("apikey", yandexKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("lang", "ru_RU");
    url.searchParams.set("geocode", address);

    const response = await fetchWithTimeout(url.toString());

    if (!response.ok) {
      return NextResponse.json({ latitude: null, longitude: null });
    }

    const data = await response.json();
    const feature = data.response?.GeoObjectCollection?.featureMember?.[0];
    const pos = feature?.GeoObject?.Point?.pos;

    if (!pos) {
      return NextResponse.json({ latitude: null, longitude: null });
    }

    const [longitude, latitude] = pos.split(" ").map(Number);

    return NextResponse.json({ latitude, longitude });
  } catch {
    return NextResponse.json({ latitude: null, longitude: null });
  }
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

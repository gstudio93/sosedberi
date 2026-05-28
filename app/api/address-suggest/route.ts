import { NextResponse } from "next/server";

type AddressSuggestion = {
  title: string;
  subtitle: string;
  address: string;
};

const yandexKey =
  process.env.YANDEX_MAPS_API_KEY || process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text")?.trim();

  if (!text || text.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  if (!yandexKey) {
    return NextResponse.json(
      { error: "Missing Yandex Maps API key", suggestions: [] },
      { status: 500 }
    );
  }

  const suggestions =
    (await fetchGeoSuggest(text)) || (await fetchGeocoderSuggest(text));

  return NextResponse.json({ suggestions: suggestions || [] });
}

async function fetchGeoSuggest(text: string): Promise<AddressSuggestion[] | null> {
  try {
    const url = new URL("https://suggest-maps.yandex.ru/v1/suggest");
    url.searchParams.set("apikey", yandexKey!);
    url.searchParams.set("text", text);
    url.searchParams.set("lang", "ru_RU");
    url.searchParams.set("types", "geo");
    url.searchParams.set("results", "6");
    url.searchParams.set("print_address", "1");

    const response = await fetch(url, { next: { revalidate: 60 } });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return (data.results || [])
      .map((item: any) => {
        const title = item.title?.text || item.title || "";
        const subtitle = item.subtitle?.text || item.subtitle || "";
        const address =
          item.address?.formatted_address || item.address?.component?.join(", ") || title;

        return {
          title,
          subtitle,
          address: address || [title, subtitle].filter(Boolean).join(", "),
        };
      })
      .filter((item: AddressSuggestion) => item.address);
  } catch {
    return null;
  }
}

async function fetchGeocoderSuggest(text: string): Promise<AddressSuggestion[] | null> {
  try {
    const url = new URL("https://geocode-maps.yandex.ru/1.x/");
    url.searchParams.set("apikey", yandexKey!);
    url.searchParams.set("format", "json");
    url.searchParams.set("results", "6");
    url.searchParams.set("lang", "ru_RU");
    url.searchParams.set("geocode", text);

    const response = await fetch(url, { next: { revalidate: 60 } });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const results = data.response?.GeoObjectCollection?.featureMember || [];

    return results
      .map((item: any) => {
        const meta = item.GeoObject?.metaDataProperty?.GeocoderMetaData;
        const address = meta?.text || item.GeoObject?.name || "";

        return {
          title: item.GeoObject?.name || address,
          subtitle: item.GeoObject?.description || "",
          address,
        };
      })
      .filter((item: AddressSuggestion) => item.address);
  } catch {
    return null;
  }
}

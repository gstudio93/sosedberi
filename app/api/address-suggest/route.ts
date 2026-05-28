import { NextResponse } from "next/server";

type AddressSuggestion = {
  title: string;
  subtitle: string;
  address: string;
};

type ProviderResult = {
  ok: boolean;
  provider: "suggest" | "geocoder";
  status?: number;
  error?: string;
  suggestions: AddressSuggestion[];
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
      {
        error: "missing_yandex_key",
        message: "В Vercel не задан Yandex Maps API key",
        suggestions: [],
      },
      { status: 200 }
    );
  }

  const suggestResults = await fetchGeoSuggest(text);
  const geocoderResults =
    suggestResults.suggestions.length > 0
      ? null
      : await fetchGeocoderSuggest(text);

  const suggestions =
    suggestResults.suggestions.length > 0
      ? suggestResults.suggestions
      : geocoderResults?.suggestions || [];

  return NextResponse.json({
    suggestions,
    debug:
      suggestions.length > 0
        ? undefined
        : {
            suggest: suggestResults,
            geocoder: geocoderResults,
          },
  });
}

async function fetchGeoSuggest(text: string): Promise<ProviderResult> {
  try {
    const url = new URL("https://suggest-maps.yandex.ru/v1/suggest");
    url.searchParams.set("apikey", yandexKey!);
    url.searchParams.set("text", text);
    url.searchParams.set("lang", "ru_RU");
    url.searchParams.set("types", "geo");
    url.searchParams.set("results", "6");
    url.searchParams.set("print_address", "1");

    const response = await fetchWithTimeout(url.toString());

    if (!response.ok) {
      return {
        ok: false,
        provider: "suggest",
        status: response.status,
        error: await safeResponseText(response),
        suggestions: [],
      };
    }

    const data = await response.json();

    const suggestions = (data.results || [])
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

    return {
      ok: true,
      provider: "suggest",
      suggestions,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "suggest",
      error: error instanceof Error ? error.message : "unknown_error",
      suggestions: [],
    };
  }
}

async function fetchGeocoderSuggest(text: string): Promise<ProviderResult> {
  try {
    const url = new URL("https://geocode-maps.yandex.ru/1.x/");
    url.searchParams.set("apikey", yandexKey!);
    url.searchParams.set("format", "json");
    url.searchParams.set("results", "6");
    url.searchParams.set("lang", "ru_RU");
    url.searchParams.set("geocode", text);

    const response = await fetchWithTimeout(url.toString());

    if (!response.ok) {
      return {
        ok: false,
        provider: "geocoder",
        status: response.status,
        error: await safeResponseText(response),
        suggestions: [],
      };
    }

    const data = await response.json();
    const results = data.response?.GeoObjectCollection?.featureMember || [];

    const suggestions = results
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

    return {
      ok: true,
      provider: "geocoder",
      suggestions,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "geocoder",
      error: error instanceof Error ? error.message : "unknown_error",
      suggestions: [],
    };
  }
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    return await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60 },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function safeResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "response_text_unavailable";
  }
}

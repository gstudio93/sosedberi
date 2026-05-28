"use client";

import { Map, Placemark, YMaps } from "@pbe/react-yandex-maps";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MapItem = {
  id: string;
  name: string | null;
  price: number | string | null;
  image: string | null;
  location: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
};

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];
const FALLBACK_IMAGE = "/hero.jpg";

function toNumber(value: number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value: number | string | null) {
  if (value === null || value === undefined || value === "") return "Цена не указана";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return `${value} ₽ / день`;
  return `${parsed.toLocaleString("ru-RU")} ₽ / день`;
}

export default function MapPage() {
  const router = useRouter();
  const [items, setItems] = useState<MapItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);
  const [markerLayout, setMarkerLayout] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setIsLoading(true);

    const { data } = await supabase
      .from("items")
      .select("id, name, price, image, location, latitude, longitude")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("created_at", { ascending: false });

    setItems(data || []);
    setSelectedItem((data && data[0]) || null);
    setIsLoading(false);
  }

  const mapItems = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          latitudeNumber: toNumber(item.latitude),
          longitudeNumber: toNumber(item.longitude),
        }))
        .filter((item) => item.latitudeNumber !== null && item.longitudeNumber !== null),
    [items],
  );

  const center = useMemo<[number, number]>(() => {
    if (!mapItems.length) return MOSCOW_CENTER;
    return [mapItems[0].latitudeNumber!, mapItems[0].longitudeNumber!];
  }, [mapItems]);

  return (
    <main className="min-h-screen bg-[#f4f5f2] px-4 pb-24 pt-6 md:px-8 md:pb-10">
      <section className="mx-auto max-w-[1520px]">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[36px] font-black leading-none tracking-normal text-[#101010] md:text-[52px]">
              Объявления рядом
            </h1>
            <p className="mt-3 text-[16px] text-[#5f635f] md:text-[20px]">
              Выбирайте вещи по карте: нажмите на фото, чтобы посмотреть кратко, и откройте карточку товара.
            </p>
          </div>

          <div className="rounded-full bg-white px-5 py-3 text-[14px] font-bold text-[#5f635f] shadow-sm ring-1 ring-black/5">
            {isLoading ? "Загружаем карту" : `${mapItems.length} объявлений на карте`}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_10px_35px_rgba(0,0,0,0.10)] ring-1 ring-black/5">
          <div className="h-[calc(100dvh-250px)] min-h-[560px] md:h-[720px]">
            <YMaps
              query={{
                apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY,
              }}
            >
              <Map
                defaultState={{
                  center,
                  zoom: mapItems.length ? 12 : 10,
                  controls: ["zoomControl", "geolocationControl"],
                }}
                modules={["templateLayoutFactory", "control.ZoomControl", "control.GeolocationControl"]}
                onLoad={(ymaps: any) => {
                  if (markerLayout) return;
                  setMarkerLayout(
                    ymaps.templateLayoutFactory.createClass(
                      '<button class="sosed-map-pin" type="button"><img src="$[properties.image]" alt="" /></button>',
                    ),
                  );
                }}
                width="100%"
                height="100%"
              >
                {mapItems.map((item) => (
                  <Placemark
                    key={item.id}
                    geometry={[item.latitudeNumber!, item.longitudeNumber!]}
                    properties={{
                      image: item.image || FALLBACK_IMAGE,
                    }}
                    options={
                      (markerLayout
                        ? ({
                            iconLayout: markerLayout,
                            iconShape: {
                              type: "Circle",
                              coordinates: [0, 0],
                              radius: 28,
                            },
                            iconOffset: [-28, -28],
                          } as any)
                        : {
                            preset: "islands#greenCircleDotIcon",
                          }) as any
                    }
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </Map>
            </YMaps>
          </div>

          {selectedItem && (
            <button
              type="button"
              onClick={() => router.push(`/item/${selectedItem.id}`)}
              className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-[22px] bg-white p-3 text-left shadow-[0_16px_45px_rgba(0,0,0,0.18)] ring-1 ring-black/8 transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(0,0,0,0.22)] md:bottom-6 md:left-6 md:right-auto md:w-[380px]"
            >
              <img
                src={selectedItem.image || FALLBACK_IMAGE}
                alt={selectedItem.name || "Объявление"}
                className="h-20 w-24 shrink-0 rounded-[16px] object-cover md:h-24 md:w-28"
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[20px] font-black leading-tight text-[#101010]">
                  {selectedItem.name || "Без названия"}
                </span>
                <span className="mt-1 block truncate text-[14px] text-[#6a6d69]">
                  {selectedItem.location || "Адрес не указан"}
                </span>
                <span className="mt-2 block text-[18px] font-black text-[#101010]">
                  {formatPrice(selectedItem.price)}
                </span>
              </span>
            </button>
          )}

          {!isLoading && !mapItems.length && (
            <div className="absolute inset-x-4 top-6 rounded-[24px] bg-white p-5 text-center shadow-lg ring-1 ring-black/5 md:left-1/2 md:right-auto md:w-[420px] md:-translate-x-1/2">
              <h2 className="text-[24px] font-black text-[#101010]">Пока нет объявлений с адресом</h2>
              <p className="mt-2 text-[#6a6d69]">
                Когда у объявления появятся координаты, оно сразу отобразится на карте.
              </p>
            </div>
          )}
        </div>
      </section>

      <style jsx global>{`
        .sosed-map-pin {
          width: 56px;
          height: 56px;
          padding: 0;
          border: 4px solid #ffffff;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
          cursor: pointer;
          overflow: hidden;
          transform: translateZ(0);
        }

        .sosed-map-pin img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
      `}</style>
    </main>
  );
}

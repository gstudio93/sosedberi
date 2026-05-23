"use client";

import {
  YMaps,
  Map,
  Placemark,
} from "@pbe/react-yandex-maps";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MapPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const { data } = await supabase
      .from("items")
      .select("*")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    setItems(data || []);
  }

  return (
    <main className="h-screen w-full">

      <YMaps
  query={{
    apikey:
      process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY,
  }}
>

        <Map
          defaultState={{
            center: [55.751244, 37.618423],
            zoom: 10,
          }}
          width="100%"
          height="100%"
        >

          {items.map((item) => (
            <Placemark
              key={item.id}
              geometry={[
                item.latitude,
                item.longitude,
              ]}
              properties={{
                balloonContent: `
                  <div style="width:220px">

                    <img
                      src="${item.image}"
                      style="
                        width:100%;
                        height:140px;
                        object-fit:cover;
                        border-radius:14px;
                        margin-bottom:12px;
                      "
                    />

                    <div
                      style="
                        font-size:18px;
                        font-weight:700;
                      "
                    >
                      ${item.name}
                    </div>

                    <div
                      style="
                        margin-top:6px;
                        color:#555;
                      "
                    >
                      ${item.price}
                    </div>

                    <a
                      href="/item/${item.id}"
                      style="
                        display:inline-block;
                        margin-top:14px;
                        font-weight:700;
                        color:black;
                      "
                    >
                      Открыть →
                    </a>

                  </div>
                `,
              }}
            />
          ))}

        </Map>

      </YMaps>

    </main>
  );
}
import { supabase } from "../../../lib/supabase";

export default async function ItemPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (!item) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        Объявление не найдено
      </main>
    );
  }

  return (
  <main className="min-h-screen bg-black px-6 py-16 text-white">
    <div className="mx-auto max-w-3xl">

      <img
        src={item.image}
        className="h-96 w-full rounded-3xl object-cover"
      />

      <h1 className="mt-6 text-4xl font-black">
        {item.name}
      </h1>

      <p className="mt-2 text-neutral-400">
        📍 {item.location}
      </p>

      <p className="mt-6 text-xl font-bold">
        {item.price}
      </p>

      <div className="mt-6 rounded-2xl bg-white/5 p-6">
        <p className="text-neutral-300">
          {item.description}
        </p>
      </div>

      <a
  href={`/chat/${item.id}?owner=${item.owner_id}`}
  className="mt-8 block w-full rounded-2xl bg-white py-4 text-center font-bold text-black"
>
  Написать владельцу
</a>

    </div>
  </main>
);
}
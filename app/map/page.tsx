import Link from "next/link";

export default function MapPage() {
  return (
    <main className="min-h-screen bg-[#f4f5f2] px-4 pb-24 pt-28 md:px-8 md:pb-16 md:pt-32">
      <section className="mx-auto flex max-w-3xl flex-col items-center rounded-[32px] bg-white px-6 py-14 text-center shadow-[0_14px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/5 md:px-12 md:py-18">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7BC47F]/15 text-3xl">
          ◦
        </div>

        <h1 className="mt-6 text-[34px] font-black leading-none text-[#101010] md:text-[52px]">
          Карта появится позже
        </h1>

        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#666B66] md:text-[19px]">
          Сейчас лучше искать вещи через каталог. Мы вернем карту, когда сделаем ее стабильной:
          с объявлениями рядом, радиусом поиска и удобными карточками на маркерах.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/"
            className="rounded-full bg-[#7BC47F] px-7 py-4 text-center text-sm font-black text-white shadow-[0_12px_28px_rgba(123,196,127,0.28)] transition hover:bg-[#69B56E]"
          >
            Открыть каталог
          </Link>
          <Link
            href="/add"
            className="rounded-full border border-black/10 bg-white px-7 py-4 text-center text-sm font-black text-[#111111] transition hover:bg-[#F7F7F5]"
          >
            Сдать вещь
          </Link>
        </div>
      </section>
    </main>
  );
}

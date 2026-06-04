import Link from "next/link";

const safetyItems = [
  ["Профили и отзывы", "Публичный профиль показывает рейтинг, отзывы, активность и подтвержденные признаки доверия."],
  ["Залог", "Залог нужен, чтобы защитить владельца от повреждений. Решение по спорному залогу принимает администратор."],
  ["Фотоакты", "Передача и возврат фиксируются фотографиями. Это помогает сравнить состояние вещи."],
  ["Чат по сделке", "Обсуждение брони лучше вести в чате, привязанном к объявлению или конкретной заявке."],
  ["Модерация", "Новые и отредактированные объявления попадают в очередь администратора."],
  ["Споры", "Если стороны не согласны по состоянию вещи, спор можно открыть в личном кабинете."],
];

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F5] px-4 pb-24 pt-28 text-[#111111] sm:px-6 lg:pt-32">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-[#E8F7EA] px-4 py-2 text-sm font-black text-[#3F9E47]">
                Безопасность сделки
              </div>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                Аренда должна быть понятной для обеих сторон
              </h1>
              <p className="mt-5 text-lg leading-8 text-[#5F5F5F]">
                SosedBeri строит сделку вокруг прозрачных статусов, залога, фотоактов,
                отзывов и возможности открыть спор.
              </p>
            </div>

            <div className="rounded-[24px] bg-[#F7F7F5] p-5">
              <div className="text-sm font-bold uppercase text-[#8D8D8D]">В MVP уже есть</div>
              <div className="mt-3 text-3xl font-black">акты, споры, отзывы</div>
              <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
                Дальше это можно связать с реальной оплатой и проверкой телефона.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {safetyItems.map(([title, text]) => (
            <div key={title} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F7EA] text-xl font-black text-[#3F9E47]">
                ✓
              </div>
              <h2 className="mt-4 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[28px] border border-black/5 bg-white p-6 shadow-sm lg:p-8">
          <h2 className="text-2xl font-black">Если что-то пошло не так</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6B6B6B]">
            Откройте спор из карточки бронирования, опишите проблему и приложите фото.
            Администратор увидит арендатора, владельца, сумму залога, акты и примет решение:
            вернуть залог полностью, частично или удержать.
          </p>
          <Link href="/offer" className="mt-5 inline-flex rounded-full bg-[#111111] px-6 py-4 text-sm font-black text-white">
            Читать правила сервиса
          </Link>
        </section>
      </div>
    </main>
  );
}

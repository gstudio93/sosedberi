import Link from "next/link";

const renterSteps = [
  ["1", "Выберите вещь", "Найдите объявление, проверьте фото, описание, залог и свободные даты."],
  ["2", "Отправьте заявку", "Владелец увидит даты аренды и подтвердит или отклонит запрос."],
  ["3", "Оплатите бронь", "После подтверждения появится тестовая оплата: аренда, залог и комиссия сервиса."],
  ["4", "Подтвердите передачу", "Проверьте вещь, фотоакты и подтвердите получение в личном кабинете."],
  ["5", "Верните вещь", "При возврате приложите фото состояния, затем оставьте отзыв о вещи."],
];

const ownerSteps = [
  ["1", "Разместите объявление", "Добавьте фото, цену, залог, адрес передачи, комплект и условия аренды."],
  ["2", "Подтвердите бронь", "Проверьте даты и договоритесь с арендатором в чате."],
  ["3", "Оформите акт передачи", "После оплаты приложите до трех фото состояния вещи и передайте ее арендатору."],
  ["4", "Примите возврат", "Сравните состояние вещи, подтвердите возврат или откройте спор."],
  ["5", "Получите выплату", "После завершения сделки аренда попадает в финансовую историю и кошелек."],
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F5] px-4 pb-24 pt-28 text-[#111111] sm:px-6 lg:pt-32">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm lg:p-10">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full bg-[#E8F7EA] px-4 py-2 text-sm font-black text-[#3F9E47]">
              Аренда между соседями
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Как работает SosedBeri
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#5F5F5F]">
              Сервис помогает договориться об аренде вещи, зафиксировать передачу и возврат,
              а при споре передать решение администратору.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <StepPanel title="Если вы арендуете" steps={renterSteps} />
          <StepPanel title="Если вы сдаете вещь" steps={ownerSteps} />
        </section>

        <section className="mt-6 rounded-[28px] border border-[#BDEBC1] bg-[#F5FFF6] p-6 shadow-sm lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <h2 className="text-2xl font-black">Главное правило</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5F6F61]">
                Все важные действия лучше делать внутри сервиса: бронь, чат, оплату, акт передачи,
                акт возврата и спор. Так у обеих сторон остается понятная история сделки.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/catalog" className="rounded-full bg-[#7BC47F] px-6 py-4 text-center font-black text-white">
                Смотреть каталог
              </Link>
              <Link href="/add" className="rounded-full border border-black/10 bg-white px-6 py-4 text-center font-black">
                Сдать вещь
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StepPanel({ title, steps }: { title: string; steps: string[][] }) {
  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm lg:p-7">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-5 space-y-4">
        {steps.map(([number, name, text]) => (
          <div key={number} className="flex gap-4 rounded-[22px] bg-[#F7F7F5] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-[#3F9E47]">
              {number}
            </div>
            <div>
              <h3 className="font-black">{name}</h3>
              <p className="mt-1 text-sm leading-6 text-[#6B6B6B]">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

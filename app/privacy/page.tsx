const sections = [
  ["Какие данные используются", "Email, имя профиля, аватар, телефон, город/адрес передачи, объявления, бронирования, сообщения, отзывы и уведомления."],
  ["Зачем нужны данные", "Чтобы авторизовать пользователя, показывать объявления, связывать арендатора и владельца, проводить брони, акты, споры и отзывы."],
  ["Публичные данные", "Публичный профиль может показывать имя, аватар, город, рейтинг, отзывы и активные объявления пользователя."],
  ["Хранение файлов", "Фотографии объявлений, аватаров и актов могут храниться в Supabase Storage и использоваться для отображения в сервисе."],
  ["Удаление и исправление", "Пользователь может обновить профиль и объявления в личном кабинете. Для удаления спорных данных может потребоваться обращение к администратору."],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F5] px-4 pb-24 pt-28 text-[#111111] sm:px-6 lg:pt-32">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm lg:p-10">
          <div className="mb-4 inline-flex rounded-full bg-[#E8F7EA] px-4 py-2 text-sm font-black text-[#3F9E47]">
            Данные пользователей
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Политика конфиденциальности
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#6B6B6B]">
            MVP-версия политики. Перед публичным запуском и подключением реальных платежей
            ее нужно привести к юридически точной редакции.
          </p>
        </section>

        <section className="mt-6 grid gap-4">
          {sections.map(([title, text]) => (
            <article key={title} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-[#5F5F5F]">{text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

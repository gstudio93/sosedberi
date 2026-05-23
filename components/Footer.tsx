import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white text-[#111111]">

      <div className="mx-auto max-w-7xl px-6 py-20">

        <div className="grid gap-14 md:grid-cols-2 lg:grid-cols-4">

          {/* BRAND */}
          <div>

            <h2 className="text-3xl font-black">
              SosedBeri
            </h2>

            <p className="mt-5 max-w-sm text-sm leading-7 text-[#6B6B6B]">
              Арендуйте вещи у людей рядом:
              инструменты, камеры, технику,
              спортинвентарь и многое другое.
            </p>

          </div>

          {/* USERS */}
          <div>

            <h3 className="text-lg font-bold">
              Пользователям
            </h3>

            <div className="mt-6 flex flex-col gap-4 text-sm text-[#6B6B6B]">

              <Link href="/">
                Каталог
              </Link>

              <Link href="/favorites">
                Избранное
              </Link>

              <Link href="/profile">
                Профиль
              </Link>

              <Link href="/notifications">
                Уведомления
              </Link>

            </div>

          </div>

          {/* RENT */}
          <div>

            <h3 className="text-lg font-bold">
              Аренда
            </h3>

            <div className="mt-6 flex flex-col gap-4 text-sm text-[#6B6B6B]">

              <Link href="/add">
                Сдать вещь
              </Link>

              <Link href="/">
                Как это работает
              </Link>

              <Link href="/">
                Безопасность
              </Link>

              <Link href="/">
                Поддержка
              </Link>

            </div>

          </div>

          {/* CONTACTS */}
          <div>

            <h3 className="text-lg font-bold">
              Контакты
            </h3>

            <div className="mt-6 flex flex-col gap-4 text-sm text-[#6B6B6B]">

              <a href="mailto:hello@sosedberi.ru">
                hello@sosedberi.ru
              </a>

              <a href="#">
                Telegram
              </a>

              <a href="#">
                VK
              </a>

              <a href="#">
                Instagram
              </a>

            </div>

          </div>

        </div>

        {/* BOTTOM */}
        <div className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-black/10 pt-8 text-sm text-[#8D8D8D] md:flex-row">

          <div>
            © 2025 SosedBeri
          </div>

          <div className="flex gap-6">

            <Link href="/">
              Политика
            </Link>

            <Link href="/">
              Оферта
            </Link>

            <Link href="/">
              Конфиденциальность
            </Link>

          </div>

        </div>

      </div>

    </footer>
  );
}
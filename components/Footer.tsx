"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const footerGroups = [
  {
    title: "Пользователям",
    links: [
      { href: "/", label: "Каталог" },
      { href: "/favorites", label: "Избранное" },
      { href: "/profile", label: "Личный кабинет" },
      { href: "/notifications", label: "Уведомления" },
    ],
  },
  {
    title: "Аренда",
    links: [
      { href: "/add", label: "Сдать вещь" },
      { href: "/profile", label: "Мои объявления" },
      { href: "/messages", label: "Сообщения" },
      { href: "/map", label: "Карта" },
    ],
  },
  {
    title: "Контакты",
    links: [
      { href: "mailto:hello@sosedberi.ru", label: "hello@sosedberi.ru", external: true },
      { href: "https://t.me/", label: "Telegram", external: true },
      { href: "https://vk.com/", label: "VK", external: true },
    ],
  },
] satisfies Array<{
  title: string;
  links: Array<{
    href: string;
    label: string;
    external?: boolean;
  }>;
}>;

export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  if (pathname.startsWith("/chat")) {
    return null;
  }

  return (
    <footer className="border-t border-black/10 bg-white text-[#111111]">
      <div className="mx-auto max-w-7xl px-6 pb-28 pt-14 lg:pb-10 lg:pt-16">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr] lg:gap-16">
          <div>
            <Link href="/" className="text-3xl font-black leading-none">
              SosedBeri
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-7 text-[#6B6B6B]">
              Арендуйте вещи у людей рядом: инструменты, камеры, технику,
              спортинвентарь и многое другое.
            </p>

            <Link
              href="/add"
              className="mt-6 inline-flex rounded-full bg-[#7BC47F] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#69B56E]"
            >
              Сдать вещь
            </Link>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-extrabold uppercase text-[#111111]">
                  {group.title}
                </h3>

                <div className="mt-4 flex flex-col gap-3 text-sm text-[#6B6B6B]">
                  {group.links.map((link) =>
                    "external" in link && link.external ? (
                      <a
                        key={link.label}
                        href={link.href}
                        className="transition hover:text-[#111111]"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="transition hover:text-[#111111]"
                      >
                        {link.label}
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-5 border-t border-black/10 pt-6 text-sm text-[#8D8D8D] md:flex-row md:items-center">
          <div>© {currentYear} SosedBeri</div>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link href="/" className="transition hover:text-[#111111]">
              Политика
            </Link>
            <Link href="/" className="transition hover:text-[#111111]">
              Оферта
            </Link>
            <Link href="/" className="transition hover:text-[#111111]">
              Конфиденциальность
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

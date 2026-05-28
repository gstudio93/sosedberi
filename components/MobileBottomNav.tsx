"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavIcon = "catalog" | "heart" | "plus" | "chat" | "profile";

const links: {
  href: string;
  label: string;
  icon: NavIcon;
}[] = [
  {
    href: "/",
    label: "Каталог",
    icon: "catalog",
  },
  {
    href: "/favorites",
    label: "Избранное",
    icon: "heart",
  },
  {
    href: "/add",
    label: "Сдать",
    icon: "plus",
  },
  {
    href: "/messages",
    label: "Чаты",
    icon: "chat",
  },
  {
    href: "/profile",
    label: "Кабинет",
    icon: "profile",
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[120] border-t border-black/10 bg-white/95 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-2xl backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/" || pathname.startsWith("/item")
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-h-[58px] flex-col items-center justify-center rounded-2xl px-1.5 py-2 text-[11px] font-extrabold leading-none transition ${
                active
                  ? "bg-[#7BC47F]/15 text-[#2F9A44]"
                  : "text-[#6B6B6B]"
              }`}
            >
              <MobileIcon name={link.icon} active={active} />
              <span className="mt-1.5 truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileIcon({ name, active }: { name: NavIcon; active: boolean }) {
  const stroke = active ? "#2F9A44" : "#6B6B6B";

  return (
    <span className="flex h-6 w-6 items-center justify-center">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {name === "catalog" && (
          <>
            <path d="M4 7.5 12 3l8 4.5" />
            <path d="M5.5 9v9.5h13V9" />
            <path d="M9.5 18.5V13h5v5.5" />
          </>
        )}

        {name === "heart" && (
          <path d="M20.5 8.8c0 5.1-8.5 10-8.5 10s-8.5-4.9-8.5-10A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8.5 2.8Z" />
        )}

        {name === "plus" && (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 8.5v7" />
            <path d="M8.5 12h7" />
          </>
        )}

        {name === "chat" && (
          <>
            <path d="M5 6.5h14v9H9l-4 3v-12Z" />
            <path d="M8.5 10h7" />
            <path d="M8.5 13h4" />
          </>
        )}

        {name === "profile" && (
          <>
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5.5 20c.8-3.4 3.2-5.2 6.5-5.2s5.7 1.8 6.5 5.2" />
          </>
        )}
      </svg>
    </span>
  );
}

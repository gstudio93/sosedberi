"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const links = [
    {
      href: "/",
      label: "Главная",
      icon: "🏠",
    },
    {
      href: "/messages",
      label: "Сообщения",
      icon: "💬",
    },
    {
      href: "/add",
      label: "Сдать",
      icon: "➕",
    },
    {
      href: "/profile",
      label: "Профиль",
      icon: "👤",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[120] border-t border-black/10 bg-white px-3 py-2 shadow-2xl lg:hidden">
      <div className="grid grid-cols-4 gap-1">
        {links.map((link) => {
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-bold transition ${
                active
                  ? "bg-[#7BC47F]/15 text-[#3F9E47]"
                  : "text-[#6B6B6B]"
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span className="mt-1">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
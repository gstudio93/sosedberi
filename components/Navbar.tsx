"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    setUser(user);
  }

  async function logout() {
    await supabase.auth.signOut();

    window.location.href = "/";
  }

  return (
    <header className="border-b border-white/10 bg-black text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <a
          href="/"
          className="text-2xl font-black"
        >
          SosedBeri
        </a>

        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-sm text-neutral-300 hover:text-white"
          >
            Каталог
          </a>

          {user && (
            <>
              <a
                href="/add"
                className="text-sm text-neutral-300 hover:text-white"
              >
                Добавить
              </a>

              <a
                href="/my-items"
                className="text-sm text-neutral-300 hover:text-white"
              >
                Мои объявления
              </a>
              <a
  href="/chats"
  className="text-sm text-neutral-300 hover:text-white"
>
  Чаты
</a>

              <button
                onClick={logout}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
              >
                Выйти
              </button>
            </>
          )}

          {!user && (
            <a
              href="/login"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Войти
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
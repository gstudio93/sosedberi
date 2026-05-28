"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsRegister(params.get("mode") === "register");
  }, []);

  async function signUp() {
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Проверьте email для подтверждения аккаунта");
    router.push("/");
  }

  async function signIn() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F5] px-6 py-28 text-[#111111]">
      <div className="w-full max-w-md rounded-[36px] bg-white p-8 shadow-sm">
        <div className="mb-8 flex rounded-full bg-[#F7F7F5] p-1">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 rounded-full py-3 text-sm font-bold transition ${
              !isRegister ? "bg-white shadow-sm" : "text-[#6B6B6B]"
            }`}
          >
            Вход
          </button>

          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 rounded-full py-3 text-sm font-bold transition ${
              isRegister ? "bg-white shadow-sm" : "text-[#6B6B6B]"
            }`}
          >
            Регистрация
          </button>
        </div>

        <h1 className="text-4xl font-black">
          {isRegister ? "Создать аккаунт" : "Вход"}
        </h1>

        <p className="mt-3 text-[#6B6B6B]">
          {isRegister
            ? "Создайте аккаунт для аренды вещей рядом"
            : "Войдите в аккаунт"}
        </p>

        <div
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#EEF4FF] px-5 py-4 text-sm font-black text-[#0077FF]"
          title="VK ID подключим после отдельной серверной привязки профиля"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-[#0077FF]">
            VK
          </span>
          VK ID подключим позже
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10" />
          <span className="text-xs font-bold uppercase text-[#8D8D8D]">
            или email
          </span>
          <div className="h-px flex-1 bg-black/10" />
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-black/10 bg-[#F7F7F5] p-4 outline-none transition focus:border-[#7BC47F]"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <input
            type="password"
            placeholder="Пароль"
            className="w-full rounded-2xl border border-black/10 bg-[#F7F7F5] p-4 outline-none transition focus:border-[#7BC47F]"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button
            onClick={isRegister ? signUp : signIn}
            disabled={loading}
            className="w-full rounded-full bg-[#7BC47F] py-4 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading
              ? "Загрузка..."
              : isRegister
                ? "Создать аккаунт"
                : "Войти"}
          </button>

          {!isRegister && (
            <button className="w-full text-sm text-[#6B6B6B]">
              Забыли пароль?
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

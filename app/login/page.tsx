"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] =
  useState(false);

const [loading, setLoading] =
  useState(false);
  const router = useRouter();
  async function signUp() {
  setLoading(true);

  const { error } =
    await supabase.auth.signUp({
      email,
      password
    });

  setLoading(false);

  if (error) {
    alert(error.message);
    return;
  }

  alert(
    "Проверьте email для подтверждения аккаунта"
  );

  router.push("/");
}

  async function signIn() {
  setLoading(true);

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  setLoading(false);

  if (error) {
    alert(error.message);
    return;
  }

  router.push("/");
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F5] px-6 text-[#111111]">

  <div className="w-full max-w-md rounded-[36px] bg-white p-8 shadow-sm">

    <div className="mb-8 flex rounded-full bg-[#F7F7F5] p-1">

      <button
        onClick={() =>
          setIsRegister(false)
        }
        className={`flex-1 rounded-full py-3 text-sm font-bold transition ${
          !isRegister
            ? "bg-white shadow-sm"
            : "text-[#6B6B6B]"
        }`}
      >
        Вход
      </button>

      <button
        onClick={() =>
          setIsRegister(true)
        }
        className={`flex-1 rounded-full py-3 text-sm font-bold transition ${
          isRegister
            ? "bg-white shadow-sm"
            : "text-[#6B6B6B]"
        }`}
      >
        Регистрация
      </button>

    </div>

    <h1 className="text-4xl font-black">
      {isRegister
        ? "Создать аккаунт"
        : "Вход"}
    </h1>

    <p className="mt-3 text-[#6B6B6B]">
      {isRegister
        ? "Создайте аккаунт для аренды вещей рядом"
        : "Войдите в аккаунт"}
    </p>

    <div className="mt-8 space-y-4">

      <input
        type="email"
        placeholder="Email"
        className="w-full rounded-2xl border border-black/10 bg-[#F7F7F5] p-4 outline-none"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
      />

      <input
        type="password"
        placeholder="Пароль"
        className="w-full rounded-2xl border border-black/10 bg-[#F7F7F5] p-4 outline-none"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      <button
        onClick={
          isRegister
            ? signUp
            : signIn
        }
        disabled={loading}
        className="w-full rounded-full bg-[#7BC47F] py-4 font-bold text-white transition hover:opacity-90"
      >
        {loading
          ? "Загрузка..."
          : isRegister
          ? "Создать аккаунт"
          : "Войти"}
      </button>

      {!isRegister && (
        <button
          className="w-full text-sm text-[#6B6B6B]"
        >
          Забыли пароль?
        </button>
      )}

    </div>

  </div>

</main>
  );
}
"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const callbackUrl = params.get("callbackUrl") || "/";

  if (status === "authenticated") {
    router.replace(callbackUrl);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      callbackUrl,
      redirect: false,
    });
    if (result?.error) {
      setError("Credenciales incorrectas");
      setLoading(false);
    } else if (result?.ok) {
      router.replace(callbackUrl);
    } else {
      setLoading(false);
    }
  };

  const err = params.get("error");
  const msg =
    error ||
    (err === "CredentialsSignin" && "Credenciales incorrectas") ||
    (err && "Error al iniciar sesión") ||
    "";

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-5 py-8"
      style={{ background: "#f4f4f0", fontFamily: "'Times New Roman', Times, serif" }}
    >
      {/* Línea estructural superior — Swiss grid */}
      <div className="fixed top-0 left-8 right-8 h-px bg-[#c8c8c0]" />

      <div className="w-full max-w-[380px]">
        {/* ── Encabezado ──────────────────────────────────── */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-9">
            <div
              className="w-21 h-21 flex items-center justify-center border border-[#c8c8c0]"
              style={{ background: "#fff" }}
            >
              <span
                className="text-[30px] font-black"
                style={{ color: "#00a85a", fontFamily: "'Times New Roman', Times, serif" }}
              >
                ◆
              </span>
            </div>
            <div className="h-21 w-px" style={{ background: "#c8c8c0" }} />
            <div className="text-[10px] tracking-[0.14em] uppercase leading-relaxed font-bold" style={{ color: "#8b8b82", fontFamily: "'Times New Roman', Times, serif" }}>
              Bell<br />13450<br />.50
            </div>
          </div>

          <h1
            className="text-[42px] font-black leading-none mb-2 tracking-tight"
            style={{ color: "#1a1a1a", letterSpacing: "-0.025em", fontFamily: "'Times New Roman', Times, serif" }}
          >
            Catalyst
          </h1>
          <p className="text-[14px] leading-relaxed font-bold" style={{ color: "#8b8b82", fontFamily: "'Times New Roman', Times, serif" }}>
            Incubadora · Pentetraktys 4D · OSHIRO ERC-26+
          </p>
        </div>

        {/* ── Error ────────────────────────────────────────── */}
        {msg && (
          <div
            className="mb-6 px-4 py-3 text-[13px] leading-relaxed font-bold border"
            style={{ background: "#fff", color: "#b83820", borderColor: "rgba(212,68,44,0.25)", fontFamily: "'Times New Roman', Times, serif" }}
          >
            {msg}
          </div>
        )}

        {/* ── Formulario ───────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className="block text-[11px] tracking-[0.12em] uppercase mb-2 font-black"
              style={{ color: "#8b8b82", fontFamily: "'Times New Roman', Times, serif" }}
            >
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="incubadoracatalyst@gmail.com"
              autoComplete="email"
              autoFocus
              disabled={loading}
              className="w-full px-0 py-3 text-[15px] font-bold bg-transparent border-0 border-b border-[#c8c8c0] placeholder:text-[#b4b4ac] outline-none transition-colors duration-200"
              style={{
                color: "#1a1a1a",
                letterSpacing: "-0.01em",
                fontFamily: "'Times New Roman', Times, serif",
                borderBottom: "1px solid #c8c8c0",
              }}
              onFocus={(e) => { e.target.style.borderBottom = "1px solid #1a1a1a"; }}
              onBlur={(e) => { e.target.style.borderBottom = "1px solid #c8c8c0"; }}
            />
          </div>

          <div>
            <label
              className="block text-[11px] tracking-[0.12em] uppercase mb-2 font-black"
              style={{ color: "#8b8b82", fontFamily: "'Times New Roman', Times, serif" }}
            >
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              disabled={loading}
              className="w-full px-0 py-3 text-[15px] font-bold bg-transparent border-0 border-b border-[#c8c8c0] placeholder:text-[#b4b4ac] outline-none transition-colors duration-200"
              style={{
                color: "#1a1a1a",
                letterSpacing: "-0.01em",
                fontFamily: "'Times New Roman', Times, serif",
                borderBottom: "1px solid #c8c8c0",
              }}
              onFocus={(e) => { e.target.style.borderBottom = "1px solid #1a1a1a"; }}
              onBlur={(e) => { e.target.style.borderBottom = "1px solid #c8c8c0"; }}
            />
          </div>

          {/* ── Botón ────────────────────────────────────── */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-3.5 text-[14px] font-black tracking-[0.06em] uppercase transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: loading || !email.trim() || !password ? "#e8e8e4" : "#1a1a1a",
                color: "#fff",
                letterSpacing: "0.08em",
                fontFamily: "'Times New Roman', Times, serif",
              }}
            >
              {loading ? "Verificando…" : "Iniciar sesión"}
            </button>
          </div>
        </form>

        {/* ── Pie ───────────────────────────────────────────── */}
        <div className="mt-16 pt-6" style={{ borderTop: "1px solid #c8c8c0" }}>
          <p className="text-[11px] tracking-[0.08em] uppercase font-black" style={{ color: "#b4b4ac", fontFamily: "'Times New Roman', Times, serif" }}>
            Catalyst Blockchain
          </p>
          <p className="text-[11px] mt-1 font-bold" style={{ color: "#c8c8c0", fontFamily: "'Times New Roman', Times, serif" }}>
            Economía Autopoiética · México
          </p>
        </div>
      </div>
    </div>
  );
}

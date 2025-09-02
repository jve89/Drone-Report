import { useState } from "react";
import { API_BASE } from "../lib/api";

export default function AuthLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      setBusy(true);
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(`Login failed: ${res.status}`);
      window.location.href = "/dashboard";
    } catch (e:any) {
      setErr(e?.message || "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded p-4 space-y-3">
        <h1 className="text-xl font-semibold">Log in</h1>
        <label className="block">
          <div className="text-xs text-gray-600 mb-1">Email</div>
          <input className="w-full border rounded px-2 py-1" value={email} onChange={e=>setEmail(e.target.value)} type="email" />
        </label>
        <label className="block">
          <div className="text-xs text-gray-600 mb-1">Password</div>
          <input className="w-full border rounded px-2 py-1" value={password} onChange={e=>setPassword(e.target.value)} type="password" />
        </label>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="bg-black text-white px-3 py-2 rounded w-full disabled:opacity-50" disabled={busy}>
          {busy ? "Signing in…" : "Log in"}
        </button>
        <div className="text-sm text-center">
          No account? <a href="/signup" className="underline">Sign up</a>
        </div>
      </form>
    </div>
  );
}

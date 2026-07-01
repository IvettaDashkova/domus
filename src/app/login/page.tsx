"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AUTH_ENABLED } from "@/lib/supabase/env";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const sb = supabaseBrowser();
    if (!sb) {
      setErr("Auth is not configured yet.");
      setBusy(false);
      return;
    }
    if (mode === "in") {
      const { error } = await sb.auth.signInWithPassword({ email, password: pw });
      if (error) setErr(error.message);
      else router.push("/");
    } else {
      const { data, error } = await sb.auth.signUp({ email, password: pw });
      if (error) setErr(error.message);
      else if (data.session) router.push("/");
      else setMsg("Account created — check your email to confirm, then sign in.");
    }
    setBusy(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand" style={{ justifyContent: "center", marginBottom: 6 }}>
          <Logo size={30} />
          <span style={{ fontSize: 20, fontWeight: 650 }}>Domus</span>
        </div>
        <div className="modal-sub" style={{ textAlign: "center" }}>
          {mode === "in" ? "Sign in to your agency" : "Create your agency account"}
        </div>

        {!AUTH_ENABLED && (
          <div className="modal-err">Auth not configured — set NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY.</div>
        )}

        <form onSubmit={submit} className="auth-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@agency.com"
            required
          />
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password (min 6 chars)"
            minLength={6}
            required
          />
          {err && <div className="modal-err">{err}</div>}
          {msg && <div className="auth-msg">{msg}</div>}
          <button className="btn block" disabled={busy}>
            {busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === "in" ? (
            <>New here? <button onClick={() => setMode("up")}>Create an account</button></>
          ) : (
            <>Have an account? <button onClick={() => setMode("in")}>Sign in</button></>
          )}
        </div>
        <Link href="/" className="auth-demo">← Continue browsing the demo</Link>
      </div>
    </div>
  );
}

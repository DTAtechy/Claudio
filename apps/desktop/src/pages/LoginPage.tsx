import { useState } from "react";
import { Scale } from "lucide-react";
import { useAuth } from "@/store/auth";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, name, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-900">
          <Scale className="size-5" />
          <h1 className="text-lg font-semibold">Claudio</h1>
        </div>
        <p className="text-xs text-slate-500 -mt-2">
          {mode === "login" ? "Sign in to continue." : "Create your firm's first account."}
        </p>

        {mode === "register" && (
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "register" ? 8 : 1}
          />
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}

        <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>
          {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          className="text-xs text-slate-600 hover:text-slate-900 w-full text-center"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login"
            ? "First time here? Create the firm's first account →"
            : "Already have an account? Sign in →"}
        </button>
      </form>
    </div>
  );
}

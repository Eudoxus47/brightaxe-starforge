"use client";

import { FormEvent, useMemo, useState } from "react";
import { Lock, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/";
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") ? next : "/";
  }, []);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    if (response.ok) {
      window.location.href = nextPath;
      return;
    }

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(payload?.error ?? "Could not unlock the forge.");
    setSubmitting(false);
  }

  return (
    <main className="login-shell">
      <form className="login-panel ornate-panel" onSubmit={unlock}>
        <div className="login-mark">
          <Sparkles className="size-5" />
          <span>Brightaxe Starforge</span>
        </div>
        <h1>Table Passcode</h1>
        <label>
          <span>Passcode</span>
          <input
            autoFocus
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="Enter shared passcode"
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button className="resolve-button" type="submit" disabled={submitting || !passcode.trim()}>
          <Lock className="size-4" />
          {submitting ? "Opening..." : "Open Forge"}
        </button>
      </form>
    </main>
  );
}

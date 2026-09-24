"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "../../lib/supabase";
import { ThemeSwitch } from "../../lib/theme";
import { PasswordInput } from "../../lib/PasswordInput";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("created") === "1") {
      setMessage("Account created. Confirm your email, then sign in to reach the design log.");
    }
    try {
      createSupabaseClient().auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    } catch {
      setMessage("Add your Supabase values to .env.local before signing in.");
    }
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const nextEmail = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    setEmail(nextEmail);
    try {
      const { error } = await createSupabaseClient().auth.signInWithPassword({ email: nextEmail, password });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      setSignedIn(true);
      setMessage("Signed in. Taking you to the design log...");
      router.push("/activity");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
      setBusy(false);
    }
  }

  return <main className="auth-page hoonda-login"><nav className="topbar shell"><a className="brand" href="/"><span className="brand-mark">MTE</span><span>MTE Capstone</span></a><div className="hoonda-nav-tail"><ThemeSwitch /><a className="text-link" href="/activity">Public design log <span>→</span></a></div></nav><section className="auth-card"><span className="eyebrow"><span className="live-dot" /> TEAM ACCESS / 02</span><h1>Back to<br /><em>design.</em></h1><p>{signedIn ? `Signed in as ${email}.` : "Sign in with your invited team account to publish design notes and experiments."}</p>{!signedIn && <form onSubmit={signIn}><label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label><PasswordInput name="password" label="Password" placeholder="Your password" autoComplete="current-password" required /><button className="button button-dark" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in to design log →"}</button></form>}{signedIn && <a className="button button-dark auth-link" href="/activity">Go to design log →</a>}{message && <p className="auth-message" role="status">{message}</p>}<p className="auth-footer">Need access? <a href="/signup">Create an account</a><span className="auth-divider"> · </span><a href="/team">View the team roster</a></p></section></main>;
}

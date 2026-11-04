"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "../../lib/supabase";
import { ThemeSwitch } from "../../lib/theme";
import { BrandLockup, BrandMark } from "../../lib/BrandLogo";
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

  return (
    <main className="nr-page nr-auth">
      <div className="nr-auth-art">
        <BrandLockup href="/" variant="color" className="nr-lockup nr-auth-logo" />
        <div className="nr-auth-arc" aria-hidden="true" />
        <BrandMark className="nr-auth-mark" />
        <p aria-hidden="true">Approachable robotics<br />for everyday life.</p>
      </div>
      <div className="nr-auth-side">
        <nav className="nr-auth-nav"><a className="nr-auth-back" href="/">← Back home</a><ThemeSwitch /></nav>
        <section className="nr-auth-card">
          <span className="nr-kicker">Team access</span>
          <h1>Welcome <mark>back.</mark></h1><p>{signedIn ? `Signed in as ${email}.` : "Sign in with your invited team account to publish design notes and experiments."}</p>{!signedIn && <form onSubmit={signIn}><label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label><PasswordInput name="password" label="Password" placeholder="Your password" autoComplete="current-password" required /><button className="nr-btn nr-btn-ink nr-btn-block" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in to design log"}</button></form>}{signedIn && <a className="nr-btn nr-btn-ink nr-btn-block" href="/activity">Go to design log</a>}{message && <p className="auth-message" role="status">{message}</p>}<p className="auth-footer">Need access? <a href="/signup">Create an account</a><span className="auth-divider"> · </span><a href="/team">View the team roster</a></p></section>
      </div>
    </main>
  );
}

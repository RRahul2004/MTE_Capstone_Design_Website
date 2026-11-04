"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "../../lib/supabase";
import { ThemeSwitch } from "../../lib/theme";
import { BrandLockup, BrandMark } from "../../lib/BrandLogo";
import { PasswordInput } from "../../lib/PasswordInput";

export default function Signup() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const inviteCode = String(form.get("inviteCode") || "");
    const access = await fetch("/api/team-invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, inviteCode }) });
    if (!access.ok) {
      setMessage("This account is invite-only. Check your email and invite code.");
      setBusy(false);
      return;
    }
    try {
      const { data, error } = await createSupabaseClient().auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/activity`,
        },
      });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      if (data.session) {
        setMessage("Account created. Taking you to the design log...");
        router.push("/activity");
      } else {
        setMessage("Account created. Check your email to confirm access...");
        router.push("/login?created=1");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create your account.");
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
          <span className="nr-kicker">Invite only</span>
          <h1>Join the <mark>crew.</mark></h1><p>Notify Robots accounts are reserved for confirmed team members.</p><form onSubmit={createAccount}><label>Full name<input name="fullName" type="text" placeholder="Rahul Ramkumar" required /></label><label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label><PasswordInput name="inviteCode" label="Invite code" placeholder="Enter your private code" autoComplete="off" required /><PasswordInput name="password" label="Password" placeholder="At least 8 characters" minLength={8} autoComplete="new-password" required /><button className="nr-btn nr-btn-ink nr-btn-block" type="submit" disabled={busy}>{busy ? "Checking access..." : "Create design account"}</button></form>{message && <p className="auth-message" role="status">{message}</p>}<p className="auth-footer">Already have access? <a href="/login">Sign in</a></p></section>
      </div>
    </main>
  );
}

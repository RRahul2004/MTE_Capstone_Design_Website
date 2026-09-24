"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "../../lib/supabase";
import { ThemeSwitch } from "../../lib/theme";
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

  return <main className="auth-page hoonda-signup"><nav className="topbar shell"><a className="brand" href="/"><span className="brand-mark">MTE</span><span>MTE Capstone</span></a><div className="hoonda-nav-tail"><ThemeSwitch /><a className="text-link" href="/activity">Public design log <span>→</span></a></div></nav><section className="auth-card"><span className="eyebrow"><span className="live-dot" /> TEAM ACCESS / 03</span><h1>Join the<br /><em>design.</em></h1><p>MTE Capstone accounts are reserved for confirmed team members.</p><form onSubmit={createAccount}><label>Full name<input name="fullName" type="text" placeholder="Rahul Ramkumar" required /></label><label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label><PasswordInput name="inviteCode" label="Invite code" placeholder="Enter your private code" autoComplete="off" required /><PasswordInput name="password" label="Password" placeholder="At least 8 characters" minLength={8} autoComplete="new-password" required /><button className="button button-dark" type="submit" disabled={busy}>{busy ? "Checking access..." : "Create design account →"}</button></form>{message && <p className="auth-message" role="status">{message}</p>}<p className="auth-footer">Already have access? <a href="/login">Sign in</a></p></section></main>;
}

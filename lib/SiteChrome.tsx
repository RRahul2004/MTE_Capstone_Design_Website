import { BrandLockup, BrandMark } from "./BrandLogo";
import { ThemeSwitch } from "./theme";

type NavKey = "home" | "log" | "team" | "none";

export function SiteNav({ active = "none", cta = { href: "/activity", label: "Design log" } }: { active?: NavKey; cta?: { href: string; label: string } }) {
  return (
    <nav className="nr-nav nr-shell" aria-label="Primary">
      <BrandLockup />
      <div className="nr-nav-links">
        <a className={active === "home" ? "is-active" : ""} href="/#ethos">Ethos</a>
        <a href="/#nudge">Nudge</a>
        <a className={active === "log" ? "is-active" : ""} href="/activity">Design log</a>
        <a className={active === "team" ? "is-active" : ""} href="/team">Team</a>
      </div>
      <div className="nr-nav-tail">
        <ThemeSwitch />
        <a className="nr-btn nr-btn-ink nr-btn-sm" href={cta.href}>{cta.label}</a>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="nr-footer">
      <div className="nr-shell nr-footer-inner">
        <div className="nr-footer-brand">
          <BrandMark variant="reverse" />
          <div>
            <b>notify robots</b>
            <span>Approachable robotics for everyday life.</span>
          </div>
        </div>
        <div className="nr-footer-links">
          <a href="/#ethos">Ethos</a>
          <a href="/#nudge">Nudge</a>
          <a href="/activity">Design log</a>
          <a href="/team">Team</a>
          <a href="/login">Team sign in</a>
        </div>
        <span className="nr-footer-note">MTE Capstone · University of Waterloo · 2026</span>
      </div>
    </footer>
  );
}

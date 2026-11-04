"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "dl-theme";

/** Runs before paint (injected in layout) so there is no flash of the wrong theme. */
export const themeBootstrapScript = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');document.documentElement.dataset.theme=(s==='light'||s==='dark')?s:'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    } catch {
      /* storage blocked */
    }
    // The warm cream brand palette is the default; the OS preference does not override it.
    const initial: Theme = stored === "light" || stored === "dark" ? stored : "light";
    setThemeState(initial);
    document.documentElement.dataset.theme = initial;
    document.documentElement.style.colorScheme = initial;
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked — theme still applies for this session */
    }
  }

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}

/** Drop-in switch for any page — owns its own state. */
export function ThemeSwitch({ className = "theme-switch" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return <ThemeToggle theme={theme} setTheme={setTheme} className={className} />;
}

export function ThemeToggle({
  theme,
  setTheme,
  className = "theme-switch",
}: {
  theme: Theme;
  setTheme: (next: Theme) => void;
  className?: string;
}) {
  return (
    <div className={className} role="group" aria-label="Colour theme">
      <button
        type="button"
        className={theme === "light" ? "is-on" : ""}
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        title="Light mode"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4.4" />
          <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" />
        </svg>
      </button>
      <button
        type="button"
        className={theme === "dark" ? "is-on" : ""}
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        title="Dark mode"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
        </svg>
      </button>
    </div>
  );
}

"use client";

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

// Both icons render unconditionally; CSS (see globals.css) shows only the
// one matching the current data-theme attribute. This avoids any
// server/client state mismatch — there's no React state to hydrate.
export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title="Toggle color theme"
      className="flex h-6 w-6 items-center justify-center rounded-sm border border-border-strong text-dim hover:border-faint hover:text-text"
    >
      <svg viewBox="0 0 24 24" fill="none" className="theme-icon-light h-3.5 w-3.5">
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <svg viewBox="0 0 24 24" fill="none" className="theme-icon-dark h-3.5 w-3.5">
        <path
          d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <rect x="3" y="3" width="7.5" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: "/episodes",
    label: "Episodes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/compare",
    label: "Compare",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path d="M8 3v18M16 3v18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M4 7.5h8M12 16.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-[212px] shrink-0 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <Link href="/" className="flex flex-col gap-2 border-b border-border px-4 pt-5 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-accent">
            <path
              d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M3 7l9 5 9-5M12 12v10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[16px] font-bold tracking-wide text-text">Robot Eval</span>
          <span className="rounded-[2px] border border-border-strong px-1 text-[11px] text-faint">0.1.0</span>
        </span>
        <span className="text-[12px] text-faint">robot eval &amp; failure monitor</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 py-3">
        <p className="px-2 pb-1.5 text-[11px] tracking-[0.12em] text-mute uppercase">Views</p>
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[14px] transition-colors",
                active ? "bg-hover text-text" : "text-dim hover:bg-hover hover:text-text",
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-2.5 border-t border-border px-4 py-4">
        <span className="flex items-center gap-1.5 text-[12px] text-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-green" />
          LeRobot adapter online
        </span>
        <span className="text-[12px] leading-relaxed text-faint">
          self-hosted · real data
          <br />
          schema v1.0
        </span>
        <ThemeToggle />
      </div>
    </aside>
  );
}

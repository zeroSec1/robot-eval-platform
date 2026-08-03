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
  {
    href: "/blog",
    label: "Blog",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M5 4.5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M7.5 9h9M7.5 12.5h9M7.5 16h5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-border bg-surface md:sticky md:top-0 md:h-screen md:w-[212px] md:shrink-0 md:border-r md:border-b-0">
      {/* Logo: compact horizontal row on phones, stacked block on md+ */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-1 md:block md:border-b md:border-border md:px-0 md:pt-0 md:pb-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 md:flex-col md:items-start md:gap-2 md:px-4 md:pt-5 md:pb-4"
        >
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
          <span className="hidden text-[12px] text-faint md:block">robot eval &amp; failure monitor</span>
        </Link>
        <span className="ml-auto md:hidden">
          <ThemeToggle />
        </span>
      </div>

      {/* Nav: horizontal tab row on phones, vertical list on md+ */}
      <nav className="flex flex-row gap-0.5 overflow-x-auto px-2 py-2 md:flex-col md:py-3">
        <p className="hidden px-2 pb-1.5 text-[11px] tracking-[0.12em] text-mute uppercase md:block">Views</p>
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[14px] whitespace-nowrap transition-colors md:px-2",
                active ? "bg-hover text-text" : "text-dim hover:bg-hover hover:text-text",
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: desktop only; the mobile top bar keeps its own theme toggle */}
      <div className="mt-auto hidden flex-col gap-2.5 border-t border-border px-4 py-4 md:flex">
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

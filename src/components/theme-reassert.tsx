"use client";

import { useLayoutEffect } from "react";

/** Second line of defense for the theme attribute. The pre-paint script in
 * layout.tsx sets data-theme before first paint, but React hydration can
 * strip a client-only attribute from <html> (seen in WebKit), reverting the
 * visitor's stored choice. Re-asserting after hydration makes it stick. */
export function ThemeReassert() {
  useLayoutEffect(() => {
    try {
      let t = localStorage.getItem("theme");
      if (!t) t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", t);
    } catch {
      // no storage access: leave the CSS default (dark) in place
    }
  }, []);
  return null;
}

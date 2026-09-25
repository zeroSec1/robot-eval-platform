"use client";

// Gates full episode browsing behind an email signup, per-browser via
// localStorage — mirrors the pattern in user-data.ts (useSyncExternalStore
// over a cached raw string, so re-renders only fire when the value truly
// changes). Nothing here is a real auth system: it's a lightweight lead-
// capture wall for a public demo, not access control on sensitive data.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "robot-eval:signed-up-email";
const CHANGE_EVENT = "robot-eval:signup-changed";

function readStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useSignedUpEmail(): string | null {
  return useSyncExternalStore(subscribe, readStorage, () => null);
}

export function markSignedUp(email: string) {
  window.localStorage.setItem(STORAGE_KEY, email);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

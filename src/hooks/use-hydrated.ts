"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** true on the client after hydration, false during SSR — without an effect. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** A localStorage-backed boolean flag that is safe to read during render. */
export function useStoredFlag(key: string): [boolean, (v: boolean) => void] {
  const subscribe = (cb: () => void) => {
    window.addEventListener(`flag:${key}`, cb);
    window.addEventListener("storage", cb);
    return () => {
      window.removeEventListener(`flag:${key}`, cb);
      window.removeEventListener("storage", cb);
    };
  };
  const read = () => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  };
  const value = useSyncExternalStore(subscribe, read, () => false);
  const set = (v: boolean) => {
    try {
      localStorage.setItem(key, v ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(`flag:${key}`));
  };
  return [value, set];
}

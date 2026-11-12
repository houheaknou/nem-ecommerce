"use client";

import { useTransition } from "react";
import { useTheme } from "next-themes";
import { Languages, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { setLocale } from "@/i18n/actions";
import type { Locale } from "@/i18n/dictionaries";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const [pending, start] = useTransition();
  const next: Locale = locale === "km" ? "en" : "km";
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => start(() => setLocale(next))}
      aria-label={next === "en" ? "Switch to English" : "ប្តូរទៅភាសាខ្មែរ"}
      className="rounded-full"
    >
      <Languages className="size-4" />
      {next === "en" ? "EN" : "ខ្មែរ"}
    </Button>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known in the browser (localStorage), so the server and
  // the first client render must agree on a neutral label; icons switch via CSS.
  const hydrated = useHydrated();
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      aria-label={!hydrated ? "Toggle theme" : dark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { useTheme } from "next-themes";
import { Languages, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      aria-label={dark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}

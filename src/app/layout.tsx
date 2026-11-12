import type { Metadata, Viewport } from "next";
import { Nunito, Noto_Sans_Khmer } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { getLocale } from "@/i18n/server";
import "./globals.css";

const latin = Nunito({ variable: "--font-latin", subsets: ["latin"], display: "swap" });
const khmer = Noto_Sans_Khmer({ variable: "--font-khmer", subsets: ["khmer"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "ណែមបាត់ដំបង · Nem Battambang", template: "%s · Nem Battambang" },
  description: "Handmade Nem Battambang — retail & wholesale, delivered across Cambodia.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffcf8" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1614" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning className={`${latin.variable} ${khmer.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Light mode is the default; users can switch to dark. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Nunito, Noto_Sans_Khmer } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { getLocale } from "@/i18n/server";
import { brandNames, getBranding } from "@/features/settings/branding";
import "./globals.css";

const latin = Nunito({ variable: "--font-latin", subsets: ["latin"], display: "swap" });
const khmer = Noto_Sans_Khmer({ variable: "--font-khmer", subsets: ["khmer"], display: "swap" });

// Title and description follow the business name stored in settings.
export async function generateMetadata(): Promise<Metadata> {
  const [b, locale] = await Promise.all([getBranding(), getLocale()]);
  const { title } = brandNames(b, locale);
  return {
    title: { default: `${b.nameKm} · ${b.nameEn}`, template: `%s · ${title}` },
    description:
      (locale === "km" ? b.taglineKm : b.taglineEn) || `${b.nameEn} — retail & wholesale, delivered across Cambodia.`,
  };
}

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

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { CurrencyProvider } from "@/lib/currency";

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Domus — agency operations",
  description:
    "Internal operations tool for a real-estate agency: lead triage, smart matching, viewing routes, comps.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <I18nProvider>
          <CurrencyProvider>{children}</CurrencyProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

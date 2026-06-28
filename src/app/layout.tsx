import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

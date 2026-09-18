import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SitecoreAI Answer Readiness",
  description: "AEO/GEO and AI answer-readiness analysis for SitecoreAI Page Builder.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
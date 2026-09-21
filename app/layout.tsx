import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Answer Readiness",
  description:
    "Deterministic AEO/GEO scoring inside SitecoreAI Page Builder.",
  icons: {
    icon: "/appicon.png",
    shortcut: "/appicon.png",
    apple: "/appicon.png",
  },
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
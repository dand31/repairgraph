import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepairGraph",
  description:
    "A shared diagnostic workspace where people and AI agents troubleshoot connected machines together.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

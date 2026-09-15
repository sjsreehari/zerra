import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zerra — Autonomous Security Platform",
  description: "Autonomous repository security, automated fix PRs, and multi-channel incident alerting.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

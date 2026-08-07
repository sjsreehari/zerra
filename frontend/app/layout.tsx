import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zerra — Authorisation That Understands Intent",
  description: "Identity-aware authorisation for AI agents, users, and services.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

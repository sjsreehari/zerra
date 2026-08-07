import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
<<<<<<< HEAD
  title: "SENTRA Command Center",
  description: "Zero-trust API security dashboard",
=======
  title: "Zerra — Authorisation That Understands Intent",
  description: "Identity-aware authorisation for AI agents, users, and services.",
>>>>>>> c3358db9a4dd627e8514bc8ddd25e4a89a534ed6
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SENTRA — Zero-Trust Security Intelligence | Zerra",
  description:
    "SENTRA is a zero-trust authorization layer that protects APIs, services, AI agents, and MCP servers through real-time behavioral analysis and trust scoring.",
  keywords: ["zero-trust", "security", "API protection", "AI agents", "threat detection", "SENTRA"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Vertical stripe background */}
        <div className="bg-stripes" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

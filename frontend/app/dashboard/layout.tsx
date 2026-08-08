"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Shield, Users, Zap, ScrollText, FileText, ChevronRight
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/risk-cards", label: "Risk Cards", icon: Shield },
  { href: "/dashboard/identities", label: "Identities", icon: Users },
  { href: "/dashboard/attack-sim", label: "Attack Sim", icon: Zap },
  { href: "/dashboard/policies", label: "Policies", icon: ScrollText },
  { href: "/dashboard/logs", label: "Traffic Logs", icon: FileText },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-[#060a13] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#0a0e1a]/80 backdrop-blur-xl border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-sm">
              S
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">SENTRA</h1>
              <p className="text-[10px] text-white/40 tracking-widest uppercase">Zero Trust Nervous System</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon size={18} className={isActive ? "text-blue-400" : "text-white/30 group-hover:text-white/60"} />
                <span>{item.label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto text-blue-400/60" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/10">
            <p className="text-xs text-white/40">Engine Status</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-emerald-400">Active</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

"use client"

import { useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  Search,
  Bug,
  Bell,
  ShieldCheck,
  BarChart3,
  Settings,
} from "lucide-react";

import AnnouncementBar from "../components/shared/AnnouncementBar";
import Sidebar from "../components/shared/Sidebar";
import Topbar from "../components/shared/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const [showAnnouncement, setShowAnnouncement] = useState(true)

  const TABS = [
    {
      id: 1,
      tab_name: "Dashboard",
      icon: LayoutDashboard,
      has_sub_nav: false,
      main_tab_href: "/dashboard",
      sub_navs: []
    },
    {
      id: 2,
      tab_name: "Repositories",
      icon: GitBranch,
      has_sub_nav: false,
      main_tab_href: "/dashboard/repositories",
      sub_navs: []
    },
    {
      id: 3,
      tab_name: "Scans",
      icon: Search,
      has_sub_nav: false,
      main_tab_href: "/dashboard/scans",
      sub_navs: []
    },
    {
      id: 4,
      tab_name: "Findings",
      icon: Bug,
      has_sub_nav: false,
      main_tab_href: "/dashboard/findings",
      sub_navs: []
    },
    {
      id: 5,
      tab_name: "Notifications",
      icon: Bell,
      has_sub_nav: false,
      main_tab_href: "/dashboard/notifications",
      sub_navs: []
    },
    {
      id: 6,
      tab_name: "Policies",
      icon: ShieldCheck,
      has_sub_nav: false,
      main_tab_href: "/dashboard/policies",
      sub_navs: []
    },
    {
      id: 7,
      tab_name: "Reports",
      icon: BarChart3,
      has_sub_nav: false,
      main_tab_href: "/dashboard/reports",
      sub_navs: []
    },
    {
      id: 8,
      tab_name: "Settings",
      icon: Settings,
      has_sub_nav: false,
      main_tab_href: "/dashboard/settings",
      sub_navs: []
    }
  ];

  return (
    <section className="flex h-screen overflow-hidden bg-bg-page">
      <Sidebar
        tabs={TABS}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {
          showAnnouncement && (
            <AnnouncementBar
              message="Zerra v2 is live — auto-scan repos, generate fix PRs, and get alerts on WhatsApp, Discord, Teams & Email."
              linkHref="https://github.com/sjsreehari/zerra"
              linkLabel="Star on GitHub"
              close={() => setShowAnnouncement(false)}
            />
          )
        }
        <Topbar />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </section>
  )
}
"use client"

import { useState } from "react";
import {
  LayoutDashboard,
  Radar,
  ShieldCheck,
  Waypoints,
  AlertTriangle,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

import AnnouncementBar from "../components/shared/AnnouncementBar";
import MenuBar from "../components/shared/MenuBar";
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
      tab_name: "Command Center",
      icon: LayoutDashboard,
      has_sub_nav: false,
      main_tab_href: "/dashboard",
      sub_navs: []
    },
    {
      id: 2,
      tab_name: "AI Pentest Studio",
      icon: AlertTriangle,
      has_sub_nav: false,
      main_tab_href: "/dashboard/security",
      sub_navs: []
    },
    {
      id: 3,
      tab_name: "APIs & Routes",
      icon: Waypoints,
      has_sub_nav: false,
      main_tab_href: "/dashboard/api",
      sub_navs: []
    },
    {
      id: 4,
      tab_name: "Zero-Trust Policies",
      icon: ShieldCheck,
      has_sub_nav: false,
      main_tab_href: "/dashboard/policies",
      sub_navs: []
    },
    {
      id: 5,
      tab_name: "Live Traffic",
      icon: Radar,
      has_sub_nav: false,
      main_tab_href: "/dashboard/traffic",
      sub_navs: []
    },
    {
      id: 6,
      tab_name: "Threats & Risks",
      icon: AlertTriangle,
      has_sub_nav: false,
      main_tab_href: "/dashboard/threats",
      sub_navs: []
    },
    {
      id: 7,
      tab_name: "Compliance Reports",
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
      <MenuBar />
      <Sidebar
        tabs={TABS}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {
          showAnnouncement && (
            <AnnouncementBar
              message="Just shipped: zero-trust policy templates are here."
              linkHref="/changelog"
              linkLabel="See what's new"
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
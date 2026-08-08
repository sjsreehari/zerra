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
      tab_name: "Dashboard",
      icon: LayoutDashboard,
      has_sub_nav: false,
      main_tab_href: "/dashboard",
      sub_navs: []
    },
    {
      id: 2,
      tab_name: "APIs",
      icon: Waypoints,
      has_sub_nav: false,
      main_tab_href: "/dashboard/api",
      sub_navs: []
    },
    {
      id: 3,
      tab_name: "Policies",
      icon: ShieldCheck,
      has_sub_nav: false,
      main_tab_href: "/policies",
      sub_navs: []
    },
    {
      id: 4,
      tab_name: "Traffic",
      icon: Radar,
      has_sub_nav: false,
      main_tab_href: "/traffic",
      sub_navs: []
    },
    {
      id: 5,
      tab_name: "Threats",
      icon: AlertTriangle,
      has_sub_nav: false,
      main_tab_href: "/threats",
      sub_navs: []
    },
    {
      id: 6,
      tab_name: "Team",
      icon: Users,
      has_sub_nav: false,
      main_tab_href: "/team",
      sub_navs: []
    },
    {
      id: 7,
      tab_name: "Reports",
      icon: BarChart3,
      has_sub_nav: false,
      main_tab_href: "/reports",
      sub_navs: []
    },
    {
      id: 8,
      tab_name: "Settings",
      icon: Settings,
      has_sub_nav: false,
      main_tab_href: "/settings",
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
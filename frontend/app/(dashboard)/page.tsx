"use client"

import { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  CalendarDays,
  Users,
  BarChart3,
  FileText,
  Settings,
  FolderOpen,
  PlayCircle,
  Archive,
  CircleCheckBig,
  ClipboardList,
  KanbanSquare,
  UserRound,
  ShieldCheck,
  FileBarChart,
  Clock3,
  TrendingUp,
  SlidersHorizontal,
  Bell,
  Plug,
  ChevronDown, 
  ChevronUp
} from "lucide-react";


import AnnouncementBar from "../components/shared/AnnouncementBar";
import MenuBar from "../components/shared/MenuBar";
import Sidebar from "../components/shared/Sidebar";
import Topbar from "../components/shared/Topbar";

export default function MainDashboard() {

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
            tab_name: "Projects",
            icon: FolderKanban,
            has_sub_nav: true,
            main_tab_href: "/projects",
            sub_navs: [
                {
                    id: 21,
                    tab_name: "All Projects",
                    icon: FolderOpen,
                    main_tab_href: "/projects/all"
                },
                {
                    id: 22,
                    tab_name: "Active Projects",
                    icon: PlayCircle,
                    main_tab_href: "/projects/active"
                },
                {
                    id: 23,
                    tab_name: "Archived Projects",
                    icon: Archive,
                    main_tab_href: "/projects/archived"
                }
            ]
        },
        {
            id: 3,
            tab_name: "Tasks",
            icon: ListTodo,
            has_sub_nav: true,
            main_tab_href: "/tasks",
            sub_navs: [
                {
                    id: 31,
                    tab_name: "My Tasks",
                    icon: CircleCheckBig,
                    main_tab_href: "/tasks/my"
                },
                {
                    id: 32,
                    tab_name: "All Tasks",
                    icon: ClipboardList,
                    main_tab_href: "/tasks/all"
                },
                {
                    id: 33,
                    tab_name: "Task Board",
                    icon: KanbanSquare,
                    main_tab_href: "/tasks/board"
                }
            ]
        },
        {
            id: 4,
            tab_name: "Calendar",
            icon: CalendarDays,
            has_sub_nav: false,
            main_tab_href: "/calendar",
            sub_navs: []
        },
        {
            id: 5,
            tab_name: "Team",
            icon: Users,
            has_sub_nav: true,
            main_tab_href: "/team",
            sub_navs: [
                {
                    id: 51,
                    tab_name: "Members",
                    icon: UserRound,
                    main_tab_href: "/team/members"
                },
                {
                    id: 52,
                    tab_name: "Roles & Permissions",
                    icon: ShieldCheck,
                    main_tab_href: "/team/roles"
                }
            ]
        },
        {
            id: 6,
            tab_name: "Reports",
            icon: BarChart3,
            has_sub_nav: true,
            main_tab_href: "/reports",
            sub_navs: [
                {
                    id: 61,
                    tab_name: "Project Reports",
                    icon: FileBarChart,
                    main_tab_href: "/reports/projects"
                },
                {
                    id: 62,
                    tab_name: "Time Tracking",
                    icon: Clock3,
                    main_tab_href: "/reports/time"
                },
                {
                    id: 63,
                    tab_name: "Performance",
                    icon: TrendingUp,
                    main_tab_href: "/reports/performance"
                }
            ]
        },
        {
            id: 7,
            tab_name: "Documents",
            icon: FileText,
            has_sub_nav: false,
            main_tab_href: "/documents",
            sub_navs: []
        },
        {
            id: 8,
            tab_name: "Settings",
            icon: Settings,
            has_sub_nav: true,
            main_tab_href: "/settings",
            sub_navs: [
                {
                    id: 81,
                    tab_name: "General",
                    icon: SlidersHorizontal,
                    main_tab_href: "/settings/general"
                },
                {
                    id: 82,
                    tab_name: "Notifications",
                    icon: Bell,
                    main_tab_href: "/settings/notifications"
                },
                {
                    id: 83,
                    tab_name: "Integrations",
                    icon: Plug,
                    main_tab_href: "/settings/integrations"
                }
            ]
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
              message="Just shipped: role-based dashboards are here."
              linkHref="/changelog"
              linkLabel="See what's new"
              close={() => setShowAnnouncement(false)}
            />
          )
        }
        <Topbar />


        <main className="flex-1 overflow-y-auto p-6">
          {
            /*
              TODO:
                ADD CHILDRENS IN HERE 
            */
          }
        </main>
      </div>
    </section>
  )
}
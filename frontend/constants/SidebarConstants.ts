import { CircleHelp, FileText, Settings } from "lucide-react";

export const SidebarBottomTabs = [
    {
        id: 100,
        tab_name: "Audit Reports",
        icon: FileText,
        main_tab_href: "/dashboard/reports",
    },
    {
        id: 101,
        tab_name: "Settings",
        icon: Settings,
        main_tab_href: "/dashboard/settings",
    },
    {
        id: 102,
        tab_name: "System Docs",
        icon: CircleHelp,
        main_tab_href: "https://github.com/sjsreehari/zerra",
    },
];
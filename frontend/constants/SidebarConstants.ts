import { CircleHelp, Moon, Settings } from "lucide-react";


export const SidebarBottomTabs = [
    {
        id: 100,
        tab_name: "Dark Mode",
        icon: Moon,
    },
    {
        id: 101,
        tab_name: "Settings",
        icon: Settings,
        main_tab_href: "/dashboard/settings",
    },
    {
        id: 102,
        tab_name: "Help & Support",
        icon: CircleHelp,
    },
]
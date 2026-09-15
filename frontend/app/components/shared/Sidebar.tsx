"use client"

import {
  ChevronDown, 
  ChevronUp,
} from "lucide-react";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "./Avatar";
import { SidebarBottomTabs } from "@/constants/SidebarConstants";
import { SidebarProps } from "@/types/sidebar_types";


export default function Sidebar({ tabs } : SidebarProps) {

    const [openSubtabs, setOpenSubtabs] = useState<number[]>([]) 
    const pathname = usePathname()

    const addTabOpen = (tab_id: number) => {
        setOpenSubtabs(prev => 
            prev.includes(tab_id) 
                ? prev.filter(id => id !== tab_id) 
                : [...prev, tab_id]
        )
    }

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname === href || pathname?.startsWith(`${href}/`);
    };

    return (
        <aside className="w-60 h-screen flex flex-col border-r border-r-border-default pt-3.75">

            <div className="org__logo pb-4">
                <div className="flex gap-2 items-center px-4">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold w-8 h-8 flex items-center justify-center rounded-lg shadow-sm">
                        Z
                    </div>
                    <div>
                        <h3 className="font-bold text-lg tracking-tight">Zerra</h3>
                        <span className="text-[10px] text-emerald-400 font-mono">● AUTONOMOUS DEFENSE</span>
                    </div>
                </div>
                <div className="border-b border-b-border-default pb-4"/>
            </div>

           <div className="flex-1 min-h-0 flex flex-col">
                <div className="pb-2 px-4">
                    <h3 className="text-left text-text-muted font-light text-xs tracking-wide">MAIN MENU</h3>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll">
                    <div className="px-4">
                        {
                            tabs.map((tab) => {
                                const tabIsActive = isActive(tab.main_tab_href)

                                const tabContent = (
                                    <div className="flex items-center justify-center gap-2 pl-2">
                                        <tab.icon size={15} className={tabIsActive ? "text-blue-400" : "text-text-muted"} />
                                        <span className="truncate">{tab.tab_name}</span>
                                    </div>
                                )

                                const tabClassName = `
                                    cursor-pointer w-full text-xs font-medium
                                    flex items-center justify-between px-2.5 py-2 rounded-lg 
                                    transition-all 
                                    ${
                                        tabIsActive
                                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-xs" 
                                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                                    }
                                `

                                return (
                                    <div 
                                        key={tab.id}
                                        className={
                                            `
                                                pt-1 pb-1
                                            `
                                        }
                                    >
                                        <div>
                                            {
                                                tab.has_sub_nav ? (
                                                    <button 
                                                        className={tabClassName}
                                                        onClick={() => addTabOpen(tab.id)}
                                                    >
                                                        {tabContent}

                                                        {
                                                            openSubtabs.includes(tab.id) 
                                                            ? <ChevronUp size={12} />
                                                            : <ChevronDown size={12} />
                                                        }
                                                    </button>
                                                ) : (
                                                    <Link 
                                                        href={tab.main_tab_href}
                                                        className={tabClassName}
                                                    >
                                                        {tabContent}
                                                    </Link>
                                                )
                                            }

                                            {
                                                tab.has_sub_nav && openSubtabs.includes(tab.id) && tab.sub_navs.length > 0 && (
                                                    <div className="relative ml-3 mt-1">

                                                        <div className="absolute left-2 top-0 bottom-3 w-px bg-border-default" />
                                                        {
                                                            tab.sub_navs.map((subNav) => {
                                                                const subNavIsActive = isActive(subNav.main_tab_href)

                                                                return (
                                                                    <div 
                                                                        key={subNav.id}
                                                                        className={
                                                                            `
                                                                                relative pl-6 py-1
                                                                            `
                                                                        }
                                                                    >
                                                                        <div className="absolute left-1.5 top-1/2 h-1 w-1 rounded-full -translate-y-1/2 bg-border-default" />

                                                                        <Link 
                                                                            href={subNav.main_tab_href}
                                                                            className={
                                                                                `   
                                                                                    cursor-pointer w-full
                                                                                    flex items-center gap-2 text-xs
                                                                                    transition-colors
                                                                                    ${
                                                                                        subNavIsActive
                                                                                        ? "text-text-primary"
                                                                                        : "text-text-secondary hover:text-text-primary"
                                                                                    }
                                                                                `
                                                                            }
                                                                        >
                                                                            <subNav.icon size={13} />
                                                                            {subNav.tab_name}
                                                                        </Link>
                                                                    </div>
                                                                )
                                                            })
                                                        }
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
           </div>



            <div className="border-t border-border-default p-3 shrink-0">
                <div className="pb-2">
                    <h3 className="text-left text-text-muted font-light text-xs tracking-wide">System</h3>
                </div>
                <div>
                    {
                        SidebarBottomTabs.map((tab) => {
                            const tabHref = (tab as { main_tab_href?: string }).main_tab_href ?? "#"
                            const tabIsActive = isActive(tabHref)

                            return (
                                <div 
                                    key={tab.id}
                                    className={
                                            `
                                                pt-0.5 pb-0.5
                                            `
                                        }
                                >
                                    <Link
                                        href={tabHref}
                                        className={
                                                    `
                                                        cursor-pointer w-full text-sm
                                                        flex gap-2 items-center pl-4 p-1 rounded-sm 
                                                        transition-colors 
                                                        ${
                                                            tabIsActive
                                                            ? "border border-border-default bg-bg-active/10" 
                                                            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                                                        }
                                                    `
                                                }
                                    >
                                        <tab.icon size={15} />
                                        {tab.tab_name}
                                    </Link>

                                </div>
                            )
                        })
                    }
                </div>
            </div>



            <div className="mt-auto border-t border-border-default p-3 shrink-0">
                <div className="flex items-center gap-2.5 px-1 py-0.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                        OP
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-semibold text-text-primary">SecOps Admin</h3>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>

                        <p className="text-[10px] text-text-muted truncate">
                            admin@zerra.network
                        </p>
                    </div>
                </div>
            </div>
           
        </aside>
    )
}
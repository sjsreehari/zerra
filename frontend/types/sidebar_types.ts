import { LucideIcon } from "lucide-react";

export type SubNav = {
  id: number;
  tab_name: string;
  icon: LucideIcon;
  main_tab_href: string;
};

export type SidebarTab = {
  id: number;
  tab_name: string;
  icon: LucideIcon;
  has_sub_nav: boolean;
  main_tab_href: string;
  sub_navs: SubNav[];
};

export type SidebarProps = {
  tabs: SidebarTab[];
};

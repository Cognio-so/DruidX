"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  History,
  Settings,
} from "lucide-react";

import { NavMain } from "@/components/sidebar/user/nav-main";
import { NavUser } from "@/components/sidebar/user/nav-user";
import { TeamSwitcher } from "@/components/sidebar/user/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    url: "/user",
    icon: LayoutDashboard,
  },
  {
    title: "Collections",
    url: "/user/gpts",
    icon: FolderOpen,
  },
 
  {
    title: "History",
    url: "/user/history",
    icon: History,
  },
  {
    title: "Settings",
    url: "/user/settings",
    icon: Settings,
  },
];

export function UserSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const pathname = usePathname();

  // Add isActive property based on current pathname
  const navMain = navItems.map((item) => ({
    ...item,
    isActive: pathname === item.url || (item.url !== "/user" && pathname.startsWith(item.url)),
  }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex items-center justify-between">
        <TeamSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

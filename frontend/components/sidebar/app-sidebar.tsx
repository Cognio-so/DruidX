"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Wrench,
  History,
  Settings,
} from "lucide-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Collections",
    url: "/admin/gpts",
    icon: FolderOpen,
  },
  {
    title: "Teams",
    url: "/admin/teams",
    icon: Users,
  },
  {
    title: "Tools",
    url: "/admin/tools",
    icon: Wrench,
  },
  {
    title: "History",
    url: "/admin/history",
    icon: History,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const pathname = usePathname();

  const isExpanded = state === "expanded";

  // Add isActive property based on current pathname
  const navMain = navItems.map((item) => ({
    ...item,
    isActive: pathname === item.url || (item.url !== "/admin" && pathname.startsWith(item.url)),
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

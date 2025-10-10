"use client";

import * as React from "react";
import {
  ChevronsUpDown,
  Home,
  Library,
  LogOutIcon,
  Users2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { UseSignOut } from "@/hooks/use-signout";
import { ThemeToggle } from "@/components/ui/themeToggle";

export function NavUser() {
  const { data: session, isPending } = authClient.useSession();
  const { isMobile } = useSidebar();

  const handleSignout = UseSignOut();

  if (isPending) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={session?.user.image || undefined}
                  alt={session?.user.name || "User"}
                />
                <AvatarFallback>
                  {session?.user.name && session.user.name.length > 0
                    ? session.user.name.charAt(0).toUpperCase()
                    : session?.user.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {session?.user.name}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {session?.user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto w-4 h-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={session?.user.image || undefined}
                    alt={session?.user.name || "User"}
                  />
                  <AvatarFallback>
                    {session?.user.name && session.user.name.length > 0
                      ? session.user.name.charAt(0).toUpperCase()
                      : session?.user.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {session?.user.name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {session?.user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={"/"}>
                  <Home />
                  HomePage
                </Link>
              </DropdownMenuItem>
              {session?.user.role === "admin" && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={"/admin"}>
                      <Library />
                      Collections
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={"/admin/teams"}>
                      <Users2 />
                      Teams
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuGroup>
              <ThemeToggle />
              theme toggle
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignout}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

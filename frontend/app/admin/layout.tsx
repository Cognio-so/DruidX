import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <MobileHeader />
        <main className="flex-1 overflow-hidden p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
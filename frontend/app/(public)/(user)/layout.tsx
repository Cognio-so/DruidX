import { UserSidebar } from "@/components/sidebar/user/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { ReactNode } from "react";
import { requireUser } from "@/data/requireUser";

export default async function UserLayout({ children }: { children: ReactNode }) {
  await requireUser(); // This ensures user is authenticated

  return (
    <SidebarProvider>
      <UserSidebar />
      <SidebarInset>
        <MobileHeader />
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

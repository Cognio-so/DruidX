"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";

export function MobileHeader() {
  const { data: session } = authClient.useSession();

  return (
    <header className="flex items-center justify-between p-4 border-b md:hidden">
      <SidebarTrigger className="h-8 w-8" />
      
      {/* EMSA Logo in center */}
      <div className="flex-1 flex justify-center ">
        <Image
          src="/Horizontal EMSA logo.png"
          alt="EMSA"
          width={120}
          height={40}
          className="h-8 w-auto bg-white rounded-md"
        />
      </div>
      
      {/* User profile picture */}
      <Avatar className="h-8 w-8">
        <AvatarImage
          src={
            session?.user.image ??
            `https://avatar.vercel.sh/${session?.user.email}`
          }
          alt={session?.user.name}
        />
        <AvatarFallback>
          {session?.user.name && session.user.name.length > 0
            ? session.user.name.charAt(0).toUpperCase()
            : session?.user.email?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </header>
  );
}

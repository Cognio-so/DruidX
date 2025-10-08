"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/themeToggle";
import { authClient } from "@/lib/auth-client";
import { Bot} from "lucide-react";
import Image from "next/image";

interface ChatHeaderProps {
  gptName?: string;
  gptImage?: string;
}

export default function ChatHeader({ gptName, gptImage }: ChatHeaderProps) {
  const { data: session } = authClient.useSession();

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8">
          {gptImage && gptImage !== "default-avatar.png" ? (
            <Image
              src={gptImage}
              alt={gptName || "GPT"}
              fill
              className="rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-semibold text-foreground">
            {gptName || "GPT Assistant"}
          </h1>
          <p className="text-xs text-muted-foreground">
            AI Assistant
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <ThemeToggle />
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
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Gpt } from "@/data/get-gpts";
import {
  Bot,
  Calendar,
  CircuitBoard,
  FileSearch,
  Globe,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { deleteGptbyId } from "../action";

const modelDisplayNames: Record<string, string> = {
  gpt_4o: "GPT-4o",
  gpt_4: "GPT-4", 
  gpt_5: "GPT-5",
  gemini_2_5_flash: "Gemini 2.5 Flash",
  claude_3_5_sonnet: "Claude 3.5 Sonnet",
  claude_3_5_haiku: "Claude 3.5 Haiku",
  claude_3_opus: "Claude 3 Opus",
  o1_preview: "o1 Preview",
  o1_mini: "o1 Mini",
  o2_preview: "o2 Preview",
  o4_mini: "o4 Mini",
};

interface GptCardProps {
  gpt: Gpt;
}

export function GptCard({ gpt }: GptCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteGptbyId(gpt.id);
        if (result.success) {
          toast.success("GPT deleted successfully");
          router.refresh();
        } else {
          toast.error(result.message || "Failed to delete GPT");
        }
      } catch (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete GPT");
      }
    });
  };

  return (
    <Card className="relative h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex-shrink-0">
              {gpt.image && gpt.image !== "default-avatar.png" ? (
                <Image
                  src={gpt.image}
                  alt={gpt.name}
                  fill
                  className="rounded-full object-cover border border-gray-200 sm:border-2"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                </div>
              )}
            </div>

            {/* Name - Keep in same position but allow wrapping */}
            <div className="min-w-0 flex-1">
              <CardTitle 
                className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold leading-tight break-words"
                title={gpt.name}
                style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  lineHeight: '1.2',
                  maxHeight: '2.4em', // Allow max 2 lines
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {gpt.name}
              </CardTitle>
            </div>
          </div>

          {/* Three-dot dropdown - Always visible */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 sm:w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/gpts/${gpt.id}/edit`}>
                    <Pencil className="w-4 h-4 mr-2" />
                    <span className="text-sm">Edit GPT</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive"
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash className="w-4 h-4 mr-2" />
                  )}
                  <span className="text-sm">Delete GPT</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        <CardDescription className="mb-3 sm:mb-4 text-xs sm:text-sm md:text-base line-clamp-2 sm:line-clamp-3 flex-shrink-0">
          {gpt.description}
        </CardDescription>

        {/* Single horizontal line for calendar, icons, and GPT model */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
            <span className="truncate text-xs sm:text-sm">
              {new Date(gpt.createdAt).toLocaleDateString("en-GB")}
            </span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            {gpt.webBrowser && (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
              </div>
            )}
            {gpt.hybridRag && (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <FileSearch className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
              </div>
            )}
            {gpt.mcp && (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <CircuitBoard className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 flex-shrink-0" />
              </div>
            )}
            <span className="text-purple-500 font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px] md:max-w-none">
              {modelDisplayNames[gpt.model] || gpt.model}
            </span>
          </div>
        </div>

        {/* Start Chat Button */}
        <div className="mt-auto">
          <Link
            href={`/admin/gpts/${gpt.id}/chat`}
            className={buttonVariants({
              variant: "default",
              className: "w-full text-sm sm:text-base h-8 sm:h-9 md:h-10",
            })}
          >
            <MessageCircle className="mr-2 w-4 h-4" />
            Start Chat
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
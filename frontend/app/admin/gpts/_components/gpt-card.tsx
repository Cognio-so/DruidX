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

const modelDisplayNames = {
  gpt_4o: "GPT-4o",
  gpt_4: "GPT-4",
  gpt_5: "GPT-5",
} as const;

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
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
              {gpt.image && gpt.image !== "default-avatar.png" ? (
                <Image
                  src={gpt.image}
                  alt={gpt.name}
                  fill
                  className="rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              )}
            </div>

            {/* Name */}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl font-semibold truncate leading-tight">
                {gpt.name}
              </CardTitle>
            </div>
          </div>

          {/* Three-dot dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/admin/gpts/${gpt.id}/edit`}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit GPT
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
                Delete GPT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        <CardDescription className="mb-4 text-sm sm:text-base line-clamp-3 flex-shrink-0">
          {gpt.description}
        </CardDescription>

        {/* Single horizontal line for calendar, icons, and GPT model */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-4 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
            <span className="truncate">
              {new Date(gpt.createdAt).toLocaleDateString("en-GB")}
            </span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {gpt.webBrowser && (
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                <span className="hidden sm:inline text-xs">Web</span>
              </div>
            )}
            {gpt.hybridRag && (
              <div className="flex items-center gap-1">
                <FileSearch className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                <span className="hidden sm:inline text-xs">RAG</span>
              </div>
            )}
            {gpt.mcp && (
              <div className="flex items-center gap-1">
                <CircuitBoard className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 flex-shrink-0" />
                <span className="hidden sm:inline text-xs">MCP</span>
              </div>
            )}
            <span className="text-purple-500 font-medium text-xs sm:text-sm">
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
              className: "w-full text-sm sm:text-base",
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

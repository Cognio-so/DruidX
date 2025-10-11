"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminHistory } from "@/data/get-admin-history";
import {
  Bot,
  Calendar,
  MessageCircle,
  MoreHorizontal,
  Trash,
  User,
  Loader2,
  Eye,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { deleteHistory } from "../action";
import { ConversationPreviewDialog } from "./conversation-preview-dialog";

interface HistoryDataProps {
  history: AdminHistory;
}

export function HistoryData({ history }: HistoryDataProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteHistory(history.id);
        if (result.success) {
          toast.success("Conversation deleted successfully");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to delete conversation");
        }
      } catch (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete conversation");
      }
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const firstMessage = history.messages[0];
  const preview = firstMessage ? 
    (firstMessage.content.length > 100 
      ? firstMessage.content.substring(0, 100) + "..." 
      : firstMessage.content) 
    : "No messages";

  return (
    <Card className="relative h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* GPT Avatar */}
            <div className="relative w-10 h-10 flex-shrink-0">
              {history.gpt.image && history.gpt.image !== "default-avatar.png" ? (
                <Image
                  src={history.gpt.image}
                  alt={history.gpt.name}
                  fill
                  className="rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {/* Title and Info */}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-semibold leading-tight break-words mb-1">
                {history.title}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{history.gpt.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {history._count.messages} messages
                </Badge>
              </div>
            </div>
          </div>

          {/* Three-dot dropdown */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <ConversationPreviewDialog history={history}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Eye className="w-4 h-4 mr-2" />
                    <span className="text-sm">Preview</span>
                  </DropdownMenuItem>
                </ConversationPreviewDialog>
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
                  <span className="text-sm">Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        {/* User Info */}
        <div className="flex items-center gap-2 mb-3">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-xs">
              {getInitials(history.user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {history.user.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {history.user.email}
            </p>
          </div>
        </div>

        {/* Message Preview */}
        <CardDescription className="mb-3 text-sm line-clamp-2 flex-shrink-0">
          {preview}
        </CardDescription>

        {/* Footer with date and message count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 border-t">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(history.updatedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            <span>{history._count.messages}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

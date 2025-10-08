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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const modelDisplayNames = {
  gpt_4o: "GPT-4o",
  gpt_4: "GPT-4",
  gpt_5: "GPT-5",
} as const;

interface GptCardProps {
  gpt: Gpt;
}

export function GptCard({ gpt }: GptCardProps) {
  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="relative w-12 h-12">
              {gpt.image && gpt.image !== "default-avatar.png" ? (
                <Image
                  src={gpt.image}
                  alt={gpt.name}
                  fill
                  className="rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            {/* Name and Status */}
            <div>
              <CardTitle className="text-lg font-semibold">
                {gpt.name}
              </CardTitle>
            </div>
          </div>

          {/* Three-dot dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={"ghost"} size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/admin/gpts/${gpt.id}/chat`}>
                  <MessageCircle className="size-4 mr-2" />
                  Chat
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/gpts/${gpt.id}/edit`}>
                  <Pencil className="size-4 mr-2" />
                  Edit GPT
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/admin/gpts/${gpt.id}/delete`}>
                  <Trash className="size-4 mr-2 text-destructive" />
                  Delete GPT
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <CardDescription className="mb-4">{gpt.description}</CardDescription>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4 text-yellow-600" />
              <span>0</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{new Date(gpt.createdAt).toLocaleDateString("en-GB")}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {gpt.webBrowser && <Globe className="w-4 h-4 text-green-600" />}
            {gpt.hybridRag && <FileSearch  className="w-4 h-4 text-purple-600" />}
            {gpt.mcp && <CircuitBoard className="w-4 h-4 text-orange-600" />}
            <span className="text-purple-500">
              {modelDisplayNames[gpt.model] || gpt.model}
            </span>
          </div>
        </div>

        <Link
          href={`/admin/gpts/${gpt.id}/chat`}
          className={buttonVariants({
            variant: "default",
            className: "w-full",
          })}
        >
          <MessageCircle className="mr-2 w-4 h-4" />
          Start Chat
        </Link>
      </CardContent>
    </Card>
  );
}

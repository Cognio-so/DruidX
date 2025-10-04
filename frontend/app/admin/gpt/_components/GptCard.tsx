"use client";

import {
  MoreVerticalIcon,
  Pencil,
  Eye,
  Trash,
  Sparkle,
  HistoryIcon,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface GptCardProps {
  data: {
    id: string;
    name: string;
    description: string;
    image: string;
    model: string;
    createdAt: Date;
  };
  onEdit?: (id: string) => void;
  onPreview?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function GptCard({ data }: GptCardProps) {
  return (
    <Card className="group relative p-2 gap-2 w-full max-w-xs mx-auto">
      {/* Dropdown Menu */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="p-1">
              <MoreVerticalIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link
                href={`/admin/gpt/${data.id}/edit`}
                className="flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" /> Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`/gpt/${data.id}`}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" /> Preview
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={`/admin/gpt/${data.id}/delete`}
                className="flex items-center gap-2 text-destructive"
              >
                <Trash className="w-4 h-4" /> Delete
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Image
        src={
          data.image
            ? data.image.startsWith("http") || data.image.startsWith("/")
              ? data.image
              : `/${data.image}`
            : "/default-avatar.png"
        }
        alt={data.name}
        width={400}
        height={225}
        className="w-full h-32 object-cover rounded-md"
      />

      {/* Content */}
      <CardContent className="p-2">
        <Link
          href={`/admin/gpt/${data.id}/edit`}
          className="block font-semibold text-sm line-clamp-2 hover:underline group-hover:text-primary"
        >
          {data.name}
        </Link>

        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {data.description}
        </p>

        <div className="mt-2 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Sparkle className="w-4 h-4 p-0.5 rounded bg-primary/10 text-primary" />
            <span>{data.model}</span>
          </div>
          <div className="flex items-center gap-1">
            <HistoryIcon className="w-4 h-4 p-0.5 rounded bg-primary/10 text-primary" />
            <span>{data.createdAt.toLocaleDateString()}</span>
          </div>
        </div>

        <Link
          href={`/admin/gpt/${data.id}/edit`}
          className={buttonVariants({
            className: "w-full mt-2 text-sm py-1",
          })}
        >
          <ArrowRight className="w-4 h-4" />
          Edit
        </Link>
      </CardContent>
    </Card>
  );
}

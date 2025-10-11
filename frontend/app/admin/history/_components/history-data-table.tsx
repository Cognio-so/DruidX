"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Loader2,
  Eye,
  ArrowUpDown,
  Search,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { deleteHistory } from "../action";
import { ConversationPreviewDialog } from "./conversation-preview-dialog";

interface HistoryDataTableProps {
  data: AdminHistory[];
}

export function HistoryDataTable({ data }: HistoryDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (conversationId: string) => {
    startTransition(async () => {
      try {
        const result = await deleteHistory(conversationId);
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

  const columns: ColumnDef<AdminHistory>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const history = row.original;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-8 h-8 flex-shrink-0">
              {history.gpt.image && history.gpt.image !== "default-avatar.png" ? (
                <Image
                  src={history.gpt.image}
                  alt={history.gpt.name}
                  fill
                  className="rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate" title={history.title}>
                {history.title}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                with {history.gpt.name}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const history = row.original;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {getInitials(history.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {history.user.name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {history.user.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "_count.messages",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Messages
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const count = row.getValue("_count.messages") as number;
        return (
          <Badge variant="secondary" className="gap-1">
            <MessageCircle className="w-3 h-3" />
            {count}
          </Badge>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Last Updated
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.getValue("updatedAt") as Date;
        return (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span>{formatDate(date)}</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const history = row.original;
        return (
          <div className="flex items-center gap-2">
            <ConversationPreviewDialog history={history}>
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </ConversationPreviewDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={`/admin/gpts/${history.gpt.id}/chat?conversation=${history.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Open in Chat
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(history.id)}
                  className="text-destructive"
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="pl-8"
          />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No conversations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

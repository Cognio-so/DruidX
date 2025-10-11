"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable, UserAvatar, RelativeTime, ActionsDropdown } from "./data-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Bot, User } from "lucide-react";

interface RecentActivity {
  recentConversations: Array<{
    id: string;
    createdAt: Date;
    user: {
      name: string | null;
      email: string | null;
    };
    gpt: {
      name: string;
      image: string | null;
    };
    _count: {
      messages: number;
    };
  }>;
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    createdAt: Date;
  }>;
  recentGpts: Array<{
    id: string;
    name: string;
    image: string | null;
    createdAt: Date;
    user: {
      name: string | null;
    };
    _count: {
      conversations: number;
    };
  }>;
}

export function RecentActivityTable({ data }: { data: RecentActivity }) {
  const conversationColumns: ColumnDef<RecentActivity['recentConversations'][0]>[] = [
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => (
        <UserAvatar user={row.getValue("user")} />
      ),
    },
    {
      accessorFn: (row) => row.gpt.name,
      id: "gptName",
      header: "GPT",
      cell: ({ row }) => {
        const gpt = row.original.gpt;
        return (
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={gpt.image || undefined} />
              <AvatarFallback>
                <Bot className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{gpt.name}</span>
          </div>
        );
      },
    },
    {
      accessorFn: (row) => row._count.messages,
      id: "messageCount",
      header: "Messages",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.getValue("messageCount")} messages
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <RelativeTime date={row.getValue("createdAt")} />
      ),
    },
  ];

  const userColumns: ColumnDef<RecentActivity['recentUsers'][0]>[] = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => (
        <UserAvatar user={row.original} />
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.getValue("role") === "admin" ? "default" : "secondary"}>
          {row.getValue("role")}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => (
        <RelativeTime date={row.getValue("createdAt")} />
      ),
    },
  ];

  const gptColumns: ColumnDef<RecentActivity['recentGpts'][0]>[] = [
    {
      accessorKey: "name",
      header: "GPT",
      cell: ({ row }) => {
        const gpt = row.original;
        return (
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={gpt.image || undefined} />
              <AvatarFallback>
                <Bot className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{gpt.name}</span>
          </div>
        );
      },
    },
    {
      accessorFn: (row) => row.user.name,
      id: "createdBy",
      header: "Created By",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("createdBy") || "Unknown"}</span>
        </div>
      ),
    },
    {
      accessorFn: (row) => row._count.conversations,
      id: "conversationCount",
      header: "Usage",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.getValue("conversationCount")} conversations
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <RelativeTime date={row.getValue("createdAt")} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        columns={conversationColumns}
        data={data.recentConversations}
        title="Recent Conversations"
        description="Latest conversations across all GPTs"
        searchKey="gptName"
      />
      
      <DataTable
        columns={userColumns}
        data={data.recentUsers}
        title="Recent Users"
        description="Newly registered users"
        searchKey="name"
      />
      
      <DataTable
        columns={gptColumns}
        data={data.recentGpts}
        title="Recent GPTs"
        description="Recently created GPTs"
        searchKey="name"
      />
    </div>
  );
}

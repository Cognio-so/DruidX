"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface TeamsFilterProps {
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  onClearFilters: () => void;
}

export default function TeamsFilter({
  roleFilter,
  onRoleFilterChange,
  onClearFilters,
}: TeamsFilterProps) {
  const hasActiveFilters = roleFilter !== "all";

  return (
    <div className="flex items-center gap-2">
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-8 px-2 lg:px-3"
        >
          Clear filters
        </Button>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Filter className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Filter
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[150px]">
          <DropdownMenuItem onClick={() => onRoleFilterChange("all")}>
            All Roles
            {roleFilter === "all" && <Badge variant="secondary" className="ml-auto">Active</Badge>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRoleFilterChange("admin")}>
            Admin
            {roleFilter === "admin" && <Badge variant="secondary" className="ml-auto">Active</Badge>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRoleFilterChange("user")}>
            User
            {roleFilter === "user" && <Badge variant="secondary" className="ml-auto">Active</Badge>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

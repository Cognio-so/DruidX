"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TeamsSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function TeamsSearch({ searchTerm, onSearchChange }: TeamsSearchProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        placeholder="Search by name or email..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 w-full"    
      />
    </div>
  );
}

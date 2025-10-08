"use client";

import { toast } from "sonner";
import InviteMember from "./invite-member";
import TeamsSearch from "./teams-search";
import TeamsFilter from "./teams-filter";

interface TeamsHeaderProps {
  searchTerm: string;
  roleFilter: string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (role: string) => void;
  onClearFilters: () => void;
}

export default function TeamsHeader({
  searchTerm,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
  onClearFilters,
}: TeamsHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
            Teams
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage team members and their access permissions
          </p>
        </div>
        <div className="flex-shrink-0">
          <InviteMember onInviteSent={(email, role) => {
            toast.success(`Invitation sent to ${email} as ${role}`)
          }} />
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <TeamsSearch searchTerm={searchTerm} onSearchChange={onSearchChange} />
        <TeamsFilter
          roleFilter={roleFilter}
          onRoleFilterChange={onRoleFilterChange}
          onClearFilters={onClearFilters}
        />
      </div>
    </div>
  );
}

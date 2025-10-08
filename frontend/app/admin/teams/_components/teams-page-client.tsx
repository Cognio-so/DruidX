"use client";

import { useState } from "react";
import { TeamMember } from "@/data/get-team-members";
import TeamsHeader from "./teams-header";
import TeamsTable from "./teams-table";

interface TeamsPageClientProps {
  teamMembers: TeamMember[];
}

export default function TeamsPageClient({ teamMembers }: TeamsPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleClearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  return (
    <>
      <TeamsHeader
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        onSearchChange={setSearchTerm}
        onRoleFilterChange={setRoleFilter}
        onStatusFilterChange={setStatusFilter}
        onClearFilters={handleClearFilters}
      />
      
      <TeamsTable
        teamMembers={teamMembers}
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
      />
    </>
  );
}

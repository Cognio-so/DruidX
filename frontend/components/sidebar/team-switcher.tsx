"use client";

import * as React from "react";
import { useSidebar } from "@/components/ui/sidebar";
import Image from "next/image";
import logo from "@/public/EMSA logo.png";

interface TeamSwitcherProps {
  showName?: boolean;
}

export function TeamSwitcher({
  showName = true,
}: TeamSwitcherProps) {
  const { state } = useSidebar();
  const isExpanded = state === "expanded";

  return (
    <div className="flex items-center justify-between w-full px-2 py-2">
      <div className="flex items-center gap-2">
        <Image
          src={logo}
          alt="EMSA Logo"
          className={`rounded-full transition-all duration-300 ${
            isExpanded ? "w-8 h-8" : "w-6 h-6"
          }`}
        />
        {showName && isExpanded && (
          <span className="text-sm font-semibold text-sidebar-foreground transition-opacity duration-300">
            EMSA
          </span>
        )}
      </div>
    </div>
  );
}

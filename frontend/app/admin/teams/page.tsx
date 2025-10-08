import { buttonVariants } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default function TeamsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl lg-text-4xl font-bold text-primary">
            Teams
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage team members and their access permissions
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link
            href={"/admin/teams/invite"}
            className={buttonVariants({
              variant: "outline",
              className: "w-full sm:w-auto",
            })}
          >
            <PlusIcon className="size-4 mr-2 text-primary" />
            <span className="hidden sm:inline">Invite Member</span>
            <span className="sm:hidden">Invite Member</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

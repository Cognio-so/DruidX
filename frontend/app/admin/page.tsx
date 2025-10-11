import { buttonVariants } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { DashboardOverview } from "./_components/dashboard-overview";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your platform&apos;s performance and user activity
          </p>
        </div>
        <Link
          href="/admin/gpts/create-gpt"
          className={buttonVariants({
            variant: "default",
            className: "inline-flex items-center gap-2",
          })}
        >
          <PlusIcon className="w-4 h-4" />
          Create GPT
        </Link>
      </div>


      {/* Main Dashboard Content */}
      <div className="px-6">
        <DashboardOverview />
      </div>
    </div>
  );
}

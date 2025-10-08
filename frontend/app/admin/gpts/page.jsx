import { Suspense } from "react";
import { GptsList } from "./_components/gpts-list";
import { GptsLoading } from "./_components/gpts-loading";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function GptsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
            GPT Collection
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage and organize your custom GPTs
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link
            href="/admin/gpts/create-gpt"
            className={buttonVariants({
              variant: "outline",
              className: "w-full sm:w-auto",
            })}
          >
            <Plus className="w-4 h-4 mr-2 text-primary" />
            <span className="hidden sm:inline">Create New GPT</span>
            <span className="sm:hidden">Create GPT</span>
          </Link>
        </div>
      </div>

      <Suspense fallback={<GptsLoading />}>
        <GptsList />
      </Suspense>
    </div>
  );
}

import { CreateGptForm } from "./_components/create-gpt-form";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export default function Gpt() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4 justify-between">
          <h1 className="text-3xl font-bold">Create Custom GPT</h1>
          <Link
            href="/admin/gpts"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeftIcon className="size-4 mr-2" />
            Back
          </Link>
        </div>
      </div>

      <CreateGptForm />
    </div>
  );
}

import { buttonVariants } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="flex items-center justify-between p-6">
      <h1 className="text-2xl text-primary font-semibold">Admin Dashboard</h1>

      <Link
        href="/admin/gpts/create-gpt"
        className={buttonVariants({
          variant: "outline",
          className: "inline-flex items-center gap-2",
        })}
      >
        <PlusIcon className="w-4 h-4 text-primary" />
        Create GPT
      </Link>
    </div>
  );
}

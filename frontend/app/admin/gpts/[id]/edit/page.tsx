import { EditGptForm } from "./_components/edit-gpt-form";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { getGptById } from "./action";
import { notFound } from "next/navigation";

interface EditGptPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGptPage({ params }: EditGptPageProps) {
  const { id } = await params;
  
  // Fetch GPT data on the server
  const result = await getGptById(id);
  
  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4 justify-between">
          <h1 className="text-3xl font-bold">Edit Custom GPT</h1>
          <Link
            href="/admin/gpts"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeftIcon className="size-4 mr-2" />
            Back
          </Link>
        </div>
      </div>

      <EditGptForm gptId={id} initialData={result.data} />
    </div>
  );
}
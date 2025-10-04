import { GetGpts } from "@/data/admin/get-gpts";
import GptCard from "./_components/GptCard";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Sparkle } from "lucide-react";

export default async function GptPage() {
  const data = await GetGpts();
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Your Gpts</h1>
        <Link href="/admin/gpt/create" className={buttonVariants()}>
          <Sparkle className="size-4" />
          Create Gpt
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.map((gpt) => (
          <div key={gpt.id} className="p-0 m-0">
            <GptCard data={gpt} />
          </div>
        ))}
      </div>
    </div>
  );
}

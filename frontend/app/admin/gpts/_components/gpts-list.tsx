import { getGpts } from "@/data/get-gpts";
import { GptCard } from "./gpt-card";

export async function GptsList() {
  const gpts = await getGpts();

  if (gpts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No GPTs found</h3>
          <p className="text-gray-500 mt-2">
            Create your first GPT to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {gpts.map((gpt) => (
        <GptCard key={gpt.id} gpt={gpt} />
      ))}
    </div>
  );
}

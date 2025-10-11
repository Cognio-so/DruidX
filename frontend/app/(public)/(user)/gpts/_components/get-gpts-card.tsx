import { getUserAssignedGpts } from "@/data/get-user-assigned-gpts";
import { UserAssignedGptCard } from "./user-assigned-gpt-card";
import { requireUser } from "@/data/requireUser";

export default async function GetGptsCard() {
  const { user } = await requireUser();
  
  const assignedGpts = await getUserAssignedGpts(user.id);

  if (assignedGpts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">No GPTs Assigned</h3>
        <p className="text-primary max-w-sm">
          You don&apos;t have any GPTs assigned to you yet. Contact your administrator to get access to GPTs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Assigned GPTs</h1>
          <p className="text-muted-foreground mt-1">
            {assignedGpts.length} GPT{assignedGpts.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedGpts.map((assignedGpt) => (
          <UserAssignedGptCard
            key={assignedGpt.id}
            assignedGpt={assignedGpt}
          />
        ))}
      </div>
    </div>
  );
}
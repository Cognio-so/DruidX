import { getAdminHistory } from "@/data/get-admin-history";
import { HistoryDataTable } from "./history-data-table";

export default async function HistoryList() {
  const conversations = await getAdminHistory();

  if (conversations.length === 0) {
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">No Conversations Yet</h3>
        <p className="text-muted-foreground max-w-sm">
          No conversation history found. Conversations will appear here once users start chatting with GPTs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 ">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Conversation History</h1>
          <p className="text-muted-foreground mt-1">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      <HistoryDataTable data={conversations} />
    </div>
  );
}
"use client";

import ChatHeader from "./_components/ChatHeader";
import ChatInput from "./_components/ChatInput";
import ChatMessage from "./_components/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatSession } from "@/hooks/use-chat-session";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface GptData {
  id: string;
  name: string;
  image: string;
  description: string;
}

export default function ChatGptById() {
  const params = useParams();
  const gptId = params.id as string;
  const { sessionId, uploadDocument, hybridRag } = useChatSession();
  const { messages, isLoading, sendMessage } = useChatMessages(sessionId);
  const [gptData, setGptData] = useState<GptData | null>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    const fetchGptData = async () => {
      try {
        if (gptId) {
          const response = await fetch(`/api/gpts/${gptId}`);
          if (response.ok) {
            const gpt = await response.json();
            setGptData({
              id: gpt.id,
              name: gpt.name,
              image: gpt.image,
              description: gpt.description
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch GPT data:', error);
      }
    };

    fetchGptData();
  }, [gptId]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-2 bg-background">
        <ChatHeader 
          gptName={gptData?.name}
          gptImage={gptData?.image}
        />
      </div>

      {hasMessages && (
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full p-2">
            <div className="space-y-2">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg.content}
                  isUser={msg.role === 'user'}
                  timestamp={new Date(msg.timestamp).toLocaleTimeString()}
                  isStreaming={msg.isStreaming}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div
        className={`${
          hasMessages
            ? "flex-shrink-0 p-2 bg-background"
            : "flex-1 flex flex-col items-center justify-center p-4"
        }`}
      >
        {!hasMessages && (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold text-primary">
              What can I help with?
            </h1>
          </div>
        )}
        <ChatInput
          onSendMessage={sendMessage}
          onDocumentUploaded={uploadDocument}
          hasMessages={hasMessages}
          isLoading={isLoading}
          hybridRag={hybridRag}
        />
      </div>
    </div>
  );
}

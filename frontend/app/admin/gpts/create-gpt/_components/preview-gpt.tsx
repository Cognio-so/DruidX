"use client";

import { Button } from "@/components/ui/button";
import { GeorgianLariIcon, Globe2, PlusIcon } from "lucide-react";
import { GptFormValues } from "@/lib/zodSchema";

type PreviewGptProps = {
  data: GptFormValues;
};

export function PreviewGpt({ data }: PreviewGptProps) {
  const {
    gptName,
    gptDescription,
    model,
    webSearch,
    mcp,
    docs,
    imageUrl,
  } = data;

  return (
    <div className="min-h-[600px] bg-background rounded-xl p-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold">Preview</h2>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 py-12">
        {/* GPT Avatar */}
        <div className="mb-6">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={gptName || "GPT Avatar"}
              className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
            </div>
          )}
        </div>

        {/* GPT Name */}
        <h1 className="text-3xl font-bold mb-4 text-center">
          {gptName || "My Custom GPT"}
        </h1>

        {/* GPT Description */}
        <p className="text-lg text-gray-300 text-center max-w-md mb-8">
          {gptDescription || "A helpful assistant that can answer questions about various topics."}
        </p>

        {/* Configuration Details */}
        <div className="bg-white/5 rounded-lg p-4 mb-8 w-full max-w-md">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Model:</span>
              <span className="text-white font-medium">{model}</span>
            </div>
            {webSearch && (
              <div className="flex justify-between">
                <span className="text-gray-400">Web Search:</span>
                <span className="text-green-400"><Globe2 className="size-4"/></span>
              </div>
            )}
            {mcp && (
              <div className="flex justify-between">
                <span className="text-gray-400">MCP:</span>
                <span className="text-blue-400"><GeorgianLariIcon className="size-4"/></span>
              </div>
            )}
            {docs.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Documents:</span>
                <span className="text-yellow-400">{docs.length} files</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className="mt-auto">
        <div className="flex items-center gap-3 bg-muted/20 rounded-full p-3">
          <input
            type="text"
            placeholder="Ask anything"
            className="flex-1 bg-transparent text-foreground outline-none"
            disabled
          />
          <Button
            size="icon"
            className="bg-muted/80 hover:bg-muted/30 text-foreground border-0"
            disabled
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

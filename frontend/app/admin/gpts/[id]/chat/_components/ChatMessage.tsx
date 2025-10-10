"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, User, ExternalLink } from "lucide-react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";

interface UploadedDoc {
  url: string;
  filename: string;
  type: string;
}

interface Source {
  href: string;
  title: string;
}

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: string;
  isStreaming?: boolean;
  uploadedDocs?: UploadedDoc[];
  sources?: Source[];
}

export default function ChatMessage({
  message,
  isUser,
  timestamp,
  isStreaming = false,
  uploadedDocs = [],
  sources = [],
}: ChatMessageProps) {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type === 'text/markdown') return '📋';
    if (type === 'application/json') return '📊';
    return '📄';
  };

  const getFileTypeLabel = (type: string) => {
    if (type.startsWith('image/')) return 'Image';
    if (type === 'application/pdf') return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'Word';
    if (type === 'text/markdown') return 'Markdown';
    if (type === 'application/json') return 'JSON';
    return 'File';
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <Message from={isUser ? "user" : "assistant"}>
        {isUser ? (
          <>
            <MessageContent variant="flat">
              <div className="space-y-2">
                {uploadedDocs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedDocs.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-2 py-1 text-xs"
                      >
                        <span className="text-sm">{getFileIcon(doc.type)}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate max-w-[100px]" title={doc.filename}>
                            {doc.filename}
                          </span>
                          <span className="text-xs opacity-70">
                            {getFileTypeLabel(doc.type)}
                          </span>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <Response>{message}</Response>
                {isStreaming && (
                  <span className="inline-block animate-pulse ml-1">⚪</span>
                )}
                <div className="text-xs mt-1 opacity-70 text-muted-foreground">
                  {timestamp}
                </div>
              </div>
            </MessageContent>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback><User className="size-4 text-primary"/></AvatarFallback>
            </Avatar>
          </>
        ) : (
          <MessageContent variant="flat">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src="/api/placeholder/32/32" />
                <AvatarFallback><Sparkles className="size-4 text-primary"/></AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="max-w-[95%] bg-muted/60 border border-border rounded-lg px-4 py-3">
                  <Response>{message}</Response>
                  {isStreaming && (
                    <span className="inline-block animate-pulse ml-1">⚪</span>
                  )}
                  <div className="text-xs mt-1 opacity-70 text-muted-foreground">
                    {timestamp}
                  </div>
                </div>
                
                {/* Sources Component for AI responses */}
                {sources.length > 0 && (
                  <div className="mt-3">
                    <Sources>
                      <SourcesTrigger count={sources.length} />
                      <SourcesContent>
                        {sources.map((source, index) => (
                          <Source 
                            href={source.href} 
                            key={index} 
                            title={source.title}
                          />
                        ))}
                      </SourcesContent>
                    </Sources>
                  </div>
                )}
              </div>
            </div>
          </MessageContent>
        )}
      </Message>
    </div>
  );
}
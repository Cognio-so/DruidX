"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Sparkles, User, ExternalLink } from "lucide-react";
import Markdown from "@/components/ui/markdown";

interface UploadedDoc {
  url: string;
  filename: string;
  type: string;
}

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: string;
  isStreaming?: boolean;
  uploadedDocs?: UploadedDoc[];
}

export default function ChatMessage({
  message,
  isUser,
  timestamp,
  isStreaming = false,
  uploadedDocs = [],
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
    <div
      className={cn(
        "flex gap-3 p-4 max-w-4xl mx-auto overflow-hidden",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src="/api/placeholder/32/32" />
          <AvatarFallback><Sparkles className="size-4 text-primary"/></AvatarFallback>
        </Avatar>
      )}
      
      {isUser ? (
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary text-primary-foreground overflow-hidden">
          {uploadedDocs.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedDocs.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg px-2 py-1 text-xs"
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
                    className="text-primary-foreground/70 hover:text-primary-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
          <div className="text-sm">
            <Markdown content={message} />
            {isStreaming && (
              <span className="inline-block animate-pulse ml-1">⚪</span>
            )}
          </div>
          <div className="text-xs mt-1 opacity-70 text-primary-foreground/70">
            {timestamp}
          </div>
        </div>
      ) : (
        <div className="max-w-[80%] flex-1 overflow-hidden">
          <div className="text-base text-foreground">
            <Markdown content={message} />
            {isStreaming && (
              <span className="inline-block animate-pulse ml-1">⚪</span>
            )}
          </div>
          <div className="text-xs mt-1 opacity-70 text-muted-foreground">
            {timestamp}
          </div>
        </div>
      )}
      
      {isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src="/api/placeholder/32/32" />
          <AvatarFallback><User className="size-4 text-primary"/></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
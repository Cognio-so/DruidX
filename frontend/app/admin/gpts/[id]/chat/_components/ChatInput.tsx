"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, Globe, Paperclip, Sparkle, Telescope, X } from "lucide-react";
import { useState, useRef } from "react";

interface ChatInputProps {
  onSendMessage: (message: string, options: {
    web_search?: boolean;
    rag?: boolean;
    deep_search?: boolean;
    uploaded_doc?: boolean;
    uploaded_docs?: UploadedDoc[];
  }) => void;
  onDocumentUploaded?: (url: string, filename: string) => void;
  hasMessages: boolean;
  isLoading?: boolean;
  hybridRag?: boolean;
}

interface UploadedDoc {
  url: string;
  filename: string;
  type: string;
}

const models = [
  {
    name: "o3-mini",
    value: "o3-mini",
  },
  {
    name: "gpt-4o",
    value: "gpt-4o",
  },
  {
    name: "gpt-5",
    value: "gpt-5",
  },
];

export default function ChatInput({
  onSendMessage,
  onDocumentUploaded,
  hasMessages,
  isLoading = false,
  hybridRag = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("o3-mini");
  const [webSearch, setWebSearch] = useState(false);
  const [deepSearch, setDeepSearch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim(), {
        web_search: webSearch,
        rag: hybridRag,
        deep_search: deepSearch,
        uploaded_doc: uploadedDocs.length > 0,
        uploaded_docs: uploadedDocs,
      });
      setMessage("");
      setUploadedDocs([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const uploadToS3 = async (file: File): Promise<string> => {
    const response = await fetch("/api/s3/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get upload URL");
    }

    const { uploadUrl, fileUrl } = await response.json();

    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
    });

    return fileUrl;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/markdown",
      "application/json",
    ];

    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowed) {
      alert("Please upload a PDF, Word document, Markdown, JSON, or image file.");
      return;
    }

    setIsUploading(true);
    try {
      const fileUrl = await uploadToS3(file);
      const newDoc: UploadedDoc = {
        url: fileUrl,
        filename: file.name,
        type: file.type
      };
      
      setUploadedDocs(prev => [...prev, newDoc]);
      onDocumentUploaded?.(fileUrl, file.name);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
  };

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
    <div className={`w-full max-w-4xl mx-auto ${hasMessages ? "" : "px-4"}`}>
      {uploadedDocs.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {uploadedDocs.map((doc, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
            >
              <span className="text-lg">{getFileIcon(doc.type)}</span>
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate max-w-[120px]" title={doc.filename}>
                  {doc.filename}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getFileTypeLabel(doc.type)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                onClick={() => removeDocument(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="relative bg-muted/20 rounded-3xl shadow-sm border border-border overflow-hidden">
        <div className="p-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything..."
            disabled={isLoading}
            className="w-full min-h-[50px] resize-none outline-none text-lg leading-snug bg-transparent placeholder:text-muted-foreground disabled:opacity-50"
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Select value={selectedModel} onValueChange={handleModelChange} disabled={isLoading}>
              <SelectTrigger className="h-7 px-2 rounded-full text-sm border-border bg-muted hover:bg-accent focus:ring-0 focus:ring-offset-0">
                <div className="flex items-center gap-2">
                  <Sparkle className="size-4 text-primary" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex items-center gap-2">
                      {model.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={webSearch ? "default" : "outline"}
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setWebSearch(!webSearch)}
              disabled={isLoading}
            >
              <Globe className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={deepSearch ? "default" : "outline"}
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setDeepSearch(!deepSearch)}
              disabled={isLoading}
            >
              <Telescope className="size-4"/>
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-full"
              disabled={isLoading || isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>

            <Button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              size="icon"
              className="h-7 w-7 rounded-full"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

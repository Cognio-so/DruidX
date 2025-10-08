"use client";

import {
  AlertCircleIcon,
  CloudUploadIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  VideoIcon,
  XIcon,
  Loader2,
} from "lucide-react";

import { formatBytes } from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useRef } from "react";

type DocsUploaderProps = {
  value: string[]; 
  onChange: (urls: string[]) => void;
};

type UploadingFile = {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  url?: string;
};

const getFileIcon = (fileName: string, fileType?: string) => {
  const type = fileType || "";
  const name = fileName.toLowerCase();

  if (
    type.includes("pdf") ||
    name.endsWith(".pdf") ||
    type.includes("word") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />;
  } else if (
    type.includes("zip") ||
    type.includes("archive") ||
    name.endsWith(".zip") ||
    name.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />;
  } else if (
    type.includes("excel") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />;
  } else if (type.includes("video/")) {
    return <VideoIcon className="size-4 opacity-60" />;
  } else if (type.includes("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />;
  } else if (type.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />;
  }
  return <FileIcon className="size-4 opacity-60" />;
};

export default function DocsUploader({ value, onChange }: DocsUploaderProps) {
  const maxSize = 100 * 1024 * 1024; // 100MB
  const maxFiles = 10;
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadToS3 = async (file: File, onProgress: (progress: number) => void): Promise<string> => {
    // Step 1: Get presigned URL from your API
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

    // Step 2: Upload file to S3 using XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          onProgress(100);
          resolve(fileUrl);
        } else {
          reject(new Error("Upload failed"));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  };

  const deleteFromS3 = async (url: string) => {
    const key = url.split("/").pop();
    if (!key) return;

    const response = await fetch("/api/s3/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete file");
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`;
    }

    // Check file type restrictions from your API
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
      return `File "${file.name}" is not an accepted file type.`;
    }

    return null;
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newErrors: string[] = [];

    // Check if adding these files would exceed maxFiles
    if (value.length + fileArray.length > maxFiles) {
      newErrors.push(`You can only upload a maximum of ${maxFiles} files.`);
      setErrors(newErrors);
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    }

    if (validFiles.length === 0) return;

    // Start uploading valid files
    const newUploadingFiles: UploadingFile[] = validFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload files concurrently
    const uploadPromises = newUploadingFiles.map(async (uploadingFile) => {
      try {
        const url = await uploadToS3(uploadingFile.file, (progress) => {
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id ? { ...f, progress } : f
            )
          );
        });

        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, status: "completed" as const, url }
              : f
          )
        );

        // Add to value after successful upload
        onChange([...value, url]);

        // Remove from uploading files after a delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
        }, 1000);

        return url;
      } catch (error) {
        console.error("Upload error:", error);
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, status: "error" as const }
              : f
          )
        );
        throw error;
      }
    });

    try {
      await Promise.all(uploadPromises);
    } catch (error) {
      // Individual file errors are handled above
    }
  }, [value, onChange, maxFiles, maxSize, validateFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  const removeFile = async (url: string) => {
    try {
      await deleteFromS3(url);
      onChange(value.filter(u => u !== url));
    } catch (error) {
      console.error("Delete error:", error);
      // Still remove from UI even if delete fails
      onChange(value.filter(u => u !== url));
    }
  };

  const clearFiles = async () => {
    // Delete all files from S3
    const deletePromises = value.map(url => deleteFromS3(url));
    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Delete error:", error);
    }
    onChange([]);
  };

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const allFiles = [
    ...value.map((url, index) => ({
      id: `uploaded-${index}`,
      name: url.split("/").pop() || `file-${index}`,
      url,
      size: 0, // We don't have size info for uploaded files
      type: "uploaded" as const,
    })),
    ...uploadingFiles.map(f => ({
      id: f.id,
      name: f.file.name,
      url: f.url,
      size: f.file.size,
      type: f.status, // Remove "as const" here
      progress: f.progress,
    })),
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Drop area */}
      <div
        role="button"
        onClick={openFileDialog}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-dragging={isDragging || undefined}
        className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed p-4 transition-colors has-disabled:pointer-events-none has-disabled:opacity-50 has-[input:focus]:ring-[3px]"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,application/json"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload files"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true"
          >
            <CloudUploadIcon className="size-4 opacity-60" />
          </div>
          <p className="mb-1.5 text-sm font-medium">Upload files</p>
          <p className="text-muted-foreground mb-2 text-xs">
            Drag & drop or click to browse
          </p>
          <div className="text-muted-foreground/70 flex flex-wrap justify-center gap-1 text-xs">
            <span>Images, PDFs, Word docs, Markdown, JSON</span>
            <span>∙</span>
            <span>Max {maxFiles} files</span>
            <span>∙</span>
            <span>Up to {formatBytes(maxSize)}</span>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          className="text-destructive flex items-center gap-1 text-xs"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}

      {/* File list */}
      {allFiles.length > 0 && (
        <div className="space-y-2">
          {allFiles.map((file) => (
            <div
              key={file.id}
              className="bg-background flex items-center justify-between gap-2 rounded-lg border p-2 pe-3"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded border">
                  {getFileIcon(file.name)}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-[13px] font-medium">
                    {file.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {file.size > 0 ? formatBytes(file.size) : "Uploaded"}
                  </p>
                  {file.type === "uploading" && (
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {file.type === "uploading" && (
                  <Loader2 className="size-4 animate-spin text-blue-600" />
                )}
                {file.type === "error" && (
                  <AlertCircleIcon className="size-4 text-red-600" />
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground/80 hover:text-foreground -me-2 size-8 hover:bg-transparent"
                  onClick={() => {
                    if (file.type === "uploading") {
                      removeUploadingFile(file.id);
                    } else if (file.url) {
                      removeFile(file.url);
                    }
                  }}
                  aria-label="Remove file"
                >
                  <XIcon className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}

          {/* Remove all files button */}
          {value.length > 1 && (
            <div>
              <Button size="sm" variant="outline" onClick={clearFiles}>
                Remove all files
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

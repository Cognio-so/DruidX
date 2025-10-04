"use client";

import { useCallback, useEffect, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { Card, CardContent } from "../ui/card";
import { cn } from "@/lib/utils";

import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { useConstructurl } from "../use-construct";
import RenderUploadedState, {
  RenderEmptyState,
  RenderErrorState,
  RenderUploadingState,
} from "./RenderState";

interface UploaderProps {
  value?: string; // key from form
  onFileUpload: (key: string) => void;
}

export function Uploader({ value, onFileUpload }: UploaderProps) {
  const fileUrl = useConstructurl(value || "");
  const [fileState, setFileState] = useState<{
    id: string | null;
    file: File | null;
    uploading: boolean;
    progress: number;
    key?: string;
    isDeleting: boolean;
    error: string | null;
    objectUrl?: string;
    fileType: "image" | "document";
  }>({
    id: null,
    file: null,
    uploading: false,
    progress: 0,
    isDeleting: false,
    error: null,
    fileType: "image",
    objectUrl: fileUrl,
  });

  async function uploadFile(file: File) {
    setFileState((prev) => ({
      ...prev,
      uploading: true,
      progress: 0,
    }));

    try {
      const presignedResponse = await fetch("/api/s3/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error("Failed to get presigned URL");
      }

      const { uploadUrl, key, fileUrl } = await presignedResponse.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentageCompleted = (event.loaded / event.total) * 100;
            setFileState((prev) => ({
              ...prev,
              progress: Math.round(percentageCompleted),
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            setFileState((prev) => ({
              ...prev,
              progress: 100,
              uploading: false,
              key,
              objectUrl: fileUrl,
            }));
            toast.success("File uploaded successfully");

            onFileUpload(key); // ✅ push key to form

            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    } catch (error) {
      toast.error((error as Error).message || "Failed to upload file");
      setFileState((prev) => ({
        ...prev,
        uploading: false,
        progress: 0,
        error: (error as Error).message || "Failed to upload file",
      }));
    }
  }

  async function handleRemoveFile() {
    if (fileState.isDeleting || !fileState.key) return;

    try {
      setFileState((prev) => ({ ...prev, isDeleting: true }));

      const response = await fetch("/api/s3/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: fileState.key }),
      });

      if (!response.ok) {
        toast.error("Failed to remove file from storage");
        setFileState((prev) => ({
          ...prev,
          isDeleting: false,
          error: "Error deleting file",
        }));
        return;
      }

      if (fileState.objectUrl && !fileState.objectUrl.startsWith("http")) {
        URL.revokeObjectURL(fileState.objectUrl);
      }

      setFileState({
        file: null,
        uploading: false,
        progress: 0,
        objectUrl: undefined,
        error: null,
        fileType: "image",
        id: null,
        isDeleting: false,
        key: undefined,
      });

      toast.success("File deleted successfully");

      onFileUpload(""); // ✅ clear value from form
    } catch (error) {
      toast.error("Error removing file, try again");
      setFileState((prev) => ({ ...prev, isDeleting: false, error: "true" }));
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        if (fileState.objectUrl && !fileState.objectUrl.startsWith("http")) {
          URL.revokeObjectURL(fileState.objectUrl);
        }

        setFileState({
          file,
          uploading: false,
          progress: 0,
          id: uuidv4(),
          objectUrl: URL.createObjectURL(file),
          error: null,
          isDeleting: false,
          fileType: file.type.startsWith("image/") ? "image" : "document",
        });

        uploadFile(file);
      }
    },
    [fileState.objectUrl]
  );

  function rejectedFiles(fileRejection: FileRejection[]) {
    if (fileRejection.length) {
      const tooManyFiles = fileRejection.find(
        (rejection) => rejection.errors[0].code === "too-many-files"
      );
      const fileTooLarge = fileRejection.find(
        (rejection) => rejection.errors[0].code === "file-too-large"
      );

      if (fileTooLarge) toast.error("File is too large. Max 50MB");
      if (tooManyFiles) toast.error("Only 1 file is allowed");
    }
  }

  useEffect(() => {
    return () => {
      if (fileState.objectUrl && !fileState.objectUrl.startsWith("http")) {
        URL.revokeObjectURL(fileState.objectUrl);
      }
    };
  }, [fileState.objectUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "application/pdf": [],
      "application/msword": [],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [],
      "text/markdown": [],
      "application/json": [],
    },
    maxFiles: 1,
    multiple: false,
    maxSize: 50 * 1024 * 1024,
    onDropRejected: rejectedFiles,
    disabled: fileState.uploading || !!fileState.objectUrl,
  });

  function renderContent() {
    if (fileState.uploading) {
      return (
        <RenderUploadingState
          progress={fileState.progress}
          file={fileState.file as File}
        />
      );
    }
    if (fileState.error) {
      return <RenderErrorState error={fileState.error} />;
    }
    if (fileState.objectUrl) {
      return (
        <div className="text-center">
          <RenderUploadedState
            previewUrl={fileState.objectUrl}
            handleRemoveFile={handleRemoveFile}
            isDeleting={fileState.isDeleting}
            fileType={fileState.fileType}
          />
        </div>
      );
    }
    return <RenderEmptyState isDragActive={isDragActive} />;
  }

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "relative border-2 border-dashed transition-colors duration-200 ease-in-out w-full h-64",
        isDragActive
          ? "border-primary bg-primary/10 border-solid"
          : "border-border hover:border-primary"
      )}
    >
      <CardContent className="flex items-center justify-center h-full w-full p-4">
        <input {...getInputProps()} />
        {renderContent()}
      </CardContent>
    </Card>
  );
}

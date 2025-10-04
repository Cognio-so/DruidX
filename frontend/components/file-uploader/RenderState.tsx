import { cn } from "@/lib/utils";
import { CloudUploadIcon, ImageIcon, Loader2, XIcon } from "lucide-react";
import { Button } from "../ui/button";
import Image from "next/image";

export function RenderEmptyState({ isDragActive }: { isDragActive: boolean }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center mx-auto size-12 rounded-full bg-muted mb-4">
        <CloudUploadIcon
          className={cn(
            "size-6 text-muted-foreground",
            isDragActive && "text-primary"
          )}
        />
      </div>
      <p className="text-base font-semibold text-muted-foreground">
        Drop your files here or{" "}
        <span className="text-primary font-bold cursor-pointer">
          Click to upload
        </span>
      </p>
      <Button type="button" className="mt-4">
        Select file
      </Button>
    </div>
  );
}

export function RenderErrorState({ error }: { error: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center mx-auto size-12 rounded-full bg-destructive/30 mb-4">
        <ImageIcon className="size-6 text-destructive" />
      </div>
      <p className="text-base font-semibold">Upload Failed</p>
      <p className="text-sm mt-1 text-muted-foreground">{error}</p>
      <Button type="button" className="mt-4">
        Select again
      </Button>
    </div>
  );
}

export default function RenderUploadedState({
  previewUrl,
  isDeleting,
  handleRemoveFile,
  fileType,
}: {
  previewUrl: string;
  isDeleting: boolean;
  handleRemoveFile: () => void;
  fileType: "image" | "document";
}) {
  // Don't render if previewUrl is empty or invalid
  if (!previewUrl || previewUrl.trim() === '') {
    return null;
  }

  return (
    <div className="relative">
      {fileType === "image" ? (
        <Image
          src={previewUrl}
          alt="Uploaded File"
          width={32}
          height={32}
          className="object-contain p-2 rounded"
        />
      ) : (
        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
          <span className="text-xs font-medium">📄</span>
        </div>
      )}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-4 right-4"
        onClick={handleRemoveFile}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <XIcon className="size-4 cursor-pointer" />
        )}
      </Button>
    </div>
  );
}

export function RenderUploadingState({
  progress,
  file,
}: {
  progress: number;
  file: File;
}) {
  return (
    <div className="text-center flex flex-col justify-center items-center">
      <p className="">{progress}</p>
      <p className="mt-2 text-sm font-medium text-foreground">Uploading...</p>

      <p className="mt-1 text-sm text-muted-foreground truncate max-w-xs">
        {file.name}
      </p>
    </div>
  );
}

"use client";

import { CloudUploadIcon, Loader2, X } from "lucide-react";
import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

type ImageUploaderProps = {
  value?: string; // S3 URL of uploaded image
  onChange?: (url: string | null) => void; // Callback when image changes
};

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadToS3 = async (file: File): Promise<string> => {
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
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          setUploadProgress(100);
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
    // Extract key from URL
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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to S3
      const uploadedUrl = await uploadToS3(file);
      
      // Update preview with S3 URL
      setPreview(uploadedUrl);
      onChange?.(uploadedUrl);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = async () => {
    if (preview && preview.startsWith("http")) {
      try {
        await deleteFromS3(preview);
      } catch (error) {
        console.error("Delete error:", error);
        // Continue with removal even if delete fails
      }
    }
    
    setPreview(null);
    onChange?.(null);
  };

  return (
    <div className="flex flex-col items-center">
      <label
        htmlFor="imageUpload"
        className={`relative w-32 h-32 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden hover:border-gray-600 transition ${
          uploading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {preview ? (
          <Image
            src={preview}
            alt="Preview"
            width={128}
            height={128}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span className="border-border text-sm text-center">
            <CloudUploadIcon className="size-6 text-muted-foreground" />
          </span>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
            <div className="text-center text-white">
              <Loader2 className="size-6 animate-spin mx-auto mb-1" />
              <div className="text-xs">{Math.round(uploadProgress)}%</div>
            </div>
          </div>
        )}
        
        <input
          id="imageUpload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>
      
      {preview && (
        <Button
          onClick={handleRemove}
          disabled={uploading}
          variant="destructive"
          size="sm"
          className="mt-3"
        >
          <X className="size-3 mr-1" />
          Remove
        </Button>
      )}
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "@/lib/S3Client";
import { requireUser } from "@/data/requireUser";

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function POST(req: NextRequest) {
  const session = await requireUser();

  try {
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, fileType } = await req.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 }
      );
    }

    if (!fileType.startsWith("image/") && 
        !fileType.startsWith("application/pdf") && 
        !fileType.startsWith("application/msword") && 
        !fileType.startsWith("application/vnd.openxmlformats-officedocument.wordprocessingml.document") && 
        !fileType.startsWith("text/markdown") && 
        !fileType.startsWith("application/json")) {
      return NextResponse.json(
        { error: "Only images, PDFs, Word docs, Markdown, and JSON files allowed" },
        { status: 400 }
      );
    }

    const key = `${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 60 });

    return NextResponse.json({
      uploadUrl: signedUrl,
      fileUrl: `${PUBLIC_URL}/${key}`,
      key,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to create presigned URL" },
      { status: 500 }
    );
  }
}

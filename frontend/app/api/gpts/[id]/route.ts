import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/data/requireUser";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();

    const { id } = await params;

    const gpt = await prisma.gpt.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        model: true,
        instruction: true,
        webBrowser: true,
        hybridRag: true,
        mcp: true,
        mcpSchema: true,
        image: true,
        knowledgeBase: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!gpt) {
      return NextResponse.json({ error: "GPT not found" }, { status: 404 });
    }

    return NextResponse.json(gpt);
  } catch (error) {
    console.error("Error fetching GPT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

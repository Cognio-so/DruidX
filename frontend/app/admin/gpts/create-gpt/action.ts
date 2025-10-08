"use server";

import { requireUser } from "@/data/requireUser";
import prisma from "@/lib/prisma";
import { gptSchema } from "@/lib/zodSchema";

const modelMapping: Record<string, string> = {
  "gpt-4": "gpt_4",
  "gpt-4o": "gpt_4o",
  "gpt-5": "gpt_5",
};

export async function createGpt(data: {
  gptName: string;
  gptDescription: string;
  model: string;
  instructions: string;
  webSearch: boolean;
  hybridRag: boolean; // Added hybridRag field
  mcp: boolean;
  mcpSchema?: string;
  docs: string[];
  imageUrl?: string;
}) {
  const session = await requireUser();

  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const validation = gptSchema.safeParse(data);

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.message,
      };
    }

    const validatedData = validation.data;

    const processedData = {
      userId: session.user.id,
      name: validatedData.gptName,
      description: validatedData.gptDescription,
      model: modelMapping[validatedData.model] as any,
      instruction: validatedData.instructions,
      webBrowser: validatedData.webSearch,
      hybridRag: validatedData.hybridRag, // Added hybridRag field
      mcp: validatedData.mcp,
      mcpSchema: validatedData.mcpSchema
        ? JSON.parse(validatedData.mcpSchema)
        : null,
      image: validatedData.imageUrl || "default-avatar.png",
      knowledgeBase:
        validatedData.docs.length > 0
          ? JSON.stringify(validatedData.docs)
          : null,
    };

    const gpt = await prisma.gpt.create({
      data: processedData,
    });

    return {
      success: true,
      message: "GPT created successfully",
      data: gpt,
    };
  } catch (error) {
    console.error("Error creating GPT:", error);
    return {
      success: false,
      error: "Failed to create GPT. Please try again.",
    };
  }
}

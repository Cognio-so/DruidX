"use server";

import { requireUser } from "@/data/requireUser";
import prisma from "@/lib/prisma";
import { gptSchema } from "@/lib/zodSchema";
import { revalidatePath } from "next/cache";

const modelMapping: Record<string, string> = {
  "gpt-4": "gpt_4",
  "gpt-4o": "gpt_4o",
  "gpt-5": "gpt_5",
};

const reverseModelMapping: Record<string, string> = {
  "gpt_4": "gpt-4",
  "gpt_4o": "gpt-4o", 
  "gpt_5": "gpt-5",
};

export async function getGptById(id: string) {
  const session = await requireUser();
  
  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
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
      return {
        success: false,
        error: "GPT not found",
      };
    }

    // Transform the data for the form
    const transformedGpt = {
      ...gpt,
      model: reverseModelMapping[gpt.model] || gpt.model,
      docs: gpt.knowledgeBase ? JSON.parse(gpt.knowledgeBase) : [],
      mcpSchema: gpt.mcpSchema ? JSON.stringify(gpt.mcpSchema, null, 2) : "",
    };

    return {
      success: true,
      data: transformedGpt,
    };
  } catch (error) {
    console.error("Error fetching GPT:", error);
    return {
      success: false,
      error: "Failed to fetch GPT",
    };
  }
}

export async function editGpt(data: {
  id: string;
  gptName: string;
  gptDescription: string;
  model: string;
  instructions: string;
  webSearch: boolean;
  hybridRag: boolean;
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
      name: validatedData.gptName,
      description: validatedData.gptDescription,
      model: modelMapping[validatedData.model] as "gpt_4" | "gpt_4o" | "gpt_5",
      instruction: validatedData.instructions,
      webBrowser: validatedData.webSearch,
      hybridRag: validatedData.hybridRag,
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

    const gpt = await prisma.gpt.update({
      where: {
        id: data.id,
      },
      data: processedData,
    });

    revalidatePath("/admin/gpts");
    revalidatePath(`/admin/gpts/${data.id}`);

    return {
      success: true,
      message: "GPT updated successfully",
      data: gpt,
    };
  } catch (error) {
    console.error("Error updating GPT:", error);
    return {
      success: false,
      error: "Failed to update GPT. Please try again.",
    };
  }
}

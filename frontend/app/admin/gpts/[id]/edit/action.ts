  "use server";

import { requireAdmin } from "@/data/requireAdmin";
import prisma from "@/lib/prisma";
import { gptSchema } from "@/lib/zodSchema";
import { revalidatePath } from "next/cache";

const modelMapping: Record<string, string> = {
  "gemini_2_5_flash": "gemini_2_5_flash",
  "gemini_2_5_pro": "gemini_2_5_pro",
  "gemini_2_5_flash_lite": "gemini_2_5_flash_lite",
  "gpt_4_1": "gpt_4_1",
  "gpt_5": "gpt_5",
  "gpt_5_thinking_high": "gpt_5_thinking_high",
  "gpt_5_mini": "gpt_5_mini",
  "gpt_5_nano": "gpt_5_nano",
  "gpt_4o": "gpt_4o",
  "claude_sonnet_4_5": "claude_sonnet_4_5",
  "claude_opus_4_1": "claude_opus_4_1",
  "claude_haiku_3_5": "claude_haiku_3_5",
  "grok_4_fast": "grok_4_fast",
  "deepseek_v3_1": "deepseek_v3_1",
  "meta_llama_3_3_70b": "meta_llama_3_3_70b",
  "kimi_k2_0905": "kimi_k2_0905",
};

const reverseModelMapping: Record<string, string> = {
  "gemini_2_5_flash": "gemini_2_5_flash",
  "gemini_2_5_pro": "gemini_2_5_pro",
  "gemini_2_5_flash_lite": "gemini_2_5_flash_lite",
  "gpt_4_1": "gpt_4_1",
  "gpt_5": "gpt_5",
  "gpt_5_thinking_high": "gpt_5_thinking_high",
  "gpt_5_mini": "gpt_5_mini",
  "gpt_5_nano": "gpt_5_nano",
  "gpt_4o": "gpt_4o",
  "claude_sonnet_4_5": "claude_sonnet_4_5",
  "claude_opus_4_1": "claude_opus_4_1",
  "claude_haiku_3_5": "claude_haiku_3_5",
  "grok_4_fast": "grok_4_fast",
  "deepseek_v3_1": "deepseek_v3_1",
  "meta_llama_3_3_70b": "meta_llama_3_3_70b",
  "kimi_k2_0905": "kimi_k2_0905",
};

export async function getGptById(id: string) {
  const session = await requireAdmin();    
  
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
  const session = await requireAdmin();

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
      model: modelMapping[validatedData.model] as any,
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

"use server";

import { requireAdmin } from "@/data/requireAdmin";
import prisma from "@/lib/prisma";
import { gptSchema } from "@/lib/zodSchema";

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

export async function createGpt(data: {
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
      userId: session.user.id,
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

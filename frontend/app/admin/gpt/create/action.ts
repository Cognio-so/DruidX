"use server";

import { requireUser } from "@/data/admin/require-user";
import prisma from "@/lib/prisma";
import { CreateGptSchema, CreateGptSchemaType } from "@/lib/zodSchema";

const modelMapping: Record<string, string> = {
  "gpt-4o-mini": "gpt_40_mini",
  "gpt-4o": "gpt_4o",
  "gpt-3.5": "gpt_35",
  "Gemini-flash-2.5": "Gemini_flash_25",
  "Gemini-2.5-pro": "Gemini_25_pro",
  "llama3-8b-8192": "llama3_8b_8192",
  "Llama-4-Scout": "Llama_4_Scout",
};

export async function CreateGpt(values: CreateGptSchemaType) {
  const session = await requireUser();

  try {
    const validation = CreateGptSchema.safeParse(values);

    if (!validation.success) {
      console.error("Validation failed:", validation.error);
      return {
        status: "error",
        message: "Invalid form data ",
      };
    }

    const processedData = {
      ...validation.data,
      userId: session?.user.id as string,
      model: modelMapping[validation.data.model] as any,
      mcpSchema: validation.data.mcpSchema
        ? JSON.parse(validation.data.mcpSchema)
        : null,
      image: validation.data.image?.name || "default-avatar.png",
    };

    const data = await prisma.gpt.create({
      data: processedData,
    });

    return {
      status: "success",
      message: "gpt created successfully",
    };
  } catch (error) {
    return {
      status: "error",
      message: "failed to create gpt",
    };
  }
}

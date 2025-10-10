import { z } from "zod";

export const gptSchema = z.object({
  gptName: z
    .string()
    .min(3, { message: "GPT name must be at least 3 characters long" })
    .max(50, { message: "GPT name must not exceed 50 characters" }),

  gptDescription: z
    .string()
    .min(10, { message: "Description must be at least 10 characters long" })
    .max(300, { message: "Description must not exceed 300 characters" }),

  model: z.enum([
    "gemini_2_5_flash",
    "gemini_2_5_pro", 
    "gemini_2_5_flash_lite",
    "gpt_4_1",
    "gpt_5",
    "gpt_5_thinking_high",
    "gpt_5_mini",
    "gpt_5_nano",
    "gpt_4o",
    "claude_sonnet_4_5",
    "claude_opus_4_1",
    "claude_haiku_3_5",
    "grok_4_fast",
    "deepseek_v3_1",
    "meta_llama_3_3_70b",
    "kimi_k2_0905"
  ]).refine((val) => !!val, {
    message: "Please select a model",
  }),

  instructions: z
    .string()
    .min(20, { message: "Instructions must be at least 20 characters long" })
    .max(80000, { message: "Instructions must not exceed 80000 characters" }),

  webSearch: z.boolean(),
  hybridRag: z.boolean(),
  mcp: z.boolean(),

  mcpSchema: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;

        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Must be valid JSON schema" }
    ),

  docs: z
    .array(z.string())
    .max(10, { message: "You can upload at most 10 documents" }),

  imageUrl: z.string().optional(),
});

export type GptFormValues = z.infer<typeof gptSchema>;

export const teamMemberUpdateSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(100, { message: "Name must not exceed 100 characters" }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must not exceed 255 characters" }),
  role: z.enum(["admin", "user"], {
    message: "Role must be either admin or user",
  }),
});

export const teamMemberInviteSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(100, { message: "Name must not exceed 100 characters" }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must not exceed 255 characters" }),
  role: z.enum(["admin", "user"], {
    message: "Role must be either admin or user",
  }),
  message: z
    .string()
    .max(500, { message: "Message must not exceed 500 characters" })
    .optional(),
});

export type TeamMemberUpdateValues = z.infer<typeof teamMemberUpdateSchema>;
export type TeamMemberInviteValues = z.infer<typeof teamMemberInviteSchema>;

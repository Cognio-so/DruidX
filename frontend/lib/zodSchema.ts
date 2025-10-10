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

  model: z.enum(["gpt-4", "gpt-4o", "gpt-5"]).refine((val) => !!val, {
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

import { z } from "zod";

export const models = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-3.5",
  "Gemini-flash-2.5",
  "Gemini-2.5-pro",
  "llama3-8b-8192",
  "Llama-4-Scout",
] as const;

export const CreateGptSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters long")
    .max(100, "Name cannot exceed 100 characters"),

  description: z
    .string()
    .min(5, "Description must be at least 5 characters long")
    .max(500, "Description cannot exceed 500 characters"),

  model: z.enum(models, {
    error: "Please select a valid model",
  }),

  instruction: z
    .string()
    .min(5, "Instruction must be at least 5 characters long")
    .max(70000, "Instruction cannot exceed 70000 characters"),

  webBrowser: z.boolean(),

  mcp: z.boolean(),

  mcpSchema: z
    .string()
    .optional()
    .refine(
      (val) => {
        // Allow empty if no value provided
        if (!val || val.trim() === '') return true;
        
        // If value exists, validate JSON
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Must be valid JSON schema" }
    ),

  image: z
    .any()
    .refine((val) => val != null, { message: "Avatar image is required" }),

  knowledgeBase: z.string().min(1, "Knowledge Base file is required"),
});

export type CreateGptSchemaType = z.infer<typeof CreateGptSchema>;

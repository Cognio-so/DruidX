"use client";

import { Control, ControllerRenderProps } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { GptFormValues } from "@/lib/zodSchema";

interface McpSchemaFieldProps {
  control: Control<GptFormValues>;
}

export default function McpSchemaField({ control }: McpSchemaFieldProps) {
  return (
    <FormField
      control={control}
      name="mcpSchema"
      render={({
        field,
      }: {
        field: ControllerRenderProps<GptFormValues, "mcpSchema">;
      }) => (
        <FormItem>
          <FormLabel>MCP Input Schema *</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Enter JSON schema for MCP integration"
              {...field}
              value={field.value as string || ""}
              className="font-mono w-full min-h-[200px]"
              required
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

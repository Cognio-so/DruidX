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

interface McpSchemaFieldProps {
  control: Control<Record<string, unknown>>;
}

export default function McpSchemaField({ control }: McpSchemaFieldProps) {
  return (
    <FormField
      control={control}
      name="mcpSchema"
      render={({
        field,
      }: {
        field: ControllerRenderProps<Record<string, unknown>, "mcpSchema">;
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

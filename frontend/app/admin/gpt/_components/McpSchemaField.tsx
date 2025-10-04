"use client";

import { z } from "zod";
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
  control: Control<any>; // you can replace `any` with your zod infer type if you want stricter typing
}

export default function McpSchemaField({ control }: McpSchemaFieldProps) {
  return (
    <FormField
      control={control}
      name="mcpSchema"
      render={({
        field,
      }: {
        field: ControllerRenderProps<any, "mcpSchema">;
      }) => (
        <FormItem>
          <FormLabel>MCP Input Schema *</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Enter JSON schema for MCP integration"
              {...field}
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

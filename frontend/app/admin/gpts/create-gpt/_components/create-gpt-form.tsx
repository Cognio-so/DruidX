"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Loader2, Sparkle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { ImageUploader } from "./ImageUploader";
import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import DocsUploader from "./DocsUploader";
import McpSchemaField from "./McpSchemaFeild";
import { PreviewGpt } from "./preview-gpt";
import { GptFormValues, gptSchema } from "@/lib/zodSchema";
import { createGpt } from "../action";

const GptModels = [
  {
    id: "gpt-4",
    name: "GPT-4",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
  },
  {
    id: "gpt-5",
    name: "GPT-5",
  },
];

export function CreateGptForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<GptFormValues>({
    resolver: zodResolver(gptSchema),
    defaultValues: {
      gptName: "",
      gptDescription: "",
      model: "gpt-4",
      instructions: "",
      webSearch: false,
      hybridRag: false, // Added default value
      mcp: false,
      docs: [],
      imageUrl: "",
      mcpSchema: "",
    },
  });

  // Watch all form values for preview
  const formData = form.watch();

  const onSubmit = async (data: GptFormValues) => {
    startTransition(async () => {
      try {
        const result = await createGpt(data);
        
        if (result.success) {
          toast.success(result.message || "GPT created successfully!");
          form.reset(); 
          router.push('/admin/gpts');
        } else {
          toast.error(result.error || "Failed to create GPT");
        }
      } catch (error) {
        console.error("Form submission error:", error);
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <Card className="p-4 w-full mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="Details">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="Details">Details</TabsTrigger>
              <TabsTrigger value="Preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="Details">
              <div className="space-y-6">
                {/* GPT Avatar */}
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPT Avatar</FormLabel>
                      <FormControl>
                        <ImageUploader
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* GPT Name */}
                <FormField
                  control={form.control}
                  name="gptName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPT Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter GPT name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* GPT Description */}
                <FormField
                  control={form.control}
                  name="gptDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter GPT description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Model Selection */}
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Model</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GptModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Instructions */}
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructions</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          field={{
                            value: field.value,
                            onChange: field.onChange,
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Web Search Toggle */}
                <FormField
                  control={form.control}
                  name="webSearch"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Web Search</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow the GPT to search the web for real-time information
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Hybrid RAG Toggle */}
                <FormField
                  control={form.control}
                  name="hybridRag"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Hybrid RAG</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Enable retrieval-augmented generation with document context
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* MCP Toggle */}
                <FormField
                  control={form.control}
                  name="mcp"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between border rounded-lg p-4">
                      <FormLabel>MCP Integration</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Conditional MCP Schema Field */}
                {form.watch("mcp") && <McpSchemaField control={form.control} />}

                <Separator />

                {/* Document Upload */}
                <FormField
                  control={form.control}
                  name="docs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload Documents</FormLabel>
                      <FormControl>
                        <DocsUploader
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkle className="size-4" />
                  )}
                  {isPending ? "Creating GPT..." : "Create GPT"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="Preview">
              <PreviewGpt data={formData} />
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </Card>
  );
}

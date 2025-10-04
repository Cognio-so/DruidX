"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import {
  Bot,
  Brain,
  Cpu,
  Sparkle,
  Upload,
  Loader2,
  ArrowLeft,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import McpSchemaField from "../_components/McpSchemaField";
import { CreateGptSchema, CreateGptSchemaType } from "@/lib/zodSchema";
import { tryCatch } from "@/hooks/try-catch";
import { toast } from "sonner";
import { CreateGpt } from "./action";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import { Uploader } from "@/components/file-uploader/Uploader";
import Link from "next/link";

const models = [
  { label: "GPT 4o mini", value: "gpt-4o-mini", icon: Cpu },
  { label: "GPT 4o", value: "gpt-4o", icon: Bot },
  { label: "GPT 3.5", value: "gpt-3.5", icon: Brain },
  { label: "Gemini flash 2.5", value: "Gemini-flash-2.5", icon: Cpu },
  { label: "Gemini 2.5 pro", value: "Gemini-2.5-pro", icon: Bot },
  { label: "llama3 8b 8192", value: "llama3-8b-8192", icon: Brain },
  { label: "Llama 4 Scout", value: "Llama-4-Scout", icon: Sparkle },
];

export default function CreateGptPage() {
  const router = useRouter();

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateGptSchemaType>({
    resolver: zodResolver(CreateGptSchema),
    defaultValues: {
      name: "",
      description: "",
      model: "gpt-4o-mini",
      instruction: "",
      webBrowser: false,
      mcp: false,
      mcpSchema: "",
      knowledgeBase: "",
    },
  });

  const onSubmit = (values: CreateGptSchemaType) => {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(CreateGpt(values));

      if (error) {
        toast.error("An unexpected error occured");
      }
      if (result && result.status === "success") {
        toast.success(result.message);
        form.reset();
        router.push("/admin/gpt");
      } else if (result?.status === "error") {
        toast.error(result.message);
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <Link
          href="/admin/gpt"
          className={buttonVariants({
            variant: "outline",
            size: "icon",
          })}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-bold">Create Courses</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Provide basic information to create Gpt
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Avatar */}
              <div className="flex flex-col items-center space-y-3">
                <label htmlFor="gpt-image" className="cursor-pointer">
                  <div className="relative w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted hover:bg-muted/50 transition">
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="GPT Image"
                        fill
                        className="object-cover rounded-full"
                      />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    id="gpt-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImagePreview(URL.createObjectURL(file));
                        form.setValue("image", file);
                      }
                    }}
                  />
                </label>
                <p className="text-sm text-muted-foreground">
                  Upload GPT Avatar
                </p>
              </div>

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
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

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description about this GPT"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Model Selector */}
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            <div className="flex items-center gap-2">
                              {m.icon && (
                                <m.icon className="w-4 h-4 text-green-500" />
                              )}
                              {m.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Model Instruction */}
              <FormField
                control={form.control}
                name="instruction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Instruction</FormLabel>
                    <FormControl>
                      <RichTextEditor field={field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="webBrowser"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between border rounded-lg p-4">
                      <FormLabel>Web Browser Access</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

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
              </div>

              {form.watch("mcp") && <McpSchemaField control={form.control} />}

              <Uploader
                onFileUpload={(key) =>
                  form.setValue("knowledgeBase", key, { shouldValidate: true })
                }
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkle className="size-4" />
                )}
                {isPending ? "Creating GPT..." : "Create Gpt"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}

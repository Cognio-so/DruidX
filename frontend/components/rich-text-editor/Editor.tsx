"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StaterKit from "@tiptap/starter-kit";
import { MenuBar } from "./MenuBar";
import TextAlign from "@tiptap/extension-text-align";

export function RichTextEditor({ field }: { field: { value?: string; onChange: (value: string) => void } }) {
  const editor = useEditor({
    extensions: [
      StaterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],

    editorProps: {
      attributes: {
        class:
          "h-[300px] p-4 focus:outline-none prose prose-sm sm:prose lg:prose-lg dark:prose-invert !w-full !max-w-none overflow-y-auto",
      },
    },

    onUpdate: ({ editor }) => {
      const plainText = editor.getText();
      field.onChange(plainText);
    },

    content: field.value || "<p>Hello World!</p>",
    immediatelyRender: false,
  });

  return (
    <div className="w-full border border-input rounded-lg overflow-hidden dark:bg-input/30">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

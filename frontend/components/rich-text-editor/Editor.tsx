"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StaterKit from "@tiptap/starter-kit";
import { MenuBar } from "./MenuBar";
import TextAlign from "@tiptap/extension-text-align";

export function RichTextEditor({ field }: { field: any }) {
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
          "min-h-[200px] max-h-[400px] p-4 focus:outline-none prose prose-sm sm:prose lg:prose-lg dark:prose-invert !w-full !max-w-none overflow-y-auto",
      },
    },

    onUpdate: ({ editor }) => {
      const jsonData = editor.getJSON();
      const plainText = editor.getText();

      field.onChange(plainText);
    },

    content: field.value || "<p>Hello World!</p>",
    immediatelyRender: false,
  });

  return (
    <div className="w-full border border-input rounded-lg overflow-hidden dark:bg-input/30">
      <MenuBar editor={editor} />
      <div className="max-h-[400px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

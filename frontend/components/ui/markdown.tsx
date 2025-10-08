"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Image from "next/image";

interface MarkdownProps {
  content: string;
  className?: string;
}

const SourcesSection = ({ content }: { content: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  const extractSources = (text: string) => {
    const sourcesRegex = /📚 Sources\s*\n\s*\n([\s\S]*?)(?=\n\s*\n|$)/;
    let match = text.match(sourcesRegex);

    if (!match) {
      const endRegex = /📚 Sources\s*\n\s*\n([\s\S]*)$/;
      match = text.match(endRegex);
    }

    if (!match) {
      const urlLines = text
        .split("\n")
        .filter((line) => line.trim().startsWith("URL:"));
      if (urlLines.length > 0) {
        return parseUrlLines(urlLines, text);
      }
      return [];
    }

    const sourcesText = match[1];
    return parseSourcesText(sourcesText);
  };

  const parseUrlLines = (urlLines: string[], fullText: string) => {
    const sources: { title: string; url: string }[] = [];

    for (const urlLine of urlLines) {
      const url = urlLine.replace("URL:", "").trim();
      const lines = fullText.split("\n");
      const urlIndex = lines.findIndex((line) => line.includes(url));

      let title = "";
      if (urlIndex > 0) {
        for (let i = urlIndex - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line && !line.startsWith("URL:") && !line.includes("📚")) {
            title = line;
            break;
          }
        }
      }

      sources.push({ title, url });
    }

    return sources;
  };

  const parseSourcesText = (sourcesText: string) => {
    const sourceLines = sourcesText.split("\n").filter((line) => line.trim());
    const sources: { title: string; url: string }[] = [];
    let currentSource: { title: string; url: string } | null = null;

    for (const line of sourceLines) {
      if (line.startsWith("URL:")) {
        if (currentSource) {
          sources.push(currentSource);
        }
        currentSource = {
          title: "",
          url: line.replace("URL:", "").trim(),
        };
      } else if (line.trim() && !line.startsWith("URL:") && !line.includes("📚")) {
        if (currentSource) {
          currentSource.title = line.trim();
        }
      }
    }

    if (currentSource) {
      sources.push(currentSource);
    }

    return sources;
  };

  const sources = extractSources(content);
  if (sources.length === 0) return null;

  return (
    <div className="mt-8 p-5 border rounded-xl bg-muted/40 backdrop-blur-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto font-semibold text-lg tracking-tight"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📚</span>
              <span>Sources ({sources.length})</span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          {sources.map((source, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg border bg-background/50 hover:bg-muted/70 transition-colors"
            >
              <Image
                src={`https://www.google.com/s2/favicons?domain=${new URL(
                  source.url
                ).hostname}&sz=16`}
                alt=""
                width={16}
                height={16}
                className="w-4 h-4 flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {source.title || "Untitled Source"}
                </p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                  {new URL(source.url).hostname}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const Markdown: React.FC<MarkdownProps> = ({ content, className }) => {
  let cleanContent = content;

  // remove trailing "Sources" section
  cleanContent = cleanContent
    .replace(/📚 Sources\s*\n\s*\n[\s\S]*?(?=\n\s*\n|$)/g, "")
    .replace(/📚 Sources[\s\S]*?(?=\n\s*\n|$)/g, "")
    .replace(/📚 Sources[\s\S]*$/g, "");

  const lines = cleanContent.split("\n");
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    return (
      !trimmed.startsWith("URL:") &&
      !trimmed.includes("📚 Sources") &&
      !trimmed.match(/^https?:\/\//)
    );
  });

  cleanContent = filteredLines.join("\n").trim();

  return (
    <div className={cn("max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1({ children }) {
            return (
              <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                {children}
              </h4>
            );
          },
          h5({ children }) {
            return (
              <h5 className="scroll-m-20 text-lg font-semibold tracking-tight">
                {children}
              </h5>
            );
          },
          h6({ children }) {
            return (
              <h6 className="scroll-m-20 text-base font-semibold tracking-tight">
                {children}
              </h6>
            );
          },
          p({ children }) {
            return (
              <p className="leading-7 [&:not(:first-child)]:mt-6">
                {children}
              </p>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="mt-6 border-l-2 pl-6 italic">
                {children}
              </blockquote>
            );
          },
          ul({ children }) {
            return (
              <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="mt-2">{children}</li>;
          },
          table({ children }) {
            return (
              <div className="my-6 w-full overflow-y-auto">
                <table className="w-full">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead>{children}</thead>;
          },
          tbody({ children }) {
            return <tbody>{children}</tbody>;
          },
          tr({ children }) {
            return (
              <tr className="even:bg-muted m-0 border-t p-0">
                {children}
              </tr>
            );
          },
          th({ children, ...props }) {
            return (
              <th
                className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
                {...props}
              >
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td
                className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
                {...props}
              >
                {children}
              </td>
            );
          },
          a({ children, href, ...props }) {
            return (
              <a
                href={href}
                className="text-primary font-medium underline underline-offset-4"
                {...props}
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong className="font-semibold">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic">{children}</em>;
          },
          code({ children, className }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            if (language) {
              return (
                <SyntaxHighlighter
                  style={atomDark}
                  language={language}
                  PreTag="div"
                  className="rounded-lg my-4"
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              );
            }
            return (
              <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                {children}
              </code>
            );
          },
          pre({ children }) {
            return (
              <pre className="mb-4 mt-6 overflow-x-auto rounded-lg border bg-muted p-4">
                {children}
              </pre>
            );
          },
          hr() {
            return <hr className="my-4 md:my-8" />;
          },
          span({ className, children }) {
            if (className === "math math-inline") {
              return <InlineMath math={String(children)} />;
            }
            if (className === "math math-display") {
              return <BlockMath math={String(children)} />;
            }
            return <span>{children}</span>;
          },
        }}
      >
        {cleanContent}
      </ReactMarkdown>
      <SourcesSection content={content} />
    </div>
  );
};

export default Markdown;

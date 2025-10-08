"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
      const urlLines = text.split('\n').filter(line => line.trim().startsWith('URL:'));
      if (urlLines.length > 0) {
        return parseUrlLines(urlLines, text);
      }
      return [];
    }
    
    const sourcesText = match[1];
    return parseSourcesText(sourcesText);
  };
  
  const parseUrlLines = (urlLines: string[], fullText: string) => {
    const sources = [];
    
    for (const urlLine of urlLines) {
      const url = urlLine.replace('URL:', '').trim();
      
      const lines = fullText.split('\n');
      const urlIndex = lines.findIndex(line => line.includes(url));
      
      let title = '';
      if (urlIndex > 0) {
        for (let i = urlIndex - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line && !line.startsWith('URL:') && !line.includes('📚')) {
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
    const sourceLines = sourcesText.split('\n').filter(line => line.trim());
    const sources = [];
    let currentSource = null;
    
    for (const line of sourceLines) {
      if (line.startsWith('URL:')) {
        if (currentSource) {
          sources.push(currentSource);
        }
        currentSource = {
          title: '',
          url: line.replace('URL:', '').trim()
        };
      } else if (line.trim() && !line.startsWith('URL:') && !line.includes('📚')) {
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
    <div className="mt-4 p-4 border rounded-lg bg-muted/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <div className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              <span className="font-medium">Sources ({sources.length})</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/80 transition-colors">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`}
                  alt=""
                  className="w-4 h-4 flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{source.title}</p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    {new URL(source.url).hostname}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const Markdown: React.FC<MarkdownProps> = ({ content, className }) => {
  let cleanContent = content;
  
  cleanContent = cleanContent.replace(/📚 Sources\s*\n\s*\n[\s\S]*?(?=\n\s*\n|$)/g, '');
  cleanContent = cleanContent.replace(/📚 Sources[\s\S]*?(?=\n\s*\n|$)/g, '');
  cleanContent = cleanContent.replace(/📚 Sources[\s\S]*$/g, '');
  
  const lines = cleanContent.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('URL:') && 
           !trimmed.includes('📚 Sources') &&
           !trimmed.match(/^https?:\/\//) &&
           !trimmed.match(/^\d+\.\s+.*https?:\/\//) &&
           !trimmed.match(/^\d+\.\s+.*\.com/) &&
           !trimmed.match(/^\d+\.\s+.*\.org/) &&
           !trimmed.match(/^\d+\.\s+.*\.dev/);
  });
  
  cleanContent = filteredLines.join('\n');
  cleanContent = cleanContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleanContent = cleanContent.replace(/^\s*\n/gm, '');
  cleanContent = cleanContent.trim();
  
  return (
    <div className={cn("prose prose-neutral dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="scroll-m-20 text-lg font-semibold tracking-tight">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="scroll-m-20 text-base font-semibold tracking-tight">
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p className="leading-7 [&:not(:first-child)]:mt-6">
              {children}
            </p>
          ),
          a: ({ children, href }) => (
            <a className="font-medium text-primary underline underline-offset-4 hover:text-primary/80" href={href}>
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="mt-2">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-2 pl-6 italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (language) {
              return (
                <SyntaxHighlighter
                  style={atomDark}
                  language={language}
                  PreTag="div"
                  className="rounded-lg"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            }
            
            return (
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                {children}
              </code>
            );
          },
          pre: ({ children }) => {
            return <>{children}</>;
          },
          strong: ({ children }) => (
            <strong className="font-semibold">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic">
              {children}
            </em>
          ),
          del: ({ children }) => (
            <del className="line-through">
              {children}
            </del>
          ),
          img: ({ src, alt }) => (
            <img className="rounded-md border" src={src} alt={alt} />
          ),
          table: ({ children }) => (
            <div className="my-6 w-full overflow-y-auto">
              <table className="w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="border border-border px-4 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-4 py-2">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="my-4 border-border" />
          ),
          span: ({ className, children }) => {
            if (className === 'math math-inline') {
              return <InlineMath math={String(children)} />;
            }
            if (className === 'math math-display') {
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

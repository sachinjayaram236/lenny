"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ArtifactViewerProps = {
  isOpen: boolean;
  onClose: () => void;
  type: "HTML" | "Markdown";
  title: string;
  content: string;
  initialMode?: "Preview" | "Code" | "Split";
};

export default function ArtifactViewer({ isOpen, onClose, type, title, content, initialMode = "Preview" }: ArtifactViewerProps) {
  const [mode, setMode] = useState<"Preview" | "Code" | "Split">(initialMode);
  const [copied, setCopied] = useState(false);

  // Sync mode when initialMode changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  return (
    <div className="flex-1 min-w-[500px] max-w-[800px] h-full bg-card border-l border-border-color flex flex-col shadow-2xl z-20 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-[72px] border-b border-border-color bg-background shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-foreground truncate max-w-[300px]" title={title}>{title}</h2>
          <span className="px-2.5 py-1 text-xs rounded-md bg-accent-tint text-accent font-bold uppercase tracking-wider">
            {type}
          </span>
        </div>
        
        <div className="flex items-center gap-1 bg-border-color/50 rounded-lg p-1">
          <button 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "Preview" ? "bg-card shadow-sm text-foreground" : "text-slate-500 hover:text-foreground hover:bg-border-color/50"}`}
            onClick={() => setMode("Preview")}
          >
            Preview
          </button>
          <button 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "Code" ? "bg-card shadow-sm text-foreground" : "text-slate-500 hover:text-foreground hover:bg-border-color/50"}`}
            onClick={() => setMode("Code")}
          >
            Code
          </button>
          <button 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "Split" ? "bg-card shadow-sm text-foreground" : "text-slate-500 hover:text-foreground hover:bg-border-color/50"}`}
            onClick={() => setMode("Split")}
          >
            Split
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 border-2 border-border-color rounded-md hover:border-accent hover:text-accent transition-colors font-semibold text-slate-600 flex items-center gap-1 w-28 justify-center"
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                Copy Code
              </>
            )}
          </button>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-accent-tint rounded-lg text-slate-400 hover:text-accent transition-colors"
            title="Close viewer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-hidden bg-card relative ${mode === "Split" ? "flex flex-col" : "block"}`}>
        
        {(mode === "Preview" || mode === "Split") && (
          <div className={mode === "Split" ? "flex-1 overflow-auto border-b border-border-color" : "h-full overflow-auto"}>
            {type === "HTML" && (
              <iframe 
                srcDoc={content} 
                sandbox="allow-scripts" 
                className="w-full h-full border-none bg-white"
                title="Artifact Preview"
              />
            )}
            
            {type === "Markdown" && (
              <div className="p-8 md:p-12 max-w-3xl mx-auto">
                <article className="prose prose-slate prose-headings:font-sans prose-headings:tracking-tight prose-a:text-accent prose-strong:font-bold prose-strong:text-foreground prose-blockquote:border-accent prose-blockquote:bg-accent-tint prose-blockquote:px-4 prose-blockquote:py-1 max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        )}

        {(mode === "Code" || mode === "Split") && (
          <div className={mode === "Split" ? "flex-1 overflow-auto bg-[#0F172A] text-[#E2E8F0]" : "h-full overflow-auto bg-[#0F172A] text-[#E2E8F0]"}>
            <div className="p-6 font-mono text-sm">
              <pre className="whitespace-pre-wrap break-words"><code>{content}</code></pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

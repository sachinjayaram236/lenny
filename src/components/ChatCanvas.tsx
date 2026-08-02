"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStore, ArtifactType } from "@/store/useChatStore";

type Message = {
  role: "user" | "assistant";
  content: string;
  artifact?: ArtifactType;
  isLoading?: boolean;
};

export default function ChatCanvas() {
  const { provider, activeSessionId, setArtifact, triggerRefresh } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  const fetchMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          setMessages([{
            role: "assistant",
            content: "Hi there! I'm Lenny. I can help you with growth, write essays, or create UI components. How can I help you today?"
          }]);
        } else {
          setMessages(data);
        }
      }
    } catch (e) {
      console.error("Failed to fetch messages", e);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopyMessage = async (content: string, idx: number) => {
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
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !activeSessionId) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          provider: provider || "openrouter",
          session_id: activeSessionId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend response error:", response.status, errorText);
        throw new Error(`Backend Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response,
        artifact: data.artifact
      }]);

      if (data.session_title) {
        triggerRefresh();
      }

      if (data.artifact) {
        setArtifact(data.artifact);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error while trying to respond. Please make sure the backend server is running."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-background relative shrink-0 min-w-[400px]">
      {/* Header */}
      <div className="h-[72px] border-b border-border-color flex items-center px-6 bg-card sticky top-0 z-10 shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-foreground tracking-tight">The Lenny Growth Assistant</h1>
      </div>

      {/* Message Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`border p-5 shadow-sm max-w-[85%] relative group ${msg.role === "user"
              ? "bg-card border-border-color rounded-2xl rounded-tr-sm"
              : "bg-accent-tint border-border-color rounded-2xl rounded-tl-sm"
              }`}>
              
              {msg.role === "assistant" && (
                <button 
                  onClick={() => handleCopyMessage(msg.content, idx)}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-background/50 hover:bg-background text-slate-500 hover:text-accent transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                  title="Copy Response"
                >
                  {copiedIdx === idx ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  )}
                </button>
              )}

              {msg.role === "assistant" ? (
                <div className="prose prose-sm md:prose-base prose-slate prose-headings:font-sans prose-a:text-accent max-w-none text-foreground mt-1 pr-6">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}

              {msg.artifact && (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => setArtifact(msg.artifact!, "Preview")}
                    className="flex items-center gap-2 bg-card border border-accent text-accent px-4 py-2 rounded-lg font-medium hover:bg-accent hover:text-white transition-all shadow-sm hover:shadow-md"
                  >
                    <span className="text-lg">👁️</span> Preview {msg.artifact.title}
                  </button>
                  <button
                    onClick={() => setArtifact(msg.artifact!, "Code")}
                    className="flex items-center gap-2 bg-card border border-border-color text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-all shadow-sm hover:shadow-md"
                  >
                    <span className="text-lg">💻</span> View Code
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-accent-tint border border-border-color p-5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
              </span>
              <span className="text-accent text-sm font-medium">Lenny is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background shrink-0">
        <div className="max-w-4xl mx-auto relative group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !activeSessionId}
            placeholder="Ask Lenny about growth..."
            className="w-full bg-card border border-border-color rounded-xl py-4 pl-5 pr-14 text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent shadow-sm transition-shadow group-hover:shadow-md disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim() || !activeSessionId}
            className="absolute right-3 top-3 p-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

type Session = {
  id: string;
  title: string;
  created_at: string;
};

type SidebarProps = {
  provider: "openrouter" | "cloud";
  onProviderChange: (p: "openrouter" | "cloud") => void;
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  refreshTrigger: number;
};

export default function Sidebar({ provider, onProviderChange, activeSessionId, onSessionSelect, refreshTrigger }: SidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !activeSessionId) {
          onSessionSelect(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      if (res.ok) {
        const newSession = await res.json();
        setSessions([newSession, ...sessions]);
        onSessionSelect(newSession.id);
      }
    } catch (e) {
      console.error("Failed to create new chat", e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (activeSessionId === id) {
        onSessionSelect("");
      }
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const submitEdit = async (id: string) => {
    setEditingId(null);
    if (!editTitle.trim()) return;
    try {
      await fetch(`/api/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-64 h-full bg-card border-r border-border-color flex flex-col shrink-0">
      {/* Top Section */}
      <div className="p-4 flex flex-col gap-4 border-b border-border-color">
        <div className="flex items-center justify-between bg-background p-1 rounded-full border border-border-color">
          <button 
            onClick={() => onProviderChange("openrouter")}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-full transition-colors ${provider === "openrouter" ? "bg-accent text-white shadow-sm" : "text-slate-500 hover:text-foreground"}`}
          >
            Gemma (Free)
          </button>
          <button 
            onClick={() => onProviderChange("cloud")}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-full transition-colors ${provider === "cloud" ? "bg-accent text-white shadow-sm" : "text-slate-500 hover:text-foreground"}`}
          >
            Cloud (Claude)
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-xs font-medium text-foreground px-1">
          <span className={`w-2 h-2 rounded-full shadow-sm ${provider === "openrouter" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"}`}></span>
          Engine: {provider === "openrouter" ? "gemma-4-26b (OpenRouter)" : "claude-3-5-sonnet"}
        </div>
        
        <button 
          onClick={handleNewChat}
          className="w-full bg-accent text-white py-2.5 px-4 rounded-lg font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <span>+</span> New Chat
        </button>
      </div>

      {/* Middle Section */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Past Sessions</div>
        {sessions.map(s => (
          <div 
            key={s.id}
            onClick={() => onSessionSelect(s.id)}
            className={`group flex items-center justify-between text-sm p-2 rounded-md transition-colors font-medium cursor-pointer ${activeSessionId === s.id ? "bg-accent text-white shadow-sm" : "text-foreground hover:bg-accent-tint"}`}
          >
            {editingId === s.id ? (
              <input 
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={() => submitEdit(s.id)}
                onKeyDown={e => e.key === "Enter" && submitEdit(s.id)}
                onClick={e => e.stopPropagation()}
                className={`flex-1 bg-transparent border-none outline-none ${activeSessionId === s.id ? "text-white" : "text-foreground"}`}
              />
            ) : (
              <span className="truncate flex-1">{s.title}</span>
            )}
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => startEdit(e, s.id, s.title)}
                className="p-1 hover:text-slate-300 transition-colors"
                title="Rename"
              >
                ✏️
              </button>
              <button 
                onClick={(e) => handleDelete(e, s.id)}
                className="p-1 hover:text-red-400 transition-colors"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border-color text-xs text-slate-400 font-medium text-center bg-background/50">
        FastAPI + Postgres
      </div>
    </div>
  );
}

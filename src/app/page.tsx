"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatCanvas from "@/components/ChatCanvas";
import ArtifactViewer from "@/components/ArtifactViewer";

export default function Home() {
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [artifact, setArtifact] = useState<{type: string, title: string, content: string} | null>(null);
  const [artifactMode, setArtifactMode] = useState<"Preview" | "Code">("Preview");
  const [provider, setProvider] = useState<"openrouter" | "cloud">("openrouter");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOpenArtifact = (newArtifact: {type: string, title: string, content: string}, mode: "Preview" | "Code" = "Preview") => {
    setArtifact(newArtifact);
    setArtifactMode(mode);
    setArtifactOpen(true);
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-accent-tint selection:text-accent">
      <Sidebar 
        provider={provider} 
        onProviderChange={setProvider}
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        refreshTrigger={refreshTrigger}
      />
      <div className="flex-1 flex overflow-hidden">
        <ChatCanvas 
          onOpenArtifact={handleOpenArtifact} 
          provider={provider}
          activeSessionId={activeSessionId}
          onChatUpdate={() => setRefreshTrigger(prev => prev + 1)}
        />
        {artifact && (
          <ArtifactViewer 
            isOpen={artifactOpen} 
            onClose={() => setArtifactOpen(false)}
            type={artifact.type.toUpperCase() as any}
            title={artifact.title}
            content={artifact.content}
            initialMode={artifactMode}
          />
        )}
      </div>
    </main>
  );
}

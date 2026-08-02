"use client";

import Sidebar from "@/components/Sidebar";
import ChatCanvas from "@/components/ChatCanvas";
import ArtifactViewer from "@/components/ArtifactViewer";

export default function Home() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-accent-tint selection:text-accent">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden">
        <ChatCanvas />
        <ArtifactViewer />
      </div>
    </main>
  );
}

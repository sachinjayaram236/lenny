import { create } from 'zustand';

export type Session = {
  id: string;
  title: string;
  created_at: string;
};

export type ArtifactType = {
  type: string;
  title: string;
  content: string;
};

interface ChatState {
  // State
  sessions: Session[];
  activeSessionId: string | null;
  provider: "openrouter" | "cloud";
  
  artifact: ArtifactType | null;
  artifactOpen: boolean;
  artifactMode: "Preview" | "Code" | "Split";
  
  refreshTrigger: number;

  // Actions
  setSessions: (sessions: Session[]) => void;
  setActiveSessionId: (id: string | null) => void;
  setProvider: (provider: "openrouter" | "cloud") => void;
  
  setArtifact: (artifact: ArtifactType | null, mode?: "Preview" | "Code" | "Split") => void;
  setArtifactOpen: (open: boolean) => void;
  setArtifactMode: (mode: "Preview" | "Code" | "Split") => void;
  
  triggerRefresh: () => void;
  
  // Optimistic/Local Session Actions (Optional, but good for UI responsiveness before re-fetch)
  renameSession: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  addSession: (session: Session) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  activeSessionId: null,
  provider: "openrouter",
  
  artifact: null,
  artifactOpen: false,
  artifactMode: "Preview",
  
  refreshTrigger: 0,
  
  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setProvider: (provider) => set({ provider }),
  
  setArtifact: (artifact, mode = "Preview") => set({ 
    artifact, 
    artifactMode: mode, 
    artifactOpen: !!artifact 
  }),
  setArtifactOpen: (open) => set({ artifactOpen: open }),
  setArtifactMode: (mode) => set({ artifactMode: mode }),
  
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
  
  renameSession: (id, title) => set((state) => ({
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s))
  })),
  deleteSession: (id) => set((state) => ({
    sessions: state.sessions.filter((s) => s.id !== id),
    activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
  })),
  addSession: (session) => set((state) => ({
    sessions: [session, ...state.sessions]
  })),
}));

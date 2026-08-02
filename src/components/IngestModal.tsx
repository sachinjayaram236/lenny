"use client";

import { useState, useRef } from "react";

type IngestModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function IngestModal({ isOpen, onClose }: IngestModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.name.endsWith(".md") || selected.name.endsWith(".txt")) {
        setFile(selected);
        setResult(null);
      } else {
        setResult({ type: "error", message: "Only .md and .txt files are supported." });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ 
          type: "success", 
          message: `Success! Added ${data.chunks_added} vector chunks from ${data.filename}.` 
        });
        setFile(null); // Clear selected file after success
      } else {
        setResult({ type: "error", message: data.detail || "Upload failed." });
      }
    } catch (error) {
      setResult({ type: "error", message: "Network error occurred during upload." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-background">
          <h2 className="text-xl font-bold text-foreground">Admin: Ingest Transcript</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-foreground transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <p className="text-slate-500 text-sm">
            Upload raw podcast transcripts (.md or .txt) to automatically chunk and index them into the ChromaDB vector store.
          </p>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-accent bg-accent-tint/50' : 'border-border-color hover:border-accent hover:bg-slate-50'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".md,.txt" 
              className="hidden" 
            />
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-background rounded-full border border-border-color shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </div>
              {file ? (
                <div>
                  <p className="font-semibold text-foreground">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Ready to upload</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-foreground">Click to browse files</p>
                  <p className="text-xs text-slate-500 mt-1">Markdown (.md) or Text (.txt) only</p>
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className={`p-4 rounded-lg text-sm font-medium ${result.type === "success" ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"}`}>
              {result.type === "success" ? "✅ " : "❌ "}
              {result.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-background border-t border-border-color flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-6 py-2 rounded-lg font-medium bg-accent text-white hover:bg-accent/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-white/80"></span>
                </span>
                Indexing...
              </>
            ) : (
              "Upload & Index"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

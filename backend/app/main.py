from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel
from typing import Optional, List
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import shutil
from .agent import run_agent_pipeline
from .db import get_db, ChatSession, ChatMessage
from .rag import ingest_single_file, TRANSCRIPTS_DIR

app = FastAPI(title="Lenny Growth Assistant API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    provider: str = "openrouter"
    session_id: str

class ArtifactResponse(BaseModel):
    type: str
    title: str
    content: str

class ChatResponse(BaseModel):
    response: str
    artifact: Optional[ArtifactResponse] = None
    session_title: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: str

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    artifact: Optional[ArtifactResponse] = None

@app.get("/api/sessions")
async def get_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()
    return [{"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()} for s in sessions]

@app.post("/api/sessions")
async def create_session(db: Session = Depends(get_db)):
    new_session = ChatSession(title="New Chat")
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return {"id": new_session.id, "title": new_session.title, "created_at": new_session.created_at.isoformat()}

@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    result = []
    for m in messages:
        art = None
        if m.artifact_type:
            art = {"type": m.artifact_type, "title": m.artifact_title, "content": m.artifact_content}
        result.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "artifact": art
        })
    return result

class SessionRenameRequest(BaseModel):
    title: str

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "success"}

@app.put("/api/sessions/{session_id}")
async def rename_session(session_id: str, request: SessionRenameRequest, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = request.title
    db.commit()
    return {"status": "success"}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        # Check if session exists
        session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        result = run_agent_pipeline(
            message=request.message,
            provider=request.provider,
            session_id=request.session_id,
            db=db
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ingest")
async def ingest_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith(('.md', '.txt')):
        raise HTTPException(status_code=400, detail="Only .md and .txt files are allowed")
    
    # Ensure directory exists
    os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)
    
    file_path = os.path.join(TRANSCRIPTS_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        chunks_added = ingest_single_file(file_path)
        
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_added": chunks_added
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to ingest file: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

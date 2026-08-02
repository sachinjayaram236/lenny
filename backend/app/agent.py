import re
from sqlalchemy.orm import Session
from .llm import generate_llm_response
from .rag import search_transcripts
from .db import ChatSession, ChatMessage

def classify_intent(message: str) -> str:
    """
    Classify the user intent into one of three skills:
    1. 'essay' if asking for a Ship30for30 essay
    2. 'artifact' if asking for a UI component or artifact
    3. 'qna' for standard Q&A (fallback)
    """
    msg_lower = message.lower()
    
    if "ship30" in msg_lower or "essay" in msg_lower:
        return "essay"
    
    if any(word in msg_lower for word in ["component", "ui", "html", "css", "artifact", "interface"]):
        return "artifact"
        
    return "qna"

def format_history(history: list[ChatMessage]) -> str:
    """Formats past messages to inject into the system prompt."""
    if not history:
        return ""
    formatted = "Previous conversation history:\n"
    for msg in history:
        formatted += f"{msg.role.capitalize()}: {msg.content}\n"
    return formatted + "\n"

def correct_query(message: str, provider: str) -> str:
    """Uses the LLM to fix misspellings in the query before vector search."""
    prompt = (
        "Correct any spelling mistakes in the following search query. "
        "Return ONLY the corrected query text, nothing else. "
        "If it is already correct, return it exactly as is.\n\n"
        f"Query: {message}"
    )
    corrected = generate_llm_response(prompt=prompt, provider=provider, system_prompt="You are a query spellchecker.")
    return corrected.strip().strip('"').strip("'")

def skill_qna(message: str, provider: str, history: list[ChatMessage]) -> dict:
    # Fix misspellings for better retrieval
    corrected_message = correct_query(message, provider)
    results = search_transcripts(corrected_message, top_k=5)
    
    context_text = "\n\n".join([f"Document: {res['content']}" for res in results])
    
    system_prompt = (
        "You are a helpful assistant. Use the following context retrieved from podcast transcripts "
        "to answer the user's question. You must answer STRICTLY based on the provided insights. "
        "If the context does not contain the answer, politely state that you don't know.\n\n"
        f"{format_history(history)}"
        f"Context:\n{context_text}"
    )
    
    response = generate_llm_response(prompt=message, provider=provider, system_prompt=system_prompt)
    return {"response": response, "artifact": None}

def skill_essay(message: str, provider: str, history: list[ChatMessage]) -> dict:
    # Fix misspellings for better retrieval
    corrected_message = correct_query(message, provider)
    results = search_transcripts(corrected_message, top_k=5)
    
    context_text = "\n\n".join([f"Document: {res['content']}" for res in results])
    
    system_prompt = (
        "You are an expert essay writer following the Ship30for30 methodology. "
        "Write a ~1,250-word essay based on the user's prompt and the provided context. "
        "The essay MUST feature:\n"
        "- A strong hook line\n"
        "- Bold text for skimmability\n"
        "- Clear bullet points\n"
        "- Actionable takeaways\n"
        "Format the output entirely in Markdown.\n\n"
        f"{format_history(history)}"
        f"Context:\n{context_text}"
    )
    
    response = generate_llm_response(prompt=message, provider=provider, system_prompt=system_prompt)
    
    # Check if there was an error communicating with the LLM
    if response.startswith("Error communicating"):
        return {"response": response, "artifact": None}

    artifact = {
        "type": "Markdown",
        "title": "Ship30for30 Essay",
        "content": response.strip()
    }
    
    return {
        "response": "I've drafted the Ship30for30 essay based on the podcast transcripts. I have opened it in the Artifact Viewer for you.", 
        "artifact": artifact
    }

def skill_artifact(message: str, provider: str, history: list[ChatMessage]) -> dict:
    system_prompt = (
        "You are an expert UI developer and technical writer. The user wants you to create a component or document. "
        "You MUST wrap your generated code or document inside an XML-like tag as follows:\n"
        "<artifact type=\"html\" title=\"Component Title\">\n...code here...\n</artifact>\n"
        "Use type=\"html\" for raw HTML/CSS snippets, and type=\"markdown\" for markdown documents. "
        "Return any explanation text OUTSIDE of the <artifact> tag.\n\n"
        f"{format_history(history)}"
    )
    
    raw_response = generate_llm_response(prompt=message, provider=provider, system_prompt=system_prompt)
    
    artifact_match = re.search(r'<artifact\s+type="([^"]+)"\s+title="([^"]+)">(.*?)</artifact>', raw_response, re.DOTALL)
    
    artifact = None
    response_text = raw_response
    
    if artifact_match:
        art_type = artifact_match.group(1)
        art_title = artifact_match.group(2)
        art_content = artifact_match.group(3).strip()
        
        artifact = {
            "type": art_type,
            "title": art_title,
            "content": art_content
        }
        
        response_text = raw_response[:artifact_match.start()].strip() + "\n" + raw_response[artifact_match.end():].strip()
        response_text = response_text.strip()
        
        if not response_text:
            response_text = f"I've created the {art_title} artifact for you."

    return {"response": response_text, "artifact": artifact}

def run_agent_pipeline(message: str, provider: str, session_id: str, db: Session) -> dict:
    # 1. Fetch Session and History
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    history = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    
    session_title_updated = False
    # 2. Update session title if it's new
    if not history and session.title == "New Chat":
        prompt = f"Generate a short 3-5 word title for a chat session starting with this message: '{message}'. Output only the title, no quotes."
        new_title = generate_llm_response(prompt=prompt, provider=provider, system_prompt="You are a helpful assistant that generates short titles.")
        session.title = new_title.strip().strip('"').strip("'")
        db.commit()
        session_title_updated = True

    # 3. Save User Message
    user_msg = ChatMessage(session_id=session_id, role="user", content=message)
    db.add(user_msg)
    db.commit()

    # 4. Route and Run Skill
    intent = classify_intent(message)
    if intent == "essay":
        result = skill_essay(message, provider, history)
    elif intent == "artifact":
        result = skill_artifact(message, provider, history)
    else:
        result = skill_qna(message, provider, history)

    # 5. Save Assistant Message
    artifact_data = result.get("artifact")
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=result["response"],
        artifact_type=artifact_data["type"] if artifact_data else None,
        artifact_title=artifact_data["title"] if artifact_data else None,
        artifact_content=artifact_data["content"] if artifact_data else None,
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "response": result["response"], 
        "artifact": result.get("artifact"), 
        "session_title": session.title if session_title_updated else None
    }

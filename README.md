# 🤖 Lenny — The Growth Assistant

> An AI-powered growth assistant inspired by the *Lenny's Podcast* universe.
> Ask questions, write Ship30for30 essays, and generate UI components — all grounded in real podcast transcript knowledge.

---

## ✨ What Is Lenny?

**Lenny** is a full-stack AI assistant that combines a **Next.js** chat frontend with a **FastAPI** backend powered by a **RAG (Retrieval-Augmented Generation)** pipeline and a multi-skill **LLM agent**. It lets you:

- 💬 **Ask growth questions** answered strictly from podcast transcript knowledge
- ✍️ **Generate Ship30for30 essays** (~1,250 words, Markdown-formatted)
- 🎨 **Create UI components/artifacts** as raw HTML/CSS rendered live in-browser
- 🔀 **Switch LLM providers** between OpenRouter (Gemma-4-26b) and Anthropic Claude instantly
- 💾 **Persistent Chat Sessions** with auto-generated contextual titles, full history, and edit/delete controls

---

## 🏗️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                       │
│  ┌──────────┐   ┌────────────────┐   ┌───────────────────┐  │
│  │ Sidebar  │   │  ChatCanvas    │   │  ArtifactViewer   │  │
│  │ Provider │   │  Message UI    │   │  Preview + Code   │  │
│  │ Sessions │   │  Input Bar     │   │  (HTML iframe /   │  │
│  │ Switcher │   │                │   │   Markdown)       │  │
│  └──────────┘   └────────────────┘   └───────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/chat
                           │ GET /api/sessions
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                          │
│                                                             │
│   main.py  →  agent.py (Intent Classifier + 3 Skills)       │
│      │             │                                        │
│      │   ┌─────────┼─────────┐                              │
│      │   ▼         ▼         ▼                              │
│      │ skill_qna  skill_essay skill_artifact                │
│      │   │         │         │                              │
│      │   └────→  rag.py  ←──┘    (Query Correction &        │
│      │             │              context retrieval)        │
│      │             ▼                                        │
│      │        llm.py (OpenRouter / Anthropic)               │
│      │                                                      │
│      ▼                                                      │
│   db.py (PostgreSQL / SQLite via SQLAlchemy)                │
│   ChromaDB Vector Store (Local HuggingFace Embeddings)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```text
lenny/
├── src/
│   ├── app/
│   │   ├── page.tsx            # Root page — Global state (sessions)
│   │   ├── layout.tsx          # Next.js root layout
│   │   └── globals.css         # Global CSS design tokens
│   └── components/
│       ├── Sidebar.tsx         # LLM switcher + dynamic session history + rename/delete
│       ├── ChatCanvas.tsx      # Message thread + input bar
│       └── ArtifactViewer.tsx  # Preview/Code toggle panel
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app + chat/session REST endpoints
│   │   ├── agent.py            # Skills, query correction, DB saving, title gen
│   │   ├── db.py               # SQLAlchemy ORM (ChatSession, ChatMessage)
│   │   ├── llm.py              # Unified LLM abstraction (OpenRouter / Anthropic)
│   │   └── rag.py              # ChromaDB + HuggingFace CPU embeddings
│   ├── data/
│   │   ├── transcripts/        # Podcast transcript .md files go here
│   │   └── chroma_db/          # Auto-generated vector store (gitignored)
│   └── requirements.txt
├── .env                        # API keys + DATABASE_URL
├── next.config.ts
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+
- An **OpenRouter API key** (for Gemma-4-26b logic and query correction)
- An **Anthropic API key** (optional, for Claude switching)
- A **PostgreSQL connection string** (optional, will fallback to local SQLite)

---

### 1. Clone & Configure Environment

```bash
git clone <your-repo-url>
cd lenny
```

Create a `.env` file in the project root:

```env
OPENROUTER_API_KEY=sk-or-v1-...
ANTHROPIC_API_KEY=sk-ant-...   # Optional
DATABASE_URL=postgresql://user:pass@host:port/dbname # Optional (falls back to local SQLite)
```

---

### 2. Start the Backend

```bash
cd backend

# Create & activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the API server (will auto-create DB tables)
uvicorn app.main:app --reload --port 8000
```

*Note: If you have transcript data, run `python -c "from app.rag import ingest_transcripts; ingest_transcripts()"` to chunk and embed them using local CPU embeddings.*

---

### 3. Start the Frontend

```bash
# From the project root
npm install
npm run dev
```

The UI will be available at `http://localhost:3000`.

---

## 🧠 How the Agent Works

Every user message passes through a multi-stage pipeline:

### Stage 1 — Context & Persistence (`main.py` & `db.py`)
The system fetches the active session's full chat history from the PostgreSQL/SQLite database to maintain memory over long conversations. 

### Stage 2 — Query Correction & Expansion (`agent.py`)
Before searching the vector database, the raw user query is sent to a high-speed LLM spellchecker. This fixes any typos or phonetic misspellings (e.g., "andy jhon" ➔ "Andy Johns") to ensure the embedding search is highly accurate.

### Stage 3 — Intent Classification (`agent.py`)
The message is scanned to route to the correct skill:
- `"ship30"`, `"essay"` ➔ ✍️ **Ship30for30 Essay Writer**
- `"component"`, `"ui"`, `"html"`, `"artifact"` ➔ 🎨 **Artifact Generator**
- *(fallback)* ➔ 💬 **Q&A (RAG-grounded)**

### Stage 4 — RAG Context Retrieval (`rag.py`)
For Q&A and Essay skills, the top 5 most semantically relevant chunks are fetched from **ChromaDB**. Embeddings are generated locally using `sentence-transformers` (`all-MiniLM-L6-v2`) on CPU, avoiding API limits.

### Stage 5 — LLM Response & Persistence (`llm.py` & `agent.py`)
The LLM generates the final response. If this is a brand new chat session, the LLM will also dynamically generate a 3-5 word summary title for the sidebar. Finally, the user message and AI response are written to the database.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **Backend API** | FastAPI, Uvicorn, Python 3.10+ |
| **Database ORM**| SQLAlchemy, PostgreSQL (`psycopg2`), SQLite fallback |
| **RAG / Vector DB** | LangChain, ChromaDB, HuggingFace `sentence-transformers` (CPU) |
| **LLM Providers** | OpenRouter (Gemma-4-26b), Anthropic (Claude 3.5 Sonnet) |

---

## 📋 Step-by-Step Progress Log

| # | Phase | Status |
|---|---|---|
| 1 | Project Bootstrap (Next.js 16 + FastAPI scaffolding) | ✅ Complete |
| 2 | RAG Setup (ChromaDB + OpenAI Embeddings) | ✅ Complete |
| 3 | LLM Switching & Base Agentic Skills Pipeline | ✅ Complete |
| 4 | Initial Frontend UI | ✅ Complete |
| 5 | **Migration:** Switched embeddings to local HuggingFace to avoid rate limits | ✅ Complete |
| 6 | **Migration:** Switched default provider to OpenRouter / Gemma | ✅ Complete |
| 7 | **Feature:** Persistent DB Sessions via SQLAlchemy (Postgres) | ✅ Complete |
| 8 | **Feature:** UI Session Management (Rename, Delete, Auto-title) | ✅ Complete |
| 9 | **Feature:** Fuzzy Logic Query Correction before vector retrieval | ✅ Complete |
| 10 | **Feature:** Markdown Rendering across Chat & Artifacts | ✅ Complete |
| 11 | **Feature:** Artifact Viewer layouts (Preview, Code, Split-Screen) | ✅ Complete |
| 12 | **Feature:** One-click Copy to Clipboard with fallback support | ✅ Complete |
| 13 | **Feature:** Admin Ingestion UI (Upload & Index Transcripts via Web) | ✅ Complete |
| 14 | **Refactor:** Advanced State Management via Zustand Store | ✅ Complete |

---

*Built with ❤️ as a learning project for modern AI-native application development.*

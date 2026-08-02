"""
RAG Diagnostic + Ingestion Script (uses local HuggingFace embeddings)
Run from c:\\lenny with: .\\backend\\venv\\Scripts\\python.exe test.py
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

TRANSCRIPTS_DIR = os.path.join("backend", "data", "transcripts", "episodes")
DB_DIR = os.path.join("backend", "data", "chroma_db")

# ── 1. Check transcript files ─────────────────────────────────────────────────
md_files = []
for root, dirs, files in os.walk(TRANSCRIPTS_DIR):
    for f in files:
        if f.endswith(".md"):
            md_files.append(os.path.join(root, f))

print(f"[1] Transcript .md files found: {len(md_files)}")

# ── 2. Setup local embeddings (no API key, no rate limits) ───────────────────
print("\n[2] Loading local embedding model (all-MiniLM-L6-v2)...")
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)
print("    Embedding model loaded.")

# ── 3. Check current DB state ─────────────────────────────────────────────────
print("\n[3] Connecting to ChromaDB...")
vector_db = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
count = vector_db._collection.count()
print(f"    Chunks in vector DB: {count}")

# ── 4. Ingest if empty ────────────────────────────────────────────────────────
if count == 0:
    print("\n[4] DB is empty. Starting ingestion...")
    from langchain_community.document_loaders import DirectoryLoader, TextLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    loader = DirectoryLoader(
        TRANSCRIPTS_DIR,
        glob="**/*.md",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
        show_progress=True,
    )
    docs = loader.load()
    print(f"    Loaded {len(docs)} documents")

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = splitter.split_documents(docs)
    print(f"    Created {len(chunks)} chunks. Embedding in batches...")

    BATCH_SIZE = 500
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        if i == 0:
            vector_db = Chroma.from_documents(batch, embeddings, persist_directory=DB_DIR)
        else:
            vector_db.add_documents(batch)
        pct = min(i + BATCH_SIZE, len(chunks))
        print(f"    [{pct}/{len(chunks)}] chunks embedded...", end="\r")

    count = vector_db._collection.count()
    print(f"\n    Ingestion complete! {count} chunks stored.")
else:
    print(f"    DB already has {count} chunks — skipping ingestion.")

# ── 5. Retrieval test ─────────────────────────────────────────────────────────
print("\n[5] Retrieval test: 'product management advice'")
results = vector_db.similarity_search("product management advice", k=3)
print(f"    Results: {len(results)}")
for i, doc in enumerate(results):
    print(f"\n  --- Chunk {i+1} ---")
    print(f"  Source: {doc.metadata.get('source', 'N/A')}")
    print(f"  Content: {doc.page_content[:300]}")

print("\n[6] Retrieval test: 'how to grow a newsletter'")
results2 = vector_db.similarity_search("how to grow a newsletter", k=3)
print(f"    Results: {len(results2)}")
for i, doc in enumerate(results2):
    print(f"\n  --- Chunk {i+1} ---")
    print(f"  Source: {doc.metadata.get('source', 'N/A')}")
    print(f"  Content: {doc.page_content[:300]}")
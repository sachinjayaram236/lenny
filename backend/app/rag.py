import os
import sys
from dotenv import load_dotenv

# Load environment variables from the root .env file
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

# Ensure the venv site-packages is on the path (resolves sentence_transformers lookup issues)
_venv_site = os.path.join(os.path.dirname(__file__), "../../venv/Lib/site-packages")
_venv_site = os.path.normpath(_venv_site)
if _venv_site not in sys.path:
    sys.path.insert(0, _venv_site)

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

TRANSCRIPTS_DIR = os.path.join(os.path.dirname(__file__), "../data/transcripts/episodes")
DB_DIR = os.path.join(os.path.dirname(__file__), "../data/chroma_db")

# Local embeddings — no API key needed, no rate limits, runs on CPU
embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)


def ingest_transcripts():
    if os.path.exists(DB_DIR) and os.listdir(DB_DIR):
        vector_db = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
        count = vector_db._collection.count()
        if count > 0:
            print(f"Vector database already exists with {count} chunks. Skipping ingestion.")
            return vector_db
        print("Vector database exists but is empty. Re-ingesting...")

    print("Loading transcript files...")
    loader = DirectoryLoader(
        TRANSCRIPTS_DIR,
        glob="**/*.md",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
        show_progress=True,
    )
    docs = loader.load()

    if not docs:
        print("No transcripts found to ingest.")
        return None

    print(f"Loaded {len(docs)} transcript documents. Chunking...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = text_splitter.split_documents(docs)
    print(f"Created {len(chunks)} chunks. Embedding in batches...")

    # Batch ingest to avoid memory issues with 37k+ chunks
    BATCH_SIZE = 500
    vector_db = None
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        if vector_db is None:
            vector_db = Chroma.from_documents(batch, embeddings, persist_directory=DB_DIR)
        else:
            vector_db.add_documents(batch)
        print(f"  Ingested {min(i + BATCH_SIZE, len(chunks))}/{len(chunks)} chunks...")

    print("Ingestion complete!")
    return vector_db


def ingest_single_file(file_path: str) -> int:
    """Ingests a single transcript file and returns the number of chunks added."""
    print(f"Loading single transcript file: {file_path}")
    
    loader = TextLoader(file_path, encoding="utf-8")
    docs = loader.load()

    if not docs:
        print("File was empty.")
        return 0

    print(f"Loaded 1 document. Chunking...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = text_splitter.split_documents(docs)
    print(f"Created {len(chunks)} chunks. Embedding...")

    vector_db = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    vector_db.add_documents(chunks)
    
    print("Ingestion complete!")
    return len(chunks)


def search_transcripts(query: str, top_k: int = 5):
    vector_db = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    results = vector_db.similarity_search(query, k=top_k)
    return [{"content": doc.page_content, "metadata": doc.metadata} for doc in results]


def get_indexed_chunks_count():
    try:
        vector_db = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
        return vector_db._collection.count()
    except Exception:
        return 0

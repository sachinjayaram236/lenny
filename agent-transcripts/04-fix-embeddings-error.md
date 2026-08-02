# Fix: HuggingFaceEmbeddings PyTorch Circular Import Error

## Issue
During the initial Phase 2 setup, we used `sentence-transformers` and `HuggingFaceEmbeddings` for the vector indexing pipeline. However, running the application resulted in a circular import failure related to PyTorch dependencies from within `sentence-transformers`.

## Resolution
To circumvent the PyTorch issues and leverage local models efficiently, we have refactored the embedding generation to utilize `OllamaEmbeddings`.

**Changes Made:**
1. **`backend/requirements.txt`**: 
   - Removed `sentence-transformers`.
   - Added `langchain-ollama`.
2. **`backend/app/rag.py`**:
   - Swapped the `HuggingFaceEmbeddings` import for `OllamaEmbeddings` (from `langchain_ollama`).
   - Re-initialized the `embeddings` variable to use `OllamaEmbeddings(model="gemma4:12b")`.
   - Cleaned up the initialization sequence for ChromaDB in both `ingest_transcripts()` and `search_transcripts()`, ensuring we persist correctly without hitting HuggingFace/PyTorch codepaths.
   - Restored the `get_indexed_chunks_count()` function which the health check endpoint in `main.py` requires.

# Phase 3: LLM Switching Layer & Agentic Skills Pipeline

## Prompt
Please build Phase 3 (LLM Switching Layer & Agentic Skills Pipeline) in our FastAPI backend.

### Specifications & Requirements:

1. Flexible LLM Abstraction Layer (`backend/app/llm.py`):
   - Implement a unified function `generate_llm_response(prompt: str, provider: str = "ollama", system_prompt: str = "") -> str`.
   - If `provider == "ollama"`: Route the prompt to local Ollama API using `gemma4:12b` (or active local model).
   - If `provider == "cloud"`: Route the prompt using the `anthropic` Claude Python SDK (`claude-3-5-sonnet-20241022`). Include error handling if ANTHROPIC_API_KEY is missing.

2. Agent Skills Router & Prompt Engineering (`backend/app/agent.py`):
   - **Intent Classifier:** Detect whether the user prompt requests a standard Q&A, a Ship30for30 Essay, or an Artifact UI Component.
   - **Skill 1 (Q&A):** Retrieve top context chunks via `search_transcripts()`. Force the LLM to answer strictly based on the retrieved podcast transcript insights.
   - **Skill 2 (Ship30for30 Essay):** System prompt instructing the LLM to write a ~1,250-word essay following Ship30for30 formatting (strong hook line, bold text for skimmability, clear bullet points, actionable takeaways). Return formatted Markdown.
   - **Skill 3 (Artifact Generation):** Instruct the LLM to generate raw HTML/CSS component snippets wrapped inside `<artifact type="html" title="...">...</artifact>` tags or Markdown inside `<artifact type="markdown" title="...">...</artifact>` tags.

3. Complete Chat API Endpoint (`backend/app/main.py`):
   - `POST /api/chat`: Accepts JSON `{"message": "...", "provider": "ollama" | "cloud", "session_id": "..."}`.
   - Retrieves transcript context, runs prompt through the agent skills pipeline, and returns `{"response": "...", "artifact": {"type": "...", "title": "...", "content": "..."} | null}`.

4. Log Progress & Update Documentation:
   - Create `agent-transcripts/05-phase3-llm-skills-agent.md` logging this prompt and response.
   - Update `README.md` under "Step-by-Step Progress Log" marking "Step 3: Dual LLM Configuration & Agent Skills" as Completed.

## Response
- Created `backend/app/llm.py` with `generate_llm_response` supporting `ollama` and `cloud` (Anthropic).
- Created `backend/app/agent.py` with intent classification and prompt engineering for 3 skills (Q&A, Ship30for30 Essay, Artifact Generation).
- Updated `backend/app/main.py` with the `/api/chat` endpoint to integrate the agent pipeline and return responses matching the specified schema.
- Updated `README.md` progress log.
- Created this log file `05-phase3-llm-skills-agent.md`.

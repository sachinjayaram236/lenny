import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

from openai import OpenAI
from anthropic import Anthropic

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "google/gemma-4-26b-a4b-it:free"


def generate_llm_response(prompt: str, provider: str = "openrouter", system_prompt: str = "") -> str:
    """
    Generates a response from the specified LLM provider.
    """
    if provider == "openrouter":
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            return "Error: OPENROUTER_API_KEY environment variable is not set."

        try:
            client = OpenAI(
                base_url=OPENROUTER_BASE_URL,
                api_key=api_key,
            )
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=messages,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error communicating with OpenRouter: {str(e)}"

    elif provider == "cloud":
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return "Error: ANTHROPIC_API_KEY environment variable is not set."

        try:
            client = Anthropic(api_key=api_key)

            kwargs = {
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 4096,
                "messages": [{"role": "user", "content": prompt}],
            }
            if system_prompt:
                kwargs["system"] = system_prompt

            response = client.messages.create(**kwargs)
            return response.content[0].text
        except Exception as e:
            return f"Error communicating with Anthropic Claude: {str(e)}"

    else:
        return f"Error: Unknown provider '{provider}'"

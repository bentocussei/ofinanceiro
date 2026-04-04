"""Web tools — search and fetch for the agent system.

WebSearch: Uses Anthropic's native server-side web_search tool via the API.
WebFetch: HTTP client that fetches URLs and converts HTML to markdown.

Inspired by Claude Code's WebSearchTool and WebFetchTool.
"""

import logging
import time

import httpx
from markdownify import markdownify as md

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# WebFetch — fetch a URL and return content as markdown
# ---------------------------------------------------------------------------

MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB
MAX_RESULT_CHARS = 50_000  # 50k chars max for LLM context
FETCH_TIMEOUT = 30  # seconds


async def web_fetch(url: str, prompt: str = "") -> dict:
    """Fetch a URL and return its content as markdown.

    Args:
        url: The URL to fetch (must be https://)
        prompt: What to extract from the page

    Returns:
        dict with: url, content (markdown), status_code, bytes, duration_ms
    """
    if not url.startswith("http"):
        url = f"https://{url}"

    # Upgrade http to https
    if url.startswith("http://"):
        url = url.replace("http://", "https://", 1)

    start = time.monotonic()

    try:
        async with httpx.AsyncClient(
            timeout=FETCH_TIMEOUT,
            follow_redirects=True,
            max_redirects=10,
        ) as client:
            response = await client.get(
                url,
                headers={
                    "Accept": "text/html, text/markdown, */*",
                    "User-Agent": "OFinanceiro/1.0 (Financial Assistant)",
                },
            )

        duration_ms = int((time.monotonic() - start) * 1000)
        raw_bytes = len(response.content)
        content_type = response.headers.get("content-type", "")

        # Only process text content
        if "text/html" in content_type or "text/plain" in content_type:
            html = response.text
            # Convert HTML to clean markdown
            content = md(html, strip=["img", "script", "style", "nav", "footer", "header"])
            # Clean up excessive whitespace
            lines = [line.strip() for line in content.split("\n")]
            content = "\n".join(line for line in lines if line)
        elif "application/json" in content_type:
            content = response.text
        else:
            content = f"[Conteúdo binário: {content_type}, {raw_bytes} bytes]"

        # Truncate if too long
        if len(content) > MAX_RESULT_CHARS:
            content = content[:MAX_RESULT_CHARS] + "\n\n[... conteúdo truncado ...]"

        return {
            "url": str(response.url),
            "status_code": response.status_code,
            "content": content,
            "bytes": raw_bytes,
            "duration_ms": duration_ms,
        }

    except httpx.TimeoutException:
        return {"url": url, "error": f"Timeout ao aceder {url} ({FETCH_TIMEOUT}s)"}
    except httpx.ConnectError:
        return {"url": url, "error": f"Não foi possível conectar a {url}"}
    except Exception as e:
        logger.exception("web_fetch failed for %s", url)
        return {"url": url, "error": f"Erro ao aceder {url}: {e!s}"}


# ---------------------------------------------------------------------------
# WebSearch — uses Anthropic's native server-side search tool
# ---------------------------------------------------------------------------

async def web_search(query: str) -> dict:
    """Search the web using Anthropic's native web_search tool.

    This calls the Anthropic API with the web_search_20250305 tool type,
    which performs server-side search and returns results.

    Falls back to a simple message if the API doesn't support it.
    """
    try:
        import anthropic
        from app.config import settings

        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            tools=[{
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": 3,
            }],
            messages=[{
                "role": "user",
                "content": f"Pesquisa na web: {query}. Responde em Português com as fontes.",
            }],
        )

        # Extract text and search results from response
        results = []
        text_parts = []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "web_search_tool_result":
                for result in getattr(block, "content", []):
                    if hasattr(result, "title") and hasattr(result, "url"):
                        results.append({
                            "title": result.title,
                            "url": result.url,
                            "snippet": getattr(result, "page_snippet", ""),
                        })

        return {
            "query": query,
            "summary": "\n".join(text_parts),
            "results": results[:10],
            "result_count": len(results),
            "model": response.model,
        }

    except Exception as e:
        logger.warning("web_search failed: %s", e)
        return {
            "query": query,
            "error": f"Pesquisa web não disponível de momento: {e!s}",
            "results": [],
        }

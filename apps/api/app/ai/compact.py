"""Context compaction — auto-summarize long conversations.

Inspired by Claude Code's compact system:
- Tracks token count estimate across messages
- When threshold exceeded, summarizes oldest messages
- Keeps recent messages intact for continuity
- Uses Claude Haiku for fast, cheap summarization
- Transparent to user — conversation continues seamlessly
"""

import logging

from app.ai.llm.base import LLMMessage, LLMResponse
from app.ai.llm.router import LLMRouter, TaskType

logger = logging.getLogger(__name__)

# Token estimation: ~4 chars per token (rough estimate for Portuguese)
CHARS_PER_TOKEN = 4

# Thresholds
MAX_CONTEXT_TOKENS = 150_000  # Claude Sonnet context window
COMPACT_THRESHOLD = 100_000  # Trigger compaction at ~67% of max
KEEP_RECENT_MESSAGES = 10  # Always keep last N messages intact
MIN_MESSAGES_TO_COMPACT = 6  # Don't compact if fewer than this

COMPACT_PROMPT = """Resume a seguinte conversa entre um utilizador e um assistente financeiro.
Mantem os factos importantes: valores, datas, nomes de contas, decisoes tomadas, transaccoes registadas.
O resumo deve ser conciso mas nao perder informacao financeira relevante.
Responde APENAS com o resumo, sem introducao.

Conversa:
"""


def estimate_tokens(messages: list[LLMMessage]) -> int:
    """Estimate token count for a list of messages."""
    total_chars = sum(len(m.content or "") for m in messages)
    # Add overhead for role markers, tool calls, etc.
    overhead = len(messages) * 20
    return (total_chars + overhead) // CHARS_PER_TOKEN


def needs_compaction(messages: list[LLMMessage]) -> bool:
    """Check if messages need compaction based on estimated token count."""
    if len(messages) < MIN_MESSAGES_TO_COMPACT:
        return False
    return estimate_tokens(messages) > COMPACT_THRESHOLD


async def compact_messages(
    router: LLMRouter,
    messages: list[LLMMessage],
) -> list[LLMMessage]:
    """Compact a message list by summarizing older messages.

    Keeps system prompt (first message) and recent messages.
    Summarizes everything in between into a single context message.

    Returns new message list with summary replacing old messages.
    """
    if not needs_compaction(messages):
        return messages

    # Separate: system prompt + old messages + recent messages
    system_msgs = [m for m in messages[:1] if m.role == "system"]
    non_system = [m for m in messages if m.role != "system"]

    if len(non_system) <= KEEP_RECENT_MESSAGES:
        return messages

    old_messages = non_system[:-KEEP_RECENT_MESSAGES]
    recent_messages = non_system[-KEEP_RECENT_MESSAGES:]

    # Build conversation text from old messages
    conversation_parts = []
    for msg in old_messages:
        if msg.role == "user":
            conversation_parts.append(f"Utilizador: {msg.content}")
        elif msg.role == "assistant":
            conversation_parts.append(f"Assistente: {msg.content}")
        elif msg.role == "tool":
            conversation_parts.append(f"[Resultado de tool: {msg.content[:200]}]")

    if not conversation_parts:
        return messages

    conversation_text = "\n".join(conversation_parts)

    # Summarize using Claude Haiku (fast, cheap)
    try:
        response: LLMResponse = await router.chat(
            task=TaskType.MEMORY_EXTRACTION,  # Uses Haiku
            messages=[
                LLMMessage(
                    role="user",
                    content=f"{COMPACT_PROMPT}\n{conversation_text}",
                ),
            ],
            temperature=0.0,
            max_tokens=500,
        )

        summary = response.content.strip()
        if not summary:
            return messages

        # Build new message list
        summary_msg = LLMMessage(
            role="user",
            content=f"[Resumo da conversa anterior: {summary}]",
        )

        compacted = [*system_msgs, summary_msg, *recent_messages]

        old_tokens = estimate_tokens(messages)
        new_tokens = estimate_tokens(compacted)
        logger.info(
            "Compacted conversation: %d msgs → %d msgs, ~%d → ~%d tokens",
            len(messages), len(compacted), old_tokens, new_tokens,
        )

        return compacted

    except Exception:
        logger.warning("Compaction failed — using original messages")
        return messages

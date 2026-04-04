"""Tool registry — centralized definition and discovery of all agent tools.

Inspired by Claude Code's tool registry (~/Developer/anthropic/tools.ts):
- Rich metadata per tool (category, read-only, version, agent)
- Centralized registration at module init
- Introspection for frontend and API
- Replaces the hardcoded SAFE_TOOLS frozenset in base.py
"""

import logging
from dataclasses import dataclass

from app.ai.llm.base import ToolDefinition

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ToolMeta:
    """Rich tool definition with metadata beyond what the LLM needs.

    The LLM only sees name/description/parameters (via to_tool_definition).
    The registry uses the rest for introspection, safety, and API exposure.
    """

    name: str
    description: str
    parameters: dict
    agent: str
    category: str = "query"  # "query" | "action" | "compute"
    read_only: bool = True
    confirm_before_execute: bool = False
    version: str = "1.0"

    def to_tool_definition(self) -> ToolDefinition:
        """Convert to the LLM-facing ToolDefinition (name + description + params)."""
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=self.parameters,
            confirm_before_execute=self.confirm_before_execute,
        )


class ToolRegistry:
    """Centralized tool registry. Singleton.

    All agents register their tools here at import time.
    The registry provides:
    - Tool lookup by agent name (for LLM tool lists)
    - Read-only checks (replaces SAFE_TOOLS)
    - Full introspection (for /api/v1/tools endpoint)
    """

    _instance: "ToolRegistry | None" = None

    def __init__(self) -> None:
        # Key: "agent:tool_name" to allow same tool name across agents
        self._tools: dict[str, ToolMeta] = {}

    @classmethod
    def instance(cls) -> "ToolRegistry":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @staticmethod
    def _key(tool: ToolMeta) -> str:
        return f"{tool.agent}:{tool.name}"

    def register(self, tool: ToolMeta) -> None:
        """Register a single tool."""
        key = self._key(tool)
        if key in self._tools:
            logger.warning("Tool '%s' already registered for agent '%s', overwriting", tool.name, tool.agent)
        self._tools[key] = tool

    def register_many(self, tools: list[ToolMeta]) -> None:
        """Register multiple tools at once."""
        for tool in tools:
            self.register(tool)

    def get_all(self) -> list[ToolMeta]:
        """Return all registered tools."""
        return list(self._tools.values())

    def get_by_agent(self, agent_name: str) -> list[ToolMeta]:
        """Return all tools owned by a specific agent."""
        return [t for t in self._tools.values() if t.agent == agent_name]

    def get_by_name(self, name: str) -> ToolMeta | None:
        """Look up a tool by name (returns first match across agents)."""
        for tool in self._tools.values():
            if tool.name == name:
                return tool
        return None

    def is_read_only(self, name: str) -> bool:
        """Check if a tool is read-only (safe for concurrent execution)."""
        tool = self.get_by_name(name)
        if tool is None:
            # Unknown tools: fall back to name heuristic
            return name.startswith("get_") or name.startswith("list_")
        return tool.read_only

    def get_tools_for_agent(self, agent_name: str) -> list[ToolDefinition]:
        """Return ToolDefinition list for an agent (LLM-facing)."""
        return [t.to_tool_definition() for t in self.get_by_agent(agent_name)]

    def count(self) -> int:
        return len(self._tools)

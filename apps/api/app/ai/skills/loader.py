"""Skill loader and resolver.

Skills are markdown files with YAML frontmatter stored in this directory.
They inject specialized knowledge into agent system prompts via the
{loaded_skills} placeholder that every agent template already has.

Inspired by Claude Code's skill system (~/Developer/anthropic/skills/).
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

SKILLS_DIR = Path(__file__).parent


# ---------------------------------------------------------------------------
# Skill dataclass
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Skill:
    """A knowledge module that can be injected into an agent's system prompt."""

    name: str
    description: str
    agents: list[str]
    body: str
    priority: int = 10
    triggers: list[str] = field(default_factory=list)
    always: bool = False

    @property
    def char_count(self) -> int:
        return len(self.body)


# ---------------------------------------------------------------------------
# SkillLoader — reads .md files from disk once at startup
# ---------------------------------------------------------------------------

class SkillLoader:
    """Reads skill markdown files from the skills directory."""

    def __init__(self, skills_dir: Path | None = None) -> None:
        self._skills_dir = skills_dir or SKILLS_DIR
        self._skills: dict[str, Skill] = {}

    def load_all(self) -> None:
        """Scan the skills directory for .md files and parse them."""
        for md_file in sorted(self._skills_dir.glob("*.md")):
            try:
                skill = self._parse_skill_file(md_file)
                if skill:
                    self._skills[skill.name] = skill
                    logger.info("Skill loaded: %s (%d chars, agents=%s)", skill.name, skill.char_count, skill.agents)
            except Exception as e:
                logger.warning("Failed to parse skill file %s: %s", md_file.name, e)

    def _parse_skill_file(self, path: Path) -> Skill | None:
        """Parse a markdown file with YAML frontmatter into a Skill."""
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---"):
            return None

        parts = text.split("---", 2)
        if len(parts) < 3:
            return None

        frontmatter_raw = parts[1]
        body = parts[2].strip()

        meta = yaml.safe_load(frontmatter_raw)
        if not meta or "name" not in meta or "agents" not in meta:
            logger.warning("Skill file %s missing required fields (name, agents)", path.name)
            return None

        return Skill(
            name=meta["name"],
            description=meta.get("description", ""),
            agents=[a.strip() for a in meta["agents"]],
            body=body,
            priority=meta.get("priority", 10),
            triggers=[t.strip().lower() for t in meta.get("triggers", [])],
            always=meta.get("always", False),
        )

    def get_all(self) -> list[Skill]:
        return list(self._skills.values())

    def get_by_name(self, name: str) -> Skill | None:
        return self._skills.get(name)


# ---------------------------------------------------------------------------
# SkillResolver — selects which skills to inject per request
# ---------------------------------------------------------------------------

class SkillResolver:
    """Decides which skills to inject for a given agent + user message.

    Budget: max total characters for all skills combined in one prompt.
    Skills are selected by priority (highest first) within budget.
    """

    BUDGET_CHARS = 5000  # ~1250 tokens

    def __init__(self, loader: SkillLoader) -> None:
        self._loader = loader

    def resolve(self, agent_name: str, user_message: str) -> str:
        """Return combined skill text to inject into {loaded_skills}."""
        candidates: list[Skill] = []
        message_lower = user_message.lower()

        for skill in self._loader.get_all():
            # Skill must list this agent
            if agent_name not in skill.agents:
                continue

            # Always-on skills are always included
            if skill.always:
                candidates.append(skill)
                continue

            # Trigger-based skills: check if any trigger word appears in message
            if skill.triggers and any(t in message_lower for t in skill.triggers):
                candidates.append(skill)

        if not candidates:
            return ""

        # Sort by priority (highest first)
        candidates.sort(key=lambda s: s.priority, reverse=True)

        # Apply budget — first-fit
        selected: list[Skill] = []
        total_chars = 0
        for skill in candidates:
            if total_chars + skill.char_count <= self.BUDGET_CHARS:
                selected.append(skill)
                total_chars += skill.char_count

        if not selected:
            return ""

        parts = [f"=== SKILL: {s.name.upper()} ===\n{s.body}" for s in selected]
        return "\n\n".join(parts)

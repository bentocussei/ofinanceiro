"""Tests for token metering, cache, and AI categorization."""

import pytest

from app.ai.metering import PLAN_DAILY_LIMITS


class TestPlanLimits:
    def test_free_plan_limit(self) -> None:
        assert PLAN_DAILY_LIMITS["free"] == 5_000

    def test_personal_plan_limit(self) -> None:
        assert PLAN_DAILY_LIMITS["personal"] == 50_000

    def test_family_plan_limit(self) -> None:
        assert PLAN_DAILY_LIMITS["family"] == 80_000

    def test_family_plus_plan_limit(self) -> None:
        assert PLAN_DAILY_LIMITS["family_plus"] == 150_000

    def test_all_plans_have_limits(self) -> None:
        expected_plans = {"free", "personal", "family", "family_plus"}
        assert set(PLAN_DAILY_LIMITS.keys()) == expected_plans


class TestMemoryExtractor:
    @pytest.mark.asyncio
    async def test_extract_salary_day(self) -> None:
        from app.ai.memory.extractor import FACT_PATTERNS
        import re

        pattern, key = FACT_PATTERNS[0]
        match = re.search(pattern, "recebo dia 25", re.IGNORECASE)
        assert match is not None
        assert key == "salary_day"
        assert match.group(1) == "25"

    @pytest.mark.asyncio
    async def test_extract_children(self) -> None:
        from app.ai.memory.extractor import FACT_PATTERNS
        import re

        pattern, key = FACT_PATTERNS[1]
        match = re.search(pattern, "tenho 2 filhos", re.IGNORECASE)
        assert match is not None
        assert key == "num_children"
        assert match.group(1) == "2"

    @pytest.mark.asyncio
    async def test_extract_bank(self) -> None:
        from app.ai.memory.extractor import FACT_PATTERNS
        import re

        pattern, key = FACT_PATTERNS[3]
        match = re.search(pattern, "a minha conta no BAI", re.IGNORECASE)
        assert match is not None
        assert key == "primary_bank"
        assert match.group(1) == "BAI"

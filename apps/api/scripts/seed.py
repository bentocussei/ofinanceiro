"""Seed the database with system categories for Angola."""

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.category import Category
from app.models.enums import CategoryType
from app.models.seed_categories import SYSTEM_CATEGORIES


async def seed_categories(db: AsyncSession) -> int:
    """Insert system categories if they don't exist. Returns count of inserted."""
    # Check if system categories already exist
    result = await db.execute(select(Category).where(Category.is_system.is_(True)).limit(1))
    if result.scalar_one_or_none():
        print("System categories already exist, skipping seed.")
        return 0

    count = 0
    for cat_data in SYSTEM_CATEGORIES:
        parent_id = uuid.uuid4()
        parent = Category(
            id=parent_id,
            user_id=None,
            parent_id=None,
            name=cat_data["name"],
            icon=cat_data.get("icon"),
            type=CategoryType(cat_data["type"]),
            is_system=True,
            sort_order=cat_data["sort"],
        )
        db.add(parent)
        count += 1

        for child_data in cat_data.get("children", []):
            child = Category(
                id=uuid.uuid4(),
                user_id=None,
                parent_id=parent_id,
                name=child_data["name"],
                icon=None,
                type=CategoryType(cat_data["type"]),
                is_system=True,
                sort_order=child_data["sort"],
            )
            db.add(child)
            count += 1

    await db.commit()
    print(f"Seeded {count} system categories.")
    return count


async def main() -> None:
    async with async_session() as db:
        await seed_categories(db)


if __name__ == "__main__":
    asyncio.run(main())

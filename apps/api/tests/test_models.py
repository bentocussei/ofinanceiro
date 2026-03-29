"""Tests for data models and schemas."""

import uuid
from datetime import date, datetime

import pytest

from app.models.enums import (
    AccountType,
    CategoryType,
    CurrencyCode,
    SubscriptionPlan,
    TransactionType,
)
from app.schemas.account import AccountCreate, AccountResponse
from app.schemas.category import CategoryCreate
from app.schemas.transaction import TransactionCreate
from app.schemas.user import UserCreate, UserResponse


class TestEnums:
    def test_account_types(self) -> None:
        assert AccountType.BANK == "bank"
        assert AccountType.CASH == "cash"
        assert AccountType.DIGITAL_WALLET == "digital_wallet"

    def test_transaction_types(self) -> None:
        assert TransactionType.EXPENSE == "expense"
        assert TransactionType.INCOME == "income"
        assert TransactionType.TRANSFER == "transfer"

    def test_currency_codes(self) -> None:
        assert CurrencyCode.AOA == "AOA"
        assert CurrencyCode.USD == "USD"

    def test_category_types(self) -> None:
        assert CategoryType.EXPENSE == "expense"
        assert CategoryType.INCOME == "income"
        assert CategoryType.BOTH == "both"


class TestUserSchemas:
    def test_user_create(self) -> None:
        user = UserCreate(
            phone="+244923456789",
            name="João Silva",
            password="securepass123",
        )
        assert user.currency_default == CurrencyCode.AOA
        assert user.country == "AO"
        assert user.language == "pt-AO"

    def test_user_response(self) -> None:
        data = {
            "id": uuid.uuid4(),
            "email": None,
            "phone": "+244923456789",
            "name": "Maria Santos",
            "avatar_url": None,
            "currency_default": "AOA",
            "country": "AO",
            "language": "pt-AO",
            "plan": "free",
            "salary_day": 25,
            "month_start_day": 1,
            "preferences": {},
            "onboarding_completed": False,
            "created_at": datetime.now(),
        }
        response = UserResponse(**data)
        assert response.plan == SubscriptionPlan.FREE
        assert response.salary_day == 25


class TestAccountSchemas:
    def test_account_create_defaults(self) -> None:
        account = AccountCreate(name="BAI - Conta Corrente", type=AccountType.BANK)
        assert account.currency == CurrencyCode.AOA
        assert account.balance == 0

    def test_account_create_with_balance(self) -> None:
        account = AccountCreate(
            name="Carteira",
            type=AccountType.CASH,
            balance=15000000,  # 150.000 Kz in centavos
            icon="💵",
        )
        assert account.balance == 15000000

    def test_account_response(self) -> None:
        data = {
            "id": uuid.uuid4(),
            "user_id": uuid.uuid4(),
            "family_id": None,
            "name": "Multicaixa Express",
            "type": "digital_wallet",
            "currency": "AOA",
            "balance": 5000000,
            "icon": "📱",
            "color": "#4CAF50",
            "institution": "MCX",
            "iban": None,
            "nib": None,
            "swift_code": None,
            "account_holder": None,
            "is_archived": False,
            "is_shared": False,
            "sort_order": 0,
            "created_at": datetime.now(),
        }
        response = AccountResponse(**data)
        assert response.type == AccountType.DIGITAL_WALLET
        assert response.balance == 5000000


class TestTransactionSchemas:
    def test_transaction_create_expense(self) -> None:
        txn = TransactionCreate(
            account_id=uuid.uuid4(),
            category_id=uuid.uuid4(),
            amount=500000,  # 5.000 Kz
            type=TransactionType.EXPENSE,
            description="Almoço no restaurante",
        )
        assert txn.amount == 500000
        assert txn.type == TransactionType.EXPENSE

    def test_transaction_amount_must_be_positive(self) -> None:
        with pytest.raises(ValueError):
            TransactionCreate(
                account_id=uuid.uuid4(),
                amount=-100,
                type=TransactionType.EXPENSE,
            )

    def test_transaction_amount_max_limit(self) -> None:
        with pytest.raises(ValueError):
            TransactionCreate(
                account_id=uuid.uuid4(),
                amount=100_000_000_01,  # Over 100M Kz
                type=TransactionType.EXPENSE,
            )

    def test_transaction_date_defaults_to_today(self) -> None:
        txn = TransactionCreate(
            account_id=uuid.uuid4(),
            amount=100000,
            type=TransactionType.INCOME,
        )
        assert txn.transaction_date == date.today()


class TestCategorySchemas:
    def test_category_create(self) -> None:
        cat = CategoryCreate(name="Supermercado", type=CategoryType.EXPENSE)
        assert cat.parent_id is None

    def test_category_create_subcategory(self) -> None:
        parent_id = uuid.uuid4()
        cat = CategoryCreate(
            name="Gasolina",
            parent_id=parent_id,
            icon="⛽",
            type=CategoryType.EXPENSE,
        )
        assert cat.parent_id == parent_id


class TestSeedData:
    def test_seed_categories_structure(self) -> None:
        from app.models.seed_categories import SYSTEM_CATEGORIES

        assert len(SYSTEM_CATEGORIES) > 10  # At least 10 top-level categories

        total_categories = 0
        for cat in SYSTEM_CATEGORIES:
            total_categories += 1
            assert "name" in cat
            assert "type" in cat
            assert cat["type"] in ("expense", "income")
            total_categories += len(cat.get("children", []))

        assert total_categories >= 60  # At least 60 categories total

import enum


class AccountType(enum.StrEnum):
    BANK = "bank"
    DIGITAL_WALLET = "digital_wallet"
    CASH = "cash"
    SAVINGS = "savings"
    INVESTMENT = "investment"
    CREDIT_CARD = "credit_card"
    LOAN = "loan"


class TransactionType(enum.StrEnum):
    EXPENSE = "expense"
    INCOME = "income"
    TRANSFER = "transfer"


class CategoryType(enum.StrEnum):
    EXPENSE = "expense"
    INCOME = "income"
    BOTH = "both"


class CurrencyCode(enum.StrEnum):
    AOA = "AOA"
    USD = "USD"
    EUR = "EUR"
    MZN = "MZN"
    CVE = "CVE"


class SubscriptionPlan(enum.StrEnum):
    FREE = "free"
    PERSONAL = "personal"
    FAMILY = "family"
    FAMILY_PLUS = "family_plus"


class BudgetMethod(enum.StrEnum):
    CATEGORY = "category"
    FIFTY_THIRTY_TWENTY = "fifty_thirty_twenty"
    ENVELOPE = "envelope"
    FLEX = "flex"
    ZERO_BASED = "zero_based"


class BudgetPeriod(enum.StrEnum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class GoalStatus(enum.StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DebtType(enum.StrEnum):
    MORTGAGE = "mortgage"
    CAR_LOAN = "car_loan"
    PERSONAL_LOAN = "personal_loan"
    CREDIT_CARD = "credit_card"
    INFORMAL = "informal"
    OTHER = "other"


class FamilyRole(enum.StrEnum):
    ADMIN = "admin"
    ADULT = "adult"
    DEPENDENT = "dependent"


class NotificationType(enum.StrEnum):
    BUDGET_ALERT = "budget_alert"
    BILL_REMINDER = "bill_reminder"
    SMART_INSIGHT = "smart_insight"
    WEEKLY_SUMMARY = "weekly_summary"
    MONTHLY_SUMMARY = "monthly_summary"
    GOAL_MILESTONE = "goal_milestone"
    UNUSUAL_SPENDING = "unusual_spending"
    FAMILY_CONTRIBUTION = "family_contribution"
    MANUAL_REMINDER = "manual_reminder"
    STREAK = "streak"
    DEBT_DUE = "debt_due"


class FactType(enum.StrEnum):
    SALARY_DAY = "salary_day"
    SALARY_AMOUNT = "salary_amount"
    NUM_CHILDREN = "num_children"
    PRIMARY_BANK = "primary_bank"
    RENT_AMOUNT = "rent_amount"
    EMPLOYER = "employer"
    SPENDING_PATTERN = "spending_pattern"
    PREFERENCE = "preference"
    LIFE_EVENT = "life_event"
    CUSTOM = "custom"


class FactSource(enum.StrEnum):
    USER_STATED = "user_stated"
    INFERRED = "inferred"
    RECURRING_DETECTED = "recurring_detected"
    ONBOARDING = "onboarding"


class ChatRole(enum.StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

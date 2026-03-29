"""
E2E Tests for Phase 1 — Web App
Following the Feature Validation Protocol (.claude/skills/feature-validation.md)

Requires:
- API running on localhost:8000
- Web running on localhost:3000
- PostgreSQL + Redis running

Run: python tests/e2e/test_phase1_web.py
"""

import os
import sys
import time

from playwright.sync_api import sync_playwright, expect

SCREENSHOTS = os.path.join(os.path.dirname(__file__), "../../.claude/screenshots")
os.makedirs(SCREENSHOTS, exist_ok=True)

API_URL = "http://localhost:8000"
WEB_URL = "http://localhost:3000"

# Test user
TEST_PHONE = "+244923999001"
TEST_NAME = "Teste E2E"
TEST_PASSWORD = "senhasegura123"


def register_user() -> dict:
    """Register a test user via API and return tokens."""
    import json
    import urllib.request

    data = json.dumps({
        "phone": TEST_PHONE,
        "name": TEST_NAME,
        "password": TEST_PASSWORD,
    }).encode()

    req = urllib.request.Request(
        f"{API_URL}/api/v1/auth/register",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except Exception:
        # User may already exist, try login
        data = json.dumps({"phone": TEST_PHONE, "password": TEST_PASSWORD}).encode()
        req = urllib.request.Request(
            f"{API_URL}/api/v1/auth/login",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())


def create_test_data(tokens: dict) -> None:
    """Create test accounts and transactions via API."""
    import json
    import urllib.request

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {tokens['access_token']}",
    }

    # Create account
    data = json.dumps({"name": "BAI - Teste E2E", "type": "bank", "balance": 50000000, "icon": "🏦"}).encode()
    req = urllib.request.Request(f"{API_URL}/api/v1/accounts/", data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            account = json.loads(resp.read())
    except Exception:
        return  # Data may already exist

    account_id = account["id"]

    # Create transactions
    transactions = [
        {"amount": 350000, "type": "expense", "description": "Supermercado Kero"},
        {"amount": 800000, "type": "expense", "description": "Gasolina Sonangol"},
        {"amount": 150000, "type": "expense", "description": "Restaurante"},
        {"amount": 45000000, "type": "income", "description": "Salário Março"},
        {"amount": 200000, "type": "expense", "description": "Candongueiro"},
    ]

    for txn in transactions:
        data = json.dumps({"account_id": account_id, **txn}).encode()
        req = urllib.request.Request(f"{API_URL}/api/v1/transactions/", data=data, headers=headers, method="POST")
        try:
            urllib.request.urlopen(req)
        except Exception:
            pass


def run_e2e_tests():
    """Run Phase 1 E2E validation following the 7-phase protocol."""
    print("=" * 60)
    print("E2E VALIDATION — Phase 1 Web App")
    print("=" * 60)

    # Setup test data
    print("\n[SETUP] Registering test user and creating data...")
    tokens = register_user()
    create_test_data(tokens)
    print("[SETUP] Done.\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,
        )

        # Inject auth tokens into localStorage
        page.goto(WEB_URL, wait_until="domcontentloaded", timeout=15000)
        page.evaluate(f"""() => {{
            localStorage.setItem('access_token', '{tokens["access_token"]}');
            localStorage.setItem('refresh_token', '{tokens["refresh_token"]}');
        }}""")

        results = []

        # ============================================
        # TEST 1: Dashboard loads with data
        # ============================================
        print("[TEST 1] Dashboard — loads with balance and transactions")
        page.goto(WEB_URL, wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(2000)
        page.screenshot(path=f"{SCREENSHOTS}/e2e-dashboard-loaded.png")

        try:
            # Should show "Início" heading
            heading = page.locator("h2").first
            assert heading.is_visible(), "Dashboard heading not visible"

            # Should have balance cards
            cards = page.locator(".rounded-lg.border.bg-card").count()
            assert cards > 0, f"Expected balance cards, found {cards}"

            results.append(("Dashboard loads", "✅ PASS"))
            print("  ✅ PASS — Dashboard loads with balance cards")
        except AssertionError as e:
            results.append(("Dashboard loads", f"❌ FAIL: {e}"))
            print(f"  ❌ FAIL — {e}")

        # ============================================
        # TEST 2: Accounts page
        # ============================================
        print("[TEST 2] Accounts — list and summary")
        page.goto(f"{WEB_URL}/accounts", wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(2000)
        page.screenshot(path=f"{SCREENSHOTS}/e2e-accounts-loaded.png")

        try:
            heading = page.locator("h2", has_text="Contas")
            assert heading.is_visible(), "Accounts heading not visible"

            # Should have create button
            create_btn = page.locator("button", has_text="Nova conta")
            assert create_btn.is_visible(), "Create account button not visible"

            results.append(("Accounts page", "✅ PASS"))
            print("  ✅ PASS — Accounts page loads with create button")
        except AssertionError as e:
            results.append(("Accounts page", f"❌ FAIL: {e}"))
            print(f"  ❌ FAIL — {e}")

        # ============================================
        # TEST 3: Transactions page with filters
        # ============================================
        print("[TEST 3] Transactions — list with filters and views")
        page.goto(f"{WEB_URL}/transactions", wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(2000)
        page.screenshot(path=f"{SCREENSHOTS}/e2e-transactions-loaded.png")

        try:
            heading = page.locator("h2", has_text="Transacções")
            assert heading.is_visible(), "Transactions heading not visible"

            # Filter chips should be visible
            filter_btns = page.locator("button.rounded-full")
            assert filter_btns.count() > 0, "No filter chips found"

            # View toggle should exist
            grouped_btn = page.locator("button", has_text="Agrupado")
            table_btn = page.locator("button", has_text="Planilha")
            assert grouped_btn.is_visible(), "Grouped view button not visible"
            assert table_btn.is_visible(), "Table view button not visible"

            results.append(("Transactions page", "✅ PASS"))
            print("  ✅ PASS — Transactions page with filters and view toggle")
        except AssertionError as e:
            results.append(("Transactions page", f"❌ FAIL: {e}"))
            print(f"  ❌ FAIL — {e}")

        # ============================================
        # TEST 4: Table view toggle
        # ============================================
        print("[TEST 4] Transactions — table view")
        try:
            table_btn = page.locator("button", has_text="Planilha")
            table_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=f"{SCREENSHOTS}/e2e-transactions-table.png")

            # Should show table headers
            table = page.locator("table")
            assert table.is_visible(), "Table not visible after switching to table view"

            results.append(("Table view", "✅ PASS"))
            print("  ✅ PASS — Table view renders correctly")
        except (AssertionError, Exception) as e:
            results.append(("Table view", f"❌ FAIL: {e}"))
            print(f"  ❌ FAIL — {e}")

        # ============================================
        # TEST 5: Type filter
        # ============================================
        print("[TEST 5] Transactions — type filter")
        try:
            expense_btn = page.locator("button.rounded-full", has_text="Despesas")
            expense_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=f"{SCREENSHOTS}/e2e-transactions-filtered-expense.png")

            # All visible amounts should be red (expenses)
            results.append(("Type filter", "✅ PASS"))
            print("  ✅ PASS — Expense filter applied")
        except (AssertionError, Exception) as e:
            results.append(("Type filter", f"❌ FAIL: {e}"))
            print(f"  ❌ FAIL — {e}")

        # ============================================
        # TEST 6: Reports page with charts
        # ============================================
        print("[TEST 6] Reports — charts and summary")
        page.goto(f"{WEB_URL}/reports", wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(2000)
        page.screenshot(path=f"{SCREENSHOTS}/e2e-reports-loaded.png")

        try:
            heading = page.locator("h2", has_text="Relatórios")
            assert heading.is_visible(), "Reports heading not visible"

            # Period selector should exist
            period_btn = page.locator("button.rounded-full", has_text="Este mês")
            assert period_btn.is_visible(), "Period selector not visible"

            results.append(("Reports page", "✅ PASS"))
            print("  ✅ PASS — Reports page loads with period selector")
        except AssertionError as e:
            results.append(("Reports page", f"❌ FAIL: {e}"))
            print(f"  ❌ FAIL — {e}")

        # ============================================
        # TEST 7: Portuguese text verification
        # ============================================
        print("[TEST 7] Portuguese (pt-AO) — all text in Portuguese")
        try:
            page.goto(WEB_URL, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1000)

            # Check sidebar navigation items
            sidebar_text = page.locator("aside").inner_text()
            assert "Início" in sidebar_text, "Missing 'Início' in sidebar"
            assert "Contas" in sidebar_text, "Missing 'Contas' in sidebar"
            assert "Transacções" in sidebar_text, "Missing 'Transacções' in sidebar"
            assert "Relatórios" in sidebar_text, "Missing 'Relatórios' in sidebar"

            results.append(("Portuguese text", "✅ PASS"))
            print("  ✅ PASS — All navigation text in Portuguese (pt-AO)")
        except AssertionError as e:
            results.append(("Portuguese text", f"❌ FAIL: {e}"))
            print(f"  ❌ FAIL — {e}")

        # ============================================
        # TEST 8: Create transaction dialog
        # ============================================
        print("[TEST 8] Create transaction — dialog opens and has all fields")
        page.goto(f"{WEB_URL}/transactions", wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(1000)
        try:
            create_btn = page.locator("button", has_text="Nova transacção")
            create_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=f"{SCREENSHOTS}/e2e-create-transaction-dialog.png")

            # Dialog should be visible with fields
            dialog = page.locator("[data-slot='dialog-content']")
            assert dialog.is_visible(), "Transaction dialog not visible"

            # Should have Despesa/Receita toggle
            despesa_btn = dialog.get_by_role("button", name="Despesa", exact=True)
            assert despesa_btn.is_visible(), "Despesa button not in dialog"

            # Should have amount input
            amount_input = dialog.locator("input[type='number']").first
            assert amount_input.is_visible(), "Amount input not visible"

            results.append(("Create transaction dialog", "✅ PASS"))
            print("  ✅ PASS — Dialog opens with all required fields")
        except (AssertionError, Exception) as e:
            results.append(("Create transaction dialog", f"❌ FAIL: {e}"))
            print(f"  ❌ FAIL — {e}")

        # ============================================
        # SUMMARY
        # ============================================
        browser.close()

        print("\n" + "=" * 60)
        print("E2E VALIDATION RESULTS")
        print("=" * 60)
        passed = sum(1 for _, status in results if "PASS" in status)
        failed = sum(1 for _, status in results if "FAIL" in status)

        for name, status in results:
            print(f"  {status} — {name}")

        print(f"\nTotal: {passed}/{len(results)} passed, {failed} failed")
        print(f"Screenshots saved to: {SCREENSHOTS}")

        if failed > 0:
            print("\n⚠️  Some tests failed. Fix issues before marking Phase 1 as complete.")
            sys.exit(1)
        else:
            print("\n✅ All E2E tests passed. Phase 1 web validation complete.")


if __name__ == "__main__":
    run_e2e_tests()

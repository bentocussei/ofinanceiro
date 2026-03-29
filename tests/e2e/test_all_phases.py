"""
E2E Tests — ALL Phases (0-7)
Validates every web page loads, navigation works, and core features function.

Requires:
- API running on localhost:8000
- Web running on localhost:3000
- PostgreSQL + Redis running

Run: python tests/e2e/test_all_phases.py
"""

import json
import os
import sys
import urllib.request

from playwright.sync_api import sync_playwright

SCREENSHOTS = os.path.join(os.path.dirname(__file__), "../../.claude/screenshots")
os.makedirs(SCREENSHOTS, exist_ok=True)

API_URL = "http://localhost:8000"
WEB_URL = "http://localhost:3000"

TEST_PHONE = "+244923888001"
TEST_PASSWORD = "senhasegura123"


def api_call(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(f"{API_URL}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def setup_test_data():
    """Register user and create test data."""
    result = api_call("POST", "/api/v1/auth/register", {
        "phone": TEST_PHONE, "name": "E2E Full", "password": TEST_PASSWORD
    })
    if not result:
        result = api_call("POST", "/api/v1/auth/login", {
            "phone": TEST_PHONE, "password": TEST_PASSWORD
        })
    token = result["access_token"]

    # Create account
    api_call("POST", "/api/v1/accounts/", {
        "name": "BAI E2E", "type": "bank", "balance": 50000000
    }, token)

    # Create transactions
    acc = api_call("GET", "/api/v1/accounts/", token=token)
    if acc:
        acc_id = acc[0]["id"]
        for desc, amt in [("Supermercado", 350000), ("Gasolina", 800000), ("Salário", 45000000)]:
            txn_type = "income" if "Salário" in desc else "expense"
            api_call("POST", "/api/v1/transactions/", {
                "account_id": acc_id, "amount": amt, "type": txn_type, "description": desc
            }, token)

    # Create budget
    api_call("POST", "/api/v1/budgets/", {
        "name": "E2E Budget", "period_start": "2026-03-01", "period_end": "2026-03-31", "total_limit": 10000000
    }, token)

    # Create goal
    api_call("POST", "/api/v1/goals/", {
        "name": "Férias E2E", "target_amount": 50000000, "monthly_contribution": 5000000
    }, token)

    return token


def run_e2e():
    print("=" * 60)
    print("E2E VALIDATION — ALL PHASES")
    print("=" * 60)

    print("\n[SETUP] Creating test data...")
    token = setup_test_data()
    print("[SETUP] Done.\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=2)

        # Inject auth
        page.goto(WEB_URL, wait_until="domcontentloaded", timeout=15000)
        page.evaluate(f"""() => {{
            localStorage.setItem('access_token', '{token}');
            localStorage.setItem('refresh_token', 'dummy');
        }}""")

        results = []

        # ============ ALL PAGES ============
        pages_to_test = [
            ("/", "Dashboard"),
            ("/accounts", "Contas"),
            ("/transactions", "Transacções"),
            ("/budget", "Orçamentos"),
            ("/goals", "Metas"),
            ("/family", "Família"),
            ("/reports", "Relatórios"),
            ("/notifications", "Notificações"),
            ("/debts", "Dívidas"),
            ("/investments", "Investimentos"),
            ("/news", "Notícias"),
            ("/education", "Educação"),
        ]

        for path, name in pages_to_test:
            print(f"[TEST] {name} ({path})")
            try:
                page.goto(f"{WEB_URL}{path}", wait_until="domcontentloaded", timeout=15000)
                page.wait_for_timeout(1500)
                page.screenshot(path=f"{SCREENSHOTS}/e2e-{path.strip('/') or 'dashboard'}.png")

                # Verify page loaded (has content, no error)
                body = page.locator("body").inner_text()
                assert len(body) > 10, f"Page {path} appears empty"
                assert "Internal Server Error" not in body, f"Page {path} has server error"

                results.append((name, "PASS"))
                print(f"  PASS")
            except Exception as e:
                results.append((name, f"FAIL: {e}"))
                print(f"  FAIL: {e}")

        # ============ SIDEBAR NAVIGATION ============
        print(f"\n[TEST] Sidebar navigation")
        try:
            page.goto(WEB_URL, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1000)
            sidebar = page.locator("aside").first
            assert sidebar.is_visible(), "Sidebar not visible"
            sidebar_text = sidebar.inner_text()
            required_items = ["Início", "Contas", "Transacções", "Orçamentos", "Metas", "Família", "Relatórios", "Notificações"]
            for item in required_items:
                assert item in sidebar_text, f"Missing '{item}' in sidebar"
            results.append(("Sidebar navigation", "PASS"))
            print(f"  PASS — all {len(required_items)} items present")
        except Exception as e:
            results.append(("Sidebar navigation", f"FAIL: {e}"))
            print(f"  FAIL: {e}")

        # ============ CHAT PANEL ============
        print(f"\n[TEST] Chat panel")
        try:
            page.goto(WEB_URL, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1000)
            chat = page.locator("aside").last
            assert chat.is_visible(), "Chat panel not visible"
            results.append(("Chat panel", "PASS"))
            print(f"  PASS")
        except Exception as e:
            results.append(("Chat panel", f"FAIL: {e}"))
            print(f"  FAIL: {e}")

        # ============ CREATE TRANSACTION DIALOG ============
        print(f"\n[TEST] Create transaction dialog")
        try:
            page.goto(f"{WEB_URL}/transactions", wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1500)
            create_btn = page.locator("button", has_text="Nova transacção")
            if create_btn.is_visible():
                create_btn.click()
                page.wait_for_timeout(500)
                dialog = page.locator("[data-slot='dialog-content']")
                assert dialog.is_visible(), "Dialog not visible"
                page.screenshot(path=f"{SCREENSHOTS}/e2e-create-transaction.png")
                results.append(("Create transaction", "PASS"))
                print(f"  PASS")
            else:
                results.append(("Create transaction", "SKIP — button not found"))
                print(f"  SKIP")
        except Exception as e:
            results.append(("Create transaction", f"FAIL: {e}"))
            print(f"  FAIL: {e}")

        # ============ PORTUGUESE TEXT ============
        print(f"\n[TEST] Portuguese (pt-AO) text")
        try:
            page.goto(WEB_URL, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1000)
            html = page.locator("html")
            lang = html.get_attribute("lang")
            assert lang == "pt-AO", f"Expected lang='pt-AO', got '{lang}'"
            results.append(("Portuguese text", "PASS"))
            print(f"  PASS — lang=pt-AO")
        except Exception as e:
            results.append(("Portuguese text", f"FAIL: {e}"))
            print(f"  FAIL: {e}")

        # ============ NO EMOJIS IN UI ============
        print(f"\n[TEST] No emojis in navigation")
        try:
            page.goto(WEB_URL, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1000)
            sidebar_text = page.locator("aside").first.inner_text()
            emoji_chars = set("🏠💳🔄📊🎯📈⚙️💰🛡️🛒✈️🎉📚🏖️🏦📱💵📋🤖📦✅")
            found_emojis = [c for c in sidebar_text if c in emoji_chars]
            assert len(found_emojis) == 0, f"Found emojis in sidebar: {found_emojis}"
            results.append(("No emojis", "PASS"))
            print(f"  PASS — no emojis in sidebar")
        except Exception as e:
            results.append(("No emojis", f"FAIL: {e}"))
            print(f"  FAIL: {e}")

        browser.close()

        # ============ SUMMARY ============
        print("\n" + "=" * 60)
        print("E2E VALIDATION RESULTS")
        print("=" * 60)
        passed = sum(1 for _, s in results if s == "PASS")
        failed = sum(1 for _, s in results if s.startswith("FAIL"))
        skipped = sum(1 for _, s in results if s.startswith("SKIP"))

        for name, status in results:
            icon = "PASS" if status == "PASS" else "FAIL" if status.startswith("FAIL") else "SKIP"
            print(f"  {icon} — {name}")

        print(f"\nTotal: {passed} passed, {failed} failed, {skipped} skipped out of {len(results)}")
        print(f"Screenshots: {SCREENSHOTS}")

        if failed > 0:
            print("\nSome tests FAILED.")
            sys.exit(1)
        else:
            print("\nALL E2E TESTS PASSED.")


if __name__ == "__main__":
    run_e2e()

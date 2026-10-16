"""Test script - login and list invoices."""

if __name__ != "__main__":
    import pytest

    pytest.skip("Manual API script; run it directly instead of collecting it", allow_module_level=True)

import httpx

BASE = "http://localhost:8000"

# Login
login = httpx.post(
    f"{BASE}/api/v1/auth/login",
    json={"email": "admin@demobusiness.co.ls", "password": "Admin123!"},
    timeout=15,
)
token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# List invoices
r = httpx.get(f"{BASE}/api/v1/invoices/", headers=headers, timeout=15)
print(f"Status: {r.status_code}")
invoices = r.json()
print(f"Count: {len(invoices)}")
for inv in invoices:
    item_count = len(inv.get("items", []))
    print(f"  - {inv['invoice_number']}: {inv['total']} LSL ({item_count} items)")

"""Test script - create another invoice to verify counter increment."""

if __name__ != "__main__":
    import pytest

    pytest.skip("Manual API script; run it directly instead of collecting it", allow_module_level=True)

import httpx

BASE = "http://localhost:8000"

login = httpx.post(
    f"{BASE}/api/v1/auth/login",
    json={"email": "admin@demobusiness.co.ls", "password": "Admin123!"},
    timeout=15,
)
token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

customers = httpx.get(f"{BASE}/api/v1/customers/", headers=headers, timeout=15).json()
rates = httpx.get(f"{BASE}/api/v1/tax-rates/", headers=headers, timeout=15).json()
vat15 = next(r for r in rates if r["code"] == "VAT15")

payload = {
    "customer_id": customers[0]["id"],
    "items": [
        {
            "tax_rate_id": vat15["id"],
            "description": "Consulting session",
            "quantity": "2",
            "unit_price": "1500.00",
            "discount_amount": "100.00",
        }
    ],
}

r = httpx.post(f"{BASE}/api/v1/invoices/", headers=headers, json=payload, timeout=15)
print(f"Status: {r.status_code}")
inv = r.json()
print(f"Invoice: {inv['invoice_number']}")
print(f"Subtotal: {inv['subtotal']}")
print(f"Discount: {inv['discount_total']}")
print(f"Tax:      {inv['tax_total']}")
print(f"Total:    {inv['total']}")

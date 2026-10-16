"""Payment method enumeration and metadata."""

from enum import Enum


class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    MPESA = "mpesa"
    ECOCASH = "ecocash"
    CARD = "card"
    CHEQUE = "cheque"
    OTHER = "other"


PAYMENT_METHOD_LABELS = {
    PaymentMethod.CASH: "Cash",
    PaymentMethod.BANK_TRANSFER: "Bank Transfer",
    PaymentMethod.MPESA: "M-Pesa",
    PaymentMethod.ECOCASH: "EcoCash",
    PaymentMethod.CARD: "Card",
    PaymentMethod.CHEQUE: "Cheque",
    PaymentMethod.OTHER: "Other",
}


MOBILE_MONEY_METHODS = {
    PaymentMethod.MPESA,
    PaymentMethod.ECOCASH,
}


def is_mobile_money(method: str) -> bool:
    """Return True if the method is a mobile money method."""
    try:
        return PaymentMethod(method) in MOBILE_MONEY_METHODS
    except ValueError:
        return False


def list_payment_methods() -> list[dict]:
    """Return all payment methods with labels for the frontend."""
    return [
        {"code": m.value, "label": PAYMENT_METHOD_LABELS[m], "is_mobile_money": m in MOBILE_MONEY_METHODS}
        for m in PaymentMethod
    ]


"""Brevo transactional email sender (real provider, via httpx)."""

import logging

import httpx

from app.core.config import get_settings
from app.integrations.email.base import EmailSender

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
REQUEST_TIMEOUT_SECONDS = 10


class BrevoEmailSender(EmailSender):
    """Send transactional emails through Brevo.

    Reads credentials from application settings:

    - EMAIL_API_KEY
    - EMAIL_FROM_ADDRESS
    - EMAIL_FROM_NAME

    If EMAIL_API_KEY is missing, send() returns False and logs a warning.
    Never raises on network errors - always returns True or False.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.email_api_key
        self._from_address = settings.email_from_address
        self._from_name = settings.email_from_name

    def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str,
        to_name: str | None = None,
    ) -> bool:
        if not self._api_key:
            logger.warning(
                "Email not sent: EMAIL_API_KEY is not configured. "
                "Recipient was %s (subject=%r).",
                to,
                subject,
            )
            return False

        recipient: dict[str, str] = {"email": to}
        if to_name:
            recipient["name"] = to_name

        payload = {
            "sender": {"email": self._from_address, "name": self._from_name},
            "to": [recipient],
            "subject": subject,
            "htmlContent": html,
            "textContent": text,
        }

        headers = {
            "api-key": self._api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        try:
            with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                response = client.post(BREVO_API_URL, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.error("Email send failed (transport) for %s: %s", to, exc)
            return False

        if 200 <= response.status_code < 300:
            logger.info("Email sent to %s (subject=%r)", to, subject)
            return True

        # Log a safe error summary - never log the API key.
        logger.error(
            "Email send failed for %s: status=%s body=%s",
            to,
            response.status_code,
            response.text[:500],
        )
        return False
"""Email integration package.

Provides a single entry point (get_email_sender) that returns the
configured EmailSender implementation. Currently only Brevo is
supported; add more providers here as they are needed.
"""

from app.integrations.email.base import EmailSender
from app.integrations.email.brevo import BrevoEmailSender


def get_email_sender() -> EmailSender:
    """Return the configured email sender implementation."""
    return BrevoEmailSender()


__all__ = ["EmailSender", "BrevoEmailSender", "get_email_sender"]
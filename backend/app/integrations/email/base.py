"""Abstract interface for email senders."""

from abc import ABC, abstractmethod


class EmailSender(ABC):
    """Interface all email senders must implement.

    Implementations return True on success and False on failure.
    They must not raise on transport errors - callers rely on the
    boolean return value to decide what to do.
    """

    @abstractmethod
    def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str,
        to_name: str | None = None,
    ) -> bool:
        """Send an email. Returns True on success, False on failure."""
        raise NotImplementedError
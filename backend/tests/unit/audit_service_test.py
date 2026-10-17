import asyncio
from uuid import uuid4

import httpx

from app.main import create_app
from app.models.audit_log import AuditLog
from app.services import audit_service


def test_log_action_persists_request_context():
    class RecordingSession:
        def add(self, value):
            self.value = value

    db = RecordingSession()
    token = audit_service.set_request_context("192.0.2.10", "test-client")
    try:
        entry = audit_service.log_action(
            db,
            tenant_id=uuid4(),
            user_id=uuid4(),
            action="test.action",
            entity_type="test",
        )
    finally:
        audit_service.reset_request_context(token)

    assert isinstance(entry, AuditLog)
    assert entry.ip_address == "192.0.2.10"
    assert entry.user_agent == "test-client"
    assert db.value is entry


def test_http_request_context_reaches_audit_log():
    app = create_app()
    captured = {}

    @app.get("/test-audit-context")
    def capture_context():
        db = type("RecordingSession", (), {"add": lambda self, entry: None})()
        entry = audit_service.log_action(
            db,
            tenant_id=uuid4(),
            user_id=uuid4(),
            action="test.action",
            entity_type="test",
        )
        captured["ip_address"] = entry.ip_address
        captured["user_agent"] = entry.user_agent
        return {"ok": True}

    async def request_context():
        transport = httpx.ASGITransport(
            app=app,
            client=("192.0.2.20", 12345),
        )
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"user-agent": "integration-test"},
        ) as client:
            return await client.get("/test-audit-context")

    response = asyncio.run(request_context())

    assert response.status_code == 200
    assert captured == {
        "ip_address": "192.0.2.20",
        "user_agent": "integration-test",
    }

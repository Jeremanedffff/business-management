from datetime import date
from types import SimpleNamespace
from uuid import uuid4

from app.models.fiscal_period import FiscalPeriod
from app.models.status import Status
from app.models.tax_rate import TaxRate
from app.models.tenant_setting import TenantSetting
from app.services import tenant_service


class EmptyResult:
    def scalar_one_or_none(self):
        return None

    def scalars(self):
        return self

    def first(self):
        return None


class RecordingSession:
    def __init__(self):
        self.added = []

    def execute(self, _statement):
        return EmptyResult()

    def add(self, value):
        self.added.append(value)

    def flush(self):
        pass


def test_tenant_defaults_are_scoped_and_open_current_calendar_month(monkeypatch):
    class FrozenDate(date):
        @classmethod
        def today(cls):
            return cls(2024, 2, 29)

    monkeypatch.setattr(tenant_service, "date", FrozenDate)
    first_tenant = SimpleNamespace(id=uuid4())
    second_tenant = SimpleNamespace(id=uuid4())
    first_session = RecordingSession()
    second_session = RecordingSession()

    tenant_service.initialize_tenant_defaults(first_session, first_tenant)
    tenant_service.initialize_tenant_defaults(second_session, second_tenant)

    def tenant_rows(session, model):
        return [row for row in session.added if isinstance(row, model)]

    for session, tenant in ((first_session, first_tenant), (second_session, second_tenant)):
        statuses = tenant_rows(session, Status)
        tax_rates = tenant_rows(session, TaxRate)
        settings = tenant_rows(session, TenantSetting)
        periods = tenant_rows(session, FiscalPeriod)

        assert {row.code for row in statuses} >= {
            "draft", "approved", "sent", "paid", "overdue", "cancelled"
        }
        assert {row.code for row in tax_rates} == {"VAT15", "VAT0", "EXEMPT"}
        assert {row.key: row.value for row in settings} == {
            "invoice_prefix": "INV-",
            "invoice_next_number": "1",
        }
        assert len(periods) == 1
        assert (periods[0].name, periods[0].start_date, periods[0].end_date) == (
            "February 2024",
            date(2024, 2, 1),
            date(2024, 2, 29),
        )
        assert periods[0].status == "open"
        assert all(row.tenant_id == tenant.id for row in statuses + tax_rates + settings + periods)

    assert first_tenant.id != second_tenant.id

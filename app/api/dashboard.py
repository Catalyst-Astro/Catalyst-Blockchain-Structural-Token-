from __future__ import annotations

from datetime import datetime
from pathlib import Path

from markdown_it import MarkdownIt

from app.core.config import Settings
from app.core.models import Event, ModuleStatus, Policy, SystemStatus

BASE_TEMPLATE = Path(__file__).parent / "templates" / "base.html"


def render_dashboard_html(
    system_status: SystemStatus,
    statuses: list[ModuleStatus],
    policies: list[Policy],
    events: list[Event],
    settings: Settings,
) -> str:
    markdown = build_markdown(system_status, statuses, policies, events, settings)
    renderer = MarkdownIt("commonmark")
    content_html = renderer.render(markdown)
    template = BASE_TEMPLATE.read_text(encoding="utf-8")
    html = template.replace("{{content}}", content_html).replace(
        "{{title}}", "Catalyst Blockchain Core"
    )
    return html


def build_markdown(
    system_status: SystemStatus,
    statuses: list[ModuleStatus],
    policies: list[Policy],
    events: list[Event],
    settings: Settings,
) -> str:
    policy_map = {policy.id: policy for policy in policies}
    status_map = {status.name: status for status in statuses}

    def policy_line(policy_id: str, label: str) -> str:
        policy = policy_map.get(policy_id)
        if not policy:
            return f"- {label}: UNKNOWN"
        detail = f" ({policy.detail})" if policy.detail else ""
        return f"- {label}: {policy.status}{detail}"

    def status_line(module_id: str, label: str) -> str:
        status = status_map.get(module_id)
        if not status:
            return f"- {label}: UNKNOWN"
        return f"- {label}: {status.status} ({status.detail})"

    last_updated = system_status.updated_at.isoformat()
    markdown = [
        "# Catalyst Blockchain Core",
        "",
        f"- Environment: {settings.app_env}",
        f"- Updated: {last_updated}",
        f"- Modules: {system_status.module_count}",
        f"- Policies: {system_status.policy_count}",
        f"- Events: {system_status.event_count}",
        "",
        "## 1) Estado General",
        f"- Estado: {system_status.status}",
        status_line("compliance_dao", "Governance Health"),
        status_line("operations_audit", "Audit Health"),
        "",
        "## 2) Cumplimiento",
        policy_line("kyc_aml_gate", "KYC/AML Gate"),
        policy_line("travel_rule", "Travel Rule"),
        "",
        "## 3) Identidad",
        policy_line("sbt_required", "SBT Required"),
        policy_line("sbt_expiry_enforced", "SBT Expiry"),
        "",
        "## 4) Restricciones",
        policy_line("lockups_active", "Lockups"),
        policy_line("jurisdiction_filter", "Jurisdiction"),
        policy_line("purpose_restriction", "Purpose Restriction"),
        "",
        "## 5) Freeze",
        policy_line("freeze_wallets", "Wallets"),
        policy_line("freeze_series", "Series"),
        policy_line("freeze_functions", "Functions"),
        "",
        "## 6) Gobernanza",
        policy_line("dao_quorum", "Quorum"),
        policy_line("vote_period", "Voting Period"),
        policy_line("guardian_enabled", "Guardian Veto"),
        "",
        "## 7) Fideicomiso",
        policy_line("trust_active", "Trusts"),
        policy_line("revenue_reports", "Revenue Reports"),
        "",
        "## 8) Listing",
        policy_line("listing_phase", "Listing Phase"),
        policy_line("venues_allowed", "Venues"),
        "",
        "## 9) Simulacion",
        policy_line("ssi_index", "SSI"),
        policy_line("bai_index", "BAI"),
        "",
        "## 10) Auditoria",
        policy_line("audit_checkpoints", "Checkpoints"),
        policy_line("audit_trail", "Audit Trail"),
        "",
        "## 11) Eventos recientes",
        "",
        build_event_table(events),
    ]
    return "\n".join(markdown)


def build_event_table(events: list[Event]) -> str:
    if not events:
        return "_No events yet._"

    rows = ["| Time | Module | Type | Severity | Message |", "| --- | --- | --- | --- | --- |"]
    for event in events[:10]:
        timestamp = _format_time(event.timestamp)
        rows.append(
            f"| {timestamp} | {event.module} | {event.type} | {event.severity} | {event.message} |"
        )
    return "\n".join(rows)


def _format_time(value: datetime) -> str:
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    return str(value)

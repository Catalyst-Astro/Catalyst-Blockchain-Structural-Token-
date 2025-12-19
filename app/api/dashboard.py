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
    renderer = MarkdownIt("commonmark", {"html": True})
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
    nav = [
        '<nav class="nav-tabs">',
        '<a href="#general">General</a>',
        '<a href="#compliance">Compliance</a>',
        '<a href="#identity">Identity</a>',
        '<a href="#tokens">Tokens</a>',
        '<a href="#restrictions">Restrictions</a>',
        '<a href="#freeze">Freeze</a>',
        '<a href="#governance">Governance</a>',
        '<a href="#trust">Trust</a>',
        '<a href="#listing">Listing</a>',
        '<a href="#simulation">Simulation</a>',
        '<a href="#audit">Audit</a>',
        '<a href="#events">Events</a>',
        "</nav>",
    ]
    token_chart = [
        '<section class="panel">',
        "<h3>Token Activity (Mock)</h3>",
        '<canvas id="tokenChart" width="860" height="240" aria-label="Token activity chart"></canvas>',
        "</section>",
        '<script>',
        "const tokenChart = document.getElementById('tokenChart');",
        "if (tokenChart) {",
        "  const ctx = tokenChart.getContext('2d');",
        "  const labels = ['W1','W2','W3','W4','W5','W6','W7'];",
        "  const totalSupply = [1.0,1.0,1.02,1.03,1.05,1.06,1.06];",
        "  const circulating = [0.6,0.62,0.63,0.66,0.68,0.7,0.72];",
        "  const padding = 24;",
        "  const w = tokenChart.width - padding * 2;",
        "  const h = tokenChart.height - padding * 2;",
        "  ctx.clearRect(0,0,tokenChart.width,tokenChart.height);",
        "  ctx.fillStyle = '#071107';",
        "  ctx.fillRect(0,0,tokenChart.width,tokenChart.height);",
        "  ctx.strokeStyle = '#214a21';",
        "  ctx.lineWidth = 1;",
        "  for (let i = 0; i <= 4; i++) {",
        "    const y = padding + (h / 4) * i;",
        "    ctx.beginPath();",
        "    ctx.moveTo(padding, y);",
        "    ctx.lineTo(padding + w, y);",
        "    ctx.stroke();",
        "  }",
        "  const maxVal = 1.1;",
        "  const toXY = (v, i) => {",
        "    const x = padding + (w / (labels.length - 1)) * i;",
        "    const y = padding + h - (v / maxVal) * h;",
        "    return {x, y};",
        "  };",
        "  const drawLine = (series, color) => {",
        "    ctx.strokeStyle = color;",
        "    ctx.lineWidth = 2;",
        "    ctx.beginPath();",
        "    series.forEach((v, i) => {",
        "      const {x, y} = toXY(v, i);",
        "      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);",
        "    });",
        "    ctx.stroke();",
        "  };",
        "  drawLine(totalSupply, '#a8ff60');",
        "  drawLine(circulating, '#7dff7d');",
        "  ctx.fillStyle = '#7dff7d';",
        "  ctx.font = '12px Courier New, monospace';",
        "  ctx.fillText('Total Supply', padding, padding - 6);",
        "  ctx.fillStyle = '#a8ff60';",
        "  ctx.fillText('Circulating', padding + 140, padding - 6);",
        "}",
        "</script>",
    ]
    markdown = [
        "# Catalyst Blockchain Core",
        "",
        *nav,
        "",
        f"- Environment: {settings.app_env}",
        f"- Updated: {last_updated}",
        f"- Modules: {system_status.module_count}",
        f"- Policies: {system_status.policy_count}",
        f"- Events: {system_status.event_count}",
        "",
        '<a id="general"></a>',
        "## 1) General Status",
        f"- Status: {system_status.status}",
        status_line("compliance_dao", "Governance Health"),
        status_line("operations_audit", "Audit Health"),
        "",
        '<a id="compliance"></a>',
        "## 2) Compliance",
        policy_line("kyc_aml_gate", "KYC/AML Gate"),
        policy_line("travel_rule", "Travel Rule"),
        "",
        '<a id="identity"></a>',
        "## 3) Identity",
        policy_line("sbt_required", "SBT Required"),
        policy_line("sbt_expiry_enforced", "SBT Expiry"),
        "",
        '<a id="tokens"></a>',
        "## 4) Tokens",
        policy_line("token_symbol", "Symbol"),
        policy_line("token_decimals", "Decimals"),
        policy_line("token_supply", "Total Supply"),
        policy_line("token_minting", "Minting"),
        policy_line("token_enforcement", "Enforcement"),
        "",
        *token_chart,
        "",
        '<a id="restrictions"></a>',
        "## 5) Restrictions",
        policy_line("lockups_active", "Lockups"),
        policy_line("jurisdiction_filter", "Jurisdiction"),
        policy_line("purpose_restriction", "Purpose Restriction"),
        "",
        '<a id="freeze"></a>',
        "## 6) Freeze",
        policy_line("freeze_wallets", "Wallets"),
        policy_line("freeze_series", "Series"),
        policy_line("freeze_functions", "Functions"),
        "",
        '<a id="governance"></a>',
        "## 7) Governance",
        policy_line("dao_quorum", "Quorum"),
        policy_line("vote_period", "Voting Period"),
        policy_line("guardian_enabled", "Guardian Veto"),
        "",
        '<a id="trust"></a>',
        "## 8) Trust",
        policy_line("trust_active", "Trusts"),
        policy_line("revenue_reports", "Revenue Reports"),
        "",
        '<a id="listing"></a>',
        "## 9) Listing",
        policy_line("listing_phase", "Listing Phase"),
        policy_line("venues_allowed", "Venues"),
        "",
        '<a id="simulation"></a>',
        "## 10) Simulation",
        policy_line("ssi_index", "SSI"),
        policy_line("bai_index", "BAI"),
        "",
        '<a id="audit"></a>',
        "## 11) Audit",
        policy_line("audit_checkpoints", "Checkpoints"),
        policy_line("audit_trail", "Audit Trail"),
        "",
        '<a id="events"></a>',
        "## 12) Recent Events",
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

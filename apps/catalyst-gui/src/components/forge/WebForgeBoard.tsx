import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  Boxes,
  Building2,
  Landmark,
  Orbit,
  ScanSearch,
  ShieldCheck,
  ShoppingBag,
  TerminalSquare,
  Truck,
  WandSparkles,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";

type BusinessId = "capital" | "logistics" | "health" | "commerce" | "civic";
type VisualSystemId = "signal" | "executive" | "terminal" | "service";
type TerminalModeId = "strict" | "guided" | "assistant";
type ForgeModuleId =
  | "compliance"
  | "evidence"
  | "treasury"
  | "settlement"
  | "partners"
  | "inventory"
  | "care"
  | "incidents";

interface ForgeBusiness {
  id: BusinessId;
  label: string;
  strapline: string;
  icon: React.ReactNode;
  outcome: string;
  defaultSurface: UiSurface;
  defaultModules: ForgeModuleId[];
  terminalSeed: string;
  architectureFocus: string[];
}

interface ForgeVisualSystem {
  id: VisualSystemId;
  label: string;
  description: string;
  accentClass: string;
  shellClass: string;
  tokenRefs: string[];
}

interface ForgeTerminalMode {
  id: TerminalModeId;
  label: string;
  description: string;
  commandFlavor: string;
}

interface ForgeModule {
  id: ForgeModuleId;
  label: string;
  description: string;
}

interface ForgeSurfaceOption {
  value: UiSurface;
  label: string;
  description: string;
}

interface WebForgeBoardProps {
  onSeedCase: (input: { requester: string; surface: UiSurface; intent: UiCopilotIntent; summary: string }) => void;
}

const businesses: ForgeBusiness[] = [
  {
    id: "capital",
    label: "Capital Desk",
    strapline: "Structured issuance, treasury, and investor control.",
    icon: <Landmark className="h-5 w-5" aria-hidden />,
    outcome: "Turn capital-market workflows into a governed cockpit with settlement evidence.",
    defaultSurface: "dashboard",
    defaultModules: ["treasury", "settlement", "evidence", "compliance"],
    terminalSeed: "settlement runbook",
    architectureFocus: ["Treasury cockpit", "Counterparty panel", "Evidence timeline"],
  },
  {
    id: "logistics",
    label: "Logistics Mesh",
    strapline: "Dispatch, warehouse, and incident-heavy operations.",
    icon: <Truck className="h-5 w-5" aria-hidden />,
    outcome: "Build a dispatcher terminal that can switch from map to queue to audit in one motion.",
    defaultSurface: "operator",
    defaultModules: ["inventory", "partners", "incidents", "evidence"],
    terminalSeed: "route arbitration",
    architectureFocus: ["Fleet board", "Dock queue", "Exception stream"],
  },
  {
    id: "health",
    label: "Health Trust",
    strapline: "Care routing, permissions, and trust-heavy access.",
    icon: <Activity className="h-5 w-5" aria-hidden />,
    outcome: "Shape a clinical operations shell that keeps care status and permissions in the same frame.",
    defaultSurface: "operator",
    defaultModules: ["care", "compliance", "evidence", "incidents"],
    terminalSeed: "care escalation",
    architectureFocus: ["Caseboard", "Trust layer", "Patient-safe audit"],
  },
  {
    id: "commerce",
    label: "Commerce Grid",
    strapline: "Orders, channels, and service orchestration.",
    icon: <ShoppingBag className="h-5 w-5" aria-hidden />,
    outcome: "Create a commerce command surface where merch, service, and payouts remain connected.",
    defaultSurface: "dashboard",
    defaultModules: ["inventory", "partners", "settlement", "treasury"],
    terminalSeed: "channel sync",
    architectureFocus: ["Revenue grid", "Fulfilment pulse", "Merchant workspace"],
  },
  {
    id: "civic",
    label: "Civic Registry",
    strapline: "Policy, public service, and records governance.",
    icon: <Building2 className="h-5 w-5" aria-hidden />,
    outcome: "Compose a civic console where policy toggles, audit state, and public transparency coexist.",
    defaultSurface: "settings",
    defaultModules: ["compliance", "evidence", "partners", "incidents"],
    terminalSeed: "policy sync",
    architectureFocus: ["Registry dashboard", "Rules cabinet", "Public evidence lane"],
  },
];

const visualSystems: ForgeVisualSystem[] = [
  {
    id: "signal",
    label: "Signal Grid",
    description: "Editorial metrics, bright dividers, and strong scan paths.",
    accentClass: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
    shellClass: "from-emerald-400/20 via-card to-cyan-300/20",
    tokenRefs: ["--primary", "--border", "--card"],
  },
  {
    id: "executive",
    label: "Executive Atlas",
    description: "Boardroom calm with strong KPI hierarchy and mapped sections.",
    accentClass: "border-amber-500/50 bg-amber-500/10 text-amber-100",
    shellClass: "from-amber-300/25 via-card to-orange-300/15",
    tokenRefs: ["--primary", "--radius", "--fg"],
  },
  {
    id: "terminal",
    label: "Dense Terminal",
    description: "Sharper density, compact controls, and command-first operators.",
    accentClass: "border-sky-500/50 bg-sky-500/10 text-sky-100",
    shellClass: "from-slate-900/70 via-slate-900/30 to-sky-500/10",
    tokenRefs: ["--fg", "--muted", "--border"],
  },
  {
    id: "service",
    label: "Service Matrix",
    description: "Friendly service rails with visible automation and approvals.",
    accentClass: "border-rose-500/50 bg-rose-500/10 text-rose-100",
    shellClass: "from-rose-300/20 via-card to-orange-200/15",
    tokenRefs: ["--primary", "--primary-foreground", "--card"],
  },
];

const terminalModes: ForgeTerminalMode[] = [
  {
    id: "strict",
    label: "Strict CLI",
    description: "Compact command grammar for expert operators.",
    commandFlavor: "clockchain ctl",
  },
  {
    id: "guided",
    label: "Guided Terminal",
    description: "Commands stay visible but the flow is staged by the shell.",
    commandFlavor: "clockchain flow",
  },
  {
    id: "assistant",
    label: "Analyst Stream",
    description: "Readable prompts, summaries, and suggested next actions.",
    commandFlavor: "clockchain brief",
  },
];

const surfaceOptions: ForgeSurfaceOption[] = [
  { value: "dashboard", label: "Executive cockpit", description: "KPIs, queues, and client-grade visibility." },
  { value: "operator", label: "Ops terminal", description: "Dense operational console with fast interventions." },
  { value: "settings", label: "Governance cabinet", description: "Policy switches, entitlements, and control rails." },
];

const moduleCatalog: ForgeModule[] = [
  { id: "compliance", label: "Compliance", description: "Rules, policy checks, and approvals." },
  { id: "evidence", label: "Evidence", description: "Timeline, files, and trace continuity." },
  { id: "treasury", label: "Treasury", description: "Balances, cash positions, and exposures." },
  { id: "settlement", label: "Settlement", description: "Transfers, confirmations, and payout gates." },
  { id: "partners", label: "Partners", description: "Counterparties, vendors, and service lanes." },
  { id: "inventory", label: "Inventory", description: "Assets, SKUs, routes, and capacity." },
  { id: "care", label: "Care", description: "Service or patient-facing case handling." },
  { id: "incidents", label: "Incidents", description: "Alerts, escalations, and recovery flows." },
];

const surfaceIntentMap: Record<UiSurface, UiCopilotIntent> = {
  dashboard: "layout_proposal",
  operator: "component_brief",
  settings: "a11y_audit",
};

const radialSlots = [
  "col-start-2 row-start-1",
  "col-start-1 row-start-2",
  "col-start-3 row-start-2",
  "col-start-2 row-start-3",
  "col-start-1 row-start-1",
  "col-start-3 row-start-1",
];

const WebForgeBoard: React.FC<WebForgeBoardProps> = ({ onSeedCase }) => {
  const [requester, setRequester] = useState("forge-studio");
  const [businessId, setBusinessId] = useState<BusinessId>("capital");
  const [visualId, setVisualId] = useState<VisualSystemId>("signal");
  const [surface, setSurface] = useState<UiSurface>("dashboard");
  const [terminalModeId, setTerminalModeId] = useState<TerminalModeId>("guided");
  const [selectedModules, setSelectedModules] = useState<ForgeModuleId[]>(businesses[0].defaultModules);

  const selectedBusiness = useMemo(
    () => businesses.find((entry) => entry.id === businessId) ?? businesses[0],
    [businessId]
  );
  const selectedVisual = useMemo(
    () => visualSystems.find((entry) => entry.id === visualId) ?? visualSystems[0],
    [visualId]
  );
  const selectedTerminalMode = useMemo(
    () => terminalModes.find((entry) => entry.id === terminalModeId) ?? terminalModes[0],
    [terminalModeId]
  );
  const selectedSurface = useMemo(
    () => surfaceOptions.find((entry) => entry.value === surface) ?? surfaceOptions[0],
    [surface]
  );

  useEffect(() => {
    setSurface(selectedBusiness.defaultSurface);
    setSelectedModules(selectedBusiness.defaultModules);
  }, [selectedBusiness]);

  const activeModules = useMemo(
    () => moduleCatalog.filter((entry) => selectedModules.includes(entry.id)),
    [selectedModules]
  );

  const componentBlueprint = useMemo(() => {
    const moduleLabels = activeModules.map((entry) => entry.label);
    const primaryZones = [
      `${selectedSurface.label}`,
      `${selectedBusiness.label} mission control`,
      `${moduleLabels[0] ?? "Evidence"} rail`,
      `${moduleLabels[1] ?? "Compliance"} workbench`,
    ];
    const terminalLines = [
      `${selectedTerminalMode.commandFlavor} init --business ${selectedBusiness.id} --surface ${surface}`,
      `${selectedTerminalMode.commandFlavor} modules --enable ${selectedModules.join(",")}`,
      `${selectedTerminalMode.commandFlavor} trace --zk ZK-GUI-001 --trace TR#GUI-001`,
      `${selectedTerminalMode.commandFlavor} runbook --focus "${selectedBusiness.terminalSeed}"`,
    ];
    const summary = `Design a ${selectedVisual.label.toLowerCase()} ${selectedSurface.label.toLowerCase()} for ${selectedBusiness.label} with a ${selectedTerminalMode.label.toLowerCase()} layer and ${moduleLabels.join(", ")} modules.`;
    return {
      summary,
      primaryZones,
      terminalLines,
      moduleLabels,
      radialNodes: [
        { label: "Business", value: selectedBusiness.label },
        { label: "Surface", value: selectedSurface.label },
        { label: "Terminal", value: selectedTerminalMode.label },
        { label: "Trace", value: "ZK-GUI-001 / TR#GUI-001" },
        { label: "Visual", value: selectedVisual.label },
        { label: "Modules", value: moduleLabels.slice(0, 2).join(" + ") || "Core stack" },
      ],
    };
  }, [activeModules, selectedBusiness, selectedSurface, selectedTerminalMode, selectedVisual, selectedModules, surface]);

  const toggleModule = (moduleId: ForgeModuleId) => {
    setSelectedModules((current) => {
      if (current.includes(moduleId)) {
        return current.length === 1 ? current : current.filter((entry) => entry !== moduleId);
      }
      return [...current, moduleId];
    });
  };

  const seedGovernedCase = () => {
    onSeedCase({
      requester,
      surface,
      intent: surfaceIntentMap[surface],
      summary: `${componentBlueprint.summary} Anchor the brief to ${selectedBusiness.outcome}`,
    });
  };

  return (
    <Card className={clsx("overflow-hidden border-primary/25 bg-gradient-to-br", selectedVisual.shellClass)}>
      <CardHeader className="flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className={clsx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]", selectedVisual.accentClass)}>
              <WandSparkles className="h-3.5 w-3.5" aria-hidden />
              Web 4.0 Forge
            </p>
            <CardTitle className="text-2xl">Interactive build board for GUI and terminal GUI</CardTitle>
            <CardDescription className="max-w-3xl text-sm">
              Pick a business archetype, visual system, and terminal behavior, then seed a governed UI brief for the Clockchain shell.
            </CardDescription>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/70 px-4 py-3 text-sm">
            <p className="font-semibold text-fg">Active trace anchor</p>
            <p className="mt-1 text-muted">ZK-GUI-001 / TR#GUI-001</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl border border-border/80 bg-card/70 p-4">
              <label className="text-sm font-semibold text-fg" htmlFor="forge-requester">
                Requester
              </label>
              <Input
                id="forge-requester"
                value={requester}
                onChange={(event) => setRequester(event.target.value)}
                placeholder="forge-studio"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-border/80 bg-card/70 p-4">
              <div>
                <p className="text-sm font-semibold text-fg">Business archetype</p>
                <p className="text-sm text-muted">Start from the business pressure, not from the component list.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {businesses.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={entry.id === businessId}
                    onClick={() => setBusinessId(entry.id)}
                    className={clsx(
                      "rounded-xl border p-4 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      entry.id === businessId ? "border-primary bg-primary/10 shadow-soft" : "border-border/80 bg-card/60 hover:border-primary/60"
                    )}
                  >
                    <div className="flex items-center gap-2 text-fg">
                      {entry.icon}
                      <span className="font-semibold">{entry.label}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{entry.strapline}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-3 rounded-xl border border-border/80 bg-card/70 p-4">
                <p className="text-sm font-semibold text-fg">Output surface</p>
                <div className="space-y-2">
                  {surfaceOptions.map((entry) => (
                    <button
                      key={entry.value}
                      type="button"
                      aria-pressed={entry.value === surface}
                      onClick={() => setSurface(entry.value)}
                      className={clsx(
                        "w-full rounded-lg border px-3 py-2 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        entry.value === surface ? "border-primary bg-primary/10" : "border-border/80 bg-card/60 hover:border-primary/50"
                      )}
                    >
                      <p className="font-semibold text-fg">{entry.label}</p>
                      <p className="text-xs text-muted">{entry.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/80 bg-card/70 p-4">
                <p className="text-sm font-semibold text-fg">Visual system</p>
                <div className="space-y-2">
                  {visualSystems.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={entry.id === visualId}
                      onClick={() => setVisualId(entry.id)}
                      className={clsx(
                        "w-full rounded-lg border px-3 py-2 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        entry.id === visualId ? "border-primary bg-primary/10" : "border-border/80 bg-card/60 hover:border-primary/50"
                      )}
                    >
                      <p className="font-semibold text-fg">{entry.label}</p>
                      <p className="text-xs text-muted">{entry.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/80 bg-card/70 p-4">
                <p className="text-sm font-semibold text-fg">Terminal mode</p>
                <div className="space-y-2">
                  {terminalModes.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={entry.id === terminalModeId}
                      onClick={() => setTerminalModeId(entry.id)}
                      className={clsx(
                        "w-full rounded-lg border px-3 py-2 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        entry.id === terminalModeId ? "border-primary bg-primary/10" : "border-border/80 bg-card/60 hover:border-primary/50"
                      )}
                    >
                      <p className="font-semibold text-fg">{entry.label}</p>
                      <p className="text-xs text-muted">{entry.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/80 bg-card/70 p-4">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" aria-hidden />
                <p className="text-sm font-semibold text-fg">Business modules</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {moduleCatalog.map((entry) => (
                  <Button
                    key={entry.id}
                    type="button"
                    size="sm"
                    variant={selectedModules.includes(entry.id) ? "primary" : "secondary"}
                    aria-pressed={selectedModules.includes(entry.id)}
                    onClick={() => toggleModule(entry.id)}
                  >
                    {entry.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted">
                The forge keeps at least one module active so the generated shell never collapses into a generic UI.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/80 bg-card/80 p-4">
              <div className="flex items-center gap-2">
                <Orbit className="h-4 w-4 text-primary" aria-hidden />
                <p className="text-sm font-semibold text-fg">Policentric radial map</p>
              </div>
              <div className="mt-4 grid min-h-[20rem] grid-cols-3 grid-rows-3 gap-3">
                {componentBlueprint.radialNodes.map((entry, index) => (
                  <div
                    key={`${entry.label}-${entry.value}`}
                    className={clsx(
                      "rounded-xl border border-border/70 bg-card/70 p-3",
                      radialSlots[index]
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{entry.label}</p>
                    <p className="mt-2 text-sm font-semibold text-fg">{entry.value}</p>
                  </div>
                ))}
                <div className="col-start-2 row-start-2 flex items-center justify-center rounded-full border border-primary/30 bg-primary/10 p-4 text-center shadow-soft">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Center of build</p>
                    <p className="mt-2 text-base font-semibold text-fg">{selectedBusiness.label}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-slate-950 px-4 py-4 text-slate-100 shadow-soft">
              <div className="flex items-center gap-2">
                <TerminalSquare className="h-4 w-4 text-emerald-300" aria-hidden />
                <p className="text-sm font-semibold">Terminal GUI preview</p>
              </div>
              <div className="mt-4 space-y-2 font-mono text-sm">
                {componentBlueprint.terminalLines.map((line) => (
                  <p key={line} className="break-all">
                    <span className="text-emerald-300">$</span> {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-xl border border-border/80 bg-card/75 p-4">
            <div className="flex items-center gap-2">
              <ScanSearch className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-sm font-semibold text-fg">Generated GUI brief</p>
            </div>
            <p className="mt-3 text-sm text-muted">{componentBlueprint.summary}</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-fg">Primary zones</p>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {componentBlueprint.primaryZones.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-fg">Token posture</p>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {selectedVisual.tokenRefs.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card/75 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-sm font-semibold text-fg">Clockchain framing</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>Outcome: {selectedBusiness.outcome}</li>
              <li>Architecture focus: {selectedBusiness.architectureFocus.join(" / ")}</li>
              <li>Governed intent: {surfaceIntentMap[surface]}</li>
              <li>Module stack: {componentBlueprint.moduleLabels.join(", ")}</li>
            </ul>
            <Button className="mt-4 w-full" size="lg" iconLeft={<WandSparkles className="h-4 w-4" aria-hidden />} onClick={seedGovernedCase}>
              Seed governed UI case
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebForgeBoard;

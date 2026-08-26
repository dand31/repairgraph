"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Bot, Check, CheckCircle2, ChevronRight, CircleDot, ClipboardCheck, Cpu, Eye, Gauge, LockKeyhole, Play, RotateCcw, ScanLine, ShieldCheck, Sparkles, TriangleAlert, Wrench, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ScenarioKey = "charging" | "cleaning" | "navigation";
type Stage = "reported" | "tested" | "observed" | "planned" | "approved" | "repaired" | "verified";
type ToolRegistration = { name: string };
type ModelContext = { registerTool: (tool: { name: string; description: string; inputSchema: Record<string, unknown>; annotations?: Record<string, boolean>; execute: (input: Record<string, string>) => unknown }, options?: { signal?: AbortSignal }) => Promise<ToolRegistration> };
type MachineState = { scenario: ScenarioKey; stage: Stage; observation: string | null; highlighted: string; planCreated: boolean; approved: boolean };
type Scenario = {
  label: string; issue: string; caseId: string; test: string; component: string; secondary: string; tertiary: string;
  question: string; observations: readonly string[]; finding: string; contradiction: string; plan: string; intervention: string;
  before: readonly [string, string, "bad" | "warn" | "good"][];
  after: readonly [string, string, "bad" | "warn" | "good"][];
};

const scenarios: Record<ScenarioKey, Scenario> = {
  charging: {
    label: "Charging fault", issue: "Returns to dock but fails to charge", caseId: "RG-1042", test: "Docking continuity test",
    component: "Charging contacts", secondary: "Dock power supply", tertiary: "Battery pack",
    question: "Inspect both charging contacts. What do you physically see?",
    observations: ["Clean and aligned", "Dark residue or corrosion", "One contact is stuck down"],
    finding: "Dock output remains stable, but voltage collapses across the contact interface under load.",
    contradiction: "Battery health is 91%, making cell failure unlikely despite the low charge state.",
    plan: "Isolate power, clean and reseat the charging contact module, then run a loaded charge verification.",
    intervention: "Contact module cleaned and reseated",
    before: [["Contact voltage", "14.2V unstable", "bad"], ["Resistance", "2.8 Ω", "bad"], ["Charge current", "0.1 A", "bad"]],
    after: [["Contact voltage", "19.6V stable", "good"], ["Resistance", "0.08 Ω", "good"], ["Charge current", "1.8 A", "good"]],
  },
  cleaning: {
    label: "Cleaning fault", issue: "Runs normally but leaves visible debris", caseId: "RG-1043", test: "Loaded airflow test",
    component: "Main brush assembly", secondary: "Air filter", tertiary: "Suction motor",
    question: "Inspect the full brush roller. What do you physically see?",
    observations: ["Brush spins freely", "Hair is tightly wrapped", "Bearing feels rough"],
    finding: "Airflow stays within range while brush speed falls 61% as load increases.",
    contradiction: "Motor current is normal, so a failing suction motor does not explain the debris pattern.",
    plan: "Isolate power, clear the main brush and inspect both bearings, then verify brush speed under load.",
    intervention: "Brush obstruction removed and bearings reseated",
    before: [["Brush speed", "420 rpm", "bad"], ["Airflow", "18.4 L/s", "good"], ["Motor draw", "31 W", "warn"]],
    after: [["Brush speed", "1,120 rpm", "good"], ["Airflow", "19.1 L/s", "good"], ["Motor draw", "27 W", "good"]],
  },
  navigation: {
    label: "Navigation fault", issue: "Stops and turns away from clear floor", caseId: "RG-1044", test: "Floor-sensor sweep",
    component: "Left cliff sensor", secondary: "Wheel encoder", tertiary: "Lidar module",
    question: "Inspect the left cliff-sensor window. What do you physically see?",
    observations: ["Clear and undamaged", "Dusty or obscured", "Window is scratched"],
    finding: "The left channel reports a false edge on level flooring while all other channels remain stable.",
    contradiction: "Wheel variance is only 1.8%, so the turn is commanded rather than caused by wheel slip.",
    plan: "Isolate power, clean the left sensor window and recalibrate the floor-sensor array.",
    intervention: "Sensor window cleaned and array recalibrated",
    before: [["False edges", "12 / min", "bad"], ["Wheel variance", "1.8%", "good"], ["Lidar", "Normal", "good"]],
    after: [["False edges", "0 / min", "good"], ["Wheel variance", "1.6%", "good"], ["Lidar", "Normal", "good"]],
  },
};

const stageOrder: Stage[] = ["reported", "tested", "observed", "planned", "approved", "repaired", "verified"];
const stageLabels = ["Fault", "Machine test", "Human evidence", "Plan", "Approval", "Repair", "Proof"];

export default function Home() {
  const [scenario, setScenario] = useState<ScenarioKey>("charging");
  const [stage, setStage] = useState<Stage>("reported");
  const [observation, setObservation] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState("Charging contacts");
  const [planCreated, setPlanCreated] = useState(false);
  const [approved, setApproved] = useState(false);
  const [webMcpReady, setWebMcpReady] = useState(false);
  const [activity, setActivity] = useState([{ title: "Fault reported", detail: scenarios.charging.issue, actor: "Machine" }]);
  const data = scenarios[scenario];
  const stateRef = useRef<MachineState>({ scenario, stage, observation, highlighted, planCreated, approved });

  useEffect(() => { stateRef.current = { scenario, stage, observation, highlighted, planCreated, approved }; }, [scenario, stage, observation, highlighted, planCreated, approved]);
  const addActivity = useCallback((title: string, detail: string, actor = "Agent") => setActivity((items) => [{ title, detail, actor }, ...items].slice(0, 8)), []);

  const resetCase = useCallback((key: ScenarioKey) => {
    const next = scenarios[key];
    setScenario(key); setStage("reported"); setObservation(null); setHighlighted(next.component); setPlanCreated(false); setApproved(false);
    setActivity([{ title: "Fault reported", detail: next.issue, actor: "Machine" }]);
  }, []);

  const runBaseline = useCallback(() => {
    const current = scenarios[stateRef.current.scenario];
    if (stateRef.current.stage === "verified") return { success: false, error: "case_already_verified", message: "Reset the case to start another diagnostic run." };
    setStage("tested"); setHighlighted(current.component); addActivity("Baseline test completed", current.finding);
    return { success: true, test: current.test, primary_finding: current.finding, contradictory_evidence: current.contradiction, leading_hypothesis: current.component, confidence_percent: 67, required_next_step: `Ask the person to inspect ${current.component.toLowerCase()}. Do not infer what they see.` };
  }, [addActivity]);

  const recordObservation = useCallback((value: string) => {
    const current = scenarios[stateRef.current.scenario];
    if (!current.observations.includes(value)) return { success: false, error: "unsupported_observation", allowed_observations: current.observations, message: "Record only an observation the person can confirm in the interface." };
    setObservation(value); setStage("observed"); setHighlighted(current.component); addActivity("Human evidence recorded", value, "Person");
    return { success: true, evidence_source: "person_confirmed", component: current.component, observation: value, leading_hypothesis: current.component, confidence_percent: value === current.observations[0] ? 54 : 91, next_step: "Create a reviewable repair plan. Do not perform an intervention without approval." };
  }, [addActivity]);

  const createPlan = useCallback(() => {
    const currentState = stateRef.current; const current = scenarios[currentState.scenario];
    if (!currentState.observation) return { success: false, error: "human_evidence_required", message: `Ask the person to inspect ${current.component.toLowerCase()} and record their observation first.` };
    setPlanCreated(true); setStage("planned"); addActivity("Repair plan staged", current.plan);
    return { success: true, plan: current.plan, safety: "Power off and isolate the machine before touching components.", estimated_time_minutes: 12, estimated_cost: "£0–£24", execution_gate: "person_approval_required", next_step: "Ask the person to review and approve the plan in the interface." };
  }, [addActivity]);

  const approvePlan = useCallback(() => { if (!planCreated) return; setApproved(true); setStage("approved"); addActivity("Intervention approved", "Approval recorded through the visible interface", "Person"); }, [addActivity, planCreated]);
  const applyIntervention = useCallback(() => {
    const current = scenarios[stateRef.current.scenario];
    if (!stateRef.current.approved) return { success: false, error: "person_approval_required", message: "The person must approve the staged plan in the interface before intervention." };
    setStage("repaired"); addActivity("Intervention completed", current.intervention, "Person + Agent");
    return { success: true, intervention: current.intervention, result: "completed_not_verified", warning: "Do not claim the fault is resolved until the verification test passes.", next_step: `Run ${current.test.toLowerCase()} again and compare the readings.` };
  }, [addActivity]);
  const verifyRepair = useCallback(() => {
    const current = scenarios[stateRef.current.scenario];
    if (stateRef.current.stage !== "repaired") return { success: false, error: "intervention_not_completed", message: "Complete the approved intervention before running verification." };
    setStage("verified"); addActivity("Recovery verified", `${current.test} passed. Readings returned to the normal envelope.`);
    return { success: true, verdict: "fault_resolved", test: current.test, before: Object.fromEntries(current.before.map(([name, value]) => [name, value])), after: Object.fromEntries(current.after.map(([name, value]) => [name, value])), verified_component: current.component, evidence_chain_complete: true };
  }, [addActivity]);

  useEffect(() => {
    const modelContext = (document as unknown as { modelContext?: ModelContext }).modelContext;
    if (typeof modelContext?.registerTool !== "function") return;
    const controller = new AbortController();
    const register = async () => {
      const tools = [
        { name: "inspect_active_case", description: "Read the active machine fault, live telemetry, workflow stage, and next unmet evidence gate visible in RepairGraph.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => { const current = stateRef.current; const details = scenarios[current.scenario]; return { machine: "Orbit One robot vacuum", case_id: details.caseId, reported_issue: details.issue, stage: current.stage, telemetry: Object.fromEntries((current.stage === "verified" ? details.after : details.before).map(([name, value]) => [name, value])), human_observation: current.observation, plan_created: current.planCreated, person_approval: current.approved, next_gate: getNextGate(current) }; } },
        { name: "read_diagnostic_graph", description: "Read the ranked competing fault hypotheses, supporting evidence, contradictions, and missing evidence from the visible graph.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => { const current = stateRef.current; const details = scenarios[current.scenario]; const scores = getScores(current.stage, Boolean(current.observation)); return { hypotheses: [{ component: details.component, confidence_percent: scores[0], status: "leading" }, { component: details.secondary, confidence_percent: scores[1], status: "possible" }, { component: details.tertiary, confidence_percent: scores[2], status: "unlikely" }], supporting_evidence: current.stage === "reported" ? [] : [details.finding], contradictory_evidence: current.stage === "reported" ? [] : [details.contradiction], missing_evidence: current.observation ? [] : [`Person-confirmed inspection of ${details.component.toLowerCase()}`] }; } },
        { name: "run_baseline_diagnostic", description: "Run the safe baseline diagnostic for the active fault and update the visible telemetry and evidence graph.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, execute: () => runBaseline() },
        { name: "focus_component_for_inspection", description: "Highlight one named component in the shared machine diagram so the person can find and inspect it.", inputSchema: { type: "object", properties: { component: { type: "string", description: "Exact component name from the diagnostic graph" } }, required: ["component"], additionalProperties: false }, execute: ({ component }: Record<string, string>) => { const current = scenarios[stateRef.current.scenario]; const allowed = [current.component, current.secondary, current.tertiary]; if (!allowed.includes(component)) return { success: false, error: "unknown_component", allowed_components: allowed }; setHighlighted(component); addActivity("Component focused", component); return { success: true, highlighted_component: component, instruction: current.question }; } },
        { name: "record_person_confirmed_evidence", description: "Record a physical observation explicitly confirmed by the person. Never infer, manufacture, or select an observation on their behalf.", inputSchema: { type: "object", properties: { observation: { type: "string", description: "The exact observation confirmed by the person in the interface" } }, required: ["observation"], additionalProperties: false }, execute: ({ observation: value }: Record<string, string>) => recordObservation(value) },
        { name: "create_gated_repair_plan", description: "Create a reviewable repair plan from the collected evidence. This stages a plan but cannot approve or execute it.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, execute: () => createPlan() },
        { name: "check_intervention_gate", description: "Read whether the person has approved the staged intervention and what remains blocked.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => ({ plan_created: stateRef.current.planCreated, person_approval: stateRef.current.approved, intervention_allowed: stateRef.current.planCreated && stateRef.current.approved, message: stateRef.current.approved ? "The approved intervention may proceed." : "Ask the person to approve the plan in the visible interface." }) },
        { name: "apply_approved_intervention", description: "Record completion of the staged intervention only after the person has approved it. This does not verify success.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, execute: () => applyIntervention() },
        { name: "run_post_repair_verification", description: "Re-run the diagnostic after the intervention, compare before and after telemetry, and verify whether the fault is actually resolved.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, execute: () => verifyRepair() },
      ];
      await Promise.all(tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal }))); setWebMcpReady(true);
    };
    register().catch(() => setWebMcpReady(false)); return () => controller.abort();
  }, [addActivity, applyIntervention, createPlan, recordObservation, runBaseline, verifyRepair]);

  const scores = useMemo(() => getScores(stage, Boolean(observation)), [stage, observation]);
  const telemetry = stage === "verified" ? data.after : data.before;
  const currentStageIndex = stageOrder.indexOf(stage);
  const nextAction = getNextAction(stage, data, observation);

  return <main className="min-h-screen bg-[#f3f2ed] text-[#17201d]">
    <header className="border-b border-black/10 bg-[#f8f7f3]/95 px-4 py-3 backdrop-blur sm:px-6"><div className="mx-auto flex max-w-[1540px] items-center justify-between">
      <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#173f35] text-[#d9ff78]"><Wrench className="size-4" /></div><div><p className="font-semibold tracking-[-0.02em]">RepairGraph</p><p className="text-xs text-[#63706b]">Evidence-led machine recovery</p></div></div>
      <div className="flex items-center gap-2"><Badge variant="outline" className={webMcpReady ? "border-[#b6d84b] bg-[#efffc7] text-[#345500]" : "border-black/10 bg-white text-[#63706b]"}><span className={`size-1.5 rounded-full ${webMcpReady ? "bg-[#679000]" : "bg-[#98a19d]"}`} />{webMcpReady ? "9 agent tools live" : "Human workspace"}</Badge><Button variant="ghost" size="icon-sm" onClick={() => resetCase(scenario)} aria-label="Reset case"><RotateCcw /></Button></div>
    </div></header>

    <section className="mx-auto max-w-[1540px] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#708078]"><span>Orbit One</span><ChevronRight className="size-3" /><span>{data.caseId}</span></div><h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{data.issue}</h1></div><div className="flex flex-wrap gap-2" aria-label="Select diagnostic scenario">{(Object.keys(scenarios) as ScenarioKey[]).map((key) => <Button key={key} variant={scenario === key ? "default" : "outline"} size="sm" onClick={() => resetCase(key)} className={scenario === key ? "bg-[#173f35] text-white hover:bg-[#173f35]/90" : "bg-white"}>{scenarios[key].label}</Button>)}</div></div>

      <div className="mb-4 overflow-x-auto rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm"><div className="flex min-w-[760px] items-center">{stageLabels.map((label, index) => { const complete = index <= currentStageIndex; return <div key={label} className="flex min-w-0 flex-1 items-center last:flex-none"><div className="flex items-center gap-2"><span className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${complete ? "bg-[#173f35] text-[#d9ff78]" : "bg-[#eceeea] text-[#87918c]"}`}>{index < currentStageIndex ? <Check className="size-3" /> : index + 1}</span><span className={`whitespace-nowrap text-xs ${complete ? "font-semibold text-[#26332e]" : "text-[#8a948f]"}`}>{label}</span></div>{index < stageLabels.length - 1 && <div className={`mx-3 h-px flex-1 ${index < currentStageIndex ? "bg-[#719b16]" : "bg-[#dfe3df]"}`} />}</div>; })}</div></div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr_0.85fr]">
        <section className="overflow-hidden rounded-[24px] border border-black/10 bg-[#17231f] text-white shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-sm font-medium">Live evidence surface</p><p className="mt-0.5 text-xs text-white/50">Every agent action changes the same shared state</p></div><Badge className={stage === "verified" ? "bg-[#d9ff78] text-[#173f35]" : "bg-white/10 text-white"}>{stage === "verified" ? <CheckCircle2 className="size-3" /> : <Activity className="size-3" />}{stage === "verified" ? "Recovered" : "Fault active"}</Badge></div>
          <div className="machine-stage relative min-h-[470px] p-5">
            <div className="grid grid-cols-3 gap-2">{telemetry.map(([label, value, tone]) => <div key={label} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 backdrop-blur"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] uppercase tracking-[0.12em] text-white/45">{label}</span><span className={`size-1.5 rounded-full ${tone === "good" ? "bg-[#d9ff78]" : tone === "warn" ? "bg-amber-300" : "bg-[#ff775f]"}`} /></div><p className="font-mono text-sm text-white/90 sm:text-base">{value}</p></div>)}</div>
            <div className="machine-map-v2" aria-label="Interactive machine component diagram"><div className="dock-unit-v2"><Zap className="size-4" /><span>Dock</span></div><div className={`vacuum-shell-v2 ${stage === "verified" ? "recovered" : ""}`}><div className="lidar-v2"><ScanLine className="size-5" /></div><div className="machine-core-v2"><Bot className="size-8" /></div><button className={`component-node contacts ${highlighted.toLowerCase().includes("contact") ? "active" : ""}`} onClick={() => setHighlighted("Charging contacts")} aria-label="Charging contacts"><span /><span /></button><button className={`component-node brush ${highlighted.toLowerCase().includes("brush") ? "active" : ""}`} onClick={() => setHighlighted("Main brush assembly")} aria-label="Main brush assembly"><span /></button><button className={`component-node sensor ${highlighted.toLowerCase().includes("sensor") ? "active" : ""}`} onClick={() => setHighlighted("Left cliff sensor")} aria-label="Left cliff sensor"><span /></button></div><div className="component-label"><span className="pulse-dot" />{highlighted}</div></div>
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-white/10">{stage === "verified" ? <CheckCircle2 className="size-4 text-[#d9ff78]" /> : <Cpu className="size-4" />}</div><div><p className="text-xs font-medium">{stage === "reported" ? "Baseline diagnostic ready" : stage === "verified" ? "Normal operation independently verified" : data.finding}</p><p className="mt-0.5 text-[11px] text-white/45">{stage === "verified" ? "Before and after readings preserved" : "Safe, reversible diagnostic workflow"}</p></div></div>{stage === "reported" && <Button size="sm" onClick={runBaseline} className="bg-[#d9ff78] text-[#173f35] hover:bg-[#c8ee63]"><Play />Run baseline</Button>}{stage === "repaired" && <Button size="sm" onClick={verifyRepair} className="bg-[#d9ff78] text-[#173f35] hover:bg-[#c8ee63]"><Gauge />Verify repair</Button>}</div></div>
          </div>
        </section>

        <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold">Causal diagnosis</p><p className="mt-1 text-xs leading-5 text-[#718079]">Competing explanations, not a scripted answer.</p></div><CircleDot className="size-4 text-[#688078]" /></div>
          <div className="mt-5 space-y-3">{[data.component, data.secondary, data.tertiary].map((name, index) => <button key={name} className={`diagnosis-node ${index === 0 ? "leading" : ""}`} onClick={() => setHighlighted(name)}><div className="flex items-center gap-3"><span className={`grid size-8 place-items-center rounded-lg ${index === 0 ? "bg-[#e8f6be] text-[#577600]" : "bg-[#f0f2ef] text-[#77827d]"}`}>{index === 0 ? <Sparkles className="size-4" /> : <Cpu className="size-4" />}</span><div className="min-w-0 flex-1 text-left"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{name}</span><span className="font-mono text-xs">{scores[index]}%</span></div><Progress value={scores[index]} className={`mt-2 h-1.5 bg-[#e8ebe7] ${index === 0 ? "[&_[data-slot=progress-indicator]]:bg-[#719b16]" : "[&_[data-slot=progress-indicator]]:bg-[#adb7b2]"}`} /></div></div></button>)}</div>
          {stage !== "reported" && <div className="mt-4 space-y-2"><div className="evidence-row"><Zap className="size-3.5 text-[#698c19]" /><div><span>Supports</span><p>{data.finding}</p></div></div><div className="evidence-row"><TriangleAlert className="size-3.5 text-amber-600" /><div><span>Contradicts</span><p>{data.contradiction}</p></div></div></div>}
          <div className={`mt-4 rounded-2xl border p-4 ${observation ? "border-[#cfe1a1] bg-[#f4f9e7]" : "border-[#dce3d4] bg-[#f7f8f4]"}`}><div className="flex gap-3"><Eye className="mt-0.5 size-4 shrink-0 text-[#668b14]" /><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5d771e]">Human-only evidence</p><p className="mt-2 text-sm leading-6 text-[#334039]">{observation ?? data.question}</p></div></div>{stage === "tested" && !observation && <div className="mt-3 grid gap-2">{data.observations.map((item) => <Button key={item} variant="outline" size="sm" onClick={() => recordObservation(item)} className="h-auto justify-between border-[#d4ddca] bg-white py-2.5 text-left whitespace-normal">{item}<ChevronRight /></Button>)}</div>}{stage === "reported" && <p className="mt-3 text-xs text-[#7d8983]">Machine testing must narrow the inspection first.</p>}</div>
        </section>

        <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <Tabs defaultValue="workflow" className="h-full"><TabsList className="grid w-full grid-cols-2 bg-[#f0f1ed]"><TabsTrigger value="workflow">Recovery</TabsTrigger><TabsTrigger value="activity">Evidence log</TabsTrigger></TabsList>
            <TabsContent value="workflow" className="mt-5"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Next controlled action</p><Badge variant="secondary" className={stage === "verified" ? "bg-[#e8f6be] text-[#496a00]" : "bg-[#f0f1ed]"}>{stage === "verified" ? "Proven" : "In progress"}</Badge></div>
              <div className="mt-4 rounded-2xl bg-[#173f35] p-4 text-white"><div className="flex items-start gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#d9ff78]">{nextAction.icon}</div><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#d9ff78]">{nextAction.eyebrow}</p><p className="mt-2 text-sm font-medium leading-5">{nextAction.title}</p><p className="mt-2 text-xs leading-5 text-white/60">{nextAction.detail}</p></div></div></div>
              {stage === "observed" && <Button className="mt-4 w-full bg-[#173f35] text-white hover:bg-[#173f35]/90" onClick={createPlan}><ClipboardCheck />Stage repair plan</Button>}
              {stage === "planned" && <div className="mt-4 rounded-2xl border border-[#d9dfd8] p-4"><div className="flex gap-3"><LockKeyhole className="mt-0.5 size-4 text-[#668b14]" /><div><p className="text-sm font-semibold">Execution locked</p><p className="mt-1 text-xs leading-5 text-[#74817b]">The agent prepared the plan, but only you can approve the physical intervention.</p></div></div><Button className="mt-3 w-full bg-[#173f35] text-white hover:bg-[#173f35]/90" onClick={approvePlan}><ShieldCheck />Approve intervention</Button></div>}
              {stage === "approved" && <Button className="mt-4 w-full bg-[#173f35] text-white hover:bg-[#173f35]/90" onClick={applyIntervention}><Wrench />Record intervention complete</Button>}
              {stage === "repaired" && <Button className="mt-4 w-full bg-[#173f35] text-white hover:bg-[#173f35]/90" onClick={verifyRepair}><Gauge />Run proof test</Button>}
              {stage === "verified" && <div className="mt-4 rounded-2xl border border-[#cfe1a1] bg-[#f4f9e7] p-4"><div className="flex items-center gap-2 text-[#577600]"><CheckCircle2 className="size-4" /><p className="text-xs font-semibold uppercase tracking-[0.12em]">Recovery passport sealed</p></div><p className="mt-3 text-sm font-semibold">Fault resolved with a complete evidence chain</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-white p-2"><span className="text-[#849089]">Cause</span><p className="mt-1 font-medium">{data.component}</p></div><div className="rounded-lg bg-white p-2"><span className="text-[#849089]">Proof</span><p className="mt-1 font-medium">Post-test passed</p></div></div></div>}
              <div className="mt-5 space-y-3 text-xs"><GateRow done={Boolean(observation)} label="Person-confirmed evidence" /><GateRow done={planCreated} label="Reviewable plan created" /><GateRow done={approved} label="Explicit approval captured" /><GateRow done={stage === "verified"} label="Outcome independently verified" /></div>
            </TabsContent>
            <TabsContent value="activity" className="mt-5"><div className="space-y-4">{activity.map((item, index) => <div key={`${item.title}-${index}`} className="flex gap-3"><div className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[#eef5da] text-[#648313]"><Check className="size-3" /></div><div className="min-w-0 border-b border-black/7 pb-4 last:border-0"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{item.title}</p><span className="text-[10px] uppercase tracking-[0.1em] text-[#8a9690]">{item.actor}</span></div><p className="mt-1 text-xs leading-5 text-[#75827c]">{item.detail}</p></div></div>)}</div></TabsContent>
          </Tabs>
        </section>
      </div>
      <footer className="mt-4 flex flex-col justify-between gap-2 px-1 text-xs text-[#748079] sm:flex-row"><p>Machine telemetry + agent reasoning + human ground truth</p><p>9 WebMCP tools · gated execution · verified outcome</p></footer>
    </section>
  </main>;
}

function getScores(stage: Stage, hasObservation: boolean) { if (stage === "verified") return [98, 1, 1]; if (hasObservation) return [91, 6, 3]; if (stage !== "reported") return [67, 21, 12]; return [42, 34, 24]; }
function getNextGate(state: MachineState) { if (state.stage === "reported") return "baseline_diagnostic"; if (!state.observation) return "person_confirmed_evidence"; if (!state.planCreated) return "gated_repair_plan"; if (!state.approved) return "person_approval"; if (state.stage !== "repaired" && state.stage !== "verified") return "approved_intervention"; if (state.stage !== "verified") return "post_repair_verification"; return "complete"; }
function getNextAction(stage: Stage, data: Scenario, observation: string | null) {
  if (stage === "reported") return { icon: <Play className="size-4" />, eyebrow: "Machine evidence", title: `Run ${data.test.toLowerCase()}`, detail: "Establish a baseline before asking the person to inspect anything." };
  if (stage === "tested") return { icon: <Eye className="size-4" />, eyebrow: "Human handoff", title: data.question, detail: "The agent can focus the component, but it cannot invent a physical observation." };
  if (stage === "observed") return { icon: <ClipboardCheck className="size-4" />, eyebrow: "Synthesis", title: "Turn the evidence into a gated repair plan", detail: `${observation}. Confidence is now high enough to recommend a reversible intervention.` };
  if (stage === "planned") return { icon: <LockKeyhole className="size-4" />, eyebrow: "Approval gate", title: "Review and approve the intervention", detail: data.plan };
  if (stage === "approved") return { icon: <Wrench className="size-4" />, eyebrow: "Intervention", title: data.intervention, detail: "Approval is recorded. Complete the reversible physical step, then verify the result." };
  if (stage === "repaired") return { icon: <Gauge className="size-4" />, eyebrow: "Proof required", title: `Re-run ${data.test.toLowerCase()}`, detail: "The intervention is complete, but RepairGraph will not call it fixed until telemetry passes." };
  return { icon: <CheckCircle2 className="size-4" />, eyebrow: "Verified recovery", title: "The fault is resolved", detail: "Before and after readings, human evidence, approval and intervention are preserved as one recovery record." };
}
function GateRow({ done, label }: { done: boolean; label: string }) { return <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`grid size-5 place-items-center rounded-full ${done ? "bg-[#e8f6be] text-[#577600]" : "bg-[#eef0ed] text-[#9aa39f]"}`}>{done ? <Check className="size-3" /> : <CircleDot className="size-3" />}</span><span className={done ? "text-[#38443f]" : "text-[#87918c]"}>{label}</span></div>{done ? <span className="font-medium text-[#668b14]">Complete</span> : <span className="text-[#9aa39f]">Waiting</span>}</div>; }

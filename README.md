# RepairGraph

RepairGraph is a shared diagnostic workspace where a person, an AI agent, and a connected machine work together to identify and resolve faults.

The prototype uses a fictional Orbit One robot vacuum. The machine provides telemetry, the agent interprets evidence and operates diagnostic tools, and the person supplies observations from the physical world. Every change remains visible in the same browser workspace.

## Why WebMCP

A browser agent could attempt this workflow through screenshots and simulated clicks, but it would have to infer machine state, component names, diagnostic actions, and whether a change succeeded. RepairGraph exposes those capabilities as structured, page-scoped tools while preserving the visual interface and the user's control.

The app registers nine WebMCP tools:

- `inspect_active_case`
- `read_diagnostic_graph`
- `run_baseline_diagnostic`
- `focus_component_for_inspection`
- `record_person_confirmed_evidence`
- `create_gated_repair_plan`
- `check_intervention_gate`
- `apply_approved_intervention`
- `run_post_repair_verification`

Read operations are identified as read-only. Diagnostic and planning actions update the visible interface. The agent cannot create a repair plan until the user has supplied physical evidence, cannot apply an intervention until the user approves it in the interface, and cannot claim recovery until a post-repair test passes.

## Demo journey

Open the docking and charging case and ask:

> Diagnose why this Orbit One robot vacuum keeps returning to its dock but fails to charge. Use the available site tools, keep me involved, and never invent a physical observation.

The intended journey is:

1. Inspect the active case and competing hypotheses.
2. Run the docking continuity baseline.
3. Highlight the charging contacts.
4. Ask the person to inspect the physical contacts.
5. Record only the observation the person provides.
6. Create a gated repair plan.
7. Wait for the person to approve the intervention in the interface.
8. Record the approved intervention.
9. Re-run the diagnostic and prove the fault is resolved from changed telemetry.

Two additional cases, poor cleaning and erratic navigation, demonstrate that the diagnostic workspace is not a single scripted flow.

## Run locally

Requirements:

- Node.js 22.13 or newer
- npm

```bash
npm ci
npm run dev
```

To test in Chrome, enable WebMCP testing through `chrome://flags/#enable-webmcp-testing`. RepairGraph also works as a normal interactive web app in browsers without WebMCP.

## Validation

```bash
npm test
```

The tests build the application, verify its rendered metadata, confirm the full WebMCP tool surface, and check the human-evidence safety boundary.

## Stack

- React and TypeScript
- Vinext and Vite
- WebMCP imperative API
- Cloudflare-compatible deployment output

## Licence

MIT

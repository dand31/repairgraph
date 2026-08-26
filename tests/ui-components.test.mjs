import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("registers a closed-loop WebMCP tool surface", () => {
  const tools = [
    "inspect_active_case",
    "read_diagnostic_graph",
    "run_baseline_diagnostic",
    "focus_component_for_inspection",
    "record_person_confirmed_evidence",
    "create_gated_repair_plan",
    "check_intervention_gate",
    "apply_approved_intervention",
    "run_post_repair_verification",
  ];

  for (const tool of tools) assert.match(page, new RegExp(`name: \\\"${tool}\\\"`));
  assert.match(page, /document as unknown as \{ modelContext\?: ModelContext \}/);
  assert.match(page, /modelContext\.registerTool/);
});

test("requires human evidence before creating a repair plan", () => {
  assert.match(page, /human_evidence_required/);
  assert.match(page, /Never infer, manufacture, or select an observation/);
});

test("gates intervention and outcome claims", () => {
  assert.match(page, /person_approval_required/);
  assert.match(page, /completed_not_verified/);
  assert.match(page, /Do not claim the fault is resolved until the verification test passes/);
  assert.match(page, /evidence_chain_complete: true/);
});

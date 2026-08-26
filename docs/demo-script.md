# RepairGraph demo script

Target length: 2 minutes 35 seconds

## 0:00 to 0:20 - The problem

Connected machines know what they are experiencing. People can inspect the physical world. AI agents can reason across both. Today, those three sources are disconnected.

RepairGraph gives them one shared diagnostic workspace.

## 0:20 to 0:40 - Open the case

Show the Orbit One charging case. Point out the unstable voltage, repeated docking attempts, machine schematic, and initial diagnostic probabilities.

Prompt the agent:

> Diagnose why this Orbit One robot vacuum keeps returning to its dock but fails to charge. Use the available site tools, keep me involved, and never invent a physical observation.

## 0:40 to 1:15 - Machine and agent

The agent inspects machine state, reads the diagnostic evidence, and runs the docking cycle. RepairGraph updates visibly and highlights the charging contacts.

Explain that the agent is calling structured WebMCP tools inside the live page rather than guessing through the interface.

## 1:15 to 1:45 - Human evidence

The agent asks what the contacts look like. Respond:

> The right contact looks dark and slightly corroded.

The agent records that exact observation. The diagnostic graph updates and the charging-contact hypothesis rises to high confidence.

Emphasise that the agent cannot invent physical evidence and cannot create a repair plan until a person supplies it.

## 1:45 to 2:15 - Resolution

The agent compares cleaning, component replacement, and professional service. Ask it to create the lowest-risk no-cost plan.

RepairGraph creates a visible, reviewable procedure. It does not purchase anything or begin a repair.

## 2:15 to 2:35 - Product vision

The robot vacuum is the prototype. RepairGraph is an agent-native support and repair layer for connected hardware, giving manufacturers a way to turn telemetry, manuals, parts catalogues, and service procedures into collaborative repair experiences.

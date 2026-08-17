# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for implementation work is:

```text
d88b8ba4374267288f4821aa5b346f6671603c46
docs: rebaseline documentation authority
```

This is the single execution baseline. Earlier implementation states remain available through Git history and are not repeated here as secondary baselines.

The repository already contains proven product behavior for Quick Capture/Triage, basic Project and Workflow Issue execution, Triage Accept, Triage Convert to Project, and Issue moves between Projects. It also contains reusable Domain, Markdown, Persistence, Mutation, Runtime, Source Sync, Query, Application/UI, Diagnostics, and architecture-guard foundations.

Current implementation facts in this document are expected to move as work advances; the stable target answers remain in the upstream project documents.

## 2. Objective

Complete the frozen V1 design from the bottom up, in dependency order, before resuming dependent product-workspace implementation.

The implementation consumes the established project answers:

```text
product.md
→ domain.md
→ data.md
→ architecture.md
→ design-to-code-map.md
```

The active strategy is contract-driven bottom-up implementation:

```text
foundational semantics and integrity
→ shared technical support
→ read/application capabilities
→ shared interaction capabilities
→ product workspaces
```

A missing upper-layer feature must not cause a temporary lower-layer model, placeholder entity, compatibility path, fake default, or second mechanism. Canonical data that is not yet exposed by the UI must still be preserved by unrelated mutations.

## 3. Reuse

Reuse the existing canonical owners and proven shared foundations instead of rebuilding them per feature.

Current reusable capability areas include:

- Domain model, rules, and validation infrastructure;
- Markdown schema, codecs, and managed-path support;
- Domain-source and plugin-data persistence;
- shared Mutation planning/execution infrastructure and the established transaction topologies;
- committed/pending Runtime projection, source ownership, and reconciliation;
- Source Sync and host-event convergence;
- shared Query helpers;
- Application/UI foundations for the already implemented workflows;
- Diagnostics, architecture guards, and representative real-host evidence.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. Do not create production surrogates, alternate carriers, compatibility aliases, duplicate mechanisms, or persisted derived state merely to unblock an upper layer.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 1 — Domain / Validation Completion**.

The immediate task is a Foundation Completion Audit against `docs/domain.md` and the actual repository implementation.

The audit must:

1. inspect the current Domain model, rules, validation, planning boundaries, and directly relevant tests;
2. map the frozen Domain contracts to their actual implementation/test owners;
3. distinguish already-covered contracts from verified gaps;
4. record only repository-verified Gate 1 gaps in this section;
5. implement those verified gaps without adding Application or UI behavior merely to exercise them;
6. prove the Gate 1 exit condition before Gate 2 becomes active.

Do not predeclare future-layer work here. Architecture defines the required system capabilities, and the Design-to-Code Map defines their code owners. Later gates become detailed in `Changes` only when they are the active construction stage.

### 4.2 Current verified gaps

Not yet populated.

Populate this subsection from the Gate 1 repository audit. A missing item must be supported by actual code/test evidence rather than inferred from document length, directory shape, or a future product feature.

## 5. Build Order

Implementation proceeds through dependency-ordered gates. A later gate starts only when its required lower-layer contracts are complete enough that it does not need temporary substitutes.

```text
1. Domain / Validation Completion
   ↓
2. Semantic Planning Completion
   ↓
3. Data / Persistence / Mutation Operational Completion
   ↓
4. Runtime / Index Foundation Completion
   ↓
5. Query / Derived Foundation Completion
   ↓
6. Application Foundation Completion
   ↓
7. Shared UI Capability Completion
   ↓
8. Product Workspace Implementation
   ↓
9. V1 Integration / Hardening
```

### 5.1 Gate 1 — Domain / Validation

Exit when the frozen V1 Domain rules have canonical implementation/test coverage and no dependent layer needs to invent missing semantics.

### 5.2 Gate 2 — Semantic Planning

Exit when required V1 state transitions can produce complete legal logical plans from Domain inputs and rules.

### 5.3 Gate 3 — Data / Persistence / Mutation

Exit when those plans can be represented and executed through the established carriers and mutation architecture without feature-local I/O paths.

### 5.4 Gate 4 — Runtime / Index

Exit when authoritative Runtime state, ownership, and required shared structural/reference indexes support downstream integrity and reads coherently.

### 5.5 Gate 5 — Query / Derived

Exit when known V1 consumers can use shared structural and derived read capabilities rather than reconstructing them inside pages.

### 5.6 Gate 6 — Application

Exit when required V1 business areas have thin use-case owners over the completed lower layers.

### 5.7 Gate 7 — Shared UI capabilities

Exit when interaction/presentation mechanisms shared by upcoming workspaces have one canonical owner and adequate mechanism-level verification.

### 5.8 Gate 8 — Product workspaces

Build coherent user workflows by composing the established foundations rather than backfilling temporary lower-layer behavior inside page work.

### 5.9 Gate 9 — V1 hardening

Complete integration, recovery, performance, responsive behavior, diagnostics boundaries, regression evidence, and release readiness without redefining upstream semantics for implementation convenience.

## 6. Risk & Verification

The main risk is architectural drift caused by upper-layer implementation outrunning its shared dependencies.

For each active gate:

- verify the current repository before defining gaps;
- run focused tests for changed owners and directly affected shared owners;
- reuse existing lower-layer evidence when the relevant risk has not changed;
- add enforceable architecture/test guards when they protect a meaningful boundary;
- run one full `npm run check` at each coherent stable checkpoint;
- run `git diff --check` before checkpoint;
- use representative real Obsidian validation only for new or changed host/persistence/synchronization/continuous-interaction risks that automated tests cannot establish.

At stable checkpoints, update this document only for current execution facts. Product, Domain, Data, Architecture, and Design-to-Code Map change only when their corresponding project answers truly change.

## 7. Final State

V1 implementation is ready for final product hardening when the frozen project answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or page-private reconstructions; the dependency gates are complete; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the moving implementation baseline, active construction stage, current verified gaps, build order, and execution verification state.

# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
fd501a465985460dc198f15e602841140b2f9d76
docs: tighten documentation authority boundaries
```

This is the single execution baseline for the current construction sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 — Domain / Validation Completion is complete on top of this baseline.

Verified Gate 1 outcomes:

- the frozen Core Entity, Configuration, and Workspace State shapes already matched the canonical Domain model;
- core record/reference/workspace invariants remain owned by `domain/validation`;
- canonical Status terminal semantics remain shared through `domain/rules`;
- Quick Capture default Due now consumes a Domain-owned temporal rule instead of owning the seven-calendar-day policy in Application;
- the frozen `EndOfNextWeek` Cycle default has a Domain-owned calendar-date resolver without inventing a time-of-day persistence rule;
- direct owner-level tests now cover the audited Core Invariants and lifecycle edges that previously lacked explicit evidence;
- focused Gate 1 tests and the full repository check pass after the completion changes.

The repository also contains proven product behavior for Quick Capture/Triage, basic Project and Workflow Issue execution, Triage Accept, Triage Convert to Project, and Issue moves between Projects. Reusable Domain, Markdown, Persistence, Mutation, Runtime, Source Sync, Query, Application/UI, Diagnostics, and architecture-guard foundations remain available for later gates.

Current implementation facts in this document are expected to move as work advances; stable target answers remain in the upstream project documents.

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

Current work is **Gate 2 — Semantic Planning Completion**.

The immediate task is a Semantic Planning Completion Audit against `docs/domain.md`, `docs/architecture.md`, `docs/design-to-code-map.md`, and the actual repository implementation under `plugin/src/domain/planning/` plus directly relevant rule/validation owners.

The audit must:

1. enumerate frozen V1 state transitions and relation-resolution behaviors that require semantic planning;
2. map each required transition to its current planner, shared Domain rule, and owner-level tests;
3. distinguish already-complete planner contracts from repository-verified gaps;
4. verify planners produce complete legal logical transitions rather than partial patches that defer business rules to Application, Mutation, or Persistence;
5. verify required `NeedsInput` / rejection boundaries occur before illegal optimistic state can be created;
6. record only repository-verified Gate 2 gaps in this section;
7. implement those gaps without introducing persistence, runtime, application, or UI mechanisms that belong to later gates;
8. prove the Gate 2 exit condition before Gate 3 becomes active.

Do not infer a missing planner merely from an absent business-area directory or a future UI feature. A Gate 2 gap must follow from a frozen Domain transition or relation-resolution contract that V1 actually requires.

### 4.2 Current verified gaps

Not yet populated.

Populate this subsection from the Gate 2 repository audit. Missing planner coverage must be supported by an explicit frozen transition/invariant and actual repository evidence rather than by speculative feature planning.

## 5. Build Order

Implementation proceeds through dependency-ordered gates. A later gate starts only when its required lower-layer contracts are complete enough that it does not need temporary substitutes.

```text
1. Domain / Validation Completion          COMPLETE
   ↓
2. Semantic Planning Completion           ACTIVE
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

Complete. The frozen V1 Domain model, shared rules, and audited Core Invariants have canonical implementation/test ownership sufficient for dependent semantic planning without temporary semantics.

### 5.2 Gate 2 — Semantic Planning

Exit when required V1 state transitions can produce complete legal logical plans from Domain inputs and rules, with input/rejection boundaries established before illegal optimistic state.

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

Gate completion is recorded only after repository-grounded audit plus passing implementation evidence. Product, Domain, Data, Architecture, and Design-to-Code Map change only when their corresponding project answers truly change.

## 7. Final State

V1 implementation is ready for final product hardening when the frozen project answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or page-private reconstructions; the dependency gates are complete; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the moving implementation baseline, active construction stage, current verified gaps, build order, gate completion state, and execution verification state.

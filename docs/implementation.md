# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
996fec5541d6f56ea88aad3b5f8b60b656e1b7f6
feat: add cycle and delete semantic planning
```

This is the single execution baseline for the active Gate 2 construction sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 — Domain / Validation Completion remains complete. Gate 2 Slice A — Workflow / Project Semantic Foundation and Slice B — Milestone / Cycle + Core Delete Relation Resolution are complete at this baseline.

Verified lower-layer outcomes now include:

- the frozen Core Entity, Configuration, and Workspace State shapes match the canonical Domain model;
- core record/reference/workspace invariants remain owned by `domain/validation`;
- canonical Status terminal semantics remain shared through `domain/rules`;
- Quick Capture default Due and the configured Cycle end suggestion consume Domain-owned temporal rules;
- Workflow Issue creation covers Project and project-less forms;
- Issue Project and Milestone relation changes preserve the frozen same-Project rules;
- Triage Accept can create Project or project-less Workflow work without carrying Triage Due;
- Project lifecycle planning enforces the Complete child-Issue gate and explicit Reopen semantics;
- Project Initiative membership is planned canonically;
- Project acceptance and non-terminal child checks have shared Domain rule ownership across planning and validation;
- Project-scoped Milestone creation has canonical semantic planning;
- Cycle open, membership change, close, and next-cycle candidate selection have Domain planning/rule ownership;
- Initiative, Milestone, Project, Workflow Issue, and Cycle deletion produce complete relation-resolving logical plans;
- focused Slice A/Slice B tests, the full repository check, and `git diff --check` passed locally;
- GitHub Actions CI #65 passed for `7fe3547a16bd9a3d7fdaa38a083c5368c7671e2f`;
- GitHub Actions CI #66 passed for `996fec5541d6f56ea88aad3b5f8b60b656e1b7f6`.

The repository also contains proven Markdown, Persistence, Mutation, Runtime, Source Sync, Query, Application/UI, Diagnostics, and architecture-guard foundations for later gates.

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

- Domain model, rules, validation, and semantic-planning infrastructure;
- Markdown schema, codecs, and managed-path support;
- Domain-source and plugin-data persistence;
- shared Mutation planning/execution infrastructure and established transaction topologies;
- committed/pending Runtime projection, source ownership, and reconciliation;
- Source Sync and host-event convergence;
- shared Query helpers;
- Application/UI foundations for the already implemented workflows;
- Diagnostics, architecture guards, and representative real-host evidence.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. Do not create production surrogates, alternate carriers, compatibility aliases, duplicate mechanisms, or persisted derived state merely to unblock an upper layer.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 2 — Semantic Planning Completion**.

The Semantic Planning Completion Audit against the frozen Domain and the repository at `3abbc358ef5a61cec3fd852ad4ad4d52d536ae7d` established the Gate 2 gap set. Slice A closed the Workflow Issue / Project relation and lifecycle cluster at `7fe3547a16bd9a3d7fdaa38a083c5368c7671e2f`. Slice B closed Milestone / Cycle semantic planning and Core Entity delete relation resolution at `996fec5541d6f56ea88aad3b5f8b60b656e1b7f6`.

The **Configuration Reference Resolution** slice is implemented and locally verified on top of the current remote baseline. It now:

1. provides one canonical semantic planner for a complete Configuration replacement plus only the Domain Entity repairs made necessary by that replacement;
2. allows safe Status name/default/order changes without rewriting existing Entity references;
3. requires explicit per-entity Status replacement when a referenced StatusDefinition disappears or changes `entityType` / `category`, preserving the previous lifecycle category rather than silently using a configured default or smuggling a lifecycle transition into Configuration editing;
4. requires explicit per-entity Label selection repair when removed Labels, applicability changes, or Single-selection rules would make the current selection illegal, allowing explicit replacement or explicit clearing but never silent data loss;
5. merges Configuration and all required Entity repairs into one logical Mutation Plan with stale-state preconditions;
6. reuses shared Domain rules where Configuration planning and workspace validation consume the same Label/Cycle invariants;
7. rejects intrinsically invalid next Configuration before reference repair planning;
8. keeps Persistence, Runtime, Application, Settings UI, and opaque future Custom View filter semantics in their later owners.

Focused Configuration semantic tests, the full repository check, and `git diff --check` pass locally for this slice. Remote checkpoint and CI verification are still pending.

The current task is the **Gate 2 Exit Audit**. Gate 2 remains ACTIVE until the Configuration slice is committed, pushed, remotely verified, and a repository-grounded audit confirms that no frozen V1 semantic-planning gap remains.

### 4.2 Current verified gaps

No implementation gap from the established Gate 2 audit remains after the locally verified Configuration Reference Resolution slice.

The exit audit must now verify the actual repository against the frozen Product / Domain / Data / Architecture contracts and the full `domain/planning` + directly relevant `domain/rules` / `domain/validation` owners. If that audit finds a concrete missing frozen transition, relation-resolution behavior, or illegal optimistic boundary, record it here and keep Gate 2 ACTIVE. Otherwise, after remote verification, mark Gate 2 COMPLETE and advance the moving implementation baseline to the verified Configuration checkpoint.

The typed Workspace State still does not define stable StatusDefinitionId or LabelId reference fields inside Custom View filter payloads, so Gate 2 does not invent repair semantics for opaque future view configuration. Product, Domain, Data, Architecture, and Design-to-Code Map remain frozen unless implementation evidence exposes an actual contradiction in those authorities.

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

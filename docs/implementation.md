# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
3a2fb55bc6ba34d2e8acff8df470396c2426d1e9
feat: add configuration reference resolution
```

This is the single execution baseline for the active Gate 2 exit sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 — Domain / Validation Completion remains complete. The three planned Gate 2 implementation slices are remotely complete at this baseline:

- Slice A — Workflow / Project Semantic Foundation at `7fe3547a16bd9a3d7fdaa38a083c5368c7671e2f`;
- Slice B — Milestone / Cycle + Core Delete Relation Resolution at `996fec5541d6f56ea88aad3b5f8b60b656e1b7f6`;
- Configuration Reference Resolution at `3a2fb55bc6ba34d2e8acff8df470396c2426d1e9`.

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
- Configuration changes preserve current Status/Label reference legality through explicit semantic resolution rather than silent defaults or data loss;
- shared Label/Cycle rules are reused by planning and validation where the invariant is the same;
- focused Slice A/Slice B/Configuration tests, the full repository check, and `git diff --check` passed locally;
- GitHub Actions CI #65, #66, and #67 passed for their corresponding checkpoints.

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

The original Semantic Planning Completion Audit against the frozen Domain and the repository at `3abbc358ef5a61cec3fd852ad4ad4d52d536ae7d` established the implementation gap set. Slice A, Slice B, and Configuration Reference Resolution closed those planned clusters and are remotely verified through `3a2fb55bc6ba34d2e8acff8df470396c2426d1e9`.

The repository-grounded **Gate 2 Exit Audit** then re-read the frozen Project acceptance contract against the current `domain/planning` owners. It found one final semantic bypass in the remote baseline: a terminal Workflow Issue already belonging to a terminal Project could transition back to a non-terminal Issue Status without first reopening the Project, and that legal reopen path lacked a Project precondition against concurrent Project closure.

The **Issue Reopen Project Guard** follow-up is now implemented and locally verified on top of the current remote baseline. It:

1. applies the established Project acceptance rule only when a terminal Issue transitions back to a non-terminal Status while it belongs to a Project;
2. rejects that reopen when the Project is terminal until the Project is explicitly reopened;
3. includes the relevant non-terminal Project as a Mutation precondition when the Issue reopen is legal, closing the stale-Project race before optimistic commit;
4. leaves project-less reopen, terminal-to-terminal changes, and existing non-terminal lifecycle changes unchanged;
5. proves the boundary in the Issue planner owner tests without creating a new Project lifecycle model or duplicating Project acceptance semantics.

Focused Issue/Project planning tests, the full repository check, and `git diff --check` pass locally for this follow-up. Gate 2 remains ACTIVE until this follow-up is committed, pushed, remotely verified, and the final repository-grounded Exit Audit confirms that no frozen V1 semantic-planning gap remains.

### 4.2 Current verified gaps

No unimplemented semantic-planning gap remains in the locally verified Gate 2 work. The final exit condition is remote verification of the Issue Reopen Project Guard followed by one last audit against that checkpoint.

No second missing frozen transition, relation-resolution behavior, or configuration-reference boundary was found in the Exit Audit across the current Triage, Workflow Issue, Project, Milestone, Cycle, delete, Configuration, shared rule, and validation owners.

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

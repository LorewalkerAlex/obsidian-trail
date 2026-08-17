# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
3abbc358ef5a61cec3fd852ad4ad4d52d536ae7d
feat: complete domain validation foundation
```

This is the single execution baseline for the active Gate 2 construction sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 — Domain / Validation Completion is complete at this baseline.

Verified Gate 1 outcomes:

- the frozen Core Entity, Configuration, and Workspace State shapes already matched the canonical Domain model;
- core record/reference/workspace invariants remain owned by `domain/validation`;
- canonical Status terminal semantics remain shared through `domain/rules`;
- Quick Capture default Due now consumes a Domain-owned temporal rule instead of owning the seven-calendar-day policy in Application;
- the frozen `EndOfNextWeek` Cycle default has a Domain-owned calendar-date resolver without inventing a time-of-day persistence rule;
- direct owner-level tests now cover the audited Core Invariants and lifecycle edges that previously lacked explicit evidence;
- focused Gate 1 tests and the full repository check pass after the completion changes;
- GitHub Actions CI #64 passed for the Gate 1 checkpoint.

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

The Semantic Planning Completion Audit against the frozen Domain and the actual repository at `3abbc358ef5a61cec3fd852ad4ad4d52d536ae7d` is complete. The audit confirmed that existing Issue Status and Triage planners already establish the intended pure-planning pattern, while the remaining Gate 2 work is concentrated in frozen V1 transitions and relation-resolution behaviors that do not yet have complete canonical planner ownership.

Gate 2 implementation must:

1. complete the verified Workflow Issue / Project relation and lifecycle planning gaps without moving semantic rules into Application or Persistence;
2. complete Initiative / Milestone / Cycle planning required by frozen V1 contracts;
3. complete Core Entity delete relation-resolution planning as legal multi-effect logical mutations;
4. complete reference-affecting Status/Label configuration planning where current authoritative references require repair or explicit replacement;
5. keep required `NeedsInput` / rejection boundaries ahead of illegal optimistic state;
6. reuse shared Domain rules when the same invariant is consumed by validation and planning;
7. keep physical placement, transaction execution, Runtime indexes, Query, Application, and UI work in their later gates;
8. prove the Gate 2 exit condition before Gate 3 becomes active.

The current implementation slice is **Workflow / Project Semantic Foundation**. It targets the first verified gap cluster only; the remaining verified gaps stay open until their own coherent slices are implemented and verified.

### 4.2 Current verified gaps

The repository audit verified these Gate 2 gaps:

1. **Workflow Issue / Project relation completeness**
   - normal Workflow Issue creation does not yet cover the frozen project-less form;
   - Triage Accept does not yet cover a project-less Workflow target;
   - Issue Project planning covers Project-to-Project movement but not Project-to-project-less movement;
   - Issue Milestone set/clear has no canonical planner even though same-Project relation legality is frozen;
   - Project lifecycle Status planning, including Complete rejection with current non-terminal child Issues and explicit Reopen semantics, has no canonical planner;
   - Project Initiative membership set/clear has no canonical planner;
   - Project acceptance of new non-terminal work and Project-completion child checks are currently repeated or validation-local rather than owned as shared semantic rules.

2. **Cycle semantic planning**
   - Cycle open, membership edit, and close have no canonical planner coverage sufficient to produce complete legal logical plans;
   - Create Next Cycle has no Domain-owned candidate rule for the frozen unfinished/non-terminal initial selection semantics.

3. **Core Entity delete relation resolution**
   - Initiative, Milestone, Project, Workflow Issue, and Cycle delete contracts require complete relation repair/removal in one logical mutation;
   - current planner coverage includes Triage delete only and does not implement the frozen cross-entity delete semantics.

4. **Reference-affecting configuration planning**
   - StatusDefinition and Label configuration changes that would invalidate authoritative references have validation coverage but no canonical semantic planner for explicit replacement/cancellation boundaries and complete legal repair plans.

These are implementation gaps, not new Domain questions. Product, Domain, Data, Architecture, and Design-to-Code Map remain frozen unless implementation evidence exposes an actual contradiction in those authorities.

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
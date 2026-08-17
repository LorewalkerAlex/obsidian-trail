# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
dedc8342e4b9b2e8ba5a3adca18250a3abb3678f
feat: operationalize project delete persistence
```

This is the single execution baseline for the active Gate 4 construction sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 — Domain / Validation Completion, Gate 2 — Semantic Planning Completion, and Gate 3 — Data / Persistence / Mutation Operational Completion are complete at this baseline.

Gate 2 closure evidence includes:

- Slice A — Workflow / Project Semantic Foundation at `7fe3547a16bd9a3d7fdaa38a083c5368c7671e2f`;
- Slice B — Milestone / Cycle + Core Delete Relation Resolution at `996fec5541d6f56ea88aad3b5f8b60b656e1b7f6`;
- Configuration Reference Resolution at `3a2fb55bc6ba34d2e8acff8df470396c2426d1e9`;
- the Exit Audit Issue Reopen Project Guard at `8fbdc01db1064e089c52e884bf0dacb0cd9455ca`;
- the final repository-grounded Gate 2 Exit Audit found no remaining frozen V1 semantic-planning gap;
- GitHub Actions CI #65 through #68 passed for the corresponding Gate 2 checkpoints.

Gate 3 closure evidence includes:

- the complete Gate 2 logical-plan set was re-audited against Single Transaction, Source Transition, and Integrity Batch materialization/execution paths;
- ordinary same-carrier changes, Issue placement moves, Triage Accept/Convert, Initiative/Milestone/Issue reference cleanup, Cycle changes, and Configuration reference repairs all have shared physical execution paths;
- Project Delete & Root Source Operationalization at `dedc8342e4b9b2e8ba5a3adca18250a3abb3678f` closed the one unsupported moving-root materialization path found by the Gate 3 audit;
- authoritative root-source deletion now verifies the latest canonical pre-image before file destruction;
- successful Project Delete Integrity Batch settlement releases deleted-source ownership before applying prepared snapshots containing the same stable entity IDs;
- Application writes enter the shared authoritative Source Sync / Mutation pipeline rather than feature-local Persistence or Markdown I/O;
- GitHub Actions CI #69 passed for the Gate 3 checkpoint;
- the final repository-grounded Gate 3 Exit Audit found no remaining known V1 logical plan that lacks an established shared physical execution path.

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
- shared Mutation Plan, coordinator, queue, materialization, and execution infrastructure;
- committed/pending Runtime projection, source ownership, and reconciliation;
- Source Sync and host-event convergence;
- shared Query helpers;
- Application/UI foundations for the already implemented workflows;
- Diagnostics, architecture guards, and representative real-host evidence.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. Do not create production surrogates, alternate carriers, compatibility aliases, duplicate mechanisms, or persisted derived state merely to unblock an upper layer.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 4 — Runtime / Index Foundation Completion**.

The Gate 4 repository audit starts from `dedc8342e4b9b2e8ba5a3adca18250a3abb3678f`. The authoritative Runtime, source ownership, reconciliation, and pending-plan projection foundations already exist, but the committed Runtime currently materializes only `issuesByProjectId` as a shared structural index.

The first Gate 4 implementation slice is **Runtime Structural & Reference Index Foundation**. It is implemented and locally verified on top of the remote `dedc8342e4b9b2e8ba5a3adca18250a3abb3678f` baseline. It establishes the shared inverse/reference dimensions needed by later integrity and read layers without moving Query behavior into Runtime.

The slice covers:

1. Project membership by Initiative;
2. Milestone membership by Project;
3. Issue membership by Project and Milestone;
4. Cycle membership in both directions plus the single current Open Cycle when one is unambiguous;
5. Entity references by Label ID;
6. Entity references by StatusDefinition ID;
7. deterministic key/value ordering for rebuildable Runtime indexes;
8. a pending-aware effective Runtime projection that rebuilds indexes from the same Effective Domain used for optimistic reads, so committed indexes never masquerade as current optimistic relationships.

The index builder remains derived-only. It does not validate or repair illegal Domain facts; Domain/reference/workspace validation remains the authority. Query and product selectors are not changed in Gate 4 Slice A and will consume the completed Runtime foundation in Gate 5. Focused Runtime/index/reconcile/query/source-sync regressions, the full `npm run check`, and `git diff --check` pass locally for this slice.

### 4.2 Current verified gaps

The first Gate 4 audit gap was the narrow committed-index surface plus the absence of a canonical pending-aware effective index projection. The current locally verified slice closes that gap in the working tree.

The architecture lists additional possible indexes, but Gate 4 does not mechanically materialize every candidate. Configuration-only lookup conveniences such as StatusDefinition/category or LabelGroup/entity-type lookup remain eligible for Gate 5 if real selectors need them. Persisted derived caches remain out of scope.

Gate 4 remains ACTIVE until this slice is committed, pushed, remotely verified, and the repository-grounded Exit Audit rechecks Runtime ownership, reconciliation, pending replay, and the known V1 downstream read requirements from the new checkpoint.

Product, Domain, Data, Architecture, and Design-to-Code Map remain unchanged unless implementation evidence exposes a contradiction in those authorities.

## 5. Build Order

Implementation proceeds through dependency-ordered gates. A later gate starts only when its required lower-layer contracts are complete enough that it does not need temporary substitutes.

```text
1. Domain / Validation Completion          COMPLETE
   ↓
2. Semantic Planning Completion           COMPLETE
   ↓
3. Data / Persistence / Mutation Operational Completion   COMPLETE
   ↓
4. Runtime / Index Foundation Completion   ACTIVE
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

Complete. The frozen V1 Domain model, shared rules, and audited Core Invariants have canonical implementation/test ownership.

### 5.2 Gate 2 — Semantic Planning

Complete. Required V1 state transitions produce complete legal logical plans from Domain inputs and rules, with input/rejection boundaries established before illegal optimistic state.

### 5.3 Gate 3 — Data / Persistence / Mutation

Complete. The current V1 logical-plan set can be materialized and executed through the established carriers and shared Mutation architecture without feature-local I/O paths or known unsupported physical transitions.

### 5.4 Gate 4 — Runtime / Index

Exit when authoritative Runtime state, ownership, pending projection, and required shared structural/reference indexes support downstream integrity and reads coherently.

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

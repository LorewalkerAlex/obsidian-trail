# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
8fbdc01db1064e089c52e884bf0dacb0cd9455ca
fix: guard issue reopen in terminal project
```

This is the single execution baseline for the active Gate 3 construction sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 — Domain / Validation Completion and Gate 2 — Semantic Planning Completion are complete at this baseline.

Gate 2 closure evidence includes:

- Slice A — Workflow / Project Semantic Foundation at `7fe3547a16bd9a3d7fdaa38a083c5368c7671e2f`;
- Slice B — Milestone / Cycle + Core Delete Relation Resolution at `996fec5541d6f56ea88aad3b5f8b60b656e1b7f6`;
- Configuration Reference Resolution at `3a2fb55bc6ba34d2e8acff8df470396c2426d1e9`;
- the Exit Audit Issue Reopen Project Guard at `8fbdc01db1064e089c52e884bf0dacb0cd9455ca`;
- the final repository-grounded Gate 2 Exit Audit found no remaining frozen V1 semantic-planning gap;
- GitHub Actions CI #65 through #68 passed for the corresponding Gate 2 checkpoints.

Verified lower-layer outcomes now include complete V1 Domain planning for Triage, Workflow Issue, Project, Milestone, Cycle, Core Entity deletion, and reference-affecting Configuration changes. Those planners produce complete legal logical Mutation Plans before optimistic state is admitted.

The repository also contains proven Markdown codecs/schema, Domain-source and plugin-data repositories, the fixed Mutation topology contracts, dequeue-time materialization, transaction execution, Runtime reconciliation, Source Sync/recovery, Query/Application/UI foundations, Diagnostics, and architecture guards. Gate 3 audits those existing mechanisms against the now-complete logical plan set rather than assuming target code-map ownership implies operational completeness.

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

Current work is **Gate 3 — Data / Persistence / Mutation Operational Completion**.

Gate 3 starts from the complete Gate 2 logical-plan set and checks whether each plan can be materialized and executed through the established physical carriers and the three fixed transaction topologies:

```text
Single Transaction
Source Transition
Integrity Batch
```

The first repository-grounded Gate 3 audit found that existing Single Transaction and Source Transition foundations already cover ordinary same-carrier changes, Issue placement moves, Triage Accept, and Triage Convert to Project. It also found a concrete Integrity Batch gap around file-backed deletion.

The current implementation slice is **Project Delete & Root Source Operationalization**. It is implemented and locally verified on top of the remote `8fbdc01db1064e089c52e884bf0dacb0cd9455ca` baseline.

The slice now:

1. materializes canonical Project deletion without inventing a new transaction topology;
2. moves surviving child Issues to `Projectless Issues` destination-first, then deletes the old Project carrier once rather than deleting its child records one by one;
3. requires the logical Project-delete plan to resolve every entity currently owned by that Project source exactly once before the root file can be destroyed;
4. allows an empty Project carrier to be removed as one Single Transaction;
5. allows an unreferenced Initiative carrier to be removed as one Single Transaction while refusing an incomplete standalone Initiative delete when Projects still reference it;
6. attaches the expected canonical entity pre-image to authoritative root-source deletion and rereads the source immediately before file destruction, refusing deletion if that source has changed or become untrusted;
7. reconciles successful Integrity Batch results by releasing deleted-source ownership before applying prepared snapshots that contain the same stable entity IDs;
8. keeps physical executor audit order unchanged and reuses existing recovery, queue, Runtime, Persistence, and Source Sync mechanisms.

Focused Project Delete/materialization/execution/settlement regressions, the full `npm run check`, and `git diff --check` pass locally for this slice. Gate 3 remains ACTIVE until the slice is committed, pushed, remotely verified, and the repository-grounded operational audit continues from that new checkpoint.

### 4.2 Current verified gaps

The first Gate 3 audit findings at `8fbdc01db1064e089c52e884bf0dacb0cd9455ca` were Project Delete materialization, authoritative root-source deletion, and Integrity Batch settlement ordering. The current locally verified slice closes those three findings in the working tree.

No additional Gate 3 gap is declared by this checkpoint document. After remote verification, the audit must continue from the new repository checkpoint across the remaining complete Gate 2 logical-plan set, especially low-frequency Integrity Batch and plugin-data/reference-repair paths. Later gaps must be established from actual materialization/execution/recovery behavior rather than inferred from the target code tree.

These are implementation concerns inside the existing architecture; Product, Domain, Data, Architecture, and Design-to-Code Map remain unchanged unless later implementation evidence exposes a contradiction in those authorities.

## 5. Build Order

Implementation proceeds through dependency-ordered gates. A later gate starts only when its required lower-layer contracts are complete enough that it does not need temporary substitutes.

```text
1. Domain / Validation Completion          COMPLETE
   ↓
2. Semantic Planning Completion           COMPLETE
   ↓
3. Data / Persistence / Mutation Operational Completion   ACTIVE
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

Complete. The frozen V1 Domain model, shared rules, and audited Core Invariants have canonical implementation/test ownership.

### 5.2 Gate 2 — Semantic Planning

Complete. Required V1 state transitions produce complete legal logical plans from Domain inputs and rules, with input/rejection boundaries established before illegal optimistic state.

### 5.3 Gate 3 — Data / Persistence / Mutation

Exit when the complete V1 logical-plan set can be represented and executed through the established carriers and mutation architecture without feature-local I/O paths or known unsupported physical transitions.

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

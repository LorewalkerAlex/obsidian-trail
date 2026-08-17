# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
7cd07b638add1a7e7364f89c2fcc69d7cb2ed095
feat: add canonical derived query facts
```

This is the single execution baseline for the active Gate 6 construction sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 - Domain / Validation Completion, Gate 2 - Semantic Planning Completion, Gate 3 - Data / Persistence / Mutation Operational Completion, Gate 4 - Runtime / Index Foundation Completion, and Gate 5 - Query / Derived Foundation Completion are complete foundations for the current stage. A bounded Gate 2 correction discovered by the Gate 6 repository audit is tracked in the current slice rather than bypassed in Application.

Gate 4 closure evidence includes Runtime Structural & Reference Index Foundation at `fa48f2d940457e8b7ed93eca037ce395d20a4ed7`, CI #70, and the final Runtime/index audit finding no second foundation gap required by known V1 reads.

Gate 5 closure evidence includes:

- Effective Structural Query Foundation at `858a74f49d74ca61c875ad54d78f58b0202fbd07` with CI #71;
- Canonical Derived Facts Foundation at `7cd07b638add1a7e7364f89c2fcc69d7cb2ed095` with CI #72;
- one coherent committed/effective readable snapshot boundary and shared structural relationship selectors;
- Query-owned Initiative completion and current-scope actual-start derivation for Project, Milestone, and Initiative;
- the Gate 5 Exit Audit finding that concrete Saved View filter/sort/group/scope schemas are intentionally deferred until product slices freeze them, while page-specific selectors and similarity helpers should follow real consumers rather than speculative APIs.

Current implementation facts in this document are expected to move as work advances; stable target answers remain in the upstream project documents.

## 2. Objective

Complete the frozen V1 design from the bottom up, in dependency order, before resuming dependent product-workspace implementation.

The implementation consumes the established project answers:

```text
product.md
-> domain.md
-> data.md
-> architecture.md
-> design-to-code-map.md
```

The active strategy is contract-driven bottom-up implementation:

```text
foundational semantics and integrity
-> shared technical support
-> read/application capabilities
-> shared interaction capabilities
-> product workspaces
```

A missing upper-layer feature must not cause a temporary lower-layer model, placeholder entity, compatibility path, fake default, or second mechanism. If later-layer evidence exposes a concrete lower-layer omission, correct the canonical lower-layer owner before consuming it.

## 3. Reuse

Reuse existing canonical owners and shared foundations instead of rebuilding them per feature.

Current reusable capability areas include:

- Domain model, rules, validation, and semantic planning;
- Markdown schema/codecs and authoritative Persistence;
- shared Mutation materialization/execution and Source Sync;
- committed/effective Runtime, source ownership, reconciliation, and structural/reference indexes;
- shared structural and explicitly defined derived Query capabilities;
- Application normalization, planning-result handling, mutation receipts, and Source Sync submission support;
- existing Triage, Project, and Issue Application facades;
- Diagnostics and architecture guards.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. Do not create production surrogates, alternate carriers, compatibility aliases, duplicate mechanisms, persisted derived state, or feature-local persistence paths merely to unblock an upper layer.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 6 - Application Foundation Completion**.

The Gate 6 repository audit starts from `7cd07b638add1a7e7364f89c2fcc69d7cb2ed095`. Application currently has canonical facades only for Triage, Projects, and Workflow Issues, while the target ownership map also requires Initiatives, Milestones, Cycles, Configuration, Workspace, and create-time similarity capabilities as their product contracts become executable.

The audit also found one bounded lower-layer omission: Initiative is a managed V1 Core Entity with its own carrier, delete semantics, Runtime ownership, Query relationships, and `application/initiatives` target owner, but the completed planning set has no Initiative create planner. Application must not manufacture a raw Mutation Plan to hide that omission.

The first Gate 6 implementation slice is **Core Work Application Coverage**. It keeps the correction and its consumer in one coherent slice:

1. add the missing pure Initiative create planner and owner-level tests, creating only the canonical minimal Initiative facts and no workflow/derived state;
2. add Initiative, Milestone, and Cycle Application facades over existing planners and the shared Source Sync submission boundary;
3. expand Project Application to expose Status change, Initiative relation change, and delete;
4. expand Workflow Issue Application to expose project-less create/move, Milestone relation change, and delete;
5. expose Initiative/Milestone/Cycle facades through the stable Application Session;
6. preserve existing Triage/Application failure-boundary evidence while adding session-level verification that the new use cases emit logical plans rather than writing Persistence directly.

This slice does not implement Configuration, Workspace-state editing, Saved View schemas, or create-time similarity. Those have distinct input contracts and remain subject to the continued Gate 6 audit after the core work facade has a public checkpoint.

### 4.2 Current verified gaps

Gate 5 is remotely complete at `7cd07b638add1a7e7364f89c2fcc69d7cb2ed095` with CI #72 passing.

The current verified Gate 6 gap is incomplete Application coverage for already frozen Core Entity and relationship use cases, plus the bounded missing Initiative create semantic owner exposed by that audit. The Core Work Application Coverage delivery addresses that gap without changing Product, Domain, Data, Architecture, or the Design-to-Code Map.

After this slice is remotely verified, continue the Gate 6 audit over Configuration commands, user Workspace State, and create-time similarity. Do not invent generic Saved View filter/group/sort schemas or similarity thresholds before their authoritative product contracts are frozen.

## 5. Build Order

Implementation proceeds through dependency-ordered gates. A later gate starts only when its required lower-layer contracts are complete enough that it does not need temporary substitutes.

```text
1. Domain / Validation Completion          COMPLETE
   |
2. Semantic Planning Completion           COMPLETE (bounded correction in Gate 6 Slice A)
   |
3. Data / Persistence / Mutation Operational Completion   COMPLETE
   |
4. Runtime / Index Foundation Completion   COMPLETE
   |
5. Query / Derived Foundation Completion   COMPLETE
   |
6. Application Foundation Completion       ACTIVE
   |
7. Shared UI Capability Completion
   |
8. Product Workspace Implementation
   |
9. V1 Integration / Hardening
```

### 5.1 Gate 1 - Domain / Validation

Complete. The frozen V1 Domain model, shared rules, and Core Invariants have canonical implementation/test ownership.

### 5.2 Gate 2 - Semantic Planning

Complete as a foundation, with the missing Initiative create planner tracked as a bounded correction in Gate 6 Slice A after later repository evidence exposed the omission. Application may not bypass that correction.

### 5.3 Gate 3 - Data / Persistence / Mutation

Complete. The current V1 logical-plan set has shared physical execution paths through the established carriers and Mutation architecture.

### 5.4 Gate 4 - Runtime / Index

Complete. Authoritative Runtime state, source ownership, pending projection, reconciliation, and required structural/reference indexes support downstream integrity and reads coherently.

### 5.5 Gate 5 - Query / Derived

Complete. Known V1 consumers can use shared structural reads and currently explicit derived facts without page-private reconstruction; deferred presentation/query schemas remain consumer-driven.

### 5.6 Gate 6 - Application

Exit when required V1 business areas have thin use-case owners over the completed lower layers, with no Application-owned business rules or persistence paths.

### 5.7 Gate 7 - Shared UI capabilities

Exit when interaction/presentation mechanisms shared by upcoming workspaces have one canonical owner and adequate mechanism-level verification.

### 5.8 Gate 8 - Product workspaces

Build coherent user workflows by composing the established foundations rather than backfilling temporary lower-layer behavior inside page work.

### 5.9 Gate 9 - V1 hardening

Complete integration, recovery, performance, responsive behavior, diagnostics boundaries, regression evidence, and release readiness without redefining upstream semantics for implementation convenience.

## 6. Risk & Verification

For each active gate:

- verify the current repository before defining gaps;
- run focused tests for changed owners and directly affected shared owners;
- reuse lower-layer evidence when the relevant risk has not changed;
- add enforceable architecture/test guards only when they protect a meaningful boundary;
- run one full `npm run check` at each coherent stable checkpoint;
- run `git diff --check` before checkpoint;
- use representative real Obsidian validation only for changed host/persistence/synchronization/continuous-interaction risks that automated tests cannot establish.

Gate completion is recorded only after repository-grounded audit plus passing implementation evidence. Product, Domain, Data, Architecture, and Design-to-Code Map change only when their corresponding project answers truly change.

## 7. Final State

V1 implementation is ready for final product hardening when the frozen project answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or page-private reconstructions; the dependency gates are complete; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the moving implementation baseline, active construction stage, current verified gaps, build order, gate completion state, and execution verification state.

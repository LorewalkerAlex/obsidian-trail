# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
df003d6d0152ed3f39cdee7fb7fdfd78a20c41d0
feat: expand core work application coverage
```

This is the single execution baseline for the active Gate 6 construction sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 - Domain / Validation Completion, Gate 2 - Semantic Planning Completion, Gate 3 - Data / Persistence / Mutation Operational Completion, Gate 4 - Runtime / Index Foundation Completion, and Gate 5 - Query / Derived Foundation Completion are complete foundations for the current stage.

Gate 4 closure evidence includes Runtime Structural & Reference Index Foundation at `fa48f2d940457e8b7ed93eca037ce395d20a4ed7`, CI #70, and the final Runtime/index audit finding no second foundation gap required by known V1 reads.

Gate 5 closure evidence includes:

- Effective Structural Query Foundation at `858a74f49d74ca61c875ad54d78f58b0202fbd07` with CI #71;
- Canonical Derived Facts Foundation at `7cd07b638add1a7e7364f89c2fcc69d7cb2ed095` with CI #72;
- one coherent committed/effective readable snapshot boundary and shared structural relationship selectors;
- Query-owned Initiative completion and current-scope actual-start derivation for Project, Milestone, and Initiative;
- the Gate 5 Exit Audit finding that concrete Saved View filter/sort/group/scope schemas are intentionally deferred until product slices freeze them, while page-specific selectors and similarity helpers should follow real consumers rather than speculative APIs.

Gate 6 Slice A closure evidence includes:

- Core Work Application Coverage at `df003d6d0152ed3f39cdee7fb7fdfd78a20c41d0` with CI #73;
- the bounded missing Initiative create semantic planner corrected in `domain/planning` rather than bypassed by Application;
- Initiative, Milestone, and Cycle Application facades over the shared planning/Source Sync boundary;
- Project lifecycle/Initiative relation/delete and Workflow Issue project-less/Milestone/delete use cases exposed through Application;
- diagnostics normalization kept compatible with project-less Issue moves;
- the remote checkpoint containing exactly the intended 11 files and passing the full repository CI.

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
- Triage, Initiative, Project, Milestone, Workflow Issue, and Cycle Application facades;
- Diagnostics and architecture guards.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. Do not create production surrogates, alternate carriers, compatibility aliases, duplicate mechanisms, persisted derived state, or feature-local persistence paths merely to unblock an upper layer.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 6 - Application Foundation Completion**.

The current public checkpoint is `df003d6d0152ed3f39cdee7fb7fdfd78a20c41d0`. Gate 6 Slice A closed the already-frozen Core Work Application coverage gap and corrected the Initiative-create planning omission discovered by the later-layer audit.

The continued Gate 6 repository audit separates the remaining target ownership into executable and deferred contracts:

- Configuration already has a complete pure semantic planner, including explicit `NeedsInput` for Status/Label reference repair, and the shared Mutation/Source Sync path already supports authoritative `replace-configuration` settlement.
- Workspace State persistence ownership is frozen, but concrete Custom View filter/sort/group/scope schemas and Home composition remain intentionally deferred in the Domain model. Building a generic arbitrary Workspace-State replacement facade now would expose an unstable product contract rather than a V1 use case.
- Create-time similarity is a frozen guardrail responsibility, but no authoritative matching algorithm, threshold, candidate contract, or confirmation interaction is defined yet. It should be implemented with the actual creation consumer instead of inventing a speculative Application API.

The second Gate 6 implementation slice is **Configuration Application Boundary**. It:

1. adds a thin `application/configuration` facade over `planChangeTrailConfiguration`;
2. preserves planner `NeedsInput` so required reference resolution remains an explicit upper-layer decision;
3. adds a non-entity mutation receipt helper while preserving existing entity receipt semantics;
4. avoids submitting semantic no-op Configuration replacements;
5. exposes Configuration through the stable Application Session and verifies that it emits only a logical `configuration.change` plan through Source Sync.

This slice does not create Workspace-State editing, Saved View schemas, Home composition commands, similarity algorithms, or UI. Those capabilities remain consumer-driven until their specific product contracts are frozen.

### 4.2 Current verified gaps

Gate 5 is remotely complete at `7cd07b638add1a7e7364f89c2fcc69d7cb2ed095` with CI #72 passing.

Gate 6 Slice A is remotely complete at `df003d6d0152ed3f39cdee7fb7fdfd78a20c41d0` with CI #73 passing. The bounded Gate 2 Initiative-create correction is closed at that same checkpoint.

The current verified Gate 6 gap is the missing Application owner for the already-frozen Configuration change planner. The Configuration Application Boundary delivery addresses that gap through the existing Source Sync path without adding business rules or direct plugin-data writes to Application.

After this slice is remotely verified, run a final Gate 6 Exit Audit. Workspace State and similarity should not block Gate 6 merely because target ownership exists: their concrete write/guard contracts are explicitly deferred and must follow the product slices that define them.

Product, Domain, Data, Architecture, and Design-to-Code Map remain unchanged unless implementation evidence exposes a contradiction in those authorities.

## 5. Build Order

Implementation proceeds through dependency-ordered gates. A later gate starts only when its required lower-layer contracts are complete enough that it does not need temporary substitutes.

```text
1. Domain / Validation Completion          COMPLETE
   |
2. Semantic Planning Completion           COMPLETE
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

Complete. Required currently frozen V1 state transitions produce complete legal logical plans before illegal optimistic state is admitted. The Initiative-create omission discovered by Gate 6 was corrected at `df003d6d0152ed3f39cdee7fb7fdfd78a20c41d0`.

### 5.3 Gate 3 - Data / Persistence / Mutation

Complete. The current V1 logical-plan set has shared physical execution paths through the established carriers and Mutation architecture.

### 5.4 Gate 4 - Runtime / Index

Complete. Authoritative Runtime state, source ownership, pending projection, reconciliation, and required structural/reference indexes support downstream integrity and reads coherently.

### 5.5 Gate 5 - Query / Derived

Complete. Known V1 consumers can use shared structural reads and currently explicit derived facts without page-private reconstruction; deferred presentation/query schemas remain consumer-driven.

### 5.6 Gate 6 - Application

Exit when required currently executable V1 business areas have thin use-case owners over the completed lower layers, with no Application-owned business rules or persistence paths. Deferred product contracts do not require speculative facades merely to satisfy target directory ownership.

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

# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
858a74f49d74ca61c875ad54d78f58b0202fbd07
feat: add effective structural query foundation
```

This is the single execution baseline for the active Gate 5 construction sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 - Domain / Validation Completion, Gate 2 - Semantic Planning Completion, Gate 3 - Data / Persistence / Mutation Operational Completion, and Gate 4 - Runtime / Index Foundation Completion are complete at this baseline.

Gate 3 closure evidence includes the repository-grounded topology audit, Project Delete & Root Source Operationalization at `dedc8342e4b9b2e8ba5a3adca18250a3abb3678f`, GitHub Actions CI #69, and the final audit finding no remaining known V1 logical plan without a shared physical execution path.

Gate 4 closure evidence includes:

- Runtime Structural & Reference Index Foundation at `fa48f2d940457e8b7ed93eca037ce395d20a4ed7`;
- committed inverse/reference indexes for Initiative, Project, Milestone, Issue, Cycle, Label, and StatusDefinition relationships;
- one unambiguous current Open Cycle projection;
- pending-aware effective index projection built from the same Effective Domain as optimistic reads;
- committed reconciliation rebuilding indexes from authoritative Domain facts while source ownership remains a separate Runtime concern;
- GitHub Actions CI #70 passing for the Gate 4 checkpoint;
- the final repository-grounded Gate 4 Exit Audit finding no second Runtime/index foundation gap required by known V1 downstream reads.

Gate 5 Slice A closure evidence includes:

- Effective Structural Query Foundation at `858a74f49d74ca61c875ad54d78f58b0202fbd07`;
- one coherent readable Runtime snapshot boundary pairing authoritative data with matching indexes;
- shared selectors for Initiative, Project, Milestone, Cycle, Label, and StatusDefinition relationships;
- Project Issue membership narrowed by effective Runtime indexes while Query retains presentation ordering;
- optimistic relationship/classification changes reflected immediately while refresh/recovery falls back to the committed pair;
- GitHub Actions CI #71 passing for the Gate 5 Slice A checkpoint.

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

A missing upper-layer feature must not cause a temporary lower-layer model, placeholder entity, compatibility path, fake default, or second mechanism. Canonical data that is not yet exposed by the UI must still be preserved by unrelated mutations.

## 3. Reuse

Reuse existing canonical owners and shared foundations instead of rebuilding them per feature.

Current reusable capability areas include:

- Domain model, rules, validation, and semantic planning;
- Markdown schema/codecs and authoritative Persistence;
- shared Mutation materialization/execution and Source Sync;
- committed/effective Runtime, source ownership, reconciliation, and structural/reference indexes;
- coherent structural Query selection over committed/effective Runtime;
- existing Status/source-health Query helpers;
- Application/UI foundations for already implemented workflows;
- Diagnostics and architecture guards.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. Do not create production surrogates, alternate carriers, compatibility aliases, duplicate mechanisms, persisted derived state, or page-private relationship caches merely to unblock an upper layer.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 5 - Query / Derived Foundation Completion**.

The current public checkpoint is `858a74f49d74ca61c875ad54d78f58b0202fbd07`. Gate 5 Slice A closed the structural Query gap found after Gate 4 by making effective Runtime indexes consumable through shared Query selectors.

The continued repository-grounded Gate 5 audit found a second concrete gap: Domain-defined derived facts do not yet have a Query owner. This gap is narrower than the full set of product words such as Progress, Health, Attention, or Home Focus. Only derived behavior whose semantics are already explicit in the authoritative Domain should be implemented at this stage.

The current implementation slice is **Canonical Derived Facts Foundation**. It introduces Query-owned derivation for the two currently precise reusable facts:

1. Initiative completion: an Initiative with no current Projects is not Completed; otherwise it is derived Completed only when every current Project is in Completed or Canceled Status category.
2. Current-scope activity start for Project, Milestone, and Initiative: the earliest `firstStartedAt` among Workflow Issues currently belonging to that scope.

The slice also removes a small duplicate Status interpretation in the existing Project-Issue ordering helper by reusing the canonical Domain `resolveTrailStatusDefinition` rule.

Derived selectors use the same readable Runtime snapshot boundary as structural Query, so pending plans affect derived reads while Runtime is ready and refresh/recovery falls back to committed facts and committed indexes together.

This slice deliberately does not invent formulas for Project/Milestone progress, actual work end, Health, Due Soon, Attention, Home Focus, or Activity Heatmap aggregation. Those require an explicit product/domain rule or a concrete consumer contract before implementation.

### 4.2 Current verified gaps

Gate 5 Slice A is remotely complete at `858a74f49d74ca61c875ad54d78f58b0202fbd07` with CI #71 passing.

The current verified Gate 5 gap is canonical derived-fact ownership. The Canonical Derived Facts Foundation delivery addresses the currently explicit Initiative completion and current-scope actual-start rules. It must pass focused repository tests, the full repository check, remote checkpoint verification, and then a renewed Gate 5 Exit Audit before Gate 5 can close.

After this slice, remaining page-specific filters/groups/sorts/search, Home composition, duplicate-detection helpers, and any richer analytics should be added only when their actual V1 consumer contract requires them. The absence of a speculative generic Query API is not itself a Gate 5 gap.

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
5. Query / Derived Foundation Completion   ACTIVE
   |
6. Application Foundation Completion
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

Complete. Required V1 state transitions produce complete legal logical plans before illegal optimistic state is admitted.

### 5.3 Gate 3 - Data / Persistence / Mutation

Complete. The current V1 logical-plan set has shared physical execution paths through the established carriers and Mutation architecture.

### 5.4 Gate 4 - Runtime / Index

Complete. Authoritative Runtime state, source ownership, pending projection, reconciliation, and required structural/reference indexes support downstream integrity and reads coherently.

### 5.5 Gate 5 - Query / Derived

Exit when known V1 consumers can use shared structural and explicitly defined derived read capabilities rather than reconstructing them inside pages.

### 5.6 Gate 6 - Application

Exit when required V1 business areas have thin use-case owners over the completed lower layers.

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

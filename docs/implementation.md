# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
fa48f2d940457e8b7ed93eca037ce395d20a4ed7
feat: add runtime structural indexes
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
- existing shared Query read/status/source-health helpers;
- Application/UI foundations for already implemented workflows;
- Diagnostics and architecture guards.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. Do not create production surrogates, alternate carriers, compatibility aliases, duplicate mechanisms, persisted derived state, or page-private relationship caches merely to unblock an upper layer.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 5 - Query / Derived Foundation Completion**.

The Gate 5 repository audit starts from `fa48f2d940457e8b7ed93eca037ce395d20a4ed7`.

Existing Query owners already provide effective/committed readable state selection, deterministic Project/Triage/Project-Issue ordering, Status option grouping, pending-state indication, and source-health selection. The first Gate 5 audit found one immediate shared-read gap: Query does not yet consume the Gate 4 effective structural indexes as a coherent readable snapshot, and several frozen relationships have no shared selector owner.

The first Gate 5 implementation slice is **Effective Structural Query Foundation**. It is implemented and locally verified on top of the remote `fa48f2d940457e8b7ed93eca037ce395d20a4ed7` Gate 4 checkpoint. It is pending commit, push, remote CI verification, and continuation of the repository-grounded Gate 5 audit from the resulting checkpoint.

The slice:

1. adds one readable Runtime snapshot boundary that selects pending-aware authoritative data plus indexes while Runtime is ready and falls back to the matching committed pair during refresh/recovery;
2. moves Project Issue membership narrowing from a full `issuesById` scan to the effective `issuesByProjectId` index while preserving established presentation ordering in Query;
3. exposes shared relationship selectors for Initiative -> Projects, Project -> Milestones, Milestone -> Issues, Cycle <-> Issues, and Current Cycle;
4. exposes shared Label and StatusDefinition reference selectors from effective Runtime indexes;
5. verifies optimistic Issue relationship/classification changes and Cycle changes update Query-visible relationships immediately without mutating committed truth;
6. verifies refresh mode falls back to one coherent committed authoritative/index snapshot rather than mixing committed entities with optimistic indexes.

Focused structural Query regressions, the full `npm run check`, and `git diff --check` pass locally for this slice. Gate 5 remains ACTIVE until this slice is committed, pushed, remotely verified, and the repository-grounded Query/derived audit continues from that public checkpoint.

This slice does not introduce a generic query language or move presentation/grouping policy into Runtime. It also does not invent formulas for Milestone Progress, Health, Due Soon, Attention, Home Focus, or other derived capabilities whose exact product semantics still need to be established from frozen design or later evidence.

### 4.2 Current verified gaps

The first verified Gate 5 gap was structural Query consumption of the Runtime foundation. The current locally verified Slice A closes that gap in the working tree. No second Gate 5 gap is declared by this checkpoint document before the slice has a public remote checkpoint.

After remote verification, the Gate 5 audit must continue from the new repository checkpoint across the remaining known V1 read requirements: exact Domain-defined derived facts, page-specific selection needs for Initiative/Cycle/Home, supported filter/group/sort/search dimensions, and duplicate-detection helper needs. New derived behavior must be based on explicit Domain/Product rules rather than convenient guessed formulas.

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

Exit when known V1 consumers can use shared structural and derived read capabilities rather than reconstructing them inside pages.

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

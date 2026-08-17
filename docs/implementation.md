# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
6b3a9200b33b86843f59dfe848f496081b5b5b10
feat: add configuration application boundary
```

This is the single execution baseline for the active Gate 7 construction sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 - Domain / Validation Completion, Gate 2 - Semantic Planning Completion, Gate 3 - Data / Persistence / Mutation Operational Completion, Gate 4 - Runtime / Index Foundation Completion, Gate 5 - Query / Derived Foundation Completion, and Gate 6 - Application Foundation Completion are complete foundations for the current stage.

Gate 5 closure evidence includes Effective Structural Query Foundation at `858a74f49d74ca61c875ad54d78f58b0202fbd07` with CI #71, Canonical Derived Facts Foundation at `7cd07b638add1a7e7364f89c2fcc69d7cb2ed095` with CI #72, and the final Query audit finding no remaining executable shared/derived gap before product-specific selectors are frozen.

Gate 6 closure evidence includes:

- Core Work Application Coverage at `df003d6d0152ed3f39cdee7fb7fdfd78a20c41d0` with CI #73;
- the missing Initiative-create semantic owner corrected in `domain/planning` instead of bypassed by Application;
- canonical Application facades for Triage, Initiative, Project, Milestone, Workflow Issue, and Cycle use cases;
- Configuration Application Boundary at `6b3a9200b33b86843f59dfe848f496081b5b5b10` with CI #74;
- Configuration reference repair remaining explicit through `NeedsInput` while Source Sync owns authoritative plugin-data settlement;
- the Gate 6 Exit Audit finding that Workspace-State editing and create-time similarity remain intentionally consumer-driven because their concrete product contracts are not yet frozen.

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

Reuse existing canonical owners and mature external primitives where they remove well-understood interaction risk instead of rebuilding them per page.

Current reusable capability areas include:

- Domain model, rules, validation, and semantic planning;
- Markdown schema/codecs and authoritative Persistence;
- shared Mutation materialization/execution and Source Sync;
- committed/effective Runtime, source ownership, reconciliation, and structural/reference indexes;
- shared structural and explicitly defined derived Query capabilities;
- complete currently executable Application use-case coverage;
- UI action-result handling, local date/time conversion, Runtime write gating, and feedback patterns;
- Diagnostics and architecture guards.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. UI must keep drafts/continuous interaction local and emit only Application intents for authoritative changes. Shared interaction mechanisms belong in `ui/interactions`, `ui/primitives`, `ui/patterns`, or the design-system layer rather than being rebuilt in each page/entity component.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 7 - Shared UI Capability Completion**.

The Gate 7 repository audit starts from `6b3a9200b33b86843f59dfe848f496081b5b5b10`. Current UI already has shared Application action runners, Runtime pending/source-health gating, feedback panels, and stable Triage/Workflow entity rows. The first concrete cross-workspace gap is overlay interaction: modal input and destructive confirmation behavior are still implemented as page/entity-local inline state, while future Peek and other V1 interactions require the same focus, keyboard, dismissal, and portal mechanics.

The first Gate 7 implementation slice is **Shared Overlay Interaction Foundation**. It:

1. adopts the unstyled Radix Primitives package as the accessible overlay mechanism rather than hand-building focus trapping, Escape behavior, portal placement, or AlertDialog semantics;
2. adds Trail-owned Dialog and AlertDialog wrappers under `ui/primitives`, keeping product styling separate from the external interaction engine;
3. moves Workflow Issue Estimate `NeedsInput` into the shared modal Dialog while keeping the draft local until submission;
4. moves Triage delete confirmation into the shared AlertDialog while retaining the existing Application action and error behavior;
5. verifies dialog roles, accessible names/descriptions, focus behavior, Escape dismissal, confirmation, and existing page-to-Application mappings;
6. keeps Peek, Context Menu, Command Menu, Selection, Bulk Actions, and product page composition out of this slice until their next concrete consumer/mechanism audit.

This is a mechanism slice, not a visual redesign. It continues to use Obsidian theme variables and existing Trail CSS while establishing one reusable overlay owner for later product work.

### 4.2 Current verified gaps

Gate 6 is remotely complete at `6b3a9200b33b86843f59dfe848f496081b5b5b10` with CI #74 passing.

The current verified Gate 7 gap is shared overlay behavior. Existing Workflow completion and Triage deletion already require modal input/confirmation semantics, while the Product contract also requires Peek later. Keeping those mechanics inline or page-local would duplicate focus/dismissal/accessibility behavior across the next workspaces.

After this slice is remotely verified, continue the Gate 7 audit over menu/command interaction, Selection/Bulk Actions, reusable entity inspection/editing, and the minimum presentation/design-system primitives actually required before Gate 8. Do not create generic interaction state machines without real consumers.

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
6. Application Foundation Completion       COMPLETE
   |
7. Shared UI Capability Completion         ACTIVE
   |
8. Product Workspace Implementation
   |
9. V1 Integration / Hardening
```

### 5.1 Gate 1 - Domain / Validation

Complete. The frozen V1 Domain model, shared rules, and Core Invariants have canonical implementation/test ownership.

### 5.2 Gate 2 - Semantic Planning

Complete. Required currently frozen V1 state transitions produce complete legal logical plans before illegal optimistic state is admitted.

### 5.3 Gate 3 - Data / Persistence / Mutation

Complete. The current V1 logical-plan set has shared physical execution paths through the established carriers and Mutation architecture.

### 5.4 Gate 4 - Runtime / Index

Complete. Authoritative Runtime state, source ownership, pending projection, reconciliation, and required structural/reference indexes support downstream integrity and reads coherently.

### 5.5 Gate 5 - Query / Derived

Complete. Known V1 consumers can use shared structural reads and currently explicit derived facts without page-private reconstruction; deferred presentation/query schemas remain consumer-driven.

### 5.6 Gate 6 - Application

Complete. Required currently executable V1 business areas have thin use-case owners over the completed lower layers, with no Application-owned persistence path or speculative facade for deferred contracts.

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
- prefer mature accessible interaction primitives over custom implementations when they fit Trail's ownership model;
- add enforceable architecture/test guards only when they protect a meaningful boundary;
- run one full `npm run check` at each coherent stable checkpoint;
- run `git diff --check` before checkpoint;
- use representative real Obsidian validation when a UI mechanism changes behavior that browser/jsdom tests cannot establish reliably in the host.

Gate completion is recorded only after repository-grounded audit plus passing implementation evidence. Product, Domain, Data, Architecture, and Design-to-Code Map change only when their corresponding project answers truly change.

## 7. Final State

V1 implementation is ready for final product hardening when the frozen project answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or page-private reconstructions; the dependency gates are complete; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the moving implementation baseline, active construction stage, current verified gaps, build order, gate completion state, and execution verification state.

# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current repository baseline for this implementation stage is:

```text
3d374ebab20b0120c879b215bacddf1cc64ffeaf
feat: add shared overlay interaction foundation
```

This is the single execution baseline for the active Gate 8 product-workspace sequence. Earlier repository states remain available through Git history and are not repeated here as secondary baselines.

Gate 1 - Domain / Validation Completion, Gate 2 - Semantic Planning Completion, Gate 3 - Data / Persistence / Mutation Operational Completion, Gate 4 - Runtime / Index Foundation Completion, Gate 5 - Query / Derived Foundation Completion, Gate 6 - Application Foundation Completion, and Gate 7 - Shared UI Capability Completion are complete foundations for the current stage.

Gate 5 closure evidence includes Effective Structural Query Foundation at `858a74f49d74ca61c875ad54d78f58b0202fbd07` with CI #71, Canonical Derived Facts Foundation at `7cd07b638add1a7e7364f89c2fcc69d7cb2ed095` with CI #72, and the final Query audit finding no remaining executable shared/derived gap before product-specific selectors are frozen.

Gate 6 closure evidence includes:

- Core Work Application Coverage at `df003d6d0152ed3f39cdee7fb7fdfd78a20c41d0` with CI #73;
- the missing Initiative-create semantic owner corrected in `domain/planning` instead of bypassed by Application;
- canonical Application facades for Triage, Initiative, Project, Milestone, Workflow Issue, and Cycle use cases;
- Configuration Application Boundary at `6b3a9200b33b86843f59dfe848f496081b5b5b10` with CI #74;
- Configuration reference repair remaining explicit through `NeedsInput` while Source Sync owns authoritative plugin-data settlement;
- the Gate 6 Exit Audit finding that Workspace-State editing and create-time similarity remain intentionally consumer-driven because their concrete product contracts are not yet frozen.

Gate 7 closure evidence includes:

- Shared Overlay Interaction Foundation at `3d374ebab20b0120c879b215bacddf1cc64ffeaf` with CI #75;
- Trail-owned Dialog and AlertDialog mechanics over Radix primitives, consumed by Workflow completion input and Triage deletion;
- shared Application action-result handling, local time conversion, Runtime write gating, feedback, and stable entity-row ownership remaining canonical;
- the Gate 7 Exit Audit passing with no justified pre-consumer Slice B. Context Menu, Peek, Selection, Bulk Actions, Command Menu, property pickers, and later presentation primitives remain consumer-driven Gate 8 work.

Current implementation facts in this document are expected to move as work advances; stable target answers remain in the upstream project documents.

## 2. Objective

Complete the frozen V1 design by composing coherent user-value workflows over the established foundations.

The implementation consumes the established project answers:

```text
product.md
-> domain.md
-> data.md
-> architecture.md
-> design-to-code-map.md
```

The active strategy is dependency-aware vertical implementation:

```text
established canonical foundations
-> coherent product workflow
-> consumer-driven shared mechanism where justified
-> focused verification
-> next workflow
```

A missing upper-layer feature must not cause a temporary lower-layer model, placeholder entity, compatibility path, fake default, or second mechanism. If product implementation exposes a concrete lower-layer omission, correct the canonical lower-layer owner before consuming it.

## 3. Reuse

Reuse existing canonical owners and mature external primitives where they remove well-understood interaction risk instead of rebuilding them per page.

Current reusable capability areas include:

- Domain model, rules, validation, and semantic planning;
- Markdown schema/codecs and authoritative Persistence;
- shared Mutation materialization/execution and Source Sync;
- committed/effective Runtime, source ownership, reconciliation, and structural/reference indexes;
- shared structural and explicitly defined derived Query capabilities;
- currently executable Application use cases;
- UI action-result handling, local date/time conversion, Runtime write gating, feedback patterns, and shared overlay mechanics;
- Diagnostics and architecture guards.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. UI must keep drafts/continuous interaction local and emit only Application intents for authoritative changes.

A shared UI owner is introduced when there is real reuse pressure, a sufficiently stable contract, and a clear reduction in duplicate mechanism. Existing consumer count is evidence, not a mechanical threshold. Similar-looking controls remain separate when their candidates, interaction rules, or Application mapping are materially different.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 8 - Product Workspace Implementation**.

The Gate 8 Entry Audit starts from `3d374ebab20b0120c879b215bacddf1cc64ffeaf`. Current Triage and Projects surfaces already exercise the authoritative Runtime -> Query -> UI -> Application -> Mutation/Source Sync path, but they remain functional skeletons rather than complete V1 workspaces.

Gate 8 is planned around user workflows rather than component inventories. Shared UI capabilities may continue to be added, but only when a real Product consumer freezes enough of the contract to justify a canonical shared owner.

The first Gate 8 implementation slice is **Project Lifecycle Closure**. It:

1. exposes the existing `ProjectApplication.changeStatus` use case through the UI action surface;
2. gives the active Project Workspace an explicit configured lifecycle Status control;
3. keeps Project completion legality in the existing Domain/Application owner, surfacing rejected completion through the existing UI action/error path rather than duplicating the rule in the page;
4. keeps terminal Projects readable while disabling new Workflow Issue creation until the user explicitly reopens the Project;
5. extracts configured StatusDefinition rendering into one shared Status picker used by both Project and Workflow Issue consumers, while each consumer retains its own mutation semantics and follow-up behavior;
6. verifies Project lifecycle action mapping, rejected completion feedback, terminal-project creation gating, existing Workflow Issue behavior, and the shared Status picker contract.

This slice does not add new Project lifecycle semantics, persistence mechanisms, host APIs, overlay behavior, or speculative Board/Peek/Context Menu infrastructure.

### 4.2 Current verified gaps

The Gate 8 Entry Audit found that current Product gaps split into three groups:

- Product composition gaps whose lower-layer owners already exist, including Project lifecycle, Milestones, Initiatives, Cycles, and richer workspace presentation;
- consumer-driven shared UI gaps such as Board interaction, Peek, Selection, Context Menu, and property pickers, which should be introduced only when a concrete workflow requires them;
- real lower-layer gaps that must be repaired at their canonical owners when reached, including general editing use cases for several entity properties and the current Triage Application narrowing that requires a Project even though Domain Accept permits project-less Workflow creation.

The project-less Triage Accept gap is not opened in the current slice because Trail does not yet provide a complete user-visible discovery/management loop for project-less Workflow work.

Product, Domain, Data, Architecture, and Design-to-Code Map remain unchanged unless implementation evidence exposes a contradiction in those authorities.

## 5. Build Order

Implementation proceeds through dependency-ordered gates. Within Gate 8, slices are ordered by user-value dependency rather than by component type.

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
7. Shared UI Capability Completion         COMPLETE
   |
8. Product Workspace Implementation        ACTIVE
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

Complete as a foundation gate. Gate 8 may still expose specific omitted or over-narrow use cases; those are repaired in Application or lower canonical owners rather than bypassed in UI.

### 5.7 Gate 7 - Shared UI capabilities

Complete. Shared mechanisms justified before Product Workspace implementation have canonical owners; remaining interaction/presentation capabilities are introduced from real Gate 8 consumers.

### 5.8 Gate 8 - Product workspaces

Active. Build coherent user workflows by composing the established foundations. Re-audit dependencies after each meaningful slice instead of pre-ordering Board, Peek, Context Menu, Selection, or other components as an infrastructure sequence.

### 5.9 Gate 9 - V1 hardening

Complete integration, recovery, performance, responsive behavior, diagnostics boundaries, regression evidence, and release readiness without redefining upstream semantics for implementation convenience.

## 6. Risk & Verification

For each active Gate 8 slice:

- verify the current repository and the concrete Product workflow before defining changes;
- reuse existing Query/Application/shared UI owners before adding another mechanism;
- repair exposed lower-layer gaps at the canonical owner instead of Page-local workarounds;
- run focused tests for changed owners and directly affected shared owners while iterating;
- run one full `npm run check` at the coherent stable checkpoint before commit;
- run `git diff --check` before checkpoint;
- use representative real Obsidian validation only when the slice changes host-specific, persistence, focus/portal, drag/pointer, keyboard, or other behavior that jsdom/pure tests cannot establish reliably.

Gate completion is recorded only after repository-grounded audit plus passing implementation evidence. Product, Domain, Data, Architecture, and Design-to-Code Map change only when their corresponding project answers truly change.

## 7. Final State

V1 implementation is ready for final product hardening when the frozen project answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or page-private reconstructions; the dependency gates are complete; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the moving implementation baseline, active construction stage, current verified gaps, build order, gate completion state, and execution verification state.

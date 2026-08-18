# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The repository baseline from which the current Gate 8 slice is being built is:

```text
12a438d538400d4f377d0183f72f172bfce42e5b
chore: fix validation notice indentation
```

This baseline includes the completed first Gate 8 product slice plus the quality-baseline cleanup that followed it. Earlier repository states remain available through Git history and are not repeated as competing execution baselines.

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

Gate 8 evidence now includes:

- **Project Lifecycle Closure** at `844728131f0a0acf7df4213322a7837c16b47dab`, exposing explicit Project lifecycle control while preserving Domain/Application ownership of completion legality and reusing one configured Status picker across Project and Workflow Issue consumers;
- Quality Baseline Hardening at `f84c6f10a4708cb11a85d1071a9dcf50c29b3603`, followed by the whitespace-only correction at `12a438d538400d4f377d0183f72f172bfce42e5b`;
- lint now fails on warnings through `eslint . --max-warnings=0`, Trail is registered as an allowed brand for sentence-case checks, and the validation-evidence tests no longer hardcode the real Obsidian config-directory name;
- the vulnerable dev-only transitive `nanoid` resolution is pinned by the lockfile at `3.3.18`; both lockfile and installed-tree `npm audit` reported zero vulnerabilities;
- the quality checkpoint passed 70/70 test files and 228/228 tests, TypeScript, production build, and `git diff --check`; the whitespace-only follow-up re-passed lint and `git diff --check`.

Push-triggered GitHub Actions status for the recent Gate 8 commits was not available through the connected GitHub workflow lookup, so this document does not invent CI run numbers for those commits.

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
- UI action-result handling, local date/time conversion, Runtime write gating, feedback patterns, shared Status selection, and shared overlay mechanics;
- Diagnostics and architecture guards.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. UI must keep drafts/continuous interaction local and emit only Application intents for authoritative changes.

A shared UI owner is introduced when there is real reuse pressure, a sufficiently stable contract, and a clear reduction in duplicate mechanism. Existing consumer count is evidence, not a mechanical threshold. Similar-looking controls remain separate when their candidates, interaction rules, or Application mapping are materially different.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 8 - Product Workspace Implementation**.

Gate 8 is planned around user workflows rather than component inventories. Shared UI capabilities may continue to be added, but only when a real Product consumer freezes enough of the contract to justify a canonical shared owner.

The first Gate 8 slice, **Project Lifecycle Closure**, is complete at `844728131f0a0acf7df4213322a7837c16b47dab`.

The active slice is **Initiative Focus & Project Assignment**. It implements the already-frozen Product drill-down:

```text
Projects Root
-> Initiative Focus
-> Project Workspace
```

The slice:

1. exposes existing `InitiativeApplication.create` and `ProjectApplication.changeInitiative` use cases through the UI action surface;
2. adds shared readable Query selectors for Initiative identity/navigation, Initiative Project membership ordering, and unassigned Projects;
3. turns Projects Root into an Initiative/Project distribution surface rather than a flat Project list;
4. adds Initiative Focus as the intermediate navigation level before Project Workspace;
5. adds an explicit Project Initiative selector, including returning a Project to the unassigned state, while leaving relationship legality in the existing Domain/Application path;
6. preserves the completed Project lifecycle and Workflow Issue execution behaviors inside Project Workspace;
7. extends diagnostics and focused UI/Query tests for the new Application intents and optimistic relationship projection.

This slice does not introduce a generic property-picker framework, Board mechanics, new Domain entities, new persistence carriers, or new host APIs. The Initiative selector remains local to the real Project relationship consumer until broader property-picker reuse pressure exists.

### 4.2 Current verified gaps

Current Product gaps split into three groups:

- Product composition gaps whose lower-layer owners already exist, including Milestones, Cycles, richer Project execution presentation, and later Home/View composition;
- consumer-driven shared UI gaps such as Board interaction, Peek, Selection, Context Menu, Command Menu, and broader property pickers, which should be introduced only when a concrete workflow requires them;
- real lower-layer gaps that must be repaired at their canonical owners when reached, including general editing use cases for several entity properties and the current Triage Application narrowing that requires a Project even though Domain Accept permits project-less Workflow creation.

The project-less Triage Accept gap remains deferred because the current Product contract does not yet freeze a complete discovery/management surface for project-less Workflow Issues. Trail should not invent a page merely to expose a lower-layer capability.

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

### 5.1 Gates 1-7

Complete. The frozen V1 Domain, semantic planning, persistence/mutation, Runtime/index, Query, Application, and justified pre-consumer shared UI foundations have canonical implementation/test ownership.

### 5.2 Gate 8 - Product workspaces

Active. Build coherent user workflows by composing the established foundations. Re-audit dependencies after each meaningful slice instead of pre-ordering Board, Peek, Context Menu, Selection, or other components as an infrastructure sequence.

Completed:

- Project Lifecycle Closure.

Active:

- Initiative Focus & Project Assignment.

### 5.3 Gate 9 - V1 hardening

Complete integration, recovery, performance, responsive behavior, diagnostics boundaries, regression evidence, and release readiness without redefining upstream semantics for implementation convenience.

## 6. Risk & Verification

For each active Gate 8 slice:

- verify the current repository and the concrete Product workflow before defining changes;
- reuse existing Query/Application/shared UI owners before adding another mechanism;
- repair exposed lower-layer gaps at the canonical owner instead of Page-local workarounds;
- run focused tests for changed owners and directly affected shared owners while iterating;
- run one full `npm run check` at the coherent stable checkpoint before commit;
- run `git diff --check` before checkpoint;
- keep `npm audit` clean when dependency state changes or a security advisory is encountered;
- use representative real Obsidian validation only when the slice changes host-specific, persistence, focus/portal, drag/pointer, keyboard, or other behavior that jsdom/pure tests cannot establish reliably.

Gate completion is recorded only after repository-grounded audit plus passing implementation evidence. Product, Domain, Data, Architecture, and Design-to-Code Map change only when their corresponding project answers truly change.

## 7. Final State

V1 implementation is ready for final product hardening when the frozen project answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or page-private reconstructions; the dependency gates are complete; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the active construction stage, execution baseline, current verified gaps, build order, gate completion state, and verification evidence.

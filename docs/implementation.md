# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The public documentation baseline for the completed V1 UI rebaseline is:

```text
8e14fa87473b09134e455383170cfe571c9aeb97
docs: add final ui blueprints
```

The latest published executable UI checkpoint before the rebaseline documentation pass is:

```text
da1a84f86a5d3a1e234335839f0fde1eff92e341
feat: checkpoint triage review and navigation
```

That code checkpoint is followed by documentation-only audit/rebaseline commits. Therefore **current code is intentionally behind the final UI target**.

The active construction gate remains **Product Workspace / V1 UI Implementation**, with the first formal product vertical still centered on Triage. Phase B is the last accepted Triage construction boundary; Phase C is **IN PROGRESS** and the current code must not be described as final Triage or final shared-interaction implementation.

## 2. Frozen Target vs Current Code

The target UI is now frozen through:

```text
docs/ui.md
-> docs/ui-blueprints.md
-> docs/design-to-code-map.md
```

Implementation should align to that target without reopening Page composition or shared interaction semantics merely because older components/tests use a different contract.

Current published alignment debt includes:

1. `TrailWorkspaceShell` requires a `locationBar`, and `TrailLocationBar` owns a global `<h1>` location presentation. Final target: Workspace Frame only; breadcrumb/title/actions are Page-owned, optionally sharing a Page Header pattern.
2. `TrailViewBarProps` requires `display`. Final target: composition-oriented Collection Controls with no globally required Display; Triage uses direct `Filter + Order`, Projects/Project/Cycle use only their accepted direct controls.
3. `TrailProgress` is the correct shared visual owner but needs unavailable plus normal/compact/micro density rather than entity-specific progress components.
4. shared Filter exists, but Selection/Action Registry/Bulk/Peek/transient interaction stack/Confirmation/standard Creation Composer are not yet complete shared production owners.
5. current navigation/history code predates the final Sidebar Search closure. Search must become temporary Left Sidebar state, not a Main View Page/location.
6. current partial Triage Review code predates the final Shared Interactions closure and must align its dismissal/focus/action/confirmation behavior without discarding already-valid Query/Application work.

These are implementation gaps, not design questions.

## 3. Established Foundations

The following lower layers are already established and should be consumed rather than re-modeled while aligning UI:

- Domain model, validation, lifecycle rules, and semantic planning;
- required Project ownership for Workflow Issues;
- required normal-ready Default Project reference and startup recovery path;
- Markdown schema/codecs and authoritative Persistence;
- Mutation Plans, physical materialization, Single/Source Transition/Integrity Batch execution, and global mutation ordering;
- committed/effective Runtime, optimistic projection, reconciliation, source ownership, indexes, control, and source health;
- Query ownership of derived projections, ordering, legal targets, temporal semantics, and capabilities;
- Application ownership of semantic use cases;
- fixed T-Shirt Estimate levels and configurable numeric weights;
- explicit Cycle Start/Close/Start-next semantics;
- canonical Project/Milestone/Cycle Progress semantics;
- modular stylesheet ownership and deterministic Obsidian stylesheet assembly;
- Visual Foundation and shared primitive/pattern work already accepted through real consumers.

Do not add page-local Domain legality, persistence shortcuts, alternate query languages, or temporary duplicate action systems while implementing the final UI.

## 4. Published UI Evidence

### 4.1 Reusable primitives and patterns

Published reusable UI currently includes, among other established owners:

- `TrailButton`;
- `TrailIconButton`;
- `TrailInput`;
- `TrailTextarea`;
- `TrailCheckbox`;
- `TrailProgress`;
- `TrailSeparator`;
- `TrailCollectionRow`;
- `TrailPropertyControl`;
- current `TrailViewBar` / layout switch mechanics;
- shared Priority semantic identity/selector;
- shared Label dots/selector;
- shared Due presentation/selector;
- shared collection Filter state/query helpers/popover presentation;
- current Workspace shell/location carrier;
- modular Trail tokens and Obsidian host-variable mapping.

Existing owners remain useful evidence when their mechanical responsibility still matches the frozen target. Do not preserve a stale API solely because it already has tests.

### 4.2 Triage Phase A/B evidence

The important accepted checkpoints include:

```text
4bc2bb7eb30e3f67039c8d2145c0fe0f6c25ce20  feat: add priority semantic selection
20f5283693721bd636aebbec57da4885ff80c3c8  feat: add triage scanning foundation
27afda30ab594fcd24bcfa38ba5b6a9aefef276f  refactor: align triage creation semantics
fcf9de7f80339a4817432cb8ca88f6b5408152f5  docs: define triage vertical implementation plan
83a57631560f6f876f30d80d81fbcc01e3861f55  feat: add production triage queue
1580e41c10846fe3c6e09893024e94953fe4f123  feat: add triage queue controls
```

Accepted/query-backed evidence includes:

- canonical Triage ordering: Review Due ascending -> Priority -> stable identity;
- canonical Review Set derivation: seven-day horizon then fill to at least ten while retaining all horizon entries;
- production `TrailTriageRow` over `TrailCollectionRow` + selection gutter + shared Priority identity;
- compact Label dots and Due presentation;
- shared Filter grammar with Triage registry Due/Priority/Labels;
- real wide/narrow Obsidian evidence for Queue density, Filter interaction, label identity, and responsive control-row mechanics;
- normal creation planning where Triage Accept creates a new standard Issue/Project identity and automatically seeds only title/body.

The old Phase B `Display` presentation is **evidence for a responsive control-row mechanic only**. It is not final Triage semantics; the final target uses direct `Order: Review due | Priority` and removes required Display from the shared pattern.

### 4.3 Partial Phase C evidence

Executable checkpoint:

```text
da1a84f86a5d3a1e234335839f0fde1eff92e341
feat: checkpoint triage review and navigation
```

It adds useful but not yet accepted-as-final evidence:

- non-modal Triage Review over the real Queue;
- Title/Description editing and shared Priority/Label/Due edit controls;
- Defer/Delete wiring through existing UI-action/Application boundaries;
- current serialized draft-save/disposition behavior;
- Defer as same-identity +7 calendar days;
- Delete through normal Triage delete intent;
- visible-order successor selection after successful disposition;
- wide Queue+Review and narrow focused-Review composition;
- Obsidian host View State integration for top-level Page Back/Forward.

The final design now gives Phase C a clearer correction target:

- Review is page-local and never a host-history node;
- uncommitted text is discarded on identity/Page leave rather than implicitly saved by navigation;
- Accept/Defer/Delete use the frozen post-success slot/re-query progression;
- Triage Delete consumes the shared Confirmation mechanics;
- Menu/Picker/Confirmation/Review must obey top-layer Esc/focus ownership;
- shared Action Registry/context resolution should replace page-local action duplication when the real consumer is introduced.

## 5. Active Implementation Strategy

Implement through coherent product verticals over established foundations:

```text
frozen Product/UI target
-> choose one coherent vertical
-> introduce only the shared owner that the vertical now proves it needs
-> consume that owner immediately in the real vertical
-> validate owner + direct consumers
-> verify host behavior only where automated evidence is insufficient
-> publish a stable checkpoint
-> continue until the vertical exit criteria are satisfied
```

Do **not** return to a speculative layer-first program such as “build every generic pattern before any Page.” Shared owners mature just in time from real product demand.

The dependency rule remains strict: a Page must not bypass an unresolved canonical Domain/Query/Application owner merely to make UI implementation convenient.

## 6. Immediate Plan

### Phase C — finish Triage Review alignment

Goal: make the existing Triage vertical conform to the frozen Triage + Shared Interactions contract without reopening product design.

Required work:

1. replace generic Triage Display with direct Order while preserving proven Filter/control-row mechanics;
2. align Review draft lifecycle with explicit commit/discard behavior and no navigation-as-save;
3. align Accept/Defer/Delete progression to the current visible/ordered projection rule;
4. consume shared Confirmation for destructive Delete;
5. make nested Picker/Menu/Confirmation Esc/focus behavior obey the transient-stack contract;
6. remove/rewrite stale shell/history assumptions that directly block Triage's final Page-owned composition;
7. validate Query/Application semantics through focused tests and run representative Obsidian host checks only for Review layout/focus/history behaviors that require the host.

Exit: Triage Queue + Review + creation/disposition interactions match `docs/ui.md`/blueprint and no Triage-specific duplicate action/filter/confirmation mechanism remains.

### Shared interaction owners — introduce from real consumers

After/while Phase C proves the need, mature these shared owners through concrete Page consumers:

- Selection state + Bulk Bar integration;
- Action Registry/context resolution;
- Context Menu/overflow adapters;
- transient interaction stack;
- shared Confirmation;
- read-only Workflow Issue Peek;
- Picker-family common mechanics where existing property controls can actually share them;
- standard Creation Composer infrastructure.

Do not create empty frameworks with no production consumer.

### Projects vertical

Implement in dependency order:

1. Projects Root + Project Summary Row + Group Header + final Collection Controls;
2. Initiative Focus using the same Project collection owner;
3. Project Workspace List with persistent Status skeleton and final ordinary Issue ordering;
4. Project Inspector Progress/Attention/Milestones;
5. Project Board;
6. Projects Timeline;
7. Project deletion/settings integration where not already exposed.

### Cycle vertical

Reuse the Project/Issue collection owners:

- Current Cycle List/Board;
- Project swimlanes;
- Add/Remove membership and Add Issues;
- Start/Close/Close-and-start-next;
- Cycle Inspector;
- Historical Cycle flat List.

No parallel Issue model, Board engine, Filter grammar, or snapshot subsystem.

### Home / Full Item / remaining surfaces

After core collection/entity owners are mature:

- Home fixed modules and routing;
- Issue Full Item + Issue Inspector;
- Sidebar Search;
- Initiative Inspector;
- final Default Project Settings presentation;
- final runtime/Data-Issue feedback placement and full-shell visual calibration.

## 7. Validation Policy

Use repository-native checks according to actual impact rather than ritual file count.

### Documentation-only

Level 1 only:

```text
git diff --check
+ any real docs-specific validator if one exists
```

Do not run source lint/test/typecheck/build for pure Markdown by default.

### Local UI/query/application changes

Run Level 1 plus focused owner/direct-consumer tests. Add typecheck/build only when the changed contracts affect compilation/bundling. Use real Obsidian only for host behavior that jsdom/pure tests cannot establish.

### Shared contracts / schema / Domain / tooling / broad refactor

Escalate to repository-wide `npm run check` when the consumer graph is cross-cutting, uncertain, or the change is a formal release/checkpoint boundary that requires it.

## 8. Publication Rule

GitHub `main` is the durable checkpoint.

For each implementation round:

1. work from the verified public baseline;
2. maintain the explicit intended path manifest;
3. deliver exact validated final bytes to the local checkout;
4. stage only the intended manifest;
5. run staged `git diff --check` and inspect staged name/status + stat;
6. commit and push separately from mutation/validation;
7. re-read GitHub and verify the resulting remote commit before declaring the round complete.

Do not use `git add -A` when paths are known. If commit succeeds but push fails, push the existing commit rather than recreating it. If push succeeds but local verification fails, re-read GitHub before attempting another push.

## 9. Completion Definition

V1 UI implementation is complete when:

- implemented Pages match frozen `docs/ui.md` behavior and `docs/ui-blueprints.md` composition;
- shared owners have real production consumers and no Page-specific workflow leaks into them;
- current known stale `LocationBar`/required-`display` contracts are removed or refactored;
- Sidebar Search is shell state rather than a Page;
- Selection/Action/Peek/Composer/Confirmation ownership is shared where frozen;
- Query/Application/Domain remain the single source of legality and derived facts;
- responsive and host-specific behavior is calibrated in real Obsidian;
- full-shell visual presentation is coherent across Trail and relevant native host surfaces;
- the final coherent checkpoint passes the appropriate repository/release validation gate and is verified on GitHub.

Historical implementation details remain available in Git history. This document should stay a current execution snapshot rather than accumulating another permanent chronological archive.

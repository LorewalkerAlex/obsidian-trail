# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The last published pre-Phase-A code baseline is:

```text
27afda30ab594fcd24bcfa38ba5b6a9aefef276f
refactor: align triage creation semantics
```

The Phase A implementation plan was then published at:

```text
fcf9de7f80339a4817432cb8ca88f6b5408152f5
docs: define triage vertical implementation plan
```

Phase A is now the implemented and host-verified construction boundary. This document ships with that implementation checkpoint, so the resulting checkpoint SHA is intentionally taken from Git history rather than self-recorded here.

The active Runtime/Product UI is still incomplete, but it is no longer Foundation-only. `TrailApp` now dispatches the real `triage` location to `TrailTriagePage` through the shared workspace shell, while unimplemented product locations are not fabricated and the canonical initial location remains `home`. The next implementation boundary is Phase B of the same Triage vertical.

### 1.1 Current published UI and Triage checkpoints

The most relevant prior checkpoints are:

- `4bc2bb7eb30e3f67039c8d2145c0fe0f6c25ce20` - `feat: add priority semantic selection`;
- `20f5283693721bd636aebbec57da4885ff80c3c8` - `feat: add triage scanning foundation`;
- `27afda30ab594fcd24bcfa38ba5b6a9aefef276f` - `refactor: align triage creation semantics`;
- `fcf9de7f80339a4817432cb8ca88f6b5408152f5` - `docs: define triage vertical implementation plan`.

The Priority checkpoint establishes one production Priority identity plus one production Priority property selector over the existing `TrailPropertyControl` pattern.

The Triage scanning checkpoint establishes:

- Query-owned default Triage ordering: Review Due ascending, then canonical Priority order, then stable identity;
- Query-owned Review Set: all entries due within seven local calendar days, then earliest remaining entries until at least ten are included, while retaining all entries already inside the horizon when that count exceeds ten;
- production `TrailTriageRow`, composed from `TrailCollectionRow`, `TrailCheckbox`, and the shared Priority identity;
- a dedicated selection gutter independent from semantic Priority leading content;
- host-calibrated compact row density, selection behavior, title truncation, Priority placement, and Review Due placement.

The creation-semantics checkpoint establishes:

- canonical draft-based Workflow Issue creation semantics;
- canonical draft-based Project creation semantics;
- Triage create/edit inputs that can carry Title, Description, Priority, Labels, and Review Due;
- Triage Accept-to-Issue and Accept-to-Project planning that consumes explicit standard target drafts;
- title/body as the only automatic Triage-to-target seed;
- no automatic copy of Triage Priority, Labels, Review Due, or Estimate into the accepted target;
- one logical destination-first Accept mutation: create target, then delete source.

Phase A adds the first formal product consumer over those foundations:

- production Triage navigation through the existing host activation/navigation graph;
- shared `TrailWorkspaceShell` / `TrailLocationBar` composition without fabricating unimplemented product pages;
- formal `TrailTriagePage` reading effective Runtime state through Query and rendering the whole active Triage collection in canonical order;
- global Review Set count and boundary presentation without persisted membership/rank;
- one shared read-only `TrailDueDate` presentation owner consumed directly by the real Queue;
- a checked-in 12-entry Triage fixture that proves the real Markdown -> Persistence -> Runtime -> Query -> Page -> Row path;
- real wide/narrow Obsidian evidence for row density, Priority identity, title truncation, stable Due placement, and the Review Set boundary;
- a real non-Foundation consumer for `TrailTriageRow` and the dense-row/content contract of `TrailCollectionRow`, without claiming Selection/Action acceptance.

These Phase A facts do not claim that the complete Triage product page or interaction workflow exists.

### 1.2 Established foundations that remain authoritative

The following lower layers are already established and should be consumed rather than re-modeled for Triage:

- Domain model, validation, lifecycle rules, and semantic planning;
- current Markdown schema/codecs and authoritative Persistence;
- Mutation Plans, materialization, Single/Source Transition/Integrity Batch execution, and global mutation ordering;
- committed/effective Runtime, optimistic projection, reconciliation, source ownership, indexes, control, and source health;
- Query ownership of derived read projections, ordering, legal targets, temporal semantics, and capabilities;
- Application ownership of semantic use cases and normalized mutation intent;
- Required Workflow Project and required Default Project lower-layer contracts;
- fixed T-Shirt Estimate vocabulary and configurable numeric weight mapping;
- explicit Cycle Start/Close/Start-next semantics;
- canonical Milestone Progress semantics;
- UI Reset, frontend architecture/Foundation consolidation, Visual Foundation, and the accepted Core Primitive Kit;
- modular stylesheet ownership and deterministic Obsidian stylesheet assembly.

Historical implementation evidence remains available in Git history and previous versions of this document. The active `implementation.md` is not required to duplicate every obsolete checkpoint narrative. It owns current construction state, current execution answers, current risks, and the active plan.

## 2. Objective

Complete the frozen V1 product through coherent product verticals over the established foundations.

The immediate objective is to complete one full **Triage vertical** as the first formal product page. Triage is deliberately implemented through several publishable slices rather than one oversized change, but every slice must converge on the same frozen Triage page and must not introduce temporary page-local mechanisms that are expected to be replaced later.

The active UI implementation strategy is now:

```text
established foundations
-> choose one coherent product vertical
-> introduce only the shared capability that the vertical now proves it needs
-> consume that capability immediately in the real vertical
-> verify the real consumer graph
-> publish a stable checkpoint
-> continue the same vertical until its closure definition is satisfied
-> move to the next vertical
```

This replaces a strict layer-by-layer interpretation such as:

```text
finish every Pattern
-> finish every Semantic Component
-> finish every Interaction
-> only then build Pages
```

That strict sequence was useful while the active UI had no stable foundation, but it would now encourage speculative abstractions without real product constraints.

The dependency rule remains: a dependent behavior does not bypass an unresolved owner. The difference is that shared owners are now matured just in time from real product demand rather than from an exhaustive primitive/framework checklist.

## 3. Reuse

### 3.1 Reuse rules

Use the following ownership defaults while implementing product verticals:

| Kind of responsibility | Default ownership | Reuse rule |
| --- | --- | --- |
| Domain concept identity | shared semantic owner | one visual/interaction identity for the same Domain concept across surfaces |
| Generic interaction mechanic | shared pattern/interaction owner | one selection, filter, menu, composer-shell, or keyboard mechanism where the underlying responsibility is the same |
| Product workflow composition | feature/page owner | keep Triage review flow, Project Workspace composition, Cycle composition, and similar workflows local to their product owner |
| Canonical facts and legality | Domain / Query / Application | UI never duplicates lifecycle, target-legality, ordering, or mutation rules merely for convenience |
| Host mechanics | Obsidian/browser/mature focused dependency | reuse mature mechanics before creating a Trail-specific engine |

A second consumer is a strong signal to extract a shared interaction contract when ownership was not already obvious. A canonical Domain concept such as Priority does not need to wait for a second consumer to have one shared identity.

Do not create a universal component merely because two surfaces both contain controls. Prefer small shared capabilities plus feature-owned composition.

### 3.2 Current reusable UI capabilities

Current production UI owners that Triage should consume include:

- `TrailButton`, `TrailIconButton`, `TrailInput`, `TrailTextarea`, `TrailProgress`, `TrailSeparator`, and `TrailCheckbox`;
- `TrailViewBar`, `TrailViewBarAction`, and `TrailViewLayoutSwitch`;
- `TrailCollectionRow`;
- `TrailPropertyControl`;
- `TrailPriorityGlyph` and `TrailPriorityPropertySelect`;
- `TrailTriageRow`;
- shared read-only `TrailDueDate`;
- `TrailWorkspaceShell` and `TrailLocationBar`;
- formal `TrailTriagePage`;
- shared Trail design tokens, Obsidian semantic-variable mapping, and modular stylesheet ownership;
- existing shell navigation-state store and normal `TrailLocation` identity;
- existing Runtime/Query/Application boundaries below UI.

`TrailCollectionRow` now has a formal non-Foundation runtime consumer through `TrailTriagePage -> TrailTriageRow`. Phase A wide/narrow host evidence accepts its dense-row/content composition under frontend Rule 9 only; the selection-gutter interaction remains pending until the shared Selection owner is consumed in Phase E.

`TrailViewBar` and `TrailPropertyControl` remain production candidates whose relevant real-page contracts are not yet accepted by Phase A. `TrailTriageRow`, `TrailDueDate`, and the shared shell carrier now have real product composition evidence.

### 3.3 Triage ownership map

| Capability | Canonical owner | Triage responsibility |
| --- | --- | --- |
| Triage entity facts | Domain/Data | consume only |
| default queue ordering | `query/triage` | consume projection |
| Review Set | `query/triage` | present summary/boundary only |
| Queue/Review composition | `ui/pages/triage` | own |
| active review entry and sequential progression | `ui/pages/triage` session state | own; never persist |
| dense Triage scanning row | `ui/entities/trail-triage-row` | consume/reuse |
| Priority identity/edit control | shared semantic UI | consume/reuse |
| Label identity/edit control | shared semantic UI | introduce when Triage becomes its first real V1 consumer, then reuse elsewhere |
| Due/date presentation | shared temporal/semantic UI | `TrailDueDate` is established as the shared read-only owner and consumed by the real Queue |
| Due/date editing control | shared temporal/semantic UI | introduce only when editing requires it; do not replace the shared read-only owner with page-local formatting or a separate Snooze mechanic |
| collection View Bar | shared pattern | consume/reuse |
| Filter grammar and session state | shared Query/UI interaction | Triage supplies only `Due / Priority / Labels` registry |
| Selection and Action Registry | shared UI interaction | Triage supplies legal action subset and target context only |
| Composer shell/title/body/property mechanics | shared creation UI | consume/reuse |
| Issue Composer | Workflow Issue UI + `application/issues` | Accept invokes the standard flow |
| Project Composer | Project UI + `application/projects` | Accept invokes the standard flow |
| Triage Composer | Triage UI + `application/triage` | own field registry/defaults over shared Composer infrastructure |
| mutations | Application/Domain | emit semantic intents only |
| physical persistence/convergence | Source Sync/Mutation/Persistence/Runtime | consume only |

Foundation Lab remains a development/calibration consumer. It may display production components, but it must not own Triage navigation, queue state, review state, Accept behavior, mutation behavior, or other product workflow.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 8 - Product Workspace / V1 UI Implementation**.

The active implementation focus is now **Triage vertical closure**.

The formal target behavior is already frozen in `docs/ui.md`, and the target ownership is already mapped in `docs/design-to-code-map.md`. The remaining work is implementation, verification, and calibration through the canonical owners.

Current Phase A code facts are:

- `TrailLocation` includes `triage`, while the canonical initial location remains `home`;
- `TrailNavigation` exposes the one currently real product entry, Triage, and does not fabricate Home/Projects/Cycles pages or actions that are not implemented;
- `TrailApp` observes `TrailNavigationStore.location` and dispatches `triage` to the formal page through `TrailWorkspaceShell` / `TrailLocationBar`; non-Triage locations still show the explicitly named Foundation Lab rather than masquerading as product pages;
- `plugin/src/ui/pages/triage` is the formal Triage page owner;
- `Trail/Collections/Triage.md` carries a 12-entry real Vault fixture that exercises canonical ordering, Review Set top-up/boundary, Priority variation, future-due browsing, and narrow-title truncation;
- Query ordering and Review Set are consumed directly by the page; the page does not sort/recompute against Markdown or committed maps itself;
- `TrailTriageRow` now has a formal page consumer and composes `TrailCollectionRow` without exposing selection or row actions in Phase A;
- shared `TrailDueDate` owns read-only date presentation and is consumed by the real Triage Queue;
- Priority identity/selection remains shared, but Phase A consumes only the read-only Priority identity;
- standard Issue/Project draft creation and Triage Accept semantics remain implemented below UI;
- Label presentation/control, Due editing control, shared View Bar/Filter interaction, shared Selection/Action interaction, shared Creation Composer UI, and the Triage Review Surface remain ahead.

No page may paper over these gaps with hard-coded records, fake navigation, Lab-only data, one-off filter state, one-off Accept forms, or page-private semantic legality.

### 4.2 Completed Triage prerequisites

#### 4.2.1 Scanning foundation

The published scanning foundation is considered complete as a lower-level prerequisite:

- `selectTrailReadableTriageIssueIds` owns default ordering;
- `selectTrailTriageReviewSet` owns Review Set derivation;
- `addTrailCalendarDays` remains the temporal owner for calendar-day horizon behavior across DST boundaries;
- `TrailTriageRow` owns the Triage-specific compact row composition while reusing generic row/checkbox/Priority contracts;
- row selection and responsive truncation have representative real-Obsidian calibration evidence.

This prerequisite alone did **not** mark Triage product composition complete or satisfy Rule 9 for CollectionRow. Phase A now supplies the missing formal runtime consumer and wide/narrow host evidence for CollectionRow's dense-row/content contract only; selection-gutter interaction acceptance remains pending until Phase E.

#### 4.2.2 Standard creation and Accept semantics

The published creation-semantics checkpoint is considered complete as a lower-level prerequisite:

- standard Workflow Issue creation consumes an explicit draft and creates Backlog work in one explicit legal Project;
- standard Project creation consumes an explicit draft and applies ordinary Project creation defaults;
- Triage Accept-to-Issue and Accept-to-Project consume the same standard target semantics rather than copying the source record into a parallel target model;
- only Title and Description are automatically seeded from Triage;
- Priority, Labels, Review Due, and Estimate are not implicitly transferred;
- cancel-before-submit must leave the Triage source unchanged;
- successful Accept remains one destination-first logical mutation that creates the target and removes the source.

The UI Composer remains unimplemented. The completed lower-layer semantics are the target UI's submit boundary, not a substitute for the shared Composer interaction.

### 4.3 Triage vertical implementation plan

The phases below are implementation checkpoints, not separate product designs. Later phases must extend the same formal Triage page and shared owners established earlier.

#### Phase A - Production Triage page and real Queue - COMPLETE

Goal: create the first non-Foundation product page and close the real read consumer graph.

Deliverables:

- introduce `ui/pages/triage` as the formal Triage page owner;
- make `TrailApp` observe `TrailNavigationStore.location` and dispatch the Triage location to the formal page rather than always mounting Foundation Lab;
- replace calibration-only Triage navigation with the frozen production Triage navigation entry while keeping Foundation Lab outside the product workflow;
- introduce the minimum shared Location Bar/page carrier required by the formal page instead of embedding page-private shell chrome;
- read effective Runtime state through Query; do not read Markdown directly from UI;
- render the entire active Triage collection in Query order through production `TrailTriageRow`;
- present the global Review Set count/boundary without persisting membership or rank;
- introduce the minimum shared read-only Due/date presentation needed by the real Queue and consume it directly; do not add a page-local formatter, picker, or editing mechanism;
- do not expose product selection controls yet unless the shared Selection owner is introduced in this phase; a page-local checkbox state that will later be replaced is not an acceptable shortcut;
- do not expose a fake Review action or fake Accept/Defer/Delete controls before those flows exist;
- add the smallest checked-in real Vault Triage fixture needed to prove `Markdown -> Persistence -> Runtime -> Query -> TriagePage -> TriageRow` in Obsidian; the exhaustive scenario fixture remains Phase F.

Phase A exit criteria:

- formal Triage navigation reaches a real Triage page in the primary Trail leaf;
- queue content comes from the authoritative Triage carrier through Runtime/Query;
- default ordering and Review Set summary match Query tests;
- no Lab fixture is involved in the product path;
- wide/narrow host validation proves row density, Priority identity, title truncation, and stable Review Due placement in the real page;
- `TrailTriageRow` and `TrailCollectionRow` have a real non-Foundation runtime consumer. CollectionRow's dense-row/content contract is accepted under Rule 9 from this host evidence; the selection-gutter interaction remains pending until the shared Selection owner is consumed in Phase E.

Phase A is complete. Local validation passed ESLint, 105 Vitest files / 358 tests, TypeScript, production esbuild, and `git diff --check`. Real Obsidian validation passed at normal and narrow pane widths with the authoritative 12-entry fixture, including Review Set top-up/boundary, Priority tie-break, title truncation, and stable shared Due presentation. No selection, Review, Accept, Defer, Delete, Composer, View Bar, or Filter interaction was introduced.

#### Phase B - Queue completion, shared Label presentation, Filter, and Display

Goal: finish Triage as a complete scanning/browsing collection and mature only the shared semantic/query capabilities that the real Queue now needs.

Deliverables:

- introduce one shared Label presentation identity from canonical Label definitions; do not add persisted color facts solely for presentation;
- keep `TrailDueDate` as the shared read-only Due presentation owner; refine its compact presentation only if real Phase B row metadata requires it, without string-padding hacks or a page-local formatter;
- keep Due editing/picker behavior out of Phase B unless an actual Phase B interaction requires it; Review editing remains Phase C;
- move any remaining Triage-only Review Due geometry that is actually shared temporal identity to the shared Due owner rather than duplicating it;
- keep Priority size/identity changes at the shared Priority owner so Triage does not fork the glyph;
- make `TrailTriageRow` consume real Label plus the existing shared Due presentation rather than Lab-provided semantic fixtures once the Label owner exists;
- consume production `TrailViewBar` on the Triage page with no layout switch;
- implement the single shared Filter grammar/session model needed by the page;
- Triage registers only `Due`, `Priority`, and `Labels`;
- Filter changes visible rows only and never recomputes the global Review Set against the filtered subset;
- when Filter is active, do not display the global Review Set boundary as though it were a filtered-list boundary;
- implement Triage's constrained Display ordering choices through Query-owned projections; no persisted/manual rank and no generic sort-builder abstraction.

Phase B exit criteria:

- Label presentation has one shared owner and the existing shared Due presentation remains the single read-only owner consumed by the real Triage page;
- View Bar has a real non-Foundation collection consumer and can be accepted if its real-page geometry/interaction remains valid;
- Filter semantics have focused Query tests plus shared UI interaction tests;
- the Queue can browse/filter/order all active Triage entries without changing canonical facts or Review Set membership;
- wide/narrow Obsidian validation proves View Bar reflow, row metadata reduction, Label/Due readability, and no content overlap.

#### Phase C - Review Surface, editing, Defer, and Delete

Goal: make Triage usable as a sequential review workflow without Accept yet.

Deliverables:

- add page-local active-review state keyed by stable Triage identity;
- opening a Queue row enters the Triage Review Surface rather than Workflow Issue Full Item or the persistent Inspector;
- wide panes compose Queue + Review inside the Main View;
- when the composition becomes unusably narrow, Review becomes the focused Main View surface while preserving queue context, position, previous/next navigation, and a path back to the full Queue;
- expose Title, Description, Priority, Labels, and Review Due through shared semantic/editor controls;
- local UI draft state stays local to the editing surface; committed facts still change only through `application/triage`;
- Defer changes Review Due on the same Triage identity and uses the canonical calendar-day temporal rule for the high-frequency `+7 days` action;
- alternate Defer dates, when exposed, use the same Due/date control rather than a separate Snooze mechanism;
- Delete uses the normal Triage delete Application intent;
- after successful Defer or Delete, select the next entry from the current visible/ordered queue when one exists;
- failed mutation preserves/reconciles through existing Runtime optimism/recovery instead of page-private rollback state.

Phase C exit criteria:

- Queue -> Review -> previous/next is continuous and identity-stable;
- Title/body/property edits persist and survive authoritative refresh/reload;
- Defer never creates a new lifecycle state and does not remove future-due entries from the collection;
- Delete removes only the intended source entry;
- sequential progression follows the current visible ordering after successful disposition;
- responsive Queue/Review behavior is validated in real Obsidian.

#### Phase D - Shared Creation Composer and complete Accept

Goal: finish Triage creation/formalization while establishing reusable Creation UI for later product verticals.

Deliverables:

- introduce one shared Creation Composer shell and shared title/body/property/footer/focus mechanics;
- do not create a Draft Domain entity or draft persistence;
- implement standard Workflow Issue Composer UI over the already-published Issue draft Application contract;
- implement standard Project Composer UI over the already-published Project draft Application contract;
- implement standard Triage Composer UI over the Triage create Application contract;
- Triage creation uses the canonical temporal default for Review Due and exposes only legal Triage properties;
- Accept progressively discloses `Issue` and `Project` target kinds inside the Review Surface;
- Accept-to-Issue opens the standard Issue Composer with source Title/Description seeded, requires one explicit legal Project, and lets the user explicitly choose ordinary target properties;
- Accept-to-Project opens the standard Project Composer with source Title/Description seeded and ordinary Project defaults/capabilities;
- Triage Priority, Labels, Review Due, and Estimate are not automatically copied;
- opening/canceling a target Composer performs no mutation;
- successful target submission uses the existing Triage Accept draft Application intent so target creation and source removal remain one destination-first semantic operation;
- successful Accept advances to the next visible/ordered Triage entry when one exists;
- Triage Create, Accept Issue, and Accept Project reuse the same Composer infrastructure rather than creating page-specific forms.

Phase D exit criteria:

- ordinary Triage creation works through the shared Composer and authoritative persistence;
- Accept Issue and Accept Project both work end to end;
- cancel leaves the source unchanged;
- target properties reflect explicit Composer choices rather than source copying;
- Issue Project legality and ordinary Project defaults remain owned by Query/Application/Domain;
- Composer focus/portal/responsive behavior is validated in real Obsidian.

#### Phase E - Shared Selection/Actions, keyboard, context surfaces, and interaction closure

Goal: close the shared high-frequency interaction grammar that Triage proves in a real product page.

Deliverables:

- introduce one shared transient Selection owner with the lifetime/scope required by formal collections;
- keep the existing dedicated selection gutter and semantic leading content independent;
- introduce one shared Action Registry consumed by the Triage row/context/overflow/keyboard surfaces;
- use ordinary Query/Application capabilities as the legality source; no Triage-specific duplicate action model;
- implement only justified Triage Bulk actions/targets where every selected entry has one common legal action and target;
- integrate Context Menu, overflow, and keyboard dispatch through the same action IDs rather than parallel handlers;
- calibrate pointer, keyboard, focus restoration, Escape/back behavior, row activation, checkbox isolation, and previous/next review navigation;
- finalize Triage-specific responsive reduction while keeping visual-only responsiveness in CSS/container behavior wherever possible.

Phase E exit criteria:

- row selection, review activation, context actions, keyboard actions, and Bulk behavior resolve the same semantic action owners;
- no duplicate page-local command/menu model exists;
- keyboard/focus behavior is representative-host green;
- narrow/wide page behavior preserves product function rather than merely hiding overflow.

#### Phase F - Representative Vault fixture, integrated E2E, documentation closure

Goal: prove the complete Triage vertical through the real Obsidian/Vault path and close its implementation status.

Expand checked-in development Triage data to cover representative combinations such as:

- overdue, today, within seven days, just beyond seven days, and far-future Review Due;
- same Review Due with different Priorities;
- same Review Due and Priority requiring stable fallback;
- Urgent, High, Medium, Low, and no Priority;
- no Label, one Label, and multiple Labels;
- short and long titles;
- absent/short/long descriptions;
- enough entries to exceed one viewport;
- Review Set fill-to-ten behavior;
- more than ten entries already inside the seven-day horizon.

Run integrated host verification over:

```text
Navigation
-> Triage Queue
-> default ordering / Review Set
-> Filter / Display
-> selection / context / keyboard
-> Review
-> edit Title / Description / Priority / Labels / Review Due
-> Defer
-> sequential next entry
-> Delete
-> Create Triage
-> Accept Issue -> cancel
-> Accept Issue -> success
-> Accept Project -> success
-> wide/narrow pane behavior
-> authoritative Markdown result
-> reload / refresh convergence
```

Phase F exit criteria are the Triage closure definition in Section 4.4.

### 4.4 Complete Triage vertical closure definition

Triage is marked **implemented** only when all of the following are true:

- [ ] production Navigation reaches the formal Triage page;
- [ ] the page reads authoritative/effective Triage facts through Runtime/Query rather than fixtures or direct Markdown access;
- [ ] all active Triage entries remain browseable regardless of future Review Due;
- [ ] default ordering and Review Set match canonical Query semantics;
- [ ] Triage Row uses shared Priority, Label, Due, CollectionRow, and selection-gutter identities;
- [ ] shared View Bar, Triage Filter registry, and constrained Display ordering are implemented;
- [ ] Review Surface supports previous/next and wide Queue+Review / narrow focused-Review composition;
- [ ] Title, Description, Priority, Labels, and Review Due editing persist through Application/Mutation/Source Sync;
- [ ] Defer is Review Due movement only, with no Snooze/Deferred state;
- [ ] Delete works through the normal Triage delete intent;
- [ ] Triage Create uses the shared Composer infrastructure;
- [ ] Accept supports both Issue and Project through the standard target Composers;
- [ ] Accept seeds Title/Description only and does not implicitly copy Triage Priority/Labels/Review Due/Estimate;
- [ ] canceled Accept leaves the source unchanged;
- [ ] successful Accept is destination-first and removes the source only as part of the successful semantic operation;
- [ ] successful Accept/Defer/Delete advances according to the current visible/ordered queue when possible;
- [ ] shared Selection/Action/context/keyboard mechanics are used rather than Triage-private alternatives;
- [ ] representative real Vault fixture covers ordering, Review Set, semantic-property, density, and long-content cases;
- [ ] full repository validation is green;
- [ ] representative real-Obsidian wide/narrow, pointer, keyboard/focus, persistence, and reload validation is green;
- [ ] directly affected factual documentation is calibrated to the implemented state.

A partial phase may be published and called by its bounded capability name, but it must not be described as "Triage complete" before this checklist closes.

### 4.5 Remaining V1 work outside Triage

The following remain V1 work but should not be pulled into Triage unless Triage proves and consumes a genuinely shared prerequisite:

- Projects Root and Initiative Focus;
- Project Workspace and Workflow Issue collection/List/Board/Milestone presentation;
- broader Current/Historical Cycle page composition;
- Home modules and Workspace Grid;
- Search/deep navigation on the new formal UI stack;
- Default Project Settings selector and current-Default delete guidance;
- cross-surface Runtime feedback grammar not already required by Triage;
- integrated V1 hardening after the formal product verticals exist.

Custom Views, Favorites, and the future Workspace Issues collection remain deferred and must not create speculative V1 implementation work.

## 5. Build Order

The V1 build order remains dependency-aware, but the active UI portion is vertical-driven:

```text
1. Domain / Validation Foundation                    ESTABLISHED
2. Semantic Planning Foundation                      ESTABLISHED
3. Data / Persistence / Mutation Foundation          ESTABLISHED
4. Runtime / Index Foundation                        ESTABLISHED
5. Query / Derived Foundation                        ESTABLISHED
6. Application Foundation                            ESTABLISHED
7. UI Reset / Visual Foundation / Core Primitives    ESTABLISHED
8. Product Workspace / V1 UI                         ACTIVE
   |
   |- shared capabilities introduced by real consumers
   |
   `- Triage vertical                              ACTIVE
      |- Phase A: Production page + real Queue      COMPLETE
      |- Phase B: Queue semantics + Filter/Display  NEXT
      |- Phase C: Review + Edit/Defer/Delete        QUEUED
      |- Phase D: Composer + Accept                 QUEUED
      |- Phase E: Selection/Actions/keyboard        QUEUED
      `- Phase F: real fixture + integrated closure QUEUED
9. Next product vertical                              AFTER TRIAGE CLOSURE
10. V1 integration / hardening                        AFTER FORMAL VERTICALS
```

Each phase may be one or more small commits when implementation evidence requires repair/calibration, but the intended phase boundary should remain coherent enough to validate and publish independently.

Shared capabilities follow three rules:

1. do not pre-build the entire future framework before a real consumer exists;
2. when a real consumer proves a responsibility is shared, implement it at the shared owner rather than page-local first;
3. consume the new shared owner immediately in the active vertical so its API, geometry, state ownership, and host behavior are proven in context.

The next coding slice after this checkpoint is **Phase B - Queue completion, shared Label presentation, Filter, and Display**.

## 6. Risk & Verification

### 6.1 Primary risks

**Speculative abstraction risk**

Building all future primitives/interactions before product pages can create APIs around imagined consumers. Mitigation: Triage drives shared capability introduction just in time; abstractions require a real consumer graph.

**Page-local duplication risk**

Shipping fast local forms, filters, date controls, Label chips, or action handlers would create a second UI mechanism. Mitigation: canonical Domain concepts and generic interaction mechanics are implemented at shared owners from their first justified consumer.

**Runtime/Query ownership drift**

A page may be tempted to sort, filter, compute Review Set, or inspect committed state directly. Mitigation: Query owns read projections; UI consumes effective Runtime through Query and owns only transient interaction state.

**Review Set/filter confusion**

Filtering could accidentally redefine Review Set or its boundary. Mitigation: Review Set is always global derived Query state; Filter changes visibility only.

**Accept semantic regression**

A target Composer could accidentally restore old source-property copying or separate create/delete calls. Mitigation: use the published draft-based Triage Accept Application boundary; title/body are the only automatic seeds and the logical mutation remains destination-first.

**Responsive/host mismatch**

Phase A proved the real Queue at representative wide/narrow Obsidian widths, but later View Bar and Queue/Review composition can still fail in splits. Mitigation: each product phase validates representative wide/narrow panes only after the relevant real consumer exists; CSS/container behavior owns visual-only adaptation.

**Selection/action divergence**

Checkbox, context menu, keyboard, and Bulk could become separate semantics. Mitigation: Phase E introduces one transient Selection owner and Action Registry, reusing ordinary Query/Application legality.

### 6.2 Verification discipline

For every Triage phase:

- trace changed contracts through canonical owner, direct consumers, tests, diagnostics/adapters, and checked-in development data before delivery;
- run focused owner tests while iterating;
- run full `npm run check` at the coherent candidate checkpoint;
- run `git diff --check` before publication;
- use real Obsidian validation only for behavior that unit/jsdom checks cannot establish reliably, such as host composition, focus/portal behavior, pointer/keyboard behavior, responsive splits, and persistence/reload integration;
- after publication, verify public `main`, exact changed-file manifest, and matching CI before declaring the checkpoint closed;
- update this document only with factual implementation evidence and the next active boundary, not speculative completion claims.

### 6.3 Current Triage evidence

The `20f5283...` scanning checkpoint was locally green across 100 Vitest files / 347 tests, ESLint, TypeScript, production esbuild, and `git diff --check`. Representative real-Obsidian validation covered the Triage Row at normal and narrow widths plus selection behavior. GitHub CI run #139 completed successfully.

The `27afda3...` creation-semantics checkpoint was locally green across 102 Vitest files / 353 tests, ESLint, TypeScript, production esbuild, and `git diff --check`. It is lower-layer behavior and required no additional host UI pass. GitHub CI run #140 completed successfully.

The Phase A product-page checkpoint was locally green across 105 Vitest files / 358 tests, ESLint, TypeScript, production esbuild, and `git diff --check`. Representative real-Obsidian validation covered the formal Triage navigation/page at normal and narrow widths, the authoritative 12-entry Vault fixture, canonical queue ordering, Review Set count/boundary, Priority identity/tie-break, title truncation, and stable shared Due placement. Phase A intentionally exposed no selection or action controls.

Together these checkpoints prove the lower-level prerequisites plus the formal Triage read path. They do not yet prove the Review Surface, Label presentation, View Bar/Filter, Selection/Action system, Composer UI, mutation workflows, or integrated Triage closure.

## 7. Final State

The current active target is not "finish every UI foundation first." It is to produce one coherent formal Triage vertical while letting real Triage consumers mature the shared component/interaction language that later V1 pages can reuse.

After Triage closes, the repository should contain:

- one formal product navigation/page path rather than a Foundation-only app;
- a real Query-driven collection consumer for shared row/View Bar contracts;
- shared Priority, Label, and Due identities proven in product composition;
- one shared Filter mechanism proven by a real collection;
- one shared Creation Composer infrastructure proven by Triage Create plus Accept-to-Issue/Project;
- one shared Selection/Action mechanism proven by a real collection/review workflow;
- a complete Triage Queue/Review/Accept workflow over authoritative Markdown persistence;
- representative real-Obsidian responsive/interaction/persistence evidence;
- no TriageItem model, Snooze state, persisted Review Set/rank, page-local Filter engine, page-local creation stack, or alternate mutation authority.

Only then should Triage be moved from active implementation to completed product composition. The next product vertical can reuse the capabilities Triage proved and extend them only where its own real consumer requirements justify additional shared contracts.

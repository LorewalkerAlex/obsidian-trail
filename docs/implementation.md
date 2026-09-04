# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The current durable documentation baseline before this implementation-plan rebaseline is:

```text
a3978382e1b7a08ca5662c70c085f298d9bf35de
docs: finalize v1 ui rebaseline
```

The latest published executable UI checkpoint before the UI/document rebaseline remains:

```text
da1a84f86a5d3a1e234335839f0fde1eff92e341
feat: checkpoint triage review and navigation
```

Current code is intentionally behind the frozen Product/UI target. Existing executable code is reusable evidence, not authority over the final architecture, UI composition, or implementation order.

The V1 implementation program now uses the dependency sequence defined in this document. The old Phase A/B/C progression is retained only in Git history; it is no longer the active execution model.

## 2. Frozen Target and Current Alignment Debt

The implementation target is resolved through:

```text
product.md / domain.md / data.md
-> architecture.md
-> ui.md
-> ui-blueprints.md
-> design-to-code-map.md
-> this implementation plan
```

Do not reopen already-closed Product/UI decisions because older code or tests express a stale contract.

Known published alignment debt includes:

1. `TrailWorkspaceShell` / `TrailLocationBar` still express a mandatory global location/title contract. Target: thin Workspace Frame/Page Surface; Page owns header/breadcrumb/actions.
2. `TrailViewBarProps` still requires `display`. Target: composition-oriented Collection Controls with only the controls accepted by the current Page.
3. Foundation Lab is now an explicit development-only navigation location and no longer a Product fallback, but it still needs the Stage 2 shared Page chassis and the Stage 3 showroom hierarchy.
4. `TrailProgress` is the correct shared visual owner but still needs unavailable and normal/compact/micro density states.
5. shared Filter exists, while Selection/Action Registry/Bulk/Peek/transient stack/Confirmation/standard Creation Composer are incomplete shared production owners.
6. Triage Page currently subscribes broadly to Runtime and composes multiple focused selectors itself. Target: surface Read Model consumption plus explicit Page-local interaction state.
7. nested Query selectors can reacquire/rebuild readable Effective Runtime independently. Target: one readable snapshot per top-level Read Model evaluation before considering any cache framework.
8. Search Query still contains legacy Milestone/Triage result kinds. Target Sidebar Search result kinds are Initiative, Project, and Workflow Issue only.

These are implementation gaps, not design questions.

## 3. Established Foundations

The following lower layers are already established and should be consumed rather than re-modeled:

- Domain model, validation, lifecycle rules, and semantic planning;
- required Project ownership for Workflow Issues;
- required normal-ready Default Project reference and startup recovery;
- Markdown schema/codecs and authoritative Persistence;
- Mutation Plans, physical materialization, transaction topologies, execution, and global mutation ordering;
- committed Runtime, optimistic pending projection, reconciliation, source ownership, structural/reference indexes, control, and source health;
- Query ownership of derived facts, ordering, legal targets, capabilities, and presentation projections;
- Application ownership of semantic use cases;
- fixed T-Shirt Estimate levels and configurable numeric weights;
- explicit Cycle Start/Close/Start-next semantics;
- canonical Project/Milestone/Cycle Progress semantics;
- modular stylesheet ownership and deterministic Obsidian stylesheet assembly;
- existing production primitives/patterns/entities already proven through current consumers and Foundation Lab.

Do not add page-local Domain legality, persistence shortcuts, a second Runtime/ViewModel store, alternate query languages, or duplicate action/filter/confirmation systems merely to make UI implementation convenient.

## 4. Implementation Operating Model

### 4.1 Dependency-first program

Implementation follows this global sequence:

```text
Stage 0  Read Architecture closure
         ↓
Stage 1  Host Chrome and navigation/history
         ↓
Stage 2  Shared Main View Page Chassis
         ↓
Stage 3  Foundation Lab showroom structure
         ↓
Stage 4  Align the existing production UI warehouse
         ↓
Stage 5  Finish Triage
         ↓
Stage 6  Projects Root + Initiative Focus
         ↓
Stage 7  Project Workspace + Inspectors
         ↓
Stage 8  Issue interaction/detail chain
         ↓
Stage 9  Board / Timeline / Sidebar Search
         ↓
Stage 10 Cycles
         ↓
Stage 11 Home
         ↓
Stage 12 Full-system calibration and V1 exit
```

A later stage may not create a private substitute for an unresolved earlier-stage owner.

### 4.2 Standard implementation slice

Every code slice follows the same loop:

1. **Contract** — identify the already-resolved Product/Architecture/UI behavior being implemented.
2. **Owner** — identify the production code owner from `design-to-code-map.md`.
3. **Consumer graph** — trace Query/Application/Page/tests/host consumers before editing.
4. **Production implementation** — implement the smallest complete owner; do not put reusable behavior in Foundation-only code.
5. **Foundation specimen** — when the owner is visual/reusable, display representative states and live behavior in Foundation before Product-Page installation.
6. **Real consumer** — install the owner in the real Page/surface that proves the need; Page-specific workflow stays Page-local.
7. **Verification** — run the smallest sufficient owner/direct-consumer tests and representative host checks only when host behavior cannot be established automatically.
8. **Checkpoint** — publish a coherent GitHub checkpoint only after the slice exit condition is satisfied.

Foundation is not required for a pure Domain/Runtime/Query owner that has no independent visual contract. Conversely, a reusable visual/interaction owner is not accepted merely because a Page happens to render it once.

### 4.3 Just-in-time shared ownership

Do not build a speculative complete component library before Product work.

When a Product Page requires a reusable capability:

```text
Page needs capability X
→ production warehouse already has X?
   ├─ yes: verify Foundation coverage is adequate, then consume it
   └─ no: implement production X
          → expose representative Foundation specimens
          → calibrate states/interactions
          → install into the Product Page
```

This is layer-aware, but demand-driven. Shared owners are created before the Page uses them, while their contract is proved by a real Product need.

## 5. Stage 0 — Read Architecture

### 5.1 Frozen read chain

The central read architecture is:

```text
Authoritative Persistence
        ↓
Domain Model
        ↓
Runtime Store
        ↓
Readable / Effective Snapshot
        ↓
Query shared projections + surface Read Model
        ↓
Page / Inspector / Sidebar composition
        ↓
production UI components
```

Runtime remains the single central in-memory operational store. V1 does **not** create a second mutable ViewModel store.

### 5.2 Runtime ownership

Runtime continues to own:

```text
Committed authoritative state
Runtime indexes
source ownership
ordered pending Mutation Plans
control lifecycle
source health
revision
```

Effective planning/UI state is committed state plus ordered pending effects while the Runtime is safely `ready`. Refresh/read-only recovery may expose coherent committed last-known-good state instead.

### 5.3 Query Read Model ownership

Query is the UI-facing read boundary over Runtime.

A top-level surface Read Model may combine:

- entity facts;
- inverse/current relationships;
- derived Progress/Attention/Health facts;
- effective capabilities and legal targets;
- resolved semantic presentation data;
- ordered/grouped collection projections;
- filter options;
- UI-relevant Runtime health state.

Read Models are immutable, disposable, rebuildable, and non-authoritative. UI never mutates them.

Expected scopes include shared semantic projections plus just-in-time surface models such as:

```text
ProjectSummary
IssueSummary
StatusPresentation
EffectiveCapabilities

TriagePageReadModel
ProjectsRootReadModel
InitiativeFocusReadModel
ProjectWorkspaceReadModel
ProjectInspectorReadModel
CurrentCycleReadModel
HomeReadModel
SidebarSearchReadModel
```

Do not design all future concrete types before their surface implementation, and do not introduce a universal `TrailEverythingViewModel`.

### 5.4 Top-level evaluation rule

One top-level Read Model evaluation should:

```text
Runtime State
+ Page/surface identity
+ explicit transient query inputs
+ one explicit `now` when needed
        ↓
acquire readable/effective snapshot once
        ↓
pass the snapshot through shared projection helpers
        ↓
return one coherent Read Model
```

Do not repeatedly replay pending plans/rebuild Runtime indexes through nested selectors within the same evaluation when one snapshot can be shared.

Do not add a generalized memoization/cache framework first. Measure representative Projects/Issues and add revision/pending-aware memoization only when evidence justifies it.

### 5.5 UI-state boundary

These remain UI-owned transient state:

- Filter values and Order choice;
- List/Board presentation choice;
- selection/highlight/focus;
- collapsed groups;
- Peek/menu/picker/confirmation open state;
- Composer and Triage Review drafts;
- scroll/resize/animation state.

A transient value may be passed into Query as an explicit input when it changes the visible projection. That does not move its ownership into Runtime/Query.

### 5.6 Reusable component boundary

Reusable production components do not fetch their own business data.

Target dependency:

```text
Query Read Model ───────────────┐
                               ↓
                        production component
                               ↑
Foundation fixture ─────────────┘
```

Examples such as `TrailIssueRow`, `TrailProjectSummaryRow`, `TrailPriority`, `TrailProgress`, and shared patterns receive semantic props. They do not require `TrailRuntimeStore` or Runtime-index access merely to render themselves.

This is what makes the production warehouse truly portable between Foundation and Product Pages.

### 5.7 Stage 0 exit

The architectural contract is frozen by `architecture.md` + `design-to-code-map.md` + this plan.

Concrete Page Read Models are implemented just in time with their consumers; Stage 0 does not require rewriting every current Query selector before Host/UI construction starts.

**Stage 0 is closed. Stage 1 is the active implementation stage.**

## 6. Foundation Lab Contract

### 6.1 Role

Foundation Lab is Trail's development showroom: an effectively unbounded Main View canvas that lays out production UI owners so their visual states, variants, and live interactions can be inspected independently of a Product workflow.

It is not:

- a Product dashboard;
- a production navigation destination;
- a private component library;
- the owner of reusable components;
- a substitute for Page/workflow tests;
- the fallback rendering for unfinished Product locations.

### 6.2 Same Page chassis

Foundation must be a real development Page using the same Main View chassis as Product Pages:

```text
Workspace Frame
→ Page Surface
   ├─ Foundation Page
   ├─ Triage Page
   ├─ Projects Page
   └─ ...
```

If Foundation needs a different fundamental Main View structure in order to display a reusable component, the shared Page/chassis boundary is wrong.

A diagnostics/development build may expose:

```text
Development
Foundation
```

in Trail's Left Sidebar. Production navigation omits this entry. Foundation remains development infrastructure rather than a Product location contract.

### 6.3 Showroom organization

Foundation is organized as an infinite vertical showroom:

```text
Visual Foundations
Primitives
Patterns
Semantic Entities
Interactions
```

Sections are organizational shelves, not ownership layers inside Foundation.

Foundation-only code may include:

```text
LabSection
LabStateGrid
LabSpecimenRow
LabDescription
LabControlGroup
fixture builders/data
```

Those wrappers never become dependencies of production Pages.

### 6.4 Specimen convention

A reusable capability should expose two complementary specimen forms where useful.

**State Gallery** freezes representative visual states, for example:

```text
Button
- primary
- secondary
- ghost
- danger
- disabled
- focus-visible

Progress
- normal
- compact
- micro
- unavailable
- 0 / partial / 100%

Collection Row
- normal
- hover/focus
- highlighted
- selected
- long title
- constrained width
```

**Live Interaction** demonstrates behavior that needs actual manipulation, for example:

```text
Priority selection
Picker keyboard/Esc/focus return
Context Menu
Selection + Bulk
Confirmation
Peek retarget/dismissal
Composer + nested Picker
```

Not every specimen requires both forms; use the smallest demonstration that proves the component contract.

### 6.5 Warehouse rule

Nothing reusable shown in Foundation belongs to Foundation.

```text
production warehouse
├─ primitives
├─ patterns
├─ semantic entities
└─ shared interactions

Foundation Page
└─ imports and displays those production owners
```

A Product Page uses the same production owner and may customize only supported semantic props, slots, and composition.

## 7. Shared-owner Maturity

A file existing is not enough to call a shared owner complete.

Use these maturity states:

| State | Meaning |
| --- | --- |
| **Mapped** | canonical responsibility and target owner are known |
| **Implemented** | production owner exists |
| **Lab-proven** | representative visual/interaction states are exposed in Foundation when applicable |
| **Consumer-proven** | at least one real Product consumer uses the owner |
| **Host-proven** | required Obsidian-specific behavior is verified when applicable |
| **Accepted** | current contract is stable enough for later dependencies |
| **Alignment Required** | useful implementation exists but its public contract conflicts with the frozen target |

Current key status:

| Owner/capability | Current status | Next requirement |
| --- | --- | --- |
| Domain/Persistence/Mutation Runtime core | Accepted | consume; do not remodel |
| readable/effective Runtime snapshot | Implemented | use once per top-level Read Model evaluation; profile before caching |
| Page/surface Read Model boundary | Mapped / partial evidence | introduce just in time, first where real Page construction requires it |
| Button/Input/Checkbox/basic primitives | Implemented / Foundation evidence | reorganize showroom; calibrate only as real consumers require |
| Collection Row / Property Control | Implemented / consumer evidence | preserve useful owner, align final states/props in showroom |
| Workspace Frame / LocationBar | Alignment Required | Stage 2 thin Page chassis; remove mandatory global location owner |
| Collection Controls / required Display | Alignment Required | replace with composition-oriented controls |
| Host navigation / Sidebar Search boundary | Host-proven | finish Stage 1 with the Right Sidebar Inspector carrier |
| Foundation Lab | Host-proven navigation / Alignment Required | Stage 2 shared Page chassis; Stage 3 showroom hierarchy and specimen convention |
| Progress | Alignment Required | add normal/compact/micro/unavailable specimens/contract |
| Selection / Action Registry / Peek / Confirmation / Composer | Mapped / partial or pending | create production owners just in time from real Page needs |

Update this ledger as the active execution snapshot; do not turn it into historical release notes.

## 8. Global Dependency Roadmap

### Stage 1 — Host Chrome and navigation/history

Build Page-external mechanics first:

- final Trail Left Sidebar information architecture;
- development-only Foundation entry;
- stable Product Page navigation locations;
- remove Search as a Page/location and reserve temporary Sidebar Search state;
- preserve/use Obsidian native Back/Forward history for stable Page navigation;
- keep transient Filter/Peek/Review/Composer/etc. out of host history;
- establish/align Right Sidebar Inspector carrier without implementing every Inspector.

Exit: host navigation/history boundaries match final architecture and Foundation can be reached in development without being a Product fallback.

Current status:

- **Stage 1A complete / Host-proven** — final Left Sidebar information architecture, stable Product Page locations, temporary Sidebar Search state, native Obsidian Back/Forward history, development-only Foundation navigation, and removal of Product-to-Foundation fallback are implemented and verified in the real host.
- **Remaining Stage 1 work** — establish/align the Right Sidebar Inspector carrier and verify its host behavior without implementing future Inspector contents.

### Stage 2 — Shared Main View Page Chassis

Implement the thin common mechanical base:

- Workspace Frame;
- Page Surface;
- shared content capacity/scroll/insets;
- pane/container responsive context;
- Page Header geometry where proven useful;
- no mandatory Location Bar;
- no mandatory Display/View Bar contract.

Prove the chassis with at least Foundation and one Product Page consumer.

Exit: Foundation and Product Pages mount through the same Main View base.

### Stage 3 — Foundation showroom structure

Reorganize Foundation into:

```text
Visual Foundations
Primitives
Patterns
Semantic Entities
Interactions
```

Add consistent specimen wrappers, State Gallery presentation, and Live Interaction areas. Do not yet invent every missing future component.

Exit: existing production warehouse owners can be found, compared, and calibrated systematically.

### Stage 4 — Align existing production warehouse

Move current reusable evidence onto the frozen contracts, including:

- Button/IconButton/Input/Textarea/Checkbox/Separator;
- Progress density/unavailable states;
- Collection Row;
- Property Control;
- final Collection Controls contract replacing required Display;
- Priority/Status/Due/Label/Estimate semantic identities as required;
- responsive/focus/disabled states in Foundation.

Every aligned owner remains production code and must still have a real or imminent Product consumer.

### Stage 5 — Finish Triage

Before/with Triage construction, define the Triage Page Read Model from current proven Query semantics.

Then finish:

- Queue + direct `Filter + Order` controls;
- Review draft lifecycle and visible-order progression;
- shared Confirmation for Delete;
- shared transient Esc/focus behavior where required;
- Triage Creation Composer path;
- Selection/Action owners only where Triage now proves a real need;
- no navigation-as-save and no Review history node.

Exit: Triage is the first complete final V1 vertical rather than another partial phase checkpoint.

### Stage 6 — Projects Root + Initiative Focus

Implement in dependency order:

- shared Project Summary projection/row;
- Projects Root Read Model;
- Group Header / Empty State where missing;
- Projects Root List + Timeline control boundary;
- Initiative Focus Read Model reusing the Project collection owner;
- Project/Initiative creation through shared Composer when required.

### Stage 7 — Project Workspace + Inspectors

Implement:

- Project Workspace Read Model;
- persistent Status sections;
- Issue Row semantic projection/variants;
- Project-scoped Filter/order rules;
- Project Inspector Read Model;
- Progress / Temporal Attention / Milestones;
- lifecycle capabilities and Page actions.

### Stage 8 — Issue interaction/detail chain

Build one coherent chain:

```text
Issue Row/Card
→ read-only Peek
→ Issue Full Item
→ Issue Inspector
```

Introduce/complete shared Selection, Action Registry, Context Menu/overflow, Bulk Bar, Picker mechanics, Confirmation, and transient stack only as the real chain proves them.

### Stage 9 — Project execution views + Sidebar Search

After Issue collection/interaction owners are stable:

- Project Board and Status drag mutation;
- Projects Timeline geometry/query projection;
- Project deletion/settings integration;
- final Sidebar Search mode using only Initiative/Project/Workflow Issue Read Models and normal navigation.

### Stage 10 — Cycles

Reuse mature Issue/collection/interaction owners for:

- Current Cycle List;
- Current Cycle Board + Project swimlanes;
- Add/Remove membership and Add Issues;
- Start/Close/Start-next flows;
- Cycle Inspector;
- Historical Cycle List.

Cycle should be a high-reuse vertical; it must not create parallel Issue/Filter/Board/Selection machinery.

### Stage 11 — Home

Implement after its major source projections are stable:

- This week;
- Lifecycle Activity;
- Work Trend + Weekly Notes;
- Work Pulse;
- Home creation action.

Home adds Page-specific visualization/composition, not another foundational interaction system.

### Stage 12 — Full-system calibration and V1 exit

Complete:

- runtime/Data-Issue feedback placement;
- responsive calibration across representative pane sizes;
- keyboard/focus conflict calibration;
- Inspector entry/reveal behavior;
- Foundation visual regression sweep;
- whole-shell Obsidian integration;
- evidence-driven performance/virtualization where required;
- final full validation/release checkpoint.

## 9. Active Slice

Stage 1A host navigation is complete and Host-proven. The next code slice is:

### Stage 1B — Right Sidebar Inspector carrier

Scope:

1. establish the Trail Inspector as an Obsidian Right Sidebar carrier rather than a fake Main View column;
2. make carrier availability follow stable Page identity: Home, Triage, Projects Root, and Sidebar Search have no Trail Inspector; stable Initiative, Project, Issue, and Cycle locations may expose the matching carrier;
3. keep Stage 1B focused on host placement/target lifetime and use minimal placeholder content where future Inspector Read Models are not implemented yet;
4. decide initial Inspector visibility once on location entry from actual Obsidian workspace capacity;
5. after location entry, leave Inspector open/closed state under user/host control rather than toggling it repeatedly on resize or other transient UI changes;
6. preserve unrelated Right Sidebar views and avoid destructive replacement/closure;
7. keep Inspector state separate from Sidebar Search, navigation history, Peek, and future Page-local transient state.

Exit evidence:

- focused carrier/location-entry tests;
- typecheck/build if the host adapter contracts affect compilation/bundling;
- representative Obsidian evidence for real Right Sidebar placement, stable-target/no-target transitions, user-controlled visibility after entry, and preservation of unrelated Right Sidebar views;
- no future Inspector content/read model is prematurely implemented merely to prove the carrier.

Stage 2 Page Chassis begins only after Stage 1 is a stable published checkpoint.

## 10. Slice Definition of Done

A code slice is complete only when:

- its canonical contract is already resolved;
- production ownership is correct;
- changed public contracts have their consumer graph closed;
- reusable visual owners have representative Foundation coverage when applicable;
- at least one real Product consumer exists or the slice is explicitly Host/Chassis infrastructure required before Product composition;
- no Page-local duplicate mechanism bypasses Domain/Query/Application ownership;
- focused tests prove new behavior at the correct layer;
- host-only behavior has representative Obsidian evidence when required;
- factual documentation is calibrated if implementation changed an architectural/ownership fact;
- the intended manifest is committed/pushed and the remote GitHub commit is re-read before the checkpoint is called complete.

## 11. Validation Policy

Use repository-native checks according to actual impact.

### Documentation-only

Level 1 only:

```text
git diff --check
+ real documentation validator if one exists
```

Do not run source lint/test/typecheck/build for pure Markdown by default.

### Local UI/query/application changes

Run Level 1 plus focused owner/direct-consumer tests. Add typecheck/build when changed contracts affect compilation/bundling. Use real Obsidian only for host behavior that jsdom/pure tests cannot establish.

### Shared contracts / Domain / schema / tooling / broad refactor

Escalate to repository-wide `npm run check` when the consumer graph is cross-cutting, uncertain, or the change is a formal release gate.

A visual Foundation specimen does not replace owner tests, Product-consumer tests, or host validation. It is the stable visual/interaction showroom for reusable production parts.

## 12. Publication Rule

GitHub `main` is the durable checkpoint.

For each implementation round:

1. work from the verified public baseline;
2. maintain the explicit intended path manifest;
3. deliver exact validated final bytes to the local checkout;
4. stage only the intended manifest;
5. run staged `git diff --check` and inspect staged name/status + stat;
6. commit and push separately from mutation/validation;
7. re-read GitHub and verify the resulting remote commit before declaring the round complete.

Do not use `git add -A` when paths are known. If commit succeeds but push fails, push the existing commit rather than recreating it.

## 13. V1 Completion Definition

V1 UI implementation is complete when:

- implemented Pages match frozen `docs/ui.md` behavior and `docs/ui-blueprints.md` composition;
- the Runtime→Readable Snapshot→Query Read Model→UI boundary is followed by Product Pages/Inspectors/Sidebar surfaces;
- reusable UI components receive semantic props and can be exercised both from Foundation fixtures and real Read Models;
- Foundation is a development showroom Page on the same Page chassis, not a Product fallback or alternate component library;
- shared owners have correct production ownership and no Page-specific workflow leaks into them;
- stale LocationBar/required-Display/Search-Page contracts are removed;
- Selection/Action/Peek/Composer/Confirmation ownership is shared where frozen;
- Query/Application/Domain remain the single owners of derived facts, legality, and semantic mutation;
- responsive and host-specific behavior is calibrated in real Obsidian;
- full-shell visual presentation is coherent across Trail and relevant native host surfaces;
- representative scale evidence does not require unresolved performance work;
- the final coherent checkpoint passes the appropriate repository/release validation gate and is verified on GitHub.

Historical implementation details remain in Git history. This document remains the current execution plan and active status snapshot, not another chronological archive.

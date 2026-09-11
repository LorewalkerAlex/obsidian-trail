# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The latest published prerequisite for the Stage 8 closure candidate is:

```text
3e80278f7ae9f8d8a9dda930403571562eb2d158
feat: establish stage 8 issue full item
```

That checkpoint establishes the accepted Workflow Issue Row/Peek/Selection/Action chain plus Issue Full Item. The Stage 8 closure candidate adds the matching Issue Inspector over those owners without reopening their Domain, navigation, or mutation semantics.

Stages 5 through 8 are closed. Stage 9 is active: the complete Workflow Issue interaction/detail chain now has production, automated, and representative host evidence through Row/Peek/Selection/Actions, Full Item, and Issue Inspector. Existing executable code remains reusable evidence rather than authority over the frozen Product/UI target.

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

Known alignment debt now centers on:

1. nested Query selectors can still reacquire/rebuild readable Effective Runtime independently. Target: one readable snapshot per top-level Read Model evaluation before considering any cache framework.
2. Search Query still contains legacy Milestone/Triage result kinds. Target Sidebar Search result kinds are Initiative, Project, and Workflow Issue only.

These are implementation gaps, not design questions. Stage 8 real consumers now use shared Collection Selection, read-only Peek, and one Action Registry/context-resolution path in production. Context Menu, Peek overflow, and Bulk Bar consume that same action authority over Query capability/legal-target facts and existing Application intents; Bulk target-bearing actions intersect per-item legal targets instead of creating a parallel legality model. No human-readable Workflow Issue identifier is planned merely to support row spacing.

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
- existing production primitives/patterns/entities already proven through current consumers and Foundation Lab;
- accepted shared visual grammar for Collection Row rhythm, transient geometry/search/selection, and application-scale Standard Composer density.

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
Stage 9  Board / Sidebar Search
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
4. **Semantic presentation shape** — for a visual/reusable owner, identify the semantic props or projection shape it consumes and the representative fixture data needed to exercise that shape without creating new Domain/Query truth.
5. **Production implementation** — implement the smallest complete owner; do not put reusable behavior in Foundation-only code.
6. **Foundation coverage** — exercise the production owner with representative semantic fixtures, using orthogonal coverage rather than a Cartesian state matrix.
7. **Real consumer** — connect the same owner to the real Query/Application/Page path; Page-specific workflow stays Page-local.
8. **Verification** — run the smallest sufficient owner/direct-consumer tests and representative host checks only when host behavior cannot be established automatically.
9. **Checkpoint** — publish a coherent GitHub checkpoint only after the slice exit condition is satisfied.

Foundation is not required for a pure Domain/Runtime/Query owner that has no independent visual contract. A reusable visual owner may become Implemented/Lab-proven from semantic fixtures before its real Read Model wiring exists, but it is not Consumer-proven or Accepted until the real Product path consumes that same owner.

### 4.3 Just-in-time shared ownership

Do not build a speculative complete component library before Product work.

When a Product Page requires a reusable capability:

```text
Page needs capability X
→ production warehouse already has X?
   ├─ yes: verify Foundation coverage is adequate, then consume it
   └─ no: implement production X
          → exercise it from semantic fixture data in Foundation
          → calibrate states/composition/mechanics
          → install the same owner into the Product Page
```

This is layer-aware, but demand-driven. Shared owners are created before the Page uses them, while their contract is proved by a real Product need.

### 4.4 Fixture-first visual development

Visual development does not need to wait for the final Runtime/Query wiring when the consumed semantic contract is already resolved. Foundation and tests may construct synthetic fixture data directly at the production owner's semantic input boundary.

Target flow:

```text
resolved Product/UI/query semantics
        ↓
semantic projection fixture ───────→ production UI owner ───────→ Foundation calibration
        ↓ later
real Query Read Model ─────────────→ same production UI owner ──→ Product Page
```

Fixture data may encode already-resolved outcomes such as Status presentation, Project progress, terminal state, resolved Timeline spans/markers, long-content pressure, or missing optional values. It must not become a second implementation of eligibility, ordering, Progress, lifecycle legality, temporal derivation, or other Query/Application/Domain rules. When a surface such as Timeline depends on derived geometry inputs, Foundation receives the resolved projection values needed to render that geometry rather than recomputing them from raw entities.

This enables UI owners to be designed and visually accepted early while preserving one eventual data authority. Real Product completion still requires the corresponding Query/Application integration.

### 4.5 Regression hardening gates

Recurring calibration failures should become mechanically difficult to reintroduce when a narrow repository guard can express the boundary without creating a new framework.

- **Foundation production-path parity** — when a supported production prop materially changes the rendered element, selector path, focus behavior, or interaction path, at least one representative Foundation specimen must exercise the same branch used by the real Product consumer. A passive rendering branch does not prove an interactive branch.
- **Checked-in development-source gate** — changes to checked-in Trail sources or host/plugin-data fixtures used for calibration must pass the production codecs and workspace-graph validation before host calibration. Host screenshots are not the first validator of fixture legality.
- **Stable Page navigation boundary** — Product Pages emit navigation intents through injected shell/host-aware callbacks. They do not import or mutate `TrailNavigationStore` directly; Obsidian ViewState/history remains the authority for stable Page navigation, while store restoration is host-state replay rather than a Page navigation mechanism.

Current automated enforcement includes `plugin/src/test/trail-development-source-fixtures.test.ts` for checked-in source/graph validity and `plugin/src/test/trail-architecture-guard.test.ts` for the Product Page navigation import boundary. Foundation owner tests remain responsible for proving materially different production branches in the specimens that exercise them.

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
IssueFullItemReadModel
IssueInspectorReadModel
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

**Stages 0 through 8 are closed. Stage 9 is the active implementation stage.**

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
Compositions
Interaction Mechanics
```

Sections are organizational shelves, not ownership layers inside Foundation. The showroom may grow as real production owners appear, but adding a specimen shelf does not reopen a closed Product/UI stage.

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

Foundation separates three verification dimensions. They may consume the same production owner, but they must not be conflated.

**State Gallery** freezes every visual endpoint that needs aesthetic comparison. Dynamic interaction is never required merely to reveal a visual state.

Representative state matrices include:

```text
Button / Icon Button / Property Control
- rest
- hover
- pressed
- focus-visible
- disabled

Picker / Popover / Menu
- closed trigger
- open surface
- rest item
- hover item
- selected / checked item
- search / focused search
- empty state

Confirmation
- default
- destructive
```

Foundation may force pseudo-states for deterministic comparison only when the specimen hook reuses the same production declaration as the real selector. It must not create a parallel Foundation-only visual language.

A State Gallery may place a production owner inside the smallest realistic production composition when detached swatches would obscure its actual weight, alignment, or scanning rhythm. For example, Status glyph variants may be frozen inside real Collection Row geometry. This remains State Gallery coverage so long as Foundation only supplies fixtures/composition and does not redefine the owner.

**Composition Gallery** assembles production owners with fixture data so hierarchy, density, spacing, alignment, containment, and transient placement can be judged independently from workflow outcomes. Representative compositions include a Triage property family, Queue slice, Review surface, Standard Composer family, and Confirmation family.

**Interaction Mechanics** exercises shared state-transition/event-routing behavior once per mechanical responsibility, for example:

```text
action activation feedback
selection toggle
popover open -> choose -> close
keyboard / Esc / outside-dismiss / focus return
modal focus and guarded dismissal
```

A Product workflow transition remains a Product integration responsibility. For example, `Accept -> Issue Composer` and post-create Review progression are not reimplemented in Foundation merely to prove button or popover mechanics.

Not every owner requires all three forms; use the smallest combination that proves its visual states, shared mechanics, and representative composition without duplicate testing.

Foundation coverage is **orthogonal, not Cartesian**. Treat independent visual dimensions as additive coverage:

```text
A = interaction state
B = semantic/content variant
C = content pressure / capacity
D = density / responsive condition

Foundation default: A + B + C + D
not:                A × B × C × D
```

Show a cross-dimension combination only when the combination itself creates a materially different visual, layout, or behavior contract. Examples that may justify an explicit combined specimen include long content under constrained width, selected + highlighted precedence, search + empty results, or one modal + child picker layer interaction. If two cases differ only in copy while using the same visual form, keep one representative form and add a dedicated content-pressure case only when the text difference exercises a real layout boundary.

The goal is a minimum complete visual basis: every materially different UI form and independent boundary is inspectable, without multiplying all possible combinations.

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

Foundation may be the first fixture consumer of a production owner created just in time for a resolved Product need; later Product Page wiring consumes the exact same owner. "Nothing reusable shown in Foundation belongs to Foundation" prohibits duplicate ownership, not fixture-first production development.

A Product Page uses the same production owner and may customize only supported semantic props, slots, and composition.

### 6.6 Showroom composition and file organization

Foundation is optimized for coverage clarity, not for specimen count or file-size symmetry. Duplicate specimens that prove the same visual form/state responsibility should be merged. Distinct text/content scenarios stay separate only when they exercise a different content-pressure, truncation, hierarchy, or accessibility boundary.

Do not split `trail-foundation-lab.tsx` merely because it becomes large. Extract a Foundation-only specimen module when it has a coherent independent responsibility such as substantial fixture construction, geometry scenarios, dedicated mechanics, or focused tests. Simple shelves may remain assembled directly in the Lab.

Complex future surfaces such as Project Timeline may therefore use dedicated Foundation fixture/specimen modules when that keeps their semantic cases understandable. Those modules remain verification consumers only; the rendered component and all reusable presentation/mechanics stay in the production warehouse.

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
| Page/surface Read Model boundary | Consumer-proven through Triage, Projects Root, Initiative Focus, Project Workspace, Initiative Inspector, Project Inspector, and Issue Full Item | continue just in time with Issue Inspector and later surfaces; no universal ViewModel layer |
| Button/Input/Checkbox/basic primitives | Accepted / Lab-proven / Consumer-proven / Host-proven | consume; add semantic variants only from proven Product needs |
| Collection Row / Property Control | Accepted / Lab-proven / Consumer-proven / Host-proven | consume; Stage 4 containment/state calibration is closed |
| Workspace Frame / Page Surface | Consumer-proven / Host-proven | consume as the stable shared Main View chassis |
| Collection Controls | Accepted / Consumer-proven / Host-proven | consume the aligned leading/trailing composition; Page-specific control choices remain Page-owned |
| Host navigation / Sidebar Search boundary | Host-proven | consume as stable shell infrastructure; final Sidebar Search results remain Stage 9 |
| Right Sidebar Inspector carrier | Host-proven; Initiative and Project Inspector content are Consumer-proven / Host-proven | consume the same carrier for Issue/Cycle Inspector content in Stages 8/10; preserve entry-time reveal without destructively closing unrelated host views |
| Foundation Lab | Accepted / Lab-proven / Host-proven | use State Gallery, Composition Gallery, and Interaction Mechanics as separate verification dimensions with orthogonal coverage; reusable ownership remains outside Foundation |
| Page Header | Implemented / Lab-proven / Consumer-proven / Host-proven | reuse shared geometry while each Page supplies identity/actions; do not reintroduce a universal Location Bar |
| Group Header / Empty State | Implemented / Lab-proven / Consumer-proven | reuse the shared mechanics/presentation; Page/Query still own grouping and empty reason/recovery |
| Status presentation | Project and Workflow Issue grammars Accepted / Consumer-proven / Host-proven | keep Project hexagonal and Workflow Issue circular identities stable; compact scanning rows use glyph-only visible Status identity without duplicating the configured label as row text |
| Project Summary Row | Accepted / Lab-proven / Consumer-proven / Host-proven | reused by Projects Root and Initiative Focus with the shared Selection gutter; consume the same owner in later Project collections where the semantic row fits |
| Project Timeline | Accepted / Lab-proven / Consumer-proven / Host-proven | preserve Timeline-owned horizontal overflow, resolved geometry inputs, and accepted typography/contrast while later Pages reuse only the owned presentation contract |
| Projects Root Read Model / Page | Accepted / Consumer-proven / Host-proven | preserve List/Timeline over one filtered Project collection as Stage 7 builds Project-local workspaces |
| Initiative Focus Read Model / Page + Initiative Inspector | Accepted / Consumer-proven / Host-proven | preserve scoped flat Project collection, clean Initiative-prefilled Project creation, and compact structured Inspector properties |
| Workflow Issue Row | Accepted / Lab-proven / Consumer-proven / Host-proven | preserve `Selection | Priority | Status + Title | soft semantic columns` and reuse the same production owner in later Issue collections |
| Project Workspace Read Model / Page + Project Inspector | Accepted / Consumer-proven / Host-proven | preserve Status-first List composition, scoped filter/order semantics, clean Project-prefilled Issue creation, structured Inspector properties, derived Progress/Attention, and Milestones |
| Progress | Accepted / Lab-proven / Consumer-proven / Host-proven | normal/compact/micro/unavailable contract aligned; reuse the same owner in later Cycle/Home surfaces |
| Normal-flow layout containment | Accepted / Host-proven | preserve direct-child ownership and explicit overflow responsibility in later Pages |
| Picker / Popover / Confirmation / Composer | Accepted / Lab-proven / Consumer-proven / Host-proven | consume the accepted shared grammar in later Pages; do not reintroduce Page-local geometry or density overrides |
| Collection Selection | Implemented / Consumer-proven / Host-proven | preserve visible-projection reconciliation, shared gutter, Shift range, `X` toggle, and top-layer-aware `Esc`; reuse in later selectable collections |
| Workflow Issue Peek | Implemented / Lab-proven / Consumer-proven / Host-proven | preserve read-only preview/retarget behavior without navigation, selection side effects, or Inspector retargeting |
| Issue Full Item Read Model / Page editor | Accepted / Consumer-proven / Host-proven | preserve stable Issue navigation, low-chrome inline title/body editing, host CodeMirror conventions, and Application-owned writes while Issue Inspector is implemented next |
| Action Registry / Context Menu / Bulk | Accepted / Lab-proven / Consumer-proven / Host-proven | reuse the same registry/context authority in later Issue collections and future contextual command/shortcut consumers; Bulk remains a presentation/aggregation consumer, not a second legality system |

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
- **Stage 1B complete / Host-proven** — Trail Inspector is established as an Obsidian Right Sidebar carrier with stable target lifetime, entry-time reveal policy, user/host-controlled visibility after entry, and non-destructive coexistence with unrelated Right Sidebar views.
- **Stage 1 closed** — Inspector carrier behavior is established without pulling future Inspector Read Models or Product content forward; Project/Issue/Cycle Inspector content remains owned by Stages 7/8/10.

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

Current status:

- **Stage 2 complete / Host-proven** — `TrailWorkspaceFrame` and `TrailPageSurface` provide the shared Main View frame, scroll/inset policy, and pane/container responsive context; the mandatory `TrailLocationBar` contract is removed and Page identity remains composition-owned.
- **Stage 2 consumer-proven** — Foundation and Triage mount through the same chassis, and representative real-Obsidian checks confirm practical pane-size behavior, including Triage's existing constrained Review transition.
- **Stage 2 closed** — Triage is only the proving Product consumer here; its final Queue/Review controls, Review exit presentation, and Read Model remain owned by Stage 5 rather than being pulled into chassis work.

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

Current status:

- **Stage 3 complete / Lab-proven** — Foundation established the production-owner showroom, Foundation-owned specimen wrappers, and explicit visual-versus-mechanical verification boundary.
- **Stage 3 Host-proven** — the showroom remains usable inside the shared Page chassis across representative Obsidian pane sizes, and structural specimen groups use visible labeling without redundant host hover labels.
- **Stage 3 closed** — later Stage 5 work may add new production specimens or refine the showroom into State Gallery / Composition Gallery / Interaction Mechanics, but that extension does not reopen the Stage 3 ownership/chassis decision and must not introduce Lab-only Product UI.

### Stage 4 — Align existing production warehouse

Move current reusable evidence onto the frozen contracts, including:

- Button/IconButton/Input/Textarea/Checkbox/Separator;
- Progress density/unavailable states;
- Collection Row;
- Property Control;
- final Collection Controls contract replacing required Display;
- Priority/Status/Due/Label/Estimate semantic identities as required;
- normal-flow layout containment / explicit overflow ownership;
- responsive/focus/disabled states and final visual calibration in Foundation.

Every aligned owner remains production code and must still have a real or imminent Product consumer.

Current status:

- **Stage 4 shared-contract checkpoint published** — `67ba3cdcf81d4127faf08ca1d8edfeb691d5b2b1` aligns Progress density/unavailable states, removes the required-Display Collection Controls contract, centralizes Collection Row nested-interaction isolation, and aligns Property Control normal/compact/disabled states.
- **Layout Contract frozen and first structural repair published** — `8044437c2afe8db5281101ebcd5180802cc35a0e` defines direct-child spatial ownership and explicit overflow responsibility; `795dfb54feacc10571f3cfedae6f5a606fe96cb2` applies it to the Foundation Collection Row specimen with stable `id / primary / trailing` regions rather than width-specific patching.
- **Remaining proven containment defects are repaired** — `f195a6247bf0a7b38a027d3106ba7a1e980b202b` makes shared popover item labels absorb width pressure without invading trailing meta/check regions, and `741848e2bbaec41c81ac7b5cc793be6a3f2821cc` gives dynamic Label Property summaries their own shrink/truncate region.
- **Final host visual leak is repaired** — `1fc8fc3fc4025c743c064abbb58df07640eded48` prevents Obsidian's generic button chrome from leaking onto Triage row titles without changing row geometry or visual tokens.
- **Representative host evidence is green** — real Obsidian inspection covers Foundation in the full shell, Triage wide Queue + Review, constrained single-column Review, Collection Row / Property Control containment, and the Label picker top layer; normal-flow siblings remain contained and the final presentation is visually coherent at the supported desktop calibration boundary.
- **Stage 4 complete / Host-proven and closed** — the existing production warehouse is aligned to the frozen shared ownership/layout contracts and the current owner graph has no remaining proven Stage 4 containment contradiction. Later consumer-driven pixel/token calibration may refine presentation without reopening Stage 4 unless new repository evidence contradicts the frozen contract. Stages 5 through 7 are closed and Stage 8 is the active slice.

### Stage 5 — Finish Triage

Before/with Triage construction, define the Triage Page Read Model from current proven Query semantics.

Then finish:

- Queue + direct `Filter + Order` controls;
- Review draft lifecycle and visible-order progression;
- explicit Review exit back to the full Triage List in both wide and constrained compositions;
- shared Confirmation for Delete;
- shared transient Esc/focus behavior where required;
- Triage Creation Composer path;
- Selection/Action owners only where Triage now proves a real need;
- no navigation-as-save and no Review history node.

Exit: Triage is the first complete final V1 vertical rather than another partial phase checkpoint.

Current status:

- **Stage 5 complete / Host-proven** — the Triage functional chain, shared picker/popover/confirmation/composer ownership, Review composition, and shared visual grammar are green through focused/full automated validation and representative real-Obsidian checks.
- **Stage 5 closed** — the final host acceptance used a real Standard Composer modal with its Priority picker open and found no host-specific contradiction in typography, density, transient geometry, layering, or selected/check grammar. Later Pages consume these accepted owners rather than reopening Stage 5 calibration.

### Stage 6 — Projects Root + Initiative Focus

Implement in dependency order:

- shared Status Presentation plus Project Summary projection/row;
- Group Header / Empty State where missing;
- Project Timeline production presentation owner and semantic geometry input contract, first calibrated in Foundation from representative projection fixtures;
- Projects Root Read Model and real List/Timeline composition over the same filtered Project collection;
- Initiative Focus Read Model reusing the Project collection owner;
- Initiative Inspector Read Model/content using the established Right Sidebar carrier;
- Project/Initiative creation through shared Composer when required.

Fixture-first ordering is allowed inside Stage 6: the Timeline and other reusable visual owners may be implemented and Lab-proven from semantic fixtures before their real Query wiring is complete. Stage 6 exit still requires the real Projects Root/Initiative Focus paths to consume those same owners; fixture logic must not duplicate Timeline eligibility/span derivation or other Query-owned facts.

Current status:

- **Stage 6 complete / Host-proven and closed** — Projects Root and Initiative Focus both use explicit top-level Read Models, and Initiative Focus reuses the established Project collection/query/UI owners rather than creating a parallel Project system.
- **Initiative Focus is complete** — it owns the `Projects / Initiative` breadcrumb, optional Main View narrative, flat Project List, scoped Filter registry, all-lifecycle default visibility, true/filtered empty semantics, and stable Project navigation while reusing Project Summary Row and shared collection controls.
- **Scoped Project creation is complete** — the standard Project Composer accepts the current Initiative as clean invocation prefill while keeping the Initiative relation editable; Stage 6 does not pull Initiative creation forward because no Stage 6 Product surface requires that invocation.
- **Initiative Inspector is complete** — an explicit Read Model feeds compact Priority, Labels, and Due properties through the established Obsidian Right Sidebar carrier. Initiative description remains Main View narrative rather than duplicated sidebar filler.
- **Shared optional Due ownership is aligned** — Composer and Initiative Inspector consume the same production optional-Due property owner rather than carrying separate picker/date logic.
- **Validation is green at the release boundary** — focused Initiative Inspector coverage passed 6 test files / 12 tests; the cumulative repository passed 144 test files / 498 tests plus production build/typecheck and diagnostics build. Real Obsidian verification confirmed Initiative Focus composition, automatic Right Sidebar Inspector targeting, and successful Priority/Labels/Due edits without a host-specific layout or transient-layer contradiction.

Compact Status presentation remains explicit: Project and Workflow Issue scanning rows use the semantic Status glyph as the visible lifecycle identity and do not repeat the configured Status label as a parallel text column. The label remains available for accessibility and text-bearing section/detail/picker contexts.

### Stage 7 — Project Workspace + Project Inspector

Implement:

- Project Workspace Read Model;
- persistent Status sections;
- Issue Row semantic projection/variants;
- Project-scoped Filter/order rules;
- Project Inspector Read Model;
- Progress / Temporal Attention / Milestones;
- lifecycle capabilities and Page actions.

Current status:

- **Stage 7 complete / Host-proven and closed** — `ProjectWorkspaceReadModel` evaluates one readable Runtime snapshot, scopes Workflow Issues to the current Project, preserves the complete configured Status skeleton, applies Status/Priority/Milestone/Labels/Due/Estimate filters, and orders Issues deterministically inside Status sections without persisted manual rank.
- **Project-local Issue scanning is complete** — the production Workflow Issue Row reuses shared Priority/Labels/Due/Estimate presentation, omits redundant Project/Status text where Page/section scope already carries it, exposes Current Cycle and Milestone context, and is exercised by Foundation as a production-owner consumer.
- **Scoped Issue creation is complete** — Project Workspace uses the standard Issue Composer with the owning Project as clean prefill; terminal Project lifecycle states suppress creation instead of duplicating Domain legality in the Page.
- **Project Inspector is complete** — the established Right Sidebar carrier hosts Status, Initiative, Priority, Labels, Due, derived Progress, Temporal Attention, and Milestones from an explicit Read Model; Milestone quick-create remains a small Inspector-owned invocation over existing Application semantics.
- **Inspector host behavior is calibrated** — entering a stable Trail target reveals Trail Inspector when the Right Sidebar is already visible, while a collapsed Right Sidebar still uses the entry-time Main View width threshold; unrelated Obsidian Right Sidebar views are not destructively detached. Inspector text hierarchy and Milestone quick-create containment are host-verified.
- **Validation is green for the implemented Stage 7 owners** — focused Project Workspace/Inspector, diagnostic-wrapper, host-carrier, and shared-owner suites pass with lint plus production and diagnostics typecheck/build. The closure publication uses repository-wide `npm run check` under the calibrated Vitest worker policy below.

### Stage 8 — Issue interaction/detail chain

Build one coherent detail chain while maturing shared interactions only from real consumers:

```text
Issue Row/Card                         accepted
→ read-only Peek                       accepted
→ Issue Full Item                      accepted
→ Issue Inspector                      accepted

Shared interaction track:
Collection Selection                   accepted
→ Action Registry + context resolution accepted
→ Context Menu / overflow + Bulk Bar   accepted over the same registry
```

Picker, Confirmation, and Composer mechanics already exist and should be reused. Do not create parallel Issue-only or Bulk-only action semantics.

### Stage 9 — Project execution views + Sidebar Search

After Issue collection/interaction owners are stable:

- Project Board and Status drag mutation;
- Project deletion/settings integration;
- final Sidebar Search mode using only Initiative/Project/Workflow Issue Read Models and normal navigation.


Projects Timeline is no longer deferred to Stage 9. Its presentation owner, derived Query projection, and real Projects Root integration belong to Stage 6 so the Projects Root List/Timeline contract is completed as one Product surface.
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

Stages 0 through 5 are closed. The accepted Stage 5 executable checkpoint is `5049156861edd0b357efb70053797726c3877b71` (`refactor: align shared visual grammar`). Do not reopen Stage 5 unless later repository evidence creates a concrete contradiction with its frozen Product/UI/ownership contracts.

### Stage 5 closed — Triage vertical

Stage 5 is complete. The Triage Page Read Model, direct Filter + Order controls, Review draft/progression semantics, explicit Review exit, shared Confirmation, standard Triage Creation Composer, destination-first Accept into standard Issue or Project creation, and final shared visual grammar are implemented and accepted through automated and representative host evidence.

Published checkpoints for that chain include:

```text
6e9514d91cd3661b092aa4deb2ac760e6e935044  feat: checkpoint triage accept flow
eb003e33e9b69efc858f3f8c5f462f53e1f806a4  refactor: share composer presentation
f71cccb0d595a7ccdd1482699400cfd518ed2bd8  refactor: checkpoint composer visual calibration
0398b8e1d8073cedd7215d1866046b2b579d1cb1  refactor: calibrate picker surface visuals
3cc7b4ac54ceea0a40dc88519893875c0132f2b6  refactor: calibrate triage review presentation
5049156861edd0b357efb70053797726c3877b71  refactor: align shared visual grammar
```

`TrailComposerSurface` is the reusable production presentation owner; `TrailComposer` continues to own modal mechanics such as Portal/overlay/focus/Esc/dirty-dismiss/submit feedback. Foundation consumes the same production surfaces as Triage/Issue/Project creation and must not create Lab-only Product UI.

The accepted Stage 5 calibration extends Foundation coverage without reopening Stage 3 or Stage 4 contracts:

- real Priority / Labels / Due property owners, Triage collection controls, Review surface, Confirmation, and the Standard Composer family are visible from Foundation fixture data;
- reusable confirmation content remains separated from modal mechanics so default/destructive visual states can be compared without opening a Dialog;
- picker/popover surfaces now use responsibility-driven geometry: compact action menus are content/trigger driven, searchable pickers retain readable width, and showroom flow no longer stretches intrinsic transient surfaces;
- shared menu-search chrome, selected/check placement, hover grammar, and label multi-select scanning are aligned through production owners instead of page-specific overrides;
- Collection Row owns the shared leading-to-content rhythm so Triage no longer carries a private spacing repair and later row consumers inherit the same scanning grammar;
- Triage Review composition is tightened into a continuous editor surface with navigation separate from title/properties/body/disposition actions, without changing workflow semantics;
- Standard Composer typography/density is brought back to the shared application scale: title is the only clearly elevated text role, body uses normal reading scale, controls/buttons reuse shared density, and modal-child picker layers change elevation rather than inventing a larger menu scale;
- Foundation verification remains split into State Gallery, Composition Gallery, and Interaction Mechanics so visual endpoints, assembled layout, and shared state-transition feedback are not tested as the same thing.

Automated evidence is green for the shared grammar checkpoint: the repository-wide suite passed 123 test files / 445 tests with diagnostics typecheck/build, and the final Composer-density refinement passed its focused Composer/Foundation suite plus diagnostics build. Representative Foundation and real-Triage host screenshots confirm the row, transient, Review, and Composer presentation. Final host acceptance additionally verified a real Standard Composer modal with its Priority picker open; modal typography/density and child-picker geometry/layering remained consistent with the accepted shared grammar.

The next implementation sequence is:

```text
begin Stage 6 from the accepted shared owners
-> define the Stage 6 UI coverage plan and semantic fixture shapes
-> implement/Lab-prove Status, Project Summary, Group/Empty, and Timeline production owners
-> implement the Projects Root Read Model and wire the same owners into real List/Timeline composition
-> implement Initiative Focus by reusing the Project collection owner
-> implement Initiative Inspector content through the established Right Sidebar carrier
-> add Project/Initiative creation through the shared Composer only when the Product surface requires it
```

Selection / Action Registry / Bulk / Peek remain deferred because the completed Triage workflow has not proven a need to pull them forward. Their deferral must not be used as a reason to create Foundation-only substitutes.

Stage 5 closure conditions are satisfied:

1. Triage Domain/Query/Application/workflow semantics remain green;
2. shared production owners carry row rhythm, transient geometry/search/selection, Review composition support, and Composer density without Page-local duplicate mechanisms;
3. wide and constrained Triage compositions preserve the closed Stage 4 containment contract;
4. a real Standard Composer plus modal-child Priority picker is Host-proven in Obsidian;
5. shared visual owners are accepted for reuse by later Product stages.

Recorded exit evidence:

- Triage retains one explicit Page Read Model and no Page-local duplicate Domain/Query semantics;
- Queue exposes the frozen direct Filter + Order grammar and Review behavior remains functionally green;
- Confirmation / Picker / transient focus / Composer responsibilities are shared at the correct production layer and Foundation only consumes them;
- State Gallery exposes representative visual endpoints, Composition Gallery proves assembled hierarchy/spacing, and Interaction Mechanics proves each shared transition once rather than duplicating workflow tests;
- wide and constrained desktop compositions preserve the Stage 4 containment contract;
- representative real-Obsidian visual verification establishes accepted transient, Review, and Composer presentation;
- factual documentation records the closed Stage 5 state before Stage 6 implementation proceeds.

### Stage 6 closed - Projects Root + Initiative Focus

Stage 6 is complete. Projects Root, Initiative Focus, scoped Project creation, and Initiative Inspector now form one coherent Project planning vertical over the accepted shared owners.

Published Stage 6 checkpoints leading into the closure include:

```text
b68d3848c39a55dfa625f8ecc8d78f40c4383f34  feat: establish stage 6 status and project summary
952d5ce47610cdb84e6c5e8a21235f01ca4c999a  feat: establish stage 6 group and empty patterns
79c5660548f53482dc59db51a24960f8836b1214  feat: establish stage 6 project timeline
64d377721ce9a9257b450a7741f6e8261c2371fa  feat: establish stage 6 projects root
f1a684d79ed0641ce0f641bf3e86558b5d2731fb  test: harden stage 6 regression boundaries
30c57736fbc4b0fc064a77d643741a4fbde3496c  feat: complete stage 6 initiative focus
```

Closure facts:

- Projects Root List and Timeline remain two presentations over one filtered Project collection, with Initiative navigation crossing the Obsidian ViewState/history boundary;
- Initiative Focus uses its own explicit Read Model over the same Project collection owner, remains flat List-only, shows all lifecycle states by default, and removes Root-only Initiative/Timeline controls;
- Initiative Focus `+` invokes the standard Project Composer with the current Initiative as clean, editable prefill rather than creating a second creation surface;
- Initiative description remains Main View context, while the Initiative Inspector projects stable structured properties only;
- Initiative Inspector uses the established Right Sidebar carrier and existing Priority/Labels/property mechanics, with optional Due extracted into one shared production owner reused by creation and Inspector editing;
- Foundation continues to exercise production owners rather than duplicating Product Page markup or workflow truth.

Stage 6 release evidence is complete: the final focused Inspector suite passed 6 test files / 12 tests, the cumulative repository passed 144 test files / 498 tests, production build/typecheck and diagnostics build passed, and representative real-Obsidian validation confirmed Initiative Focus plus Right Sidebar composition and successful Priority/Labels/Due mutations. The accepted Projects Root List/Timeline host evidence remains valid because the closure work reused those owners without reopening their visual contract.

Stage 6 is closed. Selection / Action Registry / Bulk / Peek remain deferred; no Stage 6 consumer proved a need to pull them forward.

### Stage 7 closed - Project Workspace + Project Inspector

Stage 7 is complete. Project Workspace and Project Inspector extend the accepted Project planning owners into one Project-local execution vertical without introducing parallel Runtime, Query, collection, creation, property, or Right Sidebar systems.

Closure facts:

- `ProjectWorkspaceReadModel` owns Project-scoped Issue projection over one readable Runtime snapshot, the persistent complete Status skeleton, deterministic section-local ordering, Current Cycle/Milestone context, Filter options, true/filtered empty semantics, and lifecycle capabilities.
- Project Workspace consumes the production Workflow Issue Row and shared collection/filter/property grammar. Standard Issue creation carries the current Project as clean editable context rather than creating a Page-local composer.
- `ProjectInspectorReadModel` owns stable structured properties plus derived Progress, Temporal Attention, and Milestone projections; description remains Main View narrative instead of duplicated sidebar content.
- Milestone quick-create is contained within the Project Inspector and reuses shared Due/property mechanics.
- Right Sidebar entry behavior now distinguishes an already-visible host sidebar from a collapsed sidebar: visible sidebars switch to Trail Inspector on stable Trail targets, while collapsed sidebars retain the calibrated width-based auto-reveal policy. Unrelated Obsidian sidebar views remain intact.
- Representative Obsidian validation covers Project Workspace scanning, Project-prefilled Issue Composer, Project Inspector data/contrast, Right Sidebar retargeting, and Milestone quick-create geometry.

At Stage 7 closure, Selection / Action Registry / Bulk / Peek were still deferred because that stage did not require them. Stage 8 has since implemented and accepted Selection, Peek, Action Registry/context resolution, Context Menu/overflow, and Bulk Bar; Board remains Stage 9.

### Stage 8 closed - Issue interaction/detail chain

Published Stage 8 checkpoints leading into the closure candidate include:

```text
252f58a5ffa69f1277f98c5d050fb3c9d2c73ffc  feat: checkpoint stage 8 issue peek and diagnostics
bbc59d00316f81e3c124125e403a5f036d23b175  feat: align issue rows and collection selection
966793133cf9eb17b301d4b4e1cca99e66acd567  fix: enforce project-scoped issue capabilities
f8cca74b972f5f8c3556cc4165fabd230500e1a3  feat: expose effective issue capabilities
87af9fde560974f195ee619c91c5a6c4531daa74  feat: establish stage 8 issue actions
3e80278f7ae9f8d8a9dda930403571562eb2d158  feat: establish stage 8 issue full item
```

Closure facts:

- the production Workflow Issue Row is shared by Foundation and Project Workspace and uses `Selection | Priority | Status + Title | soft semantic columns`; unset Priority and missing trailing values render no placeholder text while their semantic tracks preserve scan alignment;
- Status remains visible per Issue even inside a Status section; no human-readable Workflow Issue identifier is introduced merely to separate leading semantics;
- shared Collection Selection is implemented through the existing Collection Row gutter and is Consumer-proven in Project Workspace, Projects Root, and Initiative Focus; checkbox selection is isolated from row activation/Peek, Shift extends through current visible order, `X` toggles eligible focused rows, and `Esc` clears selection only when no higher transient layer owns it;
- read-only Workflow Issue Peek is implemented and accepted for Project Workspace: open/retarget/adjacent browsing remain transient, do not create host history, do not change selection, and do not retarget the persistent Inspector;
- Query exposes Workflow Issue EffectiveCapabilities plus legal Status and Project targets from one readable snapshot, reusing canonical Domain lifecycle rules and Project-target selection rather than moving legality into UI;
- one Workflow Issue Action Registry owns stable action identities plus context resolution over explicit Issue and selection scopes. Right-click on a selected Issue may use the relevant selection; right-click on an unselected Issue and Peek overflow remain explicit-item scopes without destroying retained selection;
- Project Workspace Context Menu, Peek overflow, and Bulk Bar consume the same registry. Bulk availability requires every selected Issue to support the action, and target-bearing actions intersect the ordinary per-Issue legal target sets;
- Move-to-Project uses the Obsidian searchable picker over Query-owned legal destinations. Compact native Context Menus use intrinsic Trail action width with a bounded maximum, while searchable relation pickers retain a wider readable search surface;
- Delete is exposed through the existing Issue Application intent and shared Confirmation. Confirmation remains the top transient layer; cancel/Esc restores focus to the surviving row/Peek/Bulk trigger so subsequent Esc handling returns to Peek or Collection Selection instead of being lost at the host boundary;
- Foundation exercises the production Bulk Bar and Peek action affordance rather than owning a parallel specimen-only action system;
- the Stage 8 action checkpoint passed repository-wide `npm run check` with 166 test files / 568 tests, production typecheck/build, and diagnostics typecheck/build. Representative real-Obsidian verification covered native right-click actions, legal searchable Move targets, Peek overflow, Bulk selection scope, destructive confirmation, layered Esc/focus restoration, retained selection for explicit unselected-row context, and final compact Context Menu geometry;
- Issue Full Item is implemented as a stable `Issue(issueId)` Main View route over a focused Read Model. Ordinary Workflow Issue activation still opens read-only Peek; explicit `Open full item` is the stable host-navigation handoff, and Page ancestry navigation remains injected through the shell/Obsidian ViewState boundary;
- Full Item title and lightweight Markdown body remain Page-local editing responsibilities. Title editing has no permanent Edit/Save/Cancel chrome, body editing uses host-provided CodeMirror Markdown conventions, and writes reuse the existing Issue Application edit intent rather than adding a second Runtime, persistence, or mutation authority;
- the Stage 8A Full Item checkpoint passed repository-wide `npm run check` with 171 test files / 580 tests, production typecheck/build, and diagnostics typecheck/build. Representative real-Obsidian verification covered Peek -> Full Item navigation, low-chrome Markdown read presentation, CodeMirror edit/cancel behavior, host history return, and stable retargeting to the Issue Inspector carrier;
- `IssueInspectorReadModel` projects Status, Project, Priority, Milestone, Labels, Due, Estimate, and Current Cycle context from one readable Runtime snapshot. Inspector writes reuse existing Issue Application intents, while Current Cycle membership remains Cycle-owned and uses the existing Cycle Application intent instead of becoming a duplicate Issue property;
- Project and Milestone editing reuse the shared searchable relation-property mechanics, and Estimate editing uses one shared production owner consumed by both the standard Issue Composer and Issue Inspector. Completed-Issue Estimate legality remains Domain/Application-owned rather than Inspector-owned;
- Full Item and Issue Inspector form one persistent detail workspace: moving focus into the Obsidian Right Sidebar does not unmount the CodeMirror body editor. The editor naturally loses its visible caret while Inspector owns focus, but its draft and undo/cancel session survive Inspector interaction;
- Inspector mutation feedback stays local and quiet instead of disabling and repainting the entire property surface. Each Inspector intent resolves against the latest effective Issue projection so rapid sequential edits continue from optimistic Runtime state rather than a stale UI closure;
- the final Stage 8 closure candidate passed repository-wide `npm run check` with 174 test files / 593 tests and production typecheck/build. The final host repair also passed its focused Body Editor + Issue Inspector suite (2 files / 10 tests), lint, and diagnostics typecheck/build. Representative real-Obsidian verification covered Full Item + Issue Inspector composition, property editing without whole-Inspector flashing, and preservation of CodeMirror draft plus undo/cancel semantics across Main View / Right Sidebar focus changes.

Stage 8 is closed. **Stage 9 — Project execution views + Sidebar Search** is active. Project Board, Status drag mutation, Project deletion/settings integration, and final Sidebar Search must reuse the accepted Selection/Action/Peek/Full Item/Inspector owners rather than fork Issue semantics.

## 10. Slice Definition of Done

A code slice is complete only when:

- its canonical contract is already resolved;
- production ownership is correct;
- changed public contracts have their consumer graph closed;
- reusable visual owners have representative Foundation coverage when applicable;
- an explicit fixture-first visual checkpoint may stop at Implemented/Lab-proven, but Accepted/stage-exit status requires at least one real Product consumer unless the slice is explicitly Host/Chassis infrastructure required before Product composition;
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

For Foundation host calibration, use `npm run build:diagnostics`. The production `npm run build` intentionally compiles development UI out and therefore hides the Foundation location; a production build is not a valid Foundation visual-validation build.

### Shared contracts / Domain / schema / tooling / broad refactor

Escalate to repository-wide `npm run check` when the consumer graph is cross-cutting, uncertain, or the change is a formal release gate.

### Test-runner contention calibration

Vitest keeps file parallelism enabled, but normal runs cap `maxWorkers` at `"50%"` so jsdom/React-heavy files do not compete for every available logical worker on faster and slower development machines. Ordinary tests retain Vitest's normal short timeout. Only the two whole-showroom `TrailFoundationLab` tests carry an explicit 30-second timeout because they render the full production-owner showroom and perform broad accessibility/interaction scans; this is contention margin, not permission for ordinary tests to become slow.

If Foundation Lab still approaches that timeout under the capped worker policy, reduce the Lab smoke-test responsibility by moving component-specific assertions to the production owner/specimen tests rather than raising the global timeout again.

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
- normal-flow layout owners allocate real space to direct children so siblings do not overlap, and intentional overflow/escape has an explicit owner;
- stale LocationBar/required-Display/Search-Page contracts are removed;
- Selection/Action/Peek/Composer/Confirmation ownership is shared where frozen;
- Query/Application/Domain remain the single owners of derived facts, legality, and semantic mutation;
- responsive and host-specific behavior is calibrated in real Obsidian;
- full-shell visual presentation is coherent across Trail and relevant native host surfaces;
- representative scale evidence does not require unresolved performance work;
- the final coherent checkpoint passes the appropriate repository/release validation gate and is verified on GitHub.

Historical implementation details remain in Git history. This document remains the current execution plan and active status snapshot, not another chronological archive.

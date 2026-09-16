# Trail Design-to-Code Map

## 1. Purpose and Authority

This document maps resolved Trail design responsibilities to canonical implementation owners. It is traceability, not a duplicate Product/UI specification and not an implementation-progress report.

Authority flow:

```text
Product behavior
-> Domain semantics / invariants
-> Data representation / authority
-> Architecture capability / flow
-> UI behavior when presentation/interaction is involved
-> UI Blueprint composition/shared-owner boundary when relevant
-> canonical code owner
-> owner/direct-consumer verification
```

For read-side UI work, the concrete dependency chain is:

```text
Runtime
-> readable/effective snapshot
-> Query shared projections / Page or surface Read Model
-> Page / Inspector / Sidebar composition
-> production UI components
```

`docs/implementation.md` records whether the mapped owner currently exists, is partial, or still needs alignment.

## 2. Product-to-Owner Map

| Product / UI responsibility | Canonical basis | Target owners | Primary verification |
| --- | --- | --- | --- |
| Quick Capture -> Triage | Triage Issue context + required review Due; no pre-create Domain mutation | Obsidian command adapter, shared creation `ui/interactions`/`ui/patterns`, `application/triage`, Domain planning | Composer interaction + planner/application + representative host |
| Standard Triage/Issue/Project/Initiative creation | existing entity contracts/defaults; no Draft entity | shared Composer `ui/interactions`, `ui/patterns`, entity semantic controls, Query legal-target/default inputs, normal Application use cases | shared UI + target Application/Domain |
| Triage Queue and Review Set | Triage Issue + Due/Priority/Labels; Review Set derived only | `query/triage` Triage Page Read Model, `ui/pages/triage`, shared Filter/Selection/Action owners | Query + UI |
| Triage Review progression | page-local visible/ordered projection; Accept/Defer/Delete complete Review | `ui/pages/triage` consuming `query/triage`; ordinary target Applications | UI workflow + Application + host where needed |
| Triage Accept -> Issue/Project | destination-first new identity; title/body seed only | `ui/pages/triage`, shared Composer, `application/triage`, `application/issues`/`projects`, mutation/source-sync | planner/application + UI + persistence convergence |
| Workflow Issue creation | exactly one legal Project; starts Backlog | Query legal target/default candidate, shared Issue Composer, `application/issues`, Domain planning | Query + UI + planner/application |
| Project / Initiative creation | Project uses configured Unstarted default; Initiative no Status | shared Composer, `application/projects` / `application/initiatives`, Domain planning | UI + Application/Domain |
| Project deletion | current Default illegal; child Issues require legal replacement; old Project Milestones removed | `domain/planning`, `application/projects`, Query legal targets, mutation/source-sync | planner + execution + representative host |
| Default Project | required normal-ready Workspace reference to ordinary Project | Domain model/validation/planning, `application/workspace`, source-sync bootstrap/recovery, plugin-data persistence, Query, Settings adapter, navigation shell | bootstrap + setter + navigation/settings |
| Projects Root | Project collection grouped by Initiative; Page-owned header; List/Timeline | `query/projects` Projects Root Read Model, `ui/pages/projects`, shared Project Row/Group Header/Filter/Timeline mechanics | Query + UI |
| Initiative Focus | Initiative-scoped Project List only | `query/projects` Initiative Focus Read Model, `ui/pages/projects`, Initiative Inspector/entity UI | Query + UI |
| Project Workspace | Project-scoped Issue collection; lifecycle-dependent List/Board | `query/projects` Project Workspace Read Model, `ui/pages/projects`, Issue Row/Card, Status Section, Board patterns | Query + UI + focused Application interactions |
| Project Timeline | derived current lifecycle/Due projection; no persisted plan-time model | `query/derived` + project Read Model, `ui/pages/projects` Timeline composition | Query semantics + UI geometry |
| Project/Milestone Progress | Completed / current non-Canceled scope | `query/derived`, shared Progress owner, Inspector/Page Read Model consumers | derived Query + UI |
| Project Temporal Attention | unfinished child Issues with Due; mutually exclusive temporal buckets | `query/derived`, Project Inspector Read Model, segmented-summary pattern | derived Query + UI |
| Shared collection Filter | one property/value grammar; location-scoped session state | shared Query filter helpers, Page Read Model input, `ui/interactions`, `ui/patterns` | Query semantics + shared interaction |
| Shared Collection Controls | no mandatory Display; Page supplies actual controls | `ui/patterns` composition-oriented controls + Page owners | shared UI + real Page consumers |
| Shared Issue Row/Card | stable semantic metadata hierarchy with context omission | `ui/entities`, `ui/patterns/trail-collection-row`, semantic property owners; props supplied by Read Models or Foundation fixtures | entity UI + Page/Foundation consumer tests |
| Selection and Bulk | transient visible/actionable identities; common legal-target intersection | `ui/interactions`, Bulk pattern, Query capability/target selectors | shared UI + focused Application |
| Workflow Issue Status drag | Status-only mutation on explicit Status spatial targets; same-concrete-Status selection may drag together while mixed-Status selection is not a multi-drag scope | focused `ui/interactions` Status-drag owner, Query legal Status target/input facts, `application/issues` Status intent; Project/Cycle List/Board consumers | shared interaction + Query/Application + representative host pointer evidence |
| Action Registry | one action identity/context/capability authority | `ui/interactions`, existing Application intents, Query capabilities/targets, Obsidian binding adapter | shared UI + Application + host keybinding |
| Context Menu / overflow / contextual Command Menu | presentations over Action Registry | Obsidian Menu adapter/mechanics + `ui/interactions` / `ui/patterns` | interaction + representative host |
| Workflow Issue Peek | read-only transient preview; no navigation/Inspector retarget | `query` Issue presentation projection, `ui/interactions` + Peek surface pattern | Query + UI interaction + responsive/focus host evidence |
| Picker family | shared select/search/multi/date mechanics; semantic legality outside generic shell | `ui/interactions`, `ui/patterns`, `ui/entities`, Query where target legality applies | shared interaction + semantic consumers |
| Confirmation | top-layer safe Cancel/confirm mechanics | `ui/interactions`, reusable confirmation pattern | interaction/focus + workflow consumer |
| Transient interaction stack | topmost Esc/outside-click/focus ownership | `ui/interactions` | interaction tests + host focus where needed |
| Current Cycle collection | Open Cycle membership + live Issue facts | `query/cycles` Current Cycle Read Model, `ui/pages/cycles`, shared Issue collection/Filter/Selection/Peek | Query + UI |
| Cycle membership | Cycle owns membership; orthogonal to Issue properties | Domain planning, `application/cycles`, Query target/candidate selectors, shared actions | planner/application + Query/UI |
| Cycle lifecycle | Start / ordinary Close / pre-close transfer + Start-next; at most one Open; no automatic rollover | Domain planning, `application/cycles`, `query/cycles`, `ui/pages/cycles` | planner/application + UI |
| Cycle Progress / Effort | Progress Completed/non-Canceled; Effort configured Estimate weights | `query/derived`, Cycle Read Models/Page/Inspector, shared Progress | Query + UI |
| Historical Cycle | retained final membership + current live Issue fields; no close-time snapshot | `query/cycles` Historical Cycle Read Model, `ui/pages/cycles`, shared Issue Row/Filter/Peek | Query + UI |
| Home | current temporal/runtime facts + Weekly Update utility; no snapshot/score Domain | `query/home` Home Read Model, `ui/pages/home`, utility persistence, shared Progress/segmented/creation owners | Query + UI |
| Sidebar Search | Initiative/Project/Workflow Issue discovery; no Search Page/Peek/Triage results | `query/search` Sidebar Search Read Model, `ui/shell`, shared result-list/navigation patterns | Query + Sidebar UI + host keyboard/focus |
| Issue Full Item | stable Issue identity + lightweight Markdown body + structured Inspector | Issue Full Item Read Model, dedicated Issue Page/editor owner, Issue semantic UI, Obsidian/CodeMirror adapter conventions | Query + editor/UI + representative host |
| Persistent Inspectors | effective entity presentation projection; host Right Sidebar | Query Inspector Read Models/entity presentation, Inspector compositions, Obsidian side-view adapter | Query + UI + host side-view |
| Workspace Frame / layout containment / responsive composition | actual pane capacity; Page-owned header/breadcrumb; owned normal-flow regions | `ui/shell` Frame/Page Surface for Main View capacity; direct-child allocation by owning `ui/pages`, `ui/patterns`, and `ui/entities`; Obsidian adapter for host pane capacity | UI + representative pane/split/sidebar sizes + constrained containment |
| Runtime/Data-Issue feedback | Runtime control/pending/health + LKG; no feedback Domain facts | Runtime/Query inputs, surface Read Models, shared feedback patterns/shell, Obsidian host actions such as Open source | runtime/query + UI + performance/host |
| External managed-file change | authoritative persistence + refresh/source-health convergence | source-sync/runtime/persistence/adapters | source-sync + representative host |
| Breaking legacy schema upgrade | explicit one-way migration only | `migration` plus normal persistence/validation owners | migration + full consumer graph |

## 3. Core Capability Ownership

### 3.1 Domain

| Responsibility | Owner | Must not be redefined in |
| --- | --- | --- |
| Entity / Configuration / Workspace State contracts | `plugin/src/domain/model/` | UI, Markdown codecs, adapters |
| lifecycle/value rules | `plugin/src/domain/rules/` | pages/persistence |
| field/reference/workspace validation | `plugin/src/domain/validation/` | codecs or UI copies |
| pure semantic mutation planning | `plugin/src/domain/planning/` | Application/Persistence duplication |

Workflow Issue Project requiredness and current-Default delete illegality are Domain/planning facts. `Standalone` remains only a bootstrap title for an ordinary Project.

### 3.2 Persistence and Markdown

| Responsibility | Owner |
| --- | --- |
| managed paths | `plugin/src/markdown/schema/trail-paths.ts` |
| physical schema / canonical field order | `plugin/src/markdown/schema/trail-physical-schema.ts` |
| shared Markdown structural operations | `plugin/src/markdown/core/` |
| source codecs | `plugin/src/markdown/codecs/` |
| authoritative Domain source repository | `plugin/src/persistence/domain-sources/` |
| Plugin Configuration / Workspace State persistence | `plugin/src/persistence/plugin-data/` |
| Weekly Update utility persistence | `plugin/src/persistence/utility-sources/` |
| host-agnostic persistence ports | `plugin/src/persistence/ports/` |

Creation/Filter/Selection/Peek/interaction state adds no persistence branch.

### 3.3 Mutation and Runtime

| Responsibility | Owner |
| --- | --- |
| logical Mutation Plan | `plugin/src/mutation/plans/` |
| coordination / pending plan lifecycle | `plugin/src/mutation/coordinator/` |
| global serial mutation order | `plugin/src/mutation/queue/` |
| physical materialization / placement | `plugin/src/mutation/physical/` |
| Single / Source Transition / Integrity Batch execution | `plugin/src/mutation/execution/` |
| committed Runtime | `plugin/src/runtime/store/` |
| optimistic effective projection | `plugin/src/runtime/projection/` |
| reconciliation | `plugin/src/runtime/reconcile/` |
| source ownership | `plugin/src/runtime/ownership/` |
| indexes | `plugin/src/runtime/indexes/` |
| control/source health | `plugin/src/runtime/control/` and runtime health types |

Runtime remains the one central in-memory operational store. Read Models must not become another mutable Runtime or entity cache authority.

### 3.4 Source Sync, Query, and Application

| Responsibility | Owner |
| --- | --- |
| bootstrap/discovery/refresh/convergence | `plugin/src/source-sync/` |
| Default Project missing-reference recovery | `plugin/src/source-sync/bootstrap/` + normal persistence owners |
| readable/effective snapshot policy | `plugin/src/query/shared/` consuming `plugin/src/runtime/projection/` |
| shared entity/presentation projections | focused modules under `plugin/src/query/shared/` and `plugin/src/query/derived/` |
| shared filter/sort/group semantics and legal targets | `plugin/src/query/shared/` |
| Page / Inspector / Sidebar Read Models | focused product modules under `plugin/src/query/<surface-or-area>/` |
| derived Progress/Attention/Timeline/Cycle calculations | `plugin/src/query/derived/` or focused Query modules |
| Triage selectors / Page Read Model | `plugin/src/query/triage/` |
| Projects Root / Initiative / Project Workspace / Inspector Read Models | `plugin/src/query/projects/` |
| Cycle selectors / Read Models / candidates | `plugin/src/query/cycles/` |
| Home Read Model | `plugin/src/query/home/` |
| Sidebar Search Read Model | `plugin/src/query/search/` |
| semantic user use cases | `plugin/src/application/<business-area>/` |
| create-time similarity guard | `plugin/src/application/similarity/` + Query/helper logic |

A top-level surface Read Model evaluation should acquire one readable Runtime snapshot and pass it through snapshot-aware helpers rather than repeatedly rebuilding Effective Runtime inside nested selectors. UI-local Filter/Order/temporal values may be explicit Query inputs without becoming Runtime authority.

UI supplies explicit selected targets to Application/Domain; absence is never interpreted as a hidden Project fallback.

### 3.5 Read architecture boundary

```text
Runtime Store
-> readable/effective snapshot
-> shared Query projections
-> surface Read Model
-> Page / Inspector / Sidebar composition
-> production UI components
```

Rules:

- Page/shell/Inspector compositions may invoke Query and subscribe to Read Models.
- `ui/primitives`, `ui/patterns`, and reusable `ui/entities` consume semantic props; they do not import Runtime Store/indexes or call Page Query to obtain their own data.
- Read Models are immutable/rebuildable projections, not persisted data and not mutable stores.
- surface-specific Read Models are introduced just in time; no universal `TrailEverythingViewModel` is a target.
- one explicit `now` is passed when a projection needs temporal semantics.
- memoization is evidence-driven; first remove repeated snapshot rebuilds within one top-level evaluation.
- writes always return to Application/Domain/Mutation rather than mutating a Read Model.

## 4. UI Ownership

### 4.1 Dependency direction

```text
tokens / host visual mapping
-> primitives
-> patterns
-> semantic entity UI
-> shared interactions
-> Page / Inspector / shell composition
```

Foundation Lab is a development showroom and calibration consumer of production owners:

```text
production warehouse owner
   |- Foundation fixture/specimen
   `- real Page/surface consumer
```

Foundation may own specimen wrappers, descriptions, controls, and fixture data. The reusable component being shown remains a production owner. Production code must not depend on Foundation-only components, fixtures, routes, or styles.

### 4.2 Shared UI owners

| Responsibility | Target owner | Explicit non-responsibility |
| --- | --- | --- |
| Workspace Frame / Page Surface | `ui/shell` + thin shared pattern where useful | no mandatory Location Bar/breadcrumb/title or Page workflow |
| Normal-flow layout containment / spatial allocation | whichever owner directly arranges the children: `ui/shell`, `ui/pages`, `ui/patterns`, or `ui/entities` as applicable | no `UniversalLayout`; a child does not position unrelated siblings; no uncontrolled overflow |
| Page Header | `ui/patterns` | Page supplies actual identity/ancestry/actions |
| Collection Controls | `ui/patterns` | no required Display; Page supplies Filter/Order/Layout/etc. |
| Collection Row shell | `ui/patterns` | no Domain field knowledge and no Runtime lookup |
| Group Header / Status Section / Empty State | `ui/patterns` + semantic props | no Page/query ownership |
| Progress / basic controls | `ui/primitives` or thin patterns | no entity-specific calculation |
| segmented summary | `ui/patterns` | not Progress and not query bucket owner |
| semantic Status/Priority/Due/Label/Estimate/Cycle identities | `ui/entities` | no Page workflow and no self-fetching from Runtime |
| Issue Row/Card / Project Summary Row | `ui/entities` | no collection scope/filter/order and no Runtime lookup |
| Filter/Selection/Action/Peek/Picker/Confirmation/transient stack/Composer state | `ui/interactions` | no persisted Domain/Runtime truth |
| Bulk/Composer/Popover/confirmation surfaces | `ui/patterns` over interactions/primitives | no workflow-specific business semantics |
| Product workflows | `ui/pages/*` | must not leak into generic owners |
| Foundation showroom organization | `ui/foundation` | may display production owners but never redefine them |

### 4.3 Page-local compositions

Keep these local rather than extracting universal components:

- Triage Review progression;
- Project Workspace as a whole;
- Current Cycle Project swimlanes;
- Projects Timeline;
- Add Issues workflow;
- Start/Close/Start-next Cycle flows;
- Home module composition and its Heatmap/Work Trend visualizations;
- Weekly Meeting Notes workflow;
- Project Delete replacement-Project flow;
- Issue Full Item editor;
- Page-specific breadcrumb/title/action sets.

### 4.4 Page / Surface Composition and Consumer Impact Map

This section is the durable UI calibration impact map. It records which production owners are shared, which compositions remain local, and which Product surfaces must be rechecked when a shared owner changes. It is traceability, not a second UI specification: `docs/ui.md` owns behavior/presentation semantics and `docs/ui-blueprints.md` owns the accepted V1 composition blueprint.

Use these scope labels:

- **[G] Global shared** — reused across multiple Product areas; visual changes have broad regression scope.
- **[C] Cluster shared** — reused inside one coherent Product/entity/workflow cluster.
- **[L] Local** — Page/surface-specific composition that should remain local unless a real shared responsibility emerges.
- **[D] Development only** — Foundation showroom/calibration composition; never a production owner.

A surface counts as a consumer when a production-owner visual change can reach it either directly or through a shared child owner. This is intentionally broader than import-only dependency tracking because the purpose is calibration impact analysis.

#### 4.4.1 Production composition tree

```text
Obsidian host
├─ Left Sidebar
│  ├─ TrailNavigation                                      [G shell]
│  └─ Sidebar Search                                       [L shell composition]
│     └─ TrailInput                                        [G primitive]
│
├─ Main View
│  └─ TrailWorkspaceFrame -> TrailPageSurface              [G shell]
│     │
│     ├─ Home                                              [L Page]
│     │  ├─ TrailPageHeader                                [G pattern]
│     │  ├─ TrailHomeWidgetFrame                           [C Home]
│     │  │  ├─ This Week                                   [L]
│     │  │  ├─ Work Pulse                                  [L]
│     │  │  │  ├─ TrailProgress                            [G]
│     │  │  │  └─ TrailSegmentedSummary                   [G]
│     │  │  ├─ Lifecycle Activity                          [L]
│     │  │  ├─ Work Trend                                  [L]
│     │  │  └─ Weekly Meeting Notes                        [L]
│     │  │     └─ TrailMarkdownContent                     [G]
│     │  ├─ shared Standard Composer family                [C creation]
│     │  └─ TrailCycleStart                                [C Cycle]
│     │
│     ├─ Triage                                            [L Page]
│     │  ├─ Page-owned Triage header                       [L]
│     │  ├─ TrailTriageViewControls                        [C Triage]
│     │  │  └─ TrailViewBar                                [G]
│     │  │     ├─ TrailCollectionFilter                    [G]
│     │  │     └─ Order -> TrailViewPopover                [G]
│     │  ├─ Queue                                           [L]
│     │  │  └─ TrailTriageRow                              [C Triage entity]
│     │  │     └─ TrailCollectionRow                       [G]
│     │  │        └─ Priority / Labels / Due               [G semantic UI]
│     │  ├─ TrailTriageReviewSurface                       [L]
│     │  └─ shared Standard Composer family                [C creation]
│     │
│     ├─ Projects Root                                     [L Page]
│     │  ├─ TrailPageHeader                                [G]
│     │  ├─ TrailProjectsViewControls                      [C Projects]
│     │  │  └─ TrailViewBar                                [G]
│     │  │     ├─ TrailCollectionFilter                    [G]
│     │  │     └─ TrailViewLayoutSwitch                    [G]
│     │  ├─ List                                            [L]
│     │  │  ├─ TrailGroupHeader                            [G]
│     │  │  └─ TrailProjectSummaryRow                      [C Project collection]
│     │  │     └─ TrailCollectionRow                       [G]
│     │  │        └─ Project Status / Priority / Progress / Due
│     │  ├─ TrailProjectTimeline                           [L]
│     │  ├─ Selection / Project actions / TrailBulkBar     [C/G interactions]
│     │  └─ TrailProjectComposer                           [C creation]
│     │
│     ├─ Initiative Focus                                  [L Page]
│     │  ├─ TrailPageHeader + breadcrumb                   [G]
│     │  ├─ TrailPageNarrative                             [G]
│     │  ├─ TrailInitiativeViewControls                    [C Projects]
│     │  │  └─ TrailViewBar -> TrailCollectionFilter      [G]
│     │  ├─ TrailProjectSummaryRow                         [C Project collection]
│     │  ├─ Selection / Project actions / TrailBulkBar     [C/G interactions]
│     │  └─ TrailProjectComposer                           [C creation]
│     │
│     ├─ Project Workspace                                 [L Page]
│     │  ├─ TrailPageHeader + breadcrumb                   [G]
│     │  ├─ TrailPageNarrative                             [G]
│     │  ├─ TrailProjectWorkspaceViewControls              [C Issue collection]
│     │  │  └─ TrailViewBar                                [G]
│     │  │     ├─ TrailCollectionFilter                    [G]
│     │  │     └─ TrailViewLayoutSwitch                    [G]
│     │  ├─ List                                            [L]
│     │  │  ├─ TrailGroupHeader                            [G]
│     │  │  └─ TrailWorkflowIssueRow                       [C Workflow Issue]
│     │  │     └─ TrailCollectionRow                       [G]
│     │  ├─ Board                                           [C Project Workspace]
│     │  │  └─ TrailBoard / TrailBoardColumn               [G Board pattern]
│     │  │     └─ TrailWorkflowIssueCard                   [C Workflow Issue]
│     │  ├─ Selection / Status drag / Action Menu          [G interactions]
│     │  ├─ TrailIssuePeek                                 [C Workflow Issue]
│     │  ├─ TrailBulkBar / TrailConfirmation               [G patterns]
│     │  ├─ TrailWorkflowIssueComposer                     [C creation]
│     │  └─ Project Delete flow                            [L]
│     │
│     ├─ Cycles Root                                       [L Page]
│     │  ├─ TrailPageHeader                                [G]
│     │  ├─ TrailEmptyState                                [G]
│     │  ├─ Previous -> TrailCollectionRow                 [G]
│     │  └─ TrailCycleStart                                [C Cycle]
│     │
│     ├─ Cycle                                             [L Page]
│     │  ├─ TrailPageHeader + breadcrumb                   [G]
│     │  ├─ Cycle summary                                  [L]
│     │  ├─ TrailCycleViewControls                         [C Cycle]
│     │  │  └─ TrailViewBar                                [G]
│     │  │     ├─ TrailCollectionFilter                    [G]
│     │  │     └─ TrailViewLayoutSwitch                    [G; current only]
│     │  ├─ Current List                                   [L]
│     │  │  ├─ TrailGroupHeader                            [G]
│     │  │  └─ TrailWorkflowIssueRow                       [C Workflow Issue]
│     │  ├─ Current Board                                  [L Cycle geometry]
│     │  │  └─ TrailCycleBoard                             [L]
│     │  │     ├─ Project swimlanes                        [L]
│     │  │     ├─ TrailStatusGlyph                         [G]
│     │  │     └─ TrailWorkflowIssueCard                   [C Workflow Issue]
│     │  ├─ Historical List                                [L]
│     │  │  └─ TrailWorkflowIssueRow                       [C Workflow Issue]
│     │  ├─ Selection / Status drag / TrailBulkBar         [G interactions/pattern]
│     │  ├─ TrailIssuePeek                                 [C Workflow Issue]
│     │  └─ TrailCycleAddIssues                            [C Cycle]
│     │     └─ Filter / CollectionRow / Checkbox / semantic UI
│     │
│     ├─ Issue Full Item                                   [L Page]
│     │  ├─ Page-owned breadcrumb                          [L composition]
│     │  │  └─ TrailPageBreadcrumbButton                  [G]
│     │  ├─ inline title editor                            [L]
│     │  ├─ TrailMarkdownContent                           [G]
│     │  └─ TrailIssueBodyEditor                           [L]
│     │
│     └─ Foundation Lab                                    [D]
│        └─ consumes production owners for showroom/calibration only
│
└─ Right Sidebar
   └─ TrailInspector carrier                               [G shell]
      ├─ Initiative Inspector                              [L composition]
      │  └─ Priority / Label / Optional Due property selects [G semantic controls]
      ├─ Project Inspector                                 [L composition]
      │  ├─ Status / Relation / Priority / Label / Due     [G semantic controls]
      │  ├─ TrailProgress                                  [G]
      │  └─ TrailSegmentedSummary                          [G]
      ├─ Issue Inspector                                   [L composition]
      │  └─ Status / Relation / Priority / Label / Due / Estimate [G semantic controls]
      └─ Cycle Inspector                                   [L composition]
         ├─ TrailProgress                                  [G]
         ├─ TrailPropertyControl / TrailViewPopover        [G]
         ├─ TrailConfirmation                              [G]
         └─ TrailCycleStart                                [C Cycle]
```

The Board distinction is deliberate: Project Workspace Board consumes the shared `TrailBoard` / `TrailBoardColumn` geometry, while Current Cycle Board owns a separate two-dimensional Project-swimlane composition and only reuses lower-level semantic/card owners. A `TrailBoard` geometry change therefore does not imply that Current Cycle Board changes automatically; a `TrailWorkflowIssueCard` change does affect both.

#### 4.4.2 Page composition matrix

`Shared` lists production owners whose visual calibration can affect more than the Page-local wrapper. `Local` lists compositions that should not be generalized merely to make Pages look structurally similar.

| Product Page | Shared shell/header | Shared collection/entity composition | Shared interaction/transient composition | Page-local composition |
| --- | --- | --- | --- | --- |
| Home | Workspace Frame / Page Surface; Page Header | Progress; Segmented Summary; Markdown content | Action Menu; Standard Composer family; Cycle Start | Home grid; This Week; Work Pulse arrangement; Lifecycle Activity; Work Trend; Weekly Meeting Notes workflow |
| Triage | Workspace Frame / Page Surface; custom Page-owned header | View Bar; Collection Filter; Triage Row -> Collection Row; Priority/Labels/Due | View Popover; Standard Composer family | Queue/Review split; Review progression; review boundary/summary |
| Projects Root | Workspace Frame / Page Surface; Page Header | View Bar; Filter; Layout Switch; Group Header; Project Summary Row -> Collection Row; Empty State | Selection; Project Action Registry; Context Menu; Bulk Bar; Project Composer | Initiative grouping composition; Project Timeline |
| Initiative Focus | Workspace Frame / Page Surface; Page Header/breadcrumb; Page Narrative | View Bar; Filter; Project Summary Row -> Collection Row; Empty State | Selection; Project Action Registry; Context Menu; Bulk Bar; Project Composer | Initiative-scoped flat Project composition |
| Project Workspace | Workspace Frame / Page Surface; Page Header/breadcrumb; Page Narrative | View Bar; Filter; Layout Switch; Group Header; Workflow Issue Row/Card; Collection Row; Board; Empty State | Selection; Status drag; Action Registry/Menu; Peek; Bulk Bar; Confirmation; Issue Composer | Project lifecycle composition; Project Delete flow; List-vs-Board assembly |
| Cycles Root | Workspace Frame / Page Surface; Page Header | Collection Row; Empty State | Cycle Start | Current/Previous Cycle root composition |
| Cycle | Workspace Frame / Page Surface; Page Header/breadcrumb | View Bar; Filter; Layout Switch; Group Header; Workflow Issue Row/Card; Collection Row; Empty State | Selection; Status drag; Peek; Bulk Bar; Add Issues | Cycle summary; Current Cycle Project-swimlane Board; Historical-vs-current assembly |
| Issue Full Item | Workspace Frame / Page Surface; shared breadcrumb button only | Markdown content | shared host/editor mechanics only where adopted | document layout; inline title editing; body editor/read transition; save/error presentation |

Persistent Inspector compositions are separate Right Sidebar surfaces rather than Main View Pages. The carrier is shared, while Initiative/Project/Issue/Cycle Inspector section composition remains surface-local and reuses shared property controls, Progress, Segmented Summary, Popover, Confirmation, and other lower-level owners where applicable.

#### 4.4.3 Shared-owner regression map

Use this reverse map before calibrating a shared owner. Every listed consumer is part of the visual regression surface for that owner even when consumption is nested through another production component.

| Production owner | Scope | Product consumers to recheck |
| --- | --- | --- |
| Workspace Frame / Page Surface | [G] | every Main View Page; Foundation as development consumer |
| Page Header | [G] | Home; Projects Root; Initiative Focus; Project Workspace; Cycles Root; Cycle |
| Page Breadcrumb Button | [G] | Initiative Focus; Project Workspace; Cycle; Issue Full Item |
| View Bar | [G] | Triage; Projects Root; Initiative Focus; Project Workspace; Cycle |
| Collection Filter | [G] | Triage; Projects Root; Initiative Focus; Project Workspace; Cycle; Cycle Add Issues |
| View Layout Switch | [G] | Projects Root; Project Workspace; Current Cycle |
| Collection Row | [G] | Triage Queue through Triage Row; Projects Root/Initiative through Project Summary Row; Project/Cycle Lists through Workflow Issue Row; Cycles history; Cycle Start/Add Issues candidates |
| Group Header | [G] | Projects Root Initiative groups; Project Workspace Status sections; Current Cycle List Status sections |
| Empty State | [G] | Projects Root; Initiative Focus; Project Workspace; Cycles Root; Cycle |
| Workflow Issue Row | [C Workflow Issue] | Project Workspace List; Current Cycle List; Historical Cycle List |
| Workflow Issue Card | [C Workflow Issue] | Project Workspace Board; Current Cycle Board |
| Project Summary Row | [C Project collection] | Projects Root; Initiative Focus |
| Triage Row | [C Triage] | Triage Queue |
| Progress | [G] | Projects Root/Initiative through Project Summary Row; Home Work Pulse; Project Inspector; Cycle Inspector |
| Segmented Summary | [G] | Home Work Pulse; Project Inspector |
| Status/Priority/Due/Label/Estimate semantic UI | [G] | collection rows/cards, relevant Filters, Standard Composers, and relevant Inspectors |
| Standard Composer family | [C creation] | Home creation; Triage creation/Accept; Projects Root; Initiative Focus; Project Workspace |
| Issue Peek | [C Workflow Issue] | Project Workspace; Cycle |
| Bulk Bar | [G] | Projects Root; Initiative Focus; Project Workspace; Current Cycle |
| Confirmation | [G] | destructive/lifecycle workflows that compose it, including Project Workspace Issue delete and Cycle close |
| TrailBoard / TrailBoardColumn | [C Board] | Project Workspace Board only; Current Cycle Board does not consume this geometry owner |
| TrailCycleStart | [C Cycle] | Home ordinary Start; Cycles Root ordinary Start; Cycle Inspector Close-and-start-next |
| TrailHomeWidgetFrame | [C Home] | This Week; Work Pulse; Lifecycle Activity; Work Trend; Weekly Meeting Notes |
| TrailInspector carrier | [G shell] | Initiative, Project, Issue, and Cycle Inspectors |
| shared Inspector property controls | [G semantic controls] | Initiative, Project, and Issue Inspectors; corresponding Standard Composer/property-picker consumers where the same semantic control is reused |

#### 4.4.4 Calibration impact rule

For Stage 12 visual calibration and later UI maintenance:

1. locate the visible defect in the Page composition tree;
2. walk upward to the highest owner that actually owns the faulty semantic or mechanical responsibility;
3. if multiple Pages share that owner, calibrate the shared owner and recheck every consumer listed above;
4. if the defect belongs only to a Page-local composition, keep the change local rather than creating a universal abstraction;
5. visually similar surfaces with different semantic/mechanical responsibilities remain separate and may only reuse lower-level owners;
6. when a shared owner changes, Foundation should expose a representative production specimen where one exists, but Foundation never becomes the authority for Product behavior or Page composition.

Examples:

```text
Project Workspace List + Cycle List both have wrong Issue row density
-> inspect WorkflowIssueRow / CollectionRow before Page-local CSS

Project Board + Cycle Board cards both have wrong metadata rhythm
-> inspect WorkflowIssueCard / semantic owners

only Current Cycle swimlane headers are wrong
-> keep the correction inside TrailCycleBoard

Triage and Issue Full Item headers differ from other Pages
-> first decide whether the difference follows their accepted Page-local composition
-> do not force TrailPageHeader merely for visual uniformity
```

Update this map when a production owner gains or loses a real consumer, when ownership moves between shared and local layers, or when an accepted composition changes. Pure pixel/color calibration that preserves ownership does not require rewriting the map.

## 5. Target Code Trees

### 5.1 Query

```text
plugin/src/query/
├─ shared/              readable snapshot policy, shared projections, filters, legal targets
├─ derived/             reusable Progress/Attention/temporal/aggregate facts
├─ triage/              Triage Page/Review selection and Read Model
├─ projects/            Projects Root, Initiative, Project Workspace, Inspector Read Models
├─ cycles/              Current/Historical Cycle Read Models and candidates
├─ home/                Home Read Model
└─ search/              Sidebar Search Read Model
```

Do not create one generic schema-driven query/view-model subsystem. A focused product module may reuse shared snapshot-aware helpers and derived owners.

### 5.2 UI

```text
plugin/src/ui/
├─ design-system/        TS-side helpers only when actually required
├─ primitives/           generic semantic controls; no Trail Domain/Runtime/Query knowledge
├─ patterns/             reusable interface composition; no Runtime self-fetch
├─ entities/             Trail semantic presentation from explicit props
├─ interactions/         shared transient mechanics/state
├─ pages/
│  ├─ home/
│  ├─ projects/
│  ├─ triage/
│  ├─ cycles/
│  └─ issue-full-item/
├─ shell/                navigation, Sidebar Search, workspace frame/Page chassis
└─ foundation/           development showroom/calibration Page only
```

Styles remain canonically owned under `plugin/styles/` and are deterministically composed by the build into generated Obsidian `styles.css`.

## 6. Known Published-Code Alignment Targets

The map describes **target ownership**, not current implementation state. At the published UI checkpoint `67ba3cdcf81d4127faf08ca1d8edfeb691d5b2b1` (`refactor: align shared ui contracts`), the following alignment facts are established:

- Workspace Frame / Page Surface ownership is aligned: the mandatory shared Location Bar contract is gone and Page identity remains Page-owned.
- Collection Controls is composition-oriented and no longer requires a generic `Display` slot.
- `TrailProgress` owns normal/compact/micro density plus explicit unavailable presentation.
- Foundation is a development showroom on the shared Page chassis rather than a Product fallback/private component library.
- `TrailCollectionRow` owns nested interactive-target isolation, and `TrailPropertyControl` exposes normal/compact/disabled reusable states.

Known remaining published-code alignment targets include:

1. normal-flow layout containment / spatial ownership is only partially consistent across current compositions. Direct-child owners must prevent sibling overlap, keep essential controls inside their allocated regions, and make intentional overflow ownership explicit.
2. `ui/interactions` currently proves shared Filter mechanics but does not yet contain the complete Selection/Action Registry/Peek/transient-stack/Confirmation/Composer ownership required by the frozen V1 design.
3. current Triage composition subscribes broadly to Runtime and combines several raw/focused selectors in the Page. Target: one Triage surface Read Model per top-level evaluation, with Page-local Review/Filter state remaining explicit UI input.
4. existing shared/derived Query helpers can each acquire a readable Runtime snapshot independently. New surface composition must avoid repeated pending replay/index rebuild inside one top-level Read Model evaluation; introduce caching only if evidence later requires it.
5. current Search Query still exposes legacy result kinds beyond the frozen Sidebar Search contract. Target result kinds are Initiative, Project, and Workflow Issue only; Search remains Left Sidebar mode rather than a Page/location.

`docs/implementation.md` owns the execution order and current verification status for these gaps.

## 7. Verification Rule

A reusable owner or Read Model is accepted when:

- its responsibility matches `docs/architecture.md`, `docs/ui.md`, and `docs/ui-blueprints.md`;
- Page-specific workflow does not leak into generic Query/UI owners;
- direct consumers are traced and validated;
- top-level Read Model evaluation uses one coherent readable snapshot and temporal reference where required;
- reusable UI components can be driven by explicit semantic props from either Foundation fixtures or real Read Models;
- keyboard/focus/accessibility behavior is proven where relevant;
- normal-flow siblings do not overlap and essential controls remain inside their allocated regions;
- constrained/normal widths preserve intended information priority without accidental Page-level overflow;
- intentional overflow/top-layer escape has an explicit owning component or surface;
- host-specific behavior is verified in representative real Obsidian conditions when unit/jsdom tests cannot establish it.

Page tests should focus on Read Model consumption, Page composition, and workflow. Query tests own derived/read semantics. Lower UI component tests and Foundation specimens own reusable presentation/interaction states rather than re-proving Domain legality through Page code.

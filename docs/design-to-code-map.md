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

`docs/implementation.md` records whether the mapped owner currently exists, is partial, or still needs alignment.

## 2. Product-to-Owner Map

| Product / UI responsibility | Canonical basis | Target owners | Primary verification |
| --- | --- | --- | --- |
| Quick Capture -> Triage | Triage Issue context + required review Due; no pre-create Domain mutation | Obsidian command adapter, shared creation `ui/interactions`/`ui/patterns`, `application/triage`, Domain planning | Composer interaction + planner/application + representative host |
| Standard Triage/Issue/Project/Initiative creation | existing entity contracts/defaults; no Draft entity | shared Composer `ui/interactions`, `ui/patterns`, entity semantic controls, Query legal-target/default inputs, normal Application use cases | shared UI + target Application/Domain |
| Triage Queue and Review Set | Triage Issue + Due/Priority/Labels; Review Set derived only | `query/triage`, `ui/pages/triage`, shared Filter/Selection/Action owners | Query + UI |
| Triage Review progression | page-local visible/ordered projection; Accept/Defer/Delete complete Review | `ui/pages/triage` consuming `query/triage`; ordinary target Applications | UI workflow + Application + host where needed |
| Triage Accept -> Issue/Project | destination-first new identity; title/body seed only | `ui/pages/triage`, shared Composer, `application/triage`, `application/issues`/`projects`, mutation/source-sync | planner/application + UI + persistence convergence |
| Workflow Issue creation | exactly one legal Project; starts Backlog | Query legal target/default candidate, shared Issue Composer, `application/issues`, Domain planning | Query + UI + planner/application |
| Project / Initiative creation | Project uses configured Unstarted default; Initiative no Status | shared Composer, `application/projects` / `application/initiatives`, Domain planning | UI + Application/Domain |
| Project deletion | current Default illegal; child Issues require legal replacement; old Project Milestones removed | `domain/planning`, `application/projects`, Query legal targets, mutation/source-sync | planner + execution + representative host |
| Default Project | required normal-ready Workspace reference to ordinary Project | Domain model/validation/planning, `application/workspace`, source-sync bootstrap/recovery, plugin-data persistence, Query, Settings adapter, navigation shell | bootstrap + setter + navigation/settings |
| Projects Root | Project collection grouped by Initiative; Page-owned header; List/Timeline | `query/projects`, `ui/pages/projects`, shared Project Row/Group Header/Filter/Timeline mechanics | Query + UI |
| Initiative Focus | Initiative-scoped Project List only | `query/projects`, `ui/pages/projects`, Initiative Inspector/entity UI | Query + UI |
| Project Workspace | Project-scoped Issue collection; lifecycle-dependent List/Board | `query/projects`, `ui/pages/projects`, Issue Row/Card, Status Section, Board patterns | Query + UI + focused Application interactions |
| Project Timeline | derived current lifecycle/Due projection; no persisted plan-time model | `query/derived` / project selector, `ui/pages/projects` Timeline composition | Query semantics + UI geometry |
| Project/Milestone Progress | Completed / current non-Canceled scope | `query/derived`, shared Progress owner, Inspector/Page consumers | derived Query + UI |
| Project Temporal Attention | unfinished child Issues with Due; mutually exclusive temporal buckets | `query/derived`, segmented-summary pattern, Project Inspector | derived Query + UI |
| Shared collection Filter | one property/value grammar; location-scoped session state | shared Query filter helpers, `ui/interactions`, `ui/patterns`, Page registries | Query semantics + shared interaction |
| Shared Collection Controls | no mandatory Display; Page supplies actual controls | `ui/patterns` composition-oriented controls + Page owners | shared UI + real Page consumers |
| Shared Issue Row/Card | stable semantic metadata hierarchy with context omission | `ui/entities`, `ui/patterns/trail-collection-row`, semantic property owners | entity UI + Page consumer tests |
| Selection and Bulk | transient visible/actionable identities; common legal-target intersection | `ui/interactions`, Bulk pattern, Query capability/target selectors | shared UI + focused Application |
| Action Registry | one action identity/context/capability authority | `ui/interactions`, existing Application intents, Obsidian binding adapter | shared UI + Application + host keybinding |
| Context Menu / overflow / contextual Command Menu | presentations over Action Registry | Obsidian Menu adapter/mechanics + `ui/interactions` / `ui/patterns` | interaction + representative host |
| Workflow Issue Peek | read-only transient preview; no navigation/Inspector retarget | `ui/interactions` + Peek surface pattern + Query projection | UI interaction + responsive/focus host evidence |
| Picker family | shared select/search/multi/date mechanics; semantic legality outside generic shell | `ui/interactions`, `ui/patterns`, `ui/entities`, Query where target legality applies | shared interaction + semantic consumers |
| Confirmation | top-layer safe Cancel/confirm mechanics | `ui/interactions`, reusable confirmation pattern | interaction/focus + workflow consumer |
| Transient interaction stack | topmost Esc/outside-click/focus ownership | `ui/interactions` | interaction tests + host focus where needed |
| Current Cycle collection | Open Cycle membership + live Issue facts | `query/cycles`, `ui/pages/cycles`, shared Issue collection/Filter/Selection/Peek | Query + UI |
| Cycle membership | Cycle owns membership; orthogonal to Issue properties | Domain planning, `application/cycles`, Query target/candidate selectors, shared actions | planner/application + Query/UI |
| Cycle lifecycle | Start / Close / Start-next; at most one Open; no automatic rollover | Domain planning, `application/cycles`, `query/cycles`, `ui/pages/cycles` | planner/application + UI |
| Cycle Progress / Effort | Progress Completed/non-Canceled; Effort configured Estimate weights | `query/derived`, Cycle Page/Inspector, shared Progress | Query + UI |
| Historical Cycle | retained final membership + current live Issue fields; no close-time snapshot | `query/cycles`, `ui/pages/cycles`, shared Issue Row/Filter/Peek | Query + UI |
| Home | current temporal/runtime facts + Weekly Update utility; no snapshot/score Domain | Home Query selectors, `ui/pages/home`, utility persistence, shared Progress/segmented/creation owners | Query + UI |
| Sidebar Search | Initiative/Project/Workflow Issue discovery; no Search Page/Peek/Triage results | `query/search`, `ui/shell`, shared result-list/navigation patterns | Query + Sidebar UI + host keyboard/focus |
| Issue Full Item | stable Issue identity + lightweight Markdown body + structured Inspector | dedicated Issue Page/editor owner, Issue semantic UI, Obsidian/CodeMirror adapter conventions | editor/UI + representative host |
| Persistent Inspectors | effective entity presentation projection; host Right Sidebar | Query/entity presentation, Inspector compositions, Obsidian side-view adapter | Query + UI + host side-view |
| Workspace Frame / responsive composition | actual pane capacity; Page-owned header/breadcrumb | `ui/shell` frame, `ui/pages`, shared Page Header/controls patterns, Obsidian adapter | UI + representative pane/split/sidebar sizes |
| Runtime/Data-Issue feedback | Runtime control/pending/health + LKG; no feedback Domain facts | Runtime/Query inputs, shared feedback patterns/shell, Obsidian host actions such as Open source | runtime/query + UI + performance/host |
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

### 3.4 Source Sync, Query, and Application

| Responsibility | Owner |
| --- | --- |
| bootstrap/discovery/refresh/convergence | `plugin/src/source-sync/` |
| Default Project missing-reference recovery | `plugin/src/source-sync/bootstrap/` + normal persistence owners |
| shared/effective selectors and legal targets | `plugin/src/query/` |
| derived Progress/Attention/Home/Timeline/Cycle calculations | `plugin/src/query/derived/` or focused Query modules |
| Cycle selectors/candidates | `plugin/src/query/cycles/` |
| Search selectors | `plugin/src/query/search/` |
| semantic user use cases | `plugin/src/application/<business-area>/` |
| create-time similarity guard | `plugin/src/application/similarity/` + Query/helper logic |

UI supplies explicit selected targets to Application/Domain; absence is never interpreted as a hidden Project fallback.

## 4. UI Ownership

### 4.1 Dependency direction

```text
tokens / host visual mapping
-> primitives
-> patterns
-> semantic entity UI
-> shared interactions
-> shell + Page composition
```

Foundation Lab is a verification consumer of production owners:

```text
resolved UI contract
-> production owner
   |- Foundation scenarios
   `- real Page/surface consumers
```

Production code must not depend on Foundation-only components, fixtures, or styles.

### 4.2 Shared UI owners

| Responsibility | Target owner | Explicit non-responsibility |
| --- | --- | --- |
| Workspace Frame | `ui/shell` | no mandatory Location Bar/breadcrumb/title |
| Page Header | `ui/patterns` | Page supplies actual identity/ancestry/actions |
| Collection Controls | `ui/patterns` | no required Display; Page supplies Filter/Order/Layout/etc. |
| Collection Row shell | `ui/patterns` | no Domain field knowledge |
| Group Header / Status Section / Empty State | `ui/patterns` + semantic inputs | no Page/query ownership |
| Progress / basic controls | `ui/primitives` or thin patterns | no entity-specific calculation |
| segmented summary | `ui/patterns` | not Progress and not query bucket owner |
| semantic Status/Priority/Due/Label/Estimate/Cycle identities | `ui/entities` | no Page workflow |
| Issue Row/Card / Project Summary Row | `ui/entities` | no collection scope/filter/order |
| Filter/Selection/Action/Peek/Picker/Confirmation/transient stack/Composer state | `ui/interactions` | no persisted Domain/Runtime truth |
| Bulk/Composer/Popover/confirmation surfaces | `ui/patterns` over interactions/primitives | no workflow-specific business semantics |
| Product workflows | `ui/pages/*` | must not leak into generic owners |

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

## 5. Target UI Tree

```text
plugin/src/ui/
├─ design-system/        TS-side helpers only when actually required
├─ primitives/           generic semantic controls; no Trail Domain knowledge
├─ patterns/             reusable interface composition
├─ entities/             Trail semantic presentation
├─ interactions/         shared transient mechanics/state
├─ pages/
│  ├─ home/
│  ├─ projects/
│  ├─ triage/
│  ├─ cycles/
│  └─ issue-full-item/
├─ shell/                navigation, Sidebar Search, workspace frame
└─ foundation/           development/calibration consumer only
```

Styles remain canonically owned under `plugin/styles/` and are deterministically composed by the build into generated Obsidian `styles.css`.

## 6. Known Published-Code Alignment Targets

The map describes **target ownership**, not current implementation state. At the `8e14fa87473b09134e455383170cfe571c9aeb97` UI-document baseline, known published-code alignment targets include:

1. `TrailWorkspaceShell` currently requires `locationBar`, and `TrailLocationBar` owns a global `<h1>` location presentation. Target ownership is Workspace Frame only + Page-owned header/breadcrumb.
2. `TrailViewBarProps` currently requires `display`. Target ownership is composition-oriented Collection Controls with Page-supplied trailing controls and no generic Display requirement.
3. `TrailProgress` is the correct shared owner but needs unavailable and density variants rather than entity-specific progress components.
4. `ui/interactions` currently proves shared Filter mechanics but does not yet contain the complete Selection/Action Registry/Peek/transient-stack/Confirmation/Composer ownership required by the frozen V1 design.
5. Sidebar Search must be implemented in `ui/shell`/Search query ownership rather than as `ui/pages/search` or a Main View location.

`docs/implementation.md` owns the execution order and current verification status for these gaps.

## 7. Verification Rule

A reusable owner is accepted when:

- its responsibility matches `docs/ui.md` and `docs/ui-blueprints.md`;
- Page-specific workflow does not leak into it;
- direct consumers are traced and validated;
- keyboard/focus/accessibility behavior is proven where relevant;
- constrained/normal widths preserve intended information priority;
- host-specific behavior is verified in representative real Obsidian conditions when unit/jsdom tests cannot establish it.

Page tests should focus on Page composition/workflow and consume lower-layer Domain/Query legality rather than retesting it through duplicated UI rules.

# Trail V1 UI Coverage

> **Lifecycle: temporary closure ledger.** This file tracks V1 UI discussion, cross-surface coverage, and acceptance progress; it does not replace `ui.md` or become a permanent design authority. Durable target decisions must be folded into `ui.md`, final ownership into `design-to-code-map.md`, and actual construction state into `implementation.md`. After V1 UI closure is complete and those canonical documents are calibrated, delete this file.
>
> **Foundation Lab is not temporary.** The ledger is temporary, but the Foundation Lab described here is a long-lived engineering validation surface that remains available throughout V1 development and later UI evolution.

## 1. Purpose

This document is the active working inventory for the V1 UI rebaseline.

It exists to prevent implementation order from becoming design authority.

`docs/ui.md` remains the target UI design baseline. This file answers a different question:

> Have all materially different V1 locations, surfaces, workflows, host integrations, and shared interaction scenarios that constrain a UI responsibility been considered before that responsibility is accepted for production composition?

A scenario being listed here does not invent product scope. It must trace back to Product/UI design or an already-established host/runtime responsibility.

The inventory is intentionally organized by **surface role**, not by current source tree. Existing component/file names are evidence only.

## 2. Status vocabulary

Use these statuses consistently.

| Status | Meaning |
| --- | --- |
| `authority-review` | higher-level documents or current freeze/status wording must be reconciled before closure |
| `inventory` | scenario/responsibility is known but has not been discussed to closure |
| `discussing` | active design/contract discussion |
| `resolved` | target behavior/ownership is decided in canonical docs; implementation may not exist |
| `candidate` | independent implementation exists but is not yet accepted under the rebaseline |
| `foundation-verified` | representative Foundation scenarios pass for the intended reusable contract |
| `reusable-accepted` | reusable owner is accepted for production composition after coverage + Foundation verification + host verification where required |
| `page-ready` | page-local composition contract is closed and required reusable owners are accepted |
| `production-verified` | assembled production surface has representative real-Obsidian verification |
| `retired-evidence` | current/old implementation may be inspected but must not constrain the new target |
| `lab-specimen` | Foundation-only specimen; not a reusable production owner |

A `foundation-verified` result is necessary evidence for reusable UI acceptance, but Foundation Lab does not define product behavior by itself.

## 3. Global rebaseline rule

Until a responsibility is `reusable-accepted` or explicitly `page-ready` here:

- current code is evidence only;
- current tests are evidence only;
- current component/file names are evidence only;
- historical Phase A/B/C completion language is historical only;
- Foundation screenshots/specimens are evidence only;
- one or more production consumers do not establish acceptance;
- `design-to-code-map.md` paths are ownership hypotheses rather than proof that the current implementation is correct.

An implementation cannot promote itself.

When a scenario reveals a missing or contradictory target answer, update the appropriate canonical document before accepting the implementation contract.

When documents disagree, also inspect **decision chronology**. A later explicit design closure does not become invalid merely because an older canonical summary was not synchronized. In that case, repair the stale canonical owner and keep the already-closed behavior closed. This chronology rule never allows implementation code or tests to outrank Product/UI design.

## 4. Active authority reconciliation queue

These are documentation-level blockers discovered during the inventory pass. They must be settled before the affected surface can close.

| Question | Evidence | Current handling | Status |
| --- | --- | --- | --- |
| V1 UI Freeze wording | `ui.md` currently states that V1 UI is frozen for formal implementation alignment | Replace the global freeze label with an active rebaseline status: prior resolved behavior remains the target baseline and is not reopened by implementation differences; coverage may correct genuine omissions/contradictions before the final V1 freeze is re-declared. | resolved |
| Home module scope | later explicit Home closure (`0bd1270`, `docs: close initiative and home design`) resolved Work Pulse, Lifecycle Activity Heatmap, Work Trend, Temporal Orientation, and Weekly Meeting Notes, while `product.md` retained the older summary list | Treat this as documentation drift, not an unresolved product question. Synchronize `product.md` to the later closure and keep those Home decisions closed. | resolved |
| Weekly Meeting Notes missing-source behavior | `ui.md` defines Open/Read, Edit Current, Archive/Next but does not define a Home-created missing-source recovery flow | Do not invent a `missing -> create` UI scenario. Treat missing/invalid source through established source/bootstrap/Data-Issue behavior unless canonical docs explicitly add another flow. | authority-review |

This queue should shrink as durable decisions are folded into canonical documents.

## 5. Foundation Lab - continuous verification environment

Foundation Lab is a **long-lived engineering validation surface**. It is not a temporary pre-page gallery.

Its role spans the whole UI lifecycle:

```text
authoritative Product/UI answer
-> coverage scenario closure
-> independent reusable owner
-> Foundation Lab representative scenarios
-> semantic/component verification
-> real-Obsidian calibration when host mechanics matter
-> reusable acceptance
-> production composition
-> production verification
-> reusable regression found in production
-> add/reproduce regression in Foundation Lab
-> fix shared owner
-> reverify Foundation + affected production consumers
```

### 5.1 Foundation Lab is permanent engineering infrastructure

The rebaseline documents are temporary. Foundation Lab is not.

Foundation Lab should remain available during:

- component/pattern design;
- shared interaction implementation;
- visual calibration;
- production page assembly;
- production bug investigation;
- regression testing;
- responsive/focus/keyboard calibration;
- later feature additions that reuse or extend the UI system.

Exact development access may evolve, but Foundation Lab must remain reachable in the engineering workflow. It does not need to become a normal user-facing product navigation destination.

### 5.2 What Foundation Lab may own

Foundation Lab may own harness concerns such as:

- deterministic fixtures and fake data;
- scenario selection;
- width/pane containers;
- state toggles;
- host-context simulation where practical;
- debug outlines/logging;
- interaction/event readouts;
- specimen headings/descriptions;
- side-by-side comparison of stable variants/states;
- focused integration specimens that compose several real reusable owners to verify their boundary.

It may not own product workflow semantics, canonical query legality, page navigation meaning, or Foundation-specific variants of a production control.

### 5.3 Required Foundation behavior

For every reusable owner selected for implementation:

1. identify representative scenarios from this ledger;
2. implement the independent production owner outside `ui/foundation`;
3. import that exact owner into Foundation Lab;
4. exercise applicable normal/edge/width/focus/keyboard/error states;
5. keep the scenario after acceptance as a regression fixture;
6. when production exposes a reusable contract bug, reproduce it in Foundation before or with the shared fix when practical.

A reusable owner should not disappear from Foundation merely because a production page now exists.

### 5.4 Foundation must not become a second product implementation

Do not clone complete Home/Triage/Project/Cycle/Search pages into Foundation merely to screenshot them.

Foundation may compose multiple real owners to verify a reusable **pattern** or **interaction boundary**, but page-specific workflow/composition remains owned by the actual page and is validated in the real host.

Production code must never depend on:

- Foundation components;
- `trail-lab-*` selectors;
- Lab-only fixtures/state;
- Lab-only event semantics;
- visual exceptions added only to make a Foundation specimen look correct.

## 6. Inventory model

The V1 UI inventory is split into five kinds so a page does not accidentally absorb every responsibility around it.

```text
A. Product Locations / page-local sub-surfaces
B. Persistent Product Surfaces
C. Transient Surfaces / focused workflows
D. Shared Interaction Systems / reusable UI contracts
E. Host Integration / full-shell behavior
```

A reusable component may be exercised by several categories. The category is about **responsibility**, not file placement.

## 7. A - Product locations and page-local sub-surfaces

### 7.1 Home

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| normal Home | accepted module set, routing affordances, Location Bar composition | inventory |
| no Current Cycle | truthful empty summary/routing without fake future Cycle | inventory |
| sparse/new Workspace | zero/small-data presentation across modules | inventory |
| Work Pulse / current summaries | Current Cycle, Triage, and In Progress Project summary semantics | resolved |
| Lifecycle Activity Heatmap | resolved lifecycle-event semantics + temporal visualization, tooltip/focus/accessibility | resolved |
| Work Trend | resolved Backlog stock / Active stock / daily Completed flow semantics + chart presentation | resolved |
| Temporal Orientation | resolved date/week + Triage Review Due + Workflow Issue Due presentation | resolved |
| Weekly Meeting Notes - read/open | utility-source presentation/routing | inventory |
| Weekly Meeting Notes - edit Current | readable editing measure, focus/editor behavior | inventory |
| Weekly Meeting Notes - Archive/Next | explicit utility action + confirmation/feedback if needed | inventory |
| Home creation `+` | shared creation menu entry, not a Home-specific form | inventory |
| Home narrow | module reflow/prioritization without unreadable charts | inventory |
| loading/refreshing/read-only | shared shell/runtime feedback integration | inventory |

### 7.2 Triage

All current production Triage page behavior is `retired-evidence` until reaccepted here.

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| populated List | View Bar, Review Set summary/boundary, Triage Row | inventory |
| truly empty List | empty state, direct Triage creation path | inventory |
| filtered List | shared Filter + current ordering | inventory |
| filtered empty | explicit no-match state + clear-filter recovery | inventory |
| Display ordering | supported ordering only; Review Set remains global | inventory |
| open Review from row | page-local Review identity and focus transition | inventory |
| Review wide | Queue + Review composition, explicit exit | inventory |
| Review constrained | focused Review, queue context/position, explicit exit | inventory |
| Review previous/next | adjacency from current visible ordered projection | resolved |
| reviewed item outside projection | no stale/virtual adjacency | resolved |
| title editing | shared inline editing owner + local uncommitted draft | discussing |
| description editing | lightweight Markdown/content editing owner | discussing |
| Priority edit | shared property owner; ordinary edit does not complete Review | inventory |
| Labels edit | shared property owner; ordinary edit does not complete Review | inventory |
| Review Due edit | shared Due owner; ordinary edit does not complete Review | inventory |
| Accept target disclosure | Issue/Project choice through shared menu/popover grammar | inventory |
| Accept -> Issue | standard Issue Composer seeded title/body only | inventory |
| Accept -> Project | standard Project Composer seeded title/body only | inventory |
| Accept cancel | source Triage entry unchanged | resolved |
| Accept success | destination-first completion + fresh same-slot progression | resolved |
| Defer default | `+7 calendar days` on same identity | resolved |
| Defer alternate | Tomorrow/This weekend/Next weekend/+1 month/Pick date | inventory |
| Defer success | reorder + Review completion progression | resolved |
| Defer failure | same Review identity + Runtime rollback/shared feedback | resolved |
| Delete | shared destructive confirmation + delete intent | resolved |
| Delete success | fresh same-slot progression | resolved |
| Delete failure | same Review identity + shared feedback | resolved |
| source/data issue for current entry | readable LKG + scoped non-writable warning | inventory |
| global read-only-error | LKG visible, mutation disabled, persistent warning | inventory |
| external refresh removes current item | exit Review without ghost baseline | resolved |
| navigation away from Triage | discard uncommitted Review text; preserve only separately-defined session state | resolved |
| return to Triage in same session | normal full List entry; Filter lifetime handled separately | resolved |

### 7.3 Projects Root

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| grouped Project List | Initiative groups + shared Project Summary Rows | inventory |
| `No Initiative` group | same group grammar, no fake Initiative | inventory |
| group collapse/expand | page presentation state | inventory |
| Project row navigation | open normal Project Workspace | inventory |
| inline Project property edit | edit property without row activation | inventory |
| Project labels enabled via Display | optional secondary metadata | inventory |
| Project Attention present/absent | exception-driven footprint | inventory |
| Completed/Canceled rows | lifecycle ordering, muted weight, cleanup attention | inventory |
| Projects Filter | Status/Initiative/Priority/Labels/Due registry | inventory |
| Projects Display | supported Project-row metadata | inventory |
| List/Timeline switch | one binary control | inventory |
| New Project | standard Project Composer | inventory |
| New Initiative | lower-frequency action + standard Initiative Composer | inventory |
| truly empty / filtered empty | creation or clear-filter recovery | inventory |
| narrow List | progressive metadata reduction | inventory |

#### 7.3.1 Projects Timeline sub-surface

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| eligible Project envelope | planning/execution span identity | inventory |
| Project not eligible for left span | truthful omission without changing collection membership | inventory |
| Project Due marker | own-entity open eligibility + temporal emphasis | inventory |
| child Issue Due marker | child eligibility independent from parent closure | inventory |
| Milestone Due marker | derived-complete eligibility rule | inventory |
| overdue marker | past Due remains visible/emphasized | inventory |
| Today-to-Due future span | latest eligible future Due only | inventory |
| mixed historical + future evidence | preserve empty temporal gap; no invented activity | inventory |
| month/quarter/year scale | presentation-only mapping over same Query semantics | inventory |
| horizontal navigation/scroll | Timeline-owned overflow, not whole-page overflow | inventory |
| dense marker collision | component-level aggregation/calibration | inventory |
| narrow pane | useful row identity + Timeline-owned scrolling | inventory |

### 7.4 Initiative Focus

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| normal scoped Project List | one Initiative's Projects using shared Project collection/rows | inventory |
| no Initiative grouping/filter dimension | location already fixes scope | resolved |
| context disclosure | lightweight Initiative Markdown description | inventory |
| Initiative Inspector target | persistent structured properties/context | inventory |
| New Project | current Initiative prefilled but editable | inventory |
| Project moves out of Initiative | naturally leaves current projection after mutation | inventory |
| Project moves into Initiative | naturally enters current projection | inventory |
| empty / filtered empty | New Project or clear-filter recovery | inventory |
| narrow | same shared row reduction, no separate Initiative layout model | inventory |

### 7.5 Project Workspace

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| Planned Project List | planning-capable, execution-disabled, List-only | inventory |
| In Progress Project List | normal Issue collection + View Bar | inventory |
| In Progress Project Board | concrete StatusDefinition columns | inventory |
| Completed Project List | settled/read/relationship-cleanup presentation | inventory |
| Canceled Project List | unresolved cleanup presentation | inventory |
| project context disclosure | lightweight Markdown description | inventory |
| List Issue Row | shared scanning row composition | inventory |
| Board Issue Card | shared semantic owners in card composition | inventory |
| create Issue | explicit legal Project; Backlog start | inventory |
| inline Issue property edit | normal legal mutation without row/card activation | inventory |
| Board drag between columns | Status change only | inventory |
| same-column drag | no persisted manual order | resolved |
| move Issue | legal target Project + relation/milestone consequences | inventory |
| Project Filter | Status/Priority/Milestone/Labels/Due/Estimate | inventory |
| Project Display | supported Issue metadata only | inventory |
| Milestone focus | write normal Filter state only when exactly expressible | inventory |
| Overdue/Attention focus | write normal Filter only when exactly expressible | inventory |
| empty / filtered empty | creation or clear-filter recovery | inventory |
| narrow List | progressive row metadata reduction | inventory |
| narrow Board | Board-owned horizontal scrolling; do not silently switch to List | inventory |

#### 7.5.1 Project Inspector / Project lifecycle

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| Project Inspector normal | Status/Initiative/Priority/Labels/Due + derived summaries | inventory |
| Status picker | only legal destination StatusDefinitions | inventory |
| completion blocked by open Issues | unavailable reason + route/filter to blockers | inventory |
| reopen Completed/Canceled | explicit legal Unstarted/Started destination, no hidden previous status | resolved |
| Progress | Completed / current non-Canceled denominator | resolved |
| undefined Progress | `—`, not fabricated 0/100 | resolved |
| Attention bar | Overdue / Due This Week / Later Due presentation | inventory |
| Attention click - expressible bucket | normal Filter state | inventory |
| Attention click - non-expressible bucket | informational only; no hidden filter grammar | resolved |
| Milestone list | scoped identity + derived Progress | inventory |
| create Milestone | Project-scoped quick creation | inventory |
| edit/delete Milestone | capability + confirmation + Issue relation consequence | inventory |
| Completed/Canceled Milestone section | read-only summary; no planning mutation affordances | inventory |
| Delete Project without child Issues | confirmation + delete | inventory |
| Delete Project with child Issues | explicit legal replacement Project + consequence copy | inventory |
| Delete current Default Project | unavailable; route to Default Project Settings first | resolved |

### 7.6 Cycles

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| no Open Cycle | Start Cycle affordance + History access | inventory |
| Current Cycle List | live member Issue collection | inventory |
| Current Cycle Board | concrete Status columns + Project swimlanes | inventory |
| Board member in Backlog/Canceled | remains member; visible through List rather than fake Board columns | resolved |
| Current Cycle Filter | Status/Project/Priority/Milestone/Labels/Due/Estimate | inventory |
| Current Cycle Display | supported metadata; Project omitted from Board card because swimlane carries it | inventory |
| Add issues | focused searchable/filterable Issue selection | inventory |
| Add issue from Planned Project context | permissive membership without Status mutation | resolved |
| Remove membership | Cycle-owned membership only | inventory |
| member Project changes | swimlane/metadata updates; membership unchanged | resolved |
| plannedEnd reached | overdue/time presentation only; no auto-close | resolved |
| Close Cycle | explicit confirmation; freeze final membership; mutate no Issue facts | resolved |
| after close | no automatic next Cycle | resolved |
| Start next Cycle | current-open previous members preselected as editable candidates | inventory |
| Cycle Progress | Completed / non-Canceled current members | resolved |
| Cycle Effort | current configured weights over members with Estimate | resolved |
| Current Cycle Inspector | Progress/Scope/Effort/startedAt/plannedEnd/Close | inventory |
| History list | chronological compact Cycle rows | inventory |
| Historical Cycle detail | flat List over retained final membership + current live Issue facts | inventory |
| Historical Filter/Display | shared grammar, List-only | inventory |
| Historical Cycle Inspector | read-oriented Scope/Effort/actual dates | inventory |
| historical member later changes | current Issue fields update; never label as state-at-close | resolved |
| empty / filtered empty | appropriate start/add/clear-filter recovery | inventory |
| narrow Board/List | preserve identity; Board owns horizontal scrolling | inventory |

### 7.7 Search

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| Search entry | navigate same Trail tab + immediate input focus | resolved |
| empty query | compact guidance/recent treatment without persisted search-history model | inventory |
| grouped results | Initiative/Project/Workflow Issue/Triage groups | inventory |
| no results | explicit empty state | inventory |
| activate Project | normal Project Workspace navigation | resolved |
| activate Initiative | Initiative Focus navigation | resolved |
| activate Workflow Issue | open shared Workflow Issue Peek inside Search | resolved |
| deeper open from Issue Peek | explicit Full Item navigation | resolved |
| activate Triage | navigate to Triage + open normal Review identity | resolved |
| keyboard result movement | highlight/focus without accidental selection | inventory |
| keyboard activation/escape | shared focus/shortcut ownership | inventory |
| narrow Search | comfortable list measure; shared Peek constrained treatment | inventory |

### 7.8 Issue Full Item

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| enter Full Item | same Trail tab, page-level location/history | inventory |
| title edit | direct inline editing without permanent Edit/Save/Cancel chrome | inventory |
| body read/edit | mature Obsidian/CodeMirror-like Markdown behavior | inventory |
| checklist content | ordinary Markdown task syntax, no Sub-issue semantics | resolved |
| wikilinks | ordinary Obsidian note links | resolved |
| Issue Inspector | Status/Project/Priority/Milestone/Labels/Due/Estimate/Cycle context | inventory |
| property edit while body focused | must not remount editor or destroy cursor/scroll | inventory |
| heading-depth mapping | managed H1/H2 boundary calibration | inventory |
| narrow | readable inner measure; Inspector remains host-owned sidebar | inventory |

## 8. B - Persistent product surfaces

### 8.1 Trail Navigation

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| normal navigation | Home/Triage/Workspace shortcut/Projects/Cycles + Search/Capture actions | inventory |
| current Default Project shortcut | current Project title + normal Project target | inventory |
| Default changes | row immediately reflects new stable reference/title | inventory |
| navigation active state | compact Linear-faithful hierarchy | inventory |
| constrained width | truncate/reduce without losing primary identity/actions | inventory |
| Data-Issue workspace glyph | quiet global warning without inventing Data Health page | inventory |
| non-Trail Obsidian sidebar views | remain available; Trail navigation does not destructively replace them | inventory |

### 8.2 Location Bar and context disclosure

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| root location | terminal location + applicable object/location actions | inventory |
| nested Initiative/Project/Cycle | breadcrumbs express product ancestry, not history | resolved |
| ancestor activation | normal page navigation/history | inventory |
| constrained width | preserve terminal segment first; collapse middle ancestry/low-priority actions | inventory |
| no location action | no empty right-side shell for symmetry | resolved |
| Project context disclosure | inline lightweight Markdown below Location Bar | inventory |
| Initiative context disclosure | same narrative-context pattern | inventory |

### 8.3 View Bar

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| Projects Root | Filter + List/Timeline + Display | inventory |
| Initiative Focus | Filter + Display | inventory |
| Started Project Workspace | Filter + List/Board + Display | inventory |
| non-Started Project Workspace | Filter + Display; no unavailable Board toggle | inventory |
| Current Cycle | Filter + List/Board + Display | inventory |
| Historical Cycle | Filter + Display | inventory |
| Triage | Filter + constrained Display ordering | inventory |
| narrow/reflow | controls reflow/overflow without changing semantics | inventory |

### 8.4 Persistent Inspector family

Inspector follows the current primary Trail location/entity, not hover, Peek target, or multi-selection.

| Target | Responsibilities to close | Status |
| --- | --- | --- |
| Initiative Inspector | structured Initiative properties/context; no mini-dashboard | inventory |
| Project Inspector | lifecycle/properties/Progress/Attention/Milestones/actions | inventory |
| Current Cycle Inspector | live Cycle properties/summaries/actions | inventory |
| Historical Cycle Inspector | read-oriented retained membership context | inventory |
| Issue Inspector | structured Issue properties/context for Full Item | inventory |
| location without Inspector target | Home/Triage/Search/Projects Root expose no Trail Inspector | resolved |
| Peek while Inspector open | Inspector target remains primary location/entity | resolved |
| location entry with enough capacity | initial Trail Inspector reveal | inventory |
| location entry constrained | initial Trail Inspector stays closed | inventory |
| resize while location active | do not auto reopen/collapse Inspector | resolved |
| unrelated right-sidebar views | do not destructively close/replace them | inventory |

### 8.5 Trail Settings - Default Project

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| Settings current Default | show resolved Project title + Change action | inventory |
| open Project picker | searchable ordinary Project list + current marker | inventory |
| select new Default | mutate only `defaultProjectId` | resolved |
| no empty choice | no `No default project` / Clear | resolved |
| selected Project illegal for later workflow | remains valid Default but downstream prefill is omitted when illegal | resolved |
| setter success | silent optimistic success + Navigation shortcut update | inventory |
| setter failure | restore prior resolved Default + shared transient failure | inventory |
| current Default delete attempt | unavailable; explain `Change Default Project first` | resolved |
| startup missing-reference recovery | not a Settings workflow | resolved |

## 9. C - Transient surfaces and focused workflows

### 9.1 Workflow Issue Peek

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| open from List/Board/Search/History | transient Main View surface, no page navigation | inventory |
| hidden detail presentation | full description + semantic properties without becoming mini Full Item | inventory |
| keyboard adjacent browsing | shared collection adjacency/focus semantics | inventory |
| explicit deeper open | navigate to Issue Full Item | inventory |
| close/Esc | restore prior collection focus/context | inventory |
| persistent Inspector coexistence | Inspector remains primary location target | resolved |
| constrained pane | shared responsive Peek treatment inside Main View | inventory |

### 9.2 Creation surfaces

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| Quick Capture title-first entry | global/navigation entry; title only; first Enter does not create | inventory |
| transition Quick Capture -> Triage Composer | title prefill + normal Due default + standard Composer behavior | inventory |
| Triage Composer | Title/body/Priority/Labels/Due | inventory |
| Workflow Issue Composer | required explicit Project + Priority/Labels/Milestone/Estimate/Due | inventory |
| Project Composer | optional Initiative + Priority/Labels/Due | inventory |
| Initiative Composer | Priority/Labels/Due; no Status | inventory |
| Project Workspace invocation | current Project prefilled but editable | inventory |
| Milestone-context Issue invocation | Project + legal Milestone prefilled | inventory |
| context-neutral Issue invocation | legal Default Project may prefill, otherwise explicit selection required | inventory |
| Triage Accept -> Issue | seed title/body only | resolved |
| Triage Accept -> Project | seed title/body only | resolved |
| Composer cancel/close | discard UI draft; no mutation | resolved |
| needs-input validation | local interaction feedback | inventory |
| target becomes illegal while open | submit revalidation; no hidden Status/relation repair | inventory |
| constrained Composer | lower-priority properties overflow progressively; same semantic form | inventory |
| submit pending/success/failure | shared optimistic/runtime feedback + close behavior | inventory |

### 9.3 Property / Filter / Display picker surfaces

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| small enum property picker | no unnecessary search; explicit names + stable semantic glyph | inventory |
| relation picker | search when option set grows; legal target semantics | inventory |
| nullable pseudo-value | `No ...` distinct from no filter/no value where applicable | inventory |
| unavailable target retained for explanation | only when it materially helps understanding | inventory |
| Filter property level | page registry + active-clause summary | inventory |
| Filter value level | property-specific values/search | inventory |
| applied clause activation | reopen that property's value picker | inventory |
| Display surface | page-supported metadata/order/presentation only | inventory |
| Esc/focus return | close current overlay without clearing state | inventory |
| nested popover positioning | real host clipping/focus calibration | inventory |

### 9.4 Menu / Command / confirmation surfaces

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| Context Menu | Obsidian native `Menu` mechanics where possible + shared Action Registry | inventory |
| entity overflow menu | relevant subset of same Action IDs | inventory |
| Command Menu | searchable broader Action Registry consumer | inventory |
| action on unselected object with stale selection elsewhere | resolve correct explicit object/selection scope | inventory |
| destructive confirmation | native host mechanic when suitable + concrete consequence copy | inventory |
| confirmation cancel | no mutation + focus return | inventory |
| confirmation success/failure | shared action/runtime feedback | inventory |

### 9.5 Cycle selection/start workflows

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| Start Cycle basic | start now + editable plannedEnd | inventory |
| Start Cycle empty | valid with no members | resolved |
| Start Cycle with Issue selection | same focused Issue selector as Add issues | inventory |
| Add issues search/filter | cross-Project discovery constrained by entry policy, not Domain legality | inventory |
| Start next preselection | previous members currently open selected initially | inventory |
| user edits next-Cycle candidates | deselect/add/cancel freely | inventory |

## 10. D - Shared interaction systems and reusable contracts

### 10.1 Core visual/action controls

| Responsibility | Known consumers | Existing evidence | Status |
| --- | --- | --- | --- |
| Button variants | Composer, confirmation, empty states, page actions | production primary/default + Lab-only secondary/ghost specimens | discussing |
| IconButton | navigation, Review, headers, view controls | pre-vertical primitive | candidate |
| icon source/language | navigation, properties, menus, actions | mixed custom SVG/glyph/Lab evidence | discussing |
| text field | Search, Composer, helper inputs | pre-vertical Input | candidate |
| textarea/lightweight editor presentation | Composer, Triage Review, narrative context | pre-vertical Textarea + page-local retired restyles | discussing |
| Progress | Project/Cycle/Milestone/Home summaries | pre-vertical primitive | candidate |
| Separator/hairline grammar | shell, menus, property groups, inspectors | pre-vertical primitive | candidate |
| Tooltip | dense semantic glyphs/labels | Lab specimen / native possibilities | inventory |

### 10.2 Editing systems

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| inline title edit enter | direct edit without permanent edit-mode chrome | inventory |
| explicit commit gesture | semantic field update against latest effective entity | inventory |
| explicit cancel/discard | restore committed/current value | inventory |
| blur | must not accidentally define save semantics where product says discard/explicit commit | inventory |
| navigation while dirty | surface-specific discard/commit rule, never inferred from DOM accident | inventory |
| unrelated property changes while title/body draft exists | edit must not overwrite unrelated current fields | inventory |
| lightweight Markdown editing | Triage/Composer/context description responsibilities | inventory |
| full body editing | Full Item CodeMirror/Obsidian-like behavior | inventory |
| mutation pending/failure | shared interaction feedback + current reliable value | inventory |

### 10.3 Semantic property identity/control/picker family

The same Domain concept should keep one visual identity across scanning, editing, filter, Peek, Inspector, and Composer surfaces.

| Responsibility | Known consumers | Existing evidence | Status |
| --- | --- | --- | --- |
| PropertyControl pattern | property rows/pickers | pre-vertical pattern | candidate |
| Status identity/select | Project/Issue row/card/Inspector/actions | design only/incomplete code | inventory |
| Priority identity/select | rows/cards/Inspector/Composer/Review/Filter | pre-vertical shared owner | candidate |
| Label identity/select | rows/cards/Inspector/Composer/Review/Filter | post-vertical candidate | candidate |
| Due identity/select | rows/cards/Inspector/Composer/Review/Filter | post-vertical candidate | candidate |
| Estimate identity/select | Issue surfaces/filter | target design, incomplete code | inventory |
| Milestone identity/select | Issue surfaces/filter/Inspector | target design | inventory |
| Initiative relation picker | Project surfaces/Composer/Filter | target design | inventory |
| Project relation picker | Issue move/create/Default Settings/Filter | target design | inventory |
| Cycle membership marker/action | Project Issue Row/Card/context | target design | inventory |

### 10.4 Filter grammar and state lifecycle

Filter must close as a scenario family, not as one monolithic component checkbox.

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| no clause | All; no hidden filter state | resolved |
| one discrete value | property clause selects that value | resolved |
| multiple discrete values | OR within property | resolved |
| multiple properties | AND across properties | resolved |
| nullable `No ...` | explicit pseudo-value distinct from All | resolved |
| required field | no fake empty pseudo-value | resolved |
| Label multi-select | one OR set regardless of LabelGroup assignment rules | resolved |
| Due Overdue | `< start of today` | resolved |
| Due Today | `<= end of today` including overdue | resolved |
| Due This week | `<= end of Monday-Sunday week` including overdue | resolved |
| Due This month | `<= end of calendar month` including overdue | resolved |
| Due Pick date | `<= end selected date` | resolved |
| Due No due | only when field nullable | resolved |
| active clause chip | visible compact formula/chip treatment | inventory |
| remove last value | clause disappears | resolved |
| Clear filters | remove all active clauses | resolved |
| unfiltered collection empty | genuine empty state | inventory |
| filtered collection empty | explicit no-match + Clear filters | inventory |
| relation rename | stable IDs preserve selection; label follows current entity | resolved |
| relation deleted/unavailable | prune transient value; remove empty clause | resolved |
| List/Board switch | same location Filter survives | resolved |
| Peek open/close | same location Filter survives | resolved |
| navigate away/back same session | location Filter may survive | resolved |
| different location | independent Filter state | resolved |
| restart/reload | Filter may be discarded | resolved |
| focus/Esc | close popover without clearing clauses | resolved |

Current `useTrailCollectionFilterState` local React lifetime is evidence only and conflicts with the intended location-scoped session lifetime until proven otherwise.

### 10.5 Display / layout presentation state

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| binary layout switch | one control slot; current value clear | inventory |
| unavailable layout by capability | omit control rather than fake disabled peer option where design says List-only | resolved |
| Display metadata toggles | only supported secondary fields | inventory |
| Triage Display order | constrained Review Due/Priority ordering choices | inventory |
| page change | page/location-specific presentation state boundaries | inventory |
| narrow View Bar | responsive control reflow without semantic changes | inventory |

### 10.6 Selection, highlight, Action Registry, Bulk, keyboard

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| pointer hover | highlight candidate only | resolved |
| keyboard focus/highlight | current candidate only; not persistent selection | resolved |
| single selection toggle | explicit selection affordance | inventory |
| range selection | shared collection model | inventory |
| select all current collection | shared collection model + visibility scope | inventory |
| clear selection | shared interaction | inventory |
| row selection gutter | checkbox independent from semantic leading property | resolved |
| navigate/open row/card | ordinary activation does not accidentally toggle selection | inventory |
| selection across context change | no invisible stale action scope | inventory |
| Context Menu scope | relevant current selection or explicitly invoked object | resolved |
| overflow menu scope | same Action Registry/context authority | inventory |
| Command Menu scope | same Action IDs, broader searchable subset | inventory |
| keyboard shortcut | binding -> Action ID -> current context | resolved |
| editor/input focus | suppress unsafe global Trail shortcuts | inventory |
| Bulk action availability | action must be common to every selected item | resolved |
| Bulk target availability | intersection of ordinary legal targets | resolved |
| already-at-target item | idempotent where underlying action supports it | resolved |
| no common target/action | action absent/unavailable | resolved |
| partial mutation failure | execution/feedback semantics without inventing Bulk Domain entity | inventory |

### 10.7 Feedback, writability, source health

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| normal fast optimistic mutation | immediate UI; no Saving/Saved success chrome | resolved |
| unusually slow local mutation | delayed low-noise Saving only if useful | inventory |
| normal fast bootstrap/refresh | no large status panel | resolved |
| sustained loading/refresh | compact shell-level status | inventory |
| mutation failure | rollback to reliable committed/LKG + transient action-specific error | resolved |
| scoped Data Issue | LKG visible + persistent scoped warning + Open source | resolved |
| Data Issue elsewhere | quiet workspace-level warning glyph/status | inventory |
| read-only-error with LKG | readable content + mutation disabled + persistent warning | resolved |
| blocking no-trustworthy-state error | explicit blocking recovery surface | inventory |
| capability unavailable | prevent at point of use; concise reason/recovery when helpful | resolved |

### 10.8 Shared collection/item presentation

| Responsibility | Known consumers | Existing evidence | Status |
| --- | --- | --- | --- |
| Collection Row base pattern | Project/Triage/Issue Lists | pre-vertical owner | candidate |
| Project Summary Row | Projects Root/Initiative Focus | target design | inventory |
| Workflow Issue Row | Project/Cycle/Historical lists | target design | inventory |
| Workflow Issue Card | Project/Cycle Boards | target design | inventory |
| Triage Row | Triage List/Foundation | pre-vertical independent semantic row | candidate |
| Project grouping header | Projects Root | target design | inventory |
| Board column | Project/Cycle Board | target design | inventory |
| Project swimlane | Current Cycle Board | target design | inventory |
| Empty state | multiple collection/page contexts | target design incomplete as shared contract | inventory |

## 11. E - Host integration and full-shell behavior

| Scenario | Responsibilities to close | Status |
| --- | --- | --- |
| Trail enabled - Trail leaf | Linear-faithful Trail presentation inside Obsidian mechanics | inventory |
| Trail enabled - ordinary Markdown/editor leaf | shared Trail visual mapping without taking editor mechanics away from Obsidian | inventory |
| Trail enabled - File Explorer/Search/Backlinks/Properties | native surfaces consume coherent visual mapping | inventory |
| native menus/prompts/popovers/modals | shared Linear-faithful visual mapping over mature host mechanics | inventory |
| Ribbon/tab/status surfaces | coherent plugin-wide presentation | inventory |
| plugin disable/unload | remove Trail presentation and reveal user's ordinary theme/workspace state | inventory |
| community theme compatibility | compatibility environment, not visual authority | inventory |
| one primary Trail tab | product locations navigate inside same Trail leaf | resolved |
| page-level Back/Forward | Obsidian View State owns history sequence/cursor/lifetime | resolved |
| page-local states | Review/filter/selection/Peek/overlays never become host-history nodes | resolved |
| history restore Triage | restore page location to normal List entry, not Review identity/draft | resolved |
| left sidebar ownership | Trail Navigation can coexist with ordinary host views | inventory |
| right sidebar ownership | Trail Inspector uses host view; unrelated views preserved | inventory |
| split/resize behavior | host-owned; Trail responds to actual pane capacity | resolved |
| Inspector entry-time reveal | one automatic capacity decision on location entry only | resolved |
| later resize | user-owned Inspector state; no automatic reopen/collapse | resolved |
| native Menu mechanics | prefer Obsidian API for context menus | resolved target; host calibration pending |
| native confirmation/Notice mechanics | prefer host API where semantics fit | inventory |
| icon mechanics | prefer Obsidian native -> adopted Lucide -> custom | resolved target; component calibration pending |
| Quick Capture hotkey | global entry while respecting editor/host focus conflicts | inventory |
| keyboard binding conflicts | bind Action IDs through host-compatible dispatch; literal Linear keymap not authority | resolved |

## 12. Existing implementation evidence classification

This is provenance only; no item below is accepted merely because it exists.

### 12.1 Pre-vertical independent implementations

- Button;
- IconButton;
- Checkbox;
- Input;
- Textarea;
- Progress;
- Separator;
- CollectionRow;
- PropertyControl;
- ViewBar / ViewLayoutSwitch;
- Priority identity / Priority property selection;
- TriageRow as an independent semantic row.

Initial status: `candidate`.

Each should be kept in Foundation Lab and reverified against the new cross-surface coverage before becoming `reusable-accepted`.

### 12.2 Post-vertical shared-looking candidates

- DueDate presentation;
- LabelDots presentation;
- DuePropertySelect;
- LabelPropertySelect;
- ViewPopover;
- CollectionFilter UI/state helpers;
- collection-filter Query helpers;
- WorkspaceShell / LocationBar;
- page-level Obsidian View State bridge.

Initial status: `candidate`.

These may be kept, changed, split, moved, or deleted after coverage review.

### 12.3 Foundation-only specimens

Current Foundation visual specimens include responsibilities such as:

- secondary/ghost/demo-hover button examples;
- calibration-only icons;
- tooltip;
- menu;
- composer;
- local status/label examples.

Initial status: `lab-specimen`.

A specimen becomes production-ready only after an independent reusable owner exists and the Foundation section consumes that real owner.

### 12.4 Current Triage vertical code

Current production Triage page, Review Surface, Triage ViewControls composition, Triage page CSS, vertical fixture mutations, and page-private Review mechanics:

Status: `retired-evidence` pending surgical rollback/replacement.

## 13. Universal state matrix

Every reusable owner and production surface must explicitly decide whether each state is applicable.

```text
normal
hover
focus-visible
pressed
selected
highlighted
disabled
read-only
empty
filtered-empty
loading
refreshing
source/data issue
global read-only-error
optimistic pending
mutation failure
long content
empty content
narrow
normal width
wide
mouse
keyboard
```

Not every owner needs every state. `N/A` should be explicit when a state does not belong to that responsibility.

Foundation Lab should retain representative applicable states for reusable owners after acceptance.

## 14. Closure rules

### 14.1 Reusable responsibility closure

A reusable responsibility may become `reusable-accepted` only when:

1. its authoritative Product/UI answer is clear;
2. all materially different V1 consumers in this ledger have been considered;
3. shared vs page-local ownership is explicit;
4. an independent production owner exists outside Foundation;
5. Foundation Lab consumes that exact owner and covers representative states;
6. semantic/component tests verify behavior rather than source-shape accidents;
7. real-Obsidian host calibration is complete when host behavior can change the answer;
8. unresolved Lab-only specimens for the same responsibility are removed or clearly retained only as experiments.

### 14.2 Page/local-surface closure

A page/local surface may become `page-ready` only when:

- every listed page-local scenario is resolved;
- reusable dependencies are `reusable-accepted`;
- page composition does not rewrite component internals to achieve local visual effects;
- responsive/focus/keyboard/error states are explicitly covered;
- production composition can be built without depending on Foundation code.

### 14.3 Production regression loop

When production verification finds a bug:

```text
is the bug page-local?
-> fix/verify page

is the bug a reusable contract failure?
-> reproduce or add representative case in Foundation
-> fix shared owner
-> verify Foundation
-> verify affected production consumers
```

This keeps Foundation useful throughout development instead of abandoning it after the first page ships.

## 15. Discussion order

The next review should proceed in two passes.

### Pass A - inventory/authority closure

1. settle the active authority reconciliation queue;
2. confirm all five inventory categories contain the intended V1 surfaces;
3. remove scenarios not supported by canonical scope;
4. add any missing materially different scenario;
5. only then choose reusable owners to close.

### Pass B - dependency-oriented reusable closure

Recommended order:

1. Foundation host/harness baseline + icon/action-control language;
2. fields and editing boundaries;
3. semantic property identity/control/picker family;
4. menus/popovers/confirmation mechanics;
5. View Bar + Filter + Display + location-scoped state;
6. feedback/writability/source-health presentation;
7. Selection + Action Registry + Bulk + keyboard ownership;
8. Composer/creation infrastructure;
9. shared row/card/collection patterns;
10. persistent Inspector family;
11. page-by-page composition: Home, Triage, Projects/Initiative, Project Workspace, Cycles, Search, Full Item;
12. production assembly and representative host verification.

The exact order may change when a real dependency appears. The old rule that the first production vertical defines the shared system remains retired.

## 16. Next discussion checkpoint

Before modifying production UI code:

- confirm the restructured inventory is complete enough to begin closure;
- settle the `ui.md` freeze-status conflict;
- keep the already-closed Home target intact and synchronize stale Product summaries when encountered;
- keep Foundation Lab's permanent engineering role explicit in the canonical UI boundary;
- choose the first shared responsibility family to close;
- update canonical `ui.md` whenever the target answer is missing/ambiguous;
- implement/verify the independent owner in Foundation Lab before production composition depends on it.

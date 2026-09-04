# Trail UI Design

## 1. Authority and Scope

This document owns Trail's resolved V1 UI behavior and presentation semantics.

It consumes Product, Domain, Data, and Architecture decisions rather than redefining them. Current implementation appearance, historical POC components, tests, Foundation specimens, and screenshots are evidence rather than design authority.

`docs/ui-blueprints.md` is the durable V1 composition and shared-owner blueprint produced from the completed drawing and shared-interaction pass. The relationship is:

```text
Product / Domain / Data / Architecture
-> docs/ui.md                    canonical UI behavior/presentation semantics
-> docs/ui-blueprints.md         concrete Page composition / owner boundaries
-> docs/design-to-code-map.md    canonical implementation ownership
-> docs/implementation.md        current implementation facts and plan
-> code
```

If this document and the blueprint appear to differ, first determine whether one statement is a behavior/semantic rule and the other is only composition/calibration. The blueprint may concretize this document but must not create a competing Product/Domain rule.

Trail V1 targets **Obsidian-native mechanics with a Linear-faithful Trail presentation while the plugin is enabled**:

- Obsidian owns window/tabs/splits/sidebars, native view headers, Back/Forward history, workspace/focus mechanics, and other mature host responsibilities.
- Trail owns product composition, Trail navigation content, semantic entity presentation, and Trail-specific workflows.
- Current Linear is the default presentation/interaction reference where Trail has the same responsibility.
- Trail copies observable presentation/interaction grammar, not proprietary source code, assets, DOM, or internal implementation.
- Trail must not add persisted Domain facts merely to support color, layout, selection, attention, ranking, filtering, or responsive presentation when those values are derivable.

### 1.1 Reference priority

Use this order when resolving a concrete UI responsibility:

1. Trail Product/Domain/Data/Architecture semantics;
2. current Linear equivalent where the responsibility is genuinely equivalent;
3. current official Linear documentation/screenshots/changelog;
4. current Obsidian host constraints and native mechanics;
5. an explicit Trail-specific answer where Trail semantics or Obsidian constraints differ.

### 1.2 Calibration boundary

The following are implementation-time calibration and do not reopen V1 design:

- exact pixels, spacing, colors, opacity, radius, shadow, and animation;
- exact icon among equivalent Obsidian/Lucide choices;
- exact pane-width/container-query thresholds;
- exact row/card heights and truncation thresholds;
- exact Inspector preferred width and location-entry reveal threshold;
- exact Home track count/spans/chart dimensions;
- exact Peek width and responsive threshold;
- exact Menu/Picker height/collision offsets;
- exact Bulk-bar offset/direct-action count;
- exact keyboard bindings where Obsidian/editor focus conflicts require calibration;
- exact delay before slow `Loading`, `Saving`, or `Refreshing` feedback becomes visible.

Calibration may refine geometry or internal API shape but must preserve the behavior below and the composition blueprint.

## 2. Visual System and Reuse

### 2.1 Full-shell visual ownership

Trail components are calibrated inside the complete Obsidian application, not in isolation. While Trail is enabled, native Obsidian surfaces and Trail-owned surfaces should consume one coherent Linear-faithful dark visual system through shared semantic tokens and host-variable mapping.

The V1 calibration environment is Obsidian Default Dark mechanics plus Trail's Linear-faithful dark reconstruction. Community themes are compatibility environments, not design authority.

### 2.2 Stable semantic identity

The same Domain concept uses the same visual identity everywhere. Density may vary, but the concept must not become a different glyph/badge language in each surface.

Examples:

- Status keeps one glyph/shape + semantic-color grammar.
- Priority keeps one compact priority glyph grammar.
- Labels use deterministic stable-identity colors; dense surfaces may use dots while precise surfaces add names.
- Due uses one temporal/calendar identity plus derived Today/Overdue emphasis.
- Estimate remains the canonical T-Shirt level `S / M / L / XL`, not its aggregation weight.
- Current Cycle membership uses one stable relation marker where membership is not already expressed by Page scope.

### 2.3 Reuse rule

Use this extraction rule:

```text
same semantic responsibility
OR same mechanical responsibility
-> reuse one owner

only visually similar
but workflow/meaning differs
-> keep composition separate
-> reuse lower-level mechanics only
```

Stable shared layers are:

```text
visual tokens
-> primitives
-> patterns
-> semantic/entity UI
-> shared interactions
-> shell + Page composition
```

Do not create universal components merely because several Pages contain rectangles, lists, modals, or charts. In particular, the V1 target rejects `UniversalPage`, `UniversalCollection`, `UniversalDetails`, `UniversalChart`, `UniversalPicker`, `UniversalWorkflowModal`, and generic `DashboardCard` abstractions.

### 2.4 Mature mechanics first

Preferred mechanic ownership:

```text
Obsidian-native API/mechanic
-> browser semantic capability
-> already-adopted focused headless primitive
-> custom Trail mechanic only when required
```

Context Menu is the canonical example: use Obsidian `Menu` mechanics where practical, styled through the shared Trail contract. Foundation Lab remains a verification consumer of production owners and never becomes a parallel production component library.

## 3. Host Composition, Navigation, and Search

### 3.1 Host ownership

```text
Obsidian window
|- Ribbon
|- Left Sidebar
|  `- Trail Navigation
|     |- normal navigation
|     `- temporary Search mode
|- Main leaf
|  |- native view header / Back / Forward
|  `- current Trail Page
`- Right Sidebar
   `- Trail Inspector when the current Page has a stable target
```

Trail does not duplicate the host sidebar, tab strip, Back/Forward controls, split system, or fake Right Sidebar column inside Main View.

### 3.2 Normal Trail Navigation

```text
Trail                                      Search

Home
Triage                                     <Review Set count when non-zero>

Workspace
Projects
<current Default Project title>
Cycles
```

Rules:

- `Search` is a high-frequency action in the Trail identity area, not a Page row.
- `Workspace` is a quiet section label.
- `Projects` is a fixed destination and does not expand into Project children.
- the Default Project row is one stable shortcut after `Projects` and before `Cycles`;
- the Default Project is an ordinary Project and displays its current title;
- `Triage` may show a quiet global Review Set count;
- Initiatives, Favorites, Foundation Lab, Settings, and dynamic Project children are not normal navigation rows;
- Quick Capture is an Obsidian command/global-shortcut entry and is **not** a normal Sidebar row/action.

### 3.3 Sidebar Search mode

Activating `Search` temporarily replaces normal Trail Navigation content:

```text
<-  Search

[ Search initiatives, projects, issues... ]

Initiatives
  ...

Projects
  ...

Issues
  ...
```

Search is **not** a Main View Page/location.

Opening Search:

- leaves Main View unchanged;
- does not create host history;
- does not retarget or replace the persistent Right Sidebar;
- focuses the search input immediately.

V1 result kinds are exactly Initiative, Project, and Workflow Issue. Triage entries, Cycles, and ordinary Obsidian notes are not Sidebar Search result kinds.

`Esc` or the Search back control restores normal Trail Navigation without changing Page. Activating a result performs normal navigation, closes Search, and restores normal Sidebar content. Sidebar Search results never open Peek over an unrelated current Main View.

### 3.4 Page locations and host history

Representative Trail Page locations are:

```text
Home
Triage
Projects
Initiative(initiativeId)
Project(projectId)
Issue(issueId)
Cycles / cycle-related locations
```

Search is absent because it is Sidebar state.

Obsidian owns the Back/Forward sequence. Trail writes Page-level location into host View State and does not persist a parallel history.

The following remain transient Page/session interaction state and do not become history nodes:

- Filter/Order/layout;
- selection;
- section/group collapse;
- Peek;
- Triage Review identity/Previous/Next/progression;
- Menu/Picker/Popover/Composer/Confirmation state;
- inline edit drafts;
- hover/focus/scroll/responsive geometry.

### 3.5 Page-owned header and breadcrumb

The shared Workspace Frame owns Main View framing, pane-capacity input, and host integration only. It does **not** impose a mandatory Location Bar, breadcrumb, title, or universal toolbar.

Each Page owns the visible responsibilities it actually needs:

```text
optional breadcrumb / ancestry
+ current identity / title
+ narrative context when useful
+ Page actions / overflow
+ collection controls when useful
+ Page content
+ Inspector relationship
```

A reusable Page Header may share geometry and constrained-width behavior, but Page code supplies identity, ancestry, and actions.

Project and Initiative descriptions are lightweight Main View narrative context, not Inspector property rows and not separate Overview Pages. Short descriptions are shown fully; long descriptions may use bounded expansion. Wikilinks follow the link and do not also toggle narrative expansion.

### 3.6 Inspector placement

The Trail Inspector is an Obsidian Right Sidebar view.

No stable primary entity -> no Trail Inspector:

```text
Home
Triage
Projects Root
Sidebar Search mode
```

Stable primary entity -> matching Inspector may be available:

```text
Initiative Focus    -> Initiative Inspector
Project Workspace  -> Project Inspector
Current Cycle      -> Current Cycle Inspector
Historical Cycle   -> Historical Cycle Inspector
Issue Full Item    -> Issue Inspector
```

Inspector initial visibility is decided once on location entry from actual Obsidian workspace capacity. While that location remains active, the user's host actions own visibility; Trail does not repeatedly auto-open/close Inspector during resize, layout switching, or Peek. Unrelated Right Sidebar views must not be destructively closed.

## 4. Shared Collection Behavior

### 4.1 Collection Controls

A shared Collection Controls pattern owns only the mechanical leading/trailing row and responsive overflow. There is no globally required `Display` control.

Accepted V1 compositions:

```text
Projects Root
Filter                                      [ List | Timeline ]

Initiative Focus
Filter

Project Workspace, Started
Filter                                      [ List | Board ]

Project Workspace, other lifecycle states
Filter

Current Cycle
Filter                                      [ List | Board ]

Historical Cycle
Filter

Triage
Filter                                Order: Review due v
```

### 4.2 Filter grammar

```text
Filter
-> choose Property
-> choose Value(s)
-> visibility updates immediately
```

Discrete values:

```text
0 selected values      -> no clause / All
1..N selected values   -> OR inside one property
different properties   -> AND between clauses
```

V1 has no generic exclude/is-not/includes-all operator, nested boolean builder, saved Filter object, or hidden page-specific filter language.

Applied clauses remain visible near Filter, can be reopened directly, and may be removed individually. `Clear filters` appears when at least one clause is active.

Filter state is location-scoped, session-only UI state. It may survive List/Board switching and navigating away/back during the current Trail session. It is not Domain Data, canonical Runtime, Workspace State, Custom View persistence, Markdown, or Plugin Data.

Page registries:

| Collection | Filter properties |
| --- | --- |
| Projects Root | Status · Initiative · Priority · Labels · Due |
| Initiative Focus | Status · Priority · Labels · Due |
| Project Workspace | Status · Priority · Milestone · Labels · Due · Estimate |
| Current Cycle | Status · Project · Priority · Milestone · Labels · Due · Estimate |
| Historical Cycle | Status · Project · Priority · Milestone · Labels · Due · Estimate |
| Triage | Due · Priority · Labels |

Page scope is not redundantly reintroduced as a Filter field where it adds no useful choice.

### 4.3 Due Filter semantics

Due is a specialized single-choice/replacement clause:

```text
Overdue
Today
This week
This month
No due                 when nullable
Pick date...
```

Cutoff semantics use the Workspace timezone/calendar policy:

```text
Overdue      -> Due < start of today
Today        -> Due <= end of today
This week    -> Due <= end of current Monday-Sunday week
This month   -> Due <= end of current calendar month
Pick date    -> Due <= end of selected date
No due       -> Due absent
```

The dated choices are cumulative cutoffs, not date-window membership. Therefore an overdue item also matches Today, This week, and This month.

### 4.4 Row/Card intent separation

Ordinary activation, selection, inline property editing, and explicit actions are separate intents:

```text
ordinary activation
-> Page-specific navigation or Workflow Issue Peek

selection control
-> selection only

inline property control
-> property Picker/edit only

explicit ... / right-click
-> Action Registry
```

Inline property interaction must not also trigger ordinary row activation.

### 4.5 Group Header and Status Section

Group Header owns disclosure + identity + quiet count. Disclosure toggles the group without navigation; identity may navigate when it represents a real entity. `No Initiative` is a grouping label, not an entity.

Project Workspace and Current Cycle List use the persistent complete Workflow Status skeleton. With default statuses:

```text
In Progress
Todo
Backlog
Done
Canceled
```

Every Status header remains visible even when its current filter-visible count is zero. Empty sections collapse to header height but keep workflow structure legible. Concrete StatusDefinitions retain configured names/order within their system category.

### 4.6 Shared Issue Row/Card hierarchy

Project Workspace row:

```text
[Selection] [Priority] Title   Milestone   Labels   Current Cycle   Estimate   Due
```

Current Cycle List row:

```text
[Selection] [Priority] Title   Project   Milestone   Labels   Estimate   Due
```

Historical Cycle row:

```text
[Selection] [Priority] Title   Project   Status   Milestone   Labels   Estimate   Due
```

Rules:

- Title is strongest and flexible.
- Status is omitted when enclosing Status section/column already expresses it.
- Project is omitted when Page/lane scope already expresses it.
- Current Cycle marker is omitted when Cycle Page scope already expresses membership.
- Description/body stays out of scanning Row/Card.
- absent optional values normally disappear rather than filling rows with placeholder dashes.
- Board Cards do not become mini Full Item views.

### 4.7 Empty-state grammar

Keep these states distinct:

```text
true empty
-> underlying collection truly empty
-> optional creation/membership guidance when capability permits

filtered empty
-> underlying collection has data
-> no-match copy + Clear filters
-> no duplicate creation CTA

projection empty
-> Page scope has data but current presentation excludes it
-> retain structural lanes/sections
```

Examples:

- empty Project List -> full zero-count Status skeleton + `New issue` only when creation is legal;
- filtered Project List -> zero-count skeleton + `Clear filters`;
- Board containing only Backlog/Canceled Issues -> keep Todo/In Progress/Done lanes;
- empty Current Cycle -> `Add issues`, not `Create issue`;
- Historical Cycle true empty -> no CTA;
- filtered Triage -> no Add-to-Triage CTA.

## 5. Shared Interaction System

### 5.1 Transient interaction stack

Menus, Pickers, Popovers, Peek, Composers/workflow modals, and Confirmations share one top-layer ownership rule:

```text
Esc
-> dismiss only the topmost active interaction layer
-> restore focus to surviving trigger/parent when practical
-> never also dismiss the parent in the same key action
```

Ordinary Menu/Picker/Popover outside-click closes that child only. Composer backdrop follows Composer dirty/discard semantics. Confirmation backdrop means Cancel and never confirms a destructive/lifecycle action. Peek has no modal backdrop. Tooltip does not become an interaction-stack layer.

### 5.2 Action Registry

One Action Registry is the UI authority for stable actions, context resolution, capability, legal targets, and Application intent.

Consumers include:

```text
Context Menu
overflow ...
Bulk Bar
contextual Command Menu
keyboard shortcuts
```

Presentation subsets may differ without creating different action semantics.

Context Menu grouping order is:

```text
navigation / inspect
-> common mutations
-> relationship / lifecycle actions
-> low-frequency actions
-> destructive actions last
```

An action that does not belong in the context is absent. A temporarily unavailable action may remain disabled when explaining why/recovery is useful.

### 5.3 Context scope and selection

Right-clicking a selected item may use the relevant current selection as action scope. Explicitly right-clicking an unselected item scopes that menu to the clicked item and must not execute against an unrelated stale selection. Right-clicking an unselected item does not need to destroy the existing selection merely to establish this one menu scope.

Selection is transient UI state bounded by the current visible actionable projection. Filtering or switching presentation removes identities that are no longer visible/actionable. Page navigation clears collection selection.

A collection-level Bulk Bar shows count + useful common actions + overflow + clear. Do not create one Bulk Bar per Board column/swimlane.

Bulk legality is the intersection of ordinary item legality:

```text
same action
+ same target
+ every selected item can legally accept it
```

### 5.4 Peek

Peek is the shared **read-only Workflow Issue inspection** surface for eligible Issue collections.

Pointer and keyboard behavior:

```text
ordinary Workflow Issue Row/Card activation -> open Peek
highlighted Issue + Space                    -> toggle Peek
Peek open + Up/Down                          -> retarget adjacent visible/ordered Issue
Esc                                          -> close Peek
```

Opening or retargeting Peek does not navigate, create host history, change Page, select the Issue, or retarget the persistent Inspector.

Peek displays title, full lightweight description/body, and useful structured facts such as Status, Project where useful, Priority, Milestone, Labels, Due, Estimate, and Current Cycle context. V1 Peek does not directly edit those values.

`Open full item` enters Issue Full Item. Peek `...` scopes actions to the Peek target only, even when the background collection has a multi-selection.

On wide Main View, Peek is a floating right-side Main View surface; on constrained Main View it becomes a near-full-width transient Main View preview. It never becomes the persistent Right Sidebar and is not used for Project rows, Triage Review, or Sidebar Search results.

Retargeting uses the current visible + ordered collection. If the current Peek target disappears from that projection, close Peek rather than guessing a successor. Triage Review progression is a workflow-specific exception and is not reused by Peek.

### 5.5 Picker family

Picker mechanics form a family rather than one universal component:

```text
small fixed single-select       -> Select/Menu
large relation single-select   -> searchable Picker
multi-select                    -> searchable multi Picker
temporal                        -> date/calendar Picker
```

Shared mechanics include focus, keyboard navigation, selected-state grammar, search-field behavior, empty results, Esc/outside-click, focus restoration, and viewport collision. Semantic values and legality remain owned by the relevant entity/query capability.

Single-select applies and closes. Multi-select applies immediately while staying open; no extra Save/Done step is required.

### 5.6 Confirmation

Shared Confirmation mechanics:

- `Esc` -> Cancel;
- backdrop -> Cancel;
- initial focus follows a safe/Cancel path;
- destructive/lifecycle mutation requires explicit confirm activation;
- copy states the concrete consequence rather than generic dramatic wording;
- Trail must not promise Undo/recovery it does not actually implement.

Delete, Discard draft, and Close Cycle may share mechanics without becoming the same semantic action.

### 5.7 Contextual Command Menu

Obsidian Command Palette remains the host/global command surface for plugin/global commands such as Quick Capture.

Trail contextual Command Menu is a searchable presentation over the same Action Registry for the current Trail entity/selection/context. It is not Search, not navigation, and not a second action authority. Exact shortcut binding is implementation-time Obsidian calibration.

## 6. Creation

### 6.1 Shared Composer family

Triage, Workflow Issue, Project, and Initiative creation use one transient Composer infrastructure. Page/invocation code supplies entity fields, defaults, legal context, and submit intent; it must not duplicate the basic shell/title/body/property/focus/dismiss stack.

Common form:

```text
light creation context
Title
Description / body
compact semantic properties
restrained footer / Create
```

Creation does not navigate, change host history, or retarget the persistent Inspector. Normal successful creation closes and returns to the invoking context. Triage Accept remains the workflow-specific destination-first exception.

V1 has no persisted Creation Draft entity and no Create-more mode.

### 6.2 Dirty/dismiss behavior

`x`, `Esc`, and Composer backdrop are three presentations of one dismiss intent.

```text
attempt dismiss
|- draft equals invocation baseline
|  `- close immediately
`- meaningful user-authored difference remains
   `- Discard changes?
      |- Cancel  -> return to Composer with draft intact
      `- Discard -> close, create nothing
```

System/context prefill is clean. User changes to title/body/relations/properties are dirty. Reverting exactly to the invocation baseline clears dirty state.

Quick Capture preserves authorship across expansion: a user-typed title remains dirty after the full Triage Composer opens and must not be reclassified as harmless system prefill.

### 6.3 Focus, keyboard, validation, and failure

Initial focus:

```text
required structural input unresolved?
|- yes -> focus required structural input
`- no  -> focus Title
```

`Ctrl+Enter` / `Cmd+Enter` invokes Create in the full standard Composer. Ordinary Enter is not a global submit gesture there.

Missing required values keep creation unavailable or produce concise local validation and focus the specific control. Persistence failure keeps the Composer open and preserves its draft; it must not close and rely only on a toast.

### 6.4 Triage Composer and Quick Capture

Standard Triage Composer:

```text
Triage

Title
Description / body

Priority   Labels   Due

Create
```

Title and Due are required by the Triage contract; Priority/Labels are optional. Due means review Due by context.

Quick Capture is an Obsidian command/global-shortcut entry:

```text
Quick Capture
-> title-first surface
-> Enter
-> standard Triage Composer
   - user title preserved
   - normal Due default present
-> ordinary Composer interaction
-> Create
```

The first Enter expands; it does not create. Triage Page and Home open the full Triage Composer directly rather than title-first Quick Capture.

### 6.5 Workflow Issue Composer

```text
Issue · Project v

Title
Description / body

Priority   Labels   Milestone   Estimate   Due

Create
```

Project is a required structural relation and remains visible in the light creation context. Invocation may prefill it but the final selection is explicit and editable. Changing Project clears a Milestone that is illegal for the new Project.

Creation Status is not editable. Every normal Workflow Issue begins in the configured Backlog StatusDefinition. Cycle is not an Issue creation property.

Invocation rules:

- Project Workspace `+` -> current Project prefilled/editable;
- concrete Milestone context may prefill Project + Milestone;
- Home/context-neutral Issue create -> legal Default Project may prefill, otherwise Project unresolved;
- Triage Accept -> Issue -> seed source Title + Description/body only; legal Default Project may prefill; no automatic Triage Priority/Labels/Due copy.

Completed/Canceled Projects are not legal open-Issue creation targets. An illegal Default Project is treated as no prefill, never as hidden permission or fallback.

### 6.6 Project Composer

```text
Project

Title
Description / body

Initiative   Priority   Labels   Due

Create
```

Initiative is optional. Project Status is not editable during creation; normal creation uses the configured Unstarted-category default. Projects Root opens this Composer directly. Initiative Focus may prefill its Initiative while leaving it editable. Triage Accept -> Project seeds Title + Description/body only.

### 6.7 Initiative Composer

```text
Initiative

Title
Description / body

Priority   Labels   Due

Create
```

Initiative has no Status and no required Project membership during creation. Projects associate later through `Project.initiativeId`.

### 6.8 Home creation menu

Home owns one compact `+` menu:

```text
Triage
Issue
Project
Initiative
```

Each entry opens the standard Composer above. Home does not define a second creation model.

### 6.9 Milestone quick-create

Milestone uses a smaller anchored quick-create surface from Project Inspector rather than the standard full Composer:

```text
New milestone

Name
Due
Description
```

Project is implicit/fixed. Milestone has no Status, Priority, Labels, Estimate, Cycle, or manual completion field. It reuses lower-level input/body/Due/focus/validation/dismiss mechanics.

## 7. Projects Root and Initiative Focus

### 7.1 Projects Root

Projects Root is Project-first portfolio browsing and temporal overview.

```text
Projects                                               +

Filter                                      [ List | Timeline ]
```

No breadcrumb, no Trail Inspector, no generic Display/Sort builder. The default Projects Root filter hides Completed/Canceled Projects; users may include terminal Projects explicitly through the normal Status Filter.

List groups Projects by Initiative, with `No Initiative` last. Initiative identity navigates to Initiative Focus; disclosure only collapses/expands the group. Group order is stable and does not jump according to child urgency.

Default Project collection order inside each Initiative group:

```text
actionable before terminal
-> Due urgency
-> lifecycle / configured StatusDefinition order
-> Priority
-> Created At only when the entity actually owns a canonical creation timestamp
-> stable deterministic fallback
```

For Projects, no canonical Product-level Created At ordering fact currently follows Priority, so stable deterministic fallback applies there. Activity, Progress, Attention/Health score, manual rank, and persisted focus score are not hidden order inputs.

Project Summary Row remains compact:

```text
[Status] Project title      Status      Priority      Progress      Due
```

Title is strongest. Project lifecycle Status remains visible because Projects Root groups by Initiative rather than Status. Progress is read-only. Labels are not part of the normal scanning row unless a future explicit design reopens that hierarchy.

Completed/Canceled Projects remain in their actual Initiative group with reduced visual weight when visible; they do not move to a separate Archive model. Canceled Projects with unresolved child work may retain an exception Attention signal.

### 7.2 Initiative Focus

Initiative Focus is the same Project collection scoped to one Initiative:

```text
Projects / Initiative Alpha                         +
------------------------------------------------------
<optional Initiative description>
------------------------------------------------------
Filter
------------------------------------------------------
<Project Summary Rows>
```

It is List-only and has no Initiative filter, Board, Timeline, Display builder, or multi-Project Issue workspace. All Project lifecycle states are visible by default because the Initiative Page is already a deliberate scoped focus. `+` opens Project Composer with the current Initiative prefilled/editable. Structured Initiative properties remain compact Inspector material.

True empty may offer `New project`; filtered empty offers `Clear filters` only.

### 7.3 Project Timeline

Projects Root may switch the same filtered Project collection into a lightweight read-oriented Timeline. Initiative Focus does not expose Timeline.

Timeline is a projection of current retained evidence, not a Gantt or second schedule truth. It never introduces manual Project start/end, dependencies, resource planning, drag-to-reschedule, duration resizing, or persisted timeline rank.

#### Eligibility

A Project with no current child Workflow Issues is omitted even when the Project itself has Due.

A Project with current child Issues is eligible when at least one of these is true:

- at least one current child Issue has `firstStartedAt`;
- current Project Status is in the Started category;
- at least one currently eligible Project/Milestone/Issue Due exists;
- every current child Issue is closed, allowing a closed never-started lifecycle envelope.

A Planned Project containing only never-started open Issues and no eligible Due is omitted.

#### Left-side temporal span

Execution-evidence mode applies when any current child Issue has `firstStartedAt`:

```text
start = earliest current child Issue.firstStartedAt
```

If any started Issue is currently open, the solid execution envelope extends to today. Otherwise it ends at the latest current `terminalAt` among Issues that also have `firstStartedAt`.

Never-started Issues cannot extend the solid execution envelope merely because they later have terminal timestamps. The bar is a current lifecycle envelope, not continuous effort/utilization history.

Planning/lifecycle-evidence mode applies only when no current child Issue has `firstStartedAt`:

```text
origin = earliest current child Issue.createdAt
```

`createdAt` alone does not make a Project eligible. Once otherwise eligible:

- current Started Project -> faint span from earliest createdAt through today;
- all current child Issues closed and never started -> faint span through latest current Issue terminalAt;
- otherwise eligible Due may provide the second boundary;
- do not fabricate reverse/zero-length bars when endpoint is not later than origin.

Project Status does not rewrite Issue evidence; Timeline shows current facts even when lifecycle combinations are unusual.

#### Due markers

Due is a separate marker layer. A Due remains eligible only while its corresponding entity is currently incomplete/open:

```text
Project Due   -> Project Planned / In Progress only
Issue Due     -> Issue open only
Milestone Due -> Milestone not derived complete
```

A closed parent does not silently erase an independently active child's Due. Past eligible Due values remain visible and may receive Overdue emphasis.

#### Future span

```text
futureDueHorizon = latest eligible Due later than today
```

When present, draw a faint span from today to that horizon. Historical execution/planning evidence and future Due span are independent; do not fill empty time with invented activity.

Query owns eligibility/span/marker derivation from Effective Runtime + temporal context. UI maps the projection to viewport/scale geometry only.

## 8. Project Workspace and Issue Presentation

### 8.1 Lifecycle-dependent workspace role

Project Workspace always displays actual current child facts. Project lifecycle changes legal controls/presentations; it does not hide or rewrite child data.

| Project lifecycle | Role | Layout |
| --- | --- | --- |
| Planned / Unstarted | planning-only | List |
| In Progress / Started | planning + execution | List / Board |
| Completed | settled review/correction | List |
| Canceled | cleanup/review | List |

The current Default Project has no special execution privilege.

### 8.2 Header, narrative context, and creation

Stable composition:

```text
Projects / [Initiative /] Project Trail                 +
----------------------------------------------------------
<optional Project description>
----------------------------------------------------------
Filter                                      [ List | Board ]
----------------------------------------------------------
<Status-first Issue collection>
```

Header `+` is stable but enabled only when Project capability allows child Issue creation. An unavailable action may explain that reopening is required; it never silently changes lifecycle.

### 8.3 List

Project List uses the persistent complete Status skeleton. Within each visible Status:

```text
Due urgency
-> Priority
-> createdAt
-> stable deterministic fallback
```

Milestone/Label similarity does not create hidden clustering. Terminal sections may reduce actionable Due emphasis but remain deterministic rather than becoming activity feeds.

Planned Projects can create/edit Backlog planning work but cannot advance work into normal execution. Completed/Canceled Projects are not active child-creation/execution contexts, while legal cleanup/move/correction remains available according to canonical capability.

### 8.4 Board

Board exists only while Project Status is Started. Default visible concrete Status columns are:

```text
Todo -> In Progress -> Done
```

Backlog/Canceled remain valid Workflow statuses but are outside normal Board projection.

Rules:

- no per-column create affordance;
- normal Issue creation still starts in Backlog;
- cross-column drag changes Status only;
- same-column drag does not persist rank;
- empty lanes remain visible;
- Filter changes visible cards, not the fixed workflow columns;
- once minimum useful width is reached, Board owns horizontal scrolling rather than stacking columns or auto-switching to List.

### 8.5 Effective capability

UI consumes one effective capability projection instead of page-local lifecycle condition chains.

With default Project statuses:

| Capability | Planned | In Progress | Completed | Canceled |
| --- | ---: | ---: | ---: | ---: |
| read/filter/inspect child data | yes | yes | yes | yes |
| create child Issue -> Backlog | yes | yes | no | no |
| accept moved-in Backlog Issue | yes | yes | no | no |
| accept moved-in execution Issue | no | yes | no | no |
| edit/plan Backlog child | yes | yes | no | no |
| advance Backlog -> execution | no | yes | no | no |
| normal Issue workflow | no | yes | no | no |
| move child Issue out | yes | yes | yes | yes |
| create/edit Milestone | yes | yes | no | no |
| Board | no | yes | no | no |

Target Project pickers consume this same capability. Move never silently rewrites Status just to make a target legal.

### 8.6 Project Progress

Project Progress answers only current completion:

```text
completed current child Issues
--------------------------------
all current child Issues except Canceled
```

Canceled Issues are excluded completely. Started receives no partial credit and Estimate/Priority/Due do not weight the result. Empty denominator -> `—` unavailable, not fabricated 0/100%.

Project Status remains independent: an In Progress Project may show 100% until the user explicitly completes the Project.

### 8.7 Project Temporal Attention

Input:

```text
child Issue
AND StatusCategory not Completed/Canceled
AND Due present
```

Segments are mutually exclusive:

```text
[ Overdue ][ Due This Week ][ Later Due ]
```

Backlog participates when it has Due. The display is distribution, not Progress or persisted Health.

Only a segment exactly representable by the shared Filter grammar becomes a direct Filter shortcut. `Overdue` maps exactly. `Due This Week` and `Later Due` do not map exactly to the cumulative Due-cutoff filter and therefore remain informational.

### 8.8 Project Inspector and Milestones

Project Inspector sections:

```text
Properties
Status / Initiative / Priority / Labels / Due

Progress

Attention

Milestones                                  +
```

Milestone Progress uses Completed / non-Canceled associated Issues, with empty denominator unavailable. No manual Milestone completion checkbox/status or persisted order exists.

Clicking an Inspector Milestone applies the normal Project Workspace Milestone Filter; it does not navigate to a Milestone Page. Milestone create/edit/delete/assignment controls are available only while Project planning capability allows them.

Deleting a Milestone preserves Issues and clears/replaces the Milestone relation as the business action requires; confirmation must not imply Issue cascade deletion.

### 8.9 Delete Project

Delete is a low-frequency destructive Project action, not a Status transition.

The current Default Project is not a legal Delete target. The user must first change the independent Workspace Default Project setting.

Deleting a non-Default Project with child Workflow Issues requires an explicit legal replacement Project:

```text
preserve child Workflow Issues
-> move them to selected legal replacement Project
-> clear old Project-scoped Milestone relation
-> remove old Project Milestones
-> remove Project
```

Delete never changes Workspace Default and never silently rewrites Issue Status merely to make the replacement target legal. Confirmation states useful concrete consequences/counts.

## 9. Peek, Full Item, and Inspector

These surfaces express different information depth:

```text
Row / Card -> scan
Peek       -> inspect hidden detail without leaving collection
Full Item  -> deep entity/content editing
Inspector  -> structured information/actions for current primary entity
```

### 9.1 Inspector projection rule

Inspector renders meaningful effective entity presentation, not raw Markdown metadata:

```text
canonical Domain facts
+ effective Runtime relations
+ Query-derived information
+ current lifecycle/context
-> entity presentation projection
-> Inspector
```

Physical IDs, carrier paths, parser ranges, schema markers, and implementation timestamps do not appear merely because they exist.

Useful semantic sections are Properties, Context, derived Progress/Attention summaries, and Info when retained history has real product value.

Inspector follows the current primary Trail Page/entity, not transient hover, keyboard focus, multi-selection, or Peek target.

### 9.2 Issue Full Item

Issue Full Item replaces Main View content in the same Trail tab:

```text
Main View                                 Right Sidebar

inline-editable title                     Issue Inspector
lightweight Markdown body                 Status
                                           Project
                                           Priority
                                           Milestone
                                           Labels
                                           Due
                                           Estimate
                                           Current Cycle context/action
```

The body reuses mature Obsidian/CodeMirror Markdown conventions. Checklists remain ordinary execution notes/steps, not Sub-issues. `[[wikilinks]]` connect to ordinary Obsidian notes. Property edits in Inspector must not remount the editor or destroy cursor/scroll state.

The title/body editing surface and Inspector may share lower primitives with creation but are not forced into the Creation Composer workflow.

## 10. Triage

Triage is Trail's personal intake/review queue, not a normal Workflow Issue workspace. Domain/Data reuse the Issue record in Triage context; UI presents a Triage entry and Triage-specific review workflow.

### 10.1 Collection, ordering, and Review Set

Every active Triage entry remains browseable regardless of whether Review Due is past, near, or future. Review Due means latest time to review again; it does not hide the entry before then.

Default Triage order:

```text
Review Due ascending
-> Priority
-> stable deterministic fallback
```

V1 derives a global Review Set:

```text
Review Set
= every active Triage entry with Review Due <= now + 7 calendar days
+ earliest remaining entries in normal ordering until at least 10 are included
```

If fewer than 10 active entries exist, all are included. If more than 10 already fall in the seven-day horizon, all horizon entries are included. Review Set is derived query/presentation state, not persisted rank/lifecycle.

Triage Page may show a quiet global count and, only in the unfiltered queue using Review-Due order, a subtle boundary/end-of-target treatment.

### 10.2 Filter and Order

```text
Filter                                Order: Review due v
```

Filter registry is exactly Due, Priority, Labels. Triage Due is required, so its Due filter has no `No due` choice.

`Order` has exactly two choices:

```text
Review due
Priority
```

It does not become Display/Group/Sub-group/Board/Timeline/manual order/generic Sort. Changing Order does not recompute the global Review Set.

When Filter is active, do not render the unfiltered Review Set boundary as though it were a filtered-list boundary. A clearly global count may remain.

### 10.3 Triage Row

True empty Triage may show a centered `+ Add to Triage` affordance that opens the standard full Triage Composer. Filtered empty shows `Clear filters` only.

```text
[Selection] [Priority] Title                 Labels   Review Due
```

No Workflow Status, Project, Milestone, Estimate, or Cycle is shown because those are not Triage review semantics. Description/body belongs in Review, not the compact row.

### 10.4 Review Surface

Opening a Triage row enters page-local sequential Review, not Workflow Issue Peek/Full Item and not Right Inspector.

```text
exit      previous / next            position

Title

Priority     Labels     Review Due

Description / body

Accept       Defer      Delete       ...
```

Wide Main View may show Queue + Review side by side. Constrained Main View focuses Review while preserving queue position/Previous/Next and the underlying Filter/Order state. Review has an explicit exit back to full Triage List without leaving the Triage Page.

Previous/Next uses the current visible + ordered Triage projection. If current entry is no longer in that projection, adjacency is unavailable rather than inferred from a stale historical slot.

Uncommitted title/body drafts are transient. Leaving the current Review identity or Triage Page discards them rather than turning navigation into implicit save.

### 10.5 Review-completing progression

Accept, Defer, and Delete complete the current Review step.

After success:

```text
record current visible/ordered slot
-> re-query
-> exclude just-completed identity when it still exists
-> select item now occupying that slot
-> if no successor, exit Review to List
```

Ordinary title/body/property edits do not complete Review and remain on the current entry.

### 10.6 Accept

Accept means “formalize this intake” and first chooses target kind:

```text
Accept
|- Issue
`- Project
```

Direct activation opens the same two-target disclosure; Trail does not silently default to Issue. The disclosure reuses shared Menu/Popover mechanics.

Issue opens standard Workflow Issue Composer. Project opens standard Project Composer. Automatic seeds are Title + Description/body only. Triage Priority, Labels, and Review Due are not copied automatically.

Canceling the target Composer leaves source Triage unchanged. After target creation succeeds, destination-first mutation removes the Triage source and Review progression advances.

### 10.7 Defer

Defer changes Review Due on the same Triage entry; it does not create Snooze/Deferred state or remove the entry from the collection.

Primary action:

```text
Defer -> Review Due + 7 calendar days
```

Alternates may include Tomorrow, This weekend, Next weekend, +1 month, and Pick date. They resolve through the shared Workspace temporal policy.

After success, ordinary ordering moves the entry and Review progression advances. The deferred entry remains browseable and may still fall inside Review Set if the minimum-size rule pulls it in.

### 10.8 Delete

Delete is lower visual weight than Accept/Defer, is available from Review and shared context actions, and uses the shared destructive confirmation mechanics. V1 has no separate discarded-Triage history/status merely for undo-like semantics.

## 11. Cycles

Cycle is a focused planning/execution workspace over a Cycle-owned set of Workflow Issue IDs. Membership is independent from Status, Project, Milestone, Priority, Estimate, Labels, and Due.

### 11.1 Navigation and lifecycle

Sidebar has one `Cycles` row. When a Current Cycle exists, it opens Current Cycle. When none exists, Cycles shows a compact Start Cycle surface plus secondary History access. V1 has no Upcoming/Future Cycle object.

Current Cycle identity is its date range, not a persisted title. Page-owned header/breadcrumb may expose History, stable `Add issues`, and low-frequency overflow without reintroducing a global Location Bar.

At most one Cycle is Open. Reaching planned end never auto-closes it.

### 11.2 Current Cycle List and Board

Current Cycle scope is exactly live Workflow Issues whose IDs are in the Open Cycle membership. Issue records remain authoritative for all Issue facts.

Default layout is Board, with List available through direct `List | Board` control.

Current Cycle List uses the same persistent Status skeleton as Project Workspace. Project remains ordinary row metadata because List has no Project swimlane. Within each Status:

```text
Due urgency
-> Priority
-> createdAt
-> stable deterministic fallback
```

There is no hidden same-Project List clustering.

Cycle Board uses concrete Status columns horizontally and Project swimlanes vertically:

```text
                  Todo           In Progress       Done
Project A         Issue A        Issue B           Issue C
Project B                        Issue D           Issue E
```

Project swimlanes are not Project drop targets. Cards do not repeat Project because lane expresses it. Cross-column drag changes Status only and remains subject to owning-Project capability.

### 11.3 Filter and controls

Current/Historical Cycle Filter registry:

```text
Status
Project
Priority
Milestone
Labels
Due
Estimate
```

Current Cycle exposes Filter + direct List/Board. Historical Cycle is List-only. Neither uses generic Display.

Filtering changes visibility only; it does not change membership, Status projection, Board swimlanes, List ordering, or Issue properties.

### 11.4 Membership actions and Add Issues

Cycle membership is explicit relation mutation, not an Issue property update.

Shared actions:

```text
not in Current Cycle -> Add to current cycle
in Current Cycle     -> Remove from current cycle
```

Current Cycle `Add issues` uses a focused searchable/filterable selector. Its discovery policy may proactively surface open Issues from In Progress Projects and exclude current members; this is entry-point discovery, not Domain membership legality.

A Planned Project may still explicitly add a Backlog Issue from Project Workspace. Membership does not change Project or Issue Status. The Issue appears in Current Cycle List and appears in Board only after ordinary Project capability permits a Board Status.

Later Project/Status changes update current presentation but never implicitly add/remove Cycle membership.

### 11.5 Start Cycle

Start Cycle is explicit and immediate:

```text
startedAt = now
plannedEnd = normal default, user-confirmable/editable
issue selection = optional
```

Starting with no members is valid. No future start date or future Cycle object is created.

### 11.6 Close Cycle and Start next

Close Cycle explicitly records:

```text
endedAt = now
keep final issueIds
change no Issue facts
Current Cycle = none
```

Closing does not automatically start another Cycle.

Confirmation may offer `Close and start next` as convenience composition:

```text
close Current Cycle first
-> open Start-next surface
```

The old Cycle is already Closed before Start-next opens. Canceling Start-next does not roll the close back; it leaves no Current Cycle.

Start next uses the normal Start Cycle flow, with currently open members of the previous Cycle initially selected as convenience candidates. Candidate state is computed from current Issue facts when the flow opens. No close-time unfinished snapshot or automatic rollover is persisted.

### 11.7 Cycle Progress and Effort

Current Cycle Progress:

```text
effective members = current members except Canceled
completed members = effective members in Completed
Progress = completed / effective
```

Empty denominator -> unavailable `—`. Started work receives no partial credit and Estimate does not weight Progress.

Effort is separate:

```text
Effort = sum(configuredWeight(member.estimate)
             for current/final members whose Estimate is present)
```

Default weights are S=1, M=2, L=5, XL=10. Every present Estimate contributes regardless of Status; missing Estimate contributes nothing. Changing Workspace weight mapping changes live aggregation without rewriting Issue Estimate levels.

Historical Effort is likewise live over retained final members and current configured weights/current member Estimate facts. It must not be labeled “Effort at close.”

### 11.8 Cycle Inspector

Current Cycle Inspector:

```text
Cycle
period / time remaining

Progress
Scope
Effort

Info
Started
Ends

Close cycle
```

`startedAt` is actual read-only history. `plannedEnd` may be edited while Open. Progress/Scope/Effort are derived and not persisted back as Cycle facts.

Historical Cycle Inspector is read-oriented and shows Scope, Effort, Started, Planned end, Closed. It does not emphasize Progress because Trail does not retain close-time Issue state.

### 11.9 Historical Cycle

History is passive final-membership history, not a performance dashboard.

Historical Cycle opens a flat List-only Issue collection: no Status sections, Project grouping, Board, swimlanes, or membership editing. Status and Project are row fields; Priority/Milestone/Labels/Due/Estimate follow the fixed row hierarchy.

Membership is the retained final `issueIds`; displayed Issue properties are current live Issue facts. Trail does not claim those fields are values “at close.” Peek/Full Item may remain available for Workflow Issues; Add/Remove membership is unavailable.

## 12. Home

Home is a modular, visual-first global orientation/routing Page, not a generic dashboard builder or reduced execution collection.

Accepted V1 order:

```text
Home
-> This week
-> Lifecycle activity
-> Work trend + Weekly meeting notes
-> Work pulse
```

Wide Main View may place Work Trend and Weekly Meeting Notes side by side. Constrained Main View reflows vertically while preserving semantic order.

Home top-right owns one compact `+` creation menu from Section 6.8. Home has no persistent Inspector.

### 12.1 This week

This week is informational and uses Monday-Sunday current-week orientation in Workspace timezone. It displays two Due source identities only:

```text
Triage Review Due
Workflow Issue Due
```

Today is highlighted. The visual is a compact week grid/strip with sparse dots and count compression at higher density. It does not include Project/Initiative/Milestone Due and does not drill down on click.

### 12.2 Lifecycle Activity

Lifecycle Activity uses GitHub-contribution-calendar-style week-column/day-cell geometry over **rolling three calendar months ending today** in Workspace timezone. This is calendar-month based, not fixed 90 days.

For day D:

```text
activity(D)
= count(Workflow Issue createdAt on D)
+ count(Workflow Issue firstStartedAt on D)
+ count(Workflow Issue terminalAt on D)
```

All three event kinds have equal weight. One hue varies by total daily intensity. Hover/focus may show date and event counts. No click drill-down.

### 12.3 Work Trend

Work Trend uses the same rolling three-calendar-month horizon.

For each day D:

```text
Backlog stock
= Workflow Issues created by D
  whose firstStartedAt has not occurred by D
  and terminalAt has not occurred by D

Active stock
= Workflow Issues whose firstStartedAt has occurred by D
  and terminalAt has not occurred by D

Completed flow
= Workflow Issues whose terminalAt falls on D
  and whose current terminal category is Completed
```

Backlog and Active are stock lines. Completed is day-local flow bars, not a third cumulative-looking line. Trail does not persist daily snapshots solely for this chart; retrospective projection may change if retained lifecycle evidence changes.

No-history state keeps chart frame/legend plus quiet `No workflow history yet`. No global Issue drill-down is invented.

### 12.4 Weekly Meeting Notes

Weekly Meeting Notes remains the existing Trail-managed `Collections/Weekly Update.md` utility with:

```text
Current
Archive / History
```

Normal operations are Open/Read, Edit Current, Archive/Next. Current is the normal editable target; history is read-oriented. Edit is module-local draft state and Archive/Next is hidden while editing. No separate Weekly Note Domain entity is introduced.

### 12.5 Work Pulse

Work Pulse is last and stays lightweight.

**Current Cycle** — period + shared compact Progress. Click routes to Current Cycle. If none exists, `Start cycle` invokes the normal Start Cycle flow.

**Triage** — segmented `[Overdue][Remain]`; click routes to Triage without mutating its Filter. If zero, show `0 active` rather than an empty CTA.

**In Progress Projects** — Started-category Projects only, using shared Project Progress micro-bars. Module title routes to Projects Root. Overflow may use `+N more` over stable ordinary ordering. No hidden Home Health/focus ranking is introduced.

## 13. Responsive Composition

Trail responds to actual **Main View pane capacity**, not display resolution or a separate mobile/desktop product mode.

Shared preservation priority:

```text
current identity
-> necessary context
-> semantic icons
-> high-value actions
-> secondary metadata
```

Low-priority actions/metadata overflow or compress before the whole Page becomes horizontally scrolling.

| Surface | Wide / normal | Constrained |
| --- | --- | --- |
| Home | multiple modules; Work Trend + Weekly Notes may share a row | vertical semantic order; keep three-month history horizon |
| Triage | Queue + Review split | focused Review; preserve Queue/Filter/Order session state |
| Projects / Initiative List | more Project metadata | progressively remove secondary metadata; preserve title + Status longest |
| Project / Cycle List | more Issue metadata | reduce secondary metadata; preserve Title + necessary scope identity |
| Project / Cycle Board | useful-width columns; Cycle has swimlanes | preserve useful card/column width; Board scrolls horizontally |
| Projects Timeline | wide time axis | Timeline owns horizontal navigation/scroll |
| Full Item | comfortable editor measure + host Inspector | editor narrows naturally; Inspector stays host-owned |
| Creation Composer | direct property controls | lower-priority optional properties move into shared More; required structural inputs remain visible |
| Peek | floating right-side Main View preview | near-full-width transient Main View preview |

Exact thresholds derive from real Obsidian pane usability rather than rules such as `screen >= 1920`.

## 14. Runtime, Capability, and Feedback

### 14.1 Capability presentation

UI consumes effective capability/query output rather than rebuilding lifecycle legality inside components:

```text
Domain lifecycle + relationships + context + requested action
-> Query/effective capability
-> visible/enabled UI
```

Application/Domain revalidate every mutation at submit time.

### 14.2 Optimistic fast path

Normal successful local mutations are quiet and optimistic:

```text
user action
-> optimistic UI update
-> local Markdown/plugin-data persistence
-> confirmed state replaces optimism
-> no success toast
```

Pending may exist internally without visible feedback.

If loading/save/refresh lasts long enough to help the user, show a low-attention shell state such as `Loading`, `Saving`, or `Refreshing`; completion simply removes it. Reveal threshold is performance calibration, not Product semantics.

### 14.3 Mutation failure

Failed optimistic mutation:

```text
remove failed optimistic plan
-> return affected UI to reliable committed/LKG state
-> concise transient action-focused error
```

Example: `Couldn't update issue status`.

Do not expose parser/queue/transaction internals in ordinary product copy. Composer failure keeps Composer open and preserves its user draft.

### 14.4 Data Issue / read-only

When a source is invalid but trustworthy last-known-good data exists, keep that content visible with a persistent concise warning such as:

```text
Showing the last valid version
This item can't be edited until its Markdown source is valid again.
Open source
```

Mutation controls are disabled only as broadly as canonical health/ownership rules require. `read-only-error` with LKG remains readable. Full blocking error replaces content only when Trail cannot establish trustworthy readable state.

A quiet workspace-level warning may indicate Data Issues outside the current entity so Home/Sidebar Search/aggregate views do not imply total freshness.

## 15. Default Project Settings

Default Project is a Workspace preference, not a high-frequency Project property.

```text
Trail Settings

Workspace
--------------------------------
Default project
Trail                                      Change
```

`Change` opens the shared searchable Project Picker. There is no `No default project`/Clear option in normal V1 UI.

Changing Default Project changes only `workspaceState.defaultProjectId`. It does not move Issues, change Project lifecycle, change Initiative membership, rename Projects, or recreate Standalone. A downstream workflow may prefill Default only when that Project is legal for that operation.

The current Default Project cannot be deleted. The user first selects another existing Project as Default; after that independent mutation succeeds, the former Default is an ordinary non-Default Project and may use normal Delete Project flow.

Startup recovery of a missing persisted `defaultProjectId` remains Source Sync responsibility and is not a Settings workflow.

## 16. V1 UI Freeze

The V1 UI rebaseline, Page drawing pass, shared-interaction closure, and owner-extraction pass are complete.

`docs/ui.md` is the canonical behavior/presentation authority. `docs/ui-blueprints.md` is the durable composition/ownership blueprint. Current code is expected to contain alignment debt until implementation catches up.

Frozen V1 coverage includes:

- Main View navigation and host history;
- normal Sidebar navigation and Sidebar Search mode;
- Projects Root and Initiative Focus;
- Project Workspace List/Board and Timeline;
- Triage Queue/Review;
- Current/Historical Cycle family;
- Home;
- Issue Full Item and Inspectors;
- standard Creation surfaces and Milestone quick-create;
- shared Filter, Selection/Bulk, Action Registry, Context Menu, contextual Command Menu;
- read-only Workflow Issue Peek;
- transient interaction stack, Picker family, and Confirmation;
- responsive composition;
- optimistic/runtime/Data-Issue feedback;
- Default Project Settings.

Implementation code, tests, Foundation specimens, and historical screenshots do not reopen these decisions merely because they differ. Reopen a frozen behavior only for a genuine contradictory Product/Domain requirement, a materially uncovered scenario with no target answer, or an explicit new Product/UI decision.

Implementation alignment must not silently reintroduce superseded Search Page, mandatory global Location Bar, generic Display shell, hidden Milestone/Label ordering clusters, same-Project Cycle List clustering, Sidebar Capture action, editable Peek, or alternate creation semantics.

### 16.1 Explicitly deferred beyond V1 closure

- Custom Views user-facing creation/editing/navigation;
- Favorites user-facing navigation/management;
- future Workspace Issues collection;
- future Home analytics/personalization/Health ranking beyond frozen modules;
- collaboration-first Teams/Assignees/SLA features;
- recursive Sub-issues;
- Projectless Workflow Issues;
- persisted Creation Drafts/Create-more;
- automatic future Cycle generation/rollover;
- close-time Issue snapshots;
- persisted Health/Attention/focus score.

### 16.2 Remaining calibration

Implementation may still calibrate exact visual tokens, widths, spacing, icons, keyboard bindings, chart geometry, Tooltip delays, Menu/Picker collision, Timeline scale/axis geometry, Label palette, and host-specific focus behavior.

Those choices are acceptable only when they preserve the frozen behavior and `docs/ui-blueprints.md` composition.

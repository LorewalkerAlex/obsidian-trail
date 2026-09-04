# Trail UI Blueprints

> **Status: V1 composition blueprint.** This document is the one-time synthesis of the accepted Trail UI drawing set and shared-interaction closure published through `ef9eb982d0241545dc0d35e73be109ff8f6b9e59`, first published as the final blueprint at `8e14fa87473b09134e455383170cfe571c9aeb97`. It turns those accepted drawings into a durable composition and ownership blueprint. It does not redefine Product, Domain, Data, or Architecture semantics.
>
> `docs/ui.md` remains the canonical UI behavior/presentation authority after synchronization. This blueprint exists to make the final V1 composition, shared-owner boundaries, responsive behavior, and implementation alignment concrete enough to build without reopening design.

## 1. Blueprint contract

### 1.1 Authority order

Use the following order when implementing a visible Trail surface:

```text
Product / Domain / Data / Architecture
-> canonical UI behavior
-> this composition blueprint
-> shared visual / interaction owner
-> Page-local composition
-> real-Obsidian calibration
```

Current implementation is evidence, not design authority. A current component name or prop shape does not override an accepted drawing.

The blueprint does not create new persisted facts for layout, ranking, selection, progress, attention, activity, filtering, or navigation.

### 1.2 Visual reference rule

For a responsibility that Trail already owns:

```text
current Linear equivalent exists
-> reproduce the observable presentation / interaction closely

similar but semantically different
-> adapt the Linear grammar to Trail semantics

no suitable Linear equivalent
-> compose with established Trail / Linear-derived visual language
```

Obsidian remains the first choice for mature host mechanics such as workspace chrome, sidebars, menu mechanics, focus/workspace behavior, and editor conventions.

### 1.3 Calibration boundary

The following are implementation-time calibration, not reasons to reopen the blueprint:

- exact pixels, color values, opacity, spacing, radius, shadow, and animation;
- exact pane-width thresholds and container-query breakpoints;
- exact icon choice where multiple valid Obsidian/Lucide choices exist;
- exact row/card heights and metadata truncation thresholds;
- exact Inspector preferred width and entry-time reveal threshold;
- exact Home track count, module spans, chart dimensions, and heatmap cell sizing;
- exact Peek width and responsive threshold;
- exact picker/menu maximum height and collision offsets;
- exact Bulk bar offsets and number of direct actions before overflow;
- exact shortcut bindings where Obsidian/editor focus conflicts require calibration;
- exact sustained-duration threshold before `Loading`, `Saving`, or `Refreshing` becomes visible.

Those choices must preserve the semantic and composition rules below.

## 2. Host and navigation blueprint

### 2.1 Host ownership

```text
Obsidian window
|- Ribbon
|- Left Sidebar
|  `- Trail Navigation
|     |- normal navigation
|     `- Search mode
|
|- Main leaf
|  |- Obsidian view header
|  |  `- Back / Forward
|  `- Main View
|     `- current Trail Page
|
`- Right Sidebar
   `- Trail Inspector when the current Page has one
```

Obsidian owns:

- window, tabs, splits, sidebars, resize/collapse behavior;
- the main leaf and native view header;
- Back / Forward history controls;
- ordinary host workspace/focus mechanics.

Trail owns:

- Trail Navigation content;
- the current Page inside Main View;
- Trail Inspector content when the current Page has a stable Inspector target;
- Page-local transient surfaces such as Peek, Review, Composer, Picker, and Confirmation.

Trail does **not** draw a duplicate sidebar, tab strip, Back / Forward control, or fake Right Sidebar column inside Main View.

### 2.2 Normal Trail Navigation

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
- `Projects` is a fixed destination, not an expandable Project tree.
- the current Default Project is one fixed shortcut row after `Projects` and before `Cycles`;
- the Default Project is an ordinary Project; its visible title follows the stable referenced Project;
- `Triage` may show a quiet Review Set count;
- Capture, Settings, Foundation Lab, Initiatives, Favorites, and dynamic Project children are not normal navigation rows;
- Quick Capture is reached through the Obsidian command/global-shortcut entry, not by adding a normal Sidebar row.

### 2.3 Sidebar Search mode

Activating `Search` temporarily replaces the normal Trail Navigation content:

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

Search is **not** a Trail Page/location.

Rules:

- opening Search does not change Main View, host history, or Right Sidebar;
- input receives focus immediately;
- result kinds are Initiative, Project, and Workflow Issue;
- Triage entries, Cycles, and ordinary Obsidian notes are not Sidebar Search result kinds;
- `Esc` or the Search back control restores normal Sidebar content without changing Page;
- activating a result calls normal `navigate(result.location)`, closes Search, and restores normal Sidebar content;
- Sidebar Search results do not open Peek over the unrelated current Main View.

### 2.4 Page navigation and host history

Conceptually:

```text
Sidebar destination ---------\
Sidebar Search result --------+-> navigate(location) -> current Page changes
Page breadcrumb ancestor ----/

Obsidian Back / Forward ----------> host Page-history traversal
```

Representative Page locations:

```text
Home
Triage
Projects
Initiative(initiativeId)
Project(projectId)
Issue(issueId)
Cycles / cycle-related locations
```

Search is absent because it is Sidebar mode.

Transient Page interactions do not create history entries:

- Filter / Order / layout state;
- selection;
- expanded/collapsed sections;
- Peek;
- Triage Review identity and Previous/Next;
- property pickers and menus;
- Composer and Confirmation state;
- inline edit drafts;
- hover/focus/scroll/responsive geometry.

### 2.5 Page-owned header and breadcrumb

Breadcrumb is Page content, not a mandatory shell `LocationBar`.

A Page owns:

```text
optional breadcrumb / ancestry
+ current identity / title
+ narrative context when useful
+ Page actions / overflow
+ collection controls
+ main content composition
+ Inspector relationship
+ responsive behavior
```

The shell supplies the Main View frame and host integration only.

### 2.6 Inspector placement

The persistent Trail Inspector is an **Obsidian Right Sidebar view**.

No stable primary entity -> no Trail Inspector:

```text
Home
Triage
Projects Root
Sidebar Search mode
```

Stable primary entity -> matching Inspector may be shown:

```text
Initiative Focus    -> Initiative Inspector
Project Workspace  -> Project Inspector
Current Cycle      -> Current Cycle Inspector
Historical Cycle   -> Historical Cycle Inspector
Issue Full Item    -> Issue Inspector
```

Inspector initial visibility is decided once on location entry from the actual Obsidian workspace capacity. While the location remains active, the user's host actions own whether the Inspector is open. Trail does not repeatedly open/close it in response to window resize, List/Board switching, Peek, or other presentation changes.

Unrelated Right Sidebar views must not be destructively closed or replaced.

## 3. Shared UI ownership model

### 3.1 Dependency layers

The durable dependency direction is:

```text
visual tokens / foundation authority
        |
        v
primitives
        |
        v
patterns
        |
        v
semantic / entity UI
        |
        v
shared interactions
        |
        v
shell + Page composition
```

Foundation Lab is a verification consumer of production owners:

```text
accepted UI contract
-> reusable production owner
   |- Foundation Lab scenarios
   `- real product consumers
```

Production UI must never depend on Foundation-only implementations or fixtures.

### 3.2 Owner -> consumer extraction matrix

| Responsibility | Final owner layer | Main consumers | Shared contract | Explicit non-responsibility |
| --- | --- | --- | --- | --- |
| Workspace Frame | `ui/shell` | every Trail Page | Main View frame, pane-capacity input, host integration | no mandatory Location Bar; no breadcrumb/title semantics |
| Page Header geometry | `ui/patterns` | Projects, Initiative, Project, Cycle, Triage, Home, Full Item | identity/actions layout and constrained priority | Page supplies breadcrumb, identity, actions |
| Collection Controls | `ui/patterns` | Projects, Initiative, Project, Cycle, Triage | leading/trailing control geometry and responsive overflow | no required `Display`; Page supplies Filter/Order/Layout/Timeline tools |
| Collection Row shell | `ui/patterns` | Project rows, Issue rows, Triage rows, selectors | selection gutter, leading/content regions, highlight/activation boundary | no Project/Status/Cycle field knowledge |
| Group Header | `ui/patterns` | Projects Initiative groups, Cycle Project swimlanes | disclosure + identity + quiet count | does not choose grouping/query |
| Status Section | `ui/patterns` + semantic Status UI | Project List, Current Cycle List | Status identity, count, disclosure, zero-count skeleton | does not own Status legality/order definitions |
| Empty State | `ui/patterns` | supported collections | true-empty / filtered-empty presentation slots | Page supplies exact copy/CTA intent |
| Progress | `ui/primitives` or small pattern over primitive | Project, Milestone, Cycle, Home | one simple progress visual with normal/compact/micro/unavailable density | Query computes values; not Attention/segmented summary |
| Segmented Summary | `ui/patterns` | Project Temporal Attention, Home Triage pulse | mutually-exclusive segment geometry + tooltip/focus detail | not Progress; does not compute buckets |
| Property Control | `ui/patterns` | Row/Card, Inspector, Composer | compact property trigger grammar | semantic property identity/legality stays elsewhere |
| Status / Priority / Due / Label / Estimate / Cycle marker | `ui/entities` | Row/Card, Inspector, Picker, Filter, Composer | stable semantic visual identity | no Page-local workflow composition |
| Issue Row | `ui/entities` | Project List, Current Cycle List, Historical Cycle | Issue scanning hierarchy and metadata composition variants | collection scope/group/filter/order stay Page/query owned |
| Issue Card | `ui/entities` | Project Board, Current Cycle Board | Issue card hierarchy and metadata composition variants | Board workflow and lane structure stay Page/pattern owned |
| Project Summary Row | `ui/entities` | Projects Root, Initiative Focus | Project identity, Status, Priority, compact Progress/Due/Attention | group and navigation scope stay Page owned |
| Picker family mechanics | `ui/interactions` + `ui/patterns` | properties, Filter, Composer, Action targets | select/search/multi/date mechanics, focus, Esc, collision | no `UniversalPicker`; each semantic control owns values/legality |
| Filter interaction | `ui/interactions` | Projects, Project, Cycle, Triage | one property/value grammar and location-scoped session state | Pages provide only registry/scope; no page-local filter engines |
| Selection interaction | `ui/interactions` | selectable List/Board/Triage | visible actionable identities, highlight/selection separation, clear rules | no persisted Selection entity |
| Action Registry | `ui/interactions` | Context Menu, overflow, Bulk, Command Menu, shortcuts | Action ID, scope, capability, target resolution, Application intent | presentations may show different subsets |
| Bulk Bar | `ui/patterns` + Selection/Action interactions | selectable collections | count + useful common actions + overflow + clear | no new Bulk legality model |
| Context Menu presentation | Obsidian Menu mechanic + Trail contract | Row/Card/Peek/Page overflow | action grouping, scope presentation, target handoff | no private action semantics/menu engine |
| Peek | `ui/interactions` + surface pattern | Workflow Issue collections | read-only preview, retarget, wide/constrained geometry, open Full Item | not editor, Inspector, Triage Review, Search preview, or Project preview |
| Transient Interaction Stack | `ui/interactions` | Menu, Picker, Peek, Composer, Confirmation | topmost Esc/focus/outside-click ownership | no business workflow semantics |
| Confirmation foundation | `ui/interactions` + pattern | Delete, Discard, Cycle lifecycle, guarded flows | safe focus, cancel semantics, explicit confirm | does not reduce complex business consequences to generic copy |
| Creation Composer | `ui/interactions` + `ui/patterns` | Triage, Issue, Project, Initiative | overlay, title/body, compact properties, footer, dirty/focus/validation | entity field registry/defaults/legal context supplied by consumer |
| Overlay foundation | mature headless/host mechanics + Trail pattern | Composer, Add Issues, Cycle surfaces, Confirm | focus trap, surface/elevation, layering/dismiss mechanics | workflows remain separate compositions |
| Tooltip / focus-detail | shared pattern | Label, Progress, Attention, charts, Due markers | low-noise exact detail and accessibility text | not a hidden action system |
| Runtime feedback | shared patterns/shell | all mutations and source-health consumers | quiet pending, transient failure, persistent Data Issue/read-only warning | Runtime/Query own health and mutation state |

### 3.3 Responsibilities that must stay Page-local

Do **not** extract universal components for:

- Triage Review progression;
- Home module composition;
- Lifecycle Activity heatmap;
- Work Trend chart;
- Weekly Meeting Notes workflow;
- Project Workspace as a whole;
- Current Cycle Project-swimlane composition;
- Timeline;
- Start/Close/Start-next Cycle workflows;
- Add Issues workflow;
- Project Delete replacement-Project business flow;
- Issue Full Item editor;
- Page breadcrumb/title/action sets.

The following abstractions are specifically rejected as design targets:

```text
UniversalPage
UniversalCollection
UniversalDetails
UniversalChart
UniversalPicker
UniversalWorkflowModal
DashboardCard
```

Shared lower-level mechanics are preferable to large boolean-configured universal components.

## 4. Shared collection blueprint

### 4.1 Collection controls

The generic mechanical row is:

```text
[leading controls]                              [trailing controls]
```

Examples:

```text
Projects Root
Filter                                      [ List | Timeline ]

Initiative Focus
Filter

Project Workspace, Started
Filter                                      [ List | Board ]

Current Cycle
Filter                                      [ List | Board ]

Triage
Filter                                Order: Review due v
```

There is no globally required `Display` control.

### 4.2 Shared Filter grammar

```text
Filter
-> choose Property
-> choose Value(s)
-> visibility updates immediately
```

Discrete values:

```text
0 selected values      -> no clause / All
1..N selected values   -> OR inside the property
different properties   -> AND between clauses
```

No V1 exclude/is-not/includes-all/nested-boolean builder.

Applied clauses remain visible near Filter and may be reopened directly. `Clear filters` appears when active clauses exist.

Filter state is location-scoped, session-only UI state. It may survive List/Board switching and navigation away/back during the current session. It is not Domain Data, Workspace State, Markdown, Plugin Data, or a persisted Custom View.

Page registries:

```text
Projects Root       Status, Initiative, Priority, Labels, Due
Initiative Focus    Status, Priority, Labels, Due
Project Workspace  Status, Priority, Milestone, Labels, Due, Estimate
Current Cycle       Status, Project, Priority, Milestone, Labels, Due, Estimate
Historical Cycle   Status, Project, Priority, Milestone, Labels, Due, Estimate
Triage              Due, Priority, Labels
```

Page scope must not be redundantly reintroduced as a Filter dimension when it adds no useful choice.

### 4.3 Row intent separation

One row/card can expose several distinct intents without conflating them:

```text
ordinary activation
-> Page-specific navigation or Workflow Issue Peek

selection control
-> selection only

inline property control
-> property interaction / Picker only

explicit ... / context action
-> Action Registry
```

An inline property control must stop ordinary row activation. Selection must not masquerade as completion Status or replace semantic leading properties.

### 4.4 Group Header

Mechanical form:

```text
v  Group identity                                      count
```

The disclosure toggles the group without navigating. The identity may navigate when it represents a real entity. Quiet count describes the current visible group scope.

`No Initiative` is a grouping label, not an entity.

Cycle Project swimlane headers use the same group-header mechanic, but the lane remains Page-specific Cycle composition and is not a Project mutation target.

### 4.5 Status Section

Project Workspace and Current Cycle List use a persistent complete Status skeleton.

Default semantic order:

```text
Started / In Progress
Unstarted / Todo
Backlog
Completed / Done
Canceled
```

Concrete StatusDefinitions use configured names/order inside their category.

Zero-count sections remain as headers:

```text
> In Progress                                           0
> Todo                                                  0
> Backlog                                               0
> Done                                                  0
> Canceled                                              0
```

The count means current filter-visible rows. A zero-count section does not grow a body but keeps workflow structure legible.

### 4.6 Workflow Issue Row

Project Workspace:

```text
[Selection] [Priority] Title   Milestone   Labels   Current Cycle   Estimate   Due
```

Current Cycle List:

```text
[Selection] [Priority] Title   Project   Milestone   Labels   Estimate   Due
```

Historical Cycle:

```text
[Selection] [Priority] Title   Project   Status   Milestone   Labels   Estimate   Due
```

Rules:

- Title is strongest and flexible.
- Status is omitted when the enclosing Status section already expresses it.
- Project is omitted when Page/lane scope already expresses it.
- Current Cycle marker is omitted when Cycle Page scope already expresses membership.
- Description/body stays out of Row.
- Priority uses one stable semantic glyph.
- Milestone keeps its meaningful name.
- Labels use compact stable-identity color dots; full names belong in detail/picker/tooltip contexts.
- Estimate uses S / M / L / XL.
- ordinary future Due is quiet; Today/Overdue may gain emphasis.
- absent optional values normally disappear rather than filling the row with placeholder dashes.

### 4.7 Workflow Issue Card

Project Board Card:

```text
+------------------------------+
| Priority  Issue title        |
| optional second title line   |
|                              |
| Milestone  Labels Cycle M Due|
+------------------------------+
```

Current Cycle Board Card removes Page/lane context already expressed:

```text
+------------------------------+
| Priority  Issue title        |
|                              |
| Milestone  Labels  M  Due    |
+------------------------------+
```

Cards do not become mini Full Item views. Description and rarely scanned fields stay out.

### 4.8 Project Summary Row

Projects Root / Initiative Focus:

```text
[Status] Project title      Status      Priority      Progress      Due
```

Priority order for constrained width:

```text
Project identity
-> Status identity
-> meaningful Attention / Priority
-> Progress / Due / other secondary metadata
```

Progress remains compact; Projects Root does not turn every row into a large progress card.

### 4.9 Progress and segmented summary

Progress answers completion only:

```text
Completed
──────────────
current effective non-Canceled scope
```

If the denominator is empty, show unavailable `—`, not fabricated 0% or 100%.

The same visual owner may render:

```text
normal   -> Inspector
compact  -> Home Current Cycle
micro    -> Projects Root / Home In Progress Projects
```

A segmented summary answers distribution, not completion. Example Project Temporal Attention:

```text
[ Overdue ][ Due This Week ][ Later Due ]
```

Home Triage uses the same mechanical family for:

```text
[ Overdue ][ Remain ]
```

Different semantics may share the segmented mechanic without becoming the same query.

### 4.10 Empty-state grammar

Three states remain distinct:

```text
true empty
-> collection truly contains nothing
-> optional creation/membership guidance when capability allows

filtered empty
-> underlying collection has data
-> show no-match copy + Clear filters
-> no duplicate creation CTA

projection empty
-> Page scope has members but current presentation excludes them
-> retain structural lanes/sections and use presentation-specific recovery only when useful
```

Examples:

- empty Project List -> full zero-count Status skeleton + `New issue` only when Project can create;
- filtered Project List -> full zero-count skeleton + `Clear filters`;
- Board with only Backlog/Canceled Issues -> keep Todo/In Progress/Done lanes without claiming the Project/Cycle is empty;
- empty Current Cycle -> membership guidance `Add issues`, not entity creation guidance;
- Historical Cycle true empty -> no CTA;
- filtered Triage -> no `Add to Triage` CTA.

### 4.11 Board mechanics

Board is a component-owned horizontal overflow exception.

```text
minimum useful column/card width reached
-> stop compressing
-> Board canvas scrolls horizontally
```

Do not:

- stack columns vertically;
- auto-switch Board to List because width narrows;
- give each column its own independent vertical scrollbar;
- persist same-column drag rank.

Project Board:

```text
Todo -> In Progress -> Done
```

Cross-column drag changes Status only. Backlog/Canceled remain valid statuses but are outside normal Board projection.

Current Cycle Board adds Project swimlanes vertically while retaining Status columns horizontally. Project lanes are not Project drop targets.

## 5. Shared interaction blueprint

### 5.1 Transient interaction stack

Transient surfaces form a stack:

```text
Page
`- top-level transient surface
   `- child Menu / Picker / Popover / Confirmation
```

`Esc` always affects the topmost active layer only.

Example:

```text
Composer + Labels Picker
Esc #1 -> close Picker, restore focus to Labels control
Esc #2 -> attempt Composer dismiss
```

```text
Peek + Context Menu
Esc #1 -> close Menu
Esc #2 -> close Peek
```

When no higher layer is open, `Esc` may clear collection selection.

Outside-click semantics belong to the owning surface:

- Menu/Picker/Popover -> close child only;
- Composer backdrop -> Composer dismiss intent;
- Confirmation backdrop -> Cancel;
- Peek -> no modal backdrop; unrelated Page interaction closes it;
- Tooltip -> not a stack layer.

Back/Forward never acts as a transient-surface close stack.

### 5.2 Action Registry

```text
current entity / selection / location
-> Action Registry
   |- Context Menu
   |- ... overflow
   |- Bulk Bar
   |- contextual Command Menu
   `- keyboard shortcut
```

An Action ID owns stable capability/target/Application semantics regardless of presentation.

Context Menu order when groups exist:

```text
navigation / inspect
--------------------
frequent property / ordinary mutations
--------------------
relationship / lifecycle actions
--------------------
other low-frequency actions
--------------------
destructive actions
```

Empty groups disappear. Destructive actions stay last and separated.

Availability:

```text
irrelevant action
-> absent

temporarily unavailable + explanation/recovery useful
-> visible disabled/unavailable + concise reason
```

Small fixed target sets may remain direct menu/submenu choices. Large/searchable relation target sets hand off to the shared searchable Picker family.

### 5.3 Context scope

```text
right-click selected item
-> current relevant selection is action scope

right-click unselected item
-> explicitly invoked item is action scope
-> unrelated retained selection is not action scope
```

Right-clicking an unselected item does not silently clear retained selection merely to execute that menu.

An explicit entity-local action affordance such as Peek `...` scopes to that explicit entity, not to unrelated background selection.

### 5.4 Selection and Bulk

Selection is collection-local transient UI state.

```text
selection
= selected identities
  intersect
  current visible actionable projection
```

Consequences:

- filtering out an item removes it from active selection;
- collapsing a group so an item is no longer visible removes it from active selection;
- List -> Board retains only items still visible/actionable in Board;
- sorting does not clear identities that remain visible;
- Page navigation clears collection selection.

One collection-level Bulk Bar appears while selection exists:

```text
       +----------------------------------------------+
       | 3 selected   [common actions]      ...   x  |
       +----------------------------------------------+
```

Board does not create one Bulk Bar per column/lane.

Bulk legality:

```text
same action
+ same target
+ every selected item can legally accept it
```

Target-bearing Bulk actions use the intersection of ordinary legal targets.

### 5.5 Peek

Peek is a Workflow Issue inspection surface.

```text
Row / Card
-> scan

Peek
-> inspect hidden detail without navigation

Full Item
-> deep editing
```

Opening:

- ordinary activation of eligible Workflow Issue Row/Card -> Peek;
- selection control -> selection only;
- inline property control -> property interaction only;
- keyboard preview may use a Linear-like `Space` binding where host/editor focus allows.

Wide Main View:

```text
+--------------------------------------+----------------------+
| collection                           | Issue Peek           |
|                                      |                      |
| > current Issue                      | Title                |
|   next Issue                         | Description...       |
|                                      |                      |
|                                      | Status / Priority    |
|                                      | Project / Milestone  |
|                                      | Labels / Due         |
|                                      | Estimate / Cycle     |
|                                      |                      |
|                                      | ...   Open full item |
+--------------------------------------+----------------------+

Right Sidebar -> current Page Inspector remains unchanged
```

Constrained Main View uses a near-full-width floating Main View surface. It does not become a bottom sheet, Page, permanent split, or Right Sidebar view.

V1 Peek is read-oriented:

- title/body read-only;
- properties read-only;
- property/lifecycle/delete actions use explicit `...` -> Action Registry;
- `Open full item` enters Issue Full Item.

Retargeting:

```text
Peek = Issue A
activate Issue B
-> same Peek surface retargets to B
-> no host-history entry
```

Adjacent keyboard browsing uses the current visible + ordered collection. If the current target disappears from the projection, close Peek rather than infer a successor. Triage Review progression is not reused here.

Peek is not used for Project rows, Triage Review, or Sidebar Search results.

### 5.6 Picker family

Use families, not one universal component:

```text
small fixed single-select
-> Status / Priority / Estimate

large relation single-select
-> Project / Initiative / Milestone

searchable multi-select
-> Labels

temporal
-> Due date/calendar
```

Shared mechanics:

- anchored surface/elevation;
- keyboard traversal;
- selected/check presentation;
- search field where useful;
- empty search result state;
- legal/unavailable target presentation;
- viewport collision behavior;
- top-layer `Esc` and outside-click;
- focus restoration.

Single-select generally applies and closes. Multi-select applies each toggle to the owning state and remains open until dismissed; no extra Save/Done step is required.

### 5.7 Confirmation

Shared mechanics:

```text
open confirmation
-> safe action / Cancel receives default focus

Esc / backdrop
-> Cancel

explicit confirm
-> guarded action
```

A held/repeated `Enter` must not immediately confirm a destructive action as the surface opens.

Variants preserve semantics:

- Delete -> danger treatment;
- Discard changes -> destructive to transient draft, not Domain Delete;
- Close Cycle -> lifecycle confirmation, not necessarily danger-red.

Copy describes concrete consequences. Undo/recovery language appears only when Trail actually provides that capability.

Complex workflows such as Project Delete may compose confirmation + searchable Project Picker + consequence counts rather than being reduced to `Are you sure?`.

### 5.8 Contextual Command Menu

```text
Obsidian Command Palette / registered plugin commands
-> host/global intents
-> open Trail, Quick Capture, global navigation/utility

Trail contextual Command Menu
-> current Trail entity / selection / location actions
-> Action Registry
```

The contextual Command Menu is searchable action presentation, not Search navigation and not another action authority. Exact shortcut binding remains host calibration.

### 5.9 Tooltip and focus detail

Compact semantic marks must expose exact meaning on pointer hover **and** keyboard focus where practical.

Examples:

- Label dot -> Label name;
- Progress -> exact completed/denominator counts;
- Attention segment -> segment name/count;
- Home heatmap cell -> date + lifecycle counts;
- Work Trend point/bar -> date + values;
- This Week marker -> date + source count.

Tooltip/focus detail does not become a hidden action surface unless the owning blueprint explicitly assigns an action.

## 6. Creation blueprint

### 6.1 Standard Composer shell

Triage, Workflow Issue, Project, and Initiative share one transient Composer infrastructure:

```text
current context remains behind overlay

+--------------------------------------------------+
| light creation context                        x  |
|--------------------------------------------------|
|                                                  |
| Title                                            |
|                                                  |
| Description / body                               |
|                                                  |
| compact semantic properties                      |
|                                                  |
|--------------------------------------------------|
|                         Ctrl/Cmd+Enter   Create   |
+--------------------------------------------------+
```

Creation does not navigate, change Inspector target, or create host-history entries. Normal success closes and returns to the invoking context. Triage Accept remains the workflow-specific destination-first exception.

There are no persisted Drafts or Create-more mode in V1.

### 6.2 Dirty / dismiss contract

`x`, `Esc`, and backdrop are three presentations of one Composer dismiss intent.

```text
attempt dismiss
|- draft equals invocation baseline
|  `- close immediately
|
`- meaningful user-authored difference remains
   `- Discard changes?
      |- Cancel -> return to Composer with draft intact
      `- Discard -> close, create nothing
```

System/context prefill is not dirty. User changes to title/body/relations/properties are dirty. Returning values exactly to the invocation baseline clears dirty state.

Quick Capture user-authored title remains dirty after expansion into full Triage Composer.

### 6.3 Focus and validation

Initial focus:

```text
required structural input unresolved?
|- yes -> focus required structural input
`- no  -> focus Title
```

Standard Composer submit is `Ctrl/Cmd+Enter`. Ordinary `Enter` does not globally submit the full Composer.

Validation is low-noise:

- missing required value -> Create unavailable or local rejection;
- explicit submit attempt -> focus/mark the concrete missing control;
- do not paint every empty field as an error on initial open;
- mutation failure -> keep Composer open and preserve draft with concise retry/error feedback.

### 6.4 Entity Composer registries

**Triage**

```text
Title                 required
Description/body      optional
Priority              optional
Labels                optional
Due                    required Review Due
```

No Status, Project, Milestone, Estimate, or Cycle.

**Workflow Issue**

```text
header: Project       required, visible, editable
Title                 required
Description/body      optional
Priority              optional
Labels                optional
Milestone             optional, scoped to selected Project
Estimate              optional
Due                    optional
```

No Status: new Workflow Issue always starts in configured Backlog. No Cycle: Current Cycle remains a relationship action.

Changing Project clears an incompatible Milestone.

**Project**

```text
Title                 required
Description/body      optional
Initiative            optional
Priority              optional
Labels                optional
Due                    optional
```

No editable creation Status; create uses configured Unstarted default.

**Initiative**

```text
Title                 required
Description/body      optional
Priority              optional
Labels                optional
Due                    optional
```

No Status and no required Project relationship.

### 6.5 Quick Capture

Quick Capture is an Obsidian command/global-hotkey title-first entry into Triage creation:

```text
+------------------------------------------+
| Capture to Triage                        |
| [ Something to review...               ] |
| Esc                                Enter |
+------------------------------------------+
```

```text
type Title
-> Enter
-> expand to standard Triage Composer
   |- preserve Title
   |- normal Due default already present
   `- standard Composer interaction
```

The first `Enter` does not create. After expansion there is no Quick-Capture-specific submit mode.

### 6.6 Milestone quick-create

Project Inspector Milestones `+` may open a smaller anchored composition:

```text
New milestone

Name           required
Due            optional
Description    optional

Cancel   Create
```

Owning Project is implicit/fixed. There is no Project picker and no Status/Priority/Labels/Estimate/Cycle field. The surface reuses shared input/body/Due/Button/focus/validation/dismiss mechanics without becoming a second creation framework.

### 6.7 Invocation matrix

| Invocation | Surface | Initial context | Success |
| --- | --- | --- | --- |
| Obsidian Quick Capture command/hotkey | title-first Quick Capture -> Triage Composer | typed Title + normal Triage Due | close to invoker |
| Triage header `+` / true-empty CTA | Triage Composer | normal Triage Due | return to Triage |
| Home `+ -> Triage` | Triage Composer | normal Triage Due | return to Home |
| Home `+ -> Issue` | Issue Composer | legal Default Project when available | return to Home |
| Home `+ -> Project` | Project Composer | none | return to Home |
| Home `+ -> Initiative` | Initiative Composer | none | return to Home |
| Project Workspace `+` | Issue Composer | current legal Project | return to Project Workspace |
| Projects Root `+` | Project Composer | none | return to Projects Root |
| Initiative Focus `+` | Project Composer | current Initiative | return to Initiative Focus |
| Triage Accept -> Issue | Issue Composer | source Title/body + legal Default Project when available | create target, remove source, advance Review |
| Triage Accept -> Project | Project Composer | source Title/body | create target, remove source, advance Review |
| Project Inspector Milestones `+` | Milestone quick-create | owning Project implicit | close quick-create |

## 7. Page blueprints

### 7.1 Projects Root

Purpose: all-Project scanning and temporal overview, Project-first rather than dashboard-first.

Header and controls:

```text
Projects                                               +

Filter                              [ List | Timeline ]
```

No breadcrumb. No Trail Inspector. No generic `Display` or Sort builder.

Default Filter hides Completed/Canceled Projects; the user may include them explicitly.

List groups by Initiative:

```text
v  Initiative Alpha                                      2

   [Status] Project A      In Progress   [Priority] 65%   Sep 08
   [Status] Project B      Planned                  20%   Sep 20

v  Initiative Beta                                       1

   [Status] Project C      In Progress              40%

v  No Initiative                                         1

   [Status] Standalone     Planned
```

- Initiative identity navigates to Initiative Focus;
- disclosure does not navigate;
- `No Initiative` remains last and is not an entity;
- group order is stable and does not jump with child urgency;
- within groups use Default Work Order:

```text
actionable before terminal
-> Due urgency
-> lifecycle / Status order
-> Priority
-> Created At when canonical
-> stable fallback
```

Timeline uses the same filtered Project collection:

```text
Filter              [ List | Timeline ]      Month v      Today
```

Timeline uses real lifecycle/Issue evidence and Due markers. It does not invent Project start/end facts, dependencies, duration resizing, drag reschedule, resource planning, or manual rank.

Constrained List removes secondary metadata progressively. Timeline owns its own horizontal navigation/scroll; the whole Page should not become horizontally scrolling.

### 7.2 Initiative Focus

```text
Main View                                                   Right Sidebar

Projects / Initiative Alpha                          +     Initiative Inspector
--------------------------------------------------------
<optional lightweight description>
--------------------------------------------------------
Filter
--------------------------------------------------------

[Status] Project A      In Progress   [Priority] 65%   Sep 08
[Status] Project B      Planned                  20%   Sep 20
[Status] Project C      In Progress              40%
[Status] Project D      Completed                100%
[Status] Project E      Canceled
```

Rules:

- `Projects` breadcrumb ancestor -> Projects Root;
- current Initiative identity is terminal/current title;
- `+` -> standard Project Composer with Initiative prefilled/editable;
- description is omitted when absent, shown fully when short, bounded-expandable when long;
- a wikilink follows the link rather than toggling description expansion;
- collection is flat List only;
- all lifecycle states visible by default;
- Filter registry: Status, Priority, Labels, Due;
- no Initiative Filter because Page scope fixes it;
- no Board/Timeline/Display/Sort.

True empty may show `New project` guidance. Filtered empty shows only `Clear filters` recovery.

### 7.3 Project Workspace

Stable Page skeleton across lifecycle states:

```text
Main View                                                     Right Sidebar

Projects / [Initiative /] Project Trail                 +     Project Inspector
-----------------------------------------------------------
<optional Project description>
-----------------------------------------------------------
Filter                                      [ List | Board ]
-----------------------------------------------------------
<Status-first Issue collection>
```

Lifecycle capability:

| Project lifecycle | Header `+` | List | Board | Execution |
| --- | --- | --- | --- | --- |
| Planned / Unstarted | enabled | yes | no | planning-only |
| In Progress / Started | enabled | yes | yes | normal execution |
| Completed | disabled | yes | no | settled review/correction |
| Canceled | disabled | yes | no | cleanup/move/cancel unresolved work |

Disabled header `+` remains in the stable slot and may explain that reopening is required. It never silently changes lifecycle.

List uses the persistent full Status skeleton and within-Status order:

```text
Due urgency
-> Priority
-> Created At
-> stable fallback
```

Milestone/Label clustering is not hidden default ordering.

Board:

```text
Todo -> In Progress -> Done
```

- available only while Project is Started;
- no per-column `+`;
- new Issue still creates in Backlog;
- cross-column drag -> Status only;
- same-column drag -> no persisted rank;
- empty lanes remain full lanes;
- Filter affects cards, not fixed workflow columns;
- Board keeps useful card width and scrolls horizontally when required.

Milestone remains Project-local context:

- no Milestone Page;
- Inspector owns compact Milestone management/progress;
- clicking an Inspector Milestone writes the normal Project Workspace Milestone Filter;
- compact Row/Card Milestone text itself is display-only by default.

Canceled Project unresolved work remains visible; a compact Inspector Attention signal may focus the normal Filter when exactly expressible.

### 7.4 Current Cycle

Current Cycle is:

```text
Project Workspace Issue collection
+ Cycle scope/context
+ Project dimension
+ Cycle lifecycle
```

Representative Board:

```text
Main View                                                   Right Sidebar

Cycles / Aug 25 - Sep 7                     History   Add issues   Cycle Inspector
----------------------------------------------------------------  ----------------
10 days left   |   12 issues   |   67%
Filter                                      [ List | Board ]
----------------------------------------------------------------
                 Todo       In Progress       Done

v Project Trail                                         5
----------------------------------------------------------------
                 Issue A     Issue B           Issue C
                 Issue D                       Issue E

v Project Notes                                         4
----------------------------------------------------------------
                 Issue F     Issue G           Issue H
```

Rules:

- Cycle identity is date range, no persisted title;
- `Cycles` breadcrumb ancestor;
- `History` secondary navigation;
- `Add issues` is a membership action, not creation;
- Main View summary stays lightweight: time relation + member count + Progress;
- Effort remains Inspector detail;
- default presentation Board; List always available;
- no generic `Display`/Sort.

Current Cycle List:

```text
[Selection] [Priority] Title   Project   Milestone   Labels   Estimate   Due
```

Status-first; Project is row metadata, not hidden same-Project clustering.

Current Cycle Board:

```text
horizontal = Status
vertical   = Project swimlane
cell       = Issues
```

Project lane identity may navigate, but lanes are not Project drop targets. Horizontal drag changes Status inside the same Project lane only.

### 7.5 Add Issues

`Add issues` is an existing-entity selector, not Creation Composer:

```text
+--------------------------------------------------------------+
| Add issues                                                   |
| [ Search issues...                                      ]    |
| Filter                                                       |
|--------------------------------------------------------------|
| [ ] [Priority] Issue title                                   |
|                  Project Trail        In Progress     Sep 08 |
| ...                                                          |
|--------------------------------------------------------------|
| 3 selected                              Cancel   Add 3 issues |
+--------------------------------------------------------------+
```

Candidate row priorities:

```text
Selection
Priority
Title
Project
Status
Due
```

Default discovery surfaces open Workflow Issues from Started Projects and excludes current members, but discovery policy is not Domain legality. Any legal Workflow Issue may still be added from explicit context elsewhere.

Candidate row activation toggles selection because selection is the purpose of this surface.

Success changes Cycle membership only and closes the selector.

### 7.6 No-current / Start / Close / History Cycle states

No current Cycle with history:

```text
Cycles                                              Start cycle
----------------------------------------------------------------

                         No current cycle

Previous                                             History

Aug 25 - Sep 7                                      12 issues
Aug 11 - Aug 24                                     10 issues
Jul 28 - Aug 10                                     16 issues
```

Never-had-a-Cycle first use may show restrained `Start cycle` guidance.

Start Cycle:

```text
+------------------------------------------------------+
| Start cycle                                          |
| Starts                                               |
| Today - Sep 3                                        |
| Planned end                                          |
| Sep 16                                               |
|                                                      |
| You can start empty and add issues later.            |
|                              Cancel     Start cycle   |
+------------------------------------------------------+
```

`startedAt = now` on commit; planned end is explicit/editable; empty Cycle is legal.

Close confirmation:

```text
+------------------------------------------------------+
| Close cycle?                                         |
| Aug 25 - Sep 7                                       |
| 12 issues will remain associated with this cycle.    |
| 5 issues are still open.                             |
| Closing does not change any Issue properties.        |
|             Cancel   Close   Close and start next    |
+------------------------------------------------------+
```

`Close and start next` is a UI convenience over close-first semantics. If Start-next is canceled afterward, the old Cycle remains Closed and no new Cycle exists.

History is a chronological compact browser; Historical Cycle is flat List-only, immutable membership, live current Issue fields, no historical Progress claim.

Historical Row:

```text
[Selection] [Priority] Title   Project   Status   Milestone   Labels   Estimate   Due
```

### 7.7 Triage

Default Queue:

```text
Triage                                                   +

10 to review

Filter                                Order: Review due v
----------------------------------------------------------------
[ ] [P1] Revisit export shape              ..             Today
[ ] [P2] Capture recruiting follow-up      .          Tomorrow
[ ] [--] Compare parser alternatives                    Sep 06
                  - review target ends -
[ ] [--] Consider archive behavior                      Sep 18
```

Triage Row:

```text
[Selection] [Priority] Title   Labels   Review Due
```

No Workflow Status, Project, Milestone, Estimate, or Cycle.

Review Set boundary appears only when the Queue is unfiltered and ordered by Review Due. With Filter or Priority ordering, keep any count clearly global (`10 to review overall`) and remove the misleading boundary.

Wide Review is Page-local Queue + Review composition:

```text
+----------------------------------+------------------------------------------+
| Filter       Order: Review due v | <-   ^   v                   3 / 14      |
|----------------------------------|------------------------------------------|
| [ ] Queue rows...                | Current Triage title                     |
| > current                        | [Priority] [Labels] [Due]                |
|                                  |                                          |
|                                  | Description / body                       |
|                                  |                                          |
|                                  | [ Accept v ] [ Defer v ] Delete   ...   |
+----------------------------------+------------------------------------------+
```

Constrained Review uses focused Main View Review while preserving Queue/Filter/Order state offscreen.

Previous/Next uses current visible + ordered Queue. Ordinary edits do not complete Review. Accept/Defer/Delete do.

After a successful disposition:

```text
record current visible slot
-> re-query
-> exclude just-completed identity
-> select item now occupying that slot
-> if none, exit Review
```

Accept -> standard Issue or Project Composer, seeds title/body only, destination-first source removal.

Defer primary action -> `+7 days`, with normal temporal alternatives. Delete uses shared confirmation and remains lower visual weight than Accept/Defer.

True empty adds zero-state guidance for the same standard Triage creation intent. Filtered empty only offers `Clear filters`.

### 7.8 Home

Semantic reading order:

```text
Home
-> This week
-> Lifecycle activity
-> Work trend + Weekly meeting notes
-> Work pulse
```

Header:

```text
Home                                                      +
```

`+` menu:

```text
Triage
Issue
Project
Initiative
```

No Trail Inspector.

**This week**

Current Monday-Sunday strip with exactly two Due sources:

```text
              Mon   Tue   Wed   Thu   Fri   Sat   Sun
Triage         .     o     .    oo     .     .     .
Issues         o     .    oo     o    oo     .     .
                                   ^
                                 Today
```

Informational only; no hidden drill-down. High density may compress to dot + count.

**Lifecycle activity**

GitHub contribution-calendar geometry adapted to Trail visual tokens:

- week columns + weekday rows + month labels;
- one cell per local day;
- rolling three calendar months ending today;
- daily equal-weight count of `createdAt + firstStartedAt + terminalAt`;
- one hue with intensity steps;
- hover/focus -> date and Created/Started/Terminal counts;
- no click drill-down.

**Work trend**

Same rolling three-calendar-month horizon:

```text
Backlog stock   -> line
Active stock    -> line
Completed flow  -> day-local bars
```

No global Issue destination is invented for chart drill-down. No-history state keeps the chart frame/legend plus quiet copy.

**Weekly Meeting Notes**

Read-oriented by default with module-local Edit and Archive/Next. Edit uses a local draft; while editing, Archive/Next is hidden. History is a module-local sub-view, not Page/modal. Only Current is normally editable.

**Work pulse**

Last, not top KPI banner:

- Current Cycle -> period + shared compact Progress; click routes to Current Cycle; when none, `Start cycle` invokes standard Start Cycle;
- Triage -> Overdue + Remain segmented summary; click routes to Triage without mutating Filter;
- In Progress Projects -> Started Projects only, shared Project Progress micro-bars; module title routes to Projects Root; `+N more` preserves stable ordering; no hidden Health/ranking score.

Constrained Home reflows in the same semantic order. Historical modules keep the three-calendar-month horizon rather than shortening it to fit width.

### 7.9 Issue Full Item

Issue Full Item replaces Main View content in the same Trail tab:

```text
Main View                                 Right Sidebar

Issue title                               Issue Inspector
-------------------------------------     --------------------
lightweight Markdown body                 Status
                                           Project
                                           Priority
                                           Milestone
                                           Labels
                                           Due
                                           Estimate
                                           Current Cycle context/action
```

- title is inline-editable without permanent Edit/Save/Cancel chrome;
- body uses mature Obsidian/CodeMirror Markdown conventions;
- checklists remain ordinary body steps, not Sub-issues;
- `[[wikilinks]]` connect to ordinary Obsidian notes;
- property edits in Inspector must not remount the body editor or destroy cursor/scroll state;
- Full Item is the deep editing surface; Peek stays inspection-only.

## 8. Inspector blueprints

### 8.1 Inspector projection rule

Inspector shows meaningful entity presentation, not raw physical Markdown metadata.

```text
canonical Domain facts
+ effective Runtime relations
+ query-derived information
+ lifecycle/context
-> entity presentation projection
-> Inspector
```

Useful sections:

```text
Properties
Context
Progress / Attention / derived summaries
Info
```

Do not display physical IDs, carrier paths, parser offsets, schema markers, or implementation timestamps merely because they exist.

### 8.2 Project Inspector

```text
Project Inspector

Properties
--------------------------------
Status
Initiative
Priority
Labels
Due

Progress
--------------------------------
[============------] 67%

Attention
--------------------------------
[ overdue | this week | later ]

Milestones                                  +
----------------------------------------------
Foundation                              100%
UI baseline                              67%
Release                                   —
```

Project Progress = Completed / all current non-Canceled child Issues. Started receives no partial credit; Estimate/Priority/Due do not weight it.

Temporal Attention input = unfinished child Issues with Due. Segments are Overdue / Due This Week / Later Due. Only an exact shared-Filter mapping may become a direct Filter shortcut.

Milestone progress uses the same completion formula in Milestone scope. Clicking a Milestone applies the normal Project Workspace Milestone Filter. Milestone `+` opens Milestone quick-create only while planning capability permits.

Completed/Canceled Project can still expose editable organizational metadata where Domain capability allows; execution controls remain gated.

### 8.3 Cycle Inspector

Current:

```text
Cycle
Aug 25 - Sep 7
10 days left

Progress
[============------] 67%

Scope
12 issues

Effort
27

Info
Started     Aug 25
Ends        Sep 7

Close cycle
```

Historical:

```text
Cycle
Aug 11 - Aug 24

Scope
12 issues

Effort
27

Info
Started       Aug 11
Planned end   Aug 24
Closed        Aug 24
```

Historical Inspector does not emphasize Progress because close-time Issue state is not stored. Effort is a live aggregate of current member Estimate levels under current configured weights, not `Effort at close`.

### 8.4 Issue Inspector

Issue Full Item Inspector provides structured canonical properties and relationship actions:

```text
Status
Project
Priority
Milestone
Labels
Due
Estimate
Current Cycle context / Add / Remove where applicable
```

Current Cycle is relation/context, not a normal single-value Issue property because an Issue may belong to historical Cycles plus at most one Current Cycle.

### 8.5 Initiative Inspector

Initiative Focus may use an Initiative Inspector for stable Initiative properties/context already owned by canonical UI semantics. It must follow the same projection rule and compact property grammar, and it must not duplicate the Initiative description that belongs in Main View merely to fill the sidebar.

## 9. Responsive composition blueprint

Trail responds to the actual **Main View pane capacity**, not display resolution or a separate mobile/desktop product mode.

Shared priority:

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
| Home | multiple modules share width; Work Trend + Weekly Notes may sit side by side | reflow vertically in semantic order; keep historical horizon |
| Triage | Queue + Review split | focused Review; preserve Queue/Filter/Order session state |
| Projects / Initiative List | more project metadata | remove secondary metadata; keep title + Status longest |
| Project / Cycle List | more Issue metadata | reduce secondary metadata; preserve Title and necessary scope identity |
| Project / Cycle Board | multiple useful-width columns; Cycle has Project swimlanes | preserve useful card/column width and scroll Board horizontally |
| Projects Timeline | wide time axis | Timeline owns horizontal navigation/scroll; Page does not |
| Full Item | wide Main View with comfortable editor measure | editor narrows naturally; Inspector stays host-owned |
| Creation Composer | direct property controls | lower-priority optional properties overflow through shared `More`; required structural inputs remain visible |
| Peek | floating right-side Main View preview | near-full-width transient Main View preview |

Exact breakpoints come from real Obsidian pane capacity and consumer usability.

## 10. Runtime, capability, and feedback blueprint

### 10.1 Capability presentation

UI consumes effective capability/query output instead of reproducing lifecycle legality with page-local condition chains.

```text
Domain lifecycle + relationships + context + requested action
-> Query/effective capability
-> visible/enabled UI
```

UI still revalidates through Application/Domain at mutation time.

### 10.2 Optimistic fast path

Normal successful local mutations are quiet/optimistic. Trail does not emit a success toast for every edit merely for symmetry.

If an operation lasts long enough to be useful to the user, a low-attention shell status may appear:

```text
Loading
Saving
Refreshing
```

Completion removes it without a follow-up `Saved` toast.

### 10.3 Mutation failure

Failed optimistic mutation:

```text
remove failed optimistic plan
-> return affected UI to reliable committed/LKG state
-> concise transient action-focused error
```

Example:

```text
Couldn't update issue status
```

Do not expose parser/queue/transaction internals in normal product copy.

Composer failure is special only because it owns a user draft: keep the Composer open and preserve draft content while showing concise failure/retry feedback.

### 10.4 Data Issue / read-only

Persistent source-health problem with trustworthy last-known-good data:

```text
⚠ Showing the last valid version
  This item can't be edited until its Markdown source is valid again.
  Open source
```

Content remains readable. Mutation affordances are disabled only as broadly as canonical health/ownership rules require.

`read-only-error` with trustworthy LKG keeps content visible plus persistent read-only warning.

A full blocking error replaces content only when Trail cannot establish a trustworthy readable state.

## 11. Default Project Settings blueprint

Default Project is a Workspace preference, not a high-frequency Project property.

```text
Trail Settings

Workspace
--------------------------------
Default project
Trail                                      Change
```

`Change` opens the shared searchable Project Picker. There is no `No default project`/Clear choice.

Changing Default Project changes only the Workspace reference. It does not move Issues, change lifecycle, change Initiative relations, rename Projects, or bypass later operation legality.

The current Default Project cannot be deleted until another existing Project has independently become Default.

## 12. Implementation alignment

This section maps the blueprint to the current published UI owners without allowing current code to override the blueprint.

### 12.1 Keep / extend existing owners

| Current owner | Blueprint disposition |
| --- | --- |
| `TrailButton`, `TrailIconButton`, `TrailInput`, `TrailTextarea`, `TrailCheckbox`, `TrailSeparator` | keep as shared primitives; calibrate through semantic variants/tokens |
| `TrailProgress` | keep one Progress owner; extend for unavailable and density variants rather than creating entity-specific progress components |
| `TrailCollectionRow` | keep mechanical shell; preserve selection/leading/content separation and extend explicit inline-control activation boundaries as needed |
| `TrailPropertyControl` | keep shared compact property trigger pattern |
| Priority / Label / Due semantic owners | keep and extend across Row/Card/Inspector/Composer/Picker consumers |
| `TrailCollectionFilter` + filter state | keep as shared interaction owner; Pages supply registries/scope only |
| `TrailTriageRow` | keep as product-specific semantic row over shared row/property owners |

### 12.2 Refactor stale contracts

**`TrailWorkspaceShell` / `TrailLocationBar`**

Current shell requires a `locationBar` and `TrailLocationBar` renders a global `<h1>`-style location owner. Final blueprint requires Page-owned breadcrumb/title/action composition. Refactor Workspace Shell to own the frame/capacity boundary only. A reusable Page Header pattern may exist, but it must not become a mandatory global Location Bar.

**`TrailViewBar`**

Current `TrailViewBarProps` requires `display`. Final blueprint has no globally required Display. Replace/refactor toward composition-oriented **Collection Controls** with leading/trailing slots or equivalent semantic composition. Filter, direct Order, binary Layout, Timeline tools, or no trailing control are Page choices.

**`TrailProgress`**

Current `label + max + value` primitive lacks the accepted unavailable/compact/micro expression. Extend the same owner instead of adding `ProjectProgress`, `CycleProgress`, `HomeCycleProgress`, `HomeProjectProgress`, etc.

### 12.3 Missing shared interaction owners

Current `ui/interactions` primarily contains the shared Filter implementation. The blueprint requires additional shared owners matured from real consumers:

- transient interaction stack / focus ownership;
- selection state and Bulk integration;
- Action Registry and context resolution;
- Context Menu / contextual Command Menu presentation adapters;
- Peek;
- picker-family shared mechanics where existing semantic controls benefit from consolidation;
- shared confirmation mechanics;
- Creation Composer infrastructure.

These should be introduced through real product consumers, not as speculative framework work.

### 12.4 Page implementation packages

Expected Page-local ownership direction:

```text
ui/pages/projects
|- Projects Root
|- Initiative Focus
`- Project Workspace

ui/pages/cycles
|- Current Cycle
|- no-current landing
|- History
`- Historical Cycle

ui/pages/triage
`- Queue + Review workflow

ui/pages/home
`- fixed Home modules

Issue Full Item
`- dedicated entity-editing Page owner
```

This is an ownership direction, not a requirement that every visible rectangle becomes a separate source file.

### 12.5 Canonical/documentation synchronization status

The final documentation closure synchronizes the active canonical documents to this blueprint and retires the temporary drawing workbench. The synchronized active model therefore assumes:

- Sidebar Search is temporary Left Sidebar state with Initiative/Project/Workflow Issue navigation results only;
- normal navigation order is `Projects`, `<Default Project>`, `Cycles`, with Quick Capture owned by the Obsidian command/global-shortcut entry;
- Workspace Frame no longer requires a shared Location Bar/breadcrumb owner;
- collection controls no longer require generic Display/Sort semantics;
- Project/Cycle Lists use the frozen ordinary ordering rules rather than hidden Milestone/Label/same-Project clustering;
- persistent zero-count Status sections remain part of the Project/Cycle List workflow skeleton;
- Historical Cycle never implies close-time Issue-property snapshots or historical Progress;
- Triage uses direct `Order: Review due | Priority`;
- Home uses `This week -> Lifecycle activity -> Work trend + Weekly meeting notes -> Work pulse` with rolling three-calendar-month history;
- standard Creation and Shared Interaction contracts in this blueprint are the implementation target;
- `docs/design-to-code-map.md` maps Sidebar Search to Query + shell ownership rather than `ui/pages/search`.

Future implementation work must align published code to those synchronized documents rather than reopening the retired drawing pass.

## 13. Verification boundary

Implementation should prove shared contracts through both representative Foundation scenarios and real product consumers where practical.

A reusable owner is accepted only when:

- it matches the blueprint's semantic responsibility;
- Page-specific workflow does not leak into the shared owner;
- keyboard/focus/accessibility behavior is proven where relevant;
- constrained and normal widths preserve the intended information priority;
- host-owned behavior is verified in representative real Obsidian conditions when it cannot be established reliably in DOM/unit tests.

Page verification should focus on the Page's real composition and workflow, not on re-testing lower-layer Domain legality already owned elsewhere.

## 14. V1 non-goals preserved by this blueprint

This blueprint does not introduce:

- recursive Sub-issues;
- Area entity;
- persisted TriageItem/Fleeting Note model;
- Projectless Workflow Issue state;
- saved Creation Drafts or Create-more;
- arbitrary advanced filter/query builder;
- persisted manual Issue/Project/Milestone rank;
- future/upcoming Cycle objects or automatic rollover;
- Cycle close-time Issue snapshots;
- persisted Health/Attention/focus score;
- Home drill-down analytics or dashboard builder;
- Search over ordinary Vault notes;
- Search as a Main View Page;
- generic `Display` shell for every collection;
- a second document/editor domain;
- collaboration-first Teams/Assignees/SLA features;
- Custom Views/Favorites UI in the current V1 closure.

## 15. Completion rule

This blueprint is complete: Page composition and shared interaction semantics are sufficiently resolved to implement without reopening the design pass.

The active work after canonical synchronization is:

```text
align implementation owners through coherent product verticals
-> validate real production consumers
-> calibrate exact visuals and host behavior in real Obsidian
```

Implementation evidence may refine calibration, component API shape, and internal file boundaries. It must not silently reintroduce superseded navigation, Display, Location Bar, Search Page, ordering, Cycle, Triage, Home, Peek, or Creation semantics.

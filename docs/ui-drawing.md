# Trail UI Drawing Workbench

> **Lifecycle: temporary drawing document.** This file exists only while Trail's V1 UI is being drawn page by page in text. It is not a Product scope document, not an implementation plan, and not the final UI Blueprint. After every Page has been drawn, shared components have been identified, and the final `docs/ui-blueprints.md` has been generated and synchronized into the canonical UI documentation, delete this file.

## 1. What this work is

This workbench is the text equivalent of drawing Trail screens in Figma.

Product, Domain, Data, Architecture, and already-settled UI behavior decide **what Trail does**. This drawing pass decides only how those existing capabilities are composed and presented.

The drawing pass answers questions such as:

- what is visible on a Page;
- where visible elements are placed;
- what changes visually during interaction;
- what empty, filtered-empty, selected, editing, loading, and error states look like when relevant;
- how a Page responds to the width actually available in the Obsidian Main View;
- whether a Page uses a Trail Inspector in the Obsidian Right Sidebar;
- after all Pages have been drawn, which repeated responsibilities should become shared components/patterns.

Do not start by designing component APIs. Draw the Pages first.

## 2. Simple UI model

Use these terms unless a more specific visible concept is genuinely needed:

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
|     `- current Page
|
`- Right Sidebar
   `- Trail Inspector when the current Page uses one
```

The model is intentionally small:

- **Navigation** changes the current Trail location and therefore selects which Page the Main View shows.
- **`navigate(location)`** is the one conceptual navigation operation. Sidebar destinations, Search results, clickable ancestors, and other navigation consumers reuse it.
- **Back / Forward** belongs to the Obsidian host view header. Trail does not draw a second Back / Forward control inside Main View.
- **Main View** is one canvas. Its currently available width is an input to Page composition.
- **Page** decides its own title/breadcrumb, narrative context, actions, collection controls, content layout, and responsive behavior.
- **Breadcrumbs**, when used, are Page content. There is no mandatory global Trail Location Bar imposed by Navigation.
- **Search** is a temporary Left Sidebar mode, not a Trail Page/location.
- **Inspector** is Page-specific content hosted by the Obsidian Right Sidebar, not a fake column inside Main View.
- **Components** are extracted only after the Page drawings have been compared.

## 3. Linear reference rule

Trail's product semantics come first. Linear is used to resolve presentation and interaction for capabilities Trail already owns.

```text
Trail has the capability
        |
        v
Does current Linear have an equivalent UI responsibility?
|- yes, substantially equivalent -> copy observable presentation closely
|- similar but not equivalent     -> adapt Linear presentation to Trail semantics
`- no suitable equivalent         -> compose a Trail answer in the established visual language
```

Never use the reverse rule:

```text
Linear has feature X
-> Trail should have feature X
```

Do not import collaboration-first semantics, generic view-builder complexity, extra Page types, persisted facts, or actions merely because Linear has them.

## 4. Drawing process

For each actual Trail Page already established by Product/UI:

1. identify the closest current Linear Page/surface when an equivalent exists;
2. separate what Trail can copy, what Trail must adapt, and what Obsidian already owns;
3. draw the Page as a text layout;
4. list visible elements and information hierarchy;
5. describe only the interactions needed to understand visible state changes;
6. draw materially different lifecycle/empty/filter states when useful;
7. draw wide and constrained Main View behavior when composition changes;
8. include the Page's Inspector relationship when applicable;
9. record the accepted drawing and move to the next Page.

After **all** major Pages and Creation Surfaces are drawn:

1. compare the drawings side by side;
2. identify repeated visual/interaction responsibilities;
3. extract only genuinely shared components/patterns;
4. keep genuinely Page-specific composition local;
5. generate `docs/ui-blueprints.md` once from the accepted drawing set;
6. synchronize durable decisions into canonical UI/implementation documentation;
7. delete this workbench.

Do not create `docs/ui-blueprints.md` incrementally during the drawing discussions.

## 5. Current drawing status

### 5.1 Host/navigation boundary - closed

Ownership is:

```text
Obsidian host
|- window / tabs
|- Ribbon
|- Back / Forward and view-header mechanics
|- Left / Right Sidebar containers
|- split / resize / collapse behavior
`- ordinary host workspace mechanics

Trail
|- contents of Trail Navigation
|- current Page drawn in Main View
`- Trail Inspector contents when a Page uses one
```

The existing dark shell calibration is useful visual evidence, but unfinished implementation composition is not design authority.

### 5.2 Left Sidebar normal state - closed

The normal Trail Navigation contents are:

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

- `Search` is a high-frequency action in the Trail identity area, not a destination row.
- `Workspace` is a quiet section label, not a Page.
- `Projects` is one fixed destination; it is not an expandable Project tree.
- the Default Project occupies one fixed row after `Projects`; its visible title follows the current Default Project. A fresh Workspace begins with the ordinary fallback Project titled `Standalone`.
- the Default Project remains an ordinary Project, not a second Project model.
- the Triage trailing count is quiet Review Set metadata, not a generic unread badge.
- the Sidebar never inserts the currently open Initiative/Project/Issue dynamically.
- Capture, Settings, Foundation Lab, Initiative rows, Favorites, and dynamic Project children are not normal Sidebar rows in this drawing.

Quick Capture is not navigation. Its entry points are handled by the relevant Page/global shortcut and later Creation Surfaces drawing.

### 5.3 Left Sidebar Search mode - closed

Activating Search temporarily replaces normal Trail Navigation contents:

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

Rules:

- Search is transient Sidebar UI, not a Trail Page/location.
- opening Search does not change Main View, host history, or Right Sidebar.
- the input receives focus immediately.
- results include Initiative, Project, and Issue navigation targets.
- Cycle, Triage entries, and ordinary Obsidian notes are not Trail global Search result kinds.
- `Esc` or the Search back control closes Search and restores the previous Sidebar contents without changing Page.
- choosing a result calls `navigate(result.location)`, closes Search, restores normal Sidebar, and renders the destination Page.

### 5.4 Navigation behavior - closed at this drawing level

Conceptually:

```text
Sidebar destination ---------\
Search result ----------------+-> navigate(location) -> current Page changes
Page clickable ancestor -----/

Obsidian Back / Forward ----------> host Page-history traversal
```

Representative locations include:

```text
Home
Triage
Projects
Initiative(initiativeId)
Project(projectId)
Issue(issueId)
Cycles / cycle-related locations
```

Search is absent because it is not a Page.

Sidebar focus communicates the current product area rather than visit history:

- Home Page -> `Home`;
- Triage Page -> `Triage`;
- Projects Root / Initiative Focus / ordinary Project Workspace -> `Projects`;
- the Default Project Workspace may use the dedicated Default Project row;
- Issue Full Item -> `Projects` regardless of entry route;
- Cycle Pages -> `Cycles`.

### 5.5 Page-owned composition boundary - closed

Once Navigation selects a Page, the Page decides:

- breadcrumb presence and ancestry;
- title/current identity;
- narrative context;
- Page actions and overflow;
- collection controls;
- List/Board/Timeline/editor/chart/review geometry;
- Inspector usage;
- constrained/wide composition.

A clickable breadcrumb ancestor may reuse `navigate(location)`, but this does not create a global breadcrumb shell object.

### 5.6 Projects Root - closed

Projects Root is the all-Project scanning surface. It stays Project-first and does not become a dashboard or a generic view builder.

Accepted Page frame:

```text
Projects                                               +

Filter                              [ List | Timeline ]
```

Page rules:

- `Projects` is the Page title; this top-level Page does not need a breadcrumb.
- the compact `+` invokes the standard New Project creation intent.
- Projects Root has no Trail Inspector. An unrelated host Right Sidebar view remains untouched.
- there is no `Display` or generic `Sort` control.
- default Projects Root Filter hides Completed/Canceled Projects; the user may include them through Filter.

#### 5.6.1 List presentation

Default List groups Projects by Initiative:

```text
v  Initiative Alpha                                      2

   [Status] Project A      In Progress   [Priority] 65%   Sep 08
   [Status] Project B      Planned                  20%   Sep 20

v  Initiative Beta                                       1

   [Status] Project C      In Progress              40%

v  No Initiative                                         1

   [Status] Standalone     Planned
```

Group rules:

- a real Initiative title navigates to Initiative Focus;
- disclosure expands/collapses without navigating;
- trailing count is quiet summary metadata;
- `No Initiative` is a grouping label rather than an entity and stays last;
- Initiative groups use stable deterministic ordering and do not jump because one child Project becomes urgent.

Project Summary Row is compact and normally single-line:

```text
[Status] Project title      Status      Priority      Progress      Due
```

Information priority:

- Project title and Status identity survive longest;
- Status name is high-value scanning information;
- Priority, Due, and numeric Progress are secondary;
- Progress does not become a large bar in Projects Root;
- Description, Labels, and Initiative membership are not normal row metadata;
- exceptional derived Attention may gain emphasis when there is a real exception.

Constrained width progressively removes secondary metadata rather than turning each row into a card.

#### 5.6.2 Default Work Order

Reusable ordinary-work ordering principle:

```text
actionable before terminal
-> Due urgency
-> lifecycle / Status order
-> Priority
-> Created At when the entity actually owns a canonical creation timestamp
-> stable deterministic fallback
```

Interpretation:

- terminal objects do not outrank actionable work merely because of Due;
- among actionable objects, overdue/earlier concrete Due values come first and no-Due comes after concrete Due;
- lifecycle/Status ordering follows configured/system semantics;
- Priority follows the shared Urgent/High/Medium/Low/unset meaning;
- Created At is only used when canonical data exists;
- incidental edits/Updated At do not become default ordering facts;
- no hidden persisted rank is introduced.

Projects Root applies this inside each Initiative group. Filter and ordering remain separate responsibilities.

#### 5.6.3 Timeline presentation

Timeline is the same filtered Project collection in temporal form:

```text
Filter              [ List | Timeline ]      Month v      Today
```

Tools:

```text
Zoom
|- Week
|- Month
|- Quarter
`- Year

+ horizontal time navigation / pan / scroll
+ Today
```

Conceptually:

```text
                       Aug              Sep              Oct
                       |                |                |
                       |              Today              |
                       |                |                |
v Initiative Alpha    |                |                |
  Project A            ===== execution evidence ====>Due|
  Project B                 ===== planning evidence =====>Due
```

Timeline rules:

- use real current lifecycle/Issue evidence rather than invented Project start/end facts;
- Due is a separate marker, not silently a canonical Project end date;
- Today is a quiet reference line;
- Projects without required temporal evidence may be absent from Timeline while remaining in List;
- Trail does not add drag-to-reschedule, dependencies, or resource planning merely to imitate Linear;
- `Display` remains absent; Zoom and Today are direct Timeline tools.

#### 5.6.4 Deferred details

Projects Root is closed at this drawing level. Exact row height, icon glyphs, hover states, breakpoint numbers, selection/bulk visuals, Peek, Context Menu, and dense Timeline collision behavior remain for later shared/component calibration unless another Page reveals a contradiction.

### 5.7 Initiative Focus - closed

Initiative Focus is the Project collection for one Initiative. It reuses the accepted Project row/work-order language but has its own identity, narrative context, default visibility, and empty states.

Representative wide composition:

```text
Main View                                                   Right Sidebar

Projects / Initiative Alpha                          +     existing Initiative Inspector
--------------------------------------------------------
Build a simpler personal planning system that keeps
long-term goals connected to executable work...
--------------------------------------------------------
Filter
--------------------------------------------------------

[Status] Project A      In Progress   [Priority] 65%   Sep 08
[Status] Project B      Planned                  20%   Sep 20
[Status] Project C      In Progress              40%

[Status] Project D      Completed                100%
[Status] Project E      Canceled
```

The Right Sidebar reference only means Initiative Focus continues to use the already-resolved Initiative Inspector and entry-time host-capacity behavior. This Page does not redesign Inspector contents.

#### 5.7.1 Page identity and primary creation

```text
Projects / Initiative Alpha                                      +
```

- `Projects` is a quiet clickable ancestor -> Projects Root.
- `Initiative Alpha` is the current Page identity/title.
- the title is not repeated as a second large heading.
- `+` is the stable New Project action.
- standard Project creation opens with the current Initiative prefilled, while the Initiative relation remains editable before Create.
- no permanent `...` is required merely because low-frequency Initiative actions exist.

This is an Initiative Focus composition decision, not a universal breadcrumb-title rule.

#### 5.7.2 Initiative description

Description is lightweight narrative context between identity and Project collection.

```text
no description
-> no description region

short description
-> show complete text
-> no fake expansion behavior

long description
-> bounded preview
-> activate non-link area to expand/collapse

wikilink
-> follow link
-> do not also toggle disclosure
```

There is no permanent `Description` heading, info button, card, separate Overview Page, or Inspector duplication. Exact clamp height is visual calibration.

#### 5.7.3 Scoped Project collection

Scope:

```text
Project.initiativeId == current Initiative
```

Presentation:

- flat List only;
- no Initiative grouping;
- no Status grouping;
- no Board/Timeline;
- no `Display` or generic `Sort`;
- `Filter` is the permanent collection control;
- Initiative is not repeated as a Filter dimension;
- Filter registry: Status, Priority, Labels, Due.

Default visibility intentionally differs from Projects Root:

```text
Projects Root default
-> hides Completed / Canceled

Initiative Focus default
-> no lifecycle exclusion
-> shows all Projects currently in the Initiative
```

Default Work Order still keeps actionable Projects before terminal Projects. Terminal rows may be quieter but remain navigable; meaningful exceptions may regain emphasis.

Changing a Project's ordinary Initiative relation naturally moves it into/out of scope. There is no special `Remove from Initiative` Domain action.

#### 5.7.4 Empty states

True empty:

```text
Projects / Initiative Alpha                                      +
---------------------------------------------------------------
Filter
---------------------------------------------------------------

                         No projects yet

              Create the first project for this initiative.

                         + New project
```

The centered action invokes the same creation intent as header `+`; it exists only as zero-state guidance and disappears after the first Project exists.

Filtered empty:

```text
Filter   [Status: In Progress]   [Priority: High]
---------------------------------------------------------------

                   No projects match these filters

                            Clear filters
```

Filtered-empty does not add a second creation CTA.

#### 5.7.5 Constrained Main View

- preserve current Initiative identity before ancestry;
- ancestry and low-priority metadata may compress;
- description preview may compress before Project collection usability;
- Project rows reuse responsive reduction and preserve title + Status identity longest;
- no card conversion and no whole-Page horizontal scroll;
- Inspector remains a Right Sidebar view rather than moving under Main View.

#### 5.7.6 Deferred details

Initiative Focus is closed at this drawing level. Exact clamp measurements, hover animation, picker geometry, row/context-menu visuals, bulk selection treatment, and low-frequency Initiative overflow remain later calibration/shared-interaction work.

### 5.8 Project Workspace - closed

Project Workspace is the primary Project-local planning and execution surface. One stable Page skeleton is retained across Planned, In Progress, Completed, and Canceled Projects; lifecycle changes capabilities rather than creating separate Page types.

Representative wide In Progress composition:

```text
Main View                                                     Right Sidebar

Projects / Initiative Alpha / Project Trail             +    existing Project Inspector
-----------------------------------------------------------
Ship the first stable Trail release with the core planning
and execution workflow complete...
-----------------------------------------------------------
Filter                                      [ List | Board ]
-----------------------------------------------------------

v  In Progress                                           2

   [Priority] Fix mutation race
              [Milestone] [Labels] [Cycle] M          Sep 08

   [Priority] Finish Project Workspace
              [Milestone] [Labels] [Cycle] S          Sep 10

v  Todo                                                  1

   [Priority] Validate Project actions
              [Milestone]          L                  Sep 12

>  Backlog                                               0
>  Done                                                  0
>  Canceled                                              0
```

The Right Sidebar reference means only that Project Workspace reuses the already-resolved Project Inspector. Inspector contents are not redesigned here.

#### 5.8.1 Page identity and Project description

Structural Page-owned breadcrumb:

```text
with Initiative
Projects / Initiative Alpha / Project Trail

without Initiative
Projects / Project Personal
```

- `Projects` -> Projects Root;
- Initiative segment -> Initiative Focus;
- Project segment is terminal/current Page identity;
- ancestry follows current Domain relations, not visit history;
- Project title is not repeated as a second large heading.

Project description reuses Initiative Focus narrative behavior:

```text
no description -> no region
short          -> show fully
long           -> bounded preview, activate non-link area to expand/collapse
wikilink       -> follow link without toggling disclosure
```

Description is not duplicated in Inspector and does not create a heavyweight Overview Page.

#### 5.8.2 Stable New Issue action and lifecycle capability

Header keeps one stable `+` slot. Its meaning is always `New Issue`.

```text
Planned       + enabled
In Progress   + enabled
Completed     + disabled
Canceled      + disabled
```

Disabled `+` remains visible so header geometry does not jump. Hover/focus may explain that the Project must be reopened. Activating disabled `+` does nothing and never silently changes Project lifecycle.

Enabled `+` invocation contract:

```text
Project Workspace +
-> Standard Issue Composer
-> current Project prefilled
-> Project relation editable before Create
-> created Workflow Issue starts in Backlog
```

Composer geometry/validation/keyboard behavior is deliberately deferred to the later shared **Creation Surfaces** drawing pass.

#### 5.8.3 Lifecycle variants

| Project lifecycle | Header `+` | List | Board | Normal execution |
| --- | --- | --- | --- | --- |
| Planned | enabled | yes | no | unavailable; planning/Backlog work remains legal |
| In Progress | enabled | yes | yes | normal Issue workflow |
| Completed | disabled | yes | no | unavailable; settled review/correction only |
| Canceled | disabled | yes | no | unavailable; legal cleanup remains |

Lifecycle never rewrites/hides actual current child facts.

Presentation capability rule:

```text
capability gained
-> expose new option
-> do not auto-activate it

capability lost
-> leave impossible presentation
-> fall back to nearest valid presentation
```

Therefore:

- Planned -> In Progress reveals Board but remains in List;
- Completed/Canceled -> In Progress reveals Board but remains in List;
- if Board is active and Project leaves Started lifecycle, fall back to List;
- Filter is preserved during that fallback.

Completed/Canceled do not receive a large lifecycle banner or whole-Page opacity reduction. Child row treatment follows the child's own Status.

#### 5.8.4 Collection controls

Project Workspace has no generic `Display` or `Sort` control.

```text
Planned / Completed / Canceled
Filter

In Progress
Filter                                      [ List | Board ]
```

- List is default Project Workspace presentation.
- Board is explicit execution presentation available only for Started/In Progress Project.
- Filter registry: Status, Priority, Milestone, Labels, Due, Estimate.
- Project is not a Filter dimension because Page scope fixes it.
- Cycle is not a Filter dimension; Current Cycle membership is a compact Row/Card marker.
- Filter is location-scoped session presentation state and survives List/Board switching.
- switching presentation never rewrites Filter.

#### 5.8.5 List Status skeleton and order

List always renders the complete vertical workflow skeleton:

```text
In Progress
Todo
Backlog
Done
Canceled
```

Conceptually:

```text
Started
-> Unstarted
-> Backlog
-> Completed
-> Canceled
```

Concrete StatusDefinitions use configured order inside each category when relevant.

Every Status section remains visible even when current visible count is zero, including after filtering:

```text
>  In Progress                                           0
>  Todo                                                  0
>  Backlog                                               0
>  Done                                                  0
>  Canceled                                              0
```

- empty section height equals section header only;
- disclosure remains structurally available but reveals no body when count is zero;
- count means current filter-visible rows, not hidden total membership;
- non-empty sections may collapse/expand as transient state;
- there is no per-section `+`, because new Workflow Issues always enter Backlog.

Within one Status section:

```text
Due urgency
-> Priority
-> Created At
-> stable deterministic fallback
```

Status ordering is already supplied by the section. Milestone/Label clustering is not used as a hidden default ordering mechanism. Terminal sections may suppress actionable Due emphasis but remain deterministic rather than becoming an activity feed.

#### 5.8.6 Fixed Issue Row information hierarchy

```text
[Selection] [Priority]  Title   Milestone   Labels   Current Cycle   Estimate   Due
```

Rules:

- Title is strongest/flexible;
- Status is omitted because section expresses it;
- Project is omitted because Page scope expresses it;
- Description/body stays out of Row and belongs to Peek/Full Item;
- Priority reuses existing shared visual identity;
- Milestone keeps its meaningful name when present;
- Labels use compact shared dots/markers;
- Current Cycle uses a compact membership marker, not repeated text;
- Estimate uses S / M / L / XL;
- Due is quiet for ordinary future dates and may emphasize Today/Overdue;
- absent optional metadata normally disappears rather than showing placeholder dashes.

Constrained width removes/compresses lower-priority secondary metadata. List does not become cards or horizontally scroll as a whole.

#### 5.8.7 Label linked hover/focus

Compact Label markers use linked identification across the currently rendered Page.

```text
directly hovered/focused Label instance
-> hover/focus emphasis
-> reveal a small nearby full Label name

other visible instances of the same exact Label ID
-> same visual emphasis
-> no repeated name text

unrelated Labels
-> unchanged
```

Scope is currently rendered visible Issues only. The interaction does not auto-expand collapsed sections, reveal filtered-out items, search the Workspace, modify Filter, or modify Selection.

```text
hover/focus -> identify + linked highlight
click       -> no action
```

Compact Label click is not silently turned into filtering or editing.

#### 5.8.8 Milestone is Project-local context, not a Page

Trail V1 does **not** create a Milestone Page or Milestone navigation hierarchy.

```text
Project Workspace
-> Page

Milestone
-> Project-local checkpoint/entity
-> Issue relation
-> compact Project Inspector summary/management
-> normal Filter focus
```

Main View has no Milestone tabs/strip, Milestone grouping, or `Group by Milestone`. Status remains primary workflow organization.

Issue Row/Card shows Milestone name as scanning context when present. That compact Row/Card value is display-only at this drawing level; no hidden click-to-filter behavior is assigned.

Project Inspector remains the Project-level Milestone surface:

```text
Milestones                                  +
----------------------------------------------
Foundation                              100%
UI baseline                              67%
Release                                   -
```

Clicking an Inspector Milestone writes the normal Project Workspace Filter:

```text
location = Project(projectId)
Filter   = Milestone(milestoneId)
```

This does not navigate, add host history, change breadcrumb, or change Inspector target. Normal Filter UI represents the active focus; Inspector keeps no private focus state. The matching Inspector row may use quiet active treatment while that Filter clause is active.

Milestone progress belongs to Milestone summary presentation, not repeated Issue rows/cards.

#### 5.8.9 Board presentation

Board is available only for Started/In Progress Project and expresses execution flow horizontally:

```text
Todo -> In Progress -> Done
```

Backlog and Canceled remain valid Issue statuses but are excluded from normal Board columns.

Representative Board:

```text
Filter                                      [ List | Board ]
-----------------------------------------------------------

+----------------------+ +----------------------+ +----------------------+
| Todo               3 | | In Progress        2 | | Done               4 |
|                      | |                      | |                      |
| [Priority] Issue A   | | [Priority] Issue C   | | [Priority] Issue E   |
| [Milestone] [meta]   | | [Milestone] [meta]   | | [Milestone] [meta]   |
|                      | |                      | |                      |
| [Priority] Issue B   | | [Priority] Issue D   | | ...                  |
+----------------------+ +----------------------+ +----------------------+
```

Board Card information:

```text
primary
-> Priority + Title

secondary
-> Milestone + Labels + Current Cycle marker + Estimate + Due
```

Status is omitted because column expresses it. Project is omitted because Page expresses it. Description stays in Peek.

There is no per-column `+`. Page header `+` remains the only New Issue action. New Issue always enters Backlog even when Board is active; Board remains active and no special `Created in Backlog` message is added.

Drag semantics:

- cross-column drag among Todo/In Progress/Done -> Status change only;
- same-column drag -> no persisted manual rank/order;
- Backlog/Canceled changes use normal Status/property/action mechanisms;
- no hidden edge-drop zones.

#### 5.8.10 Board width, scrolling, and empty lanes

```text
column reaches minimum useful width
-> stop compressing
-> Board canvas scrolls horizontally
```

Do not:

- stack columns vertically;
- auto-switch to List because width changed;
- squeeze cards until scanability is lost.

Collection controls remain outside horizontal Board viewport. Board uses one shared vertical scroll rather than one vertical scrollbar per column. Column headers may stay sticky during long vertical scrolling. During drag, approaching horizontal viewport edge should auto-scroll so off-screen legal Status columns can become drop targets.

Empty Board columns remain full lanes at count zero because workflow structure/drop targets remain useful:

```text
Todo 0              In Progress 0       Done 0
+----------------+  +----------------+  +----------------+
|                |  |                |  |                |
|                |  |                |  |                |
+----------------+  +----------------+  +----------------+
```

An unfiltered Board with zero visible Board-status Issues shows only the empty lanes. It does not claim `No issues yet` because Backlog/Canceled Issues may exist, and it does not add a centered New Issue CTA that implies new Backlog work will appear in a Board lane.

#### 5.8.11 Filter x Board

```text
Project Issue scope
-> current Filter
-> current presentation
```

List/Board switching preserves exact Filter state. A Status Filter may include Backlog/Canceled values even though Board has no corresponding columns.

Filter affects Cards, not workflow columns. Todo/In Progress/Done columns remain present even when zero matching Cards exist. Column counts always mean currently visible/filter-matching Cards.

Example:

```text
Filter [Status: Todo]

Todo 3              In Progress 0       Done 0
```

If a Todo Card is legally dragged to In Progress, it naturally disappears because it no longer matches the active Status Filter. No warning is needed.

If active Filter yields zero visible Board Cards, keep all lanes and add low-noise recovery:

```text
No board issues match these filters
Clear filters
```

The Board-specific wording acknowledges that matching Backlog/Canceled Issues may exist outside Board projection.

#### 5.8.12 True-empty and filtered-empty List states

Genuinely empty Planned/In Progress Project:

```text
>  In Progress                                           0
>  Todo                                                  0
>  Backlog                                               0
>  Done                                                  0
>  Canceled                                              0

                         No issues yet

               Add the first issue to this project.

                         + New issue
```

Centered CTA invokes the same creation intent as header `+` and disappears once any Issue exists.

Genuinely empty Completed/Canceled Project:

```text
>  In Progress                                           0
>  Todo                                                  0
>  Backlog                                               0
>  Done                                                  0
>  Canceled                                              0

                  No issues in this project
```

No centered creation CTA.

Filtered List with zero visible rows:

```text
>  In Progress                                           0
>  Todo                                                  0
>  Backlog                                               0
>  Done                                                  0
>  Canceled                                              0

                No issues match these filters
                         Clear filters
```

Filtered-empty never adds a centered New Issue action merely because query results are empty.

#### 5.8.13 Issue activation, Peek, Full Item, and Selection

Shared depth model:

```text
Row / Card
-> scan

ordinary activation
-> Peek

Peek
-> read hidden Issue detail without leaving collection

Open Full Item
-> navigate to Issue Full Item for deep editing
```

Peek is transient floating Main View UI and does not replace persistent Project Inspector. Entering Issue Full Item changes primary location and may show Issue Inspector; host Back returns through normal Page history.

Project Workspace reuses shared selection semantics. Selection affordance remains distinct from ordinary activation; do not rely on single-click-select/double-click-open file-manager behavior.

#### 5.8.14 Canceled Project unresolved attention

Canceled Project may legitimately retain unresolved child Issues.

Main View does not add a large warning banner because Status-first List already keeps unresolved In Progress/Todo/Backlog work near the top and shows actual facts directly.

Existing Project Inspector may show a compact unresolved-work Attention signal. When the intended focus maps exactly to the shared Filter grammar, activating it writes normal Status Filter values rather than a hidden `unresolvedOnly` state.

```text
Main View
-> actual unresolved Issues remain visible/actionable

Project Inspector
-> compact derived attention/reason

Filter
-> normal focus mechanism
```

Unresolved child rows are not globally muted merely because parent Project is Canceled.

#### 5.8.15 Constrained Main View

- preserve current Project identity before breadcrumb ancestry;
- description preview may compress before collection usability;
- List progressively removes lower-priority row metadata while preserving Title and important exception signals;
- Board keeps minimum useful Card/column width and scrolls horizontally inside Board canvas;
- List never becomes Card layout just because width is narrow;
- Board never auto-falls back to List just because width is narrow;
- Project Inspector remains Right Sidebar content and never moves below Main View.

Exact dimensions, sticky offsets, description clamp measurements, hover animation, and breakpoints remain calibration details.

#### 5.8.16 Deferred/shared drawing boundary

Project Workspace is closed at this drawing level.

Do not page-locally reopen/redesign:

- Project Inspector property/progress/attention contents already owned by canonical UI design;
- Priority/Status/Due/Estimate picker mechanics;
- shared Selection/Bulk/Context Menu behavior;
- Peek and Full Item internals beyond the invocation relationship needed by this Page;
- full creation/composer geometry and validation behavior.

A dedicated **Creation Surfaces** drawing pass will later resolve Triage/Issue/Project/Initiative creation together, plus the lighter Milestone quick-create case, after all major Page entry contexts are known.

This Page intentionally supersedes older assumptions that require a permanent `Display` control, hide empty Status sections, use Milestone/Label clustering as default Issue ordering, or make compact Row/Card Milestone text a quick-filter control.

### 5.9 Cycle family - closed

Cycle UI is a thin specialization of the already-accepted Issue collection language rather than a separate task-management system.

The central composition rule is:

```text
Current Cycle
= Project Workspace Issue collection
+ Cycle scope/context
+ Project dimension
+ Cycle lifecycle

Historical Cycle
= final Cycle membership
+ current live Issue projection
```

Trail deliberately does not copy Linear's automatic cadence, future Cycle objects, automatic rollover, close-time analytics snapshots, Capacity, Velocity, or Cycle Success semantics.

#### 5.9.1 Current Cycle Page identity and summary

When one Open Cycle exists, the Sidebar `Cycles` destination opens that Current Cycle directly.

Representative Board composition:

```text
Main View                                                   Right Sidebar

Cycles / Aug 25 - Sep 7                     History   Add issues   Cycle Inspector
----------------------------------------------------------------  ----------------
10 days left   |   12 issues   |   67%                           Cycle
                                                                    Aug 25 - Sep 7
Filter                                      [ List | Board ]        10 days left
----------------------------------------------------------------
                                                                    Progress
                 Todo       In Progress       Done                  ----------
                                                                    [bar] 67%
v Project Trail                                         5
----------------------------------------------------------------    Scope
                 Issue A     Issue B           Issue C               12 issues
                 Issue D                       Issue E
                                                                    Effort
v Project Notes                                         4           27
----------------------------------------------------------------
                 Issue F     Issue G           Issue H               Info
                                                                    Started   Aug 25
> Project Personal                                      3           Ends      Sep 7
----------------------------------------------------------------
                                                                    Close cycle
```

Identity/context rules:

- the Page identity is the Cycle date range; Cycle has no persisted title;
- `Cycles` is the quiet clickable ancestor;
- `History` is a secondary navigation action;
- `Add issues` is the stable primary membership action and intentionally uses words rather than a generic `+` because the action selects existing Issues instead of creating an entity;
- the lightweight Main View summary is time relation + membership count + live Progress;
- Effort stays in the Inspector rather than becoming another Main View KPI;
- no dashboard cards are introduced around the Issue collection.

Current Cycle Progress is the canonical live projection over current membership:

```text
effective members
= Current Cycle members excluding Canceled Issues

completed members
= effective members currently in Completed

Progress
= completed / effective
```

When there are no effective members, Progress is unavailable rather than invented as 0% or 100%. Estimate does not weight Progress.

#### 5.9.2 Current Cycle collection is Project Workspace plus context

Current Cycle reuses the accepted Project Workspace collection responsibilities wherever they are genuinely shared:

- Filter interaction;
- fixed List/Board presentation grammar;
- Status sections and Status columns;
- Issue Row/Card information hierarchy;
- Priority, Milestone, Label, Estimate, and Due visual identity;
- Label linked hover/focus;
- Peek and Full Item invocation;
- Selection/Bulk/Context Menu grammar;
- Board width/horizontal scrolling;
- Status drag behavior.

The Page-specific delta is:

```text
Board
= Project Workspace Board
+ Project swimlanes
- Current Cycle marker

List
= Project Workspace List
+ Project property
- Current Cycle marker
```

Current Cycle has no generic `Display` or `Sort` control. Board is the default presentation; List is always available.

The Filter registry is:

```text
Status
Project
Priority
Milestone
Labels
Due
Estimate
```

Cycle is not a Filter dimension because Cycle membership is already Page scope.

Filter remains Page/location-scoped presentation state and survives List/Board switching.

#### 5.9.3 Current Cycle List

Current Cycle List is Status-first and reuses the same persistent Workflow Status skeleton as Project Workspace:

```text
In Progress
Todo
Backlog
Done
Canceled
```

Representative composition:

```text
Cycles / Aug 25 - Sep 7                     History   Add issues
----------------------------------------------------------------
10 days left   |   12 issues   |   67%

Filter                                      [ List | Board ]
----------------------------------------------------------------

v In Progress                                             2

  [Priority] Fix mutation race
             Project Trail   [Milestone] [Labels] M        Sep 08

  [Priority] Prepare release notes
             Project Notes   [Milestone]          S        Sep 09

v Todo                                                    1

  [Priority] Validate workspace
             Project Trail   [Labels]             L        Sep 12

> Backlog                                                 0
> Done                                                    0
> Canceled                                                0
```

Every Status section remains visible at count zero, including after Filter removes all matching Issues.

The Current Cycle Row is:

```text
[Selection] [Priority] Title   Project   Milestone   Labels   Estimate   Due
```

Compared with Project Workspace:

```text
Project Workspace
Project = Page scope
Current Cycle = useful Row context

Current Cycle
Cycle = Page scope
Project = useful Row context
```

Current Cycle List does not add automatic Project clustering inside one Status. It reuses the Project Workspace within-Status work order:

```text
Due urgency
-> Priority
-> Created At
-> stable deterministic fallback
```

This intentionally supersedes older canonical language that tried to keep same-Project Issues visually clustered inside Current Cycle List. Project grouping belongs to Board; List remains Status-first scanning with Project as metadata.

Responsive reduction preserves Title and Project context strongly. Milestone, Labels, Estimate, and ordinary Due may reduce progressively; exceptional Today/Overdue attention may survive longer than ordinary secondary metadata.

#### 5.9.4 Current Cycle Board and Project swimlanes

Current Cycle Board is the accepted Project Workspace Board with one fixed secondary grouping dimension:

```text
horizontal dimension
= Status

vertical dimension
= Project

cell contents
= Issues
```

The fixed workflow columns remain:

```text
Todo -> In Progress -> Done
```

Backlog and Canceled Cycle members remain legal membership and are visible in List, but they are outside the normal Board projection.

Project lane header reuses the same visual grouping grammar already accepted for Projects Root Initiative groups:

```text
v Project Trail                                         4
----------------------------------------------------------
```

The roles are:

- disclosure expands/collapses the Project lane without navigating;
- Project title navigates to that Project Workspace;
- the quiet trailing count is the number of currently visible/filter-matching Board Cards in that lane;
- lane header is not a mini Project dashboard and does not add Progress/Effort/Health summaries;
- Project lanes use a stable deterministic Project order rather than reordering by child Issue urgency or activity.

Project lanes are derived grouping, not a fixed workflow skeleton:

```text
Cycle membership
-> Filter
-> Board Status projection
-> derive Project lanes from visible Cards
```

A Project with no visible Board Card after Filter/projection does not retain an empty lane merely to preserve grouping. The fixed Status columns remain; derived Project lanes may appear/disappear with visible data.

A Project lane is not a Project mutation target. Drag is legal horizontally inside the same Project lane to change Status; dragging across Project lanes does not change Project and other lanes are not Project drop targets. Project changes continue through the normal Issue relation/action surfaces.

Board Card uses the accepted Project Workspace semantic Card minus context already expressed by the Page/lane:

```text
primary
-> Priority + Title

secondary
-> Milestone + Label dots + Estimate + Due
```

Status is expressed by column, Project by lane, and Current Cycle by Page scope.

Board width behavior, horizontal Status scrolling, one shared vertical page/board scroll, sticky column headers where useful, drag-edge auto-scroll, and minimum useful Card/column widths reuse Project Workspace behavior.

#### 5.9.5 Board/filter empty behavior

Filter and Board projection remain independent:

```text
Current Cycle membership
-> current Filter
-> Board projection
```

Filter never removes the fixed Todo/In Progress/Done columns.

An unfiltered Current Cycle with members only in Backlog/Canceled may show empty Board columns without claiming the Cycle itself is empty:

```text
Todo 0              In Progress 0       Done 0
+----------------+  +----------------+  +----------------+
|                |  |                |  |                |
|                |  |                |  |                |
+----------------+  +----------------+  +----------------+
```

When an active Filter produces zero visible Board Cards, retain all three columns and show:

```text
No board issues match these filters
Clear filters
```

The wording remains Board-specific because matching Backlog/Canceled members may exist outside Board projection.

#### 5.9.6 Current Cycle List empty states

A genuinely empty Open Cycle keeps the full zero-count Status skeleton and uses membership guidance rather than creation guidance:

```text
> In Progress                                           0
> Todo                                                  0
> Backlog                                               0
> Done                                                  0
> Canceled                                              0


                    No issues in this cycle

                           Add issues
```

The centered `Add issues` duplicates the stable header action only for the genuine zero-membership state.

Filtered-empty List keeps the zero-count skeleton and uses recovery language:

```text
No issues match these filters
Clear filters
```

Filtered-empty does not add another `Add issues` CTA.

#### 5.9.7 Add issues surface

`Add issues` is a Cycle membership selection surface, not a creation Composer.

Representative shape:

```text
+--------------------------------------------------------------+
| Add issues                                                   |
|                                                              |
| [ Search issues...                                      ]    |
|                                                              |
| Filter                                                       |
|--------------------------------------------------------------|
|                                                              |
| [ ] [Priority] Fix parser bug                                |
|                  Project Trail        In Progress     Sep 08 |
|                                                              |
| [ ] [Priority] Finish documentation                          |
|                  Project Trail        Todo            Sep 10 |
|                                                              |
| [ ] [Priority] Clean old notes                               |
|                  Project Notes        Backlog                 |
|                                                              |
|--------------------------------------------------------------|
| 3 selected                              Cancel   Add 3 issues |
+--------------------------------------------------------------+
```

Candidate Row prioritizes selection identity rather than reproducing the full Issue Row:

```text
Selection
Priority
Title
Project
Status
Due
```

Default Cycle-level discovery proactively surfaces open Workflow Issues from Started/In Progress Projects and excludes Issues already in the Current Cycle. This is discovery policy, not Domain legality.

Any Workflow Issue remains a legal Open-Cycle member. For example, an explicit Issue action from a Planned Project may add a Backlog Issue even when that Issue was not proactively surfaced by Cycle-level discovery.

Search/Filter help narrow candidates without turning this surface into a generic view builder. The candidate Filter may use Project, Status, Priority, Milestone, Labels, Due, and Estimate. There is no Display/Sort/Cycle picker.

Candidate-row activation toggles selection because selection is the purpose of this surface; ordinary collection Row activation continues to mean Peek outside this selector.

Successful Add updates Cycle membership only and closes the selector. It does not change Issue Status, Project, Milestone, Priority, Estimate, Labels, or Due.

If Board is active and a newly added member is Backlog/Canceled, the Board may still not render that Issue. Trail does not auto-switch to List or show special `added but hidden` feedback; membership mutation does not rewrite presentation.

#### 5.9.8 Membership action grammar across Pages

Cycle membership is an explicit relationship action rather than an ordinary Issue property or single `cycleId` field.

When a Current Cycle exists:

```text
not a member
-> Add to current cycle

member
-> Remove from current cycle
```

Single-Issue actions live in normal Context Menu / Issue action surfaces. Current Cycle List/Board do not add permanent remove buttons to every Row/Card.

Selection/Bulk provides efficient multi-Issue membership mutation. Mixed Project Workspace selection may expose explicit subset actions such as `Add 2 to current cycle` and `Remove 1 from current cycle`; Trail does not use an ambiguous `Toggle cycle membership` action.

When no Current Cycle exists, `Add to current cycle` is absent rather than disabled and does not silently turn into Start Cycle.

Project Workspace keeps a compact Current Cycle membership marker in its Issue Row/Card. The marker may navigate to the Current Cycle Page, but clicking it does not remove membership.

Current Cycle itself does not repeat that marker because membership is Page scope.

Issue Full Item/Inspector may expose Current Cycle relationship as a dedicated relation/action area such as `Current cycle / Add` or `Aug 25 - Sep 7 / Remove`; it should not present Cycle as a normal single-value Issue property because an Issue may belong to multiple Historical Cycles plus at most one Current Cycle.

Closed Cycle membership is immutable through normal UI. Historical Cycle membership cannot be added/removed even though the member Issue itself may remain editable according to its current capabilities.

#### 5.9.9 No-current Cycles landing

When no Current Cycle exists, Sidebar `Cycles` opens a lightweight Cycles landing state rather than a fake `No Current Cycle` detail Page.

With prior history:

```text
Cycles                                              Start cycle
----------------------------------------------------------------

                         No current cycle


Previous                                             History

Aug 25 - Sep 7                                      12 issues
Aug 11 - Aug 24                                     10 issues
Jul 28 - Aug 10                                     16 issues
```

`Previous` shows only a small recent subset for convenience; exact visible row count is calibration. `History` opens the complete chronological history.

A Previous row is a compact date-range identity plus final membership count and navigates directly to that Historical Cycle. It does not require the user to visit History first.

For a Workspace that has never had a Cycle, the landing may use a restrained first-use empty state:

```text
Cycles                                              Start cycle
----------------------------------------------------------------

                         No current cycle

                  Start a cycle when you are
                    ready to plan focused work.

                         Start cycle
```

Once history exists, the Previous list itself supplies context and the large first-use explanation disappears.

Trail does not create future/upcoming Cycle objects merely to imitate Linear's Cycles overview.

#### 5.9.10 Start Cycle surface

Start Cycle is an explicit now-starting flow. It creates no future Cycle record before confirmation.

Representative shape:

```text
+------------------------------------------------------+
| Start cycle                                          |
|                                                      |
| Starts                                               |
| Today - Sep 3                                        |
|                                                      |
| Planned end                                          |
| Sep 16                                               |
|                                                      |
| ---------------------------------------------------- |
|                                                      |
| You can start empty and add issues later.            |
|                                                      |
| ---------------------------------------------------- |
|                              Cancel     Start cycle   |
+------------------------------------------------------+
```

Rules:

- `startedAt = now` when Start commits;
- planned end is explicitly shown and may be edited/confirmed before Start;
- starting empty is legal;
- Start does not create a future-started/future Cycle object;
- after Start succeeds, navigate directly to the new Current Cycle Page.

When relevant previous-Cycle context exists, the surface may additionally show preselected previous-currently-open members as described in Start-next below. Issue selection remains secondary to the Cycle date facts rather than turning Start Cycle into a giant Issue browser.

#### 5.9.11 Planned end and overdue presentation

Reaching planned end never auto-closes the Cycle.

Time context progresses quietly:

```text
10 days left
Ends today
1 day over
4 days over
```

The same time relation appears in the compact Main summary and Current Cycle Inspector. Trail does not add a large warning banner, forced modal, repeated nag, or automatic successor behavior merely because planned end passed.

#### 5.9.12 Close Cycle and Close and start next

`Close cycle` remains a low-frequency lifecycle action in Current Cycle Inspector.

Confirmation may summarize current membership and unresolved count:

```text
+------------------------------------------------------+
| Close cycle?                                         |
|                                                      |
| Aug 25 - Sep 7                                       |
|                                                      |
| 12 issues will remain associated with this cycle.    |
| 5 issues are still open.                             |
|                                                      |
| Closing does not change any Issue properties.        |
|                                                      |
|             Cancel   Close   Close and start next    |
+------------------------------------------------------+
```

Close semantics remain atomic:

```text
endedAt = now
keep final issueIds
change no Issue facts
Current Cycle = none
```

The confirmation does not become a retrospective checklist or per-Issue resolution wizard.

The drawing adds `Close and start next` as a convenience composition over the already-defined Close + Start-next semantics:

```text
Close
-> close Current Cycle
-> Cycles landing

Close and start next
-> close Current Cycle first
-> immediately open Start next Cycle surface
```

This is not automatic rollover and does not create a new compound Domain fact. The old Cycle is already Closed before the Start-next surface is shown.

If the user cancels Start-next after choosing `Close and start next`:

```text
old Cycle = Closed
new Cycle = not created
Current Cycle = none
```

Close is not rolled back.

#### 5.9.13 Start next Cycle preselection

Start next Cycle uses the previous Cycle's final membership only as discovery input.

Default preselection is:

```text
previous Cycle final membership
INTERSECT
members currently in non-terminal Status
```

With the canonical categories, this includes Backlog, Unstarted/Todo, and Started/In Progress members and excludes Completed/Canceled members.

Representative surface:

```text
+------------------------------------------------------+
| Start next cycle                                     |
|                                                      |
| Starts                                               |
| Today - Sep 3                                        |
|                                                      |
| Planned end                                          |
| Sep 16                                               |
|                                                      |
| ---------------------------------------------------- |
| From previous cycle                                  |
|                                                      |
| [x] Fix mutation race              Project Trail     |
| [x] Finish UI drawing               Project Trail     |
| [x] Prepare release notes          Project Notes     |
|                                                      |
| 3 unfinished issues from Aug 25 - Sep 7              |
|                                                      |
|                              Add other issues        |
|                                                      |
| ---------------------------------------------------- |
|                           Cancel    Start cycle       |
+------------------------------------------------------+
```

Candidate state is evaluated from current live Issue facts when Start-next opens. Trail does not persist an `unfinishedAtClose` snapshot.

Therefore an Issue completed after Close but before Start-next opens is not preselected; an earlier member reopened before Start-next opens may qualify again.

The user may deselect all previous candidates, add other Workflow Issues through the shared membership selector, start an empty Cycle, or cancel entirely.

#### 5.9.14 Close destination and actual close date

Plain Close lands on the no-current Cycles landing. The just-closed Cycle becomes the newest Previous item.

The Cycle retains both planned and actual close facts:

```text
startedAt   Aug 25
plannedEnd  Sep 7
endedAt     Sep 3
```

Historical detail therefore shows `Planned end` and `Closed` separately. A History/Previous row may show exceptional `Closed Sep 3` metadata when actual close differs meaningfully from the planned range, but normal rows stay compact and do not repeat redundant close data everywhere.

#### 5.9.15 History Page

History is a simple chronological browser, not an analytics dashboard.

```text
Cycles / History
----------------------------------------------------------------

Aug 25 - Sep 7                                      12 issues
Aug 11 - Aug 24                                     10 issues
Jul 28 - Aug 10                                     16 issues
Jul 14 - Jul 27                                      9 issues
...
```

Rules:

- newest Closed Cycle first;
- row identity is date range;
- quiet summary is final membership count;
- exceptional actual close date may appear when useful;
- no Board, Group, Display, generic Sort, KPI cards, or historical charts are added;
- selecting a row navigates to that Historical Cycle Page.

#### 5.9.16 Historical Cycle Page

Historical Cycle is passive final-membership history. It is List-only and intentionally flatter than Current Cycle.

Representative composition:

```text
Main View                                                   Right Sidebar

Cycles / History / Aug 11 - Aug 24                         Cycle Inspector
----------------------------------------------------------------  ----------------
12 issues   |   Effort 27                                       Cycle
                                                                    Aug 11 - Aug 24
Filter                                                            Scope
----------------------------------------------------------------    12 issues

[Priority] Fix mutation race                                      Effort
           Project Trail   In Progress   Milestone   M   Sep 08    27

[Priority] Finish UI drawing                                      Info
           Project Trail   Done          Milestone   S              Started      Aug 11
                                                                    Planned end  Aug 24
[Priority] Clean old notes                                         Closed       Aug 24
           Project Notes   Canceled                   S
```

Historical Cycle has no:

- List/Board switch;
- Status sections;
- Project swimlanes;
- Add issues;
- Remove from cycle;
- Close action;
- time-remaining/overdue context;
- emphasized Progress percentage.

The Historical Row is:

```text
[Selection] [Priority] Title   Project   Status   Milestone   Labels   Estimate   Due
```

Project and Status are ordinary Row metadata because Historical Cycle has neither Project grouping nor Status sections.

Historical Filter remains useful over current live fields:

```text
Status
Project
Priority
Milestone
Labels
Due
Estimate
```

There is no Display/generic Sort control.

#### 5.9.17 Historical membership vs live Issue facts

Historical Cycle freezes only final membership plus Cycle time facts.

Conceptually:

```text
final issueIds
-> resolve current Issue facts
-> Historical Cycle List
```

If a member later changes Status, Project, Estimate, Priority, Due, Labels, or Milestone, Historical Cycle displays those current values. It does not pretend to reconstruct close-time facts that were never stored.

Historical Cycle therefore must not present live recalculation as historical Progress. A reopened member must not make the UI imply that the Cycle originally closed at a lower completion percentage.

Historical Inspector is:

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

Effort is allowed as a current aggregate over final membership using current member Estimates and current configured weights. It is not labeled or treated as `Effort at close` and may change later.

Row activation still opens Peek and Full Item using current Issue capability. Historical Cycle does not make the Issue itself read-only; only Historical Cycle membership is immutable.

Project metadata/links resolve the member's current Project and navigate normally to that Project Workspace.

#### 5.9.18 Historical empty states

A Cycle may legally close with zero members.

True-empty Historical Cycle:

```text
Cycles / History / Aug 11 - Aug 24

0 issues
----------------------------------------------------------------


                    No issues in this cycle
```

No creation or membership CTA is shown.

Filtered-empty Historical Cycle uses:

```text
No issues match these filters
Clear filters
```

#### 5.9.19 Current and Historical Inspector variants

Cycle Inspector is one lifecycle-sensitive information surface rather than two unrelated designs.

Current:

```text
Cycle
Aug 25 - Sep 7
10 days left

Progress
----------------
[bar] 67%

Scope
12 issues

Effort
27

Info
Started      Aug 25
Ends         Sep 7

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

Open lifecycle adds time relation, live Progress, and Close action. Closed lifecycle adds actual close fact and removes time relation, Progress, and lifecycle mutation.

The Inspector remains an Obsidian Right Sidebar view and keeps the already-resolved entry-time capacity behavior rather than moving below Main View.

#### 5.9.20 Constrained Main View and shared boundaries

Current Cycle constrained behavior follows the already-accepted collection priorities:

- preserve current Cycle date-range identity and primary `Add issues` action;
- compress quiet summary/context before collection usability;
- List progressively reduces lower-priority metadata while preserving Title, Project context, and important exception signals;
- Board keeps minimum useful Status/Card width and uses horizontal scrolling rather than automatic List fallback;
- Project lane headers remain compact grouping rows and do not become cards;
- Inspector remains Right Sidebar content.

History/Historical Cycle remain simple Lists and do not acquire alternative layouts under constrained width.

Exact dimensions, row/card/lane heights, icon glyphs, collapse animation, modal widths, visible Previous-row count, and responsive breakpoints remain calibration details.

#### 5.9.21 Deferred/shared drawing boundary

Cycle family is closed at this drawing level.

Do not reopen Cycle locally for:

- exact Filter menu geometry;
- shared Selection/Bulk/Context Menu visuals;
- shared Peek/Full Item internals;
- exact Issue property picker mechanics;
- final icon/glyph selection;
- exact Cycle modal dimensions;
- Creation Composer geometry unrelated to membership selection.

The drawing intentionally supersedes older canonical UI assumptions where they conflict with the accepted Cycle family, including:

- Current Cycle `Display` as a permanent control;
- automatic same-Project clustering inside Current Cycle List;
- treating Cycle as a normal single-valued Issue property;
- any presentation implying close-time Issue Status/Project/Progress snapshots;
- requiring Close and Start-next to be separate visible steps when the UI can offer `Close and start next` as a convenience path while preserving the existing two-step semantics underneath.

### 5.10 Triage - closed

Triage is a personal intake/review queue, not a normal Workflow Issue workspace. Its composition is intentionally compact: the Page owns one readable queue, a sequential Review mode, direct review-priority controls, and a Page-level creation invocation without importing Workflow Status, Board, Project routing, or a Trail Inspector.

The central composition rule is:

```text
Triage Page
= compact Queue
+ Review Set awareness
+ direct Filter / Order controls
+ standard Triage creation invocation
+ page-local Review mode
```

Triage does not become a persisted `TriageItem` model, a Snooze inbox, a team-routing surface, or another general Issue workspace.

#### 5.10.1 Page identity, creation, and queue controls

Representative default composition:

```text
Triage                                                   +

10 to review

Filter                                Order: Review due v
----------------------------------------------------------------
[ ] [P1] Revisit export shape              ..             Today
[ ] [P2] Capture recruiting follow-up      .          Tomorrow
[ ] [--] Compare parser alternatives                    Sep 06
[ ] [P3] Investigate mobile note flow       ..          Sep 07
[ ] [P2] Re-read migration notes                        Sep 08
                  - review target ends -
[ ] [--] Consider archive behavior                      Sep 18
[ ] [P3] Explore another export format      .           Sep 22
```

Page rules:

- `Triage` is the Page title; this top-level Page has no breadcrumb.
- the compact header `+` is the stable Page-level creation affordance;
- activating `+` opens the **standard Triage Composer directly** with normal Triage defaults; it does not pass through title-first Quick Capture;
- Page drawing decides that this creation action exists, where it lives, what it creates, and its invocation context; the later Creation Surfaces pass decides Composer body geometry, focus, validation, keyboard behavior, and responsive layout;
- creating a new Triage entry is not a Review disposition. If Review is currently open, creation does not complete, advance, or exit the current Review identity;
- canceling the Composer creates nothing and returns to the same Page/Review context;
- the Page has no Trail Inspector and does not take over an unrelated Obsidian Right Sidebar view.

The permanent collection controls are:

```text
Filter
Order: Review due | Priority
```

`Order` is a direct control because Triage owns exactly two ordering choices. There is no generic `Display` shell, Group/Subgroup, generic Sort builder, Board, or Timeline.

The default order remains Review Due first, then Priority, then stable deterministic fallback. Choosing `Priority` changes presentation ordering only; it does not change Triage semantics or the derived Review Set.

#### 5.10.2 Triage Row and Review Set presentation

The compact Triage Row is:

```text
[Selection] [Priority] Title   Labels   Review Due
```

Information hierarchy:

- Title is the strongest scanning identity;
- selection stays in its own gutter rather than masquerading as completion Status;
- Priority is compact high-value review context;
- Labels stay low-noise and may use the same compact visual identity accepted elsewhere;
- Review Due stays in a stable right-aligned scanning position;
- Description/body is not normal List metadata and appears in Review;
- Status, Project, Milestone, Estimate, and Cycle are absent.

Rows remain compact and normally single-line. Activating the Row enters Review for that entry; Triage does not require a separate permanent `Start review` button merely to begin the same interaction.

The derived Review Set remains visible as quiet global context:

```text
10 to review
```

When the Queue is unfiltered and ordered by Review Due, the List may show one subtle boundary after the last current Review Set entry:

```text
                  - review target ends -
```

The rendered boundary should be much quieter than the ASCII representation. It is orientation, not a second collection section.

Filter behavior stays independent from Review Set derivation:

- Filter dimensions are Due, Priority, and Labels;
- Filter changes the visible Queue only and does not recompute Review Set membership;
- when Filter is active, do not show the unfiltered Review Set boundary as though it were a filtered boundary;
- when `Order: Priority` is active, the Review Set boundary also disappears because Review Set membership is no longer contiguous in the visible order;
- in either case, a retained global count should make its scope explicit, for example `10 to review overall`.

#### 5.10.3 Wide Review mode

On comfortable Main View width, Review is a Page-local split inside Triage rather than a Peek, modal, Right Sidebar takeover, or separate Trail location.

Representative composition:

```text
Triage                                                   +

10 to review

+----------------------------------+------------------------------------------+
| Filter       Order: Review due v | <-   ^   v                   3 / 14      |
|----------------------------------|------------------------------------------|
| [ ] [P1] Export shape      Today | Revisit export shape                     |
| [ ] [P2] Recruiting     Tomorrow |                                          |
|>[ ] [P2] Mobile flow      Sep 05 | [P2]   [Labels...]   [Due Sep 05]       |
| [ ] [--] Parser           Sep 06 |                                          |
| [ ] [P3] Migration        Sep 08 | Description                              |
|                                  |                                          |
|                                  | Compare the current mobile capture flow  |
|                                  | with the desktop interaction and decide  |
|                                  | what belongs in the normal path...       |
|                                  |                                          |
|                                  | [ Accept v ] [ Defer v ]   Delete   ...  |
+----------------------------------+------------------------------------------+
```

Composition rules:

- the left pane is the current compact Triage Queue, not a Sidebar;
- the current Queue Row is visibly selected/highlighted;
- the right pane is the Review Surface for that identity;
- the Review header owns only page-local exit/navigation/position controls;
- the Review content owns editable Title, Priority, Labels, Review Due, and Description/body;
- disposition actions form one low-noise action rail near the content end;
- Accept is primary, Defer is secondary, and Delete has lower visual weight;
- `...` remains the ordinary low-frequency context/action entry when needed;
- Review does not summon a persistent Inspector because the review content already owns the necessary Triage properties/body.

This wide composition is explicitly **not Peek**. Queue and Review are peer regions of the Triage Main View while Review mode is active.

#### 5.10.4 Review navigation, drafts, and progression

Review navigation is page-local:

```text
<-   ^   v            3 / 14
```

Meanings:

- `<-` exits Review and restores the full Triage List without leaving the Triage Page;
- `^` and `v` browse Previous/Next using the **current visible and ordered Queue**;
- these controls do not call host Back/Forward and do not create separate navigation-history locations;
- if the current identity falls out of the current Queue projection, adjacency is unavailable rather than inferred from a stale historical slot.

Ordinary edits do not complete Review:

- Title/Description/Priority/Labels/Review Due edits are not dispositions;
- uncommitted Title/Description text drafts are discarded when leaving the current Review identity or leaving the Page;
- Previous/Next, Review exit, or Page navigation must not become an implicit text-save mechanism.

Accept, Defer, and Delete are Review-completing dispositions. After one succeeds:

```text
record current visible slot
-> re-query current Queue
-> exclude just-completed identity from active progression when it still exists
-> select the entry now occupying that slot
-> if no successor exists, exit Review to the full List
```

The explicit exclusion matters for Defer: the same Triage entry may remain browseable after its Review Due changes, but successful Defer must not immediately select that just-deferred identity again merely because it still occupies a nearby position.

#### 5.10.5 Accept invocation boundary

Accept means formalize this intake. It does not patch the source Triage record in place into Workflow context.

Visible invocation boundary:

```text
[ Accept v ]
     |
     +-- Issue
     `-- Project
```

Choosing a target opens the corresponding **standard Creation Composer**:

```text
Accept -> Issue
       -> standard Issue Composer

Accept -> Project
       -> standard Project Composer
```

This drawing pass resolves only the invocation/action boundary. Composer body geometry remains for the shared Creation Surfaces pass.

Prefill/commit rules remain:

- Title and body are seeded from the Triage source;
- Triage Priority, Labels, and Review Due are not copied automatically;
- Issue creation still requires one explicit legal Project and follows ordinary Issue creation semantics;
- Project creation follows ordinary Project defaults/validation;
- canceling the target Composer leaves the Triage source unchanged and keeps Review on the same identity;
- after destination creation succeeds, source removal happens through the normal destination-first path, then shared Review-completion progression advances.

#### 5.10.6 Defer and Delete

Defer changes Review Due on the same Triage entry; it does not create a Snooze/Deferred lifecycle state and does not hide the entry from the Queue.

Visible interaction:

```text
[ Defer v ]
     |
     +-- +7 days
     +-- Tomorrow
     +-- This weekend
     +-- Next weekend
     +-- +1 month
     `-- Pick date...
```

Primary activation uses `+7 days`. The disclosure exposes the alternate normal targets. Calendar shortcuts resolve through the shared temporal/timezone policy.

After Defer succeeds, the entry reorders normally and shared progression advances to the successor rather than continuing to show the just-deferred entry. Because visibility is independent from Review Due, the deferred entry remains browseable and may still belong to the Review Set.

Delete is visibly lower-weight than Accept/Defer. It is available from Review and the ordinary `...`/right-click context menu, and uses Trail's shared destructive confirmation/recovery treatment rather than inventing Triage-only discard history.

#### 5.10.7 True and filtered empty states

True empty keeps the permanent Page-level creation action and adds one centered zero-state invocation of the **same** standard Triage creation intent:

```text
Triage                                                   +

Filter                                Order: Review due v
----------------------------------------------------------------


                         Triage is empty

                  Add something to review.

                       + Add to Triage
```

Rules:

- header `+` remains the stable creation affordance;
- `Add to Triage` is zero-state guidance and disappears after the first entry exists;
- both controls open the standard Triage Composer directly;
- this Page pass intentionally decides the creation invocation while leaving Composer internals to Creation Surfaces.

Filtered empty does not add a second creation CTA because the underlying Queue is not empty:

```text
Triage                                                   +

10 to review overall

Filter   [Priority: High] [Due: This week]
                                      Order: Review due v
----------------------------------------------------------------


                 No Triage entries match these filters

                           Clear filters
```

The Review Set boundary is absent in filtered empty. The global review count may remain only when clearly labeled as `overall`.

#### 5.10.8 Constrained Main View

Constrained List keeps the same Page/Row grammar and progressively reduces low-priority secondary metadata rather than converting rows into cards. Title and Review Due scanning remain strongest; Labels may reduce before Priority/Title/Due.

When Review is active and width cannot support a useful split, Main View switches fully to focused Review:

```text
Triage                                                   +

<-      ^   v                              3 / 14
------------------------------------------------------------

Revisit export shape

[P2]   [Labels...]   [Due Sep 05]


Description

Compare the current mobile capture flow with the
desktop interaction and decide what belongs in the
normal path...


[ Accept v ]    [ Defer v ]       Delete       ...
```

Rules:

- Queue, Filter, and Order are hidden while focused Review is active, but their Page/session state is preserved;
- `<-` restores the Triage List rather than invoking host Back;
- Previous/Next and position remain available;
- the stable Page `+` creation affordance remains available because creation is a Triage Page capability, not a Queue-only action;
- Review does not move into Right Sidebar and does not become a modal or Peek merely because width is constrained;
- exact action wrapping and minimum widths remain visual calibration details.

#### 5.10.9 Deferred/shared drawing boundary

Triage is closed at this drawing level.

Do not reopen Triage locally for:

- exact row height, padding, divider opacity, or icon glyphs;
- exact Review split ratio and responsive breakpoint;
- exact Filter/Order menu geometry;
- shared picker/calendar mechanics;
- shared destructive confirmation visuals;
- shared selection/bulk/context-menu visuals;
- exact Composer geometry, focus, validation, shortcuts, or responsive behavior after a creation invocation has opened the standard Composer.

The drawing intentionally supersedes older canonical UI composition that requires a generic Triage `Display` control. Triage instead exposes the two existing ordering choices directly through `Order: Review due | Priority` without introducing a generic view-builder shell.

### 5.11 Next drawing target

Continue with **Home**.

Home can now compose against closed Triage, Projects, Project Workspace, and Current Cycle presentation rather than guessing their final visual responsibilities. Draw Home's own summary hierarchy, creation invocations, empty/partial states, and constrained behavior without duplicating full child Pages or turning Home into a generic dashboard builder.


## 6. What existing documents mean during this drawing pass

Use existing documents with narrow responsibilities:

- `docs/product.md` defines Product capabilities/destinations and is not reopened by drawing.
- `docs/ui.md` supplies already-settled behavior/presentation constraints except where this workbench explicitly records a later accepted drawing decision to synchronize after the pass.
- `docs/domain.md`, `docs/data.md`, and `docs/architecture.md` supply semantics/technical constraints only when materially relevant to visible design.
- `docs/implementation.md`, source code, tests, and screenshots are implementation evidence and cannot force unfinished Page composition.
- `docs/design-to-code-map.md` is implementation traceability; existing file/component names do not force future component boundaries.

### 6.1 Known documentation drift to avoid during drawing

Canonical UI documentation still contains some older composition assumptions that this drawing pass has superseded and will synchronize later, including where applicable:

- Search/Capture composition in Navigation;
- Search modeled as a Page/location;
- Default Project ordering relative to `Projects`;
- a mandatory shared Location Bar/breadcrumb shell;
- Projects Root `Display` and older ordering language;
- Project Workspace `Display`;
- older Project Workspace Issue ordering based on Priority then Milestone/Label clustering;
- older assumptions that empty Status sections may disappear;
- any implication that Project Workspace Milestone needs its own Page or that compact Row/Card Milestone text itself is the quick-filter control.
- Current Cycle `Display` and same-Project List clustering;
- Cycle UI that exposes only separate Close/Start-next paths without the accepted `Close and start next` convenience;
- historical Cycle presentation that could be mistaken for a close-time Issue snapshot;
- Triage `Display` as a generic shell even though Triage owns only the direct Review Due/Priority ordering choices.

Accepted drawing state currently says:

- Search is temporary Left Sidebar mode;
- Capture is not a normal Sidebar row;
- normal Workspace order is `Projects`, `<Default Project>`, `Cycles`;
- breadcrumb composition is Page-owned;
- Projects Root uses Filter + List/Timeline with no Display/generic Sort;
- Initiative Focus is List-only with all scoped lifecycle states visible by default;
- Project Workspace uses Filter + fixed List/Board presentation with no Display;
- ordinary work collections may reuse Default Work Order while Pages still own scope/default Filter;
- Project Workspace uses persistent zero-count Status skeletons;
- Milestone is Project-local context managed/focused through Project Inspector + normal Filter, not a Milestone Page;
- Current Cycle is Project Workspace collection grammar plus Cycle scope and Project dimension, with no Display;
- Current Cycle List keeps Project as Row metadata and does not use hidden same-Project clustering;
- Current Cycle Board uses Project swimlanes with Project-group-header grammar while Project lanes are not Project drop targets;
- Cycle membership is an explicit relation action rather than a normal single-valued Issue property;
- `Close and start next` is a UI convenience over Close followed by Start-next, preserving close-first semantics and editable live preselection;
- Historical Cycles retain final membership/time facts while resolving current live Issue fields and do not present snapshot Progress;
- Triage uses Filter + direct `Order: Review due | Priority` with no Display, Board, or normal Workflow Status presentation;
- Triage Page keeps a stable `+` invocation of the standard Triage Composer, and true empty adds `Add to Triage` as guidance for the same invocation;
- Triage wide Review is a page-local Queue + Review split inside Main View, not Peek/Inspector/modal composition; constrained Review focuses the same Review Surface in Main View;
- Triage Review exit/Previous/Next are page-local, while successful Accept/Defer/Delete use re-query-and-successor progression rather than host history;
- Back / Forward remains host-owned.

Do not synchronize canonical documents piecemeal after every small drawing decision. Perform durable synchronization after enough Page coverage exists to avoid repeated churn.

## 7. Communication rule for drawing sessions

Prefer ordinary visual terms:

```text
Sidebar
Search mode
Back / Forward
Main View / canvas
Page
Inspector
Row
Card
List
Board
Filter
component
```

Do not introduce architectural vocabulary merely to describe a visible rectangle, row, title, control, list, chart, or panel.

When discussing a Page, stay on that Page. Do not pull later Pages, implementation ownership, component extraction, or Product-scope questions into the current drawing unless strictly necessary to understand what is visible.

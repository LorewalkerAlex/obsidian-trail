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

### 5.11 Home - closed

Home is Trail's visual-first global orientation and routing surface. It is not a reduced Issue collection, a generic dashboard builder, or a second analytics system. Its fixed modules compose existing Trail facts and route into existing Pages/flows without duplicating those working surfaces.

The accepted vertical order is:

```text
Home
-> This week
-> Lifecycle activity
-> Work trend + Weekly meeting notes
-> Work pulse
```

This ordering is semantic rather than a fixed CSS grid. Wide Main View may place Work Trend and Weekly Meeting Notes beside each other; constrained Main View reflows them vertically while preserving the same reading order.

#### 5.11.1 Page identity and shared creation

Representative Page header:

```text
Home                                                      +
```

Rules:

- `Home` is the top-level Page title and has no breadcrumb;
- Home has no Trail Inspector and does not replace unrelated Obsidian Right Sidebar views;
- the compact `+` is the already-frozen shared creation menu:

```text
+
|- Triage
|- Issue
|- Project
`- Initiative
```

Each item opens the corresponding **standard Creation Composer**. Home does not own a Home-specific creation form. Choosing Triage opens the full standard Triage Composer directly rather than passing through title-first Quick Capture.

Composer body geometry, focus, validation, keyboard behavior, and constrained composition remain for the dedicated Creation Surfaces pass.

#### 5.11.2 This week

`This week` is the first Home module because Home should establish immediate temporal orientation before retrospective analytics or current-system summaries.

Representative wide shape:

```text
This week
--------------------------------------------------------------------------------
              Mon 31   Tue 1   Wed 2   Thu 3   Fri 4   Sat 5   Sun 6
Triage          .        o       .      oo       .       .       .
Issues          o        .      oo       o      oo       .       .
                                           ^
                                         Today
```

The module uses the Workspace temporal policy and the existing Monday-to-Sunday week semantics. It distinguishes exactly the two already-frozen Due sources:

```text
Triage Review Due
Workflow Issue Due
```

Rules:

- Triage and Workflow Issue markers use the same generic temporal-marker geometry/mechanics but distinct source semantics;
- these markers do **not** reuse Label-specific components merely because both may be drawn as dots;
- a quiet Today identity anchors the current day without turning the strip into a calendar application;
- low counts may appear as individual dots; higher counts compress to a dot/count treatment rather than stacking without limit;
- the exact compression threshold is calibration, not Product state;
- hover/focus reveals the date plus the exact count for that source;
- default markers are informational and do not create a click-through query surface;
- Home does not invent a Workspace-wide Workflow Issue Page merely to support chart drill-down.

A week with nothing due remains a full temporal strip rather than a prose empty state:

```text
              M   T   W   T   F   S   S
Triage        .   .   .   .   .   .   .
Issues        .   .   .   .   .   .   .
```

The absence of Due work is itself the information.

#### 5.11.3 Lifecycle activity

Lifecycle Activity uses a **GitHub contribution-calendar-style layout** as its structural reference while remaining visually Trail.

Copy/adapt from the GitHub contribution graph:

```text
week columns
+ weekday rows
+ month labels
+ one cell per local calendar day
+ discrete intensity steps
+ hover/focus date and count detail
```

Do **not** copy GitHub's green palette, profile semantics, yearly scope, contribution rules, borders, or surrounding profile UI. Trail maps the calendar geometry into the established Linear-derived dark token system: Trail typography, surface/border treatment, spacing, focus treatment, and one Trail-compatible activity hue with intensity variation.

Representative shape:

```text
Lifecycle activity
--------------------------------------------------------------------------------
Jun                         Jul                         Aug                 Sep
. . : . . # . ...          . : : . # . . ...          . . # : ...        . : ...
. : . . # . . ...          : . . # . : . ...          . : . . ...        ...
...
```

The visible history window is fixed for V1 Home at:

```text
rolling 3 calendar months ending today
```

This is a calendar-month window in the configured Workspace timezone, not a hard-coded `90 days` duration. The left edge may use empty layout cells solely to align the first visible date into week-column geometry; those alignment cells do not encode data outside the three-month window.

Each day's intensity is still derived only from the already-frozen equal-weight lifecycle events:

```text
Workflow Issue createdAt
+ Workflow Issue firstStartedAt
+ Workflow Issue terminalAt
```

Rules:

- all three event kinds contribute equally to total daily density;
- one hue with discrete intensity levels represents the total rather than assigning a separate color to each lifecycle timestamp kind;
- hover/focus may disclose date plus Created/Started/Terminal counts and their total;
- clicking a heatmap cell has no V1 drill-down navigation semantic;
- an all-zero period remains the same empty-intensity grid rather than adding a large `No activity` message.

#### 5.11.4 Work trend

Work Trend shares the **same rolling three-calendar-month window** as Lifecycle Activity. Home does not define separate time horizons for the two historical modules.

Representative composition:

```text
Work trend
--------------------------------------------------------------
Backlog    -----------Active            -----\----------Completed        _|_|__|_|_||_|

                  trailing 3 months
```

The visual forms preserve the distinct semantics of the already-frozen series:

```text
Backlog stock   -> line
Active stock    -> line
Completed flow  -> day-local bars
```

Completed flow must not be rendered as a third cumulative-looking stock line.

Rules:

- lifecycle series colors/emphasis consume the existing Trail lifecycle semantic families instead of inventing chart-only concept colors;
- chart axes, text, hover/focus, and tooltip treatment consume shared chart/foundation tokens where possible;
- hover/focus reveals the date and exact Backlog/Active/Completed values;
- clicking the chart does not create a hidden global Issue-query destination;
- when no Workflow lifecycle history exists, retain the chart frame/legend and allow one quiet `No workflow history yet` message rather than fabricating values.

#### 5.11.5 Weekly Meeting Notes

Weekly Meeting Notes remains the existing `Current + Archive/History` utility inside Home. It does not become another Page, Domain entity, Inspector target, journal, or Full Item.

Default read state:

```text
Weekly meeting notes                           History

Current

- Release preparation
- Discuss parser cleanup
- Review next cycle

                                           Edit
                                 Archive / Next
```

Editing is module-local:

```text
Weekly meeting notes

Current

+---------------------------------------------+
| - Release preparation                       |
| - Discuss parser cleanup                    |
| - Review next cycle                         |
|                                             |
+---------------------------------------------+

                                  Cancel   Save
```

Rules:

- default Home state is read-oriented; an always-open textarea would over-weight this utility inside a visual-first Home;
- `Edit` enters an inline/module-local edit state;
- while editing, `Archive / Next` is hidden so an unfinished draft cannot acquire an ambiguous implicit-save/archive meaning;
- `Save` uses the existing Current replacement behavior; `Cancel` discards the local edit draft;
- `Archive / Next` uses the existing archive-current-and-clear-current behavior and is not a second history system;
- only Current is editable through the normal Home module.

Empty Current:

```text
Weekly meeting notes                           History


                  No current notes

                     Add notes
```

If no archive exists, omit `History`. `Archive / Next` is unavailable while Current is empty.

History is a module-local read sub-view, not a modal or new Trail location:

```text
Weekly meeting notes                         <- Current

History

Sep 1
Aug 25
Aug 18
Aug 11
```

Opening one archive entry replaces only the module body with read-only archived content and offers a local return to History/Current.

#### 5.11.6 Work pulse

Work Pulse is deliberately last. It acts as a compact routing/status dock after Home has already established near-term temporal context and recent work rhythm.

Wide composition:

```text
Work pulse

+-----------------------------+ +----------------------+ +------------------------------+
| Current cycle               | | Triage               | | In progress projects         |
| Aug 25 - Sep 7              | |                      | | 4                            |
| [=========-----]      67%   | | Overdue  3           | | [=======-]                   |
|                             | | Remain   11           | | [====----]                   |
|                             | | [===--------]         | | [======--]                   |
|                             | |                      | | [===-----]                   |
+-----------------------------+ +----------------------+ +------------------------------+
```

Work Pulse must not reproduce the working collections from Current Cycle, Triage, or Projects.

**Current Cycle**

With a Current Cycle:

```text
Current cycle
Aug 25 - Sep 7

[============------]    67%
```

Rules:

- period plus existing Cycle Progress are the default visible facts;
- activating the module routes to Current Cycle Page;
- Progress consumes the same shared Progress visual/semantic owner used by Project/Milestone/Cycle elsewhere, at a compact density;
- an empty effective denominator remains unavailable rather than being fabricated as `0%`/`100%`;
- a truly empty Cycle may show `0 issues` instead of a fake progress result;
- if members exist but all are excluded from the effective denominator, use `Progress -`/unavailable treatment.

With no Current Cycle:

```text
Current cycle

             Start cycle
```

`Start cycle` invokes the **same standard Start Cycle surface** already accepted in the Cycle drawing. Home does not redirect to a fake `No current cycle` detail Page and does not own a simplified Cycle form. Cancel returns to Home with no Cycle created; successful Start follows the normal Start Cycle destination behavior.

**Triage**

```text
Triage

Overdue   3
Remain   11

[===--------]
```

The bar is a segmented summary, not Progress. `Overdue` and `Remain` are mutually exclusive parts of active Triage and use the already-frozen Home meanings.

Rules:

- the mechanical segmented-bar responsibility should be shared with other compact mutually-exclusive summary bars such as Project Temporal Attention rather than creating a `HomeTriageBar`;
- Overdue consumes existing Due-overdue emphasis; Remain is neutral;
- activating the module routes to Triage Page;
- Home does not repeat `10 to review` Review Set presentation or Triage Rows;
- zero active Triage may show `0 active` plus an empty segmented track; it does not add another creation CTA because Home header `+` and the Triage Page already own creation affordances.

**In Progress Projects**

```text
In progress projects                                      4

[=======-]
[====----]
[======--]
[===-----]
```

Rules:

- include only Projects in the Started lifecycle category;
- every micro-bar is the existing Project Progress at a denser visual size, not a Home-specific progress model;
- hover/focus discloses Project title and exact Progress;
- activating a specific micro-bar routes to that Project Workspace;
- activating the module title routes to Projects Root;
- if more Projects exist than the module can usefully show, retain the existing stable Project ordering, show only the capacity-appropriate leading subset, and use a `+N more` route to Projects Root;
- do not introduce a hidden Home Health/focus/ranking score merely to choose which Projects appear;
- the exact number of visible micro-bars is width/visual calibration.

#### 5.11.7 Home visual reuse contract

Home is the strongest consumer so far of compact charts and micro-summaries, so this Page closes one explicit reuse rule:

```text
same semantic or same mechanical responsibility
-> reuse the existing canonical/shared owner
-> allow density / size / emphasis variants
-> do not create another visual language for Home
```

Concrete expectations:

- Current Cycle Progress -> shared Progress;
- Project micro Progress -> shared Progress;
- Triage Overdue/Remain -> shared segmented-summary mechanic plus existing Due-overdue semantic identity;
- Start Cycle -> shared button/presentation plus standard Start Cycle invocation;
- Weekly Notes editing -> shared content-edit/input/button mechanics;
- Work Trend lifecycle identities -> existing lifecycle semantic color families;
- tooltips/focus -> shared Tooltip/Popover/focus grammar;
- This Week Due markers -> shared generic marker geometry/tokens, but not Label-specific semantic components;
- Heatmap is a legitimate new visualization because no existing Trail component owns day-by-day activity density;
- Work Trend is a legitimate new visualization because no existing Trail component owns historical stock/flow charts, but it must still reuse shared chart/foundation tokens and interaction grammar.

Component extraction itself still waits for the shared-component pass after all Pages/Creation Surfaces; this rule prevents implementation from prematurely creating multiple Home-only representations for concepts Trail already renders elsewhere.

#### 5.11.8 Empty and partial-data behavior

Home is modular: one missing source does not replace the whole Page with a generic empty state.

Representative partial behavior:

```text
This week              -> always keeps the current-week strip
Lifecycle activity     -> always keeps the three-month grid
Work trend             -> chart frame + quiet no-history text when truly empty
Weekly meeting notes   -> local `No current notes` + Add notes
Current Cycle pulse    -> Start cycle when none exists
Triage pulse           -> 0 active when empty
In Progress Projects   -> 0 / empty micro-progress area when none exist
```

The Page-level `+` remains available in every state. Home does not add a giant first-run welcome/empty screen that hides the fixed modules.

#### 5.11.9 Constrained Main View

Constrained Home keeps the accepted semantic order and reflows rather than deleting modules:

```text
Home                                      +

This week
--------------------------------------------
       M   T   W   T   F   S   S
T      .   o   .  oo   .   .   .
I      o   .  oo   o  oo   .   .

Lifecycle activity
--------------------------------------------
[          3-month heatmap              ]

Work trend
--------------------------------------------
[               chart                   ]

Weekly meeting notes
--------------------------------------------
Current
...

Work pulse
--------------------------------------------
Current cycle
Aug 25 - Sep 7
[==========----] 67%

Triage
Overdue 3    Remain 11
[===---------]

In progress projects
[=======-]  [====----]
[======--]  [===-----]
```

Rules:

- Work Trend and Weekly Meeting Notes break from the wide side-by-side region into vertical order;
- Lifecycle Activity preserves the three-calendar-month semantic horizon and may reduce cell size/label density instead of silently shortening the data window;
- Work Trend keeps enough chart height to remain readable;
- Work Pulse modules stack vertically when needed;
- exact track counts, card borders/radius, chart heights, heatmap cell size, compression thresholds, and breakpoints remain calibration details.

#### 5.11.10 Deferred/shared drawing boundary

Home is closed at this drawing level.

Do not reopen Home locally for:

- exact module border/surface treatment or card radius;
- exact grid track count/spans/gaps;
- exact chart dimensions, stroke widths, heatmap cell size/gap, or intensity breakpoints;
- exact number of visible Project micro-bars before `+N more`;
- exact This Week dot-to-count compression threshold;
- tooltip geometry or animation;
- shared chart, marker, segmented-summary, Progress, button, or content-editing component APIs;
- Creation Composer internals reached from the Home `+` menu;
- Start Cycle surface internals already closed in the Cycle drawing.

Lifecycle Activity's **layout reference is GitHub's contribution calendar**, adapted into Trail's Linear-derived dark visual system. This reference is a presentation decision only; GitHub contribution semantics, yearly horizon, and green palette are not imported.

### 5.12 Creation Surfaces - closed

Creation is one shared transient drafting interaction with entity-specific fields, defaults, and legal context. It is not a family of unrelated Page-local forms, a persisted Draft system, a Trail navigation location, or a second mutation model.

The central composition rule is:

```text
shared Creation Composer
= transient overlay shell
+ light creation context
+ Title / body content center
+ compact existing property controls
+ restrained footer / Create action
+ shared focus, validation, dismiss, and responsive behavior
```

Triage, Workflow Issue, Project, and Initiative use this standard Composer composition. Milestone uses a smaller anchored quick-create composition because it is Project-local and has only Name, Due, and Description, while still reusing the same lower-level input, picker, button, focus, validation, and draft mechanics.

#### 5.12.1 Shared overlay and navigation boundary

A standard Creation Composer is a transient Obsidian-level overlay over the current working context:

```text
current Obsidian / Trail context
             |
             v
+--------------------------------------------------+
| light creation context                        x  |
|--------------------------------------------------|
|                                                  |
| Title                                            |
|                                                  |
| Description / body                               |
|                                                  |
| compact properties                               |
|                                                  |
|--------------------------------------------------|
|                              primary-mod + Enter |
|                                          Create  |
+--------------------------------------------------+
```

Rules:

- opening a Composer does not navigate, replace the current Trail Page, change the Trail Inspector target, or create a host Back/Forward history entry;
- the invoking Page/Obsidian surface remains the background context;
- normal successful creation closes the Composer and returns to the invoking context rather than automatically navigating to the newly created entity;
- cancel/dismiss creates nothing and returns to the invoking context;
- Triage Accept remains the already-accepted workflow-specific exception after target creation: successful target creation is followed by source removal and Triage Review progression rather than ordinary create-and-return;
- V1 has no saved Draft entity, Create-more mode, or unfinished-composer persistence.

The overlay uses the established Trail/Linear-derived modal/surface, elevation, focus, button, and property-control grammar. Creation does not introduce another visual system merely because it is global enough to open over non-Trail Obsidian content.

#### 5.12.2 Shared content hierarchy and property layout

The common hierarchy is intentionally content-first:

```text
light context
-> Title
-> Description / body
-> compact property controls
-> footer / Create
```

Do not render standard creation as a tall label-and-input settings form. Title is the strongest editable identity; Description/body is the secondary content region; properties use the same compact semantic identities and picker mechanics accepted elsewhere.

Representative standard shape:

```text
+----------------------------------------------------------+
| Issue · Project Trail v                               x  |
|----------------------------------------------------------|
|                                                          |
| Fix parser edge case                                     |
|                                                          |
| Add description...                                       |
|                                                          |
|                                                          |
| [Priority] [Labels] [Milestone] [Estimate] [Due]         |
|                                                          |
|----------------------------------------------------------|
|                                      Ctrl/Cmd+Enter Create|
+----------------------------------------------------------+
```

Exact modal width/height, title/body line counts, property-chip spacing, footer hint text, and overlay animation remain full-shell calibration.

#### 5.12.3 Dismiss and discard contract

The close button, `Esc`, and backdrop click are three presentations of the **same dismiss intent**:

```text
x
Esc
click backdrop
      |
      v
attempt dismiss
      |
      +-- no meaningful user draft changes
      |      -> close immediately
      |
      `-- meaningful user draft changes
             -> Discard changes?
                  Cancel
                  Discard
```

Dirty-state rules:

- system/context prefill present when the invocation opens does not by itself count as a user modification;
- changing Title, body, structural relation, or any editable property does count;
- returning the draft exactly to its invocation baseline clears dirty state when there is no remaining user-authored difference;
- opening/closing a picker without changing its value does not make the Composer dirty;
- discard confirmation is shared Composer behavior rather than separate Triage/Issue/Project/Initiative confirmation logic.

Quick Capture carries its user-authored dirty state into the full Triage Composer. The title typed in Quick Capture remains user draft content after expansion and therefore still requires discard confirmation if the user then dismisses without creating. Expansion must not reclassify that title as harmless system prefill.

`Cancel` on the discard confirmation returns to the still-open Composer with its draft intact. `Discard` closes the full creation flow and creates nothing.

#### 5.12.4 Focus, keyboard, validation, and failure feedback

Initial focus follows structural readiness:

```text
required structural input unresolved?
|- yes -> focus the required input
`- no  -> focus Title
```

For example, context-neutral Issue creation may prefill a legal Default Project and focus Title. If no legal Project prefill exists, Project selection receives initial focus because Workflow Issue creation cannot succeed without one explicit legal Project.

Keyboard behavior:

- standard Composer uses the platform primary modifier + `Enter` for Create (`Ctrl+Enter` / `Cmd+Enter`);
- ordinary `Enter` inside the full Composer does not become a global submit gesture;
- exact visible shortcut hint and focus-ring calibration are deferred, but the semantic shortcut is shared across standard Composers;
- `Esc` follows the shared dismiss/discard rule above.

Validation remains low-noise:

```text
empty/invalid required input
-> Create unavailable or submit rejected locally
-> focus the concrete missing/invalid control
-> concise local explanation
```

Do not paint every empty required field as an error immediately on open. Invalid-target explanations belong beside the relevant structural/property control; generic persistence/runtime failures remain in the Composer and preserve the draft.

Representative persistence failure:

```text
--------------------------------------------------
Could not create. Your changes are still here.

                                      Create / Retry
```

A failed Create does not close the overlay, clear the user's draft, or silently fall back to another target.

#### 5.12.5 Capability gating and legal target selection

Creation affordances are removed or explained before the user completes an impossible form:

- Completed/Canceled Project Workspace does not expose an active Project-local Create Issue action;
- relation pickers present legal normal targets and may retain an unavailable target only when the explanation materially helps the user understand why it cannot be chosen;
- an illegal current Default Project is treated as **no Issue Project prefill**, never as hidden permission to create there;
- Application/Domain still enforce legality at submit; UI capability presentation is not the only guard.

Invocation context supplies initial UI state only. It never changes canonical creation semantics.

#### 5.12.6 Standard Triage Composer

Representative shape:

```text
+--------------------------------------------------+
| Triage                                        x  |
|--------------------------------------------------|
|                                                  |
| Something to review                              |
|                                                  |
| Add description...                               |
|                                                  |
|                                                  |
| [Priority]        [Labels]        [Due Sep 10]   |
|                                                  |
|--------------------------------------------------|
|                                      Create      |
+--------------------------------------------------+
```

Field contract:

```text
Title                 required
Description / body    optional
Priority              optional
Labels                optional
Due                    required review Due
```

Rules:

- `Due` means Triage Review Due by context and does not need a redundant `Review Due` label;
- the normal temporal policy supplies the visible default Due before Create;
- Priority and Labels are optional;
- no Workflow Status, Project, Milestone, Estimate, or Cycle control appears;
- direct invocation from Triage Page, Triage true-empty CTA, or Home opens this full Composer immediately.

#### 5.12.7 Quick Capture -> standard Triage Composer

Quick Capture is an Obsidian-wide **command / global-hotkey** entry into standard Triage creation. It is not Trail navigation and does not reintroduce a `Capture` row/action into the already-closed normal Trail Sidebar composition.

Initial title-first surface:

```text
+------------------------------------------+
| Capture to Triage                        |
|                                          |
| [ Something to review...               ] |
|                                          |
| Esc                                Enter |
+------------------------------------------+
```

The Title input receives focus immediately.

Interaction:

```text
type Title
-> Enter
-> expand to the standard Triage Composer
   -> Title preserved
   -> normal Due default already present
   -> ordinary Triage properties available
-> normal Composer interaction
-> Create
```

The first `Enter` does **not** create a Triage entry. Once the full Composer is open, Quick Capture has ended: ordinary Enter is not a special submit rule, and the standard Composer focus/dismiss/validation contract applies.

Quick Capture itself also uses the shared dismiss semantics: an untouched capture closes immediately on `Esc`/backdrop; a typed title requires discard confirmation. The typed-title dirty state survives expansion as defined above.

#### 5.12.8 Standard Workflow Issue Composer

Representative shape:

```text
+----------------------------------------------------------+
| Issue · Project Trail v                               x  |
|----------------------------------------------------------|
|                                                          |
| Fix parser edge case                                     |
|                                                          |
| Add description...                                       |
|                                                          |
|                                                          |
| [Priority] [Labels] [Milestone] [Estimate] [Due]         |
|                                                          |
|----------------------------------------------------------|
|                                      Create              |
+----------------------------------------------------------+
```

`Project` is a required structural relation and therefore belongs in the light header rather than being demoted to an optional property chip.

Rules:

- invocation context may prefill Project, but the final selected legal Project remains visible and editable before Create;
- context-neutral creation uses the current Default Project only when that Project is a legal target;
- changing Project clears any selected Milestone that is not legal in the new Project;
- Milestone candidates are scoped to the selected Project;
- Priority, Labels, Milestone, Estimate, and Due remain ordinary optional properties;
- Status is absent: every new Workflow Issue uses the configured Backlog default regardless of which Page or visual Status region invoked creation;
- Cycle is absent: Current Cycle membership remains an explicit relationship action, not a single-value Issue creation property.

Invocation examples:

```text
Project Workspace +
-> current Project prefilled

Home + -> Issue
-> legal Default Project may prefill

Triage Accept -> Issue
-> source Title/body seeded
-> legal Default Project may prefill
-> Triage Priority/Labels/Due do not copy automatically
```

#### 5.12.9 Standard Project Composer

Representative shape:

```text
+--------------------------------------------------+
| Project                                       x  |
|--------------------------------------------------|
|                                                  |
| Project title                                    |
|                                                  |
| Add description...                               |
|                                                  |
|                                                  |
| [Initiative] [Priority] [Labels] [Due]           |
|                                                  |
|--------------------------------------------------|
|                                      Create      |
+--------------------------------------------------+
```

Rules:

- Initiative is an optional relation and remains an ordinary editable property;
- Project Status is absent: normal Create uses the configured Unstarted-category default and lifecycle advancement happens later through normal Status interaction;
- Projects Root invocation starts with Initiative unset;
- Initiative Focus invocation prefills the current Initiative while leaving it editable;
- Triage Accept -> Project seeds only source Title/body and follows ordinary Project defaults/validation;
- Home invokes the same context-neutral Project Composer.

#### 5.12.10 Standard Initiative Composer

Representative shape:

```text
+--------------------------------------------------+
| Initiative                                    x  |
|--------------------------------------------------|
|                                                  |
| Initiative title                                 |
|                                                  |
| Add description...                               |
|                                                  |
|                                                  |
| [Priority]        [Labels]        [Due]           |
|                                                  |
|--------------------------------------------------|
|                                      Create      |
+--------------------------------------------------+
```

Initiative has no Workflow Status and therefore no Status control. Project membership is not required during Initiative creation; Projects associate through their normal optional Initiative relation afterward.

Projects Root may expose Initiative creation through its already-resolved secondary action context, and Home may invoke it through the shared `+` menu. Both reach this same Composer.

#### 5.12.11 Milestone quick-create

Milestone remains a Project-local checkpoint rather than a Page or full standard Composer consumer.

When owning Project capability allows Milestone planning, the Project Inspector Milestones section may expose its compact `+` and open an anchored quick-create surface:

```text
Milestones                                  +
                                              \
                                               +------------------------------+
                                               | New milestone                |
                                               |------------------------------|
                                               | Name                         |
                                               | [ Foundation               ] |
                                               |                              |
                                               | [Due]                        |
                                               |                              |
                                               | Description                  |
                                               | [ ...                      ] |
                                               |                              |
                                               |             Cancel   Create  |
                                               +------------------------------+
```

Field contract:

```text
Name / title          required
Due                   optional
Description           optional
Owning Project        implicit and fixed
```

Rules:

- no Project picker appears because Milestone cannot be reparented and owning Project is supplied by Inspector context;
- no Status, Priority, Labels, Estimate, or Cycle controls appear because Milestone does not own those facts;
- the quick-create surface reuses shared input, body-edit, Due picker, Button, focus, validation, and dismiss mechanics;
- its smaller anchored geometry is a legitimate composition difference, not a second creation framework;
- if Project capability does not allow Milestone creation, the active `+` is absent/unavailable according to the shared capability treatment.

#### 5.12.12 Responsive property access

Constrained panes do not get a second simplified creation form.

Normal width keeps the Composer's resolved property controls directly accessible:

```text
[Priority] [Labels] [Milestone] [Estimate] [Due]
```

As usable width shrinks, lower-priority optional properties may overflow through the shared compact-property mechanism, for example:

```text
[Priority] [Due] [More 3]
```

`More` contains the same property controls and values; it is not another property model.

Responsive priorities:

- required structural context never disappears into a deep overflow; Issue Project remains visible;
- Triage required Due remains directly understandable/reachable;
- Title/body remain the content center;
- optional properties may overflow before the Composer becomes unusably narrow;
- exact property overflow order, minimum width, modal dimensions, and whether a footer shortcut hint remains visible are calibration details.

#### 5.12.13 Invocation matrix and post-create behavior

The accepted creation entry graph is:

| Invocation | Surface | Initial context/prefill | Success |
|---|---|---|---|
| Obsidian command / global Quick Capture shortcut | title-first Quick Capture -> Triage Composer | typed Title + normal Triage Due | close and return to invoking context |
| Triage header `+` | Triage Composer | normal Triage Due | close and return to Triage |
| Triage true-empty CTA | Triage Composer | normal Triage Due | close and return to Triage |
| Home `+ -> Triage` | Triage Composer | normal Triage Due | close and return to Home |
| Home `+ -> Issue` | Issue Composer | legal Default Project when available | close and return to Home |
| Home `+ -> Project` | Project Composer | none | close and return to Home |
| Home `+ -> Initiative` | Initiative Composer | none | close and return to Home |
| Project Workspace `+` | Issue Composer | current legal Project | close and return to Project Workspace |
| Projects Root `+` | Project Composer | none | close and return to Projects Root |
| Initiative Focus `+` | Project Composer | current Initiative | close and return to Initiative Focus |
| Triage Accept -> Issue | Issue Composer | source Title/body + legal Default Project when available | destination-first Accept then Review progression |
| Triage Accept -> Project | Project Composer | source Title/body | destination-first Accept then Review progression |
| Project Inspector Milestones `+` | Milestone quick-create | owning Project implicit | close quick-create; Inspector/Page context remains |

Normal creation success does not automatically open Full Item or navigate to the new Project/Initiative. Navigation remains an explicit later user action rather than an implicit creation side effect.

#### 5.12.14 Deferred/shared drawing boundary

Creation Surfaces are closed at this drawing level.

Do not reopen entity-specific creation locally for:

- exact modal/popover pixel dimensions, radius, padding, shadow, or animation;
- exact Title/body input heights or Markdown editing affordances already owned by shared content-editing interaction;
- exact property-chip wrap/overflow threshold or `More` geometry;
- exact picker/menu/calendar geometry;
- exact shortcut-hint typography or platform-label rendering;
- exact validation iconography and feedback animation;
- exact focus-ring color/offset;
- lower-level shared Button/Input/Textarea/PropertyControl APIs;
- saved Drafts, Create-more, or other deferred creation features not in V1.

The key durable drawing decisions are one standard transient Composer family, one shared dismiss/dirty contract, one shared focus/validation/keyboard contract, entity-specific field registries and legal context, Quick Capture as title-first command/hotkey entry into standard Triage creation, and a smaller Project-local Milestone quick-create composition.

### 5.13 Shared Interactions - closed

Cross-page comparison exposed a small set of repeated interaction responsibilities that must close once before shared-component extraction. These rules do not create another Page, workflow, or generic universal component. They define how existing Page-local actions compose when they use the same transient interaction mechanics.

The shared rule is:

```text
same action semantic
-> one Action Registry authority

same transient interaction mechanic
-> one focus / dismissal / layering grammar

same visual resemblance only
-> keep workflow composition separate
-> reuse lower-level mechanics instead
```

#### 5.13.1 Transient interaction stack and focus ownership

Menus, pickers, popovers, Peek, Composers/workflow modals, and confirmations may nest. Dismissal always belongs to the **topmost active interaction layer** rather than leaking through to its parent.

Representative stack:

```text
Page
`- Creation Composer
   `- Labels Picker
```

`Esc` behavior is:

```text
Esc
-> dismiss topmost active layer only
-> restore focus to that layer's trigger/parent when still present
-> never also dismiss the parent in the same key action
```

For example:

```text
Composer + Labels Picker
Esc #1 -> close Labels Picker; Composer remains
Esc #2 -> attempt Composer dismiss; shared dirty/discard contract applies
```

Likewise:

```text
Peek + Context Menu
Esc #1 -> close Context Menu; Peek remains
Esc #2 -> close Peek
```

When no higher transient layer is open, `Esc` may clear the current collection selection according to Section 5.13.3. Tooltip-only hover/focus detail is not a stack layer and does not consume `Esc`.

Outside-click/backdrop behavior is owner-specific:

- ordinary Menu/Picker/Popover outside click closes only that transient child;
- Creation Composer backdrop click is the already-closed Composer dismiss intent and therefore follows dirty/discard rules;
- confirmation backdrop click means Cancel and never confirms a destructive/lifecycle action;
- Peek has no modal backdrop: unrelated Page interaction closes it, while ordinary activation of another eligible Issue retargets the same Peek surface;
- closing a child interaction restores focus to its trigger when that trigger still exists;
- closing a top-level transient surface restores focus to the invoking Page/collection context when practical.

Host Back/Forward never becomes a transient-surface close mechanism. If the user actually navigates through host history, the previous Page's transient stack is discarded as that Page leaves; Peek/Menu/Picker/Composer states do not become history nodes.

#### 5.13.2 Action Registry, Context Menu, and overflow

Context Menu, `...` overflow, Command Menu, Bulk action surfaces, and keyboard shortcuts are presentations over one shared **Action Registry** authority. They may show different useful subsets, but an Action ID, capability rule, legal-target rule, and Application intent do not change by entry point.

Context Menu uses the mature host Menu mechanic where practical and consumes Trail's shared Linear-derived menu presentation contract. It does not justify a second custom menu engine.

Context Menu ordering follows responsibility groups when those groups exist:

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

Empty groups disappear. `Delete` or equivalent destructive actions remain last and visually separated from ordinary mutation.

Target presentation follows target-set shape rather than forcing every action into nested native menus:

```text
small fixed target set
-> direct Menu/Submenu where useful

large or searchable relation target set
-> close Context Menu
-> open the shared searchable Picker for that target family
```

For example Status/Priority/Estimate may fit a direct menu-like selector, while Project/large Milestone/Label target sets use their searchable picker mechanics.

Action availability presentation is:

```text
action irrelevant to this entity/context
-> absent

action temporarily unavailable
+ explanation/recovery materially helps
-> disabled/unavailable + concise reason
```

Do not fill menus with disabled actions that do not belong to the current entity at all.

Context resolution preserves the already-accepted selection semantics:

```text
right-click selected item
-> current relevant selection is action scope

right-click unselected item
-> explicitly invoked item is action scope
-> unrelated stale selection is not action scope
```

Right-clicking an unselected item does **not** silently clear a different retained selection merely to execute this one menu. The menu establishes action scope; selection state remains a separate collection interaction. When a multi-selection is the scope, the menu may show one quiet count/identity summary so the user can see that the action applies to multiple items.

An explicit entity-local action affordance inside another surface, such as Peek `...`, scopes actions to that explicit entity rather than silently inheriting an unrelated background multi-selection.

#### 5.13.3 Selection and Bulk surface

Selection is collection-local transient UI state. Highlight/focus, ordinary activation, and selection remain separate intents.

A shared floating Bulk surface appears once for the collection while one or more items are selected:

```text
                       collection

------------------------------------------------------------

       +----------------------------------------------+
       | 3 selected   [common actions]      ...   x  |
       +----------------------------------------------+
```

List, Board, Triage, and other supported selectable collections consume the same collection-level interaction. Board does not create a separate Bulk bar per Status column or Project swimlane.

The Bulk surface owns:

- visible selection count;
- a small set of useful common actions;
- `...`/Command access to additional legal common actions;
- an explicit clear-selection control.

Bulk legality remains the already-frozen intersection rule:

```text
same action
+ same target
+ every selected item can legally accept it
```

Selection scope is always bounded by the current visible actionable collection projection:

```text
selection
= selected identities
  intersect
  current visible actionable projection
```

Consequences:

- applying a Filter that hides a selected item removes that item from selection;
- collapsing/grouping presentation that makes a selected item non-visible removes it from active selection rather than retaining an invisible action target;
- switching List -> Board retains only selected Issues still visible/actionable in Board; Backlog/Canceled items that are not Board members leave selection;
- sorting/reordering visible items does not clear identities that remain visible;
- navigating to another Trail location clears the collection selection rather than carrying it into another Page.

When no higher transient layer is open, `Esc` may clear the current selection. Exact toggle/range/select-all key bindings remain Obsidian/implementation-time shortcut calibration; the underlying selection semantics do not depend on one literal Linear keymap.

#### 5.13.4 Peek

Peek is a shared Workflow Issue **inspection** surface for Issue collections. It does not expand to Project rows merely because another product may Peek other entity types, and it does not replace the already-closed Projects Root/Initiative navigation behavior.

Its role remains:

```text
Row / Card
-> scan

Peek
-> inspect hidden Issue detail without navigation

Full Item
-> deep editing
```

Opening rules:

- ordinary activation of an eligible Workflow Issue Row/Card opens Peek;
- selection controls and inline property/action controls do not also open Peek;
- keyboard-focused/highlighted eligible Issue may toggle Peek with the shared preview shortcut during host calibration; `Space` is the primary Linear reference where it does not conflict with host/editor focus;
- opening Peek does not create host history, change Trail location, or change persistent Inspector target.

Wide Main View uses a floating right-side surface **inside Main View**, over the current collection rather than as an Obsidian Right Sidebar replacement or a permanent split:

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

Constrained Main View keeps the same transient responsibility but uses a near-full-width Main View floating surface. It does not become a bottom sheet, a Page location, or Right Sidebar content.

Peek content is read-oriented in V1:

- Title and body are read-only in Peek;
- structured properties are inspectable but are not directly edited inside Peek;
- entity actions such as Status/Priority change, Move, Cycle membership, or Delete use Peek's explicit `...`/shared Action Registry entry;
- deep content/property work uses `Open full item` and normal Issue Full Item + Inspector composition.

This keeps Row/Card inline property interactions, Peek inspection, and Full Item editing as separate depths rather than turning Peek into a second editor.

Retargeting uses the current visible and ordered Issue collection:

```text
Peek = Issue A
ordinary activate Issue B
-> same Peek surface retargets to B
-> no close/open navigation cycle
-> no host-history entry
```

Adjacent keyboard browsing uses that same current visible/ordered collection. If the current Peek target disappears from the projection because of Filter or successful mutation, Peek closes rather than inferring a successor from a stale slot. Triage Review's success-progression algorithm remains Triage-specific and is not reused by Peek.

Interaction with background UI:

- clicking unrelated Page chrome/content closes Peek and performs that Page interaction;
- ordinary activation of another eligible Issue retargets Peek;
- activating an inline control on another background row performs that explicit control interaction rather than retargeting; Peek closes before/with the unrelated control interaction;
- opening Peek does not select its Issue;
- opening/clearing selection does not automatically open/close Peek unless a selected/filtered state removes the current target from the visible projection;
- Peek `...` actions scope to the Peek target only, even if the background collection retains a different multi-selection.

#### 5.13.5 Picker / Popover family

Property and relation controls share mature picker mechanics without collapsing every semantic control into one `UniversalPicker` component.

The interaction families are:

```text
small fixed single-select
-> Select / Menu-like picker
-> Status, Priority, Estimate

large relation single-select
-> searchable Picker
-> Project, Initiative, Milestone when the target set can grow

multi-select
-> searchable multi Picker
-> Labels

temporal
-> date/calendar Picker
-> Due
```

They share only mechanical responsibilities:

- anchored surface/elevation and viewport collision behavior;
- keyboard traversal and selected/check grammar;
- search-field grammar where search is useful;
- empty-search result treatment;
- focus restoration to the trigger on close;
- top-layer `Esc` / outside-click dismissal;
- capability-aware legal/unavailable target presentation.

Single-select generally applies the chosen value to the owning surface state and closes. Multi-select applies each toggle immediately to the owning surface state and normally remains open until dismissed; it has no extra Save/Done step. "Apply" here means updating the current owner (for example a Composer draft, Filter state, or normal mutation flow), not bypassing that owner's existing persistence/validation contract.

Activating a Row/Card property control is an explicit property interaction. It opens the appropriate picker and must not also trigger the Row/Card's ordinary Peek/navigation activation.

#### 5.13.6 Shared confirmation mechanics

Delete, draft discard, lifecycle confirmation, and other guarded actions may reuse one confirmation foundation while keeping their business consequences and semantic emphasis distinct.

Shared mechanics are:

```text
confirmation opens
-> focus a safe action / Cancel path by default

Esc
-> Cancel

backdrop click
-> Cancel

explicit confirm action
-> perform the guarded intent
```

Opening a confirmation must not make a held/repeated `Enter` immediately confirm a destructive action. Destructive Delete uses the shared danger treatment; lifecycle actions such as Close Cycle need not be painted as destructive merely because they require confirmation. `Discard changes` is destructive to transient draft state but is not a Domain Delete action.

Confirmation copy states concrete consequences instead of generic dramatic wording. Recovery/Undo claims appear only when Trail actually owns the corresponding recovery capability.

Complex guarded workflows remain compositional. For example Project Delete may require a legal child-Issue destination picker and concrete consequence counts; this reuses confirmation + picker mechanics rather than being reduced to a one-line universal `Are you sure?` dialog. If a Picker opens inside a confirmation, the picker is the top interaction layer: first `Esc` closes the Picker, the next `Esc` cancels the confirmation.

#### 5.13.7 Contextual Command Menu and Obsidian commands

Trail distinguishes host/global commands from the contextual Action Registry presentation:

```text
Obsidian Command Palette / registered plugin commands
-> host/global intents
-> open Trail, Quick Capture, global navigation/utility commands where useful

Trail contextual Command Menu
-> current Trail entity / selection / location actions
-> shared Action Registry
```

The contextual Command Menu is searchable action presentation, not Search navigation and not another action authority. It may expose a broader useful action subset than the compact Context Menu while retaining the same Action IDs, capability rules, legal targets, and execution semantics.

Invocation context resolves action scope the same way as other explicit action entry points. A collection invocation may use current selection; an explicit Peek/entity invocation scopes to that explicit entity. Exact shortcut binding (for example whether a Linear-like primary-modifier shortcut is appropriate) remains Obsidian/editor conflict calibration rather than Product semantics.

#### 5.13.8 Sidebar Search boundary

The closed Sidebar Search mode is navigation-only in V1. Older canonical assumptions from a Main-View Search Page must not leak Peek into unrelated current Main View content.

```text
Sidebar Search
-> type/query
-> highlight result
-> click/Enter
-> navigate(result.location)
-> Search closes
```

Search results do not open Peek while Search remains in the Left Sidebar. This avoids presenting, for example, a Project/Issue Peek over an unrelated Triage/Home Main View merely because the user highlighted a Sidebar result. Search still uses keyboard-first result traversal and ordinary navigation activation.

#### 5.13.9 Deferred/shared interaction boundary

Shared Interactions are closed at this drawing level.

Do not reopen these rules merely for:

- exact Menu/Picker/Popover/Peek/Confirmation pixel dimensions, shadows, radius, padding, or animation;
- exact menu/submenu maximum heights, collision offsets, or scroll indicators;
- exact Bulk bar position offsets, action count before overflow, or transition animation;
- exact Peek width, breakpoint, hover/focus delay, or preview shortcut when host/editor focus requires a different safe binding;
- exact picker search threshold or which fixed enum uses Select versus Menu internally when observable behavior remains equivalent;
- exact Contextual Command Menu shortcut;
- exact focus-ring visual calibration;
- lower-level Radix/Obsidian primitive selection where multiple mature mechanics can satisfy the same visible contract.

The durable interaction decisions are one top-layer dismissal/focus stack, one Action Registry authority, one collection selection/Bulk grammar, read-oriented Workflow Issue Peek with current-projection retargeting, a picker family sharing mechanics rather than semantics, safe shared confirmation mechanics, and a contextual Command Menu distinct from Obsidian's global command surface and Sidebar Search.

### 5.14 Next drawing target

All major Page, Creation Surface, and shared-interaction semantics are now covered at the drawing level. Continue with the **final owner -> consumer shared-component extraction matrix**:

1. enumerate repeated responsibilities from the accepted drawings;
2. map each responsibility to its consumers and existing implementation owner where one already exists;
3. decide whether the final owner belongs to foundation, primitive, pattern, semantic/entity UI, interaction, shell, or Page-local composition;
4. explicitly record responsibilities that must **not** be universalized despite visual similarity;
5. identify stale implementation contracts such as mandatory global Location Bar or `Display`-required View Bar without letting current code override the accepted drawing;
6. freeze the shared vocabulary;
7. generate the one-time `docs/ui-blueprints.md` synthesis only after that matrix is stable;
8. then synchronize durable accepted decisions into canonical UI/implementation documentation and retire this temporary workbench.

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
- Home reads top-to-bottom as This week -> Lifecycle activity -> Work trend + Weekly meeting notes -> Work pulse, with Work Pulse last rather than as a top KPI banner;
- Home Lifecycle Activity uses GitHub contribution-calendar geometry as the layout reference while retaining Trail/Linear-derived dark visual tokens, and both Lifecycle Activity and Work Trend show a rolling three-calendar-month window ending today;
- Home reuses existing visual semantics/mechanics for Progress, lifecycle identity, Due-overdue emphasis, buttons, tooltips/focus, and content editing; density variants do not justify Home-specific duplicate components;
- Home with no Current Cycle exposes `Start cycle` and invokes the already-accepted standard Start Cycle surface directly;
- Home modules remain independent under partial data and constrained width; constrained composition reflows without hiding fixed V1 modules or shortening the three-month historical horizon;
- Creation uses one shared transient Composer family for Triage, Workflow Issue, Project, and Initiative; opening/dismissing/creating does not create a Trail navigation location or host-history node;
- standard Composer `x`, `Esc`, and backdrop click share one dismiss intent: unchanged/system-prefilled drafts close directly, while meaningful user changes require `Discard changes?`; Quick Capture user-authored Title remains dirty after expansion;
- Quick Capture is an Obsidian command/global-hotkey title-first entry into the standard Triage Composer and does not reintroduce Capture into the closed normal Trail Sidebar;
- Workflow Issue creation keeps required Project visible in the light header, creates in configured Backlog, and does not expose Status or Cycle as creation properties; changing Project clears an incompatible Milestone;
- Project creation omits editable Status and uses the configured Unstarted default; Initiative creation has no Status; Milestone uses a smaller Project-local anchored quick-create over shared lower-level controls;
- normal successful creation closes and returns to the invoking context; Triage Accept remains the destination-first source-removal/Review-progression exception;
- transient Menu/Picker/Popover/Peek/Composer/Confirmation interactions use one top-layer dismissal/focus stack: `Esc` dismisses only the topmost layer and never leaks through to a parent in the same key action;
- Context Menu, `...`, contextual Command Menu, Bulk surfaces, and keyboard shortcuts consume one Action Registry authority; explicit unselected/entity-local invocation cannot accidentally target unrelated stale selection;
- collection selection uses one floating Bulk surface and is bounded by the current visible actionable projection, so Filter/layout/navigation cannot leave invisible stale action targets;
- Peek is a read-oriented Workflow Issue inspection surface inside Main View: ordinary Issue activation opens/retargets it, it does not change Inspector/history, and deep editing remains Full Item responsibility;
- Peek retargeting/adjacent browsing uses the current visible ordered collection, while a target that leaves the projection closes Peek rather than inheriting Triage Review's successor workflow;
- property/relation controls use a shared picker family (fixed single-select, searchable relation, multi-select, temporal) with common focus/dismiss/search mechanics but separate semantic owners;
- confirmations share safe focus/Cancel/dismiss mechanics while keeping Delete, draft discard, lifecycle close, and complex workflows semantically distinct; recovery/Undo claims require real capability;
- Trail contextual Command Menu is a searchable Action Registry presentation distinct from Obsidian's global Command Palette and from Sidebar Search;
- Sidebar Search is navigation-only in V1 and does not open Peek over an unrelated current Main View;
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

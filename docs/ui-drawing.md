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

### 5.9 Next drawing target

Continue with **Current Cycle**.

Reuse the accepted Issue Row/Card, Filter, List/Board, Peek, and Inspector boundaries where responsibility is genuinely shared. Draw only Cycle-specific composition:

- date-range identity;
- explicit membership action;
- Project swimlanes;
- Current Cycle summary context;
- Board/List behavior;
- filtering and empty states;
- Cycle lifecycle actions;
- History list and Historical Cycle Page differences.

Do not sediment the tentative Current Cycle sketch until Project-swimlane behavior, filtering, empty states, lifecycle actions, and History have been compared and accepted.

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

# Trail UI Drawing Workbench

> **Lifecycle: temporary drawing document.** This file exists only while Trail's V1 UI is being drawn page by page in text. It is not a Product scope document, not an implementation plan, and not the final UI Blueprint. After every page has been drawn, shared components have been identified, and the final `docs/ui-blueprints.md` has been generated and synchronized into the canonical UI documentation, delete this file.

## 1. What this work is

The current UI work is the text equivalent of drawing screens in Figma.

Product, Domain, and already-settled behavior decide **what Trail does**. This drawing pass does not reopen whether a capability belongs in V1, should be deferred, or should exist at all.

The drawing pass answers only questions such as:

- what is visible on a page;
- where visible elements are placed;
- what changes visually when the user interacts with them;
- what empty, selected, editing, loading, error, and other visible states look like when relevant;
- how the same page rearranges when the Main View becomes narrower or wider;
- whether an Inspector is present for that page and what it shows;
- after all pages are visible together, which repeated pieces should become shared components and which compositions should remain page-specific.

Do not start by designing component APIs. Draw the pages first.

## 2. Simple UI model

Use these terms unless a more specific name is genuinely needed:

```text
Obsidian window
├─ Ribbon
├─ Left Sidebar
│  └─ Trail Navigation
│     ├─ normal navigation
│     └─ Search mode          temporary replacement of the normal navigation contents
│
├─ Main leaf
│  ├─ Obsidian view header
│  │  └─ Back / Forward      host navigation history
│  └─ Main View              one canvas
│     └─ current Page         defines what is drawn on the canvas
│
└─ Right Sidebar
   └─ Trail Inspector         only when the current Page uses one
```

The model is intentionally simple:

- **Navigation** changes the current Trail location and therefore selects which Page the Main View shows.
- **`navigate(location)`** is the one conceptual navigation operation. Sidebar destinations, clickable search results, clickable ancestors inside a Page, and other product navigation consumers use the same operation instead of maintaining separate routing state.
- **Back / Forward** belongs to the Obsidian host view header and moves through previously visited Trail Page locations. Trail does not draw a second Back / Forward control inside the Main View.
- **Main View** is one canvas. Its available width is an input to Page layout.
- **Page** defines what is drawn on that canvas for one destination. Navigation does not decide the Page's title, breadcrumb, controls, collection layout, or other internal composition.
- **Breadcrumbs**, when a Page uses them, are Page content. Their presence, hierarchy, placement, and visual treatment are decided while drawing that Page. A clickable ancestor may call the shared `navigate(location)` operation, but Navigation does not impose a global breadcrumb bar.
- **Search** is not a Page or Trail location. It is a temporary Left Sidebar mode used to find navigation targets.
- **Inspector** content is Page-specific but, when used, is hosted by the Obsidian Right Sidebar rather than being a fake column inside the Main View canvas.
- **Components** are extracted only after the pages have been drawn and compared.

A Page is therefore primarily a composition definition over the Main View canvas. It is not a reason to invent a separate framework or container model for every destination.

## 3. Linear reference rule

Trail's Product capabilities come first. Linear is used only to decide how an already-existing Trail capability should look and feel.

```text
Trail has the thing
        ↓
Does Linear have an equivalent UI?
├─ yes, substantially equivalent -> copy the observable UI/presentation closely
├─ similar but not equivalent     -> adapt the Linear presentation to Trail
└─ no suitable equivalent         -> compose a Trail answer using the established Linear visual language
```

Never use the reverse rule:

```text
Linear has feature X
-> Trail should have feature X
```

Do not copy Linear business concepts, workflow rules, page types, persisted data, or navigation semantics merely because they exist in Linear.

## 4. Drawing process

For each actual Trail Page already established by Product/UI:

1. identify the closest current Linear Page/surface when an equivalent exists;
2. separate what can be copied closely, what Trail must adapt, and what Obsidian already owns;
3. draw the Page as a text layout;
4. list the visible elements inside that layout;
5. describe only the interactions needed to understand the visible drawing/state changes;
6. draw materially different visible states when useful;
7. draw wide and narrow Main View arrangements when the composition changes;
8. include the Page's Inspector in the same discussion when the Page uses one;
9. record the accepted drawing and move to the next Page.

The surrounding Obsidian shell and Trail Navigation are drawn separately from Page composition. Once their behavior is closed, do not keep redesigning them while drawing each Page unless a Page exposes a genuine contradiction.

After **all** pages are drawn:

1. place the page drawings side by side conceptually;
2. identify repeated visual/interaction responsibilities;
3. decide which repeated responsibilities are truly shared components/patterns;
4. keep genuinely page-specific compositions local;
5. define shared components only now;
6. generate the final `docs/ui-blueprints.md` once from the accepted drawings;
7. synchronize durable answers into `docs/ui.md` and implementation ownership documents;
8. delete this workbench.

Do not create `docs/ui-blueprints.md` incrementally during the drawing discussions. The final Blueprint is an output of the completed drawing pass, not an input that constrains it.

## 5. Current drawing status

### 5.1 Host/navigation boundary - closed

The current shell-level ownership is:

```text
Obsidian host
├─ window / tabs
├─ Ribbon
├─ Back / Forward and view-header mechanics
├─ Left / Right Sidebar containers
├─ split / resize / collapse behavior
└─ other ordinary Obsidian workspace mechanics

Trail
├─ contents of the Trail Navigation view in the Left Sidebar
├─ the current Page drawn in the Main View
└─ Trail Inspector contents when a Page uses the Right Sidebar Inspector
```

The already-developed dark shell/color calibration is useful visual evidence, but existing page/component composition is not design authority. Preserve good host/Trail visual integration without inheriting unfinished component boundaries.

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

Notes:

- `Search` is a high-frequency action in the top Trail identity area. It is not a Page row and does not become an active navigation destination.
- `Workspace` is a quiet section label, not a destination.
- `Projects` is one fixed destination for browsing Projects and Initiative context. It is not an expandable library/tree.
- the Default Project occupies one fixed navigation slot immediately after `Projects`; its visible title follows the current Default Project. A fresh workspace begins with the ordinary fallback Project titled `Standalone`.
- the Default Project is the fallback Project for work that does not have a more specific Project choice; it remains an ordinary Project rather than a second Project model.
- the Triage trailing number is quiet row metadata for the current Review Set count, not a generic notification/unread badge.
- the Sidebar never inserts the currently open Initiative, Project, Issue, or other Page name dynamically.
- the exact icon glyphs, row height, spacing, opacity, hover, selected surface, and other small visual measurements are calibration details; use the closest equivalent Linear navigation treatment where one exists.

The Sidebar does **not** contain:

- Capture;
- a Search destination row;
- Settings;
- Foundation Lab;
- Initiative rows;
- a Project tree or dynamic Project children;
- Favorites or other features not already part of this navigation drawing.

Quick Capture is not navigation. Its visible entry points are handled by the relevant Pages such as Home/Triage plus the global shortcut; it is not added to the Sidebar merely because it is high frequency.

### 5.3 Left Sidebar Search mode - closed

Activating the top `Search` action temporarily replaces the normal Trail Navigation contents with Search mode:

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

Search mode rules:

- Search is transient Left Sidebar UI, not a Trail Page and not a navigation location.
- opening Search does not change the current Page, Main View, host history, or Right Sidebar;
- the input receives focus immediately and results react as the query changes;
- Search returns only **Initiative**, **Project**, and **Issue** navigation targets;
- Cycle, Triage entries, and ordinary Obsidian notes are not global Trail Search result kinds;
- results may be grouped by kind for scanability, but the detailed result-row presentation is deferred until needed;
- `Esc` or the Search-mode back control closes Search and restores the normal Sidebar without changing the current Page;
- choosing a result calls `navigate(result.location)`, closes Search mode, restores the normal Sidebar, and lets the destination Page render in the Main View.

Conceptually:

```text
normal Sidebar
    |
    | Search
    v
Search mode
    |\
    | \ Esc / back
    |  -> normal Sidebar, same Page
    |
    -> choose result
          -> navigate(location)
          -> normal Sidebar, destination Page
```

### 5.4 Navigation behavior - closed at the current drawing level

Navigation should be reasoned about as one current location plus one shared transition operation:

```text
Sidebar destination ---------\
Search result ----------------+-> navigate(location) -> current Page changes
Page-owned clickable ancestor-/

Obsidian Back / Forward ----------> restores a visited Page location through host history
```

Representative destination shapes include:

```text
Home
Triage
Projects
Initiative(initiativeId)
Project(projectId)
Issue(issueId)
Cycles / cycle-related locations
```

Search is intentionally absent from this list because Search is not a Page.

Sidebar focus communicates the current product area, not visit history. In particular:

- Home Page -> `Home`;
- Triage Page -> `Triage`;
- Projects Root / Initiative Focus / ordinary Project Workspace -> `Projects`;
- the Default Project Workspace may use its dedicated Default Project row;
- Issue Full Page -> `Projects`, regardless of whether the Issue was opened from Search, Cycles, a Project collection, or elsewhere;
- Cycle Pages -> `Cycles`.

Where the user came from is represented by Obsidian Back / Forward history, not by changing the meaning of Sidebar focus.

### 5.5 Page-owned composition boundary - closed

Once Navigation selects a Page, Navigation stops deciding visible Page composition.

The Page itself decides, as applicable:

- whether it has a breadcrumb at all;
- which ancestors appear in that breadcrumb and how they are laid out;
- Page title and narrative context;
- Page actions and overflow actions;
- View Bar / Filter / Display / layout controls;
- List, Board, Timeline, editor, chart, review, or other Page-specific geometry;
- whether an Inspector is useful and what information that Inspector contains;
- narrow/wide rearrangement.

A Page-owned breadcrumb may use `navigate(location)` for clickable ancestors. That reuse does not turn breadcrumb composition into a global navigation-shell responsibility.

### 5.6 Projects Root - closed

Projects Root is the all-Project scanning surface. It stays Project-first, groups Projects by Initiative in List mode, and does not become a dashboard or a generic view builder.

The accepted Page frame is:

```text
Projects                                               +

Filter                              [ List | Timeline ]
```

Page-level rules:

- `Projects` is the Page title; this top-level Page does not need a breadcrumb.
- the compact `+` opens the standard New Project flow.
- Projects Root does not use a Trail Inspector. An unrelated Obsidian Right Sidebar view remains untouched.
- there is no `Display` control and no generic `Sort` control. The Page owns responsive reduction and uses a reliable default ordering instead of asking the user to configure presentation.
- Filter decides which Projects are in the current working view. The default Projects Root filter hides Projects in Completed and Canceled lifecycle categories; the user may include them through Filter when needed.

#### 5.6.1 List presentation

The default List groups Projects by Initiative:

```text
▾  Initiative Alpha                                      2

   ●  Project A        In Progress     High     65%     Sep 08
   ○  Project B        Planned                  20%     Sep 20


▾  Initiative Beta                                       1

   ●  Project C        In Progress              40%


▾  No Initiative                                         1

   ○  Standalone       Planned
```

Initiative-group rules:

- a real Initiative title is clickable and calls `navigate(Initiative(id))`;
- the disclosure control expands/collapses that group without navigating;
- the trailing Project count is quiet summary metadata;
- `No Initiative` is a grouping label rather than an entity, so it does not navigate;
- `No Initiative` stays last;
- Initiative groups use a stable deterministic order and do not jump because one child Project becomes more urgent. The Default Work Order below applies inside a group, not to the groups themselves.

The Project Summary Row stays compact and normally single-line. A representative wide row is:

```text
[Status] Project title      Status      Priority      Progress      Due
```

The visual priority is intentionally uneven:

- Project title and Status identity are preserved longest;
- the Status name remains high-value scanning information;
- Priority, Due, and quiet numeric Progress are secondary and progressively reduce as width becomes constrained;
- Progress does not become a large persistent progress bar in Projects Root;
- Description, Labels, and Initiative membership are not repeated as normal Root-row metadata;
- exceptional derived Attention may appear only when there is a real exception and may receive higher preservation priority than ordinary secondary metadata.

Responsive reduction is Page behavior rather than user configuration. A narrow Main View may therefore reduce from:

```text
●  Project A      In Progress      High      65%      Sep 08
```

toward:

```text
●  Project A      In Progress
```

and, when necessary, toward title plus stable Status identity without wrapping each Project into a mini details card.

#### 5.6.2 Default Work Order

Trail uses one reusable **Default Work Order** principle for ordinary work collections when no Page-specific temporal/history/relevance ordering supersedes it:

```text
actionable before terminal
-> Due urgency
-> lifecycle / Status order
-> Priority
-> Created At when that entity has a canonical creation timestamp
-> stable deterministic fallback
```

Interpretation:

- Completed/Canceled or otherwise terminal objects do not outrank actionable work merely because they carry an older Due.
- among actionable objects, overdue and earlier Due values come before later Due values, while no Due comes after concrete Due values;
- lifecycle/Status ordering then reflects the entity's configured/system lifecycle semantics;
- Priority then follows Urgent, High, Medium, Low, unset;
- `Created At` is a stable age tie-breaker only for entity types that actually own an authoritative creation timestamp. Missing fields are skipped rather than invented. In particular, current Project data does not gain a new `createdAt` fact merely for sorting.
- the final fallback is deterministic and non-activity-based so incidental edits do not cause rows to jump.

Projects Root uses this rule inside each Initiative group. The Page does not use `Updated At`, derived Progress, Attention score, or a hidden persisted rank as default ordering state.

Filter and ordering remain separate responsibilities:

```text
Default Filter
-> decides what enters the current working view

Default Work Order
-> decides how the visible work is ordered
```

A specific Page may choose a different default Filter without redefining the reusable ordering principle. Search relevance, history, Timeline position, and other inherently specialized orderings are separate cases.

#### 5.6.3 Timeline presentation

Timeline is the same filtered Project collection in a temporal presentation, not a second Project model:

```text
Filter              [ List | Timeline ]      Month v      Today
```

The accepted Timeline controls are:

```text
Zoom
├─ Week
├─ Month
├─ Quarter
└─ Year

+ horizontal time navigation / pan / scroll
+ Today to return the viewport to the present
```

The Timeline keeps the same Initiative grouping and Project navigation identity while giving the right side of each row a time axis. A conceptual drawing is:

```text
                         Aug             Sep              Oct
                         │               │                │
                         │             Today              │
                         │               │                │
▾ Initiative Alpha      │               │                │
                         │               │                │
  ● Project A            ━━━━━━━━━━━━━━━━┿━━━━━━◆         │
                         │               │      Due       │
                         │               │                │
  ● Project B                    ━━━━━━━━┿━━━━━━━━━━━━◆   │
                         │               │            Due │
```

Timeline semantics remain evidence-based:

- solid execution emphasis comes from real current Issue lifecycle evidence;
- weaker planning/lifecycle spans use only current evidence that can actually be derived;
- Due is a separate marker layer and is not silently reinterpreted as a canonical Project end date;
- Today is a quiet reference line separating past from future;
- Projects without the temporal evidence required by the canonical Timeline rules may be absent from Timeline even though they still exist in List;
- Timeline may look and navigate like Linear's mature Project Timeline, but Trail does not add drag-to-reschedule, dependencies, resource planning, or invented Project start/end facts merely to imitate it.

`Display` is still absent in Timeline. Zoom and Today are direct Timeline tools because their meaning is specific and obvious.

#### 5.6.4 Deferred details

Projects Root is closed at the current drawing level. Do not block this Page on exact row height, icon glyphs, hover states, breakpoint numbers, empty states, selection/bulk-action treatment, Peek, Context Menu, or dense Timeline-marker collision rules. Revisit those only when another Page or the final cross-page component pass makes them necessary.

### 5.7 Next drawing target

Continue with **Initiative Focus**. Treat it as a scoped Project collection derived from the accepted Projects Root List language, then draw only the Initiative-specific context and differences. Do not re-open Projects Root unless Initiative Focus reveals a real contradiction.

Do not create a shared breadcrumb/location bar before drawing the Pages. When a Page needs structural navigation, draw it as part of that Page and only extract a shared pattern later if multiple accepted Pages genuinely converge on one.

## 6. What existing documents mean during this drawing pass

Use the existing documents with narrow responsibilities:

- `docs/product.md` tells us what product capabilities and destinations already exist. Do not redefine scope in this drawing pass.
- `docs/ui.md` supplies already-settled UI behavior and presentation constraints that the drawings must respect, except where this workbench explicitly records a newer accepted drawing decision to be synchronized later.
- `docs/domain.md`, `docs/data.md`, and `docs/architecture.md` supply semantics and technical constraints only when they materially affect what can be drawn.
- `docs/implementation.md`, current source code, tests, and screenshots are implementation evidence. They must not decide what a page drawing looks like merely because they already exist.
- `docs/design-to-code-map.md` is implementation traceability. Existing component/file names do not force component boundaries during the drawing pass.

### 6.1 Known documentation drift to avoid during drawing

`docs/ui.md` still contains several older navigation-composition decisions that are stale for the current drawing work:

- it places Search and Capture together in a Trail navigation header;
- it models Search as a Trail Page/location;
- it orders the Default Project before `Projects` in the Sidebar;
- it describes breadcrumbs through a shared Location Bar strongly enough to imply a required shell object;
- its Projects Root View Bar still includes `Display`, and its older Project ordering language does not yet reflect the accepted Default Work Order.

The accepted drawing state in Section 5 supersedes those composition assumptions for this drawing pass:

- Search is a temporary Left Sidebar mode opened from the top Trail identity area;
- Capture is not in the Sidebar;
- normal Workspace ordering is `Projects`, `<Default Project>`, `Cycles`;
- breadcrumb presence and composition are Page-owned decisions;
- Projects Root uses `Filter` plus `List / Timeline`, without `Display` or a generic Sort control;
- ordinary work collections may reuse the accepted Default Work Order while each Page still owns its default Filter;
- Back / Forward belongs to the Obsidian host view header rather than the Trail Main View canvas.

These accepted drawing decisions should be synchronized into canonical UI documentation after the page drawing pass has enough context to avoid repeated churn.

Similarly, existing names such as `TrailWorkspaceShell`, `TrailLocationBar`, current page-private Triage components, or any other present implementation name must not be treated as required objects in the text drawing. First draw what the user sees. Name/extract shared components later.

`docs/implementation.md` still describes the earlier Triage-first Phase A/B/C construction sequence. That is historical implementation state, not the current UI drawing process and not a reason to start production UI work before the page drawings are complete.

## 7. Communication rule for the drawing sessions

Prefer ordinary visual words:

```text
Sidebar
Search mode
Back / Forward
Main View / canvas
Page
Inspector
component
```

Do not introduce architectural vocabulary merely to describe a visible rectangle, row, title, control, list, chart, or panel.

When discussing a Page, stay on that Page. Do not pull later Pages, implementation ownership, component extraction, or Product-scope questions into the current drawing unless they are strictly necessary to understand what is visible.

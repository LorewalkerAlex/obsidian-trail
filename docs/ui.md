# Trail UI Design

## 1. Authority and Scope

This document owns Trail's resolved target UI presentation and interaction answers.

It consumes Product, Domain, Data, and Architecture decisions rather than redefining them. Current implementation appearance is not a design authority: existing POC layout, CSS, native controls, page-local navigation, and modal/detail carriers may be replaced when they do not match the target UI.

Trail V1 targets **Obsidian-native architecture with Linear presentation**:

- Obsidian owns the window, tabs, Ribbon, sidebars, splits, resize/collapse behavior, and other host workspace mechanics.
- Linear is the primary visual and interaction reference where Trail has an equivalent responsibility.
- Trail owns product-specific composition, semantics, and the gaps that neither Obsidian nor an existing reusable primitive already solves.
- UI design must not introduce new persisted Domain facts merely to support presentation, ranking, attention, color, ordering, or capability when those answers can be derived from existing facts.

### 1.1 Reference priority

When resolving a concrete UI element, use this order:

1. current Linear application UI;
2. current official Linear product documentation, changelog, and screenshots;
3. transferable Linear visual tokens and measurements from maintained reference material such as `awesome-design-md`;
4. current Obsidian host constraints and native UI behavior;
5. a Trail-specific answer only where product semantics or host constraints genuinely differ.

Linear is a **visual reference**, not Trail's feature specification. Trail should reuse the visual grammar of an equivalent Linear control without importing collaboration-first semantics, generic view-builder complexity, or unrelated configuration capabilities.

### 1.2 Text is authoritative; images are visual anchors

The written decisions in this document are authoritative. Reference screenshots and later Trail mockups exist to make the intended composition, density, and hierarchy visually unambiguous; they do not replace the written contract.

For each UI area that benefits from visual evidence, future documentation may add annotated images under `docs/assets/ui/`. An image should be accompanied by text describing:

- what part of the reference matters;
- what Trail adopts;
- where Trail intentionally differs;
- which dimensions or colors remain subject to full-shell calibration.

Useful current Linear visual anchors include:

- UI refresh: <https://linear.app/changelog/2026-03-12-ui-refresh>
- Design-refresh process and header system: <https://linear.app/now/behind-the-latest-design-refresh>
- Board layout: <https://linear.app/docs/board-layout>
- Display options: <https://linear.app/docs/display-options>
- Projects: <https://linear.app/docs/projects>
- Initiatives: <https://linear.app/docs/initiatives>
- Timeline: <https://linear.app/docs/timeline>
- Filters: <https://linear.app/docs/filters>
- Cycles: <https://linear.app/docs/use-cycles>
- Cycle graph: <https://linear.app/docs/cycle-graph>
- Triage: <https://linear.app/docs/triage>
- Peek: <https://linear.app/docs/peek>
- Priority: <https://linear.app/docs/priority>
- Project overview/details: <https://linear.app/docs/project-overview>
- Project milestones: <https://linear.app/docs/project-milestones>
- Due dates: <https://linear.app/docs/due-dates>
- Issue selection: <https://linear.app/docs/select-issues>

For Project Workspace specifically, the useful Linear reference is the **compact project-details + Issue collection interaction**, not Linear's complete Project feature set. For Projects Root, current Linear Project collection arrangement, density, grouping, and Timeline presentation remain useful visual references. Initiative Focus is not currently frozen to Linear's Project/Initiative page composition: its final multi-Project workspace presentation is part of the remaining V1 UI closure. Trail intentionally does not copy collaboration, documents/resources management, Project updates, or a heavyweight Overview/Issues dual-workspace model. Trail filters use one simplified Trail-specific interaction model; Linear filter visuals may inform polish, but Linear's advanced filter/view-builder semantics are not the product target.

For Triage, current Linear Triage is the primary queue/review interaction reference. Trail adopts its compact intake queue, sequential review rhythm, low-noise disposition actions, and constrained presentation model, while localizing the semantics to Trail's personal intake model: no team/assignee routing, no Snooze state, no normal Workflow Status, and no assumption that accepting must always produce an Issue.

For Cycles, current Linear Cycles provide the primary collection, Board/List, timebox identity, membership, and compact progress-reference grammar. Trail deliberately localizes away Linear's automatic cadence, future/upcoming Cycle generation, automatic Status coupling, automatic rollover, team distribution, predictive Capacity, Cycle Success, and historical graph snapshots. Trail's Current Cycle is a selected live Issue collection; Historical Cycles retain final membership only.

## 2. Visual System and Calibration

### 2.1 Full-shell calibration

Trail components are not calibrated in isolation. The calibration target is the complete Obsidian window while Trail is active:

```text
Obsidian Host
├─ native window / tab chrome
├─ Ribbon
├─ Left Split
│  └─ Trail Navigation
├─ Main Split
│  └─ Trail workspace shell
└─ Right Split
   └─ contextual Trail Inspector when shown
```

Trail-owned tokens and any limited host skinning must be tuned together so the result feels like one coherent application rather than a dark web application embedded inside unrelated Obsidian chrome.

The V1 reference environment is **Obsidian Default Dark + Trail Linear-inspired Dark**. Community themes are compatibility environments, not the visual calibration authority.

Exact pixel dimensions, color values, opacity, spacing, and breakpoints should be frozen only after the relevant shell exists in real Obsidian and can be compared side by side with current Linear references.

### 2.2 Transferable Linear token family

A useful starting token family from maintained Linear references is:

```text
primary           #5e6ad2
on-primary        #ffffff
primary-hover     #828fff
primary-focus     #5e69d1

ink               #f7f8f8
ink-muted         #d0d6e0
ink-subtle        #8a8f98
ink-tertiary      #62666d

canvas            #010102
surface-1         #0f1011
surface-2         #141516
surface-3         #18191a
surface-4         #191a1b

hairline          #23252a
hairline-strong   #34343a
hairline-tertiary #3e3e44
```

Useful radius anchors are `4 / 6 / 8 / 12 / 16 / 24 / pill`; useful spacing anchors are `4 / 8 / 12 / 16 / 24 / 32 / 48 / 96`.

These are calibration inputs rather than an obligation to reproduce every source value unchanged inside Obsidian.

### 2.3 Reuse before new visual primitives

Trail should not create new glyphs or interaction primitives when an existing mature equivalent is suitable.

Preferred order for icons and primitive mechanics:

```text
Obsidian-native capability / icon
→ existing Lucide or other already-adopted mature primitive
→ semantic equivalent matching current Linear usage
→ custom Trail primitive only when no existing option fits
```

When Linear uses a recognizable visual concept and an equivalent existing Obsidian/Lucide glyph is available, Trail should use the existing glyph and tune size, stroke, opacity, state, and placement to match the target presentation rather than drawing a new icon set.

### 2.4 Stable visual identity for Domain concepts

The same Domain concept uses the same visual identity everywhere. Information density may change by surface, but the symbol itself must not change.

For example, Priority must not be a bar glyph in a List, a text badge in Peek, and a flag in Inspector. It remains the same Priority glyph; denser surfaces may show only the glyph while precise selection/editing surfaces add the text value.

General rule:

> In high-frequency scanning surfaces, prefer an established glyph, shape, or color over repeated text when the meaning remains clear. In selection, editing, tooltip, first-use, and accessibility contexts, provide explicit text.

## 3. Host Composition

### 3.1 One primary Trail tab

V1 uses one primary native Obsidian tab/leaf for Trail. Its native tab identity remains **Trail**.

Home, Triage, Search, the Default Project shortcut, Projects Root, Initiative Focus, Project Workspace, Cycles, and Full Item locations navigate **inside that Trail tab**. Obsidian tabs are not used as Trail page navigation. A future Workspace Issues collection remains deferred and is not part of the V1 navigation structure.

A future explicit “open this item in a new tab/split” capability may reuse Full Item content, but it is not the V1 navigation model and should not shape current page composition.

### 3.2 Host ownership

```text
Obsidian Host
├─ Window / Tabs          host-owned global workspace chrome
├─ Ribbon                 host-owned global/context entry rail
├─ Left Split             TrailNavigationView or normal Obsidian views
├─ Main Split             TrailView / ordinary Obsidian leaves
└─ Right Split            TrailInspectorView when persistent inspector fits
```

Trail does not duplicate the left sidebar, tab system, split system, or resize/collapse behavior inside its main view.

The normal File Explorer, Search, Bookmarks, and other Obsidian/plugin sidebar views remain available. Entering Trail context may reveal/select Trail Navigation without destructively rewriting the user's workspace.

## 4. Trail Navigation

### 4.1 Structure

The target navigation structure is:

```text
Trail                               Search  Capture

Home
Triage                              optional attention indicator

Workspace
Standalone                          fresh Default Project title
Projects
Cycles
```

`Workspace` is a quiet section label rather than a large all-caps heading.

Search and Capture are high-frequency global actions in the navigation header, not ordinary peer navigation rows. Trail does not show a fake workspace-switcher chevron because V1 has one implicit Workspace.

### 4.2 Default Project shortcut and Projects

The first Workspace row is a shortcut to the current **Default Project**. On a fresh Workspace the seeded ordinary Project is titled `Standalone`, so the initial navigation appears as:

```text
Workspace
Standalone
Projects
Cycles
```

The row is not a special Standalone location and does not identify a Project by title. Workspace State stores a stable `defaultProjectId`; when that reference resolves, the row renders the referenced Project's current title and opens the same normal `Project(projectId)` location used everywhere else. Renaming the Project therefore renames the shortcut automatically. Assigning it to an Initiative, changing lifecycle Status, or editing any other Project property does not change the navigation mechanism. If the referenced Project is deleted, the Default Project reference is cleared and this shortcut disappears; Trail does not silently create or choose another Project.

The same Project continues to appear normally in Projects Root, grouped under its actual Initiative or `No Initiative`. The shortcut is only a high-frequency placement of a normal Project target, not a duplicate Project, collection, or workspace.

`Projects` is the single top-level entry for Project portfolio browsing and Initiative context. Initiative remains an independent Domain entity, but the UI reaches Initiative Focus through Projects rather than exposing a parallel top-level Initiatives entry. A Project can still be opened directly from Projects Root, Search, Home, the Default Project shortcut, or another supported deep link without navigating through Initiative Focus first.

The previously proposed dynamic Project children under `Projects` are removed from the current V1 target navigation. If Project children are introduced later, they should reuse the same stable `Project(projectId)` navigation target rather than a second Project model. Favorites remain a supported workspace-state concept, but their sidebar presentation is deferred until the Favorites interaction itself is designed.

A future **Workspace Issues** location may provide an all-Workflow-Issue collection across Projects. It is deferred beyond the current V1 navigation and does not reintroduce a `No Project` Workflow state because every Workflow Issue belongs to exactly one Project.

### 4.3 Navigation visual language

Navigation should follow current Linear density and hierarchy:

- compact rows;
- small, quiet icons;
- dim inactive text;
- low-contrast section labels;
- active state expressed primarily through subtle surface and foreground contrast;
- no accent-colored selection bar;
- no large bold-weight jump for the active row;
- generous enough section spacing that groups remain scannable without turning each row into a card.

Exact row height, icon size, radius, opacity, and indentation remain full-shell calibration values.

## 5. Main Workspace Shell

The main Trail workspace uses:

```text
Location Bar
optional Context disclosure
optional View Bar
Content
```

The bars are stable horizontal control planes, not large standalone toolbars. Structure should be felt through spacing, surface hierarchy, and restrained separators rather than heavy boxes and repeated borders.

### 5.1 Location Bar

The Location Bar answers **“where am I?”** and owns structural location plus object/location actions.

Examples:

```text
Home
Triage
Projects
Projects / Initiative Alpha
Projects / Initiative Alpha / Project Trail
Projects / Project Personal
Cycles / Aug 25 – Sep 7
Cycles / History
Cycles / History / Aug 11 – Aug 24
```

Breadcrumbs describe Trail product structure, not visit history. Ancestors are navigable; the terminal segment is the current location.

Back/forward history remains an Obsidian/browser host responsibility and is not duplicated in the Trail Location Bar.

The right side contains only actions that belong to the current location/object, such as Inspector/Details toggle, Project context disclosure, Cycle History access, or a low-frequency overflow menu when applicable. If a location has no such action, no empty action shell is rendered merely for symmetry.

A large repeated page title is not required when the Location Bar already establishes the current object and the content does not need an additional title hierarchy.

In narrow panes, preserve the terminal location first and progressively collapse middle ancestry and low-priority actions rather than allowing the bar to overflow horizontally.

### 5.2 Project context disclosure

Project description is narrative context, not an Inspector property row and not a separate heavyweight Overview page.

Project Workspace may expose a lightweight context/info affordance in the Location Bar. When opened, the Project's lightweight Markdown description appears inline below the Location Bar and above the View Bar/content:

```text
Projects / Trail                         [context]  ···
──────────────────────────────────────────────

Trail is an Obsidian-native personal project...
[[UI Design]]
[[Technical Notes]]

──────────────────────────────────────────────
Filter                 [layout]        Display
```

Collapsed state removes the description region without changing Project location.

The description may use ordinary lightweight Markdown and Obsidian wikilinks. Trail does not introduce `relatedNoteIds[]` merely to imitate Linear Resources/Documents; ordinary Obsidian notes/backlinks remain the document layer.

### 5.3 View Bar

The View Bar exists only when the current content is a collection with meaningful presentation controls.

For Projects Root, the V1 target is:

```text
Filter        [single List/Timeline toggle]        Display
```

Initiative Focus remains part of the final V1 UI-closure discussion. Its working direction is a multi-Project project-like workspace and may reuse a Cycle-like List/Board Issue collection with Project context rather than the old assumption that it is another Project-summary List/Timeline surface. Its final View Bar is therefore not frozen by this section yet.

For an In Progress Project Workspace, the V1 target remains:

```text
Filter        [single List/Board toggle]           Display
```

For Current Cycle, the V1 target is:

```text
Filter        [single List/Board toggle]           Display
```

For Triage and Historical Cycle, the V1 target is deliberately simpler:

```text
Filter                                             Display
```

The binary layout switch occupies one control slot rather than two permanent peer buttons. Not Started, Done, and Cancelled Project Workspaces are List-only because Board is an execution workflow surface; they omit the List/Board toggle rather than exposing an unavailable presentation. Triage is always a List. Historical Cycle is also List-only because it is passive final-membership history rather than a historical execution Board.

Trail V1 uses one **simplified shared Filter interaction** across supported collections. It is intentionally narrower than Linear's advanced filtering/view-builder capability and must not grow into a generic boolean-query UI merely because different pages expose different fields. The remaining UI closure will freeze the small shared interaction grammar once, including the popover flow, applied-filter treatment, temporal handling, clear/reset behavior, and keyboard/focus mechanics.

Projects Root uses the simplified Filter with the smaller Project registry: Status, Initiative, Priority, Labels, and Due. Filtering changes visibility only; it does not define grouping, ordering, or entity mutation. Initiative Focus will consume the same simplified mechanism once its final collection composition is frozen.

Triage and Cycle consume the same simplified shared mechanism with their own already-resolved property registries. They do not introduce page-specific filter syntax, a second boolean builder, or a generic view-builder layer.

`Display` is not a generic view builder. In Projects Root it controls supported secondary Project-row properties and Timeline presentation choices. In Project Workspace and Current Cycle it controls supported secondary Issue Row/Card properties. In Historical Cycle it controls supported flat List-row metadata. In Triage it is limited to supported ordering choices. Initiative Focus Display follows whatever final collection composition is frozen in the remaining UI closure. V1 does not need a generic Group/Sub-group builder, manual ordering, or a generic Sort builder for these surfaces.

`Create Issue` is not a generic View Bar configuration control. Exact placement of the Project-local create affordance is a composition detail, but it must not visually imply that creation inherits a Todo/Started/Completed group.

### 5.4 Projects Root and Initiative Focus

Projects is one unified workspace rather than separate Projects and Initiatives application areas.

Projects Root is a Project-first collection whose default List presentation groups Projects by Initiative:

```text
Projects

Filter                 [List / Timeline]       Display

▾ Initiative Alpha                              3 projects
  Project A
  Project B
  Project C

▾ Initiative Beta                               2 projects
  Project D
  Project E

▾ No Initiative                                 2 projects
  Project F
  Project G
```

Initiative is therefore a Project organization/display/focus dimension in this workspace, while remaining a real Domain entity. The Initiative group header is intentionally quiet: disclosure state, Initiative identity, and Project count only. It does not become a mini-dashboard for Initiative Priority, Due, Labels, Progress, Attention, description, or Project lifecycle distribution. Groups are expanded by default; collapse is page presentation state. `No Initiative` uses the same structural treatment but does not navigate to a fake Initiative.

The current Default Project participates in this collection exactly once like every other Project. If it has no Initiative it appears under `No Initiative`; if the user assigns it to an Initiative it appears in that Initiative group. The separate Workspace shortcut does not remove or duplicate the Project in this collection.

Clicking the Initiative title enters Initiative Focus. Clicking a Project row opens that Project directly:

```text
Projects Root
├─ Projects / Initiative Alpha
└─ Project Workspace
```

Initiative Focus remains a stable location, but its **final collection composition is reopened for the remaining V1 UI closure**. The current working model is a project-like workspace spanning multiple Projects rather than a duplicate of Projects Root:

```text
Projects / Initiative Alpha
→ multi-Project working context
→ likely shared Issue collection
→ likely List / Board
→ explicit Project context, similar to Current Cycle
```

This direction should reuse existing Project Workspace / Current Cycle Issue collection mechanics rather than invent another Board/List engine. The remaining closure must decide the exact Board/List projection, Project grouping/swimlane treatment, Initiative Inspector/actions, and where Project summaries remain visible. Until that discussion closes, the older `same Project collection + List/Timeline` assumption is not authoritative for Initiative Focus.

`+ Project` on Projects Root creates a Project with optional Initiative membership. Whether Initiative Focus exposes the same create affordance and how Initiative-level properties/details compose with the aggregate work view remain part of that closure. Low-frequency Initiative creation still belongs to a secondary Projects action rather than requiring a separate top-level navigation area.

### 5.5 Project Summary Row

Project Row is the primary scanning unit in Projects Root. Initiative Focus may still reuse Project summaries where useful, but its primary aggregate-work composition is not frozen yet. Project Row stays compact and normally single-line rather than becoming a card or a table of every Project fact.

Wide conceptual form:

```text
[Status glyph] Project title    Status    Priority    Progress    Due    Attention
```

Information priority is Project identity first, then lifecycle Status, normal execution/time summaries, and exception-driven Attention. Because Projects Root is grouped by Initiative rather than by Project Status, lifecycle identity cannot be delegated to the surrounding structure: the Project Row must carry Status itself. Wide layouts show Status glyph plus configured Status name; compact layouts may reduce this to the stable glyph plus tooltip/accessibility text.

Default row semantics are:

- Title is the strongest visual anchor; description is not shown in the row.
- Status uses the shared Status glyph/name grammar and opens the normal legal-transition picker when activated.
- Priority uses the shared compact Priority glyph and picker.
- Progress is derived and read-only. Wide rows may show a thin bar plus percentage; compact rows may reduce to percentage. Undefined Progress displays `—` rather than fabricated 0%/100%.
- Due is the Project's own Due and uses the shared temporal emphasis grammar. It may open the normal date picker.
- Attention is exception-driven rather than a permanently occupied column. No meaningful attention means no visual footprint. Temporal pressure or Cancelled-Project cleanup may expose a compact signal/reason; when that signal identifies a concrete attention bucket/reason, activating it opens the Project Workspace with the corresponding temporary Issue Filter.
- Labels are optional secondary display and use the shared compact dot grammar. They are off by default in the Projects Root row unless enabled through Display.

The row itself is a navigation surface: activating the title or ordinary row area opens Project Workspace. Activating an inline property edits that property and does not trigger row navigation. Progress remains read-only. Right-click or a low-noise overflow affordance opens Project actions such as status/priority/due changes, Initiative movement, and destructive actions where legal. V1 does not require drag-between-Initiative-groups as a second relationship-editing mechanism.

Done and Cancelled Projects remain in their current Initiative group rather than moving to a separate Archive surface. Terminal rows settle below active work and use reduced visual weight. A Cancelled Project with unresolved non-terminal child Issues keeps its cleanup Attention prominent even when the rest of the row is muted.

Default Project-collection ordering is deterministic and explainable:

```text
Project lifecycle category
→ configured StatusDefinition order
→ Priority
→ Due
→ stable deterministic fallback
```

The default lifecycle order is In Progress, Not Started, Done, then Cancelled. V1 does not use activity, Progress, Attention score, manual rank, or persisted focus score as hidden ordering state.

Responsive reduction preserves title and Status identity first, then meaningful exception Attention and Priority. Progress bar may collapse to a percentage; ordinary Due, optional Labels, and other secondary text progressively disappear rather than wrapping the row into a mini details view. An overdue Due may receive higher preservation priority because its current semantic emphasis is exceptional.

### 5.6 Project Timeline

Projects Root may switch from List to a lightweight Timeline that projects the **current temporal evidence** already present in Effective Runtime. Initiative Focus is no longer assumed to share this List/Timeline presentation until its multi-Project workspace closure is complete. It is not a planning Gantt, immutable history, or a second source of schedule truth. Timeline does not infer the business story behind reopen, Issue movement, lifecycle mismatches, or other unusual data combinations; when current data changes, the projection changes with it.

Linear remains the primary visual/layout reference for the Timeline shell, Project rows, Initiative grouping, time axis, and density. Trail intentionally does not copy Linear's planning-timeframe, dependency, resource-planning, or drag-to-reschedule semantics.

Timeline semantics are resolved through four independent questions.

#### 5.6.1 Timeline eligibility

Timeline does not render a Project merely because the Project exists. A Project with **no current child Workflow Issues** is omitted from Timeline even when the Project itself has Due.

For a Project with current child Issues, render it when at least one of the following temporal signals exists:

- at least one current child Issue has `firstStartedAt`;
- the Project is currently in the Started/In Progress lifecycle category;
- at least one currently eligible Project, Milestone, or Issue Due exists;
- every current child Issue is terminal, allowing a closed never-started lifecycle envelope to be derived.

Otherwise omit the Project from Timeline. In particular, a Not Started Project containing only never-started non-terminal Issues and no eligible Due does not appear in Timeline.

Timeline eligibility is a presentation projection only. It does not mutate the underlying filtered Project collection or create a new Project lifecycle fact.

#### 5.6.2 Left-side temporal span

The historical/current span uses one of two evidence modes.

**Execution evidence mode** applies as soon as any current child Issue has `firstStartedAt`. In this mode, Issue `createdAt` no longer contributes to the left-side span:

```text
start = earliest current child Issue.firstStartedAt
```

If any Issue that has `firstStartedAt` is currently non-terminal, the solid execution envelope extends to `today`. Otherwise it ends at the latest current `terminalAt` among Issues that also have `firstStartedAt`.

```text
execution evidence     ━━━━━━━━━━━━━━━
```

A never-started Issue cannot extend the solid execution envelope merely because it later became Completed/Canceled and therefore has `terminalAt`.

The solid bar is an **execution lifecycle envelope**, not continuous work duration, effort, utilization, or a complete event history. Trail retains only minimal lifecycle history, so reopen or later lifecycle changes may alter the current envelope.

**Planning/lifecycle evidence mode** applies only when no current child Issue has `firstStartedAt`. Its origin is:

```text
origin = earliest current child Issue.createdAt
```

`createdAt` alone does not make a Project visible. Once the Project is otherwise Timeline-eligible, the faint span is derived from the current data shape:

- current Started/In Progress Project: faint span from earliest `createdAt` through `today`;
- all current child Issues terminal and never started: faint span from earliest `createdAt` through the latest current Issue `terminalAt`;
- otherwise, eligible Due may provide the second temporal boundary; if at least one eligible Due lies in the future, the left-side faint span runs through `today` and the future portion follows the Today-to-Due rule below; if no eligible Due lies in the future, the faint span may end at the latest eligible Due that is later than the origin;
- if a candidate endpoint is not later than the origin, do not fabricate a reverse or zero-length bar; retain only independently valid markers.

```text
planning/lifecycle evidence     ───────────────
execution evidence              ━━━━━━━━━━━━━━━
```

Project Status does not rewrite Issue lifecycle evidence. A Not Started Project may therefore display a solid execution envelope when its current Issues contain `firstStartedAt`; an In Progress Project may display only faint planning evidence when none of its current Issues has started. Timeline presents the current facts rather than repairing such combinations.

#### 5.6.3 Due markers

Due is a separate marker layer rather than a source of canonical Project start/end dates. A Due is eligible only while its **own corresponding entity** remains non-terminal/currently incomplete:

```text
Project Due
→ visible only while Project is Not Started / In Progress

Issue Due
→ visible only while Issue is non-terminal

Milestone Due
→ visible only while Milestone is not derived complete
```

Milestone has no independent Done/Cancelled workflow Status; completion remains derived from its current Issue scope.

A parent becoming terminal does not silently erase an independently active child's Due. For example, a Cancelled Project hides the Project's own Due, while an unresolved child Issue may still expose its Issue Due. Conversely, Completed/Canceled Issues and derived-complete Milestones contribute no Due marker even if their stored Due remains present.

Past eligible Due values remain visible and may receive normal Overdue emphasis. Timeline does not repair conflicting or unusual dates. Project, Milestone, and Issue Due markers use different visual weight while sharing the same temporal grammar; exact glyphs, collision handling, and dense-marker aggregation remain visual-calibration decisions.

#### 5.6.4 Today-to-Due future span

From the eligible Due marker set, derive:

```text
futureDueHorizon = latest eligible Due later than today
```

When `futureDueHorizon` exists, render a faint future span from `today` to that horizon:

```text
today ───────────────── futureDueHorizon
```

When no eligible future Due exists, render no Today-to-Due span. The future span is independent from the historical execution/planning envelope: if execution ended before today, the gap between the historical endpoint and today remains visually empty rather than being filled with invented activity.

Because eligibility belongs to each corresponding entity, a terminal Project may still show a future span when an unresolved child Issue has an eligible future Due. This is an objective projection of current data, not an attempt to reinterpret the Project's business state.

#### 5.6.5 Query and UI boundary

Timeline projection is derived by Query directly from the current **Effective Runtime** Project/Issue/Milestone state plus temporal context. The current V1 baseline may scan that effective in-memory state directly; it does not introduce a Timeline-specific persisted fact, index, or materialized cache as part of this UI design. Any later performance optimization is a separate concern and must not change Timeline semantics.

Conceptually:

```text
Effective Runtime + today
→ Query Timeline projection
   → Project eligibility
   → left span kind/start/end
   → eligible Due markers
   → future Due horizon
→ UI geometry / viewport / scale
```

UI consumes this projection and maps timestamps to the current Timeline geometry. It does not independently rescan/reinterpret Issue business rules inside rendering components. Month/Quarter/Year scaling, horizontal scrolling, `today` placement, marker layout, and responsive geometry are presentation concerns and must not change the derived temporal meaning.

V1 Timeline is read-oriented. It does not provide drag-to-reschedule, duration resizing, dependency arrows, resource planning, manual Project/Initiative start/end dates, manual positioning, or another hidden planning-timeframe model.

## 6. Project Workspace
### 6.1 Data projection is lifecycle-independent

Project Workspace always describes the actual current Project data. Project lifecycle changes available mutations/presentations, not the child facts shown.

```text
actual Project Workflow Issues
→ Status projection
→ optional Filter visibility
→ automatic ordering inside each visible Status
→ supported presentation for current Project capability
```

A Project can therefore be Cancelled while still showing Backlog/Todo/Started child Issues. Those children are unresolved cleanup work, not hidden merely because the Project was cancelled.

Project Status must not be used as a shortcut for rewriting, filtering away, or fabricating child data.

### 6.2 Lifecycle-dependent workspace role

Project lifecycle has four UI roles:

| Project lifecycle | Workspace role | Layout |
| --- | --- | --- |
| Not Started | planning-only | List |
| In Progress | planning + execution | List / Board |
| Done | settled review | List |
| Cancelled | cleanup/review | List |

The Default Project has no special workspace role. It uses the same lifecycle-dependent Project Workspace behavior, layouts, capabilities, Milestones, and Inspector as any other Project.

### 6.3 Board Status projection

Board is the execution-focused presentation and is available only for In Progress Projects.

Its visible Status projection contains:

```text
Unstarted   → default presentation example: Todo
Started     → default presentation example: In Progress
Completed   → default presentation example: Done
```

Backlog and Canceled work do not appear as normal Board columns.

If Workspace configuration defines multiple concrete Issue StatusDefinitions inside one included category, Board preserves those concrete configured Statuses and configured order rather than collapsing Domain identity into hard-coded strings.

Dragging an Issue card across columns means **Status change only**. Same-column drag does not create a persisted manual order.

Board does not become a creation-by-column mechanism. New normal Workflow Issues are always created in Backlog, so a Todo/Started/Done column `+` must not silently create directly into that Status.

### 6.4 List Status projection

List is the complete planning/review presentation and includes the full Workflow Issue lifecycle.

Default category order is:

```text
Completed
Started
Unstarted
Backlog
Canceled
```

With default Status names this reads naturally as:

```text
Done
In Progress
Todo
Backlog
Cancelled
```

Concrete StatusDefinitions retain configured order inside the relevant category.

Status sections may be collapsible UI state. Collapse state is presentation state, not Domain data.

### 6.5 Issue Filter in Project Workspace

The Filter in Project Workspace answers only:

> Which Issues from this Project collection are visible?

It uses Trail's simplified shared Filter interaction/presentation model. Projects Root uses the same primitive with a smaller Project-specific property registry; Initiative Focus will reuse the same mechanism once its final collection scope is frozen.

Project Workspace filter choices are based on supported existing Issue facts and useful derived buckets, for example Status, Priority, Milestone, Cycle membership, Labels, Due, and Estimate where the current consumer supports them. The exact small cross-surface Filter interaction grammar remains part of the final UI closure. Trail does not expose Linear's advanced filter builder, a generic operator language, nested boolean builder, or reusable query DSL merely to power these page filters.

A filter does not:

- redefine Status grouping;
- define ordering;
- mutate entity properties;
- seed arbitrary properties during creation;
- justify new canonical data fields.

Milestone and derived attention entries may apply a temporary Issue Filter in Project Workspace as a navigation shortcut. The resulting filter remains represented by the normal Filter UI and is cleared there rather than maintaining a second hidden Inspector filter state.

### 6.6 Workflow Issue creation and default Project selection

Global Capture and Project-local creation remain separate intents:

```text
Navigation Capture
→ Triage Issue

Project-local Create Issue
→ Workflow Issue
→ current Project relation
→ default Issue Backlog StatusDefinition
```

Any context-less surface that creates a Workflow Issue directly must also submit an explicit Project relation. Its Project picker may initialize to the Workspace Default Project when that Project can legally accept the new Backlog Issue. If the Default Project is absent or not a legal target, no hidden fallback or lifecycle rewrite occurs; the user chooses another legal Project before submission.

When Triage Accept chooses **Issue**, it opens the normal Create Issue flow and therefore follows exactly this same creation contract: Project is required, the Default Project is only an initial selection when legal, and the selected Project ID is submitted explicitly to Application/Domain. When Triage Accept chooses **Project**, the normal Create Project flow and defaults apply instead. Triage-specific review/Accept composition is defined in Section 10.

The creation surface does **not** seed Todo/Started/Completed Status from a nearby List section or Board column. Every normal Workflow Issue is born in Backlog first; execution advancement is a separate user action subject to Project capability.

In a Not Started Project, the new Backlog Issue can be planned but cannot advance into Todo/Started execution. In an In Progress Project, it can later advance normally. Done/Cancelled Projects do not expose Project-local creation and are not valid default targets for a new non-terminal child under the normal capability rules.

Exact final placement of the create affordance remains a calibration/composition decision; the semantic contract above is fixed.

### 6.7 Automatic ordering

V1 does not expose manual ordering for Project Issues and does not persist rank/position facts solely to preserve UI order.

Within each visible Status, default ordering starts with explicit **Priority**.

Within the same Priority level, ordering should keep related work visually coherent by clustering Milestone- and Label-related Issues instead of interleaving equivalent groups unnecessarily. Within a coherent cluster, existing temporal facts such as Due and `createdAt` provide lower-level ordering signals/tie-breakers.

The exact algorithm remains replaceable behind Query/page-specific ordering policy so later evidence can improve clustering, time weighting, or tie-breakers without changing Domain data, persistence schema, or Issue presentation components.

### 6.8 Effective Project/Issue capability

UI controls are driven by one effective capability projection rather than component-local Status checks.

Conceptually:

```text
Project lifecycle
+ Issue lifecycle
+ relationship/context
+ requested action
→ effective capabilities
→ visible/enabled UI controls
```

High-level Project capability matrix:

| Capability | Not Started | In Progress | Done | Cancelled |
| --- | ---: | ---: | ---: | ---: |
| Read/filter/inspect current child data | yes | yes | yes | yes |
| Create child Issue | yes → Backlog | yes → Backlog | no | no |
| Accept moved-in Backlog Issue | yes | yes | no | no |
| Accept moved-in Todo/Started Issue | no | yes | no | no |
| Edit/plan Backlog child | yes | yes | no | no |
| Advance Backlog → execution | no | yes | no | no |
| Normal Issue workflow | no | yes | no | no |
| Cancel child Issue | yes where legal | yes | normally unnecessary | yes for unresolved cleanup |
| Move child Issue out | yes | yes | yes | yes |
| Create/edit Milestone | yes | yes | no | no |
| Board | no | yes | no | no |

Not Started is therefore **planning-capable, execution-disabled**, not read-only.

If a Not Started Project contains an Issue already in Todo/Started because the Project was reopened from a terminal state, Trail does not rewrite it. Normal execution controls remain unavailable; legal cleanup such as Cancel or Move Out remains available.

A target Project picker also consumes effective capability. If the current Issue cannot legally move to a target Project without changing Status, that target is unavailable. Normal Move never silently rewrites Status.

The Default Project uses this same capability matrix as any other Project. Being the Workspace default never bypasses target legality or changes Issue Status implicitly.

## 7. Issue Row and Board Card

### 7.1 Information hierarchy

Issue Row and Board Card are high-frequency scanning surfaces.

Their priority is:

1. Issue title;
2. compact Priority signal;
3. Milestone identity where present;
4. compact Label identity;
5. Due attention;
6. other explicitly enabled secondary properties.

Status is not repeated inside a Row/Card when the enclosing Status section/column already expresses it.

`createdAt` may participate in ordering but is hidden by default. Description is not shown on Board cards; missing detail belongs to Peek.

### 7.2 List Row

A List Row should remain compact and normally single-line in the main information band.

Conceptually:

```text
[priority/selection slot]  Issue title         ◇ Milestone   ●●   Due
```

The left leading slot may switch from Priority to a selection checkbox on hover/selection, following the low-noise selection pattern used by Linear. Exact mechanics are subject to implementation/accessibility calibration.

The List has more horizontal space than Board, so it may show more optional secondary properties, but the row must not become a table of every available field.

### 7.3 Board Card

Board Card keeps the title dominant and uses compact metadata underneath.

Conceptually:

```text
┌──────────────────────────────┐
│ Issue title                  │
│ optional second title line   │
│                              │
│ priority  ◇ Milestone  ●● Due│
└──────────────────────────────┘
```

Cards do not become mini Details views. Description and rarely scanned fields stay out of the default card.

### 7.4 Shared metadata grammar

The same property uses the same visual identity on Row, Card, Peek, Inspector, Filter, and Picker.

#### Status

Use one stable Status glyph/shape system plus semantic Status color. Dense surfaces may show only the symbol when surrounding structure already carries the exact Status; pickers/editors include explicit names.

#### Priority

Use a compact priority glyph inspired by the mature Linear pattern rather than text badges such as `HIGH` or `URGENT`.

Dense surfaces show the glyph. Peek, Inspector, Filter, Picker, tooltip, and accessibility text can show `glyph + value`.

#### Milestone

Milestone keeps its **name** because the name is meaningful context.

Preferred compact form:

```text
◇ Milestone Name
```

A Milestone is not reduced to an anonymous colored marker.

#### Label

Dense Row/Card presentation uses **colored dots** rather than label-name chips:

```text
● ● ●
```

Hover/focus on a Label dot provides a small tooltip with the Label name. Precise selection or editing surfaces such as Filter, Picker, Peek, and Inspector show the same color dot together with the Label name.

V1 does not add a canonical `Label.color` field solely for this presentation. Label display color is selected deterministically from a limited Trail palette using stable Label identity so the same Label has the same color everywhere. If future real use establishes manual Label color as independent product value, it can be promoted to explicit Label configuration later.

#### Due
Due uses a stable time/calendar visual identity plus semantic emphasis derived from canonical Due + current time.

Normal future dates remain muted. Due Soon, Today, and Overdue may increase semantic emphasis. This presentation does not create duplicate persisted urgency state.

#### Estimate

Estimate uses a stable compact glyph + value where shown. It is optional on Row/Card and more naturally available in Peek/Inspector.

#### Cycle

Cycle uses a stable Cycle glyph + value where precise context is useful. It is not a default Project Row/Card property unless later visual evidence justifies it.

### 7.5 Labels and metadata overflow

Board Cards must not grow vertically in proportion to Label count.

Dense surfaces show a bounded number of Label dots and a compact overflow indicator when needed. Full Label names remain available through tooltip, Peek, Inspector, Filter, or Picker.

## 8. Peek, Full Item, and Inspector

These surfaces express different information depth rather than three differently sized versions of one universal details component.

```text
Row / Card
→ scan

Peek
→ read hidden detail without leaving the collection

Full Item
→ deeply edit the entity/content

Inspector
→ structured information/actions for the current primary context/entity
```

### 8.1 Inspector reads entity meaning, not physical Markdown metadata

Inspector is built from the meaningful effective entity presentation projection, not by rendering whichever fields happen to appear in the entity's HTML JSON metadata block.

Conceptually:

```text
canonical Domain facts
+ effective Runtime relationships
+ query-derived information
+ current lifecycle/context
→ entity presentation projection
→ Inspector
```

Consequences:

- a value may appear in Inspector even when physically stored on another authoritative record, for example current Cycle membership derived from `Cycle.issueIds`;
- physical identifiers, carrier paths, markers, parser ranges, and implementation timestamps do not appear merely because they exist;
- derived Progress/Attention may appear even though they are not persisted fields;
- storage relationship direction does not dictate the UI's presentation direction;
- Inspector must not become a runtime/debugger dump.

General rule:

> Having data is not sufficient reason to display it.

Useful semantic Inspector sections are:

```text
Properties
→ editable canonical facts

Context
→ important relationships where useful

Progress / Attention / other summaries
→ explainable derived information

Info
→ read-only lifecycle/history only when it has real product value
```

### 8.2 Peek

Peek exists primarily to show Issue detail that List/Board intentionally omit.

It is:

- transient;
- non-modal;
- primarily read-oriented;
- focus-driven;
- opened/closed without navigating away from the current collection;
- hosted as a floating Trail surface inside the main workspace rather than by repurposing Obsidian's persistent right sidebar.

Peek may show title, full lightweight description, Status, Priority, Milestone, full Label names, Due, Estimate, Cycle, Project where useful, and retained temporal facts when genuinely useful for inspection.

Peek is not the primary editing surface. It does **not** change the persistent Inspector target.

Space/Esc and adjacent-item keyboard browsing are desirable mature patterns, with exact shortcut binding verified during implementation.

### 8.3 Issue Full Item

Full Item is entered when the user intends to edit/deeply work on an entity rather than merely inspect it.

In V1 it replaces the main content inside the same Trail tab. It does not normally create a new Obsidian tab.

Issue Full Item uses:

```text
Main View
→ inline-editable title
→ lightweight Markdown body/content
Right Inspector
→ Status
→ Project
→ Priority
→ Milestone
→ Labels
→ Due
→ Estimate
→ Cycle/context as applicable
```

The title is directly editable without permanent Edit/Save/Cancel chrome.

The body is an Obsidian-like Markdown editing surface that reuses mature Obsidian/CodeMirror conventions where possible: keyboard behavior, cursor/selection, Markdown syntax, lists/checklists, code, wikilinks, and host context-menu expectations. Trail owns the entity/body boundary; it is not a native whole-note leaf because an Issue may be an embedded H2 record inside a managed carrier.

Markdown checklists inside Issue body remain ordinary execution notes/steps. They are not Sub-issues, Board items, Status-bearing entities, or automatic Progress contributors.

Native `[[wikilinks]]` can connect an Issue body to ordinary Obsidian notes. Long-form knowledge remains in those notes rather than creating a second Trail document domain.

Property edits in Inspector must not remount/reload the whole Full Item editor or destroy cursor/scroll state.

Physical heading translation between user-facing body heading depth and reserved managed H1/H2 structure remains deferred until the editor implementation is closed.

### 8.4 Persistent Inspector targeting

Inspector follows the **current primary Trail location/entity**, not transient hover, keyboard focus, multi-selection, or Peek target.

Examples:

```text
Project Workspace  → Project Inspector
Initiative Focus   → Initiative context/details surface (final composition pending)
Current Cycle      → Current Cycle Inspector
Historical Cycle   → Historical Cycle Inspector
Issue Full Item    → Issue Inspector
```

Peeking Issue B while remaining in Project A Workspace leaves Project A Inspector visible. Entering Issue B Full Item changes the editing context and may show Issue B Inspector.

Inspector property rows reuse the same visual grammar and picker primitives used everywhere else. Browsing state should be symbol-heavy and compact; precise editing state includes explicit value names.

## 9. Project Inspector

Project Inspector is the persistent structured side view for the current Project. It complements the main Issue collection rather than duplicating Project description or building a separate Overview page.

Target composition:

```text
Project Inspector

Properties
────────────
◉ In Progress
◇ Initiative A
▥ High
● ●
◷ Sep 15

Progress
────────────
████████████░░░░░░    67%

Attention
────────────
██ ███ █████████

Milestones                                  +
────────────
◇ Foundation                           100%
◇ UI baseline                           67%
◇ Release                                —
```

### 9.1 Properties

Normal Project property rows are:

- Status;
- Initiative;
- Priority;
- Labels;
- Due.

Project title/description remain narrative/main-context content rather than duplicating every field in Inspector.

Project metadata such as title/description/Initiative/Priority/Due/Labels can remain editable in terminal Projects where the operation is organization/correction rather than resumed execution.

### 9.2 Project Status dropdown and transition matrix

Status is changed by clicking the visible Project Status row and choosing among legal destination statuses. There is no need for a separate lifecycle wizard when a normal dropdown can present the legal actions clearly.

The category-level transition matrix is:

```text
Not Started → In Progress | Cancelled
In Progress → Done | Cancelled
Done        → Not Started | In Progress
Cancelled   → Not Started | In Progress
```

Concrete StatusDefinitions belonging to the legal target categories can be presented according to configured names/order.

`In Progress → Not Started` is unavailable.

Selecting Done is guarded by Domain rules. If non-terminal child Issues remain, the option must explain why completion is unavailable and offer a direct route/filter to those blocking Issues rather than silently completing/cancelling them.

Reopening Done/Cancelled simply means selecting a legal Not Started or In Progress status. No hidden previous status is restored.

Changing Project Status never rewrites child Issue Status or relations.

### 9.3 Progress

Project Progress uses a Linear-like simple horizontal progress bar plus compact percentage:

```text
Progress
────────────────────
████████████░░░░░░    67%
```

The bar answers only:

> How much current non-cancelled Project work is complete?

Computation is owned by Domain/Query:

```text
Completed
──────────────
all current child Issues except Canceled
```

Canceled Issues are ignored completely. Started work receives no partial completion weight; Estimate/Priority/Due do not weight the result.

If the effective denominator is empty, display `—`/unavailable rather than fabricated 0%/100%.

Hover/focus may expose exact counts such as `8 / 12 completed`. The default Inspector need not spell those counts out in permanent prose.

Project Status remains independent. An In Progress Project can legitimately show 100% until the user explicitly marks the Project Done.

### 9.4 Temporal Attention bar

Temporal Attention is a second horizontal visualization with a different question from Progress:

> Of unfinished work that already has a Due, how is time pressure distributed?

Input:

```text
child Issue
AND StatusCategory not Completed/Canceled
AND Due present
```

Backlog participates whenever it has Due; whether an Issue has started is irrelevant.

The mutually exclusive segments are:

```text
[ Overdue ][ Due This Week ][ Later Due ]
```

Done/Canceled/Due-less Issues do not participate.

Default rendering is graphical and low-text, for example:

```text
Attention
────────────────────
███ █████ ███████████
```

Semantic color/emphasis distinguishes Overdue, Due This Week, and Later Due. Exact colors are calibrated with the dark design system rather than hard-coded by this document.

Permanent legends/count sentences are not required in the compact Inspector. Hover/focus provides exact segment name/count/accessibility text. Clicking a segment applies the corresponding temporary Issue Filter in Project Workspace so the user can immediately inspect the work represented by that segment.

This is not a persisted `Health` score and is not a Status chart.

### 9.5 Broader Project Attention and future Health

Temporal Attention is one projection, not the complete definition of “things needing attention.”

A Cancelled Project with unresolved non-terminal child Issues should expose a compact Project-attention indicator/reason because the Project lifecycle has ended while work still needs disposition. Clicking the signal can filter to unresolved child Issues.

Future Health may combine explainable evidence such as Progress, temporal pressure, Project/Milestone Due, lifecycle context, and activity. The score/weighting is intentionally not frozen until an actual consumer such as Home Project focus needs it.

Do not persist `health`, `healthScore`, or `focusScore` merely to support future ranking.

### 9.6 Milestone summary and quick filter

Project Inspector Milestones are compact Project checkpoint summaries:

```text
Milestones                                  +
──────────────────────────────────────────────
◇ Foundation                           100%
◇ UI baseline                           67%
◇ Release                                —
```

Rules:

- Milestone name is always visible; it is not reduced to an anonymous marker.
- Progress uses the same simple Completed/non-Canceled formula within the Milestone's associated Issue scope.
- No manual completion checkbox/status exists.
- No persisted manual Milestone ordering/rank is introduced.
- If ordering needs a default, use existing semantics such as Due followed by a stable deterministic fallback rather than a new rank field.

Clicking a Milestone applies a temporary Milestone filter to the current Project Issue collection; it does not navigate into a permanent Milestone workspace.

The active filter is represented by normal Filter UI/chips. Inspector does not maintain a second private filter state.

### 9.7 Milestone create/edit/delete

While Project capability allows Milestone planning (Not Started/In Progress), the section header may expose a compact `+`.

Quick create stays small:

```text
New milestone

Name
Due
Description

Progress     read-only/derived where shown
```

Owning Project is not normally reparented.

Deleting a Milestone preserves its Issues. Confirmation should explain that linked Issues remain and lose/replace the Milestone relation; it must not imply cascade deletion of Issues.

In Done/Cancelled Projects the Milestone section remains readable summary context; create/edit/delete/assignment affordances are not normally shown.

### 9.8 Delete Project

Delete is not Project Status and does not belong inside the Status picker.

It lives in low-frequency Project overflow/destructive actions and requires confirmation because its relation effects are material. If the Project owns Workflow Issues, deletion requires an explicit legal replacement Project:

```text
Delete Project
├─ preserve child Workflow Issues
├─ move them to the selected replacement Project
├─ clear their old Project-scoped Milestone relation
├─ remove Project-scoped Milestones
├─ remove Project
└─ if it was the Default Project, clear defaultProjectId
```

The replacement picker may initially select the current Default Project only when it exists, is not the Project being deleted, and can legally accept the affected Issues under normal Project capability rules. Otherwise the user must choose another legal Project. Delete never silently changes Issue Status merely to make a replacement Project acceptable. If the Project has no child Workflow Issues, no replacement Project is required.

Deleting the current Default Project is otherwise an ordinary Project deletion. The replacement used for its Issues does not automatically become the new Default Project, and the sidebar shortcut disappears after the Default Project reference is cleared.

The confirmation should state useful concrete consequences/counts and the selected destination rather than generic dramatic wording. Recovery/undo claims must match actual implementation capability.

## 10. Triage

Triage is a Linear-inspired intake/review queue, not a normal Workflow Issue workspace. Although Domain/Data represent each entry as an Issue in Triage context, the UI presents a **Triage entry** and a Triage-specific review workflow rather than a reduced Workflow Issue surface.

### 10.1 Queue and Review Set

Every active Triage entry remains part of the Triage collection regardless of whether its review Due is in the past, near future, or far future. Review Due means “review again no later than this time”; it does not hide the entry before that time. The user may always browse, search, filter, open, edit, defer, accept, or delete a future-due entry when an idea arrives early.

Default Triage ordering is:

```text
Review Due ascending
→ Priority
→ stable deterministic fallback
```

V1 also derives a lightweight **Review Set** to answer “how far should I prioritize reviewing now?” without turning that suggestion into collection eligibility:

```text
Review Set
= every active Triage entry with Review Due <= now + 7 calendar days
+ earliest remaining entries in normal ordering until at least 10 entries are included
```

If fewer than 10 active entries exist, the Review Set contains all of them. If more than 10 entries are already due within the seven-day horizon, all of those entries are included. The Review Set is derived presentation/query state; it is not persisted rank, attention, snooze, or lifecycle state.

The UI may expose a quiet summary such as `10 to review` and a subtle boundary/end-of-target treatment in the unfiltered queue. Completing the Review Set never prevents continuing into later entries; sequential review can continue through the whole active Triage collection.

### 10.2 View Bar, Filter, and Display

Triage uses the shared collection View Bar with no layout toggle:

```text
Filter                                             Display
```

Triage Filter supports only:

- Review Due;
- Priority;
- Labels.

Triage uses the same simplified shared Filter interaction as the other V1 collections, with only the property registry above. The final small shared grammar for popover flow, value conditions, temporal handling, applied-filter representation, clear/reset, and keyboard/focus behavior is still part of the remaining UI closure; Triage does not invent extra operators or Triage-only syntax. `Review Due` retains Triage's review meaning while using the shared temporal treatment once that grammar is frozen.

Filtering changes only which active Triage entries are visible. It does not redefine ordering, mutate properties, or recompute the global Review Set against the filtered subset. When a Filter is active, the UI should avoid presenting the unfiltered Review Set boundary as though it were a boundary in the filtered list; a global `to review` summary may remain clearly global.

`Display` is intentionally constrained and owns only supported ordering choices. V1 exposes Review Due and Priority ordering choices and does not offer Group/Sub-group, Board, Timeline, manual ordering, or a generic Sort builder. Default ordering remains Review Due ascending, then Priority, then stable fallback.

### 10.3 Triage Row

Triage Row is a product-specific scanning surface that may reuse shared row/property primitives but is not modeled visually as a Workflow Issue Row with fields removed.

Conceptually:

```text
[priority/selection slot]  Title                    ●●   Review Due
```

Title is the strongest visual anchor. Priority, Labels, and Review Due use the same stable visual identities and picker primitives used elsewhere. Description/body stays out of the compact row and belongs in the Review Surface.

Triage Row does not show Workflow Status, Project, Milestone, Estimate, or Cycle because those are not part of Triage review semantics.

### 10.4 Triage Review Surface

Opening a Triage Row enters a Linear-like sequential **Triage Review Surface** inside the same Trail workspace. It is non-modal and keeps the queue/context available rather than navigating to Workflow Issue Full Item or repurposing the persistent right Inspector.

The surface prioritizes intake content first:

```text
previous / next             position in active collection

Title

Priority     Labels     Review Due

Description / body

Accept       Defer      Delete       ···
```

Title and lightweight Markdown description/body are directly editable without a permanent Edit/Save/Cancel shell. Priority, Labels, and Review Due are compact enrichment properties. Exact review-pane width, side/below placement, and responsive geometry are full-shell calibration decisions; the queue/review interaction contract is fixed.

Adjacent-item navigation is first-class so a user can process a review session continuously. Completing a successful Accept, Defer, or Delete selects the next entry according to the current visible/ordered queue when one exists.

### 10.5 Accept

`Accept` is the primary Triage disposition. It means “formalize this intake,” not “turn this record into a Workflow Issue.”

Activating or hovering/focusing Accept progressively discloses the two target kinds:

```text
Accept
├─ Issue
└─ Project
```

A direct Accept activation opens the same two-target disclosure; Trail does not silently choose Issue as the default. In wide layouts the choices may disclose beside the button; constrained layouts may disclose below it. The interaction should reuse the shared menu/popover mechanics rather than create a special Triage widget.

Choosing **Issue** opens the standard Create Issue modal used elsewhere. Choosing **Project** opens the standard Create Project modal. There is no Triage-specific Accept form.

V1 passes only these automatic initial values into either normal create draft:

```text
Title
Description / body
```

Triage Priority, Labels, and Review Due are not automatically copied. The normal target form may still let the user explicitly choose its ordinary properties before confirmation.

For Issue, standard creation semantics still require an explicit legal Project and create the Workflow Issue in Backlog; the current Default Project may initialize the normal Project picker only when legal. For Project, the ordinary Project creation defaults and validation apply.

Canceling the create modal leaves the Triage entry unchanged. After target creation succeeds, the source Triage entry is removed through the normal destination-first mutation path and the Review Surface advances to the next entry.

### 10.6 Defer

Defer changes Review Due on the same Triage entry. It does not create Snooze/Deferred state and does not hide the entry from Triage.

Primary activation uses the high-frequency default:

```text
Defer
→ Review Due + 7 calendar days
```

Hover/focus disclosure offers alternate normal targets:

```text
Tomorrow          +1 day
This weekend
Next weekend
+1 month
Pick date…
```

Calendar shortcuts resolve through the shared temporal/timezone policy. After Defer, the entry is immediately re-ordered by the normal Triage ordering. Because visibility is independent from Due, it remains browseable and can still be processed before the new Due; it may also remain inside the Review Set when the minimum-size rule pulls it into the current review target.

### 10.7 Delete, context actions, and shared interactions

Delete replaces any V1 Discard concept. V1 does not preserve a separate discarded-Triage history or status merely for possible future similarity use.

Delete is available from the Review Surface with lower visual weight than Accept/Defer and is also available from the normal `···`/right-click context menu. Destructive confirmation/recovery treatment should follow the shared interaction system and actual undo capability rather than a Triage-only deletion framework.

Triage participates in Trail's shared Selection, Context Menu, Command Menu, keyboard, and future Bulk Action mechanisms where those capabilities have real consumers. It does not define a second selection grammar or Triage-specific command system; exact bulk-action availability remains owned by the shared consumer-driven interaction closure rather than this page inventing parallel mechanics.

## 11. Cycles

Cycles is a focused planning/execution workspace over a Cycle-owned set of Workflow Issue IDs. It reuses the established Issue collection, Row/Card, Filter, Selection, Peek, Context Menu, and Inspector primitives rather than introducing a parallel Cycle work-item system.

### 11.1 Navigation and location

The single sidebar `Cycles` row does not expand Current/Previous children.

When a Current Cycle exists, activating `Cycles` opens that Current Cycle directly:

```text
Cycles / Aug 25 – Sep 7
```

Current Cycle identity uses its date range rather than a separate persisted Cycle title. The Location Bar may expose `History`, `Details`, and low-frequency overflow actions without turning the page into a dashboard.

When no Current Cycle exists, the `Cycles` location presents a compact `Start Cycle` affordance and secondary access to History. V1 does not show an Upcoming/Future Cycle because no such Domain object exists.

History is reached as a secondary Cycles location:

```text
Cycles / History
Cycles / History / Aug 11 – Aug 24
```

### 11.2 Current Cycle collection

Current Cycle scope is exactly the live Workflow Issues whose IDs are in the Open Cycle membership. The Issue records remain authoritative for Status, Project, Milestone, Priority, Estimate, Labels, Due, title/body, and lifecycle facts.

Default layout is **Board**, with List available through the normal single layout toggle.

Cycle Board reuses the same execution Status projection as Project Board:

```text
Unstarted
Started
Completed
```

Backlog and Canceled Cycle members remain valid members but do not become normal Board columns. They remain visible in Current Cycle List. Dragging between Board columns means Status change only and remains subject to the owning Project's normal capability rules.

Cycle Board uses **Project swimlanes** as the fixed secondary presentation dimension. Project swimlanes are not drag targets and do not create a second way to mutate Project relationships. Because the enclosing swimlane already establishes Project context, Board Cards do not repeat Project identity.

Conceptually:

```text
                  Todo           In Progress       Done

Project A         Issue A        Issue B           Issue C
                  Issue D

Project B                        Issue E           Issue F
```

Current Cycle List reuses the full Workflow lifecycle projection from Project List. Within the same Status, Issues from the same Project should remain visually coherent rather than interleaving unnecessarily. Project is displayed as normal row metadata because List has no Project swimlane.

Conceptually:

```text
Done
Issue A          Project A
Issue B          Project A
Issue C          Project B

In Progress
Issue D          Project A
Issue E          Project C
```

Project clustering is automatic presentation/ordering, not a nested Project group or persisted manual rank.

### 11.3 Filter and Display

Current Cycle Filter supports:

- Status;
- Project;
- Priority;
- Milestone;
- Labels;
- Due;
- Estimate.

Cycle uses the same simplified shared Filter interaction as Project Workspace and Triage, with the property registry above. The final small cross-surface grammar remains part of the remaining UI closure rather than copying Linear's advanced filter builder. `Project` is useful here because Cycle scope may cross Projects. `Cycle` itself is not a Current Cycle filter field because the current location already supplies that scope.

Filtering changes visibility only. It does not change Cycle membership, Board Status projection, Project swimlanes, automatic List clustering, or Issue properties.

`Display` controls the supported secondary metadata of the current List/Board presentation; it does not become a generic Group/Sub-group or Sort builder. Project is not a Board Card property because the fixed swimlane already expresses it. List may show Project together with the shared optional Issue metadata.

Historical Cycle uses the same Filter field registry because its rows resolve the same current live Issue facts. Its `Display` controls flat List metadata only.

### 11.4 Membership discovery and actions

Cycle membership is explicit selection, not a Workflow property mutation. Adding/removing membership changes the Open Cycle's membership only and never changes Issue Status, Project, Milestone, Priority, Estimate, Labels, or Due.

Current Cycle provides a low-noise `Add issues` flow using the shared searchable/filterable Issue selection grammar. To keep Cycle-level discovery focused on current execution, this entry point proactively surfaces non-terminal Workflow Issues from In Progress Projects and excludes Issues already in the Current Cycle. This is only a discovery policy; it is not Domain membership legality.

Project Workspace remains an equally important planning entry point. In a Not Started Project, a Backlog Issue may be explicitly added to the Current Cycle from that Project's Issue context/selection even though it was not discoverable from Cycle-level `Add issues`. The Issue remains Backlog and the Project remains Not Started. It therefore appears in Current Cycle List and will appear in Board only after ordinary Project capability later permits a Status that belongs to the Board execution projection.

Issue context/selection surfaces reuse shared actions:

```text
not in Current Cycle  → Add to current cycle
in Current Cycle      → Remove from current cycle
```

Current Cycle itself exposes `Remove from cycle` through normal row/card context and shared Selection/Bulk mechanisms. V1 does not need a generic multi-Cycle property picker because at most one Cycle is Open and there are no future Cycle targets.

Later Issue Status or Project changes do not implicitly add/remove membership. A Project move automatically changes the Cycle Board swimlane/List Project metadata because those presentations resolve current Issue facts; `Cycle.issueIds` remains unchanged.

### 11.5 Start, Close, and Next Cycle

`Start Cycle` is explicit and immediate. It records `startedAt = now`, lets the user confirm/edit `plannedEnd`, and may start with an empty Issue selection. The existing Cycle default planning rule supplies the initial end suggestion; V1 does not select a future start date or create future Cycle records.

The Start flow may offer the same focused Issue selector as Current Cycle `Add issues`. Starting without members is valid; work can be added afterward.

Reaching `plannedEnd` changes presentation such as time-remaining/overdue context but does not auto-close the Cycle.

`Close cycle` is an explicit lifecycle action. Confirmation may summarize useful current counts, but the mutation itself only records actual `endedAt` and freezes final membership:

```text
Close Cycle
→ endedAt = now
→ keep final issueIds
→ change no Issue facts
→ Current Cycle = none
```

Closing does not automatically start another Cycle.

A later `Start next cycle` uses the normal Start Cycle flow with one convenience: members of the previous Cycle that are **currently non-terminal** may be initially selected as carry-over candidates. The user can deselect any candidate, add other Issues, or cancel the flow and remain without a Current Cycle. Candidate state is calculated from current Issue facts when the flow opens; Trail does not save an unfinished-at-close snapshot or perform automatic rollover.

### 11.6 Progress and Effort

Current Cycle uses the same simple Progress semantics as Project/Milestone over the current live membership:

```text
effective members = Current Cycle members except Canceled
completed members = effective members in Completed

Progress = completed / effective
```

If there are no effective members, Progress is unavailable rather than fabricated as 0%/100%. Started work receives no partial credit and Estimate does not weight Progress.

`Effort` is a separate live aggregate:

```text
Effort = sum(Estimate of every Cycle member whose Estimate is present)
```

Every member with a present Estimate contributes regardless of Status. Missing Estimate contributes nothing. Effort is not named Capacity/Velocity/Success and has no forecasting meaning.

A Current Cycle page keeps these summaries lightweight so the Issue collection remains primary. A compact context line may show Progress/count/time remaining; the persistent Cycle Inspector carries the fuller summary.

### 11.7 Cycle Inspector

Current Cycle Inspector is intentionally smaller than Project Inspector:

```text
Cycle
Aug 25 – Sep 7
10 days left

Progress
────────────────
████████████░░░░    67%

Scope
12 issues

Effort
27

Info
Started     Aug 25
Ends        Sep 7

Close cycle
```

`startedAt` is read-only actual history. `plannedEnd` may be edited while the Cycle is Open. Progress, Scope, and Effort are live derived summaries and are never stored back as Cycle fields.

Historical Cycle Inspector is read-oriented:

```text
Cycle
Aug 11 – Aug 24

Scope
12 issues

Effort
31

Info
Started       Aug 11
Planned end   Aug 24
Closed        Aug 24
```

Historical Effort is still a live aggregate of the current Estimates of the retained final members; it does not mean “Effort at close.” Historical Inspector does not need to emphasize Progress because Trail does not preserve close-time Issue state and History is not an analytics surface.

### 11.8 Historical Cycles

History is passive final-membership history rather than a performance dashboard.

The History list is chronological and compact. A row needs only stable Cycle identity/context such as date range, final member count, and optionally actual close date; it does not display predictive Capacity, Velocity, Cycle Success, or a stored Progress result.

Opening a Historical Cycle produces a **List-only flat Issue collection**. It has no Status sections, Project grouping, Board, Project swimlanes, or editable membership.

Conceptually:

```text
Cycles / History / Aug 11 – Aug 24

12 issues · Effort 27

Filter                                      Display

Issue A     Project A     In Progress    3    ●●
Issue B     Project A     Done           5    ●
Issue C     Project B     Backlog        —
Issue D     Project C     Cancelled      2
```

Status and Project are ordinary row fields. Other shared fields such as Priority, Milestone, Labels, Due, and Estimate may be shown through the normal Display rules. The list remains visually flat even when ordering keeps related Project work coherent.

Historical Cycle membership is the only retained Issue-level Cycle history. Every displayed Issue property is resolved from the current live Issue record, so a later Status, Project, Estimate, Label, or Due change is reflected when the Historical Cycle is opened. Trail deliberately does not label those values as the state “at close.”

Historical Cycle retains normal Issue inspection/navigation actions such as Peek/Full Item where current Issue/Project capability permits them, but it exposes no Add/Remove Cycle-membership action.

## 12. Responsive Behavior

Trail must work across variable Obsidian pane widths using progressive disclosure rather than a second mobile layout.

General priority:

- preserve current location before breadcrumb ancestry;
- preserve title before secondary metadata;
- preserve semantic icons before repeated text labels when meaning remains clear;
- collapse/overflow low-priority actions before forcing horizontal page overflow;
- compress Label display before increasing Card height without bound;
- keep exact text available through tooltip, picker, Peek, Inspector, and accessibility labels;
- preserve Progress/Attention semantic readability even when exact numeric/tooltip detail moves behind interaction;
- let the right Inspector collapse through normal Obsidian host behavior rather than building a second custom pane system.

Exact breakpoints remain visual-calibration decisions.

## 13. Remaining V1 UI Design Closure

The core Project Workspace, Projects Root, Triage, and Cycle page semantics are substantially resolved, but V1 UI is **not yet frozen**. The following product-facing interaction answers must be closed before Trail treats the whole V1 UI authority as complete:

- **Creation surfaces** — Quick Capture plus the standard Create Issue, Create Project, and Create Initiative compositions that existing flows already reference;
- **Simplified shared Filter** — one intentionally small Trail-specific interaction grammar shared by Project/Issue/Triage/Cycle consumers, without copying Linear's advanced filter/view-builder system;
- **Shared interaction system** — Selection, Bulk Actions, Context Menu, Command Menu, keyboard interaction principles, and user-visible optimistic/pending/failure/recovery feedback;
- **Initiative Focus** — confirm the multi-Project project-like workspace composition, with the current working direction favoring reuse of Cycle-style multi-Project Issue List/Board mechanics and explicit Project context rather than the old duplicate Project-summary List/Timeline assumption;
- **Home** — close the V1 composition and interaction of Date/Time, Current Cycle Summary, Triage Summary, Projects/Initiatives Summary, Activity Heatmap, and Weekly Note;
- **Search** — close the global search surface, result composition/grouping, keyboard navigation, activation behavior, and interaction with Peek/navigation;
- **Runtime/Data-Issue feedback** — map `loading`, `refreshing`, `read-only-error`, optimistic pending, mutation failure, and recoverable Data Issue states to coherent user-visible UI;
- **Default Project setter** — provide a lightweight V1 interaction for explicitly setting or replacing the Workspace Default Project after bootstrap without introducing special Project semantics.

These are not implementation-calibration details and are not deferred beyond V1. They remain the next UI-design work before full Formal UI Implementation closure.

## 14. Explicitly Deferred Beyond Current V1 UI Closure

The following product conveniences are deferred and do not block V1 UI freeze or formal implementation of the supported workflows:

- Custom Views user-facing creation/editing/navigation;
- Favorites user-facing navigation and management;
- future Workspace Issues collection;
- final Health formula or Home Project-focus ranking policy beyond the already-defined V1 Home summaries.

Their existing Domain/Data/Workspace-state concepts do not require speculative V1 UI or implementation work.

## 15. Implementation-Time Calibration Decisions

The following may remain replaceable until the relevant real-Obsidian surface exists and can be calibrated against current references:

- final pixel values, color values, opacity, radius, and spacing;
- final icon choice where multiple existing Obsidian/Lucide equivalents are plausible;
- final Label palette and color-assignment function;
- exact lower-level Project Issue ordering/clustering algorithm;
- exact lower-level Cycle List ordering within the resolved Status/Project coherence rules;
- exact default optional Issue property set for Project Workspace/Cycle List vs Board beyond the hierarchy defined above;
- exact final placement/shortcut for Project-local Create Issue, beyond the fixed `create → Backlog` semantic contract;
- exact final placement of Current Cycle `Add issues` and History access within the already-resolved Location/View-Bar responsibility split;
- exact user-facing body-heading mapping required by managed Markdown's reserved H1/H2 structure;
- complete keyboard shortcut bindings once the interaction principles are frozen;
- exact Timeline scale defaults, date-axis geometry, dense Due-marker collision/aggregation, and final visual calibration;
- final full-shell screenshots and calibrated UI measurements.

These calibration items should be resolved against real consumers and host behavior without introducing speculative generic frameworks.

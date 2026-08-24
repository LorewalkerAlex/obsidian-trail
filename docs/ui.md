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
- Peek: <https://linear.app/docs/peek>
- Priority: <https://linear.app/docs/priority>
- Project overview/details: <https://linear.app/docs/project-overview>
- Project milestones: <https://linear.app/docs/project-milestones>
- Due dates: <https://linear.app/docs/due-dates>
- Issue selection: <https://linear.app/docs/select-issues>

For Project Workspace specifically, the useful Linear reference is the **compact project-details + Issue collection interaction**, not Linear's complete Project feature set. For Projects Root and Initiative Focus, current Linear Project/Initiative collection arrangement, density, grouping, and Timeline presentation are the primary visual references. Trail intentionally does not copy collaboration, documents/resources management, Project updates, or a heavyweight Overview/Issues dual-workspace model, and Trail Project filters continue to reuse Trail's Issue Filter interaction model rather than importing a second Linear-specific filter system.

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

Home, Triage, Search, Issues, Projects Root, Initiative Focus, Project Workspace, Cycles, and Full Item locations navigate **inside that Trail tab**. Obsidian tabs are not used as Trail page navigation.

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
Issues
Projects
Cycles
```

`Workspace` is a quiet section label rather than a large all-caps heading.

Search and Capture are high-frequency global actions in the navigation header, not ordinary peer navigation rows. Trail does not show a fake workspace-switcher chevron because V1 has one implicit Workspace.

### 4.2 Workspace entries and Projectless visibility

`Issues` is the Workspace-level browse location for normal Workflow Issues. It includes Project-scoped and Projectless Issues. `No Project` is a relationship/filter/grouping state inside Issue collections, not a synthetic Project and not a separate sidebar entry.

`Projects` is the single top-level entry for Project portfolio browsing and Initiative context. Initiative remains an independent Domain entity, but the UI reaches Initiative Focus through Projects rather than exposing a parallel top-level Initiatives entry. A Project can still be opened directly from Projects Root, Search, Home, or another supported deep link without navigating through Initiative Focus first.

The previously proposed dynamic Project children under `Projects` are removed from the current target navigation. Trail therefore does not need sidebar-specific Project ranking, top-N selection, focus scoring, or activity-decay policy merely to populate navigation. Favorites remain a supported workspace-state concept, but their sidebar presentation is deferred until the Favorites interaction itself is designed.

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
Issues
Projects
Projects / Initiative Alpha
Projects / Initiative Alpha / Project Trail
Projects / Project Personal
```

Breadcrumbs describe Trail product structure, not visit history. Ancestors are navigable; the terminal segment is the current location.

Back/forward history remains an Obsidian/browser host responsibility and is not duplicated in the Trail Location Bar.

The right side contains only actions that belong to the current location/object, such as Inspector/Details toggle, Project context disclosure, or a low-frequency overflow menu when applicable. If a location has no such action, no empty action shell is rendered merely for symmetry.

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

For Projects Root and Initiative Focus, the V1 target is:

```text
Filter        [single List/Timeline toggle]        Display
```

For an In Progress Project Workspace, the V1 target remains:

```text
Filter        [single List/Board toggle]           Display
```

The binary layout switch occupies one control slot rather than two permanent peer buttons. Not Started, Done, and Cancelled Project Workspaces are List-only because Board is an execution workflow surface; they omit the List/Board toggle rather than exposing an unavailable presentation.

Project-collection Filter reuses Trail's Issue Filter interaction model, visual primitives, applied-filter treatment, and temporary view-state behavior. It is not a second filter system copied from Linear. The Project property set is intentionally smaller: Projects Root supports Status, Initiative, Priority, Labels, and Due; Initiative Focus omits Initiative because the current location already supplies that scope. Filtering changes visibility only. It does not define grouping, ordering, or entity mutation.

`Display` is not a generic view builder. In Project collections it controls supported secondary Project-row properties and Timeline presentation choices. In Project Workspace it controls supported secondary Issue Row/Card properties. V1 does not need a generic Group/Sub-group builder, manual ordering, or a generic Sort builder for these surfaces.

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

Clicking the Initiative title enters Initiative Focus. Clicking a Project row opens that Project directly:

```text
Projects Root
├─ Projects / Initiative Alpha
└─ Project Workspace
```

Initiative Focus is the same Project collection grammar with one Initiative scope and no Initiative grouping:

```text
Projects / Initiative Alpha

Filter                 [List / Timeline]       Display

Project A
Project B
Project C
```

The current Initiative may expose lightweight description/context below the Location Bar and a persistent Initiative Inspector through Details. Root and Focus reuse the same Project Row, filter mechanics, automatic ordering, context menu, and List/Timeline presentation. Project and Initiative summary activation navigates; V1 does not add a separate Project/Initiative Peek merely for these collections.

`+ Project` on Projects Root creates a Project with optional Initiative membership. `+ Project` in Initiative Focus creates in the current Initiative context. Low-frequency Initiative creation belongs to a secondary Projects action rather than requiring a separate top-level navigation area.

### 5.5 Project Summary Row

Project Row is the primary scanning unit in Projects Root and Initiative Focus. It stays compact and normally single-line rather than becoming a card or a table of every Project fact.

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

Default Project collection ordering is deterministic and explainable:

```text
Project lifecycle category
→ configured StatusDefinition order
→ Priority
→ Due
→ stable deterministic fallback
```

The default lifecycle order is In Progress, Not Started, Done, then Cancelled. V1 does not use activity, Progress, Attention score, manual rank, or persisted focus score as hidden ordering state.

Responsive reduction preserves title and Status identity first, then meaningful exception Attention and Priority. Progress bar may collapse to a percentage; ordinary Due, optional Labels, and other secondary text progressively disappear rather than wrapping the row into a mini details view. An overdue Due may receive higher preservation priority because its current semantic emphasis is exceptional.

### 5.6 Actual Activity Timeline

Projects Root and Initiative Focus may switch the same filtered Project set from List to a lightweight Timeline. This Timeline is an **actual activity** visualization, not a planning Gantt and not a new source of canonical schedule facts.

Project spans consume the existing Domain-derived activity timeline:

```text
bar start = derived actualStart from relevant Issue lifecycle evidence
bar end   = derived actual work end when available
active work without a derived end extends visually to the current-time marker
```

A Project with no relevant started activity has no fabricated activity span. Project Due is a separate deadline marker rather than the end of the activity bar. Initiative Focus shows the current Initiative's Projects; Projects Root preserves the same quiet Initiative grouping used by List.

V1 Timeline is read-oriented. It does not provide drag-to-reschedule, duration resizing, dependency arrows, resource planning, manual start/end dates, or manual positioning. A small set of time scales such as Month/Quarter/Year may live under Display; exact scale defaults and calibrated geometry remain visual implementation details.

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

Projectless is not a Project UI, but for Issue operation capability it behaves like an execution-enabled In Progress context.

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

It uses Trail's shared Issue Filter interaction/presentation model. Projects Root and Initiative Focus reuse the same filter primitives and behavior with a smaller Project-specific property registry; they do not define a parallel filtering system.

Project Workspace filter choices are based on supported existing Issue facts and useful derived buckets, for example Status, Priority, Milestone, Cycle membership, Labels, Due, and Estimate where the current consumer supports them. Trail does not expose a generic operator language, nested boolean builder, or reusable query DSL merely to power these page filters.

A filter does not:

- redefine Status grouping;
- define ordering;
- mutate entity properties;
- seed arbitrary properties during creation;
- justify new canonical data fields.

Milestone and derived attention entries may apply a temporary Issue Filter in Project Workspace as a navigation shortcut. The resulting filter remains represented by the normal Filter UI and is cleared there rather than maintaining a second hidden Inspector filter state.

### 6.6 Workflow Issue creation

Global Capture and Project-local creation are separate intents:

```text
Navigation Capture
→ Triage Issue

Project-local Create Issue
→ Workflow Issue
→ current Project relation
→ default Issue Backlog StatusDefinition
```

The creation surface does **not** seed Todo/Started/Completed Status from a nearby List section or Board column.

This replaces the earlier idea that a `+` in a Status section/column would inherit that Status. Every normal Workflow Issue is born in Backlog first; execution advancement is a separate user action subject to Project capability.

In a Not Started Project, the new Backlog Issue can be planned but cannot advance into Todo/Started execution. In an In Progress Project, it can later advance normally. Done/Cancelled Projects do not expose Project-local creation.

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

Projectless Issue context resolves to normal execution-enabled Issue capabilities without inventing a synthetic Project.

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
Initiative Focus   → Initiative Inspector
Cycle               → Cycle Inspector
Issue Full Item     → Issue Inspector
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

It lives in low-frequency Project overflow/destructive actions and requires confirmation because its relation effects are material:

```text
Delete Project
├─ remove Project
├─ remove Project-scoped Milestones
├─ preserve child Workflow Issues
├─ move preserved Issues to Projectless
└─ clear their Milestone relation
```

The confirmation should state useful concrete consequences/counts rather than generic dramatic wording. Recovery/undo claims must match actual implementation capability.

## 10. Responsive Behavior

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

## 11. Explicitly Deferred UI Decisions

The following are deliberately not frozen yet:

- final pixel values, color values, opacity, radius, and spacing;
- final icon choice where multiple existing Obsidian/Lucide equivalents are plausible;
- final Label palette and color-assignment function;
- exact lower-level Project Issue ordering/clustering algorithm;
- exact default optional Issue property set for Project Workspace List vs Board beyond the hierarchy defined above;
- exact final placement/shortcut for Project-local Create Issue, beyond the fixed `create → Backlog` semantic contract;
- exact user-facing body-heading mapping required by managed Markdown's reserved H1/H2 structure;
- complete keyboard shortcut map;
- Cycle-specific creation/filter/presentation/capability details;
- Triage-specific Row/detail behavior beyond the shared primitives;
- Issues, Home, Search, and Custom View detailed compositions;
- Favorites navigation presentation and interaction;
- exact Timeline scale defaults, date-axis geometry, and final visual calibration;
- final Health formula or Home Project-focus ranking policy;
- final full-shell screenshots and calibrated UI measurements.

These items should be resolved consumer by consumer, using current Product/Domain/Architecture facts and the visual-reference rules in this document rather than by introducing speculative generic frameworks.

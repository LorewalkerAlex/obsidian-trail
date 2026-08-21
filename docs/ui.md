# Trail UI Design

## 1. Authority and Scope

This document owns Trail's resolved target UI presentation and interaction answers.

It consumes Product, Domain, Data, and Architecture decisions rather than redefining them. Current implementation appearance is not a design authority: existing POC layout, CSS, native controls, page-local navigation, and modal/detail carriers may be replaced when they do not match the target UI.

Trail V1 targets **Obsidian-native architecture with Linear presentation**:

- Obsidian owns the window, tabs, Ribbon, sidebars, splits, resize/collapse behavior, and other host workspace mechanics.
- Linear is the primary visual and interaction reference where Trail has an equivalent responsibility.
- Trail owns product-specific composition, semantics, and the gaps that neither Obsidian nor an existing reusable primitive already solves.
- UI design must not introduce new persisted Domain facts merely to support presentation, ranking, attention, color, or ordering when those answers can be derived from existing facts.

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

Useful current Linear references include:

- UI refresh: <https://linear.app/changelog/2026-03-12-ui-refresh>
- Design-refresh process and header system: <https://linear.app/now/behind-the-latest-design-refresh>
- Board layout: <https://linear.app/docs/board-layout>
- Display options: <https://linear.app/docs/display-options>
- Filters: <https://linear.app/docs/filters>
- Peek: <https://linear.app/docs/peek>
- Priority: <https://linear.app/docs/priority>
- Project milestones: <https://linear.app/docs/project-milestones>
- Due dates: <https://linear.app/docs/due-dates>
- Issue selection: <https://linear.app/docs/select-issues>

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

### 2.2 Reuse before new visual primitives

Trail should not create new glyphs or interaction primitives when an existing mature equivalent is suitable.

Preferred order for icons and primitive mechanics:

```text
Obsidian-native capability / icon
→ existing Lucide or other already-adopted mature primitive
→ semantic equivalent matching current Linear usage
→ custom Trail primitive only when no existing option fits
```

When Linear uses a recognizable visual concept and an equivalent existing Obsidian/Lucide glyph is available, Trail should use the existing glyph and tune size, stroke, opacity, state, and placement to match the target presentation rather than drawing a new icon set.

### 2.3 Stable visual identity for Domain concepts

The same Domain concept uses the same visual identity everywhere. Information density may change by surface, but the symbol itself must not change.

For example, Priority must not be a bar glyph in a List, a text badge in Peek, and a flag in Inspector. It remains the same Priority glyph; denser surfaces may show only the glyph while precise selection/editing surfaces add the text value.

General rule:

> In high-frequency scanning surfaces, prefer an established glyph, shape, or color over repeated text when the meaning remains clear. In selection, editing, tooltip, first-use, and accessibility contexts, provide explicit text.

## 3. Host Composition

### 3.1 One primary Trail tab

V1 uses one primary native Obsidian tab/leaf for Trail. Its native tab identity remains **Trail**.

Home, Triage, Search, Projects Root, Initiative Focus, Project Workspace, Cycles, and Full Item locations navigate **inside that Trail tab**. Obsidian tabs are not used as Trail page navigation.

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
Projects
  dynamic Project shortcuts
Cycles
```

`Workspace` is a quiet section label rather than a large all-caps heading.

Search and Capture are high-frequency global actions in the navigation header, not ordinary peer navigation rows. Trail does not show a fake workspace-switcher chevron because V1 has one implicit Workspace.

### 4.2 Project shortcuts

Project children under `Projects` are navigation shortcuts, not the canonical Project hierarchy and not Favorites.

The sidebar should show a bounded set of Projects that are currently most relevant rather than every ongoing Project or a manual user-maintained ordering.

Ranking should derive from existing canonical and derived facts whenever practical. Candidate signals may include Project Priority/Due/Status and aggregate Issue facts such as Priority, Due, Cycle relevance, non-terminal work, and retained lifecycle timestamps.

Do not add a persisted `rank`, `activityPriority`, `updatedAt`, or similar fact solely to drive this sidebar ordering.

The exact top-N size, signal weights, decay rules, and tie-breakers remain consumer-specific Query/UI decisions to be resolved when the ranking is implemented and calibrated.

Projects may expose a compact disclosure affordance for showing/hiding these shortcuts. The Projects row itself navigates to Projects Root; disclosure is a separate interaction target.

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
```

Breadcrumbs describe Trail product structure, not visit history. Ancestors are navigable; the terminal segment is the current location.

Back/forward history remains an Obsidian/browser host responsibility and is not duplicated in the Trail Location Bar.

The right side contains only actions that belong to the current location/object, such as Inspector/Details toggle or a low-frequency overflow menu when applicable. If a location has no such action, no empty action shell is rendered merely for symmetry.

A large repeated page title is not required when the Location Bar already establishes the current object and the content does not need an additional title hierarchy.

In narrow panes, preserve the terminal location first and progressively collapse middle ancestry and low-priority actions rather than allowing the bar to overflow horizontally.

### 5.2 View Bar

The View Bar exists only when the current content is a collection with meaningful presentation controls.

For Project Workspace, the V1 target is intentionally small:

```text
Filter        [single List/Board toggle]        Display
```

The List/Board switch occupies one control slot. Its icon changes with layout state and the tooltip states the action clearly. Whether the visible glyph represents current state or target state is a visual-calibration detail; the control must never require two permanent peer buttons merely to represent a binary toggle.

`Create Issue` is not a View Bar control. Contextual creation belongs to the collection/group surface itself.

`Display` is not a generic view builder. In Project Workspace it primarily controls which supported secondary properties are visible on Issue rows/cards. V1 does not need user-configurable Grouping, Sub-grouping, manual ordering, or a generic Sort builder here.

## 6. Project Workspace

### 6.1 One underlying Issue collection

Project Workspace is one Project-scoped Workflow Issue collection presented as List or Board.

```text
current Project Workflow Issues
→ layout Status projection
→ optional Filter visibility
→ automatic ordering inside each visible Status
→ List or Board presentation
```

Status is the fixed primary classifier. Filter does not redefine Status structure; it only decides whether an otherwise eligible Issue is visible.

### 6.2 Board Status projection

Board is the execution-focused presentation.

Its visible Status projection contains the active workflow categories:

```text
Unstarted   → default presentation example: Todo
Started     → default presentation example: In Progress
Completed   → default presentation example: Done
```

Backlog and Canceled work do not appear as normal Board columns.

If the Workspace config defines multiple concrete Issue StatusDefinitions inside one of these categories, the Board preserves the concrete configured Statuses and configured order inside the included categories rather than collapsing Domain identity into a hard-coded three-string schema.

Board columns therefore remain concrete Status presentation while the category projection decides which parts of the lifecycle the Board is intended to surface.

Dragging an Issue card across columns means **Status change only**. Same-column drag does not create a persisted manual order.

### 6.3 List Status projection

List is the complete planning/review presentation and includes the full workflow lifecycle.

Default category order is:

```text
Completed
Started
Unstarted
Backlog
Canceled
```

With the default Status names this reads naturally as:

```text
Done
In Progress
Todo
Backlog
Cancelled
```

Concrete StatusDefinitions retain their configured order inside the relevant category.

List therefore answers “how is all Project work arranged?” while Board emphasizes the work that is queued, active, or completed in the execution flow.

Status sections may be collapsible UI state. Collapse state is presentation state, not Domain data.

### 6.4 Filter

Project Filter is deliberately simpler than Linear's general filter system.

It answers only:

> Which Issues from this Project collection are visible?

The UI may reuse Linear's compact popover, checkbox/list, hover, focus, and chip treatment, but Trail does not expose a generic operator language, nested boolean builder, or reusable query DSL.

Filter choices are based on supported existing Issue facts and useful derived buckets, for example Status, Priority, Milestone, Cycle membership, Labels, Due, and Estimate where the current consumer supports them.

A filter does not:

- redefine Status grouping;
- define ordering;
- mutate entity properties;
- automatically seed arbitrary properties during creation;
- justify new canonical data fields.

Precise combination semantics remain a page-specific filtering contract rather than a generic expression engine.

### 6.5 Contextual creation

Global Capture and collection-local creation are separate intents.

```text
Navigation Capture
→ create Triage Issue

Project Status +
→ create Workflow Issue in current Project and explicit Status
```

A Board column `+` or List Status-section `+` may seed the structural context explicitly represented by that creation surface: current Project and current Status.

Arbitrary active filters such as Priority, Label, Due, or other display criteria are not silently inherited by a newly created Issue.

### 6.6 Automatic ordering

V1 does not expose manual ordering for Project Issues and does not persist rank/position facts solely to preserve UI order.

Within each visible Status, default ordering starts with explicit **Priority**.

Within the same Priority level, the ordering policy should keep related work visually coherent by clustering Milestone- and Label-related Issues instead of interleaving equivalent groups unnecessarily. Within a coherent cluster, existing temporal facts such as Due and `createdAt` provide lower-level ordering signals/tie-breakers.

The exact algorithm is intentionally not frozen yet. It must remain replaceable behind Query/page-specific ordering policy so later evidence can improve clustering, time weighting, or tie-breakers without changing Domain data, persistence schema, or Issue presentation components.

The extension point is an **algorithm/policy seam**, not a new user-maintained ranking field and not a speculative generic sorting framework.

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
→ edit the entity

Inspector
→ edit structured properties for the current primary context/entity
```

### 8.1 Peek

Peek exists primarily to show Issue detail that List/Board intentionally omit.

It is:

- transient;
- non-modal;
- primarily read-oriented;
- focus-driven;
- opened/closed without navigating away from the current collection;
- hosted as a floating Trail surface inside the main workspace rather than by repurposing Obsidian's persistent right sidebar.

Peek may show title, full lightweight description, Status, Priority, Milestone, full Label names, Due, Estimate, Cycle, Project where useful, and retained temporal facts such as creation time when useful for inspection.

Peek is not the primary editing surface. V1 does not require it to host the complete property-editing system merely because those properties are visible there.

When Peek is open, moving focus among adjacent supported items may update the preview. Peek does **not** change the persistent Inspector target.

### 8.2 Full Item

Full Item is entered when the user intends to edit/deeply work on an entity rather than merely inspect it.

In V1 it replaces the main content inside the same Trail tab. It does not normally create a new Obsidian tab.

For Issue Full Item, the main view is editing-first:

- title and description/content dominate the main surface;
- long-form editing decisions are resolved separately from this current slice;
- structured properties do not turn the main editor into a large form.

### 8.3 Inspector

Inspector is persistent contextual structured-property UI hosted in Obsidian's right split when appropriate.

It follows the **current primary Trail location/entity**, not transient hover, keyboard focus, multi-selection, or Peek target.

Examples:

```text
Project Workspace  → Project Inspector
Initiative Focus   → Initiative Inspector
Cycle               → Cycle Inspector
Issue Full Item     → Issue Inspector
```

Therefore, peeking an Issue while remaining in Project Workspace leaves the right sidebar as Project Inspector. Entering Issue Full Item changes the editing context and may show Issue Inspector.

For Issue Full Item:

```text
Main View
→ title / description / content editing

Issue Inspector
→ Status / Priority / Milestone / Labels / Due / Estimate / Cycle
   and other structured actions appropriate to the side surface
```

Inspector property rows reuse the same visual grammar and picker primitives used everywhere else. Browsing state should be symbol-heavy and compact; precise editing state includes explicit value names.

## 9. Responsive Behavior

Trail must work across variable Obsidian pane widths using progressive disclosure rather than a second mobile layout.

General priority:

- preserve current location before breadcrumb ancestry;
- preserve title before secondary metadata;
- preserve semantic icons before repeated text labels when meaning remains clear;
- collapse/overflow low-priority actions before forcing horizontal page overflow;
- compress Label display before increasing Card height without bound;
- keep exact text available through tooltip, picker, Peek, Inspector, and accessibility labels.

Exact breakpoints remain visual-calibration decisions.

## 10. Explicitly Deferred UI Decisions

The following are deliberately not frozen by this slice:

- final pixel values, color values, opacity, radius, and spacing;
- final icon choice where multiple existing Obsidian/Lucide equivalents are plausible;
- final Label palette and color-assignment function;
- exact number and formula for dynamic Project shortcuts;
- exact lower-level Project Issue ordering/clustering algorithm;
- exact default optional property set for List vs Board beyond the hierarchy defined above;
- Full Item description/editor and Obsidian Markdown/note integration details;
- complete keyboard shortcut map;
- Cycle-specific creation/filter/presentation details;
- Triage-specific Row/detail behavior beyond the shared primitives;
- Home, Projects Root, Initiative Focus, Search, and Custom View detailed compositions;
- final full-shell screenshots and calibrated UI measurements.

These items should be resolved consumer by consumer, using current Product/Domain/Architecture facts and the visual-reference rules in this document rather than by introducing speculative generic frameworks.

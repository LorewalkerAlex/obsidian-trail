# Trail UI Design

## 1. Authority and Scope

This document owns Trail's resolved target UI presentation and interaction answers.

It consumes Product, Domain, Data, and Architecture decisions rather than redefining them. Current implementation appearance is not a design authority: existing POC layout, CSS, native controls, page-local navigation, and modal/detail carriers may be replaced when they do not match the target UI.

Trail V1 targets **Obsidian-native mechanics with a Linear-faithful application presentation while the Trail plugin is enabled**:

- Obsidian owns the window, tabs, Ribbon, sidebars, splits, resize/collapse behavior, focus/workspace mechanics, and other mature host responsibilities.
- Trail plugin lifecycle owns the application-wide presentation state. While Trail is enabled/loaded, Obsidian chrome, native views, menus, properties, editor/document surfaces, status surfaces, and Trail-owned UI should consume one coherent Trail visual system even when the foreground leaf is not Trail. Disabling or unloading Trail returns presentation to the user's Obsidian theme without rewriting host workspace state.
- Current Linear is the default presentation and interaction answer wherever Trail has an equivalent responsibility. Trail should reproduce the relevant geometry, density, typography, color hierarchy, icon language, hover/focus/selection states, spacing rhythm, overlay treatment, and layout behavior as closely as practical inside Obsidian.
- Trail owns product-specific composition and semantics, plus differences required by Obsidian host constraints or Trail's own Domain. A Trail-specific visual answer is a deliberate divergence, not the default starting point when Linear already has an applicable answer.
- Trail reproduces observable visual/interaction results rather than proprietary Linear source code, assets, DOM structure, or internal implementation.
- UI design must not introduce new persisted Domain facts merely to support presentation, ranking, attention, color, ordering, or capability when those answers can be derived from existing facts.

### 1.1 Reference priority

When resolving a concrete UI element, use this order:

1. current Linear application UI;
2. current official Linear product documentation, changelog, and screenshots;
3. transferable Linear visual tokens and measurements from maintained reference material such as `awesome-design-md`;
4. current Obsidian host constraints and native UI behavior;
5. a Trail-specific answer only where product semantics or host constraints genuinely differ.

Linear is not Trail's feature specification, but for an equivalent presentation/interaction responsibility it is the **default design answer rather than optional inspiration**. Trail should reuse the relevant Linear grammar without importing collaboration-first semantics, generic view-builder complexity, unrelated configuration capabilities, or features that do not belong to Trail.

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
- Create issues: <https://linear.app/docs/creating-issues>
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

For Project Workspace specifically, the useful Linear reference is the **compact project-details + Issue collection interaction**, not Linear's complete Project feature set. For Projects Root, current Linear Project collection arrangement, density, grouping, Timeline presentation, and primary Project-create affordance remain useful visual references. Initiative Focus is the same Project collection scoped to one Initiative: it reuses Project summaries/actions/filtering, stays List-only, and does not become a multi-Project Issue workspace. Trail intentionally does not copy collaboration, documents/resources management, Project updates, or a heavyweight Overview/Issues dual-workspace model. Trail filters use one simplified Trail-specific interaction model; Linear filter visuals inform presentation, while Linear's advanced filter/view-builder semantics are not the product target.

For Creation, current Linear composer structure is the primary reference: lightweight creation context, title/body as the content center, compact property controls, a restrained footer, context-prefilled values, and capability-aware availability. Trail localizes that grammar to its own Domain: Quick Capture is a title-first Obsidian-wide entry into standard Triage creation; Workflow Issues must name one explicit legal Project and always begin in Backlog; Projects use their configured Unstarted default; Trail Initiatives have no Status; and V1 does not copy Linear Drafts or Create-more behavior.

For Triage, current Linear Triage is the primary queue/review interaction reference. Trail adopts its compact intake queue, sequential review rhythm, low-noise disposition actions, and constrained presentation model, while localizing the semantics to Trail's personal intake model: no team/assignee routing, no Snooze state, no normal Workflow Status, and no assumption that accepting must always produce an Issue.

For Cycles, current Linear Cycles provide the primary collection, Board/List, timebox identity, membership, and compact progress-reference grammar. Trail deliberately localizes away Linear's automatic cadence, future/upcoming Cycle generation, automatic Status coupling, automatic rollover, team distribution, predictive Capacity, Cycle Success, and historical graph snapshots. Trail's Current Cycle is a selected live Issue collection; Historical Cycles retain final membership only.

## 2. Visual System and Calibration

### 2.1 Application-wide full-shell calibration

Trail components are not calibrated in isolation. The calibration target is the **complete Obsidian application while the Trail plugin is enabled/loaded**, regardless of which leaf currently has focus:

```text
Obsidian application
├─ native window / tab chrome
├─ Ribbon
├─ Left / Right sidebars
│  ├─ Trail views
│  └─ native views such as File Explorer / Search / Backlinks / Properties
├─ Main leaves
│  ├─ Trail workspace
│  └─ ordinary Markdown / editor / document views
├─ menus / prompts / popovers / modals
├─ native controls / focus / selection presentation
└─ status surfaces
```

Obsidian continues to own those surfaces' mechanics and workspace state. Trail owns their presentation mapping while its plugin stylesheet is loaded. Native Obsidian surfaces and Trail-owned surfaces therefore consume the same resolved visual system rather than looking like two applications placed beside each other.

The V1 calibration environment is **Obsidian Default Dark mechanics + Trail's Linear-faithful Dark reconstruction**. Community themes remain compatibility environments rather than visual authority. Disabling/unloading Trail should remove Trail's application-wide visual ownership and reveal the user's ordinary Obsidian theme again.

Exact pixel dimensions, color values, opacity, spacing, and responsive thresholds should be frozen only after the relevant shell/host consumer exists in real Obsidian and can be compared against current Linear evidence. Calibration changes modify the owning token or component contract; they must not accumulate as unrelated source-order overrides.

### 2.2 Design-token authority and Linear reference inputs

Linear reference values are **inputs to one Trail visual authority**, not literals for each component to copy independently.
The V1 visual flow is:

```text
Current Linear evidence + real-Obsidian calibration
→ Trail reference anchors
→ Trail semantic design tokens
→ shared component visual contracts
   ├─ Obsidian semantic-variable mapping + targeted native consumers
   └─ Trail primitives / patterns / semantic components
```

Reusable visual facts belong to the token/contract layer once. Consumers call semantic names instead of restating raw colors, font sizes, spacing, radius, control heights, icon sizes, state colors, elevation, or other shared values. Component-specific geometry that is shared by every instance of that component may live in a component contract such as the common Menu contract. A truly local implementation offset does not need to become a global token merely because it is numeric.

Whether a token is ever exposed through user-facing Trail Settings is a separate product decision. The internal design-token authority exists regardless; user-facing configurability must not be required for code to stop duplicating visual constants.

A useful Linear-derived reference family includes:

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

These anchors seed/calibrate Trail's semantic tokens; production consumers should not treat the reference block itself as a second styling API.

### 2.3 Reuse mature mechanics before creating new primitives

Trail copies Linear's **presentation and interaction result**, but it should not recreate generic mechanics that already have a mature owner.

Preferred order for interaction mechanics is:

```text
Obsidian-native mechanic / API
→ browser semantic capability
→ already-adopted focused headless primitive when it materially reduces interaction/accessibility risk
→ custom Trail mechanic only when the existing options do not fit
```

For icons/glyphs, prefer:

```text
Obsidian-native icon
→ existing Lucide / already-adopted mature equivalent
→ custom Trail icon only when no suitable semantic equivalent exists
```

The chosen mechanic/icon is then calibrated to the Linear target through shared tokens and component contracts: size, stroke, opacity, density, state, placement, surface, and rhythm are presentation responsibilities rather than reasons to rebuild the underlying behavior.

Context Menu is the canonical example. Trail and native Obsidian context menus should consume one Linear-faithful visual contract; where possible Trail uses Obsidian's `Menu` mechanics/API and restyles its presentation globally rather than building a second menu engine. A Foundation Lab menu is only a calibration specimen and must not become a parallel production primitive.

Production reusable components expose a small set of semantic variants such as size/density/variant where stable variation is real, while structural differences are expressed through composition. Raw pixel/color style props and giant boolean-configurable universal components are not the normal reuse model.

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

### 3.3 Main View navigation state and host history

Trail uses the primary Obsidian leaf's native back/forward history for **Main View semantic navigation**. Trail does not create a second application history stack merely because its product locations render inside one native tab.

The conceptual history model is a temporary ordered sequence plus one current cursor:

```text
[Home] [Triage / Queue] [Triage / Review A] [Triage / Review B]
                                                       ^
                                                    cursor
```

Back and Forward move the cursor through already-visited semantic Main View states. When the cursor is in the middle of the sequence and the user performs a new navigation instead of Forward, the old forward branch is discarded before the new state is appended:

```text
before
[Home] [Triage / Queue] [Review A] [Review B] [Review C]
                                ^
                             cursor

new navigation to Review D
[Home] [Triage / Queue] [Review A] [Review D]
                                           ^
                                        cursor
```

Obsidian owns the history sequence, cursor, Back/Forward controls, branch truncation mechanics, and history lifetime. Trail owns the semantic View State that the host records/restores. Trail does not persist a parallel history in Domain Data, Runtime, Markdown, Plugin Data, or Workspace State.

A history entry exists when the user has meaningfully navigated to another Main View surface: the test is **“does the user understand this as being somewhere else?”** Representative states include:

```text
Home
Triage / Queue
Triage / Review(triageIssueId)
Projects
Projects / Initiative(initiativeId)
Project(projectId)
Full Item(issueId)
Cycles / Current
Cycles / History / Cycle(cycleId)
Search
```

The exact state shape is an implementation contract, not a new Domain model. Stable entity IDs are used where restoration needs identity; presentation-only geometry is derived again from current host capacity and current effective data.

Triage Queue and Triage Review are therefore distinct history states even though both belong to the same top-level Triage product location and may share the same structural Location Bar title. Opening a Queue row navigates to `Triage / Review(issueId)`; returning to the full Queue navigates to `Triage / Queue`.

Triage's Review **Previous / Next** controls are not Back/Forward aliases. Their target is resolved from the current visible/ordered Triage Query projection. Once a previous/next identity is resolved, moving to that Review is an ordinary Main View navigation and may create a new history entry. Host Back/Forward instead replay the already-visited state sequence and do not recompute Triage adjacency.

The same separation applies to automatic workflow progression: Defer/Delete/Accept determine any successor from the current visible/ordered Queue according to the workflow rule, then navigate to that semantic Review state. History does not become the source of ordering or successor legality.

The following are **not** navigation history entries because they do not change where the user is:

- responsive wide/narrow layout changes, split/sidebar resize, and other host-capacity-derived geometry;
- Filter/Display configuration within the current location;
- inline edits to Title, Description, Priority, Labels, Due, Status, or other entity facts;
- selection, hover, focus, scroll position, transient feedback, and pending mutation presentation;
- opening/closing a Modal, Composer, Popover, Menu, Context Menu, property picker, confirmation surface, or other overlay;
- local drafts held by those interactions.

Those states may have their own scoped session lifetime, but they do not create history nodes. If an overlay succeeds and the product then navigates somewhere else, only the resulting Main View destination enters navigation history; reopening the completed overlay is never a Back operation.

A restored history entry is interpreted against current authoritative/effective state. If its referenced entity no longer exists, Trail must not resurrect stale content or fabricate a private copy. Restoration falls back to the nearest valid containing product surface, such as a missing Triage Review returning to the Triage Queue, while normal current Query/Domain facts remain authoritative.

This history model is orthogonal to breadcrumbs. Breadcrumbs express product structure and ancestor navigation; Back/Forward express visit history.

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

The row is not a special Standalone location and does not identify a Project by title. Normal ready Workspace State always resolves one stable `defaultProjectId`; the row renders that ordinary Project's current title and opens the same normal `Project(projectId)` location used everywhere else. Renaming the Project therefore renames the shortcut automatically. Assigning it to an Initiative, changing lifecycle Status, or editing any other Project property does not change the navigation mechanism.

Changing the Workspace Default immediately changes this shortcut to the newly referenced Project. The current Default Project is not deletable. To delete it, the user first changes Default Project through the independent Settings interaction in Section 16; after that mutation commits, the former Default is an ordinary non-Default Project and its normal Delete action may be used. Delete itself never asks for or applies a replacement Default, so the navigation row changes only when the separate setter succeeds. Fresh/bootstrap recovery of a missing persisted reference is owned below the UI and completes before Trail presents normal ready navigation.

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

Collapsed state removes the description region without changing Project location. Initiative Focus uses the same narrative-context pattern for the Initiative description: the description is disclosed inline in the main workspace rather than duplicated as an Inspector property or promoted to a separate Overview page.

The description may use ordinary lightweight Markdown and Obsidian wikilinks. Trail does not introduce `relatedNoteIds[]` merely to imitate Linear Resources/Documents; ordinary Obsidian notes/backlinks remain the document layer.

### 5.3 View Bar

The View Bar exists only when the current content is a collection with meaningful presentation controls.

For Projects Root, the V1 target is:

```text
Filter        [single List/Timeline toggle]        Display
```

Initiative Focus is List-only and reuses the Project collection controls without repeating the already-fixed Initiative dimension:

```text
Filter                                             Display
```

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

The binary layout switch occupies one control slot rather than two permanent peer buttons. Planned, Completed, and Canceled Project Workspaces are List-only because Board is an execution workflow surface; they omit the List/Board toggle rather than exposing an unavailable presentation. Triage is always a List. Historical Cycle is also List-only because it is passive final-membership history rather than a historical execution Board.

Trail V1 uses one **simplified shared Filter interaction** across supported collections. It borrows Linear's low-friction property/value selection rhythm but deliberately omits the advanced operator builder, nested boolean grammar, AI filtering, and saved-view machinery. The common interaction is:

```text
Filter
→ choose Property
→ choose Value(s)
→ visibility updates immediately
```

The first popover level directly lists the small property registry for the current collection and may show a quiet summary beside properties that already have an active clause. A second-level value picker may add search when its option set can grow materially, such as Project, Initiative, Milestone, or Labels; fixed small enums do not need a search field. Selection applies immediately and there is no Apply/Save/Done step. `Esc` closes the current Filter popover without clearing active clauses.

Ordinary discrete properties use one deliberately small grammar:

```text
0 selected values      → All / no clause for that property
1..N selected values   → selected values are OR
different properties   → clauses are AND
```

The UI does not expose those boolean words or a generic operator control. V1 has no exclude / is-not / includes-all variant. Each property has at most one active clause. Nullable fields may expose an explicit pseudo-value such as `No initiative`, `No priority`, `No milestone`, `No labels`, or `No estimate`; choosing nothing still means All and is not the same as choosing `No …`. Required fields do not expose a fake empty value. Label options may remain visually organized by LabelGroup, but LabelGroup Single/Multiple assignment rules do not alter Filter semantics: selected Labels are still one OR set.

Due is the one specialized temporal clause and is single-choice/replacement rather than multi-select. Its menu is:

```text
Overdue
Today
This week
This month
No due                 when the field is nullable
────────────────
Pick date…
```

All dated choices are **cutoffs**, not date-window membership. They resolve through the Workspace timezone/calendar policy:

```text
Overdue      → Due < start of today
Today        → Due <= end of today
This week    → Due <= end of the current Monday-Sunday week
This month   → Due <= end of the current calendar month
Pick date…   → Due <= end of the selected date
No due       → Due absent
```

Therefore an already-overdue item intentionally also matches Today, This week, and This month. V1 does not need before/after operators or a date-range picker for this Filter.

Applied clauses remain visible in the View Bar using a compact formula/chip treatment such as:

```text
Filter   [Status · Todo, In Progress]   [Due · This week]   Display
```

Clicking an applied clause opens that property's value picker directly. Removing its last discrete value removes the clause; a low-noise remove action may clear the whole clause. The Filter popover exposes `Clear filters` when any clause is active. Long value summaries may compress to a bounded prefix plus `+N` without changing the underlying selection. If the unfiltered collection has data but the active Filter produces no rows/cards, the empty state explicitly says that no items match the filters and offers `Clear filters`; it must not look like a genuinely empty collection.

Milestone, Attention, and similar quick-focus actions use the same normal location Filter state **when the intended focus is exactly expressible by the frozen grammar**. For example, a Milestone focus writes that Milestone clause and an Overdue focus writes `Due · Overdue`. A focused action for a property replaces that property's existing clause rather than maintaining a hidden second filter or silently expanding the old values. If a derived bucket is not exactly expressible, the UI must not create a hidden range/exclusion clause merely to make it clickable.

Filter state is **location-scoped, session-only UI runtime state**. It may survive List/Board switching, Peek, and navigation away/back to the same location during the current Trail session, while different locations keep independent state. It is not Domain Data, committed/effective canonical Runtime, synchronized Workspace State, Custom View persistence, Markdown, or Plugin Data. Relation-valued clauses retain stable IDs so rename presentation follows current entities; deleted/unavailable values are removed from the transient clause, and an emptied clause disappears. Restart/reload may discard the entire Filter state.

The frozen V1 registries are:

| Collection | Filter properties |
| --- | --- |
| Projects Root | Status · Initiative · Priority · Labels · Due |
| Initiative Focus | Status · Priority · Labels · Due |
| Project Workspace | Status · Priority · Milestone · Labels · Due · Estimate |
| Current Cycle | Status · Project · Priority · Milestone · Labels · Due · Estimate |
| Historical Cycle | Status · Project · Priority · Milestone · Labels · Due · Estimate |
| Triage | Due · Priority · Labels |

Initiative Focus does not repeat Initiative as a filter because the location already fixes that scope. Filtering changes visibility only; it never defines grouping/order, mutates entity facts, or creates another page-specific query language.

`Display` is not a generic view builder. In Projects Root it controls supported secondary Project-row properties and Timeline presentation choices. In Project Workspace and Current Cycle it controls supported secondary Issue Row/Card properties. In Historical Cycle it controls supported flat List-row metadata. In Triage it is limited to supported ordering choices. In Initiative Focus it controls the same supported Project-row secondary properties as the shared Project collection, without Initiative grouping because the location already supplies that dimension. V1 does not need a generic Group/Sub-group builder, manual ordering, or a generic Sort builder for these surfaces.

`Create Issue` is not a generic View Bar configuration control. Exact placement of the Project-local create affordance is a composition detail, but it must not visually imply that creation inherits a Todo/In Progress/Done group.

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

Initiative Focus is the standard Project collection scoped to one Initiative:

```text
Projects / Initiative Alpha
-> Projects where Project.initiativeId == Initiative Alpha
-> shared Project Summary Row / actions / selection / filter / ordering
-> List-only presentation
```

It does not introduce an Issue collection, Board, Timeline, Cycle-like execution surface, or a second Project presentation model. Initiative grouping and the Initiative filter are absent because the current location already fixes Initiative scope. Changing a Project's `initiativeId` through the normal Project property/action semantics naturally moves it into or out of the current collection; V1 does not need a separate `Remove from Initiative` Domain action.

Initiative Focus exposes the same lightweight narrative-context disclosure used by Project Workspace so the Initiative description appears in the main workspace when requested. Structured Initiative properties remain lightweight Inspector material, using the existing Priority / Labels / Due semantics rather than building an Initiative dashboard.

`New Project` is a high-value Initiative Focus action and opens the standard Project Composer with the current Initiative prefilled but editable. The normal Project creation contract remains authoritative.

Projects Root follows the current Linear Projects pattern for its primary creation affordance: a compact `+` / New Project action opens the standard Project Composer directly. Initiative creation remains a lower-frequency secondary Projects action, available adjacent to or behind the normal low-noise menu grammar, and opens the standard Initiative Composer; Trail does not need a separate top-level Initiatives area merely to create one.

### 5.5 Project Summary Row

Project Row is the primary scanning unit in Projects Root and Initiative Focus. Both locations reuse the same Project Summary Row; the enclosing collection scope is what differs. Project Row stays compact and normally single-line rather than becoming a card or a table of every Project fact.

Wide conceptual form:

```text
[Status glyph] Project title    Status    Priority    Progress    Due    Attention
```

Information priority is Project identity first, then lifecycle Status, normal execution/time summaries, and exception-driven Attention. Because Projects Root is grouped by Initiative rather than by Project Status, lifecycle identity cannot be delegated to the surrounding structure: the Project Row must carry Status itself. Wide layouts show Status glyph plus configured Status name; compact layouts may reduce this to the stable glyph plus tooltip/accessibility text.

Default row semantics are:

- Title is the strongest visual anchor; description is not shown in the row.
- Status uses the shared Status glyph/name grammar and opens the normal legal-transition picker when activated.
- Priority uses the shared compact Priority glyph and picker.
- Progress is derived and read-only. Wide rows may show a thin bar plus percentage; compact rows may reduce this to percentage. Undefined Progress displays `—` rather than fabricated 0%/100%.
- Due is the Project's own Due and uses the shared temporal emphasis grammar. It may open the normal date picker.
- Attention is exception-driven rather than a permanently occupied column. No meaningful attention means no visual footprint. Temporal pressure or Canceled-Project cleanup may expose a compact signal/reason. When that reason is exactly expressible by the shared Filter grammar, activating it may open Project Workspace with that normal temporary Filter; an unrepresentable derived bucket does not justify hidden Filter state or a one-off operator.
- Labels are optional secondary display and use the shared compact dot grammar. They are off by default in the Projects Root row unless enabled through Display.

The row itself is a navigation surface: activating the title or ordinary row area opens Project Workspace. Activating an inline property edits that property and does not trigger row navigation. Progress remains read-only. Right-click or a low-noise overflow affordance opens Project actions such as status/priority/due changes, Initiative movement, and destructive actions where legal. V1 does not require drag-between-Initiative-groups as a second relationship-editing mechanism.

Completed and Canceled Projects remain in their current Initiative group rather than moving to a separate Archive surface. Closed Project rows settle below active work and use reduced visual weight. A Canceled Project with unresolved open child Issues keeps its cleanup Attention prominent even when the rest of the row is muted.

Default Project-collection ordering is deterministic and explainable:

```text
Project lifecycle category
→ configured StatusDefinition order
→ Priority
→ Due
→ stable deterministic fallback
```

With the default Project Status configuration, the lifecycle order is In Progress, Planned, Completed, then Canceled. V1 does not use activity, Progress, Attention score, manual rank, or persisted focus score as hidden ordering state.

Responsive reduction preserves title and Status identity first, then meaningful exception Attention and Priority. Progress bar may collapse to a percentage; ordinary Due, optional Labels, and other secondary text progressively disappear rather than wrapping the row into a mini details view. An overdue Due may receive higher preservation priority because its current semantic emphasis is exceptional.

### 5.6 Project Timeline

Projects Root may switch from List to a lightweight Timeline that projects the **current temporal evidence** already present in Effective Runtime. Initiative Focus remains List-only and does not expose this Timeline. It is not a planning Gantt, immutable history, or a second source of schedule truth. Timeline does not infer the business story behind reopen, Issue movement, lifecycle mismatches, or other unusual data combinations; when current data changes, the projection changes with it.

Linear remains the primary visual/layout reference for the Timeline shell, Project rows, Initiative grouping, time axis, and density. Trail intentionally does not copy Linear's planning-timeframe, dependency, resource-planning, or drag-to-reschedule semantics.

Timeline semantics are resolved through four independent questions.

#### 5.6.1 Timeline eligibility

Timeline does not render a Project merely because the Project exists. A Project with **no current child Workflow Issues** is omitted from Timeline even when the Project itself has Due.

For a Project with current child Issues, render it when at least one of the following temporal signals exists:

- at least one current child Issue has `firstStartedAt`;
- the Project current Status belongs to the Started category (default visible Status `In Progress`);
- at least one currently eligible Project, Milestone, or Issue Due exists;
- every current child Issue is closed, allowing a closed never-started lifecycle envelope to be derived.

Otherwise omit the Project from Timeline. In particular, a Planned Project containing only never-started open Issues and no eligible Due does not appear in Timeline.

Timeline eligibility is a presentation projection only. It does not mutate the underlying filtered Project collection or create a new Project lifecycle fact.

#### 5.6.2 Left-side temporal span

The historical/current span uses one of two evidence modes.

**Execution evidence mode** applies as soon as any current child Issue has `firstStartedAt`. In this mode, Issue `createdAt` no longer contributes to the left-side span:

```text
start = earliest current child Issue.firstStartedAt
```

If any Issue that has `firstStartedAt` is currently open, the solid execution envelope extends to `today`. Otherwise it ends at the latest current `terminalAt` among Issues that also have `firstStartedAt`.

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
- all current child Issues closed and never started: faint span from earliest `createdAt` through the latest current Issue `terminalAt`;
- otherwise, eligible Due may provide the second temporal boundary; if at least one eligible Due lies in the future, the left-side faint span runs through `today` and the future portion follows the Today-to-Due rule below; if no eligible Due lies in the future, the faint span may end at the latest eligible Due that is later than the origin;
- if a candidate endpoint is not later than the origin, do not fabricate a reverse or zero-length bar; retain only independently valid markers.

```text
planning/lifecycle evidence     ───────────────
execution evidence              ━━━━━━━━━━━━━━━
```

Project Status does not rewrite Issue lifecycle evidence. A Planned Project may therefore display a solid execution envelope when its current Issues contain `firstStartedAt`; an In Progress Project may display only faint planning evidence when none of its current Issues has started. Timeline presents the current facts rather than repairing such combinations.

#### 5.6.3 Due markers

Due is a separate marker layer rather than a source of canonical Project start/end dates. A Due is eligible only while its **own corresponding entity** remains open/currently incomplete:

```text
Project Due
→ visible only while Project is Planned / In Progress

Issue Due
→ visible only while Issue is open

Milestone Due
→ visible only while Milestone is not derived complete
```

Milestone has no independent Completed/Canceled workflow Status; completion remains derived from its current Issue scope.

A parent becoming closed does not silently erase an independently active child's Due. For example, a Canceled Project hides the Project's own Due, while an unresolved child Issue may still expose its Issue Due. Conversely, Completed/Canceled Issues and derived-complete Milestones contribute no Due marker even if their stored Due remains present.

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

Because eligibility belongs to each corresponding entity, a closed Project may still show a future span when an unresolved child Issue has an eligible future Due. This is an objective projection of current data, not an attempt to reinterpret the Project's business state.

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

### 5.7 Shared Creation Composer and invocation

Trail V1 uses one **shared Creation Composer infrastructure** rather than page-specific creation forms. This is an implementation as well as interaction constraint: entity-specific composers compose the same shell, title/body editor, property controls/pickers, footer/action treatment, focus mechanics, and responsive behavior. Page code supplies entity-specific fields, defaults, legal context, and submit intent; it must not duplicate the basic creation stack. Create and Edit may share those lower-level primitives without being forced into one universal surface when their workflows differ.

The common Linear-inspired structure is:

```text
light creation header / context
Title
Description / body
compact entity-specific properties
Linear-style footer / Create action
```

The header identifies what is being created and, where structurally useful, its current relation. It is intentionally light rather than a second page title. Title/body remain the visual center; properties use the same compact property/picker grammar used elsewhere rather than a vertical label-and-input form.

A Creation Composer is UI draft state only. **No Domain mutation happens until the normal Create action succeeds.** V1 does not implement Linear-style saved Drafts or Create-more. Closing/canceling an unfinished Composer discards that UI state and creates nothing. Exact shortcut hints and normal Composer keyboard bindings follow the shared interaction/Linear reference; Quick Capture does not broadcast a special Enter-submit rule into normal Composer behavior.

#### 5.7.1 Triage creation and Quick Capture

The standard Triage Composer is:

```text
Triage

Title
Description / body

Priority   Labels   Due

Create
```

`Due` is the Triage review Due by context and does not need a redundant `Review Due` label inside this composer. The normal temporal policy supplies its default. Priority and Labels remain optional.

Quick Capture is a title-first Obsidian-wide entry into this same creation flow:

```text
Quick Capture hotkey / Navigation Capture
→ Title only
→ Enter
→ standard Triage Composer
   - Title prefilled
   - Due default already present
→ normal Composer interaction
→ Create
```

The first Enter does not create a Triage entry. Once the full Composer is open, it behaves exactly like normal Triage creation; there is no second special Quick-Capture mode or special Enter-submit rule. A user who wants to provide richer intake information can continue with Description, Priority, Labels, and Due before Create.

The Triage page and Home may also invoke the full Triage Composer directly without passing through title-first Quick Capture.

#### 5.7.2 Workflow Issue Composer

The standard Workflow Issue Composer is:

```text
Issue · Project ▾

Title
Description / body

Priority   Labels   Milestone   Estimate   Due

Create
```

Project is a required structural relation and belongs in the light creation header. Invocation context may prefill it, but the Composer remains the final explicit selection and the Project may be changed before creation. Changing Project clears any Milestone that is not legal in the new Project.

At normal pane widths, Priority, Labels, Milestone, Estimate, and Due are directly available. Only when width is genuinely constrained may lower-priority property controls progressively move into a secondary/overflow treatment; they are not hidden by default merely to keep the Composer artificially sparse.

Creation Status is **not** an editable Composer property. Every normal Workflow Issue begins in the Domain-defined Backlog StatusDefinition; the UI does not show a fake disabled Backlog dropdown or inherit Todo/In Progress/Done from a nearby section/column. Cycle is also not a creation property.

Invocation rules are:

- Project Workspace Create Issue → current Project prefilled, still editable;
- a concrete Milestone context may prefill both Project and Milestone;
- Home or any other context-neutral Issue create → legal Workspace Default Project may prefill; otherwise Project starts unselected and must be chosen;
- Triage Accept → Issue → standard Issue Composer with Title + Description/body seeded; a legal Default Project may prefill; Triage Priority/Labels/Due do not copy automatically;
- if a future Command Menu/Obsidian command invokes standard Issue creation, it uses this same context-neutral Composer rather than another form.

Application/Domain always receive the explicit selected Project ID. Invocation context never creates a second creation semantic.

#### 5.7.3 Project Composer

The standard Project Composer is:

```text
Project

Title
Description / body

Initiative   Priority   Labels   Due

Create
```

Initiative is optional and therefore a normal property rather than Project identity in the header. Project Status is not an editable creation property; normal creation uses the configured Unstarted default and lifecycle advancement happens later through the normal Status interaction.

Projects Root uses the Linear-style primary `+` / New Project action to open this Composer. Initiative Focus may prefill its current Initiative while leaving the relation editable. Triage Accept → Project uses the same Composer and seeds only Title + Description/body. Home may invoke it from the shared Home creation menu.

#### 5.7.4 Initiative Composer

The standard Initiative Composer is:

```text
Initiative

Title
Description / body

Priority   Labels   Due

Create
```

Trail Initiative has no Workflow Status, so no Status control appears merely because current Linear Initiatives have one. Project membership is also not required during Initiative creation; Projects can be associated through their normal Initiative relation afterward. Projects Root exposes Initiative creation as a secondary Projects action, and Home may invoke it from the shared Home creation menu.

#### 5.7.5 Home creation menu

Home provides one compact `+` creation action rather than multiple competing permanent buttons. Activating it uses the normal shared menu/popover grammar and offers:

```text
Triage
Issue
Project
Initiative
```

Each choice opens the corresponding standard Composer above. `Triage` opens the full Triage Composer, not Quick Capture. `Issue` is context-neutral and therefore uses a legal Default Project only as a prefill candidate. This creation affordance is independent from the Home module layout. Home module content is frozen separately; exact grid placement and width-dependent composition remain part of the workspace-grid closure.

#### 5.7.6 Capability-gated creation and illegal targets

Trail follows the same broad usability principle visible in Linear's read-only/archived capability treatment: prevent an unavailable operation at the point of use instead of inviting the user through a complete edit flow that can never succeed.

Concretely:

- a Completed/Canceled Project does not expose an active Project-local Create Issue action;
- when an unavailable action is useful to explain, a disabled/unavailable presentation may give a concise reason and recovery such as reopening the Project rather than failing only after Composer completion;
- relation pickers show/select only legal normal targets, or mark a target unavailable when retaining it in the list materially helps the user understand why it cannot be chosen;
- a Default Project that is not a legal target is treated as no prefill, never as permission for a hidden fallback;
- UI never changes Status or another relation silently just to make a target legal;
- Domain/Application still revalidate on submit, so a context that becomes illegal while the Composer is open cannot bypass canonical rules. Exact mutation-failure presentation belongs to the later runtime/feedback closure.

Capability gating is shared infrastructure/query consumption, not a set of page-local lifecycle `if` statements.

### 5.8 Shared Selection and Action System

Trail V1 follows the current Linear selection/action interaction grammar wherever Trail has an equivalent responsibility. Selection, Context Menu, Command Menu, Bulk actions, overflow actions, and keyboard shortcuts are one shared interaction system rather than page-specific mechanisms. Trail diverges only when its own capability semantics or Obsidian host/focus constraints require it.

Conceptually:

```text
pointer hover / keyboard focus
→ highlight current candidate

explicit selection interaction
→ one or more selected items

current entity / current selection / current location
→ shared available actions
   ├─ Context Menu
   ├─ Command Menu
   ├─ Bulk action surface when useful
   ├─ ··· / other explicit action affordance
   └─ keyboard shortcut
```

#### 5.8.1 Highlight and selection

Highlight/focus is not the same state as selection. Pointer hover or keyboard navigation may establish the current candidate without silently creating a persistent multi-selection. Ordinary Row/Card activation keeps its normal open/navigation meaning; explicit selection affordances provide toggle, range, and current-collection selection mechanics in the Linear style.

List, Board, Triage, and other supported collection surfaces consume the same selection model rather than implementing page-specific variants. Selection is transient UI runtime state only. It is not Domain Data, committed/effective canonical Runtime, Workspace State, Markdown, Plugin Data, or a saved View. An action must never be applied to an invisible stale selection from another context merely because that selection once existed.

On selectable List rows, the selection checkbox occupies a dedicated leading gutter: it is normally visually hidden, reveals on pointer hover or keyboard focus, and remains visible while the item is selected. The selection gutter does not replace Priority, Status, or another semantic leading property; selection presentation and semantic property presentation are independent responsibilities.

The exact keyboard bindings used to toggle/range/select-all/clear are not frozen as product semantics. Trail owns a shared shortcut-dispatch mechanism and may choose bindings that fit the Obsidian host rather than copying Linear's literal keymap.

#### 5.8.2 One action authority, multiple entry points

Trail uses one shared **Action Registry** as the UI authority for actions available in the current context. An action has stable identity plus the context/capability information needed to determine whether it is available, which legal targets it may expose, and which existing Application intent it invokes.

Context Menu, Command Menu, `···`/overflow affordances, Bulk surfaces, and keyboard shortcuts consume that same authority. They do not need identical visible menus: Context Menu favors the small set of actions most relevant to the clicked/current object or selection, while Command Menu may expose a broader searchable set. Different presentation subsets do not create different action semantics.

Context resolution follows the mature Linear pattern: an existing relevant selection may be the action scope, while explicitly invoking an unselected object must not accidentally execute against an unrelated stale selection. Page code does not recreate that resolution rule locally.

#### 5.8.3 Bulk actions

Bulk means executing one shared action against the current selection. Trail intentionally keeps V1 Bulk narrow and consumer-driven; there is no requirement to bulk-enable every entity or every action simply because Selection exists.

A valid Bulk operation must be expressible as:

```text
same action
+ same target
+ every selected item can legally accept that action/target
```

Therefore target-bearing Bulk controls expose the intersection of the selected items' ordinary legal targets:

```text
bulk legal targets
= intersection(legal targets of every selected item)
```

This does not create a second Bulk Domain model. Each selected item keeps the same ordinary capability and validation rules it has when operated on individually. For example, a Milestone target is available for a multi-Issue selection only when the selected Issues share one Project and that Milestone is legal for every selected Issue. A cross-Project Cycle selection therefore does not expose one Project's Milestones as a valid common target.

Where an existing action is naturally idempotent, an item that already satisfies the common target may remain unchanged rather than turning the Bulk operation into a failure. Trail does not use hidden per-item target changes to simulate a common action. If there is no useful common action/target, that Bulk operation is absent or unavailable.

Execution coordination may reuse the established mutation/application mechanisms; exact pending/failure/recovery presentation remains part of the runtime-feedback closure. The UI interaction itself does not introduce `BulkIssue`, persisted selection, or another business entity/command vocabulary.

#### 5.8.4 Keyboard shortcuts

Keyboard shortcuts are bindings to the same stable Action IDs used by menus and visible affordances:

```text
keybinding
→ Action ID
→ current context / selection
→ normal action execution
```

The interaction contract does not require Linear's literal shortcut choices. Exact bindings are selected during implementation/host calibration so Trail does not conflict with Obsidian or text-editing focus. Editor/text-input contexts may suppress global Trail shortcuts unless an action is explicitly safe there. Changing a binding must not require changing the underlying action, Context Menu, Command Menu, or Bulk behavior.

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

A Project can therefore be Canceled while still showing Backlog/Todo/In Progress child Issues. Those children are unresolved cleanup work, not hidden merely because the Project was canceled.

Project Status must not be used as a shortcut for rewriting, filtering away, or fabricating child data.

### 6.2 Lifecycle-dependent workspace role

With the default Project Status configuration, Project Workspace has four UI roles:

| Project Status | System category | Workspace role | Layout |
| --- | --- | --- | --- |
| Planned | Unstarted | planning-only | List |
| In Progress | Started | planning + execution | List / Board |
| Completed | Completed | settled review | List |
| Canceled | Canceled | cleanup/review | List |

The Default Project has no special lifecycle workspace role. It uses the same lifecycle-dependent Project Workspace behavior, layouts, Milestones, and Inspector as any other Project. The Workspace designation adds only the separate Delete guard defined in Sections 9.8 and 16; it does not alter Project lifecycle or child-work capability.

### 6.3 Board Status projection

Board is the execution-focused presentation and is available only for Projects whose current Status belongs to the Started category (the default visible Status is `In Progress`).

Board columns are **concrete configured Issue StatusDefinitions**, not StatusCategory headings. The default visible columns are:

```text
Todo
In Progress
Done
```

Those Statuses respectively belong to the Unstarted, Started, and Completed system categories. Backlog and Canceled work do not appear as normal Board columns.

If Workspace configuration defines multiple concrete Issue StatusDefinitions inside one included category, each concrete Status remains its own peer Board column in configured order. Board never adds a second category nesting level.

Dragging an Issue card across columns means **Status change only**. Same-column drag does not create a persisted manual order.

Board does not become a creation-by-column mechanism. New normal Workflow Issues are always created in Backlog, so a Todo/In Progress/Done column `+` must not silently create directly into that Status.

### 6.4 List Status projection

List is the complete planning/review presentation and includes the full Workflow Issue lifecycle.

With the default Status configuration, the visible Status sections are:

```text
Done
In Progress
Todo
Backlog
Canceled
```

These are concrete StatusDefinition names. System StatusCategory remains an internal lifecycle semantic used for rules and default category-level ordering; it is not an extra selectable level in the List. Concrete StatusDefinitions retain configured order within the relevant category.

Status sections may be collapsible UI state. Collapse state is presentation state, not Domain data.

### 6.5 Issue Filter in Project Workspace

The Filter in Project Workspace answers only:

> Which Issues from this Project collection are visible?

It uses the shared Filter grammar frozen in Section 5.3. The Project Workspace registry is exactly:

```text
Status · Priority · Milestone · Labels · Due · Estimate
```

Project Workspace deliberately has **no Cycle filter**. Current Cycle already owns the focused Cycle-membership workspace, while Current Cycle membership remains visible as a compact Row/Card marker inside Project Workspace. Duplicating `Cycle = Current Cycle` here would add a second route to the same collection intent without adding useful selection semantics. Historical Cycle membership is not an Issue property and is not exposed as a Project Workspace filter.

A filter does not:

- redefine Status grouping;
- define ordering;
- mutate entity properties;
- seed arbitrary properties during creation;
- justify new canonical data fields.

Milestone and derived attention entries may apply a temporary Issue Filter in Project Workspace as a navigation shortcut when the intended subset is exactly expressible by the shared grammar. The resulting filter remains represented by the normal Filter UI/chips. Inspector does not maintain a second private filter state. Derived attention buckets that require an unavailable range/exclusion operator remain presentation only in V1 rather than creating private filter semantics.

### 6.6 Workflow Issue creation and default Project selection

Global Quick Capture and direct Workflow Issue creation remain separate intents:

```text
Navigation/Obsidian Quick Capture
→ title-first Triage creation
→ standard Triage Composer

Project-local Create Issue
→ standard Issue Composer
→ current Project prefilled, editable
→ explicit selected Project relation
→ default Issue Backlog StatusDefinition
```

Any context-less surface that creates a Workflow Issue directly must also submit an explicit Project relation. Its Project picker may initialize to the Workspace Default Project when that Project can legally accept the new Backlog Issue. If the Default Project is not a legal target, there is no hidden fallback or lifecycle rewrite; the user chooses another legal Project before submission.

When Triage Accept chooses **Issue**, it opens the same standard Issue Composer and therefore follows exactly this same creation contract: Project is required, the Default Project is only an initial selection when legal, and the selected Project ID is submitted explicitly to Application/Domain. When Triage Accept chooses **Project**, the normal Project Composer and defaults apply instead. Triage-specific review/Accept composition is defined in Section 10; shared creation composition and invocation are defined in Section 5.7.

The creation surface does **not** seed Todo/In Progress/Done Status from a nearby List section or Board column. Every normal Workflow Issue is born in Backlog first; execution advancement is a separate user action subject to Project capability.

In a Planned Project, the new Backlog Issue can be planned but cannot advance into normal execution. In an In Progress Project, it can later advance normally. Completed/Canceled Projects do not expose an active Project-local creation action and are not legal default/selection targets for a new open child under the normal capability rules.

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

With the default Project Status configuration:

| Capability | Planned | In Progress | Completed | Canceled |
| --- | ---: | ---: | ---: | ---: |
| Read/filter/inspect current child data | yes | yes | yes | yes |
| Create child Issue | yes → Backlog | yes → Backlog | no | no |
| Accept moved-in Backlog Issue | yes | yes | no | no |
| Accept moved-in Todo/In Progress Issue | no | yes | no | no |
| Edit/plan Backlog child | yes | yes | no | no |
| Advance Backlog → execution | no | yes | no | no |
| Normal Issue workflow | no | yes | no | no |
| Cancel child Issue | yes where legal | yes | normally unnecessary | yes for unresolved cleanup |
| Move child Issue out | yes | yes | yes | yes |
| Create/edit Milestone | yes | yes | no | no |
| Board | no | yes | no | no |

Planned is therefore **planning-capable, execution-disabled**, not read-only.

If a Planned Project contains an Issue already in an execution Status because the Project was reopened from a closed state, Trail does not rewrite it. Normal execution controls remain unavailable; legal cleanup such as Cancel or Move Out remains available.

A target Project picker also consumes effective capability. If the current Issue cannot legally move to a target Project without changing Status, that target is unavailable. Normal Move never silently rewrites Status.

The Default Project uses this same lifecycle/child-work capability matrix as any other Project. Being the Workspace default never bypasses target legality or changes Issue Status implicitly; independently, the current Default is not a legal Delete Project target until another Project has become Default.

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
[selection gutter]  [Priority]  Issue title         ◇ Milestone   ●●   Due
```

The selection checkbox uses the shared dedicated left gutter described in Section 5.8.1. Priority remains a stable semantic property beside it rather than being replaced by selection state. Exact focus/range/select-all mechanics remain subject to shared interaction and accessibility calibration.

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

Estimate uses the fixed T-Shirt vocabulary `S / M / L / XL`. Where shown, dense surfaces use a stable compact size treatment with the semantic level, while precise picker/filter/Inspector surfaces may expand it to Small / Medium / Large / Extra Large. The configured numeric aggregation weight is not normal Issue metadata and is not substituted for the T-Shirt level in Row/Card/Filter presentation. Estimate is optional on Row/Card and more naturally available in Peek/Inspector.

#### Cycle

Inside Project Workspace, a Workflow Issue that belongs to the Current Cycle shows a compact default **Current Cycle marker** on its Row/Card. The marker uses the stable Cycle visual identity; tooltip/focus/accessibility text says `Current Cycle`. It is a membership signal, not an Issue-side Cycle property.

The Current Cycle workspace does not repeat that marker because the enclosing collection already expresses membership. Historical Cycle membership does not become a stack of default Row/Card badges; historical membership remains Cycle-owned context available through Cycle History.

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
Initiative Focus   → Initiative Inspector
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

Project metadata such as title/description/Initiative/Priority/Due/Labels can remain editable in Completed/Canceled Projects where the operation is organization/correction rather than resumed execution.

### 9.2 Project Status dropdown and transition matrix

Status is changed by clicking the visible Project Status row and choosing among legal destination statuses. There is no need for a separate lifecycle wizard when a normal dropdown can present the legal actions clearly.

The category-level transition matrix is:

```text
Unstarted → Started | Canceled
Started   → Completed | Canceled
Completed → Unstarted | Started
Canceled  → Unstarted | Started
```

With the default Project Status configuration this appears to the user as:

```text
Planned     → In Progress | Canceled
In Progress → Completed | Canceled
Completed   → Planned | In Progress
Canceled    → Planned | In Progress
```

Concrete StatusDefinitions belonging to the legal target categories are presented according to configured names/order.

`Started → Unstarted` is unavailable regardless of the concrete Status names.

Selecting a Completed-category Status is guarded by Domain rules. If open child Issues remain, the option must explain why completion is unavailable and offer a direct route/filter to those blocking Issues rather than silently completing/canceling them.

Reopening a Completed/Canceled Project simply means selecting a legal Unstarted- or Started-category Status. No hidden previous status is restored.

Changing Project Status never rewrites child Issue Status or relations.

### 9.3 Progress

Project Progress uses a Linear-like simple horizontal progress bar plus compact percentage:

```text
Progress
────────────────────
████████████░░░░░░    67%
```

The bar answers only:

> How much current non-canceled Project work is complete?

Computation is owned by Domain/Query:

```text
Completed
──────────────
all current child Issues except Canceled
```

Canceled Issues are ignored completely. Started work receives no partial completion weight; Estimate/Priority/Due do not weight the result.

If the effective denominator is empty, display `—`/unavailable rather than fabricated 0%/100%.

Hover/focus may expose exact counts such as `8 / 12 completed`. The default Inspector need not spell those counts out in permanent prose.

Project Status remains independent. An In Progress Project can legitimately show 100% until the user explicitly moves the Project to a Completed-category Status.

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

Completed/Canceled/Due-less Issues do not participate.

Default rendering is graphical and low-text, for example:

```text
Attention
────────────────────
███ █████ ███████████
```

Semantic color/emphasis distinguishes Overdue, Due This Week, and Later Due. Exact colors are calibrated with the dark design system rather than hard-coded by this document.

Permanent legends/count sentences are not required in the compact Inspector. Hover/focus provides exact segment name/count/accessibility text. Only an Attention segment that maps exactly to the shared Filter grammar is an immediate Filter shortcut in V1: `Overdue` may apply `Due · Overdue`. The mutually exclusive `Due This Week` and `Later Due` segments do not map exactly to Trail's cumulative Due-cutoff Filter (`This week` means every Due through week end, including overdue), so they remain informational rather than introducing hidden date-range/exclusion clauses.

This is not a persisted `Health` score and is not a Status chart.

### 9.5 Broader Project Attention and future Health

Temporal Attention is one projection, not the complete definition of “things needing attention.”

A Canceled Project with unresolved open child Issues should expose a compact Project-attention indicator/reason because the Project lifecycle has ended while work still needs disposition. Clicking the signal can filter to unresolved child Issues.

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

While Project capability allows Milestone planning (Planned/In Progress), the section header may expose a compact `+`.

Quick create stays small:

```text
New milestone

Name
Due
Description

Progress     read-only/derived where shown
```

Owning Project is not normally reparented.Deleting a Milestone preserves its Issues. Confirmation should explain that linked Issues remain and lose/replace the Milestone relation; it must not imply cascade deletion of Issues.

In Completed/Canceled Projects the Milestone section remains readable summary context; create/edit/delete/assignment affordances are not normally shown.

### 9.8 Delete Project

Delete is not Project Status and does not belong inside the Status picker.

It lives in low-frequency Project overflow/destructive actions and requires confirmation because its relation effects are material. If the Project owns Workflow Issues, deletion requires an explicit legal replacement Project for those Issues. The current Default Project is different only in one respect: Delete is unavailable because the Project is not a legal delete target while it remains Default. The affordance should explain `Change Default Project first` and route to or identify the Settings action from Section 16 rather than opening a compound delete flow.

Once another Project has independently become Default, the former Default uses the ordinary Project Delete interaction:

```text
Delete Project
├─ preserve child Workflow Issues
├─ move them to the selected legal replacement Project when children exist
├─ clear their old Project-scoped Milestone relation
├─ remove Project-scoped Milestones
└─ remove Project
```

The Issue-destination Project is solely a child-work relationship choice. Delete never changes Workspace Default and never silently changes Issue Status merely to make an Issue destination acceptable. If the Project has no child Workflow Issues, no Issue-destination Project is required.

The confirmation should state useful concrete consequences/counts and the selected child-Issue destination when applicable rather than generic dramatic wording. Recovery/undo claims must match actual implementation capability.

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

- Due;
- Priority;
- Labels.

Triage uses the same shared Filter grammar frozen in Section 5.3 and does not invent extra operators or Triage-only syntax. `Due` is the Triage review Due by context. Because Triage Due is required, its Due filter does not offer `No due`; the cutoff presets and `Pick date…` use the same temporal semantics as other collections.
Filtering changes only which active Triage entries are visible. It does not redefine ordering, mutate properties, or recompute the global Review Set against the filtered subset. When a Filter is active, the UI should avoid presenting the unfiltered Review Set boundary as though it were a boundary in the filtered list; a global `to review` summary may remain clearly global.

`Display` is intentionally constrained and owns only supported ordering choices. V1 exposes Review Due and Priority ordering choices and does not offer Group/Sub-group, Board, Timeline, manual ordering, or a generic Sort builder. Default ordering remains Review Due ascending, then Priority, then stable fallback.

### 10.3 Triage Row

Triage Row is a product-specific scanning surface that may reuse shared row/property primitives but is not modeled visually as a Workflow Issue Row with fields removed.

Conceptually:

```text
[selection gutter]  [Priority]  Title                    ●●   Review Due
```

Title is the strongest visual anchor. The selection checkbox uses the same dedicated gutter as other selectable List rows and does not replace Priority. Priority, Labels, and Review Due use the same stable visual identities and picker primitives used elsewhere. Description/body stays out of the compact row and belongs in the Review Surface.

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

Title and lightweight Markdown description/body are directly editable without a permanent Edit/Save/Cancel shell. Priority, Labels, and Review Due are compact enrichment properties. When the main Trail pane can comfortably support both surfaces, the compact Queue and Review Surface remain visible side by side inside the Main View. When that composition would make either surface unusably narrow, Review becomes the focused Main View surface while compact queue context, collection position, and previous/next navigation remain available; the user can return to the full Queue without leaving Triage. Review never moves into the persistent Right Inspector. Exact queue/review widths and transition thresholds remain full-shell calibration decisions.

Adjacent-item navigation is first-class so a user can process a review session continuously. Completing a successful Accept, Defer, or Delete selects the next entry according to the current visible/ordered queue when one exists.

Queue and Review participate in the Main View history model from Section 3.3. `Triage / Queue` and `Triage / Review(issueId)` are separate semantic navigation states. Review Previous/Next resolves adjacent identity from the current visible/ordered Queue and then performs normal navigation to that Review state; host Back/Forward traverses the already-visited history instead of substituting for Review sequencing.

### 10.5 Accept

`Accept` is the primary Triage disposition. It means “formalize this intake,” not “turn this record into a Workflow Issue.”

Activating or hovering/focusing Accept progressively discloses the two target kinds:

```text
Accept
├─ Issue
└─ Project
```

A direct Accept activation opens the same two-target disclosure; Trail does not silently choose Issue as the default. In wide layouts the choices may disclose beside the button; constrained layouts may disclose below it. The interaction should reuse the shared menu/popover mechanics rather than create a special Triage widget.

Choosing **Issue** opens the standard Issue Composer used elsewhere. Choosing **Project** opens the standard Project Composer. There is no Triage-specific Accept form.

V1 passes only these automatic initial values into either normal create draft:

```text
Title
Description / body
```

Triage Priority, Labels, and Review Due are not automatically copied. The normal target Composer still lets the user explicitly choose its ordinary properties before confirmation.

For Issue, standard creation semantics still require an explicit legal Project and create the Workflow Issue in Backlog; the current Default Project may initialize the normal Project picker only when legal. For Project, the ordinary Project creation defaults and validation apply.

Canceling the target Composer leaves the Triage entry unchanged. After target creation succeeds, the source Triage entry is removed through the normal destination-first mutation path and the Review Surface advances to the next entry.

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

Triage participates in Trail's resolved shared Selection/Action system. Context Menu, Command Menu, keyboard dispatch, and any useful Triage Bulk action consume the same Action Registry and ordinary Triage capabilities; Triage does not define a second selection grammar, command system, or Bulk legality model. V1 exposes Bulk only where a concrete Triage consumer has one meaningful common action/target rather than attempting to make every Triage action bulk-capable.

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

Cycle Board reuses the same concrete Issue StatusDefinition projection as Project Board. With the default Issue Status configuration, the visible columns are:

```text
Todo
In Progress
Done
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

Cycle uses the shared Filter grammar frozen in Section 5.3 with the property registry above. `Project` is useful here because Cycle scope may cross Projects. `Cycle` itself is not a Current Cycle filter field because the current location already supplies that scope. Historical Cycle uses the same property registry over the current live fields of its retained members.

Filtering changes visibility only. It does not change Cycle membership, Board Status projection, Project swimlanes, automatic List clustering, or Issue properties.

`Display` controls the supported secondary metadata of the current List/Board presentation; it does not become a generic Group/Sub-group or Sort builder. Project is not a Board Card property because the fixed swimlane already expresses it. List may show Project together with the shared optional Issue metadata.

Historical Cycle uses the same Filter field registry because its rows resolve the same current live Issue facts. Its `Display` controls flat List metadata only.

### 11.4 Membership discovery and actions

Cycle membership is explicit selection, not a Workflow property mutation. Adding/removing membership changes the Open Cycle's membership only and never changes Issue Status, Project, Milestone, Priority, Estimate, Labels, or Due.

Current Cycle provides a low-noise `Add issues` flow using the shared searchable/filterable Issue selection grammar. To keep Cycle-level discovery focused on current execution, this entry point proactively surfaces open Workflow Issues from In Progress Projects and excludes Issues already in the Current Cycle. This is only a discovery policy; it is not Domain membership legality.

Project Workspace remains an equally important planning entry point. In a Planned Project, a Backlog Issue may be explicitly added to the Current Cycle from that Project's Issue context/selection even though it was not discoverable from Cycle-level `Add issues`. The Issue remains Backlog and the Project remains Planned. It therefore appears in Current Cycle List and will appear in Board only after ordinary Project capability later permits a Status that belongs to the Board execution projection.

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

A later `Start next Cycle` uses the normal Start Cycle flow with one convenience: members of the previous Cycle that are **currently open** may be initially selected as next-Cycle candidates. The user can deselect any candidate, add other Issues, or cancel the flow and remain without a Current Cycle. Candidate state is calculated from current Issue facts when the flow opens; Trail does not save an unfinished-at-close snapshot or perform automatic rollover.

### 11.6 Progress and Effort

Current Cycle uses the same simple Progress semantics as Project/Milestone over the current live membership:

```text
effective members = Current Cycle members except Canceled
completed members = effective members in Completed

Progress = completed / effective
```

If there are no effective members, Progress is unavailable rather than fabricated as 0%/100%. Started work receives no partial credit and Estimate does not weight Progress.

`Effort` is a separate live aggregate over configured Estimate weights:

```text
Effort = sum(configuredWeight(member.estimate) for every member whose Estimate is present)
```

Every member with a present T-Shirt Estimate contributes its current Workspace-configured weight regardless of Status. V1 defaults are `S=1`, `M=2`, `L=5`, and `XL=10`; missing Estimate contributes nothing. The Issue continues to display/store the T-Shirt level, not the weight. Changing the weight mapping changes the live Effort projection without rewriting members. Effort is not named Capacity/Velocity/Success and has no forecasting meaning.

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

Historical Effort is still a live aggregate of the current configured weights for the retained final members' current T-Shirt Estimates; it does not mean “Effort at close.” Historical Inspector does not need to emphasize Progress because Trail does not preserve close-time Issue state and History is not an analytics surface.

### 11.8 Historical Cycles

History is passive final-membership history rather than a performance dashboard.

The History list is chronological and compact. A row needs only stable Cycle identity/context such as date range, final member count, and optionally actual close date; it does not display predictive Capacity, Velocity, Cycle Success, or a stored Progress result.

Opening a Historical Cycle produces a **List-only flat Issue collection**. It has no Status sections, Project grouping, Board, Project swimlanes, or editable membership.

Conceptually:

```text
Cycles / History / Aug 11 – Aug 24

12 issues · Effort 27

Filter                                      Display

Issue A     Project A     In Progress    M    ●●
Issue B     Project A     Done           L    ●
Issue C     Project B     Backlog        —
Issue D     Project C     Canceled       S
```

Status and Project are ordinary row fields. Other shared fields such as Priority, Milestone, Labels, Due, and Estimate may be shown through the normal Display rules. The list remains visually flat even when ordering keeps related Project work coherent.

Historical Cycle membership is the only retained Issue-level Cycle history. Every displayed Issue property is resolved from the current live Issue record, so a later Status, Project, Estimate, Label, or Due change is reflected when the Historical Cycle is opened. Trail deliberately does not label those values as the state “at close.”

Historical Cycle retains normal Issue inspection/navigation actions such as Peek/Full Item where current Issue/Project capability permits them, but it exposes no Add/Remove Cycle-membership action.

## 12. Home

Home is a modular, visual-first homepage rather than a reduced work collection or a prose dashboard. Its V1 content is a fixed set of modules whose exact grid positions, spans, border/surface treatment, and width-dependent visibility are intentionally deferred to the next **Workspace Grid / Composition** closure.

The structural rule is:

```text
Home
-> independent rectangular modules
-> graphical information dominates permanent prose
-> text mainly labels, numbers, and hover/focus detail
-> module boundaries may be explicit or visually quiet depending on Linear-style calibration
```

Home does not create new canonical telemetry, daily snapshots, activity logs, productivity scores, or Health facts merely to support visualization. V1 analytics are projections from the currently retained Trail data and temporal policy.

### 12.1 Work Pulse modules

Work Pulse is intentionally light. It communicates current system state without reproducing Cycle, Triage, or Projects working surfaces.

**Current Cycle** shows the current Cycle period plus the existing simple Cycle Progress projection. The default module is bar-first and low-text; exact completed/member/Effort detail may appear on hover/focus rather than as permanent copy.

**Triage** shows two compact quantities over the active Triage collection:

```text
Overdue = Review Due < now
Remain  = other active Triage entries
```

The preferred information form is a small combination of bars plus counts rather than a Triage item list.

**In Progress Projects** includes only Projects in the Started lifecycle category (default visible Status `In Progress`) and represents each with its existing Project Progress projection. The default module is a compact set of progress micro-bars plus a small aggregate count. Project title and exact progress may be progressively disclosed on hover/focus rather than permanently consuming horizontal space. It does not create a hidden Home ranking or Health score.

### 12.2 Lifecycle Activity Heatmap

The Heatmap measures daily lifecycle-event density only. For a calendar day `D`:

```text
activity(D)
= count(Workflow Issue createdAt on D)
+ count(Workflow Issue firstStartedAt on D)
+ count(Workflow Issue terminalAt on D)
```

The three timestamp kinds are deliberately treated equally. V1 does not weight them by Estimate/Effort and does not encode timestamp kind with separate colors.

The visual encoding uses one Linear-compatible hue and varies intensity by the total `activity(D)` value. Exact hue, intensity steps, empty-cell treatment, and scale normalization are visual-calibration decisions. Hover/focus may expose the date and the underlying counts, but the default grid remains low-text.

### 12.3 Work Trend

Work Trend complements the Heatmap by showing work stock and completion flow over time. It is recomputed from currently retained Workflow Issue timestamps; Trail does not persist daily snapshots solely for this chart.

For each day `D`:

```text
Backlog stock
= Workflow Issues created by D
  whose firstStartedAt has not occurred by D
  and whose terminalAt has not occurred by D

Active stock
= Workflow Issues whose firstStartedAt has occurred by D
  and whose terminalAt has not occurred by D

Completed flow
= Workflow Issues whose terminalAt falls on D
  and whose current terminal category is Completed
```

`Backlog stock` therefore means the work that, as of that day, has only reached the created lifecycle evidence. `Active stock` is already-started unfinished work. These two series are stocks and may grow when work accumulates; `Completed flow` is day-local rather than cumulative so old completions do not inflate the chart indefinitely.

This chart intentionally reads the available data directly rather than introducing edge-case history reconstruction or a new transition log. If currently retained lifecycle evidence changes later, the retrospective projection may change with it.

### 12.4 Temporal Orientation

Temporal Orientation provides the current date/week context and a compact view of near-term Due distribution. V1 distinguishes exactly two Due sources:

```text
Triage Review Due
Workflow Issue Due
```

The module uses separate compact colored-dot identities for those two sources across the current-week temporal strip. It does not mix Project, Initiative, or Milestone Due into the V1 module. Exact dot stacking, density compression, colors, and hover/focus detail remain part of the later composition/visual calibration.

### 12.5 Weekly Meeting Notes

Weekly Meeting Notes is the existing lightweight Trail-managed `Collections/Weekly Update.md` utility used to jot down the talking-point outline for the user's work weekly meeting. It is not a Domain entity, personal journal, life-log surface, or general weekly-review system.

The existing utility structure remains:

```text
Current
Archive / History
```

V1 user operations remain deliberately small:

```text
Open / Read
Edit Current
Archive / Next
```

`Archive / Next` moves the current content into the same file's Archive/History block and clears Current for the next working outline. Only Current is the normal editing target. Home presentation does not justify another weekly-note entity, status model, undo/history subsystem, or automatic linkage to Issues/Cycles.

### 12.6 Home creation

The compact Home `+` menu remains the shared creation entry already frozen in Section 5.7.5:

```text
Triage
Issue
Project
Initiative
```

It is shell/action affordance rather than another Home analytics module.

### 12.7 Composition boundary

This section freezes **what Home can show and how each module derives its information**. Section 13 freezes how those modules and the other major Trail surfaces use available Obsidian pane space. Exact Home track count, numeric spans, borders/surfaces, and lower-level packing measurements remain implementation-time visual calibration rather than Domain or product data.

## 13. Workspace Grid and Responsive Composition

Trail responds to the **actual space currently available to its Obsidian Main View**, not to a separate mobile/desktop product mode and not to display resolution alone. Obsidian owns the window, sidebars, tab groups, splits, resize/collapse behavior, and therefore the amount of space Trail receives at any moment. Linear remains the primary visual/composition reference for equivalent work surfaces inside that host behavior.

### 13.1 Spatial ownership

Trail uses three composition responsibilities without requiring one universal fixed-column system:

```text
Obsidian Host
→ owns window / splits / sidebars and determines Trail pane capacity

Trail Workspace Frame
→ aligns Location Bar / optional Context / optional View Bar / Content

Page Composition
→ decides the major regions appropriate to the current surface

Component Internal Layout
→ owns Row/Card metadata, Board columns/swimlanes, Timeline axis, charts, and other local geometry
```

The Workspace Frame does not impose one narrow global `max-width`. Collection, Board, Timeline, and Home surfaces may use the available Main View width. Content whose usability depends on readable line length, especially Issue Full Item body and Weekly Meeting Notes editing, may use an inner comfortable reading/editing measure without constraining the whole Trail workspace.

The final CSS mechanism may use shared tracks, container queries, `minmax`, or a small number of page-specific composition states as implementation evidence requires. Track count itself is not a V1 product concept. A page must not be forced into a dashboard/card layout merely because Home is modular.

### 13.2 Inspector ownership and page-entry composition

The persistent Trail Inspector is an **Obsidian Right Sidebar view**, not a column inside the Trail Main View grid.

Locations with no stable primary entity do not expose a Trail Inspector:

```text
Home
Triage
Search
Projects Root
```

Locations with a stable primary entity may expose the matching Inspector:

```text
Initiative Focus   → Initiative Inspector
Project Workspace → Project Inspector
Current Cycle      → Current Cycle Inspector
Historical Cycle   → Historical Cycle Inspector
Issue Full Item    → Issue Inspector
```

Triage Review is part of the Triage Main View workflow and never becomes a Right Inspector merely because it may occupy the right side of a wide composition. Peek is likewise transient Main View UI and does not become the persistent Inspector.

Inspector initial visibility is decided on **location entry**:

```text
enter Trail location
→ resolve whether the location has a Trail Inspector target
→ if none, do not present a Trail Inspector for this location
   → leave unrelated Right Sidebar views and host layout untouched
→ if present, evaluate the current Obsidian workspace capacity
   → enough room for Navigation + useful Main View + Inspector: reveal the Trail Inspector initially
   → constrained Main View: leave the Trail Inspector closed initially
→ finish the location's initial composition
```

This automatic decision runs only when entering/loading the location. While that location remains active, user actions own Inspector visibility: resizing the window, resizing host sidebars, opening/closing the Inspector, switching List/Board, opening Peek, or changing other local presentation does not cause Trail to reopen or collapse the Inspector automatically. Leaving the location and later entering another Inspector-capable location - including returning to the same entity location - performs a fresh entry-time capacity decision using the then-current Obsidian layout.

Trail does not persist a per-entity or per-visit Inspector-open browsing preference merely to implement this behavior. The automatic action targets only the Trail Inspector view; it must not destructively close or replace unrelated Obsidian Right Sidebar views such as Backlinks, Outline, or another plugin view.

### 13.3 Surface behavior as space changes

Shared priority remains:

- preserve current location before breadcrumb ancestry;
- preserve title/identity before secondary metadata;
- preserve semantic icons before repeated labels where meaning remains clear;
- collapse or overflow low-priority actions before forcing whole-page horizontal overflow;
- keep exact hidden/compressed values available through tooltip, picker, Peek, Inspector, Full Item, or accessibility text where applicable.

Major surfaces then adapt according to their own role:

| Surface | Normal/wide behavior | Constrained behavior |
| --- | --- | --- |
| Home | Multiple independent visual modules share the available width; charts/heatmap can receive materially more horizontal space while small pulse modules stay compact | Reduce parallel module packing and reflow toward fewer columns / compact representations; do not shrink charts into unreadable noise merely to preserve a wide arrangement |
| Triage | Queue + Review may remain side by side inside Main View | Review becomes the focused Main View surface with compact Queue context/position/previous-next access rather than moving Review into the Right Sidebar |
| Projects Root / Initiative Focus List | Compact single-line Project rows may expose more useful metadata | Remove secondary metadata progressively; preserve Project title and Status identity first, with meaningful exception Attention/Priority ahead of ordinary secondary fields |
| Project / Cycle List | Compact single-line Issue rows may expose more useful metadata | Reduce secondary metadata without turning each row into a mini details view; preserve enclosing-scope identity such as Project in Cycle List where it remains necessary context |
| Project / Cycle Board | Board uses available viewport for Status columns/cards; Cycle additionally owns Project swimlanes | Keep cards at a useful width and let the Board own horizontal scrolling; do not silently switch Board to List because the pane narrows |
| Projects Timeline | Timeline uses available width for project rows and its time axis | Timeline owns horizontal navigation/scrolling and dense-marker handling; the whole Trail page does not become horizontally scrolling |
| Full Item | Main View may be wide while the Markdown editor uses a comfortable content measure; Right Inspector remains host-owned | Editor naturally narrows with the pane; Inspector is not moved below the body by Trail |

Cycle Board's Project swimlane identity must remain understandable while Status columns scroll; exact sticky-label behavior and swimlane width are implementation-time calibration. Board and Timeline overflow are component-owned exceptions to the rule that the Trail page itself should not need horizontal scrolling.

For the shared Creation Composer, normal width keeps the resolved entity properties directly accessible; constrained panes progressively overflow lower-priority property controls without changing creation semantics or creating a separate compact form.

### 13.4 Calibration environments

Responsive behavior is calibrated in real Obsidian against common working environments such as approximately `1366×768` and `1440`-class laptop windows, `1920×1080`, `2560×1440`, and `3440×1440`, plus representative left/right Sidebar and central split combinations. These are validation environments, not product breakpoints.

Exact thresholds are derived from the useful size of the actual Trail pane and its content, not from a rule such as “screen >= 1920”. The exact breakpoint values, gutters, track implementation/count, card minimum widths, readable content measures, Inspector preferred width/reveal threshold, Home module spans/placement/compact-or-hide details, and Triage queue/review width ratio remain full-shell calibration decisions.

## 14. Search

Search is Trail's global discovery surface for existing Trail work. It borrows Linear's compact, keyboard-first search rhythm while remaining scoped to Trail's own model and leaving ordinary Vault-note search to Obsidian.

### 14.1 Entry and scope

The primary visible entry is the high-frequency `Search` action in the Trail Navigation header beside `Capture`; Search is not another ordinary sidebar row. Activating it navigates the existing Trail tab to the `Search` location and focuses the search input immediately.

V1 global Search covers:

```text
Initiatives
Projects
Workflow Issues
Triage entries
```

Ordinary Obsidian notes are not absorbed into Trail Search merely because Trail runs inside Obsidian; host Vault Search remains the normal note-search capability. Search itself has no persistent Trail Inspector because the page is a discovery collection rather than a stable primary entity location.

### 14.2 Result composition

Results use a dense, scan-first list and are grouped by Trail entity kind rather than mixing every object into one visually ambiguous relevance stream. Title/identity is dominant; only small context needed to disambiguate a result is shown by default.

V1 deliberately does not copy Linear's collaboration/team/user search dimensions, advanced query syntax, saved searches, or a second Filter builder. Exact empty-query/recent treatment may be calibrated later without creating a persisted search-history Domain model.

### 14.3 Activation behavior

Result activation follows the destination's existing interaction model:

```text
Project result
→ Project Workspace

Initiative result
→ Initiative Focus

Workflow Issue result
→ open the shared Workflow Issue Peek inside Search
→ explicit deeper open enters Issue Full Item

Triage result
→ navigate to Triage
→ open that entry in the normal Triage Review Surface
```

Search does not create a Search-specific details model. Workflow Issue Peek remains transient Main View UI and does not create/change a persistent Inspector target. A Triage result uses Triage Review rather than Workflow Issue Peek because Review is the canonical Triage-detail workflow.

### 14.4 Keyboard and responsive behavior

Search must support a keyboard-first flow: typing updates results, the current result can be moved without the pointer, and the current target can be activated without leaving the keyboard. Exact key choices for result traversal, Peek, Full Item, escape/clear, and host-focus conflicts remain implementation-time shortcut calibration rather than product semantics.

On very wide panes, Search results use a comfortable scan width instead of stretching one result row across the entire display. On constrained panes, the result list remains the primary single-column surface; any Peek follows the shared Peek responsive treatment inside the Main View. Search itself does not require whole-page horizontal scrolling.

## 15. Runtime / Data-Issue / Optimistic Feedback

### 15.1 Feedback principle

For an equivalent responsibility, Trail follows current Linear feedback behavior and visual rhythm unless Trail's local Markdown/LKG architecture requires a semantic difference. Trail does not invent a parallel save/sync/error design language simply because the underlying persistence is Markdown.

The core rule is:

> **Normal local success is silent and optimistic. Persistent feedback is reserved for conditions that actually deserve attention.**

Runtime state and visual feedback are therefore intentionally not one-to-one. Trail may pass through `pending` or `refreshing` without showing any dedicated UI when the local operation settles too quickly for feedback to help.

### 15.2 Normal optimistic mutations

Normal local actions such as Status/Priority/Due changes, drag/drop, Triage Accept/Defer, Project edits, and creation update the effective UI immediately through the existing optimistic Runtime projection.

The ordinary fast path shows no `Saving`, no `Saved`, and no success toast:

```text
user action
→ optimistic UI changes immediately
→ local Markdown / plugin-data persistence settles
→ confirmed state replaces optimism
→ no extra success message
```

A pending marker may exist as internal/runtime state without becoming visible presentation. Existing POC `Saving` chips or status panels are not target UI merely because the Runtime exposes pending state.

### 15.3 Loading, refreshing, and unusually slow local work

Trail is local-first, so normal startup, refresh, and persistence are expected to complete quickly. V1 does not freeze an arbitrary millisecond threshold for when an operation becomes visibly slow.

If initial loading or a refresh completes on the normal fast path, no large status panel appears. If it lasts long enough to be useful to the user, Trail may surface the same quiet, low-attention status grammar Linear uses for sustained syncing/loading: a compact shell-level `Loading`, `Saving`, or `Refreshing` indication rather than a page-blocking card. Completion simply removes that indication; there is no follow-up `Saved` confirmation.

The exact reveal delay, whether a count is useful, and the threshold at which the state becomes perceptible are **performance-calibration decisions**. They must be based on representative local Vault/Project/Issue benchmarks later rather than guessed in product design.

While Runtime is `refreshing`, the last-known-good content remains readable and normal mutation is paused according to Architecture. Presentation changes, navigation, Search, Peek, and other read-only interactions remain available where their data is trustworthy.

### 15.4 Mutation failure

When a submitted mutation fails, the failed optimistic plan is removed and the affected UI returns to reliable committed/LKG state. The user then receives a concise Linear-style transient error toast/notice tied to the attempted action, for example:

```text
Couldn't update issue status
```

The message explains the user-visible failure, not internal queue/parser/transaction terminology. Trail does not pair every mutation with a success toast merely to make failure presentation symmetrical.

### 15.5 Data Issues and last-known-good presentation

A Data Issue is persistent source health, not a one-shot mutation error. When one managed source is invalid but Trail has reliable last-known-good data, that content remains visible and the warning stays present until the source becomes healthy again.

Trail uses the closest Linear warning/error visual language rather than creating a separate diagnostics product. The affected entity/location shows a compact persistent warning such as:

```text
⚠ Showing the last valid version
  This Project can't be edited until its Markdown source is valid again.
  Open source
```

`Open source` is a Trail-specific action because authoritative Markdown is user-accessible. Normal product copy does not expose parser stages, opaque IDs, source ranges, stack traces, or internal error codes unless a development diagnostics surface explicitly asks for them.

When one or more Data Issues exist outside the currently visible entity, Trail may show one quiet workspace-level warning glyph/status in the Navigation/header area so Home, Search, and other aggregate views do not imply that every source is current. It is a status affordance, not a new Data Health page or dashboard. Source-scoped mutation remains disabled only as broadly as the existing `control + health + ownership` policy requires.

### 15.6 Read-only and blocking failure

If Trail enters `read-only-error` while a trustworthy last-known-good snapshot still exists, normal content stays visible and readable. A persistent Linear-style warning makes the read-only condition clear, while mutation affordances are unavailable. Trail does not replace useful LKG content with a full-page error merely because writes are paused.

A blocking error state is reserved for startup/refresh conditions where Trail cannot establish any trustworthy readable state. That surface may explain that Trail could not load safely and provide the smallest applicable recovery action such as opening the affected source or retrying. It must not fabricate empty/healthy-looking workspace data.

## 16. Default Project Setter

### 16.1 Location and shape

Default Project is a Workspace preference, not a high-frequency Project property. V1 exposes one primary setter in the native Obsidian Trail Settings surface:

```text
Trail Settings

Workspace
────────────────────────────────
Default project
Trail                                      Change
```

The current Project title is displayed from the resolved stable Project reference. `Change` opens the shared searchable Project Picker rather than a small native dropdown so the interaction remains usable with a long-lived Workspace containing many Projects.

### 16.2 Selection semantics

The picker lists existing ordinary Projects and marks the current Default. There is no `No default project`, Clear, or empty choice in normal V1 UI.

Selecting another Project changes only `workspaceState.defaultProjectId`:
```text
Default Project A
→ choose Project B
→ Workspace reference becomes B
```

It does not move Issues, change Project lifecycle, change Initiative membership, rename either Project, or recreate `Standalone`. A Project may remain the Default in any of its legal lifecycle states; downstream creation/move interactions preselect it only when it is a legal target for that specific operation.

Normal setter success follows Section 15 and is silent/optimistic. Failure restores the previous resolved Default and uses the same transient error-feedback pattern as other mutations.

### 16.3 Deleting the current Default

The current Default Project cannot be deleted. Project Delete does not contain a replacement-Default picker or combine the two mutations.

The user first uses the setter above to choose another existing Project and lets that Workspace mutation succeed. The Navigation shortcut then switches to the new Default. The former Default is now an ordinary non-Default Project and may be deleted through the normal Project Delete interaction, including a separate child-Issue destination only when its Workflow Issues require one. V1 does not add a special Default-Project subtype or separate Standalone management flow.

### 16.4 Startup recovery is not a settings workflow

If persisted Workspace State physically lacks `defaultProjectId` during initialization, Source Sync performs the canonical reserved-sequence-`0000` recovery before normal ready UI appears, adopting a valid ordinary `0000` Project regardless of its readable title or creating `Projects/0000 Standalone.md` only when that reserved carrier is absent. Invalid/untrusted reserved data and later refresh failures remain Data Issues below the UI. Settings does not present an empty Default state or ask the user to repair routine bootstrap absence manually.

V1 does not add secondary `Set as default` actions to every Project context menu/Inspector. Such convenience can be added later only if real use shows that changing Default Project is frequent enough to justify another entry point.

## 17. V1 UI Freeze

Main View semantic navigation/history, Project Workspace, Projects Root, Initiative Focus, Triage, Cycle, standard Creation Surface, simplified shared Filter, shared Selection/Action interaction semantics, Home, Workspace Grid/responsive composition, Search, Runtime/Data-Issue/optimistic feedback, and the Default Project setter are now resolved at the V1 product-interaction level.

**V1 `ui.md` is frozen for formal implementation alignment.** Implementation may still calibrate the values explicitly listed in Section 19 against real Obsidian/Linear evidence, but it must not reopen the resolved product behavior merely because the current POC uses different panels, forms, layout, or error presentation.

## 18. Explicitly Deferred Beyond Current V1 UI Closure

The following product conveniences are deferred and do not block V1 UI freeze or formal implementation of the supported workflows:

- Custom Views user-facing creation/editing/navigation;
- Favorites user-facing navigation and management;
- future Workspace Issues collection;
- future Home analytics, personalization, or Health/ranking policies beyond the frozen V1 modules;

Their existing Domain/Data/Workspace-state concepts do not require speculative V1 UI or implementation work.

## 19. Implementation-Time Calibration Decisions

The following may remain replaceable until the relevant real-Obsidian surface exists and can be calibrated against current references:

- final pixel values, color values, opacity, radius, and spacing;
- final icon choice where multiple existing Obsidian/Lucide equivalents are plausible;
- final Label palette and color-assignment function;
- exact Workspace Grid implementation mechanism, pane-width thresholds, gutters, track count/spans, and component minimum widths consistent with Section 13 behavior;
- exact Inspector preferred width and entry-time reveal threshold, while preserving host ownership and the frozen entry-only automatic policy;
- exact Home module positions/spans, border treatment, compact representations, and any final width-dependent hide decision consistent with the frozen Home content and Section 13 behavior;
- exact Triage Queue/Review width ratio, transition threshold, and constrained Queue-context visual treatment;
- exact Search content measure, group spacing, empty-query/recent treatment, and keyboard bindings consistent with Section 14 semantics;
- exact sustained-duration thresholds and optional count treatment for surfacing `Loading` / `Saving` / `Refreshing`, based on representative local performance tests rather than guessed constants;
- exact transient error-toast duration, placement, animation, and Obsidian-host integration while preserving the frozen Linear-like low-noise behavior;
- exact Default Project picker width, row metadata density, and search/focus mechanics while preserving the frozen Settings location and no-empty-choice rule;
- exact lower-level Project Issue ordering/clustering algorithm;
- exact lower-level Cycle List ordering within the resolved Status/Project coherence rules;
- exact default optional Issue property set for Project Workspace/Cycle List vs Board beyond the hierarchy defined above;
- exact final placement/shortcut for Project-local Create Issue within the resolved contextual-create contract;
- exact Creation Composer width, compact-property overflow breakpoint/order, and whether the Linear-style footer shows shortcut hint text;
- exact final placement of Current Cycle `Add issues` and History access within the already-resolved Location/View-Bar responsibility split;
- exact user-facing body-heading mapping required by managed Markdown's reserved H1/H2 structure;
- exact keyboard shortcut bindings and Obsidian conflict/focus mapping over the frozen shared Action IDs;
- exact Timeline scale defaults, date-axis geometry, dense Due-marker collision/aggregation, and final visual calibration;
- final full-shell screenshots and calibrated UI measurements.

These calibration items should be resolved against real consumers and host behavior without introducing speculative generic frameworks.

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
├─ Sidebar
│  └─ navigation
│
└─ Main area
   ├─ Back / Forward        <- ->
   └─ Main View             one canvas
      ├─ current Page       defines what is drawn on the canvas
      └─ Inspector          when the current Page needs one
```

The model is intentionally simple:

- **Sidebar** chooses which Page the user is looking at.
- **Back / Forward** moves through previously visited Pages.
- **Main View** is one canvas. Its available width is an input to layout.
- **Page** defines what is drawn on that canvas for one destination.
- **Inspector** shows information related to the current Page or the current object in that Page when that Page uses an Inspector.
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

1. draw the page as a text layout;
2. list the visible elements inside that layout;
3. describe only the interactions needed to understand the visible drawing/state changes;
4. draw materially different visible states when useful;
5. draw wide and narrow Main View arrangements when the composition changes;
6. include the Page's Inspector in the same discussion when the Page uses one;
7. record the accepted drawing and move to the next Page.

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

### 5.1 Sidebar - closed

The Left Sidebar is fixed navigation. Its current drawing is:

```text
Home
Triage                                      <Review Set count when non-zero>

Workspace
<current Default Project title>
Projects
Cycles
```

Notes:

- `Workspace` is a quiet section label, not a destination.
- the Default Project occupies one fixed navigation slot while its visible title follows the current Default Project;
- the Triage trailing number is quiet row metadata for the current Review Set count, not a generic notification/unread badge;
- the exact icon glyphs, row height, spacing, opacity, hover, selected surface, and other small visual measurements are calibration details; use the closest equivalent Linear navigation treatment where one exists.

The Sidebar does **not** contain:

- Search;
- Capture;
- a separate Trail header/action area;
- Settings;
- Foundation Lab;
- Initiative rows;
- a Project tree or dynamic Project children;
- Favorites or other features not already part of this navigation drawing.

Search and Quick Capture may exist elsewhere because Product defines those capabilities; their placement is not inferred from the Sidebar.

### 5.2 Next drawing target

Continue from the top-level Main View controls:

```text
<-  ->

[ Main View canvas ]
```

Discuss and draw this as part of the visible Main View frame. Do not broaden that discussion into unrelated Page contents before the frame itself is visually clear.

After the shared frame is clear, draw the actual Pages one by one from the existing Product/UI scope.

## 6. What existing documents mean during this drawing pass

Use the existing documents with narrow responsibilities:

- `docs/product.md` tells us what product capabilities and destinations already exist. Do not redefine scope in this drawing pass.
- `docs/ui.md` supplies already-settled UI behavior and presentation constraints that the drawings must respect.
- `docs/domain.md`, `docs/data.md`, and `docs/architecture.md` supply semantics and technical constraints only when they materially affect what can be drawn.
- `docs/implementation.md`, current source code, tests, and screenshots are implementation evidence. They must not decide what a page drawing looks like merely because they already exist.
- `docs/design-to-code-map.md` is implementation traceability. Existing component/file names do not force component boundaries during the drawing pass.

### 6.1 Known documentation drift to avoid during drawing

`docs/ui.md` currently contains an older navigation composition that visually places `Search` and `Capture` with the Trail navigation header. That placement is stale for the current drawing work. The accepted Sidebar drawing is the one in Section 5.1 above: Sidebar is navigation only, without Search or Capture.

Similarly, existing names such as `TrailWorkspaceShell`, `TrailLocationBar`, current page-private Triage components, or any other present implementation name must not be treated as required objects in the text drawing. First draw what the user sees. Name/extract shared components later.

`docs/implementation.md` still describes the earlier Triage-first Phase A/B/C construction sequence. That is historical implementation state, not the current UI drawing process and not a reason to start production UI work before the page drawings are complete.

## 7. Communication rule for the drawing sessions

Prefer ordinary visual words:

```text
Sidebar
Back / Forward
Main View / canvas
Page
Inspector
component
```

Do not introduce architectural vocabulary merely to describe a visible rectangle, row, title, control, list, chart, or panel.

When discussing a Page, stay on that Page. Do not pull later Pages, implementation ownership, component extraction, or Product-scope questions into the current drawing unless they are strictly necessary to understand what is visible.

# Trail Product

## 1. Purpose

Trail is a personal project and task management product inside Obsidian.

It combines readable Markdown persistence with a compact execution interface so one person can capture work, organize projects, decide what matters now, move work through a workflow, and keep related long-form knowledge in ordinary Obsidian notes.

Trail is not a second document system and is not intended to reproduce collaboration-first project-management products. It favors mature personal execution patterns where those patterns fit Trail's Obsidian-native and single-user goals.

## 2. Scope

### 2.1 In scope for V1

Trail V1 covers:

- Quick Capture and Triage;
- Workflow Issues;
- Projects, Milestones, and Initiatives;
- personal planning Cycles;
- Status, Priority, Estimate, Due, and structured Labels;
- Board and List presentations;
- Filter, Group, Sort, Search, Custom Views, and Favorites as needed by the supported workflows;
- Home as a global summary and routing surface;
- Peek, Context Menu, Selection, Bulk Actions, Command Menu, and keyboard-oriented interaction;
- lightweight entity descriptions and properties;
- ordinary Obsidian notes as the long-form knowledge/document layer;
- a lightweight Weekly Note utility on Home.

### 2.2 Out of scope for the core V1 model

Trail does not introduce:

- Teams, Assignees, subscriptions, SLAs, or other collaboration-first concepts;
- recursive Sub-issues or parent/child Issue hierarchy;
- a generic Related/Blocking relationship graph;
- a separate Area entity;
- a separate TriageItem or Fleeting Note entity;
- a second rich-document editor or document domain;
- a full immutable Activity/Event Log;
- manual Project/Initiative/Milestone progress facts when they can be derived;
- Reminder, Snooze, Due Soon, Overdue, Health, or Attention as duplicate persisted entity state;
- a generic query language, BI-style view builder, or arbitrary transaction framework;
- automatic AI/agent modification of authoritative data without explicit user intent.

Templates, recurring creation, integrations, inbox-like information surfaces, and AI/agent conveniences may be added later as capabilities built on the established model; they do not redefine the V1 core domain.

## 3. Product Model

### 3.1 Workspace

Workspace is the single personal Trail boundary. It owns workflow definitions, Label definitions, defaults, shared temporal settings, Saved Views, Favorites, and Home configuration. It is not a normal user-created work item.

### 3.2 Initiative

An Initiative is a long-term goal advanced through multiple Projects.

It provides a higher-level way to understand a set of related Projects without becoming another workflow item that the user manually moves through Statuses.

### 3.3 Project

A Project is a clear, completable outcome or deliverable.

It is the primary planning/execution workspace for a coherent body of work and can contain Milestones and Issues. A Project has an explicit lifecycle Status chosen by the user.

Project lifecycle has four semantic categories:

```text
Not Started
In Progress
Done
Cancelled
```

Concrete Project Status names remain configurable through Project StatusDefinitions, but Project StatusDefinitions may belong only to the corresponding system categories `Unstarted`, `Started`, `Completed`, or `Canceled`. Project does not use the Issue `Backlog` lifecycle category.

Project Status does not decide which child data exists or how that data is reported. Project Workspace always reflects the actual current Issues, Milestones, and derived information. Project Status primarily controls which planning/execution mutations are currently legal and which execution-oriented presentations are useful.

### 3.4 Milestone

A Milestone is a Project-scoped intermediate outcome or checkpoint.

It groups otherwise independent Issues around a meaningful stage of a Project. It is not an Issue hierarchy level and is not itself an executable task. Milestone progress/completion is derived from its currently associated Issues rather than manually maintained.

### 3.5 Issue

An Issue is the smallest structured unit of work in Trail.

Issues are flat. If an Issue is too large, the user restructures the work into a Project/Milestone and independent Issues rather than creating recursive Sub-issues. Finer execution steps can remain ordinary Markdown checklists inside related content.

Normal Workflow Issue lifecycle continues to use five system categories:

```text
Backlog
Unstarted
Started
Completed
Canceled
```

Every newly created normal Workflow Issue is born in `Backlog`, regardless of which UI surface initiated creation. A creation affordance may supply a Project relationship, but it does not silently seed Todo/Started/Completed status merely because it appeared near that group or Board column.

### 3.6 Projectless Workflow

Projectless Workflow Issues are not children of a hidden or synthetic Project.

For Issue execution capability, Projectless behaves like an always execution-enabled context: a Projectless Issue can follow its normal Issue lifecycle without waiting for a Project lifecycle transition. Projectless does not gain Project properties, Milestones, Project progress, or Project lifecycle.

### 3.7 Triage

Triage is the intake context for captured Issues that are not yet ready to enter the normal workflow.

Quick Capture creates Triage Issues. A Triage Issue can remain in Triage across multiple reviews, be edited or deferred, or be explicitly converted into normal work.

### 3.8 Cycle

A Cycle is a user-opened personal planning timebox that answers: “what do I intend to focus on during this period?”

Cycles are orthogonal to Issue Status and Project structure. They can contain Issues from multiple Projects and project-less Workflow Issues.

Project capability rules are resolved independently from Cycle design. Cycle-specific capability/presentation rules are closed separately rather than being inferred prematurely from Project UI.

### 3.9 Status, Priority, Estimate, Due, and Labels

- **Status** expresses workflow lifecycle. Issue and Project Status definitions are configured separately. Issues support all five system StatusCategories; Projects support all except Backlog.
- **Priority** expresses relative importance: Urgent, High, Medium, Low, or unset.
- **Estimate** is an ordinal work-size value for Issues, not a duration.
- **Due** is the canonical time target/attention fact. Context determines how it is presented.
- **Labels** are structured Workspace classification. Label Groups can express single-choice dimensions such as Area or multi-choice dimensions such as Technology.

### 3.10 Views and Favorites

A Filter is a temporary read configuration. A Custom View saves supported selection and presentation choices for later reuse.

Favorites are user-maintained navigation shortcuts to high-value Trail targets. They are not a boolean field on every entity.

### 3.11 Home

Home is a compact global summary and routing surface, not another independent data system or an Issue execution view.

It combines high-frequency entry points with lightweight derived Workspace statistics. V1 Home composition is:

```text
Date / Time
Current Cycle Summary
Triage Summary
Projects / Initiatives Summary
Activity Heatmap
Weekly Note
```

Current Cycle, Triage, and Projects / Initiatives summaries are both overview and routing surfaces. Activity Heatmap is a lightweight derived visualization from retained Workflow Issue lifecycle facts; it is not a complete activity/event log.

Home does not define a separate Focus concept in V1. Future evidence may justify a Project-focus selector that consumes replaceable derived signals such as Progress, Health, Attention, Priority, Due, or activity. Such a selector remains consumer-specific ranking and does not add persisted `focusScore`, `healthScore`, or `rank` fields.

## 4. Experience

### 4.1 Quick Capture and Triage

Quick Capture is intentionally low-friction. It creates a Triage Issue with the information needed for later review rather than forcing immediate Project/Label/Category decisions.

Triage is a focused List experience. Its primary operations include editing, changing the review Due, accepting into Workflow, converting to a Project when appropriate, and deleting. Triage does not become a generic Board or timeline workspace.

Accept creates new normal Workflow work; it is not a hidden mutation of the Triage Issue into another context.

### 4.2 Projects workspace

Projects is a drill-down workspace:

```text
Projects Root
→ Initiative Focus
→ Project Workspace
```

Users may also deep-link directly to a Project from Home, Search, Favorites, or normal navigation.

Projects Root emphasizes Initiative/Project distribution. Initiative Focus emphasizes the Projects contributing to that Initiative. Project Workspace emphasizes planning or execution according to the Project's current lifecycle capability.

### 4.3 Project Workspace

The main Project Workspace is the Project's actual current Issues, with Project context and derived Project information available around that collection.

The data projection does not change merely because Project Status changes. Status changes allowed mutations and presentation capabilities, not truth:

```text
actual Project Issues / Milestones / facts
→ same underlying Project data
→ lifecycle-dependent available actions/presentations
```

V1 lifecycle capability is:

| Project lifecycle | Primary role | Main Issue capability |
| --- | --- | --- |
| Not Started | planning | build/organize Backlog; no execution advancement |
| In Progress | planning + execution | normal Issue workflow execution |
| Done | settled | review plus relation cleanup/move-out only |
| Cancelled | cleanup | unresolved work may be cancelled or moved out |

A Not Started Project can create and accept Backlog Issues and plan them. It cannot advance work from Backlog into Todo/Started execution.

An In Progress Project enables normal Issue execution and is the only Project lifecycle that exposes the execution Board.

A Done Project contains no non-terminal child Issues at the moment it enters Done. It does not accept new Issues or resume child execution until explicitly reopened.

A Cancelled Project may still contain unresolved child Issues. Cancellation does not silently cancel, complete, move, or otherwise rewrite those Issues. Such unresolved work becomes derived Project attention until the user cancels it or moves it to another legal execution context.

### 4.4 Project Status transitions

Project Status is edited through the same compact Status control used to display it. Opening the control shows only transitions legal from the current lifecycle state.

The V1 category transition matrix is:

```text
Not Started → In Progress | Cancelled
In Progress → Done | Cancelled
Done        → Not Started | In Progress
Cancelled   → Not Started | In Progress
```

`In Progress → Not Started` is not allowed. Not Started is a real pre-execution lifecycle state, not Pause.

Selecting Done is legal only when every current child Issue is already Completed or Canceled. Completing Issues does not automatically complete the Project.

Reopening a Done or Cancelled Project may therefore choose either Not Started or In Progress explicitly. Trail does not persist or restore a hidden `previousStatus`.

Changing Project Status never rewrites child Issue Statuses or relationships as a side effect.

### 4.5 Project relationship movement

Moving an Issue never silently changes its Issue Status merely to make a target Project legal.

Target acceptance is capability-based:

- Not Started Project accepts new/moved-in Backlog Issues;
- In Progress Project accepts Issues whose current lifecycle can legally continue there;
- Done/Cancelled Projects do not accept new Issue membership;
- Projectless is always available as an execution-capable relationship target where the Issue relationship is otherwise legal.

If the target cannot accept the Issue's current Status, that target is unavailable. A future explicit compound action may combine a Status change with a Project move, but normal Move does not hide that mutation.

Move-out remains available as a repair/organization escape hatch even when the current Project is Done or Cancelled.

### 4.6 Project progress, attention, and future health

Project Progress is derived from current child Issues and ignores Canceled Issues:

```text
Progress = Completed / (all current child Issues except Canceled)
```

If no non-Canceled child Issue exists, Progress is unavailable rather than fabricated as 0% or 100%.

Project temporal Attention is a separate Due-oriented projection over unfinished child Issues that actually have a Due. It includes Backlog work and ignores whether work has started:

```text
unfinished child Issues with Due
→ Overdue
→ Due This Week
→ Later Due
```

Completed, Canceled, and Due-less Issues do not enter this temporal distribution.

Project Attention may also expose other explainable exceptional reasons, such as a Cancelled Project that still owns unresolved non-terminal Issues. Health remains a future derived capability: it may consume Progress, temporal pressure, Project/Milestone Due, lifecycle context, and other evidence, but V1 does not freeze a score or persist Health.

### 4.7 Project milestones

Milestones are Project checkpoints and Issue classification context, not a second execution hierarchy.

- Milestone progress uses the same Completed/non-Canceled Issue progress semantics within the Milestone scope.
- Milestone has no manual Status or manual completion action.
- Project Workspace does not create a permanent Milestone workspace/page merely to browse its Issues.
- Selecting a Milestone in Project details is a quick filter over the current Project Issue collection.
- Milestone planning is available while a Project is Not Started or In Progress; terminal Projects present Milestones as read-oriented summary context.

### 4.8 Cycles

Cycles Root shows the Current Cycle and history.

The Current Cycle can use Status columns with Project swimlanes. Project swimlanes are presentation, not drag targets. Adding or removing Cycle membership is an explicit action.

Closing a Cycle is explicit. If unfinished work remains, creating the next Cycle is another explicit flow in which unfinished Issues are candidates that the user may keep or remove before confirmation. It is valid to have no Current Cycle.

### 4.9 Views, Search, and navigation

Trail should first use mature page-specific filters, groups, sorting, and presentations rather than exposing a generic query language.

Search finds objects. Command Menu is primarily for actions. Custom Views save useful supported combinations. Favorites provide a small high-frequency navigation layer.

### 4.10 Peek and interaction model

Peek is a cross-workspace interaction capability for inspecting lightweight information without losing the current context.

Peek, Selection, Bulk Actions, Context Menu, Command Menu, keyboard shortcuts, Search, and Undo/Recovery form one interaction system rather than separate per-page inventions.

Fast operations should provide immediate visible feedback and a low-cost recovery path. Interactive elements require clear hover, focus, pressed, selected, disabled, and focus-visible states without excessive motion.

Contextual submenus should use a mature pointer-grace/safe-triangle pattern where necessary so diagonal pointer movement does not accidentally close the submenu.

### 4.11 Responsive Obsidian panes

Trail is designed for desktop Obsidian, but it must work in variable pane widths. Product composition should support expanded, compact, and narrow presentations with progressive disclosure and local horizontal scrolling/layout changes where appropriate.

### 4.12 UI Design Reference and host composition

Linear is Trail's primary visual and interaction baseline for V1. V1 UI closure targets Linear-style **Dark** presentation only; a future light theme may reuse the same component and token structure, but Trail does not design or maintain a parallel light presentation in V1.

Where Linear already provides an equivalent UI pattern, Trail should closely match its layout, spacing, typography hierarchy, information density, component treatment, interaction states, and behavior. Trail should deviate only when its personal product semantics, Obsidian host constraints, accessibility/technical requirements, or an explicitly resolved Trail UI answer require a different result.

This baseline does not import Linear's team or collaboration product semantics or its branding assets. Product concepts remain Trail-owned even when the UI presentation follows Linear closely. As Trail's own UI Design answers become explicit, those answers replace the Linear reference only for the specific areas they cover.

Trail remains an ordinary Obsidian workspace view rather than becoming a separate full-screen application. The desired experience is **Obsidian-native architecture with Linear presentation**: first reuse Obsidian's existing window chrome, tabs, Ribbon, sidebars, splits, panes, resize/collapse behavior, menus, overlays, and host interaction space; only place a control inside Trail's main view when no host surface has the right responsibility or stable behavior.

The top native window/tab chrome and the narrow Ribbon remain the global Obsidian shell. Trail can use its Ribbon entry as the Trail-context entry point while preserving Obsidian's own actions and escape routes. The left sidebar is not duplicated inside the main Trail view: Trail contributes a Trail Navigation view to Obsidian's existing left sidebar and lets the host keep ownership of sidebar width, collapse, resize, and layout behavior. Existing File Explorer/Search/Bookmark/plugin sidebar views remain intact rather than being destroyed or rewritten; Trail context selects the Trail Navigation view, while normal Obsidian context can return to the native sidebar content.

The Trail Navigation sidebar uses a compact Linear-like hierarchy:

```text
Trail                         Search  Capture

Home
Triage                        attention indicator optional

Workspace
Projects
  ongoing Project shortcuts
Cycles
```

Search and Quick Capture are high-frequency global actions rather than ordinary peer navigation rows. Project children are dynamic shortcuts to ongoing Projects, not Favorites and not a canonical hierarchy browser; the exact ongoing-selection contract is resolved by the relevant Query/UI consumer. Initiative is not expanded into the sidebar tree. Cycles does not expand Previous Cycle history. Triage may later show a compact attention indicator derived from workload/time urgency; whether that presentation uses color, count, or both remains a UI-detail answer rather than a new persisted fact.

The main Trail workspace uses a stable composition:

```text
Location Bar
optional View Bar
Content
```

The **Location Bar** answers “where am I?” and owns the current location/breadcrumb plus object-level actions such as Details or overflow actions. The **View Bar** answers “how am I viewing this collection?” and owns collection-level presentation/actions such as List/Board and, when their contracts are implemented, Filter, Group, Sort, Display options, and collection actions. A page does not render an empty View Bar merely for symmetry. Deferred capabilities should have a compatible place in this shared structure, but their behavior is not implemented speculatively before a real consumer freezes the contract.

Peek, Details, and Full Item View are distinct surfaces even when they share the same underlying entity properties and actions:

- **Peek** is a temporary, non-blocking preview that keeps the current workspace/layout in place and should not repurpose a persistent Obsidian sidebar merely to appear.
- **Details** is the user-facing name for a persistent contextual inspector. Obsidian's right sidebar is the preferred host when that responsibility fits, so the user can keep the main List/Board visible while viewing or editing entity details.
- **Full Item View** makes the entity the main workspace content for deeper work. Its content should remain reusable so a future “open in new Obsidian tab/split” capability can host the same view without redefining the entity UI.

These surfaces compose shared property/entity capabilities instead of cloning fields per page or collapsing every entity into one universal details component.

### 4.13 Obsidian-native documents

Trail entities support lightweight title, description/notes, properties, and actions.

Long-form design documents, research, meeting notes, and knowledge remain ordinary Obsidian Markdown documents. Native links and backlinks connect those documents to file-backed Trail entities. Trail should open the native document rather than recreate a separate rich-document experience.

### 4.14 Weekly Note

Weekly Note is a lightweight Home utility backed by one Markdown file. Users can edit the Current section and manually archive it into dated entries. It does not automatically create or link Issues/Cycles and is not a Domain entity.

## 5. Product Rules

1. **Issue is the smallest structured work item.** No Sub-issue hierarchy is introduced.
2. **Initiative, Project, Milestone, and Issue have different jobs.** They must not substitute for one another merely to satisfy a UI or storage convenience.
3. **Area is classification, not hierarchy.** It is expressed through structured Labels/Views rather than an Area entity.
4. **Project lifecycle is explicit and four-state.** Projects use Not Started, In Progress, Done, and Cancelled semantics; Project does not use Backlog.
5. **Project Status controls capability, not child truth.** Changing Project Status never rewrites child Issues, and Project Workspace continues to report actual child data.
6. **Project completion is guarded.** Done requires all current child Issues to be Completed or Canceled; Issue completion does not automatically complete the Project.
7. **Milestone completion and Initiative completion are derived.** They are not manually maintained workflow Statuses.
8. **Every normal Workflow Issue is born in Backlog.** Creation location does not silently choose another Issue lifecycle Status.
9. **Projectless is execution-enabled context, not a hidden Project.** Projectless Issues follow normal Issue workflow without Project lifecycle.
10. **Cycle planning is explicit and independent of Status.** Joining/leaving a Cycle does not silently change the Issue Status.
11. **Triage stays distinct from normal Workflow.** Accept creates a new Workflow Issue rather than turning the Triage Issue into another context; captured user content must not be lost during that conversion.
12. **Drag has one global meaning for Issue cards: Status change.** Relationship changes use explicit actions.
13. **Due is reused rather than duplicated.** Triage defer is a Due change; Reminder/Due Soon/Overdue are capabilities derived from time facts and policy.
14. **Progress, Health, Attention, timeline, ranking, and analytics are derived when possible.** Trail does not ask the user to maintain duplicate facts.
15. **Deletion preserves unrelated work by default.** Deleting a parent/classification target resolves references instead of cascading through independent business data unless the user explicitly chooses a stronger destructive action.
16. **Normal knowledge work stays Obsidian-native.** Trail does not create a parallel document domain.
17. **Views compose existing facts and capabilities.** New ways of looking at data should first use existing fields, filters, groups, sorts, and presentations rather than creating new Domain entities.
18. **Authoritative data changes are user-intent driven.** Automation or AI may assist analysis and creation workflows, but must not silently mutate authoritative data.

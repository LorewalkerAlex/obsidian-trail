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
- Board, List, and lightweight Project Timeline presentations;
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

A Project is a coherent planning/execution context for related work. It often represents a clear, completable outcome or deliverable, but it may also be a long-lived work container when that better matches the user's organization.

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

Every newly created normal Workflow Issue is born in `Backlog`, regardless of which UI surface initiated creation. Every Workflow Issue belongs to exactly one Project. A creation affordance therefore supplies an explicit Project relationship, but it does not silently seed Todo/Started/Completed status merely because it appeared near that group or Board column.

### 3.6 Default Project

A Workspace may hold one optional **Default Project** reference for high-frequency routing and initial selection. The referenced object is an ordinary Project with no special Domain type, lifecycle, relationship, or deletion rule.

A fresh Workspace seeds one normal Project titled `Standalone` and makes that Project the initial Default Project. The seed uses normal Project creation semantics and may immediately be renamed, assigned to an Initiative, moved through any legal Project lifecycle transition, given Milestones and properties, or deleted like any other Project.

`Standalone` is therefore a default title and starting arrangement, not identity or canonical Project semantics. The Default Project reference follows stable Project identity, so renaming the Project also changes the visible shortcut label. If the referenced Project is deleted, Trail clears the Default Project reference rather than silently recreating or replacing it.

When a workflow needs an explicit Project target, Trail may preselect the Default Project only when it is a legal target for that operation. If it is not legal or no Default Project exists, the user chooses another legal Project. Trail does not reinterpret an omitted Project as a hidden fallback inside Domain logic.

### 3.7 Triage

Triage is the user-facing intake and review queue for captured ideas or work that have not yet been formalized into normal Workflow Issues or Projects.

A Triage entry is not presented as a normal Workflow Issue. The canonical Domain/Data model reuses the Issue record in Triage context rather than introducing a separate TriageItem entity.

Quick Capture creates a Triage entry. It can remain in Triage across multiple reviews, be edited or enriched, be deferred by moving its required review Due, be accepted into a standard Issue or Project creation flow, or be deleted.

Triage review Due means the latest time by which the entry should be reviewed again. It affects review urgency and ordering, not whether the entry exists or may be browsed and processed before that time.

### 3.8 Cycle

A Cycle is a user-opened personal planning timebox that answers: “what do I intend to focus on during this period?”

Cycles are orthogonal to Issue Status and Project structure. They can contain Workflow Issues from multiple Projects.

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

Quick Capture is intentionally low-friction. It creates a Triage entry with the information needed for later review rather than forcing immediate Project/Label/Category decisions.

Triage is a focused Linear-inspired review queue presented as a compact List. It is not a generic Workflow Issue workspace and does not become a Board or Timeline. Its primary operations are editing title/body, enriching the limited Triage properties, accepting, deferring, and deleting.

Accept means “formalize this intake.” It first chooses whether the target is an Issue or a Project, then opens the same standard Create Issue or Create Project flow used elsewhere. Triage does not own a special Accept form. V1 automatically seeds only the source title and lightweight description/body into the target create draft; Triage Priority, Labels, and review Due are not implicitly copied.

If Issue is chosen, normal Workflow Issue creation rules apply: the new Issue starts in Backlog and requires an explicit legal Project. The Create Issue surface may initialize that Project picker from the current Default Project only when it is a legal target. If Project is chosen, normal Project creation defaults and validation apply.

Canceling the target creation leaves the Triage entry unchanged. After the chosen target is safely created, the source Triage entry is removed. Accept does not preserve source identity by changing its context in place.

Defer is a review-priority action, not a visibility action. It changes the same Triage review Due so the entry moves later in the normal review ordering, while the entry remains browseable and may still be reviewed or accepted earlier if the user has an idea before that Due.

### 4.2 Projects workspace

Projects is the single top-level workspace for both Project portfolio browsing and Initiative context. Initiative remains a real Domain entity, but in navigation and collection presentation it primarily acts as an organizational, filtering, and focus dimension over Projects rather than a separate top-level application area.

Projects Root is Project-first. It shows all Projects, including the current Default Project, and groups them by Initiative by default, with a `No Initiative` group for unassigned Projects. From the same Root the user may either focus an Initiative or open a Project directly:

```text
Projects Root
├─ Initiative Focus
└─ Project Workspace
```

Initiative Focus is a scoped Projects location that shows only Projects contributing to the current Initiative. It is not a mandatory parent path for a Project. Projects may still be deep-linked directly from Home, Search, the Default Project shortcut, or other supported navigation.

Projects Root and Initiative Focus share the same Project collection semantics. Both support List plus a lightweight Timeline derived from the current temporal evidence already present in Project, Issue, and Milestone data. Timeline uses Issue `createdAt`, `firstStartedAt`, and current `terminalAt` together with currently meaningful Due facts to show planning/execution evidence and known future constraints without introducing manual Project/Initiative start/end schedule fields. Projects without enough temporal evidence for a meaningful Timeline projection may be omitted from Timeline while remaining available in List.

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

A Done Project contains no non-terminal child Issues at the moment it enters Done. It does not accept new non-terminal work or resume child execution until explicitly reopened.

A Cancelled Project may still contain unresolved child Issues. Cancellation does not silently cancel, complete, move, or otherwise rewrite those Issues. Such unresolved work becomes derived Project attention until the user cancels it or moves it to another legal Project.

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
- terminal Projects accept only relationship changes that are legal under the normal Project capability rules;
- every Workflow Issue remains related to exactly one real Project.

If the target cannot accept the Issue's current Status, that target is unavailable. A future explicit compound action may combine a Status change with a Project move, but normal Move does not hide that mutation.

Move-out from one Project therefore means moving to another legal Project. There is no `No Project` destination for Workflow Issues.

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

The V1 Workspace navigation exposes the current Default Project shortcut, `Projects`, and `Cycles`. The Default Project row opens the same normal Project Workspace reached from Projects Root; it is not a second workspace or duplicate collection. `Projects` is the single top-level entry for the Project portfolio and Initiative focus. Initiative does not need a parallel top-level navigation entry.

A future Workspace-level `Issues` collection may provide an all-Workflow-Issue browse surface across Projects, but it is deferred and does not shape V1 sidebar composition or restore a `No Project` state.

Search finds objects. Command Menu is primarily for actions. Custom Views save useful supported combinations. Favorites remain a supported workspace-state concept, but their final navigation presentation is deferred until that interaction is designed rather than being used to shape the current sidebar.

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
Standalone                    fresh Default Project example
Projects
Cycles
```

Search and Quick Capture are high-frequency global actions rather than ordinary peer navigation rows. The row shown as `Standalone` in a fresh Workspace is the current Default Project shortcut: it resolves by stable Project ID and renders the Project's current title, so it may later display another name or disappear when no Default Project reference exists. Activating it opens the same Project Workspace as any other Project route. `Projects` opens the unified project-first Projects workspace; Initiative focus is reached from that workspace rather than through a separate top-level Initiative entry. Favorites are not part of the currently resolved sidebar composition; their eventual presentation remains deferred. Cycles does not expand Previous Cycle history. Triage may later show a compact attention indicator derived from workload/time urgency; whether that presentation uses color, count, or both remains a UI-detail answer rather than a new persisted fact.

The main Trail workspace uses a stable composition:

```text
Location Bar
optional Context disclosure
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
8. **Every normal Workflow Issue is born in Backlog and belongs to exactly one Project.** Creation location does not silently choose another Issue lifecycle Status, and `No Project` is not a valid Workflow state.
9. **Default Project is routing state, not a Project subtype.** A fresh Workspace seeds `Standalone` as an ordinary Project and references it for default selection/navigation; the Project itself gains no special Domain behavior.
10. **Cycle planning is explicit and independent of Status.** Joining/leaving a Cycle does not silently change the Issue Status.
11. **Triage stays distinct from normal Workflow and Project planning.** A Triage entry is intake/review state, not a normal Workflow Issue surface. Accept creates a new standard Workflow Issue or Project with new identity rather than changing the Triage record in place; only title and description/body are automatically seeded in V1, and the source is removed only after the target is safely created.
12. **Drag has one global meaning for Issue cards: Status change.** Relationship changes use explicit actions.
13. **Due is reused rather than duplicated.** Triage defer is a Due change; Reminder/Due Soon/Overdue are capabilities derived from time facts and policy.
14. **Progress, Health, Attention, timeline, ranking, and analytics are derived when possible.** Trail does not ask the user to maintain duplicate facts.
15. **Deletion preserves unrelated work by default.** Deleting a parent/classification target resolves required references through an explicit legal replacement rather than cascading through independent business data or inventing a missing relationship.
16. **Normal knowledge work stays Obsidian-native.** Trail does not create a parallel document domain.
17. **Views compose existing facts and capabilities.** New ways of looking at data should first use existing fields, filters, groups, sorts, and presentations rather than creating new Domain entities.
18. **Authoritative data changes are user-intent driven.** Automation or AI may assist analysis and creation workflows, but must not silently mutate authoritative data.

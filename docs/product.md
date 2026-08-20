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
- Reminder, Snooze, Due Soon, or Overdue as duplicate persisted entity state;
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

It is the primary execution workspace for a coherent body of work and can contain Milestones and Issues. A Project has an explicit lifecycle Status chosen by the user.

### 3.4 Milestone

A Milestone is a Project-scoped intermediate outcome or checkpoint.

It groups otherwise independent Issues around a meaningful stage of a Project. It is not an Issue hierarchy level and is not itself an executable task.

### 3.5 Issue

An Issue is the smallest structured unit of work in Trail.

Issues are flat. If an Issue is too large, the user restructures the work into a Project/Milestone and independent Issues rather than creating recursive Sub-issues. Finer execution steps can remain ordinary Markdown checklists inside related content.

### 3.6 Triage

Triage is the intake context for captured Issues that are not yet ready to enter the normal workflow.

Quick Capture creates Triage Issues. A Triage Issue can remain in Triage across multiple reviews, be edited or deferred, or be explicitly converted into normal work.

### 3.7 Cycle

A Cycle is a user-opened personal planning timebox that answers: “what do I intend to focus on during this period?”

Cycles are orthogonal to Issue Status and Project structure. They can contain Issues from multiple Projects and project-less Workflow Issues.

### 3.8 Status, Priority, Estimate, Due, and Labels

- **Status** expresses workflow lifecycle. Issue and Project Status definitions are configured separately but share stable system categories.
- **Priority** expresses relative importance: Urgent, High, Medium, Low, or unset.
- **Estimate** is an ordinal work-size value for Issues, not a duration.
- **Due** is the canonical time target/attention fact. Context determines how it is presented.
- **Labels** are structured Workspace classification. Label Groups can express single-choice dimensions such as Area or multi-choice dimensions such as Technology.

### 3.9 Views and Favorites

A Filter is a temporary read configuration. A Custom View saves supported selection and presentation choices for later reuse.

Favorites are user-maintained navigation shortcuts to high-value Trail targets. They are not a boolean field on every entity.

### 3.10 Home

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

Home does not define a separate Focus concept in V1. Issue-level execution focus remains in existing workflow surfaces such as Cycles, Projects, and Search; a future Focus view/grouping may be introduced only if real use establishes a distinct need.

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

Projects Root emphasizes Initiative/Project distribution. Initiative Focus emphasizes the Projects contributing to that Initiative. Project Workspace emphasizes execution.

### 4.3 Project Workspace

The main Project Workspace is the Project's Issues, presented as Board or List over the same underlying data.

- Board columns are Statuses.
- Dragging an Issue card expresses only a Status change.
- Project, Milestone, and Cycle relationships are changed through explicit actions such as a property picker, context action, Details, or Peek.
- Description, Milestones, Related Notes, and secondary properties are available on demand rather than through a heavyweight Overview tab.

### 4.4 Cycles

Cycles Root shows the Current Cycle and history.

The Current Cycle can use Status columns with Project swimlanes. Project swimlanes are presentation, not drag targets. Adding or removing Cycle membership is an explicit action.

Closing a Cycle is explicit. If unfinished work remains, creating the next Cycle is another explicit flow in which unfinished Issues are candidates that the user may keep or remove before confirmation. It is valid to have no Current Cycle.

### 4.5 Views, Search, and navigation

Trail should first use mature page-specific filters, groups, sorting, and presentations rather than exposing a generic query language.

Search finds objects. Command Menu is primarily for actions. Custom Views save useful supported combinations. Favorites provide a small high-frequency navigation layer.

### 4.6 Peek and interaction model

Peek is a cross-workspace interaction capability for inspecting or editing lightweight information without losing the current context.

Peek, Selection, Bulk Actions, Context Menu, Command Menu, keyboard shortcuts, Search, and Undo/Recovery form one interaction system rather than separate per-page inventions.

Fast operations should provide immediate visible feedback and a low-cost recovery path. Interactive elements require clear hover, focus, pressed, selected, disabled, and focus-visible states without excessive motion.

Contextual submenus should use a mature pointer-grace/safe-triangle pattern where necessary so diagonal pointer movement does not accidentally close the submenu.

### 4.7 Responsive Obsidian panes

Trail is designed for desktop Obsidian, but it must work in variable pane widths. Product composition should support expanded, compact, and narrow presentations with progressive disclosure and local horizontal scrolling/layout changes where appropriate.

### 4.8 UI Design Reference

Linear is Trail's primary visual and interaction baseline for V1.

Where Linear already provides an equivalent UI pattern, Trail should closely match its layout, spacing, typography hierarchy, information density, component treatment, interaction states, and behavior. Trail should deviate only when its personal product semantics, Obsidian host constraints, or an explicitly resolved Trail UI answer require a different result.

This baseline does not import Linear's team or collaboration product semantics or its branding assets. Product concepts remain Trail-owned even when the UI presentation follows Linear closely.

As Trail's own UI Design answers become explicit, those answers replace the Linear reference only for the specific areas they cover.

### 4.9 Obsidian-native documents

Trail entities support lightweight title, description/notes, properties, and actions.

Long-form design documents, research, meeting notes, and knowledge remain ordinary Obsidian Markdown documents. Native links and backlinks connect those documents to file-backed Trail entities. Trail should open the native document rather than recreate a separate rich-document experience.

### 4.10 Weekly Note

Weekly Note is a lightweight Home utility backed by one Markdown file. Users can edit the Current section and manually archive it into dated entries. It does not automatically create or link Issues/Cycles and is not a Domain entity.

## 5. Product Rules

1. **Issue is the smallest structured work item.** No Sub-issue hierarchy is introduced.
2. **Initiative, Project, Milestone, and Issue have different jobs.** They must not substitute for one another merely to satisfy a UI or storage convenience.
3. **Area is classification, not hierarchy.** It is expressed through structured Labels/Views rather than an Area entity.
4. **Project lifecycle is explicit.** Completing all Issues does not automatically Complete the Project; the user explicitly completes or reopens the Project.
5. **Milestone completion and Initiative completion are derived.** They are not manually maintained workflow Statuses.
6. **Cycle planning is explicit and independent of Status.** Joining/leaving a Cycle does not silently change the Issue Status.
7. **Triage stays distinct from normal Workflow.** Accept creates a new Workflow Issue rather than turning the Triage Issue into another context; captured user content must not be lost during that conversion.
8. **Drag has one global meaning for Issue cards: Status change.** Relationship changes use explicit actions.
9. **Due is reused rather than duplicated.** Triage defer is a Due change; Reminder/Due Soon/Overdue are capabilities derived from time facts and policy.
10. **Progress, Health, Attention, timeline, and analytics are derived when possible.** Trail does not ask the user to maintain duplicate facts.
11. **Deletion preserves unrelated work by default.** Deleting a parent/classification target resolves references instead of cascading through independent business data unless the user explicitly chooses a stronger destructive action.
12. **Normal knowledge work stays Obsidian-native.** Trail does not create a parallel document domain.
13. **Views compose existing facts and capabilities.** New ways of looking at data should first use existing fields, filters, groups, sorts, and presentations rather than creating new Domain entities.
14. **Authoritative data changes are user-intent driven.** Automation or AI may assist analysis and creation workflows, but must not silently mutate authoritative data.

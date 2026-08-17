# Trail Domain

## 1. Language

Trail uses the following canonical terms.

- **Workspace** — the singleton personal Trail boundary that owns shared configuration and user workspace state.
- **Initiative** — a long-term goal advanced through multiple Projects.
- **Project** — a clear, completable outcome/deliverable.
- **Milestone** — a Project-scoped intermediate outcome/checkpoint.
- **Issue** — the smallest structured unit of work.
- **Triage Issue** — an Issue in intake context, before normal workflow.
- **Workflow Issue** — an Issue participating in the normal workflow lifecycle.
- **Cycle** — an explicitly opened/closed personal planning timebox.
- **StatusCategory** — the fixed system semantic categories Backlog, Unstarted, Started, Completed, Canceled.
- **StatusDefinition** — a configurable named status with stable identity, applicable to either Projects or Issues and belonging to one StatusCategory.
- **Priority** — Urgent, High, Medium, Low, or unset.
- **Estimate** — a discrete ordinal Issue work-size value, not elapsed time or duration.
- **Due** — a canonical user-set time target/attention fact.
- **LabelGroup** — a Workspace classification dimension with Single or Multiple selection semantics.
- **Label** — a selectable value belonging to exactly one LabelGroup.
- **Custom View** — persisted user workspace state describing a supported saved selection and presentation.
- **Favorite** — an ordered navigation reference to a supported Trail target.

Names displayed to the user may change without changing stable identity or canonical semantics.

## 2. Model

### 2.1 Workspace boundary

Workspace is not a normal Core Entity. V1 has one implicit Workspace and does not repeat a `workspaceId` on every record.

Workspace owns:

- Project and Issue Status definitions/defaults/order;
- LabelGroups, Labels, and registrations;
- Cycle default planning rule;
- temporal/timezone policy;
- Custom Views, Favorites, and Home composition.

### 2.2 Core Entities

The Core Entity universe is:

```text
Initiative
Project
Milestone
Issue
Cycle
```

Core Entities have stable identity and business continuity. Creating a new one does not replace an old one.

### 2.3 Initiative

Canonical Initiative facts:

- stable identity;
- title;
- optional lightweight description;
- optional Priority;
- optional Due;
- applicable Labels.

Initiative does not own an independent workflow Status, manual Progress/Health, or manual completion action.

### 2.4 Project

Canonical Project facts:

- stable identity;
- title;
- optional lightweight description;
- Project StatusDefinition;
- optional Initiative membership;
- optional Priority;
- optional Due;
- applicable Labels.

Project Status is an explicit user lifecycle judgment and is independent from Issue completion ratio and actual activity time.

### 2.5 Milestone

Canonical Milestone facts:

- stable identity;
- title;
- optional lightweight description;
- exactly one owning Project;
- optional Due.

V1 Milestone does not have Trail Labels, Priority, Estimate, workflow Status, manual completion, or its own lifecycle timestamps.

### 2.6 Issue

Canonical Issue facts:

- stable identity;
- title;
- optional lightweight description;
- context: Triage or Workflow;
- context-conditioned StatusDefinition;
- optional Project;
- optional same-Project Milestone;
- optional Priority;
- optional Estimate;
- context-conditioned Due;
- applicable Labels;
- Workflow creation fact `createdAt`;
- minimal lifecycle historical facts `firstStartedAt` and `terminalAt`.

### 2.7 Cycle

Canonical Cycle facts:

- stable identity;
- actual `startedAt`;
- confirmed `plannedEnd`;
- optional actual `endedAt`;
- Issue membership.

`endedAt` absent means Open/Current. `endedAt` present means Closed/Historical.

### 2.8 Workspace configuration concepts

StatusDefinition, LabelGroup, and Label have stable reference identity because Core Domain Data and workspace state may reference them. Their old versions do not have the same business-history continuity requirement as Core Entities.

Configuration changes still must preserve the legality of the current canonical graph.

### 2.9 Domain values

The main Domain Values are:

- Priority;
- Estimate;
- Due Timestamp;
- StatusCategory;
- LabelGroup selection mode.

A value does not become an Entity merely because many Entities use it.

### 2.10 User workspace state

Custom Views, Favorites, and Home composition are persisted user workspace state. They describe how the user organizes, navigates, and presents Trail; they are not Core Domain Data and do not redefine system behavior.

## 3. Relationships

Canonical relationships are:

```text
Project   → Initiative   0..1
Milestone → Project      exactly 1
Issue     → Project      0..1
Issue     → Milestone    0..1, within Issue.project scope
Cycle     ↔ Issue        planning membership
```

### 3.1 Project and Initiative

A Project may have no Initiative or exactly one Initiative. It may move to another Initiative without changing Project identity.

Initiative does not own a second authoritative child Project collection. The inverse relationship is derived from current Projects.

### 3.2 Milestone and Project

A Milestone belongs to exactly one Project. Normal domain behavior does not support reparenting a Milestone across Projects.

### 3.3 Issue and Project

A Workflow Issue may be project-less or belong to one Project. Moving an Issue between Projects preserves Issue identity.

A non-terminal Workflow Issue cannot be moved into a terminal Project. A terminal Issue may remain or be moved according to the Project relation rules because it does not introduce new non-terminal work.

### 3.4 Issue and Milestone

An Issue may reference at most one Milestone, and that Milestone must belong to the same Project as the Issue.

Therefore:

```text
Issue.projectId absent
→ Issue.milestoneId absent

Issue.milestoneId present
→ Milestone.projectId == Issue.projectId
```

When an Issue changes Project, an old Milestone from the previous Project must be cleared or replaced with a valid Milestone from the target Project in the same logical mutation.

### 3.5 Cycle membership

Only Workflow Issues may participate in Cycles. Triage Issues may not.

Cycle membership does not imply or change Status, Project, Milestone, Priority, or Due.

Closed Cycle membership is retained as a minimal historical fact. A Workflow Issue can therefore appear in multiple historical Cycles over time; Cycle membership is not represented as a single `cycleId` on Issue.

## 4. State & Lifecycle

### 4.1 Status categories

The system StatusCategory set is fixed:

```text
Backlog
Unstarted
Started
Completed
Canceled
```

Projects and Issues use separate StatusDefinition sets. A concrete StatusDefinition has stable identity, display name, entity type, and one category.

Status display order has two levels:

1. fixed system StatusCategory order;
2. configured order of StatusDefinitions within each category.

Each entity type/category has a configured default StatusDefinition for category-level actions such as Complete, Cancel, Start, or Move to Backlog. Changing the default affects future mutations, not existing entities.

### 4.2 Workflow Issue creation

Normal Workflow Issue creation:

- creates a new stable Issue identity;
- sets context = Workflow;
- selects a valid Issue StatusDefinition in Backlog;
- sets immutable `createdAt` to the workflow creation time.

A Workflow Issue may be created with or without a Project, subject to Project acceptance rules.

### 4.3 Triage Issue creation and defer

Quick Capture creates a Triage Issue:

- context = Triage;
- no normal workflow StatusDefinition;
- required Due;
- no Workflow `createdAt`.

V1 Quick Capture resolves its default Due from the current time plus seven calendar days through the temporal policy before creation.

Defer is a Due change on the same Triage Issue. Triage does not introduce Snooze state, `reviewAt`, `attentionAt`, `snoozedUntil`, or `isSnoozed`.

### 4.4 Accept Triage

Accept is not a context patch and does not preserve source identity:

```text
Issue A (Triage)
→ create Issue B (Workflow, new identity)
→ B becomes the new normal work item
→ remove A only after B is safely established
```

Applicable source content may seed the new Workflow Issue, but Triage Due does not automatically become Workflow Due.

### 4.5 Issue lifecycle timestamps

`firstStartedAt`:

- is set the first time an Issue enters Started;
- is not changed by transitions between concrete Started StatusDefinitions;
- survives terminal states and later reopen.

`terminalAt`:

- is set when entering Completed or Canceled from a non-terminal category;
- is cleared when leaving terminal state for a non-terminal category;
- remains unchanged for a concrete StatusDefinition change within the same terminal category;
- is replaced when switching between Completed and Canceled.

Trail does not retain a complete Issue transition/event history.

### 4.6 Estimate lifecycle

Estimate may be absent while an Issue is non-Completed.

An Issue in Completed must have a legal Estimate. While it remains Completed the Estimate may change to another legal value but may not be cleared.

### 4.7 Project lifecycle

Project completion is an explicit action.

Complete Project requires no current non-terminal child Issue. Completing all Issues does not automatically Complete the Project.

A terminal/Completed Project must be explicitly reopened before it can receive new non-terminal work. Reopen changes only the Project lifecycle Status and does not rewrite existing Issue Statuses.

Project lifecycle Status does not create Project actual-start/actual-end history facts.

### 4.8 Initiative completion

Initiative completion is derived:

- an Initiative with no current Projects is not Completed;
- an Initiative with at least one current Project is derived Completed when all current Projects are Completed or Canceled.

There is no manual Complete Initiative action or Initiative workflow Status.

### 4.9 Milestone completion

Milestone completion/progress is derived from current associated Issues. Milestone has no manually maintained workflow Status or completion flag.

### 4.10 Cycle lifecycle

At most one Cycle may be Open at a time, and it is valid to have none.

Opening a Cycle records its actual start and a concrete planned end. The configured EndOfNextWeek default is a suggestion rule: calendar weeks run Monday through Sunday and the default points to the Sunday of the following natural week. A user may choose another end before creation; later configuration changes do not rewrite existing Cycles.

Reaching `plannedEnd` does not automatically close the Cycle.

Closing a Cycle sets actual `endedAt` and freezes normal planning membership. If unfinished/non-terminal Issues remain, a separate Create Next Cycle flow offers all of them as initially selected candidates. The user may deselect any candidates or cancel the entire flow, leaving no Current Cycle.

### 4.11 Delete relation resolution

Deletion is not a normal lifecycle Status. Archive is not a generic Core Entity lifecycle.

A delete operation resolves affected relationships as one legal domain mutation:

- Delete Initiative: preserve Projects, normally clearing Initiative membership or reassigning as explicitly chosen.
- Delete Milestone: preserve Issues, clearing or replacing their Milestone relation.
- Delete Project: preserve Issues as project-less Workflow Issues and clear their Milestone relation; Project-scoped Milestones are removed with the Project.
- Delete Issue: remove the Issue and its Cycle memberships; do not delete unrelated entities.
- Delete Cycle: preserve Issues and their Status/Project relationships; Cycle history context is intentionally removed.

Required references without a genuine default require an explicit legal replacement or cancellation rather than an invented default.

## 5. Rules & Invariants

### 5.1 Field contract

Every canonical field/relation has:

- semantic meaning;
- applicability;
- requiredness;
- a genuine default only where the domain actually has one;
- validation rules;
- state-conditioned invariants.

Every committed mutation must leave the whole affected canonical graph legal.

### 5.2 Core invariants

The following must always hold:

1. Core Entity identities are stable and unique in the Workspace.
2. Project Status references a Project StatusDefinition.
3. Workflow Issue Status references an Issue StatusDefinition.
4. Triage Issue has no normal StatusDefinition, has required Due, and has no Workflow `createdAt`.
5. Workflow Issue has a valid StatusDefinition and required immutable `createdAt`; Workflow Due is optional.
6. Projectless Issue has no Milestone.
7. Issue Milestone, when present, belongs to the same Project as the Issue.
8. Completed Issue has an Estimate.
9. A terminal Project cannot accept new non-terminal work until reopened.
10. Project completion requires no current non-terminal child Issue.
11. At most one Cycle is Open.
12. Triage Issue is never a Cycle member.
13. Closed Cycle membership is not changed by normal planning actions.
14. Label selection obeys registration and Single/Multiple semantics.
15. Configuration defaults/reference targets match the intended entity type/category and do not leave dangling references.

### 5.3 Label rules

Every Label belongs to exactly one LabelGroup.

A LabelGroup has selection mode Single or Multiple and is registered for applicable entity types. Current label-capable types are Initiative, Project, and Issue. V1 Milestone is not label-capable.

Single means at most one Label from that group on the same Entity; it does not mean a value is required.

Label itself does not duplicate applicability. Adding a new Label to a registered Group makes it available to all entity types registered for that Group.

Free-form Obsidian tags are separate from Trail structured Labels.

### 5.4 Due and reminder rules

Due is a canonical time fact:

- Initiative / Project / Milestone / Workflow Issue: optional;
- Triage Issue: required.

Due Soon, Overdue, Attention, and Reminder are derived capabilities based on canonical temporal facts, configuration, and current time. Time passing alone does not mutate entity lifecycle Status.

A simple reminder can be represented by a project-less Workflow Issue + Due and optionally organized by Labels/Views; no Reminder entity is required.

### 5.5 Capability is not a Domain field

Trail does not persist duplicate state merely because a product capability needs to display it.

Examples:

- Triage Defer = Due mutation;
- Due Soon / Overdue / Reminder = derived temporal capability;
- Project/Milestone/Initiative Progress = Issue aggregation;
- actual activity timeline = Issue lifecycle aggregation;
- Home Focus / Current Cycle / Projects / Custom Views = read selection/presentation;
- duplicate detection = create-time guardrail;
- Activity Heatmap = derived visualization.

### 5.6 Explicitly excluded domain concepts

V1 Canonical Domain does not include:

- Sub-issue / parentIssueId;
- generic Related or Blocking relationships;
- Duplicate relationship/status;
- Area entity;
- TriageItem/Fleeting Note entity;
- Reminder entity/field;
- Snooze state/field;
- Initiative/Milestone workflow Status;
- generic manual Progress/Health facts;
- complete Activity/Event Log;
- generic createdAt/updatedAt/deletedAt/version on all Core Entities;
- Markdown paths/ranges/fingerprints;
- Runtime caches/indexes;
- UI view/component state;
- persistence recovery/compensation details.

## 6. Derived & Historical Facts

### 6.1 Historical facts retained

Trail retains only historical facts that cannot be reconstructed later and already have product value.

Current retained examples:

- Workflow Issue `createdAt`;
- Issue `firstStartedAt`;
- Issue current `terminalAt`;
- Cycle `startedAt`, `plannedEnd`, `endedAt`;
- Closed Cycle final Issue membership.

Trail does not preserve a general event log, complete relation history, or every past lifecycle transition.

### 6.2 Progress and completion

Project progress, Milestone progress/completion, and Initiative progress/completion are derived from current canonical relationships and Issue/Project state.

Because V1 does not retain complete relationship history, moving an Issue or Project changes which current parent scope receives that work's contribution. This is intentional current-scope semantics.

### 6.3 Actual activity timeline

For Project/Milestone/Initiative scopes:

```text
actualStart = earliest relevant Issue.firstStartedAt
```

Actual work end is derived primarily from real Completed Issue terminal facts. A later cancellation of work that never truly started must not mechanically extend the perceived work timeline.

The user's Project Complete action time is not the Project actual work end.

### 6.4 Health and attention

Health must be explainable from current facts and historical evidence; insufficient evidence yields Unknown/Insufficient Data rather than fabricated certainty.

Attention, Due Soon, Overdue, reminders, and Home Focus are derived at runtime from canonical facts + configuration + current time.

### 6.5 Diagnostics are not product history

Development diagnostics may record detailed commands, mutation plans, writes, rereads, reconciliation, rollback, refresh, and errors. That observability is not Canonical Domain history and must not become an authoritative product event log.

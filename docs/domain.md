# Trail Domain

## 1. Language

Trail uses the following canonical terms.

- **Workspace** — the singleton personal Trail boundary that owns shared configuration and user workspace state.
- **Initiative** — a long-term goal advanced through multiple Projects.
- **Project** — a coherent planning/execution context for related work, often a completable outcome but allowed to be long-lived.
- **Milestone** — a Project-scoped intermediate outcome/checkpoint.
- **Issue** — the smallest structured unit of work.
- **Triage Issue** — an Issue in intake context, before normal workflow.
- **Workflow Issue** — an Issue participating in the normal workflow lifecycle.
- **Cycle** — an explicitly opened/closed personal planning timebox.
- **StatusCategory** — the fixed system semantic categories Backlog, Unstarted, Started, Completed, Canceled.
- **StatusDefinition** — a configurable named status with stable identity, applicable to Projects or Issues only in categories legal for that entity type.
- **Priority** — Urgent, High, Medium, Low, or unset.
- **Estimate** — a discrete ordinal Issue work-size value, not elapsed time or duration.
- **Due** — a canonical user-set time target/attention fact.
- **LabelGroup** — a Workspace classification dimension with Single or Multiple selection semantics.
- **Label** — a selectable value belonging to exactly one LabelGroup.
- **Custom View** — persisted user workspace state describing a supported saved selection and presentation.
- **Favorite** — an ordered navigation reference to a supported Trail target.
- **Default Project** — an optional Workspace State reference to one ordinary Project used for high-frequency navigation and initial Project selection.

Names displayed to the user may change without changing stable identity or canonical semantics.

## 2. Model

### 2.1 Workspace boundary

Workspace is not a normal Core Entity. V1 has one implicit Workspace and does not repeat a `workspaceId` on every record.

Workspace owns:

- Project and Issue Status definitions/defaults/order;
- LabelGroups, Labels, and registrations;
- Cycle default planning rule;
- temporal/timezone policy;
- Custom Views, Favorites, Home composition, and the optional Default Project reference.

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

A Project may represent either a bounded deliverable or a long-lived work container. That distinction is usage, not a subtype: every Project has the same fields, lifecycle, relationships, and mutation rules.

Canonical Project facts:

- stable identity;
- title;
- optional lightweight description;
- Project StatusDefinition;
- optional Initiative membership;
- optional Priority;
- optional Due;
- applicable Labels.

Project Status is an explicit user lifecycle judgment. It is independent from child Issue completion ratio, actual activity time, and derived Health/Attention.

Project lifecycle uses four semantic categories:

```text
Unstarted   → user-facing default meaning: Not Started
Started     → user-facing default meaning: In Progress
Completed   → user-facing default meaning: Done
Canceled    → user-facing default meaning: Cancelled
```

Project does not use the `Backlog` StatusCategory.

### 2.5 Milestone

Canonical Milestone facts:

- stable identity;
- title;
- optional lightweight description;
- exactly one owning Project;
- optional Due.

V1 Milestone does not have Trail Labels, Priority, Estimate, workflow Status, manual completion, manual rank/order, or its own lifecycle timestamps.

### 2.6 Issue

Canonical Issue facts:

- stable identity;
- title;
- optional lightweight description;
- context: Triage or Workflow;
- context-conditioned StatusDefinition;
- context-conditioned Project relationship;
- optional same-Project Milestone for Workflow context;
- optional Priority;
- optional Estimate;
- context-conditioned Due;
- applicable Labels;
- Workflow creation fact `createdAt`;
- minimal lifecycle historical facts `firstStartedAt` and `terminalAt`.

Relationship applicability is context-conditioned:

```text
Triage Issue   → Project none; Milestone none
Workflow Issue → Project exactly 1; Milestone 0..1 within that Project
```

Workflow Issues may use all five StatusCategories:

```text
Backlog
Unstarted
Started
Completed
Canceled
```

### 2.7 Cycle

Canonical Cycle facts:

- stable identity;
- actual `startedAt`;
- confirmed `plannedEnd`;
- optional actual `endedAt`;
- selected Workflow Issue membership.

`endedAt` absent means Open/Current. `endedAt` present means Closed/Historical.

A Cycle does not own a title, workflow Status, Project relation, manual Progress, manual Effort, capacity/velocity score, or Issue-state snapshot. V1 does not persist future/upcoming Cycle objects.

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

Custom Views, Favorites, Home composition, and the optional Default Project reference are persisted user workspace state. They describe how the user organizes, navigates, and presents Trail; they are not Core Domain Data and do not redefine Project behavior.

The Default Project, when present, references one ordinary Project by stable identity. The reference does not make that Project a subtype, does not constrain its Status or Initiative membership, and does not prevent rename or deletion. A fresh Workspace may seed an ordinary Project titled `Standalone` and store its ID as the initial Default Project, but `Standalone` is not canonical Domain identity.

## 3. Relationships

Canonical relationships are:

```text
Project        → Initiative   0..1
Milestone      → Project      exactly 1
Triage Issue   → Project      none
Triage Issue   → Milestone    none
Workflow Issue → Project      exactly 1
Workflow Issue → Milestone    0..1, within WorkflowIssue.project scope
Cycle          ↔ Workflow Issue planning membership
```

### 3.1 Project and Initiative

A Project may have no Initiative or exactly one Initiative. It may move to another Initiative without changing Project identity.

Initiative does not own a second authoritative child Project collection. The inverse relationship is derived from current Projects.

### 3.2 Milestone and Project

A Milestone belongs to exactly one Project. Normal domain behavior does not support reparenting a Milestone across Projects.

### 3.3 Issue and Project

A Triage Issue has no Project relationship. A Workflow Issue belongs to exactly one Project. Moving a Workflow Issue between Projects preserves Issue identity and does not silently change Issue Status.

Project acceptance rules are lifecycle-dependent:

- an Unstarted Project accepts a newly created or moved-in Workflow Issue only when that Issue is in Backlog;
- a Started Project is the normal execution-capable Project context and may accept Workflow Issues whose current state is otherwise legal;
- Completed and Canceled Projects do not accept new Issue membership under the normal workflow capability rules.

If a target Project cannot accept an Issue in its current Status, normal Move rejects/hides that target rather than silently rewriting the Issue Status. A future explicit compound action may combine relation and Status changes, but that would be a different user intent.

Moving an Issue out of one Project therefore means moving it to another legal Project. This includes cleanup/reorganization from Completed or Canceled Projects; there is no Projectless Workflow state.

### 3.4 Issue and Milestone

A Triage Issue has no Milestone relationship. A Workflow Issue may reference at most one Milestone, and that Milestone must belong to the same Project as the Workflow Issue.

Therefore:

```text
Triage Issue
→ no Project
→ no Milestone

Workflow Issue.milestoneId present
→ Milestone.projectId == WorkflowIssue.projectId
```

When a Workflow Issue changes Project, an old Milestone from the previous Project must be cleared or replaced with a valid Milestone from the target Project in the same logical mutation.

### 3.5 Cycle membership

Only Workflow Issues may participate in Cycles. Triage Issues may not.

An Open Cycle may select a Workflow Issue regardless of that Issue's current StatusCategory or owning Project lifecycle. Project lifecycle still governs what may be done to the Issue inside its Project; it does not create a separate Cycle-membership eligibility rule.

Cycle membership does not imply or change Status, Project, Milestone, Priority, Estimate, Labels, or Due. Conversely, later changes to those Issue facts do not implicitly add or remove Cycle membership.

UI candidate discovery may intentionally surface a narrower set for a particular planning entry point, such as non-terminal work from Started Projects in a Cycle-level Add flow. That is read-side/product selection policy, not a Domain membership invariant. A Backlog Issue in an Unstarted Project remains a legal Open-Cycle member when the user explicitly adds it from that Project context.

Closed Cycle membership is retained as a minimal historical fact. A Workflow Issue can therefore appear in multiple historical Cycles over time; Cycle membership is not represented as a single `cycleId` on Issue.

## 4. State & Lifecycle

### 4.1 Status categories and applicability

The system StatusCategory set remains fixed:

```text
Backlog
Unstarted
Started
Completed
Canceled
```

Entity-type applicability is different:

```text
Issue   → Backlog | Unstarted | Started | Completed | Canceled
Project → Unstarted | Started | Completed | Canceled
```

Projects and Issues use separate StatusDefinition sets. A concrete StatusDefinition has stable identity, display name, entity type, and one legal category for that entity type.

Status display order has two levels:

1. fixed system StatusCategory order where applicable;
2. configured order of StatusDefinitions within each category.

Each applicable entity type/category has a configured default StatusDefinition for category-level actions such as Complete, Cancel, Start, Reopen, or Move to Backlog. Changing the default affects future mutations, not existing entities.

### 4.2 Workflow Issue creation

Normal Workflow Issue creation:

- creates a new stable Issue identity;
- sets context = Workflow;
- selects the configured default Issue StatusDefinition in Backlog;
- sets immutable `createdAt` to the workflow creation time.

This rule is independent of UI creation location. A Board/List group or nearby Status surface does not silently seed another Issue Status.

A Workflow Issue is created with exactly one explicit Project relationship, subject to Project acceptance rules. Therefore an Unstarted or Started Project may create a new child Issue because the new Issue begins in Backlog; Completed/Canceled Projects may not. A UI may preselect the Workspace Default Project, but Domain creation never interprets an omitted Project as a hidden fallback.

### 4.3 Triage Issue creation and defer

Quick Capture creates a Triage Issue:

- context = Triage;
- no normal workflow StatusDefinition;
- required Due;
- no Workflow `createdAt`.

V1 Quick Capture resolves its default Due from the current time plus seven calendar days through the temporal policy before creation.

For a Triage Issue, Due is the latest time by which the intake should be reviewed again. It contributes to review urgency and ordering but does not make the Triage Issue inaccessible before that timestamp.

Defer is a Due change on the same Triage Issue. Triage does not introduce Snooze state, `reviewAt`, `attentionAt`, `snoozedUntil`, or `isSnoozed`.

### 4.4 Accept Triage

Accept is not a context patch and does not preserve source identity. It formalizes one Triage Issue by creating either a new Workflow Issue or a new Project through the normal target-entity creation semantics.

Workflow target:

```text
Issue A (Triage)
→ create Issue B (Workflow, new identity, Backlog, explicit legal Project)
→ B becomes the new normal work item
→ remove A only after B is safely established
```

Project target:

```text
Issue A (Triage)
→ create Project P (new identity, normal Project creation defaults)
→ P becomes the new Project
→ remove A only after P is safely established
```

V1 automatically seeds only the Triage title and lightweight description/body into the target creation input. Triage Priority, Labels, Due, and other source-specific values are not implicitly copied to either target. The target creation use case may still let the user explicitly choose its normal properties before confirmation.

For a Workflow target, the explicit Project relationship and any Default Project initialization follow the ordinary Workflow Issue creation contract. For a Project target, ordinary Project validation/defaults apply. Canceling target creation leaves the source Triage Issue unchanged.

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

### 4.7 Project lifecycle transitions

Project Status changes are explicit user actions and never rewrite child Issue Statuses or relationships as a side effect.

The legal category transition matrix is:

```text
Unstarted → Started | Canceled
Started   → Completed | Canceled
Completed → Unstarted | Started
Canceled  → Unstarted | Started
```

`Started → Unstarted` is not legal. Unstarted is the genuine pre-execution lifecycle state and is not Pause.

Completed/Canceled Project reopening chooses either Unstarted or Started explicitly. Trail does not persist a hidden previous Project Status for reopening.

Project lifecycle Status does not create Project actual-start/actual-end history facts.

### 4.8 Project completion and cancellation

Project completion is an explicit action expressed by selecting a Completed Project StatusDefinition through the legal Status transition.

Complete Project requires every current child Issue to be terminal:

```text
child Issue category ∈ { Completed, Canceled }
```

Completing all Issues does not automatically Complete the Project.

Project cancellation does not require child Issues to be terminal. Canceling a Project changes only Project lifecycle Status. Existing child Issues, their Statuses, Milestones, Due, Priority, and other facts remain unchanged.

A Canceled Project that still owns one or more non-terminal child Issues therefore represents valid but unresolved cleanup work rather than Domain corruption.

### 4.9 Project-scoped Issue capability

Project lifecycle constrains which child Issue mutations are legal inside that Project context. Capability is derived from Project lifecycle + Issue lifecycle + requested action; it is not a persisted flag.

#### Unstarted Project

Unstarted Project is planning-capable but not execution-capable.

It may:

- create a new child Workflow Issue in Backlog;
- accept a moved-in Backlog Workflow Issue;
- edit planning/content facts of Backlog child Issues subject to ordinary Issue invariants;
- move a Backlog Issue among concrete Backlog StatusDefinitions;
- assign/clear a valid Project Milestone for Backlog work;
- cancel a child Issue where the Issue transition itself is legal;
- delete a Backlog child Issue where ordinary delete rules allow it;
- move a child Issue out to a legal target.

It may not advance child work into Unstarted/Started/Completed execution categories.

If an Unstarted Project contains a child Issue in a later lifecycle category because the Project was reopened from a previously terminal state, that Issue is not silently rewritten. Normal execution advancement remains disabled; cleanup operations such as cancel or move-out remain available where legal.

#### Started Project

Started Project is the normal planning + execution context. It permits ordinary Issue lifecycle progression, planning/property edits, Milestone assignment, creation in Backlog, and other legal Issue mutations.

#### Completed Project

Completed Project has no non-terminal child Issues at the moment completion is committed. It does not accept new Issue membership or normal child mutation. Existing child Issues remain readable and may be moved out when that relationship change is legal.

#### Canceled Project

Canceled Project does not accept new Issue membership or normal planning/execution mutation. A remaining non-terminal child Issue may be canceled or moved out to a legal target. Terminal children may also be moved out for organization when legal.

### 4.10 Milestone lifecycle and capability

Milestone completion/progress is derived from current associated Issues. Milestone has no manually maintained workflow Status or completion flag.

Milestone planning is legal while the owning Project is Unstarted or Started. In Completed/Canceled Projects, Milestones remain readable summary/context and are not normally created, edited, deleted, or newly assigned as part of child execution.

Deleting a Milestone preserves Issues and clears/replaces their Milestone relationship according to the legal delete mutation.

### 4.11 Cycle lifecycle

At most one Cycle may be Open at a time, and it is valid to have none.

Opening a Cycle records its actual start and a concrete planned end. The configured EndOfNextWeek default is a suggestion rule: calendar weeks run Monday through Sunday and the default points to the Sunday of the following natural week. A user may choose another end before creation; later configuration changes do not rewrite existing Cycles. An Open Cycle may begin with an empty member set and accept membership later.

While a Cycle is Open, membership changes are explicit Cycle mutations and may add/remove any Workflow Issue. They do not change member Issue facts. Reaching `plannedEnd` does not automatically close the Cycle.

Closing a Cycle sets actual `endedAt` and freezes normal planning membership. Closing does not mutate any member Issue fact and does not automatically open a successor.

A separate Start Next Cycle flow may use the previous Cycle's final membership as a discovery input. Previous members that are currently non-terminal may be initially selected as carry-over candidates; the user may deselect any candidates, add other Workflow Issues, or cancel the flow entirely, leaving no Current Cycle. Candidate selection is evaluated from current Issue facts when the flow runs; Trail does not persist an unfinished-at-close snapshot or perform automatic rollover.

### 4.12 Delete relation resolution

Deletion is not a normal lifecycle Status. Archive is not a generic Core Entity lifecycle.

A delete operation resolves affected relationships as one legal domain mutation:

- Delete Initiative: preserve Projects, normally clearing Initiative membership or reassigning as explicitly chosen.
- Delete Milestone: preserve Issues, clearing or replacing their Milestone relation.
- Delete Project: if child Workflow Issues exist, require an explicit legal replacement Project, preserve those Issues by moving them to that Project, clear any old Project-scoped Milestone relation, remove the deleted Project's Milestones, then remove the Project. If Workspace State references the deleted Project as Default Project, clear that reference rather than silently choosing another default.
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
2. Project Status references a Project StatusDefinition whose category is Unstarted, Started, Completed, or Canceled.
3. Workflow Issue Status references an Issue StatusDefinition whose category may be Backlog, Unstarted, Started, Completed, or Canceled.
4. Triage Issue has no normal StatusDefinition, has required Due, has no Project or Milestone relationship, and has no Workflow `createdAt`.
5. Workflow Issue has a valid StatusDefinition, exactly one valid Project, and required immutable `createdAt`; Workflow Due is optional.
6. Workflow Issue Milestone, when present, belongs to the same Project as the Issue.
7. Completed Issue has an Estimate.
8. New normal Workflow Issues begin in Backlog.
9. Unstarted Projects accept new/moved-in Issue membership only for Backlog Issues.
10. Completed/Canceled Projects accept no new Issue membership under the normal workflow capability rules.
11. Project completion requires every current child Issue to be Completed or Canceled.
12. Project Status mutation does not implicitly mutate child Issue facts.
13. At most one Cycle is Open.
14. Triage Issue is never a Cycle member.
15. Closed Cycle membership is not changed by normal planning actions.
16. Label selection obeys registration and Single/Multiple semantics.
17. Configuration defaults/reference targets match the intended entity type/category and do not leave dangling references.
18. Default Project, when present, references an existing ordinary Project and adds no Project-specific invariant.

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

A simple reminder can be represented by a Workflow Issue + Due in an ordinary Project (often the current Default Project) and optionally organized by Labels/Views; no Reminder entity is required.

### 5.5 Capability is not a Domain field

Trail does not persist duplicate state merely because a product capability needs to display it.

Examples:

- Project/Issue effective mutation capability = current lifecycle/context + Domain rules;
- Triage Defer = Due mutation;
- Triage Accept = normal target creation + source removal after target establishment;
- Due Soon / Overdue / Reminder = derived temporal capability;
- Project/Milestone/Cycle Progress = current relationship/membership + lifecycle aggregation;
- Cycle Effort = sum of present current member Estimates;
- Project Attention/Health = explainable current facts + temporal/context evidence;
- actual activity timeline = Issue lifecycle aggregation;
- Home summaries / Current Cycle / Triage / Projects / Custom Views = read selection/presentation;
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
- Projectless Workflow Issue state;
- Standalone/System Project subtype, role flag, or special Project lifecycle;
- Initiative/Milestone workflow Status;
- generic manual Progress/Health/Attention facts;
- Cycle capacity/velocity/success facts or Issue-state snapshots;
- future/upcoming Cycle records;
- Project Backlog lifecycle category;
- Project previousStatus/reopen-history field;
- generic Project/Issue capability flags persisted on records;
- manual Milestone rank/order;
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

Closed Cycle membership answers which Issues were finally associated with that Cycle. Trail does not preserve each member's Status, Project, Estimate, Progress contribution, Effort contribution, or other Issue snapshot at Cycle close. Historical Cycle views therefore resolve member Issue fields from current authoritative Issue data.

Trail does not preserve a general event log, complete relation history, Project previous Status, or every past lifecycle transition.

### 6.2 Project, Milestone, and Cycle progress / effort

Project Progress, Milestone Progress, and Cycle Progress use the same current-scope rule.

For the relevant current Issue scope:

```text
effectiveIssues = Issues whose StatusCategory != Canceled
completedIssues = effectiveIssues whose StatusCategory == Completed

progress = completedIssues / effectiveIssues
```

If `effectiveIssues` is empty, Progress is unavailable/undefined rather than fabricated as 0% or 100%.

Canceled Issues contribute neither numerator nor denominator. Started work does not receive partial completion credit. Priority, Estimate, Due, and manual weights do not alter V1 Progress.

Milestone derived completion is true only when its effective Issue scope is non-empty and Progress reaches 100%.

Cycle Effort is a separate live aggregate and does not weight Progress:

```text
effort = sum(issue.estimate for every current Cycle member where estimate is present)
```

Every member with a present Estimate contributes regardless of Backlog/Unstarted/Started/Completed/Canceled Status. Members without Estimate contribute nothing. Effort is derived from the current member Issues and is not persisted as a Cycle fact or close-time snapshot.

Initiative progress/completion remains derived from current Project relationships/state. Because V1 does not retain complete relationship history, moving an Issue or Project changes which current parent scope receives that work's contribution. This is intentional current-scope semantics.

### 6.3 Project temporal attention

Project temporal Attention considers every current child Issue that:

- is not Completed or Canceled;
- has a Due.

Issue Started/Unstarted/Backlog state does not otherwise matter. In particular, a Backlog Issue with Due participates because Due already expresses a time commitment.

The temporal partition is mutually exclusive:

```text
Overdue
Due This Week
Later Due
```

Due-less Issues, Completed Issues, and Canceled Issues do not participate.

A separate explainable Project Attention reason exists when a Canceled Project still owns non-terminal child Issues. This is cleanup attention, not temporal pressure and not invalid persisted state.

### 6.4 Health and future focus inputs

Health is a future derived capability, not a persisted Project fact. It must remain explainable from current facts/historical evidence; insufficient evidence yields Unknown/Insufficient Data rather than fabricated certainty.

A future Health policy may consume signals such as Project Progress, temporal Attention, Project/Milestone Due, lifecycle context, and retained activity evidence. Exact scoring/weights are intentionally not frozen until a real consumer such as a Home Project-focus selector requires them.

A future Home ranking may consume Health and Progress but is a consumer-specific selection policy, not Domain `rank`, `focusScore`, or `healthScore`.

### 6.5 Actual activity timeline

For Project/Milestone/Initiative scopes:

```text
actualStart = earliest relevant Issue.firstStartedAt
```

Actual work end is derived primarily from real Completed Issue terminal facts. A later cancellation of work that never truly started must not mechanically extend the perceived work timeline.

The user's Project Complete action time is not the Project actual work end.

### 6.6 Activity Heatmap

Activity Heatmap is derived from currently retained Workflow Issue lifecycle facts. For each calendar day in the configured timezone, the activity count is the number of present `createdAt`, `firstStartedAt`, and `terminalAt` facts that fall on that day.

The heatmap is not an immutable event log. Because `terminalAt` represents the current terminal lifecycle fact and may be cleared or replaced by later lifecycle transitions, historical heatmap cells may change accordingly. Trail does not persist a second activity-history source solely for the visualization.

### 6.7 Diagnostics are not product history

Development diagnostics may record detailed commands, mutation plans, writes, rereads, reconciliation, rollback, refresh, and errors. That observability is not Canonical Domain history and must not become an authoritative product event log.

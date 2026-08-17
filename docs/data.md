# Trail Data

## 1. Data Model

Trail persists three authoritative state classes and rebuilds runtime/derived state from them.

```text
Authoritative Persistent State

A. Domain Data
├─ Initiative
├─ Project
├─ Milestone
├─ Issue
└─ Cycle

B. System / Domain Configuration
├─ Status definitions, defaults, and ordering
├─ LabelGroups, Labels, and registrations
├─ Cycle default planning rule
└─ temporal/timezone policy

C. User Workspace State
├─ Custom Views
├─ Favorites
└─ Home composition
```

Runtime indexes, optimistic state, source health, progress, attention, usage counts, selector results, and other rebuildable projections are not authoritative persistence.

### 1.1 Common value types

All Core Entities use stable opaque IDs. IDs are immutable and are not derived from title, file name, path, or sequence.

Logical temporal fields use one `Timestamp` concept. Physical persistence encodes Timestamp as Unix epoch milliseconds.

Optional values are absent when not set rather than persisted as `null` unless a specific carrier requires a different representation.

Logical sets have no business ordering unless explicitly stated. Their physical array representation is serialized deterministically.

### 1.2 Initiative record

```text
InitiativeRecord {
  id: InitiativeId
  title: NonEmptyText
  description?: Text
  priority?: Priority
  due?: Timestamp
  labelIds: Set<LabelId>
}
```

Initiative does not persist child Project IDs, Status, Progress, Health, or activity timestamps.

### 1.3 Project record

```text
ProjectRecord {
  id: ProjectId
  title: NonEmptyText
  description?: Text
  statusDefinitionId: StatusDefinitionId
  initiativeId?: InitiativeId
  priority?: Priority
  due?: Timestamp
  labelIds: Set<LabelId>
}
```

Project does not persist Issue/Milestone collections, derived Progress/Health, or Project actual-start/actual-end timestamps.

### 1.4 Milestone record

```text
MilestoneRecord {
  id: MilestoneId
  title: NonEmptyText
  description?: Text
  projectId: ProjectId
  due?: Timestamp
}
```

Milestone does not persist Issue IDs, Labels, Priority, Estimate, Status, completion, or activity timeline.

### 1.5 Issue record

```text
IssueRecord {
  id: IssueId
  title: NonEmptyText
  description?: Text

  context: Triage | Workflow
  statusDefinitionId?: StatusDefinitionId

  projectId?: ProjectId
  milestoneId?: MilestoneId

  priority?: Priority
  estimate?: Estimate
  due?: Timestamp
  labelIds: Set<LabelId>

  createdAt?: Timestamp
  firstStartedAt?: Timestamp
  terminalAt?: Timestamp
}
```

Context-conditioned data rules:

```text
Triage
→ statusDefinitionId absent
→ due required
→ createdAt absent

Workflow
→ valid Issue statusDefinitionId required
→ createdAt required and immutable
→ due optional
```

Project/Milestone representation must satisfy:

```text
projectId absent → milestoneId absent
milestoneId present → referenced Milestone.projectId == Issue.projectId
```

Completed Issue requires `estimate`.

### 1.6 Cycle record

```text
CycleRecord {
  id: CycleId
  startedAt: Timestamp
  plannedEnd: Timestamp
  endedAt?: Timestamp
  issueIds: Set<IssueId>
}
```

`endedAt` absent means Open; present means Closed.

The Cycle owns Issue membership because Closed Cycles retain final membership as minimal historical data. Issue therefore does not persist a single `cycleId`.

### 1.7 Status configuration

Logical Status definitions have stable reference identity:

```text
StatusDefinitionRecord {
  id: StatusDefinitionId
  name: NonEmptyText
  entityType: Project | Issue
  category: Backlog | Unstarted | Started | Completed | Canceled
}
```

Default and ordering are category-scoped configuration:

```text
StatusCategoryConfig {
  defaultId: StatusDefinitionId
  definitionIds: OrderedList<StatusDefinitionId>
}

WorkflowStatusConfig {
  issue: Map<StatusCategory, StatusCategoryConfig>
  project: Map<StatusCategory, StatusCategoryConfig>
}
```

Each entity type/category has at least one definition. `defaultId` must be a member of the same category's ordered definitions.

### 1.8 Label configuration

```text
LabelGroupRecord {
  id: LabelGroupId
  name: NonEmptyText
  selectionMode: Single | Multiple
  registeredEntityTypes: Set<Initiative | Project | Issue>
}

LabelRecord {
  id: LabelId
  name: NonEmptyText
  groupId: LabelGroupId
}
```

Label does not duplicate group selection mode or applicability. Usage count is derived and is not persisted.

### 1.9 Cycle and temporal configuration

```text
CycleConfig {
  defaultEndRule: EndOfNextWeek
}

TemporalConfig {
  timezone
  presentation / calendar / notification policies
}
```

`EndOfNextWeek` uses Monday-Sunday calendar weeks and suggests the Sunday of the natural week after the start's current week. The selected concrete `plannedEnd` is persisted on the Cycle.

Input granularity such as “date-only” is not separately persisted. Application/temporal policy resolves user input to a concrete Timestamp before persistence.

### 1.10 Custom Views

A Custom View persists supported selection and presentation state rather than a generic executable query language.

```text
CustomViewConfig {
  id: CustomViewId
  name: NonEmptyText
  selection: SavedViewSelectionSpec
  presentation: PresentationSpec
}
```

`SavedViewSelectionSpec` may represent supported entity type, scope, filters, sort, and group dimensions. Exact operators/shapes are introduced only when the corresponding product capability is defined; V1 does not require an arbitrary boolean query AST.

Relative temporal conditions, when supported, remain relative (for example “overdue” or “within next 7 days”) and are evaluated against current time rather than materialized to fixed dates when the View is saved.

### 1.11 Favorites and Home

```text
FavoritesState {
  entries: OrderedList<FavoriteReference>
}

FavoriteReference {
  targetType
  targetId
}
```

Favorite array order is authoritative user ordering.

Home composition belongs to User Workspace State. V1's product layout is fixed enough that a full free-form widget-builder schema is not required; persisted Home shape is extended only when a supported Home customization requires it.

## 2. Identity & References

### 2.1 Core identity

Initiative, Project, Milestone, Issue, and Cycle use stable opaque immutable IDs unique within the Workspace.

StatusDefinition, LabelGroup, Label, and Custom View also use stable IDs because other authoritative records may reference them.

File sequence, file name, title, Markdown path, record position, H2 title, source range, or parser fingerprint are not identity.

### 2.2 Canonical relationship direction

A relationship is stored in one authoritative direction whenever possible:

```text
Project.initiativeId?
Milestone.projectId
Issue.projectId?
Issue.milestoneId?
```

The following are not duplicated as authoritative collections:

```text
Initiative.projectIds
Project.milestoneIds
Project.issueIds
Milestone.issueIds
```

Inverse/reverse collections are runtime projections.

### 2.3 Cycle membership exception

Cycle membership is stored as `Cycle.issueIds` so Closed Cycles retain historical membership even after an Issue later joins another Cycle.

Runtime may derive `issuesByCycleId`, `cyclesByIssueId`, and `currentCycleId`, but those are not a second persistence authority.

### 2.4 Polymorphic references

Favorites and similar workspace-state references store enough target identity to disambiguate target type and ID.

Native Obsidian links are navigational/document relationships and do not become a competing stable-ID Domain relationship unless the Domain explicitly defines one.

## 3. Authority & Derivation

### 3.1 Domain Data

Domain Data has business continuity. New Core Entity instances do not overwrite old instances.

### 3.2 Configuration

Configuration defines current system semantics/defaults and may be edited/replaced. Stable IDs preserve current references, but the system does not retain every historical configuration version as Core Domain history.

A configuration mutation is complete only when all affected Domain Data and Workspace State references remain legal.

Changing a Status name/default/order does not reinterpret existing Entity IDs. Removing or semantically changing a referenced definition requires reference resolution.

### 3.3 User Workspace State

Custom Views, Favorites, and Home composition are authoritative user organization/navigation state, not Core Domain history.

Deleting a View does not delete referenced Entities.

### 3.4 Derived and runtime state

The following are rebuildable and are not authoritative persistence:

- reverse relationship indexes;
- current Cycle lookup;
- label usage counts;
- Status/category lookup indexes;
- Progress, Health, Attention, Due Soon, Overdue, Reminder;
- actual activity timelines;
- selector/result caches;
- optimistic/pending state;
- source ownership/indexes;
- source health and diagnostics;
- local selection, hover, drag state, modal drafts, and other ephemeral UI state.

Derived values may be cached/materialized for performance, but the cache never becomes a second source of truth.

## 4. Persistence

### 4.1 Persistence topology

```text
Vault
├─ Trail-managed Markdown
│  ├─ Domain Markdown
│  │  ├─ Initiatives/
│  │  ├─ Projects/
│  │  └─ Collections/
│  │     ├─ Triage.md
│  │     ├─ Projectless Issues.md
│  │     └─ Cycles.md
│  └─ Utility Markdown
│     └─ Collections/Weekly Update.md
│
└─ ordinary Obsidian Markdown

.obsidian/plugins/trail/data.json
├─ configuration
└─ workspaceState

Plugin code
└─ current Physical Schema Registry
```

Domain business facts live in Trail-managed Domain Markdown. Configuration and synchronized Workspace State use Obsidian plugin `data.json`. Physical schema definition travels with plugin code. Rebuildable runtime state is not persisted as business truth.

### 4.2 Managed scope

Current managed root:

```text
Trail/
├─ Initiatives/
├─ Projects/
└─ Collections/
   ├─ Triage.md
   ├─ Projectless Issues.md
   ├─ Cycles.md
   └─ Weekly Update.md
```

Directories represent storage type, not mutable Domain relationships. Project Initiative membership or Status does not move the Project into relationship/status subdirectories.

`Weekly Update.md` is a registered utility and is excluded from Domain scans. Unexpected Markdown inside managed Domain locations that does not match a registered current carrier is a persistence issue rather than silently becoming an ordinary note.

### 4.3 Initiative and Project filenames

Initiative and Project files use independent four-digit sequence namespaces for readable file-tree sorting:

```text
Initiatives/0001 Personal Finance.md
Projects/0001 Mapping Review.md
```

Sequence:

- is physical only;
- is not persisted into the Domain record;
- does not carry identity or relationship meaning;
- may be reused after the historically highest sequence disappears;
- is allocated by scanning current valid files and using `max + 1`.

The readable suffix derives from current title. Title remains canonical even if filename suffix is temporarily stale. Duplicate titles are legal.

### 4.4 Frontmatter and file kinds

File-backed Entity frontmatter:

```yaml
---
kind: project
id: "<stable-id>"
---
```

Initiative uses `kind: initiative`.

Singleton containers use fixed kinds without Entity IDs:

```yaml
kind: triage
kind: projectless-issues
kind: cycles
```

No `trail-` field namespace or per-file schema-version marker is required because managed scope and structural context already provide namespace/schema context.

### 4.5 Structural Markdown grammar

Managed Domain Markdown reserves:

```text
Frontmatter
→ file identity/container kind

H1
→ structural section

H2
→ Entity record boundary and visible title/derived label

single-line HTML JSON comment immediately after H2
→ structured metadata

H3-H6 + ordinary Markdown
→ lightweight description/body
```

Metadata marker form:

```markdown
## Implement Parser
<!-- data {"id":"issue-id","context":"workflow","statusDefinitionId":"status-id","createdAt":1786464000000} -->
```

Only a marker in a schema-approved structural position is a Trail record. Ordinary comments elsewhere do not become records.

H1/H2 are structural inside managed Domain files. H3-H6, lists, tables, code fences, callouts, images/embeds, and wikilinks may appear inside a lightweight body.

### 4.6 Initiative carrier

An Initiative file contains only its Initiative record. Child Projects remain independent Project files and reference the Initiative by stable ID.

Conceptually:

```markdown
---
kind: initiative
id: "initiative-id"
---

# Initiative

## Household Finance
<!-- data {"priority":"high","due":1786464000000,"labelIds":["label-a"]} -->

Long-term goal description.
```

### 4.7 Project carrier

A Project file contains:

1. the Project record;
2. its Project-scoped Milestones;
3. the Workflow Issues currently belonging to that Project.

```text
# Project
  ## Project record

# Milestones
  ## Milestone records

# Issues
  ## Issue records
```

Milestones and Issues retain explicit `projectId`; physical placement is validated against that reference but does not replace it.

Physical record order is not business sorting/rank.

### 4.8 Triage carrier

`Collections/Triage.md` contains only Triage Issues.

Triage Issues have required Due, no normal workflow status, and no Workflow `createdAt`.

### 4.9 Projectless Workflow Issues carrier

`Collections/Projectless Issues.md` contains only:

```text
context = Workflow
projectId absent
milestoneId absent
```

Triage and project-less Workflow Issues remain separate carriers because their Domain context/lifecycle semantics differ.

### 4.10 Cycle carrier

All Open and Closed Cycles live in `Collections/Cycles.md` under `# Cycles`.

Cycle H2 is a human-readable derived label from temporal facts; it is not Cycle identity/title. The metadata record owns `id`, `startedAt`, `plannedEnd`, optional `endedAt`, and `issueIds`.

Closing a Cycle updates the same record; it is not moved into a separate history section.

### 4.11 Weekly Note utility

`Collections/Weekly Update.md` is not Domain Data and is not part of the Domain Physical Schema Registry.

V1 structure:

```markdown
# Current

...

# Archive

## 2026-08-12

...
```

Its two product operations are replacing Current content and manually archiving Current into a dated H2 while clearing Current. It has no stable Domain ID, Status, Due, runtime index, or automatic Issue/Cycle linkage.

### 4.12 Field carriers and canonical metadata order

The current schema uses these metadata orders.

Initiative:

```text
priority
due
labelIds
```

Project:

```text
statusDefinitionId
initiativeId
priority
due
labelIds
```

Milestone:

```text
id
projectId
due
```

Issue:

```text
id
context
statusDefinitionId
projectId
milestoneId
priority
estimate
due
labelIds
createdAt
firstStartedAt
terminalAt
```

Cycle:

```text
id
startedAt
plannedEnd
endedAt
issueIds
```

File-backed Initiative/Project IDs live in frontmatter and are not repeated in their record metadata.

Conditional Domain requiredness is not misrepresented as unconditional physical requiredness. For example, Issue `statusDefinitionId` is structurally optional in the shared Issue grammar but required for Workflow context by Domain validation.

### 4.13 Optional values and set serialization

Unset optional metadata is omitted instead of serialized as `null`.

Set-backed values serialize as deterministic arrays. ID sets use lexical serialized-ID order; enum sets use a stable schema-defined order. Input array ordering differences are acceptable and normalize on the next ordinary write.

### 4.14 Timestamp encoding

All persisted Timestamp fields use Unix epoch milliseconds numbers.

Persistence does not store timezone offset, temporal precision, date-only flags, display formatting, overdue/due-soon flags, or derived duration.

### 4.15 Plugin `data.json`

Logical top level:

```json
{
  "configuration": {},
  "workspaceState": {}
}
```

Configuration conceptually contains statuses, labels, cycle settings, and temporal settings. Workspace state contains Custom Views, Favorites, and Home state.

Within Status persistence, fixed hierarchy (`issue/project` → category) may encode entity type/category context so individual definition entries need not repeat those fields. Definition IDs remain opaque and stable.

LabelGroups/Labels are stored as mutable definitions with explicit group IDs. Favorites use authoritative array ordering. Set-backed arrays have no business order unless their contract explicitly says otherwise.

Machine/session-local UI state does not become synchronized workspace state merely because `data.json` exists.

### 4.16 Physical Schema Registry

Plugin code carries one current Physical Schema Registry used by parser, serializer, validator, and fixtures.

It defines at least:

```text
file / record kind
field name
carrier
field type
required flag
canonical field order
missing-value behavior
applicable structure
validation binding
```

Writers do not maintain independent field whitelists/orders.

V1 supports one current physical schema in normal runtime. There is no persistent per-record/file `schemaVersion` field.

## 5. Integrity & Evolution

### 5.1 Relationship vs placement integrity

Stable ID references are canonical Domain relationships. Physical placement is a separate storage invariant that must agree with them.

Example invalid state:

```text
Issue physically located in Project A file
Issue.projectId = Project B
```

Persistence must report this inconsistency. It must not silently rewrite the reference from placement or silently move the record merely because the reference disagrees.

### 5.2 Validation layers

Validation proceeds through distinct concerns:

```text
Physical Validation
→ file/frontmatter/headings/record boundaries/markers

Field Validation
→ IDs/timestamps/enums/arrays/text

Domain Validation
→ context/lifecycle/field invariants

Reference Validation
→ stable reference existence and scope

Workspace Validation
→ cross-workspace invariants such as duplicate IDs and max one Open Cycle
```

Issues should preserve the smallest reliable scope and identify source/container, record, field/relation, and violated rule where trustworthy.

### 5.3 Corruption isolation

A corrupt record does not automatically make unrelated parseable records unknowable. Validation preserves the smallest trustworthy fault scope.

If file identity/structure is too damaged to establish reliable record boundaries, fault scope expands to the file.

How much of the product remains writable under a known Data Issue is an Architecture policy, not a Data model change.

### 5.4 Configuration integrity

`data.json` is referenced by Domain records, so invalid configuration is not silently replaced with fresh defaults.

Configuration load/update must reject states that would leave missing/invalid Status, Label, default, Custom View, or Favorite references. Old last-known-good runtime data may be useful to Architecture for viewing/recovery, but is not authority for further writes after persistence becomes invalid.

### 5.5 Canonical normalization

Pure formatting divergence is not Domain corruption.

Parser may accept valid metadata with non-canonical property order or set array order. Normal Trail writes serialize the affected record using canonical omission/order. Startup does not rewrite the entire Vault solely to normalize formatting.

### 5.6 Initialization and missing data

Fresh installation with no `Trail/` root is not corruption; explicit bootstrap may create required current containers.

Once a Workspace exists, disappearance of a required singleton such as Triage/Projectless Issues/Cycles is a Data Issue rather than a reason to silently create a new empty container that hides possible data loss.

Weekly Update is lazy-created utility state and is not a required Domain bootstrap container.

### 5.7 Schema evolution

Breaking physical-schema changes use an explicit one-way migration:

```text
old persisted data
→ preflight / recovery boundary
→ transform all affected records
→ full validation
→ current-schema state
→ normal runtime uses only the new schema
```

Normal startup does not maintain long-term dual parsers or silently migrate a subset of files. Migration execution/recovery mechanics belong to Architecture/Implementation; the Data contract is one current schema after a successful migration.

### 5.8 Native links

File-backed Initiative/Project files may naturally participate in Obsidian wikilinks/backlinks. Entity description bodies may contain ordinary links.

A navigational link to a Note is not a new stable-ID Core Domain relationship and does not require a permanently synchronized bidirectional relation. V1 does not require stable native block-link targets for embedded Issue/Milestone records.

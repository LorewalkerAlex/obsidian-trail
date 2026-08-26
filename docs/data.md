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
├─ Estimate weights for the fixed T-Shirt levels
├─ Cycle default planning rule
└─ temporal/timezone policy

C. User Workspace State
├─ Default Project reference
├─ Custom Views
├─ Favorites
└─ Home composition
```

Runtime indexes, optimistic state, source health, effective capabilities, progress, attention, health, usage counts, selector results, and other rebuildable projections are not authoritative persistence.

### 1.1 Common value types

All Core Entities use stable opaque IDs. IDs are immutable and are not derived from title, file name, path, or sequence.

Logical temporal fields use one `Timestamp` concept. Physical persistence encodes Timestamp as Unix epoch milliseconds.

Optional values are absent when not set rather than persisted as `null` unless a specific carrier requires a different representation.

Logical sets have no business ordering unless explicitly stated. Their physical array representation is serialized deterministically.

Logical `Estimate` is a fixed enum `Small | Medium | Large | XLarge`, presented as `S | M | L | XL`. Domain Markdown serializes those levels as stable lowercase keywords `small | medium | large | xlarge`; numeric aggregation weights are Configuration and are never serialized into `Issue.estimate`.

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

Project does not persist Issue/Milestone collections, derived Progress/Attention/Health, effective capability flags, previous/reopen Status, manual rank, Project actual-start/actual-end timestamps, or any `Standalone`/system-role flag. A Project used as the Workspace Default Project has the same record shape as every other Project.

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

Milestone does not persist Issue IDs, Labels, Priority, Estimate, Status, completion, manual order/rank, or activity timeline.

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
→ projectId absent
→ milestoneId absent
→ due required
→ createdAt absent

Workflow
→ valid Issue statusDefinitionId required
→ projectId required
→ milestoneId optional
→ createdAt required and immutable
→ due optional
```

Project/Milestone representation must satisfy:

```text
Triage → projectId absent and milestoneId absent
Workflow → projectId present
Workflow milestoneId present → referenced Milestone.projectId == Issue.projectId
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

`category` uses the shared system enum, but validation constrains entity-type applicability:

```text
Issue definition category
→ Backlog | Unstarted | Started | Completed | Canceled

Project definition category
→ Unstarted | Started | Completed | Canceled
```

Project Status configuration therefore has no Backlog bucket.

Default and ordering are category-scoped configuration:

```text
StatusCategoryConfig {
  defaultId: StatusDefinitionId
  definitionIds: OrderedList<StatusDefinitionId>
}

WorkflowStatusConfig {
  issue: {
    Backlog: StatusCategoryConfig
    Unstarted: StatusCategoryConfig
    Started: StatusCategoryConfig
    Completed: StatusCategoryConfig
    Canceled: StatusCategoryConfig
  }

  project: {
    Unstarted: StatusCategoryConfig
    Started: StatusCategoryConfig
    Completed: StatusCategoryConfig
    Canceled: StatusCategoryConfig
  }
}
```

Each applicable entity type/category has at least one definition. `defaultId` must be a member of the same entity type/category's ordered definitions.

No `previousStatusDefinitionId`, lifecycle-transition history, or persisted capability mask is required for Project reopen/capability behavior.

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

### 1.9 Estimate, Cycle, and temporal configuration

```text
EstimateWeightConfig {
  small: PositiveNumber
  medium: PositiveNumber
  large: PositiveNumber
  xlarge: PositiveNumber
}

CycleConfig {
  defaultEndRule: EndOfNextWeek
}

TemporalConfig {
  timezone
  presentation / calendar / notification policies
}
```

V1 Estimate weights default to `small=1`, `medium=2`, `large=5`, and `xlarge=10`. The four keys and their ordinal order are fixed product semantics; Configuration may change only the numeric weights. Weight changes affect live derived numeric aggregates and do not rewrite Issue records.

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

### 1.11 Default Project, Favorites and Home

Workspace State may contain one optional stable Project reference:

```text
defaultProjectId?: ProjectId
```

The referenced record is an ordinary Project. `defaultProjectId` is not Project identity, is not derived from title, and does not require a Project subtype or `systemRole` field. A fresh Workspace seeds a normal Project titled `Standalone` at the reserved initial path `Projects/0000 Standalone.md` and stores its stable ID here. Sequence `0000` is only a fresh-bootstrap physical convention for that initial seed: it does not define Default identity, it remains attached to the seeded Project across title rename, it is not reassigned when another Project later becomes Default, and it is not recreated when the seed is deleted. Rename leaves the reference intact, while a legal delete clears the reference rather than inventing a replacement. A dedicated user-facing mechanism for changing the Default Project may be added when needed and does not change this data contract.

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

Future Project focus/health ranking remains a runtime/query policy and does not add persisted Project score/rank fields merely to drive Home.

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
WorkflowIssue.projectId
WorkflowIssue.milestoneId?
WorkspaceState.defaultProjectId?
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

### 2.5 Default Project is a workspace reference, not Project identity

The Workspace Default Project is represented only by optional `WorkspaceState.defaultProjectId`. It points to the same stable ID used by an ordinary Project record; the reference itself adds no second Project identity, path, kind, title convention, or lifecycle field.

Fresh bootstrap separately reserves physical Project sequence `0000` for the initial seed. That reservation belongs to the seeded Project source, not to Default identity: renaming the seed updates the readable filename suffix while preserving `0000`, and changing the Default Project does not move another Project into `0000`. `Standalone` is only the initial title; another ordinary Project could legally have the same title.

## 3. Authority & Derivation

### 3.1 Domain Data

Domain Data has business continuity. New Core Entity instances do not overwrite old instances.

### 3.2 Configuration

Configuration defines current system semantics/defaults and may be edited/replaced. Stable IDs preserve current references, but the system does not retain every historical configuration version as Core Domain history.

A configuration mutation is complete only when all affected Domain Data and Workspace State references remain legal.

Changing a Status name/default/order does not reinterpret existing Entity IDs. Removing or semantically changing a referenced definition requires reference resolution.

Project configuration cannot introduce a Project StatusDefinition in Backlog; Issue configuration continues to require Backlog definitions/defaults because every new Workflow Issue begins there. Estimate Configuration must retain exactly one valid numeric aggregation weight for each fixed T-Shirt level; changing a weight does not reinterpret the enum level stored on an Issue.

### 3.3 User Workspace State

Default Project, Custom Views, Favorites, and Home composition are authoritative user organization/navigation state, not Core Domain history.

Deleting a View does not delete referenced Entities. Deleting the Project referenced by `defaultProjectId` clears that Workspace State reference as part of the legal delete mutation; Trail does not silently choose or create another default.

### 3.4 Derived and runtime state

The following are rebuildable and are not authoritative persistence:

- reverse relationship indexes;
- current Cycle lookup;
- label usage counts;
- Status/category lookup indexes;
- Project/Issue effective capability projections;
- entity presentation/Inspector projections;
- Project/Milestone Progress;
- Project temporal Attention and cleanup-attention reasons;
- Health, Due Soon, Overdue, Reminder;
- future consumer-specific Project focus/ranking scores;
- actual activity timelines;
- selector/result caches;
- optimistic/pending state;
- source ownership/indexes;
- source health and diagnostics;
- local selection, hover, drag state, modal drafts, location-scoped Filter state, and other ephemeral UI state.

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
│  │     └─ Cycles.md
│  └─ Utility Markdown
│     └─ Collections/Weekly Update.md
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
   ├─ Cycles.md
   └─ Weekly Update.md
```

Directories represent storage type, not mutable Domain relationships. Project Initiative membership or Status does not move the Project into relationship/status subdirectories.

`Weekly Update.md` is a registered utility and is excluded from Domain scans. Unexpected Markdown inside managed Domain locations that does not match a registered current carrier is a persistence issue rather than silently becoming an ordinary note.

### 4.3 Initiative and Project filenames

Initiative and Project files use independent four-digit sequence namespaces for readable file-tree sorting:

```text
Initiatives/0001 Personal Finance.md
Projects/0000 Standalone.md       fresh-bootstrap seed only
Projects/0001 Mapping Review.md   ordinary Project allocation
```

Sequence:

- is physical only;
- is not persisted into the Domain record;
- does not carry identity or relationship meaning;
- reserves Project sequence `0000` only for the ordinary Project created by genuine fresh bootstrap;
- uses `0001` through `9999` for ordinary Initiative allocation and post-bootstrap Project allocation;
- is allocated for ordinary creates by scanning current valid files and using `max + 1`, so a Project directory containing only the `0000` seed allocates the next Project as `0001`;
- may reuse a lower historical normal sequence after the historically highest current sequence disappears, but ordinary allocation never emits the reserved Project sequence `0000`.

The readable suffix derives from current title. Title remains canonical even if filename suffix is temporarily stale. Duplicate titles are legal. Renaming the seeded Project changes only the readable suffix and preserves sequence `0000`.

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
kind: cycles
```

The fresh `Standalone` seed is not a singleton carrier kind. It uses the ordinary `kind: project` source and Project record grammar; only its initial physical sequence is reserved as `0000` by genuine fresh bootstrap.

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
<!-- data {"id":"issue-id","context":"workflow","statusDefinitionId":"status-id","projectId":"project-id","createdAt":1786464000000} -->
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

Project lifecycle does not move Issue/Milestone records to different physical sections/files or rewrite their logical content. Physical record order is not business sorting/rank.

### 4.8 Triage carrier

`Collections/Triage.md` contains only Triage Issues.

Triage Issues have required Due, no normal workflow status, no Project or Milestone relationship, and no Workflow `createdAt`.

Every Workflow Issue is stored in its owning ordinary Project carrier. No Projectless Workflow carrier exists in the current schema.

### 4.9 Cycle carrier

All Open and Closed Cycles live in `Collections/Cycles.md` under `# Cycles`.

Cycle H2 is a human-readable derived label from temporal facts; it is not Cycle identity/title. The metadata record owns `id`, `startedAt`, `plannedEnd`, optional `endedAt`, and `issueIds`.

Closing a Cycle updates the same record; it is not moved into a separate history section.

### 4.10 Weekly Note utility

`Collections/Weekly Update.md` is not Domain Data and is not part of the Domain Physical Schema Registry.

V1 structure:

```markdown
# Current

...

# Archive

## 2026-08-12

...
```

`# Current` and `# Archive` are H1 structural boundaries, and dated Archive entries are H2 structural records. Weekly Note user content may contain ordinary Markdown and H3-H6 headings, but not H1/H2 headings because those depths are reserved by the utility structure.

Its two product operations are replacing Current content and manually archiving Current into a dated H2 while clearing Current. It has no stable Domain ID, Status, Due, runtime index, or automatic Issue/Cycle linkage.

### 4.11 Field carriers and canonical metadata order

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

Conditional Domain requiredness is not misrepresented as unconditional physical requiredness. In the shared Issue grammar, `statusDefinitionId` and `projectId` remain structurally optional because Triage and Workflow records share one physical record kind; Domain validation requires both for Workflow context and forbids Project/Milestone relationships for Triage context.

`estimate`, when present, serializes the stable T-Shirt enum keyword (`small`, `medium`, `large`, or `xlarge`), never the current numeric aggregation weight.

No physical Project carrier field changes are required for the four-state lifecycle because `statusDefinitionId` already references configuration; legality is validated through the referenced Project StatusDefinition category.

### 4.12 Optional values and set serialization

Unset optional metadata is omitted instead of serialized as `null`.

Set-backed values serialize as deterministic arrays. ID sets use lexical serialized-ID order; enum sets use a stable schema-defined order. Input array ordering differences are acceptable and normalize on the next ordinary write.

### 4.13 Timestamp encoding

All persisted Timestamp fields use Unix epoch milliseconds numbers.

Persistence does not store timezone offset, temporal precision, date-only flags, display formatting, overdue/due-soon flags, progress, attention, health, or derived duration.

### 4.14 Plugin `data.json`

Logical top level:

```json
{
  "configuration": {},
  "workspaceState": {}
}
```

Configuration conceptually contains statuses, labels, Estimate weights, cycle settings, and temporal settings. Workspace state contains optional `defaultProjectId`, Custom Views, Favorites, and Home state.

Within Status persistence, fixed hierarchy (`issue/project` → applicable category) may encode entity type/category context so individual definition entries need not repeat those fields. Definition IDs remain opaque and stable. Project status persistence has no Backlog category branch.

LabelGroups/Labels are stored as mutable definitions with explicit group IDs. Favorites use authoritative array ordering. Set-backed arrays have no business order unless their contract explicitly says otherwise.

Machine/session-local UI state, capability state, Inspector state, and derived Project summary state do not become synchronized workspace state merely because `data.json` exists.

### 4.15 Physical Schema Registry

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
→ context/lifecycle/field/capability invariants

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

Configuration/Workspace State load or update must reject states that would leave missing/invalid Status, Label, Custom View, or Favorite references. This includes rejecting Project Status configuration that introduces or references Backlog and rejecting an Estimate weight configuration that omits a fixed T-Shirt level or provides a non-positive/non-finite weight.

`defaultProjectId` is intentionally softer at destructive failure edges. A missing referenced Project is observable workspace/reference damage, but it is not a hard Domain-graph-invalid condition: Query/navigation resolve the missing Default as absent, while a successful explicit Project delete clears `defaultProjectId` in the final Plugin Data commit. This keeps Plugin Data commit-last compatible with destination-first/destructive Integrity Batch ordering without turning a failure prefix into silent Project replacement.

Old last-known-good runtime data may be useful to Architecture for viewing/recovery, but is not authority for further writes after hard persistence invariants become invalid.

### 5.5 Canonical normalization

Pure formatting divergence is not Domain corruption.

Parser may accept valid metadata with non-canonical property order or set array order. Normal Trail writes serialize the affected record using canonical omission/order. Startup does not rewrite the entire Vault solely to normalize formatting.

### 5.6 Initialization and missing data

Fresh installation with no `Trail/` root is not corruption; explicit bootstrap creates the required current containers plus an ordinary seed Project titled `Standalone` at `Trail/Projects/0000 Standalone.md`, and persists that Project ID as the initial `workspaceState.defaultProjectId`. The seed uses the normal Project record/carrier and normal Project creation defaults; sequence `0000` is only its stable fresh-bootstrap physical slot. Its title, lifecycle, Initiative membership, properties, and later deletion remain ordinary Project behavior, and rename preserves `0000` while updating the readable suffix.

Once a Workspace exists, disappearance of a required singleton such as Triage or Cycles is a Data Issue rather than a reason to silently create a new empty container that hides possible data loss. A missing Project referenced by `defaultProjectId` is likewise observable reference-integrity damage when caused by external persistence damage, but it does not hard-fail the Domain graph; Query/navigation treat the Default as absent. Explicit Trail Project deletion clears the reference in the final Plugin Data commit.

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

The Estimate model changes the canonical Issue field from an open numeric carrier to the fixed T-Shirt enum `small | medium | large | xlarge`, with numeric weights moved to Configuration. This is a breaking current-schema correction. Checked-in pre-V1 development fixtures may be aligned directly; if retained user data contains legacy numeric Estimate values, Migration must use an explicit one-way mapping or user-confirmed resolution rather than silently guessing a semantic size. Normal runtime must not retain dual numeric/enum Estimate parsing after migration. Changing only the configured weights later is not a schema migration and never rewrites Issue records.

The Project four-state lifecycle changes the logical Status configuration contract. If existing persisted Project configuration contains a Backlog branch or Project definitions in Backlog, implementation must treat removal as an explicit configuration migration/reference-resolution concern rather than silently reinterpret those definitions.

The current removal of Projectless Workflow is also a breaking schema transition. Legacy `Collections/Projectless Issues.md` records must be moved to a real ordinary Project with explicit `projectId` before that carrier is removed. For the current pre-V1 transition, migration may create an ordinary Project titled `Standalone` when a legal target is needed and set it as `workspaceState.defaultProjectId`; the migration target's lifecycle must be chosen so existing Issue facts can be preserved without silently rewriting Issue Status. The reserved Project sequence `0000` belongs only to genuine fresh bootstrap, so a migration-created target uses normal Project path allocation. After successful validation, the Projectless source kind/path/codec is removed from normal runtime. Long-term dual parsing is not part of the target schema.

### 5.8 Native links

File-backed Initiative/Project files may naturally participate in Obsidian wikilinks/backlinks. Entity description bodies may contain ordinary links.

A navigational link to a Note is not a new stable-ID Core Domain relationship and does not require a permanently synchronized bidirectional relation. V1 does not require stable native block-link targets for embedded Issue/Milestone records.

# Trail Architecture

## 1. Drivers

Trail V1 architecture is shaped by the following constraints and goals.

### 1.1 Product and host

- Trail is a personal, single-user Obsidian plugin.
- Markdown and Obsidian plugin data remain authoritative persistence.
- Trail must coexist with ordinary Obsidian notes, links, workspace panes, and native editing.
- The product targets desktop Obsidian with variable pane widths; mobile is not a current V1 requirement.
- The UI should feel immediate and polished even though persistence is file-based.

### 1.2 Correctness and recoverability

- Runtime may present optimistic intent but must distinguish intended state from persistence-confirmed state.
- Trail must not silently lose, overwrite, or reinterpret authoritative Markdown/configuration on conflict or invalid data.
- Cross-source changes prefer a detectable duplicate/error outcome over silent source deletion/data loss.
- External managed-data changes are treated as authoritative persistence changes and are revalidated before becoming writable runtime state.

### 1.3 Scale

Trail is designed for long-lived personal data rather than enterprise throughput.

Useful conservative scale assumptions are:

```text
Initiatives          < 100
Projects             ~ 2,000
Issues               ~ 20,000–40,000; tests may reach 50,000
Cycles               ~ 260–300
Labels               ~ 200–300
Saved Views          small; normally < 10
Heavy Project        500–1,000 Issues
Large result list    thousands of Issues
```

Cold full rebuild is acceptable at personal scale. Daily mutations should primarily scale with affected sources/entities rather than full historical size.

### 1.4 Engineering principles

The architecture favors:

- modular monolith over distributed infrastructure;
- Functional Core / Imperative Shell;
- Ports & Adapters at the Obsidian boundary;
- one owner per mechanism;
- reuse before custom frameworks;
- source-of-truth clarity over convenience aliases;
- proportional reliability and performance hardening;
- mature focused libraries when they solve generic UI/runtime mechanisms better than custom code;
- no speculative query DSL, transaction graph, schema-driven UI framework, or enterprise concurrency layer.

## 2. Boundaries

Trail has the following canonical architectural boundaries.

### 2.1 Domain

Owns:

- Core Entity/configuration/workspace-state types;
- values and invariants;
- reference/workspace validation;
- pure derived rules;
- pure semantic mutation planning.

Domain is independent of React, Obsidian, Markdown parsing, file paths/ranges, persistence implementations, runtime stores, and host APIs.

### 2.2 Markdown

Owns physical grammar and schema mechanisms:

- managed path definitions;
- structural Markdown operations;
- current Physical Schema Registry;
- explicit carrier codecs;
- parse/serialize field mapping.

Markdown does not own product behavior, runtime state, persistence orchestration, or Obsidian API calls.

### 2.3 Persistence

Owns authoritative carrier access contracts:

- Domain Markdown source read/process/create/rename/delete/list;
- plugin `data.json` load/save;
- source repository composition of I/O + codec/schema + parse/validation.

Persistence does not own UI behavior, semantic planning, runtime projections, or host-specific Obsidian implementations.

### 2.4 Mutation

Owns the shared logical-mutation lifecycle:

- implementation-level Mutation Plan contract;
- optimistic plan submission/coordination;
- global serial queue;
- dequeue-time physical materialization;
- persistence transaction topology/execution;
- bounded compensation policy for supported cross-source operations.

Feature code does not create a parallel queue, pending model, transaction executor, or writer stack.

### 2.5 Runtime

Owns in-memory operational state:

- persistence-confirmed committed state;
- ordered optimistic pending plans;
- runtime lifecycle/control;
- source health;
- source ownership;
- structural/reference indexes;
- effective-state projection.

Runtime does not parse Markdown and does not become persistence authority.

### 2.6 Source Sync

Owns authoritative source lifecycle and convergence:

- bootstrap/discovery;
- authoritative source operation verification;
- committed reconcile after Trail writes;
- external managed-persistence refresh;
- source-health convergence;
- write-event suppression/coordination contracts above raw host I/O.

### 2.7 Query

Owns read-side derived logic and reusable selection:

- effective-state selection;
- status/configuration interpretation;
- source-health selection;
- structural narrowing;
- shared filter/sort/group/search helpers;
- page-specific selectors when product pages need them.

Query does not mutate persistence or create a second entity state model.

### 2.8 Application

Owns user-facing use cases:

```text
normalize input
→ call Domain logic/planner or Query
→ submit a legal mutation through Mutation
→ map result to UI-facing outcome
```

Application does not parse Markdown, call Vault APIs, write persistence directly, or hand-edit Runtime.

### 2.9 UI

Owns product composition and interaction/presentation:

- pages/workspaces;
- reusable entity components;
- interaction capabilities;
- primitives/patterns/design system;
- local drafts and continuous interaction state.

UI reads effective runtime/query state and emits Application intents. It does not call Vault/plugin-data persistence directly.

### 2.10 Obsidian adapters

Own host integration for:

- Vault file I/O;
- plugin data I/O;
- workspace/layout lifecycle;
- command/view registration;
- file events;
- native link/backlink lookup.

Adapters implement lower-level ports and do not own Trail business semantics.

### 2.11 Diagnostics, migration, performance

- **Diagnostics** owns development-only structured technical observability.
- **Migration** owns explicit breaking-schema upgrade workflows separate from normal product mutation.
- **Performance** owns benchmarks/profiling and evidence-driven optimization.

None of these becomes Canonical Domain history or a second persistence authority.

### 2.12 Composition root

`main.ts` is the only location allowed to know the whole dependency graph. It owns plugin lifecycle, dependency composition, and host registration only.

## 3. Owners & Capabilities

### 3.1 Domain planning

User intent is normalized before planning so unstable inputs such as command ID, timestamp, generated identity, or user-entered values are fixed once.

Conceptual planner contract:

```text
plan(planningState, command)
→ Ready(TrailMutationPlan)
  | NeedsInput(requiredInput)
  | Rejected(reason)
```

Planner is pure. It produces a complete legal logical state transition rather than a partial field patch that relies on a writer to discover business rules later.

`NeedsInput` is returned before creating an illegal optimistic state. Example: entering Completed without an Estimate requests the missing Estimate first.

### 3.2 Mutation Plan

The implementation-level plan represents one logical atomic intent across authoritative state:

```text
commandId
intent metadata
preconditions
effects
affected scope
postconditions
```

Entity effects reduce to final-state operations:

```text
Create(Entity)
Replace(before → after)
Delete(Entity)
```

Configuration/workspace-state updates may use coarse-grained before→after replacement where update frequency is low.

`intent` supports diagnostics/semantic identification; persistence executors do not switch business behavior based on arbitrary intent strings.

### 3.3 Runtime projection

Effective planning/UI state is:

```text
Effective State
= Committed Runtime
+ ordered Pending Mutation Plans
```

Pending plans never mutate committed truth before authoritative persistence confirms them.

Local hover, drag pointer, selection, modal draft, resize, and animation state remains local UI state rather than entering the central Domain/Runtime overlay.

### 3.4 Structural/reference indexes

Runtime may materialize high-value stable indexes where they support referential integrity or real query hot paths, including:

```text
projectsByInitiativeId
milestonesByProjectId
issuesByProjectId
issuesByMilestoneId
issuesByCycleId
cyclesByIssueId
currentCycleId
entityRefsByLabelId
entityRefsByStatusDefinitionId
labelUsageCount
statusDefinitionsByCategory
labelGroupsByEntityType
```

Not every field gets an index. Derived caches are added only when profiling/consumers justify them.

### 3.5 Source ownership

Runtime maintains logical source ownership separately from entity state and parser offsets:

```text
entity → authoritative source path
source path → entity refs/contribution
```

This supports physical placement decisions, source reconcile, and fault scoping without leaking Markdown range/fingerprint metadata into canonical runtime entities.

### 3.6 Source repositories

Domain Markdown repositories combine SourceIO, explicit codecs, current schema, and structural mechanisms. They own latest-snapshot processing and return parsed authoritative results.

Application/Feature code does not duplicate `Vault.process → reread → parse → validate` stacks.

Weekly Note uses a separate utility-source repository because it is not Domain Data, while still reusing appropriate Markdown/source I/O mechanisms.

### 3.7 Shared UI capabilities

Generic interaction/rendering mechanisms should be shared when multiple behaviors need them, for example:

- Button/IconButton;
- Input/lightweight editor;
- Tooltip/Popover;
- Context Menu/Dropdown;
- Dialog/Modal;
- Property Picker;
- Peek;
- Command Menu;
- IssueCard/IssueRow;
- ProjectRow;
- LabelChip;
- BoardColumn/Swimlane;
- optional long-list virtualization.

Shared primitives provide interaction/accessibility mechanics. Product-specific candidates and rules remain in Query/Application/Domain rather than becoming a giant generic component API.

### 3.8 UI shell, host reuse, and surface ownership

Trail's UI shell follows a host-first placement rule:

```text
Obsidian/browser native capability
→ existing Obsidian host surface/container
→ shared Trail primitive/pattern
→ page-local composition only when the responsibility is genuinely local
```

Trail does not build a parallel window, tab, sidebar, split, resize, or collapse system inside its main view when Obsidian already owns that mechanism. The top native window/tab chrome and Ribbon remain host-level UI. Trail contributes context-specific views into Obsidian's existing layout containers:

```text
Obsidian Host
├─ Window / Tabs          host-owned global workspace chrome
├─ Ribbon                 host-owned global/context entry rail
├─ Left Split             TrailNavigationView or normal Obsidian views
├─ Main Split             TrailView / ordinary Obsidian leaves
└─ Right Split            TrailInspectorView when persistent Details are shown
```

Entering Trail context should select/reveal Trail's left-sidebar navigation view rather than destroy, replace, or mutate the canonical state of File Explorer/Search/Bookmark/plugin views. Sidebar width, resize, and collapse remain Obsidian-owned. Trail-specific styling may hide or quiet redundant host controls while Trail is active, but presentation must not require destructive workspace-state rewrites to recover the user's normal Obsidian layout.

Trail-owned visual tokens are the canonical visual source for the Linear-inspired Dark presentation. Obsidian host skinning and Trail components map from the same token ownership rather than depending on each other's implementation variables:

```text
             Trail design tokens
              /               \
Obsidian semantic-variable map  Trail primitives/patterns
```

V1 implements the Dark presentation only. Token/component structure should remain theme-extensible without requiring a second light implementation or light-specific parallel component tree now.

The main Trail workspace has one reusable shell contract:

```text
TrailWorkspaceShell
├─ LocationBar
├─ optional ViewBar
└─ Content
```

`LocationBar` owns current location/breadcrumb and object-level actions. `ViewBar` owns collection presentation and collection actions. Its contract must allow compatible capability slots such as Filter, Group, Sort, Display, layout selection, and collection actions even when only a subset is implemented by the current consumer. Deferring a capability must not force a future shell or state-ownership rewrite; conversely, an unimplemented future capability does not justify building a generic view-builder framework now.

UI state ownership is orthogonal by responsibility:

```text
Navigation State       where am I?
Collection View State  how am I viewing this collection?
Inspector State        what persistent context is shown beside it?
Peek State             what am I temporarily previewing?
```

These are transient UI concerns, not Domain or authoritative Runtime facts. Navigation can be shared across separate Obsidian/React view roots so `TrailNavigationView` and the main `TrailView` consume one location owner. Collection presentation state is separate from navigation so List/Board and future filter/group/sort/display choices do not redefine location. Inspector and Peek targets are separate from both, allowing a Project board, an open Project Details inspector, and an Issue Peek to coexist without conflating selection or navigation.

Navigation locations should represent stable product locations rather than today's component tree, for example Home, Triage, Search, Projects Root, Initiative, Project, Cycles, and a Full Item location where supported. Components request navigation through a navigation capability instead of scattering page-specific `setState` chains, leaving a natural extension point for future host choices such as opening the same Full Item content in a new Obsidian tab or split.

Entity fields and actions are shared capabilities, while Peek, Inspector/Details, and Full Item View are separate surface compositions:

```text
shared entity/property/content/action capabilities
        ├─ Peek composition
        ├─ Inspector composition
        └─ Full Item composition
```

Shared capabilities include reusable property rows/pickers, title/description presentation, labels, status, priority, due, estimate, project/milestone relationships, and entity actions where semantically applicable. Surfaces select the subset and depth they need rather than cloning property behavior per page. Avoid a giant `UniversalEntityDetails` component with many booleans; reuse stable parts and let each surface own its composition.

Peek is a transient non-modal overlay that leaves the current workspace layout in place. Inspector is the persistent contextual side surface, with Obsidian's right split as the preferred host when appropriate. Full Item View is main-workspace content for deeper work and should remain host-agnostic enough that future tab/split hosting can reuse the same content. Focus/highlight, multi-selection, Peek target, Inspector target, and navigation location remain distinct interaction concepts.

## 4. Dependencies

### 4.1 Intended direction

```text
UI
↓
Application + Query
↓
Domain / Mutation / Runtime contracts
↓
Persistence contracts
↓
Markdown / Plugin-data mechanisms
↓
Host ports

Obsidian adapters implement host ports upward.
Composition Root assembles the graph.
```

### 4.2 Forbidden reverse dependencies

- Domain must not depend on Obsidian, React, Markdown parser, persistence implementation, Runtime Store, Source Sync, or UI.
- Semantic Planner must not depend on React, Vault API, Application orchestration, Persistence, Runtime, or mutation execution.
- Markdown must not depend on Persistence/Application/Runtime/UI.
- Persistence must not depend on Application/Query/Runtime/UI or Obsidian adapter implementation.
- Runtime must not depend on Markdown parser, Application, Source Sync, UI, or host APIs.
- Mutation must not depend on Application/UI/host adapters; execution uses Persistence contracts rather than Markdown internals.
- Query must not mutate persistence.
- Application must not directly parse Markdown or call raw persistence/host APIs.
- UI must not directly use Vault/plugin-data write mechanisms.

Architectural restrictions should be enforced through module shape, types, lint, and tests where practical rather than relying on documentation alone.

## 5. State & Flows

### 5.1 Runtime state

Runtime top level is conceptually:

```text
Runtime
├─ Committed
│  ├─ authoritative state
│  ├─ source ownership
│  └─ indexes
├─ ordered Pending plans
├─ Control
└─ Source Health
```

Control lifecycle:

```text
loading
ready
refreshing
read-only-error
```

- `loading`: initial authoritative build is not yet usable.
- `ready`: trustworthy state exists and normal mutation is open subject to source-health gating.
- `refreshing`: last-known-good committed state may remain viewable while mutation is paused.
- `read-only-error`: the system cannot safely write; trustworthy last-known-good state may still be displayed.

Source Health records logical Data Issues by reliable source scope and is not committed Domain state. Health-only changes do not imply a new Domain revision.

### 5.2 Read flow

```text
Markdown + plugin data
→ discovery/read
→ physical parse/field validation
→ canonical record assembly
→ Domain/reference/workspace validation
→ committed Runtime + ownership/indexes
→ effective Runtime
→ Query/selectors
→ UI
```

Cold full rebuild is valid V1 behavior. Normal Trail writes reconcile affected sources rather than requiring a full workspace scan on every mutation.

### 5.3 User write flow

```text
UI intent
→ Application use case
→ normalized command
→ pure Domain planning
→ Ready / NeedsInput / Rejected
→ optimistic pending projection
→ global serial Mutation Queue
→ dequeue-time physical materialization
→ authoritative persistence transaction
→ reread + parse + validate
→ Runtime/source-health reconcile
→ remove/settle pending plan
→ confirmed UI
```

The same semantic plan drives both optimistic projection and physical persistence outcome; UI and writer do not separately implement the same business rule.

### 5.4 Pending replay

New commands plan against Effective/Planning State, so later user actions observe earlier pending intent.

When a pending plan commits, committed state advances and remaining pending plans replay over the new base. If a plan fails, it is removed and later pending work is re-evaluated/replayed against the latest reliable committed state; work that is no longer legal is surfaced/canceled rather than force-applied.

Personal usage keeps pending depth small; V1 does not build a dependency graph scheduler.

### 5.5 Global serial queue

All authoritative mutation persistence uses one global serial queue.

This simplifies lost-update prevention, source transition ordering, refresh coordination, and reasoning in a single-user Markdown environment without sacrificing optimistic UI response.

### 5.6 Physical materialization at dequeue time

Semantic plans are created immediately for optimistic state. Physical transaction plans are materialized at dequeue time using the latest committed state, source ownership, and physical schema.

This allows earlier queued operations to establish source placement needed by later ones without a separate command dependency graph.

### 5.7 Persistence transaction topologies

V1 uses three known topologies rather than an arbitrary transaction DSL.

#### Single Transaction

One authoritative carrier changes, for example:

- Issue fields/status;
- Triage edit/defer/delete;
- ordinary Project/Initiative edits;
- Cycle record update;
- configuration/workspace-state replacement.

#### Source Transition

Physical placement changes or a target is established before destroying source state, including:

- Issue Project A → Project B;
- Projectless ↔ Project;
- Triage Accept;
- Triage Convert to Project.

Source Transition uses a data-loss-averse **destination-first (target-first)** order:

```text
1. read/validate latest source and target inputs
2. apply target operation
3. authoritative reread/verify target
4. apply source destructive operation
5. authoritative reread/verify source
6. reconcile resulting authoritative state
```

If source destruction fails after target success, one bounded compensation is attempted only when safety can be established. If safe compensation cannot complete, Trail stops guessing, rereads authoritative state, clears invalid optimism, and surfaces a partial/Data Issue. Detectable duplicate identity is preferred to silent loss.

#### Integrity Batch

Low-frequency multi-source/reference repair for operations such as:

- deleting/replacing a Label or StatusDefinition;
- deleting Initiative while preserving Projects;
- deleting Project while preserving Issues/projectless placement and clearing Milestones;
- deleting Issue while removing Cycle membership;
- deleting Cycle while preserving Issues;
- other operations that must update related authoritative references together.

Integrity Batch uses a fixed ordered stage vocabulary rather than arbitrary operation ordering; empty stages are omitted:

```text
prepare
→ destructive
→ commit
```

- `prepare` may establish non-destructive Domain state required by the final result;
- `destructive` removes authoritative Domain carriers only after preparation has succeeded;
- `commit` is the final plugin-data cutover and occurs at most once.

When an Integrity Batch mixes Plugin Data with Domain repairs, materialization projects the ordered Domain effects before any I/O and proves each pre-commit Domain prefix remains legal under the currently committed Configuration/Workspace State; it then validates the final Plugin Data cutover. A mixed Configuration/Domain repair is therefore allowed only when the Entity repairs can first produce a state legal under both the old and new configuration, after which plugin data may commit last. If no safe staged bridge exists, the mutation is rejected before persistence rather than relying on write order or rollback to make an illegal prefix acceptable.

The executor validates this topology independently of the materializer, stops at the first failed operation, and reports the durable operation prefix that completed before the error. Existing Source Sync recovery then clears invalid optimism and rereads authoritative state. Integrity Batch does not add general rollback, recursive compensation, a transaction graph, or an all-or-nothing filesystem guarantee. For destination-first destructive flows such as Project deletion, a detectable duplicate/error prefix remains preferable to silent source loss when a later destructive step fails.

### 5.8 Placement resolution

Logical relationships map to physical placement:

```text
Initiative                      → Initiatives/<sequence> <title>.md
Project                         → Projects/<sequence> <title>.md
Milestone                       → owning Project source
Triage Issue                    → Collections/Triage.md
Workflow Issue + Project        → owning Project source
Workflow Issue + no Project     → Collections/Projectless Issues.md
Cycle                           → Collections/Cycles.md
```

Existing entities prefer current source ownership. New file-backed Initiative/Project paths use a small allocator based on valid current sequences and readable sanitized title suffixes.

Entity→source placement is distinct from locating record source ranges inside a source.

### 5.9 Bootstrap

After Obsidian layout is ready:

```text
load plugin data
→ discover managed Domain sources
→ read / parse / validate
→ reference/workspace validation
→ build ownership + indexes
→ publish committed Runtime
→ ready
```

Fresh installation can explicitly bootstrap required managed structure. Missing required containers in an established Workspace are Data Issues, not silently replaced empty state.

### 5.10 External managed-persistence change

V1 uses one authoritative external refresh ingress:

```text
unexpected managed persistence event
→ refreshing / mutation pause
→ full authoritative reload
→ parse + validate
→ success: atomically replace committed state and return ready
→ failure: retain viewable last-known-good state when possible and enter read-only error
```

This avoids a parallel incremental event interpretation path. Finer affected-source refresh can replace the refresh strategy later if real evidence justifies it without changing the ownership model.

Trail-controlled writes register precise host-event suppression tokens so expected create/modify/delete/rename events do not recursively trigger unexpected refresh. Tokens are bounded by the active host write rather than a broad time-to-live window; late unmatched events may safely cause refresh instead of being silently ignored.

### 5.11 Data Issue and mutation availability

Validation preserves granular source/entity/configuration/workspace fault scope. Mutation availability policy may be coarser.

Current architecture permits source-scoped gating where ownership is reliable and global `read-only-error` when a trustworthy operational state cannot be established. Future policy refinements use the same `control + health + ownership` model rather than adding another availability state system.

### 5.12 Query flow

```text
Effective Runtime + temporal context
→ derived logic
→ structural narrowing
→ shared filter/sort/group/search helpers
→ page-specific selection
→ stable IDs / grouped IDs / small summaries
→ UI
```

V1 does not require a generic query engine or cost-based optimizer.

Useful default ordering semantics include:

```text
Triage: Due ascending
Backlog Workflow: Priority → createdAt → stable ID
Started/Active Workflow: Priority → firstStartedAt → stable ID
```

Project Board columns = Status. Current Cycle Board can use Status columns × Project swimlanes. Normal Label is primarily a filter facet; promoted dimensions such as Area may be curated grouping dimensions.

### 5.13 Continuous, discrete, and input interaction

- **Continuous**: scroll/drag/resize/hover animation remains local UI state; domain action occurs on committed interaction such as drop.
- **Discrete**: status/priority/complete/move/cycle actions emit semantic Application intents and may update optimistic state immediately.
- **Input**: typing remains local draft; Save/Enter emits one semantic mutation rather than writing every keystroke.

## 6. Quality Strategy

### 6.1 Verification ownership

Tests follow capability ownership:

```text
Domain / Planner
→ semantics, invariants, plans

Markdown Core / Codec / Schema
→ grammar, field mapping, canonical serialization

Persistence / Host Adapter
→ carrier I/O contracts

Runtime
→ projection, ownership, indexes, reconcile, replay

Mutation
→ queue/materialization/topology/execution boundaries

Source Sync
→ bootstrap, refresh, host-event convergence, source health

Application
→ use-case normalization/wiring and semantic outcomes

Query
→ derived/read behavior

UI
→ user interaction and presentation contracts

Real Obsidian
→ independent host-specific mechanisms and representative end-to-end evidence
```

Shared mechanism evidence is reused. Features test new semantics and independent risks rather than reproducing the same host/persistence failure matrix.

### 6.2 Reliability

Reliability work is proportional to real personal-local risk.

V1 protects strongly against:

- silent data loss;
- invalid overwrite;
- duplicate/ambiguous identity;
- unsafe cross-source destruction;
- writing with invalid authoritative configuration;
- optimistic state diverging silently from persistence.

V1 does not build recursive recovery state machines for low-probability multi-failure combinations. When reliable continuation cannot be established, authoritative reload and explicit read-only/Data Issue boundaries are preferred.

### 6.3 Observability

Development diagnostics trace command, planning, pending, queue, materialization, persistence, verification, reconcile, refresh, compensation, and errors through correlation identities.

Diagnostics are development-only, disabled/excluded in production builds, and must not affect product correctness or become Product History/Event Sourcing.

### 6.4 Performance

Default V1 strategy:

```text
YES full in-memory Runtime
YES full cold rebuild
YES affected-source normal reconcile
YES small structural/reference indexes
YES global serial mutation queue
YES on-demand selectors
YES ordinary React rendering
YES virtualization when long-list evidence requires it

NO persistent runtime cache initially
NO Web Worker initially
NO generic query dependency graph
NO materialized query cache engine
NO concurrent mutation scheduler
```

Performance changes are evidence-driven and must not create a second source of truth.

### 6.5 UI quality and accessibility

Trail uses a shared design-system ownership:

```text
Tokens
→ Primitives
→ Entity Components
→ Composite Patterns
→ Page Composition
```

Trail UI and any Obsidian shell-theme integration should share the same token ownership. Exact visual values remain replaceable implementation decisions unless they become product contracts.

Interactive primitives must support accessible focus-visible behavior, keyboard use where appropriate, clear disabled/selected/pending/error states, and restrained motion.

### 6.6 Reuse before build

For generic technical mechanisms prefer:

```text
Obsidian/browser native capability
→ mature focused library
→ thin Trail adapter
→ custom implementation when justified
```

Current library choice is an implementation concern; Architecture preserves the required capability/owner rather than freezing a package API unnecessarily.

### 6.7 Migration

Breaking schema migration is explicit and separated from normal optimistic mutation flow:

```text
preflight
→ migration plan
→ transform
→ full validation
→ current-schema runtime
```

Migration may reuse persistence, codecs, validation, and diagnostics, but does not justify long-term dual parser/version branches.

## 7. Target Structure

Trail's target architecture is a modular monolith with one active implementation and one canonical mechanism per responsibility.

```text
Obsidian Host
    ↑ adapters / ports

UI
    ↓ intents / reads
Application + Query
    ↓
Domain Logic + Mutation + Runtime
    ↓
Persistence
    ↓
Markdown / Plugin Data
```

The target preserves these structural properties:

- Domain remains technology-independent.
- Semantic planning remains pure.
- Persistence and physical Markdown remain below runtime/application concerns.
- Runtime distinguishes committed, optimistic, control, and health state.
- Source Sync owns convergence and external refresh.
- UI/pages compose reusable capabilities rather than each owning a private data stack.
- `main.ts` remains a thin composition root.
- Architecture-significant code locations are defined in `design-to-code-map.md`; current implementation gaps are defined only in `implementation.md`.

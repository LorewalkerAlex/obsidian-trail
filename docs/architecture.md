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
- Lifecycle/capability rules must be enforced centrally enough that a different UI surface cannot bypass them.

### 1.3 Scale

Trail is designed for long-lived personal data rather than enterprise throughput.

Useful conservative scale assumptions are:

```text
Initiatives          < 100
Projects             ~ 2,000
Issues               ~ 20,000–40,000; tests may reach 50,000
Cycles               ~ 260–300
Labels               ~ 200–300
Custom Views         small; normally < 10
Heavy Project        500–1,000 Issues
Large result list    thousands of Issues
```

Cold full rebuild is acceptable at personal scale. Daily mutations should primarily scale with affected sources/entities rather than full historical size. A long-lived Default Project may accumulate more Issues than an ordinary bounded Project, so its real carrier/query scale is benchmarked explicitly when evidence approaches or exceeds the current Heavy Project assumption rather than introducing a second storage model preemptively.

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
- legal Project/Issue lifecycle and relationship rules;
- reference/workspace validation;
- pure derived rules such as Project/Milestone Progress and explainable Attention inputs;
- pure semantic mutation planning.

Domain is independent of React, Obsidian, Markdown parsing, file paths/ranges, persistence implementations, runtime stores, and host APIs.

### 2.2 Markdown

Owns physical grammar and schema mechanisms:

- managed path definitions;
- structural Markdown operations;
- current Physical Schema Registry;
- explicit carrier codecs;
- parse/serialize field mapping.

Markdown does not own product behavior, runtime state, persistence orchestration, capability policy, or Obsidian API calls.

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
- effective Project/Issue capability projection;
- entity presentation/Inspector projection;
- Progress/Attention/Health inputs and other rebuildable summaries;
- source-health selection;
- structural narrowing;
- shared filter/sort/group/search helpers;
- page-specific selectors when product pages need them;
- Workspace Default Project resolution and legal-target candidate selection for consumers that need an initial Project choice.

Query does not mutate persistence, create a second entity state model, or turn a derived capability/score into authority.

### 2.8 Application

Owns user-facing use cases:

```text
normalize input
→ call Domain logic/planner or Query
→ submit a legal mutation through Mutation
→ map result to UI-facing outcome
```

Application accepts semantic intent such as `move issue`, `change project status`, `create workflow issue`, or `delete milestone`; it does not trust a UI-hidden/disabled control as the only guard. Workflow Issue creation/movement reaches Application with an explicit Project target; Application does not interpret an omitted Project as `Standalone` or another hidden fallback. It must route mutations through Domain planning/validation so the same rule applies from Board, Search, Full Item, Command Menu, keyboard actions, or future surfaces.

Application does not parse Markdown, call Vault APIs, write persistence directly, or hand-edit Runtime.

### 2.9 UI

Owns product composition and interaction/presentation:

- pages/workspaces;
- reusable entity components;
- capability-driven affordances;
- primitives/patterns/design system;
- local drafts and continuous interaction state.

UI reads effective runtime/query state and emits Application intents. It does not call Vault/plugin-data persistence directly and does not independently reimplement lifecycle legality with scattered `if project.status === ...` logic.

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
- **Migration** owns explicit breaking-schema/configuration upgrade workflows separate from normal product mutation.
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

Project lifecycle/capability constraints are planner-visible semantic rules. For example, a command cannot advance a Backlog Issue to Todo inside an Unstarted Project merely because one UI surface accidentally exposed that action.

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

The `Weekly Update.md` utility uses a separate utility-source repository because it is not Domain Data. That persistence backs the user-facing Weekly Meeting Notes module while reusing appropriate Markdown/source I/O mechanisms.

### 3.7 Effective entity capability projection

Effective capability is a read-side projection used to make every surface expose the same legal actions.

Conceptually:

```text
Effective Runtime
+ Project lifecycle category (when present)
+ Issue lifecycle category (when present)
+ relationship/context
+ source/control health when relevant
→ EffectiveCapabilities
```

Examples include:

```text
canCreateIssueInProject
canAcceptIssueIntoProject
canMoveIssueOut
canEditIssuePlanningFields
canAdvanceIssueStatus
canCancelIssue
canUseProjectBoard
canCreateMilestone
canEditMilestone
legalProjectStatusTargets
```

The projection may be represented as explicit capability fields/queries in implementation; it is not persisted Domain data.

Important rules:

- every Workflow Issue is evaluated inside one real owning Project; no Projectless capability branch exists;
- the Workspace Default Project is ordinary Project state plus a workspace reference, so its lifecycle, relationship, and child-work capabilities are the same as any other Project in the same lifecycle; the Workspace designation independently makes `Delete Project` unavailable while that reference is current;
- Unstarted Project enables Backlog planning but blocks execution advancement;
- Started Project enables normal planning + execution;
- Completed/Canceled Projects block normal new child work; Canceled unresolved work exposes cleanup actions such as Cancel/Move Out;
- Project Status transitions use legal destination sets rather than hard-coded UI names.

UI surfaces consume this result rather than each implementing their own lifecycle matrix. Domain/Application still enforce legality when an intent is submitted; capability projection is not a security/consistency boundary by itself.

### 3.8 Entity presentation projection

Inspector/summary rendering must be based on entity meaning rather than physical carrier shape.

Conceptually:

```text
Effective Runtime entity
+ inverse/current relationships
+ derived summaries
+ applicable capabilities
→ EntityPresentationProjection
```

This allows, for example:

- Project Inspector to show Progress/Attention not stored on Project;
- Issue Inspector to show current Cycle context although Cycle membership is physically stored by Cycle;
- UI to omit opaque IDs, Markdown source paths/ranges, raw metadata markers, or unhelpful lifecycle timestamps;
- storage direction to remain independent from presentation direction.

The projection is page/entity-specific enough to remain meaningful. Do not build a schema-driven universal Inspector that blindly renders every runtime field.

### 3.9 Shared UI capabilities

Trail UI uses a layered component system rather than page-local styling or one universal configurable component:

```text
Design tokens
→ Core primitives
→ Shared patterns
→ Trail semantic components
→ Page / shell composition
```

Representative capabilities include:

- **Core primitives** — Button/IconButton, Input/Textarea, Checkbox, Tooltip/Popover, Menu, Select/Combobox, Dialog, Separator, Kbd, Progress, and other generic interaction surfaces whose responsibility is proven independently of a specific pattern;
- **Layout selection** — belongs to View Bar/shared-pattern composition by default; promote a generic segmented-control primitive only if multiple real consumers prove one stable independent contract;
- **Shared patterns** — Surface, CollectionRow/Card foundations, Toolbar/View controls, PropertyControl shell, overlay/composer carriers, list/board foundations, and reusable focus/selection presentation;
- **Trail semantic components** — Status, Priority, Estimate, Due, Label, Project/Initiative identity, Milestone, IssueRow/IssueCard, ProjectRow, and semantic progress;
- **Cross-surface interactions** — Creation state, Filter state, Selection/Action Registry, Peek/Inspector targeting, Command/Context/Bulk orchestration, and keyboard dispatch;
- **Optional scale mechanisms** — long-list virtualization only when representative evidence requires it.

Core primitives own generic interaction/accessibility mechanics and expose small typed semantic variants such as `size`, `density`, or `variant`; they do not expose arbitrary low-level style knobs as their normal API. Patterns compose primitives around a stable UI responsibility. Semantic components bind Trail meaning to those lower layers. Pages choose composition and capability, not pixel geometry.

Reuse means moving stable mechanisms downward while leaving real semantic differences in the layer that owns them. Do not replace duplication with a giant component whose API is a matrix of booleans, arbitrary style props, or context-specific branches. Product-specific candidates and legality remain in Query/Application/Domain rather than leaking into generic primitives.

### 3.10 UI shell, host reuse, and surface ownership

Trail's UI shell follows a host-first placement rule:

```text
Obsidian native mechanics / host surface
→ browser semantic capability
→ already-adopted mature focused primitive when needed
→ shared Trail primitive/pattern
→ page-local composition only when the responsibility is genuinely local
```

Trail does not build a parallel window, tab, sidebar, split, resize, collapse, focus, menu, or drag mechanic when Obsidian, the browser, or an already-adopted focused primitive already owns that generic responsibility well. The top native window/tab chrome and Ribbon remain host-level UI. Trail contributes context-specific views into Obsidian's existing layout containers:

```text
Obsidian Host
├─ Window / Tabs          host-owned global workspace chrome
├─ Ribbon                 host-owned global/context entry rail
├─ Left Split             TrailNavigationView or normal Obsidian views
├─ Main Split             TrailView / ordinary Obsidian leaves
└─ Right Split            TrailInspectorView when persistent Details are shown
```

Entering Trail context should select/reveal Trail's left-sidebar navigation view rather than destroy, replace, or mutate the canonical state of File Explorer/Search/Bookmark/plugin views. Sidebar width, resize, and collapse remain Obsidian-owned. Presentation must not require destructive workspace-state rewrites to recover the user's normal Obsidian layout.

Trail's plugin lifecycle is the application-wide visual-state boundary. While the plugin is enabled/loaded, Trail may restyle Obsidian chrome, native views, menus, properties, editor/document surfaces, and Trail-owned UI so they consume one coherent presentation system even when the foreground leaf is not Trail. Disabling or unloading Trail removes that stylesheet ownership and returns presentation to the user's Obsidian theme; host mechanics and workspace state remain Obsidian-owned throughout.

Trail-owned visual tokens are the canonical visual source for the V1 Linear-derived Dark reconstruction. Current Linear evidence and host calibration feed one resolved token system; Obsidian host skinning and Trail components map from it rather than depending on each other's implementation variables:

```text
Current Linear reference + host calibration evidence
→ Trail reference anchors
→ Trail semantic design tokens
→ shared component visual contracts
   ├─ Obsidian semantic-variable map + targeted native consumers
   └─ Trail primitives / patterns / semantic components
```

V1 implements the Dark presentation only. Token/component structure should remain theme-extensible without requiring a second light implementation or light-specific parallel component tree now.

The main Trail workspace has one reusable shell contract:

```text
TrailWorkspaceShell
├─ LocationBar
├─ optional contextual disclosure
├─ optional ViewBar
└─ Content
```

`LocationBar` owns current location/breadcrumb and object-level actions. `ViewBar` owns collection presentation controls. Its contract allows compatible capability slots such as Filter, Group, Sort, Display, layout selection, and collection actions when the consumer actually supports them. A lifecycle capability can remove an unavailable layout without changing the underlying Project data projection.

UI state ownership is orthogonal by responsibility:

```text
Navigation State       where am I?
Collection View State  how am I viewing this collection?
Inspector State        what persistent context is shown beside it?
Peek State             what am I temporarily previewing?
```

These are transient UI concerns, not Domain or authoritative Runtime facts. Navigation can be shared across separate Obsidian/React view roots so `TrailNavigationView` and the main `TrailView` consume one location owner. Collection presentation state is separate from navigation so List/Board and future filter/group/sort/display choices do not redefine location. Inspector and Peek targets are separate from both, allowing a Project board, an open Project Details inspector, and an Issue Peek to coexist without conflating selection or navigation.

Navigation locations should represent stable product locations rather than today's component tree, for example Home, Triage, Search, Projects Root, Initiative, Project, Cycles, and a Full Item location where supported. The sidebar Default Project shortcut resolves its stable `defaultProjectId` and navigates to the ordinary `Project(projectId)` location; it does not introduce a second Standalone route or Project component tree. Components request navigation through a navigation capability instead of scattering page-specific `setState` chains, leaving a natural extension point for future host choices such as opening the same Full Item content in a new Obsidian tab or split.

Entity fields and actions are shared capabilities, while Peek, Inspector/Details, and Full Item View are separate surface compositions:

```text
shared entity/property/content/action capabilities
        ├─ Peek composition
        ├─ Inspector composition
        └─ Full Item composition
```

Shared capabilities include reusable property rows/pickers, title/description presentation, labels, status, priority, due, estimate, project/milestone relationships, and entity actions where semantically applicable. Surfaces select the subset and depth they need rather than cloning property behavior per page. Avoid a giant `UniversalEntityDetails` component with many booleans; reuse stable parts and let each surface own its composition.

Peek is a transient non-modal overlay that leaves the current workspace layout in place. Inspector is the persistent contextual side surface, with Obsidian's right split as the preferred host when appropriate. Full Item View is main-workspace content for deeper work and should remain host-agnostic enough that future tab/split hosting can reuse the same content. Focus/highlight, multi-selection, Peek target, Inspector target, and navigation location remain distinct interaction concepts.

### 3.11 Frontend implementation architecture

Trail's V1 frontend is React + TypeScript inside the Obsidian host, with CSS custom properties as the resolved visual-token interface, Zustand for genuinely shared transient UI state, Radix only where its focused headless mechanics materially reduce interaction/accessibility risk, and Pragmatic Drag and Drop for drag mechanics where the accepted product interaction requires it. Existing packages are capabilities to justify per use case, not a requirement to wrap every primitive in a library abstraction.

#### Visual authority and CSS ownership

Obsidian publishes one plugin `styles.css`, so V1 keeps one physical stylesheet entry point while enforcing explicit logical ownership inside it:

```text
1. design-token authority
2. Obsidian semantic-variable mapping
3. targeted native Obsidian consumers
4. Trail production component contracts
5. Trail shell carriers
6. Foundation Lab-only calibration specimens
```

A reusable visual fact belongs to the token/contract layer once. Consumers use semantic variables rather than copying raw colors, typography scales, radii, control sizes, state colors, or elevation values. Reusable component-specific geometry/state belongs to the Trail production component contract section; genuinely local composition geometry stays with its owning pattern/page. Calibration edits the owning token/consumer rule; it does not append a later override whose correctness depends on cascade history.

The stylesheet may use normal CSS specificity/state rules where the browser/Obsidian DOM requires them, but specificity and source order are not architectural ownership mechanisms. A later rule must not exist merely to repair an earlier competing answer for the same responsibility.

#### Component and dependency direction

Within `ui/`, dependencies should normally flow downward:

```text
design-system
    ↓
primitives
    ↓
patterns
    ↓
entities
    ↓
pages
    ↓
shell composition

interactions
→ headless/shared UI state and action mechanics consumed across patterns/entities/pages

foundation
→ development/calibration consumer only; production layers never depend on it
```

`primitives` do not know Trail Domain entities or page contexts. `patterns` know reusable interface responsibilities but not business legality. `entities` may bind effective Query/presentation meaning to lower UI layers. `pages` compose product scenarios. `shell` owns cross-location composition and host-facing Trail surfaces. `interactions` owns shared transient mechanics/state without becoming a second Domain/Runtime model.

#### Variants and composition

Stable presentation choices are expressed as small typed semantic variants such as `size="sm"`, `density="compact"`, or `variant="ghost"`. Those variants resolve to owned tokens/contracts. Production components should not normally accept arbitrary pixel/color/style props that let callers bypass the design system.

Structural variation uses React composition instead of widening one component with many unrelated booleans. For example, a CollectionRow owns row geometry/focus/selection mechanics, IssueRow owns Issue information hierarchy, and a Project/Cycle page decides which Issue metadata is useful in that context. This keeps reuse multi-level without creating a universal Card/Details component.

#### State locality

State lives at the smallest owner that needs its lifetime:

```text
Domain / authoritative facts          → Domain / Runtime / Query owners
cross-root or location-session UI     → focused shared Zustand owner
component draft / open state          → local React state or focused headless primitive
hover / focus-visible / pressed state → CSS / browser state
```

A shared store is not the default merely because Zustand is available. Purely visual state must not enter canonical Runtime, and component-local interaction state must not become a global UI store without a real cross-consumer lifetime requirement.

#### Responsive behavior

Responsive presentation is based on the actual Obsidian pane/container capacity. CSS layout, `minmax`, overflow ownership, and container queries are preferred when the change is visual only. React/host state participates only when available space changes product behavior that CSS cannot express, such as the resolved location-entry Inspector reveal decision. Window-width media queries are not the primary Trail workspace model because Obsidian splits can make a wide window contain a narrow Trail pane.

#### Accessibility and generic mechanics

Use semantic HTML and existing mechanics from Obsidian/browser/mature focused libraries before custom interaction code. Buttons remain buttons; navigation remains navigation; menus/dialogs/popovers must have coherent focus, keyboard, dismissal, disabled, and accessibility behavior. Trail reconstructs Linear presentation and interaction rhythm, not proprietary source/DOM structure.

#### Verification and guards

Frontend verification follows ownership:

- token/stylesheet guards protect single visual authority and Lab-only isolation where useful;
- primitive tests cover semantic variants, accessibility states, and generic interaction contracts;
- pattern/interaction tests cover shared focus, selection, menu/composer/filter/action behavior;
- semantic component tests cover Trail presentation contracts against Query/capability inputs;
- page tests cover composition and user workflows without re-proving lower-layer mechanics;
- representative real Obsidian validation covers host selectors, portal/focus behavior, pane/container response, drag/pointer behavior, and whole-application visual integration that jsdom cannot establish.

Architecture guards should make known invalid dependencies and migration-only identities difficult to reintroduce, while avoiding a speculative custom frontend framework.

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
- UI must not directly use Vault/plugin-data write mechanisms or become the only owner/enforcer of lifecycle legality.

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
→ Query/selectors/capabilities/presentation projections
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
- configuration/workspace-state replacement, including `workspace.setDefaultProject`.

#### Source Transition

Physical placement changes or a target is established before destroying source state, including:

- Issue Project A → Project B;
- Triage Accept into an explicit Project;
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

Target capability/relationship legality is resolved before physical movement. Source Transition never changes Issue Status merely to make a Project target acceptable unless the user invoked an explicit compound semantic command that says so.

If source destruction fails after target success, one bounded compensation is attempted only when safety can be established. If safe compensation cannot complete, Trail stops guessing, rereads authoritative state, clears invalid optimism, and surfaces a partial/Data Issue. Detectable duplicate identity is preferred to silent loss.

#### Integrity Batch

Low-frequency multi-source/reference repair for operations such as:

- deleting/replacing a Label or StatusDefinition;
- deleting Initiative while preserving Projects;
- deleting a non-Default Project while preserving child Issues by moving them to an explicit legal replacement Project and clearing old Milestone relations;
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

When an Integrity Batch mixes Plugin Data with Domain repairs, materialization projects the ordered Domain effects before any I/O and proves each pre-commit Domain prefix remains legal under the currently committed hard Domain/Configuration invariants; it then validates the final Plugin Data cutover. Required `workspaceState.defaultProjectId` is not part of Project Delete materialization: Domain planning rejects deleting the current Default Project before any physical plan exists. Changing the Default is the independent `workspace.setDefaultProject(B)` intent, persisted as an ordinary Workspace State Single Transaction. Only after that change commits may the former Default enter the normal Project Delete flow. Child Workflow Issue replacement remains an independent Project Delete concern and does not imply a Default change. No compound delete-plus-default cutover or new transaction topology is introduced. A mixed Configuration/Domain repair is otherwise allowed only when the Entity repairs can first produce a state legal under both the old and new hard configuration, after which plugin data may commit last. If no safe staged bridge exists, the mutation is rejected before persistence rather than relying on write order or rollback to make an illegal prefix acceptable.

The executor validates this topology independently of the materializer, stops at the first failed operation, and reports the durable operation prefix that completed before the error. Existing Source Sync recovery then clears invalid optimism and rereads authoritative state. Integrity Batch does not add general rollback, recursive compensation, a transaction graph, or an all-or-nothing filesystem guarantee. For destination-first destructive flows such as non-Default Project deletion with preserved child work, a detectable duplicate/error prefix remains preferable to silent source loss when a later destructive step fails.

### 5.8 Placement resolution

Logical relationships map to physical placement:

```text
Initiative                      → Initiatives/<sequence> <title>.md
Project                         → Projects/<sequence> <title>.md
Milestone                       → owning Project source
Triage Issue                    → Collections/Triage.md
Workflow Issue                  → owning Project source (Project relationship required)
Cycle                           → Collections/Cycles.md
```

Existing entities prefer current source ownership. Genuine fresh bootstrap reserves `Projects/0000 <title>.md` for its ordinary seed Project; renaming that seed preserves sequence `0000`. Other new file-backed Initiative/Project paths use the normal allocator based on valid current sequences and readable sanitized title suffixes, so the first ordinary Project after the seed is `0001`.

Entity→source placement is distinct from locating record source ranges inside a source.

### 5.9 Bootstrap

After Obsidian layout is ready:

```text
load plugin data
→ discover managed Domain sources
→ read / parse / validate source records
→ recover required Default Project reference when missing
→ reference/workspace validation
→ build ownership + indexes
→ publish committed Runtime
→ ready
```

Fresh installation explicitly bootstraps required managed structure and one ordinary Project seed titled `Standalone` at reserved path `Projects/0000 Standalone.md`, then stores that Project's stable ID as `workspaceState.defaultProjectId`. The seed uses the ordinary Project carrier, default Project-creation lifecycle semantics, and normal relationship/mutation rules; there is no Standalone source kind or lifecycle branch, and `0000` is not Default identity.

A physically missing persisted Default reference has one deliberately narrow initialization recovery path before normal ready Runtime is published. Source Sync inspects the Project carrier occupying reserved sequence `0000`: a valid ordinary Project carrier is adopted by stable ID regardless of its current readable title; when no `0000` carrier exists, recovery creates the standard `Projects/0000 Standalone.md` Project and persists its new stable ID; an existing invalid or otherwise untrusted `0000` carrier fails closed through the normal Data-Issue path rather than being overwritten. Query does not perform this recovery and does not manufacture an in-memory fallback after Trail is ready. The recovery is initialization-only: an external refresh that later observes a missing field, a dangling non-empty reference, or other invalid managed data uses normal validation/LKG/read-only handling rather than recovery.

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
→ derived rules / capabilities / presentation summaries
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

Project Board columns are concrete Issue StatusDefinitions and Board is exposed only for Started-category Projects. The Default Project follows exactly the same Board/List/lifecycle rules as every other Project. Current Cycle Board uses the same Status columns × Project swimlanes. Normal Label is primarily a filter facet; promoted dimensions such as Area may be curated grouping dimensions.

When a consumer needs an initial Project choice, Query resolves the required `workspaceState.defaultProjectId` against Effective Runtime and the same target-capability rules used for all Projects. UI preselects it only when legal for that specific operation; when the current Default is not legal, the user must choose another legal Project. Query never manufactures a fallback Project or silently changes Project/Issue lifecycle.

### 5.13 Continuous, discrete, and input interaction

- **Continuous**: scroll/drag/resize/hover animation remains local UI state; domain action occurs on committed interaction such as drop.
- **Discrete**: status/priority/complete/move/cycle actions emit semantic Application intents and may update optimistic state immediately.
- **Input**: typing remains local draft; Save/Enter emits one semantic mutation rather than writing every keystroke.

### 5.14 Runtime feedback boundary

Runtime owns `control`, ordered optimistic `pending`, and Source Health; UI owns how much of that state becomes visible. A Runtime transition does not require a one-to-one visual transition.

Normal local mutations remain optimistic and may be visually silent while their pending plans settle. `loading`, `refreshing`, or pending work is promoted to a lightweight user-visible state only when it lasts long enough to be perceptible/useful; the exact delay is a performance/UI calibration backed by representative local-Vault measurements rather than a new Runtime state or product constant.

Mutation failure removes invalid optimism and returns the UI to reliable committed/LKG state before the failure is presented. Source Health remains the persistent signal for Data Issues, while `read-only-error` remains the coarse fail-closed signal when safe mutation cannot continue. UI feedback must consume these existing mechanisms rather than adding a second save/sync/error state machine.

## 6. Quality Strategy

### 6.1 Verification ownership

Tests follow capability ownership:

```text
Domain / Planner
→ semantics, invariants, legal lifecycle transitions, plans

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
→ derived/read behavior, effective capabilities, presentation summaries

UI
→ user interaction and presentation contracts driven by capabilities

Real Obsidian
→ independent host-specific mechanisms and representative end-to-end evidence
```

Shared mechanism evidence is reused. Features test new semantics and independent risks rather than reproducing the same host/persistence failure matrix.

Project capability tests should exercise the category matrix at Domain/Query/Application boundaries so a surface-level test is not the only evidence that forbidden mutations stay forbidden.

### 6.2 Reliability

Reliability work is proportional to real personal-local risk.

V1 protects strongly against:

- silent data loss;
- invalid overwrite;
- duplicate/ambiguous identity;
- unsafe cross-source destruction;
- writing with invalid authoritative configuration;
- optimistic state diverging silently from persistence;
- UI surfaces bypassing lifecycle/relationship legality.

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

Trail uses the frontend ownership defined in Section 3.11:

```text
Design tokens
→ Core primitives
→ Shared patterns / interactions
→ Trail semantic components
→ Page / shell composition
```

Trail UI and Obsidian host-theme integration share the same resolved token ownership. Exact visual values remain replaceable implementation decisions unless they become product contracts. Typed semantic variants and composition are preferred over arbitrary style props or universal components.

Interactive primitives must support accessible focus-visible behavior, keyboard use where appropriate, clear disabled/selected/pending/error states, and restrained motion.

Capability-driven omission/disablement must still provide enough explanation for blocked high-value actions. For example, when a Completed-category Project Status is unavailable because open child Issues remain, the control should expose the blocking reason and a route to those Issues rather than presenting an unexplained dead control.

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

Breaking schema/configuration migration is explicit and separated from normal optimistic mutation flow:

```text
preflight
→ migration plan
→ transform
→ full validation
→ current-schema runtime
```

Migration may reuse persistence, codecs, validation, and diagnostics, but does not justify long-term dual parser/version branches.

The Project lifecycle change that removes Project Backlog from logical Status configuration is handled through this explicit configuration-evolution boundary if an existing workspace contains Project Backlog definitions/references.

The removal of Projectless Workflow uses the same explicit migration boundary. Migration moves every legacy Projectless Workflow Issue into a real ordinary Project with an explicit `projectId`, establishes/repairs `workspaceState.defaultProjectId` where the migration plan calls for it, validates the full graph, and only then removes the legacy Projectless source kind/path. Normal runtime does not retain dual Projectless/required-Project branches after migration.

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
- Query/Application expose shared effective capability and presentation projections so UI surfaces do not fork lifecycle logic.
- UI/pages compose reusable capabilities rather than each owning a private data stack.
- `main.ts` remains a thin composition root.
- Architecture-significant code locations are defined in `design-to-code-map.md`; current implementation gaps are defined only in `implementation.md`.

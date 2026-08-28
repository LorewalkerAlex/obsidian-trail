# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The verified public authority baseline used for this **V1 vocabulary / description normalization** is:

```text
2d34d29b919d8854015adab215dd2767a57659e8
docs: freeze v1 ui design
```

This is the pre-change authority baseline for the documentation cleanup recorded here, not a claim that `2d34d29...` must remain the repository HEAD after this documentation checkpoint is published.

The latest published repository checkpoint before this UI Reset execution-plan checkpoint is:

```text
2049ed14aaa00c501090fca64b553379eb2a4e7c
fix: align milestone progress semantics
```

Its immediate parent is:

```text
d55f5513b666e2ec909e91c39e20700b934937cd
feat: align cycle interaction semantics
```

The implementation baseline already contains the completed Project Lifecycle, Initiative/Project organization, Project Milestone, Cycle Planning, shared Project/Cycle Workflow presentation, Workflow Issue Peek & Planning Properties, Project Details Editing, Initiative Details Editing, Label Configuration & Management, Status Configuration & Management, Milestone Details Editing, Global Search, Home Routing and the Weekly Update utility, Weekly Update integrity hardening, Integrity Batch failure-safety hardening, Required Workflow Project & Default Project, Project Status Four-State Configuration Closure, Required Default Project ready-state alignment, Canonical Estimate Alignment, Workflow Issue Project-control Alignment, Cycle Interaction/Vocabulary Alignment, and Milestone Progress Semantic Alignment slices.

Historical checkpoint names such as **Cycle Planning & Rollover**, **Global Search & Project-less Workflow**, and **Home Routing & Weekly Note** are retained below as historical evidence. Their names describe the repository state at those checkpoints; they do not redefine current Product/Domain/UI vocabulary or target behavior.

Gate 1 - Domain / Validation Completion, Gate 2 - Semantic Planning Completion, Gate 3 - Data / Persistence / Mutation Operational Completion, Gate 4 - Runtime / Index Foundation Completion, Gate 5 - Query / Derived Foundation Completion, Gate 6 - Application Foundation Completion, and Gate 7 - Shared UI Capability Completion remain established foundations. Gate 8 now has the full V1 target interaction frozen across Project Workspace/Projects Root, Initiative Focus, Triage, Cycle, Creation Surface, simplified shared Filter, shared Selection/Action semantics, Home, Workspace Grid/responsive composition, global Search, Runtime/Data-Issue/optimistic feedback, and the Default Project setter. Canonical Estimate alignment is implemented across Domain, current-schema persistence, derived Cycle Effort, checked-in development data, and the existing Issue property/status surfaces: Issues store only fixed T-Shirt levels `S/M/L/XL`, while Workspace Configuration owns the live numeric aggregation weights. Workflow Issue Project-control is aligned across Planning/Application command contracts, legal target Query, List/Card/Cycle presentation, and Board DnD ownership so normal interaction no longer represents Projectless Workflow state. Cycle user-action semantics are aligned as well: Application/UI/diagnostics expose `Start Cycle`, `Close Cycle`, and optional explicit `Start next Cycle`; next-Cycle candidates are derived on demand from a closed prior Cycle plus current non-terminal Issue facts; no automatic rollover or unfinished-at-close snapshot state remains in the active interaction. Milestone Progress now follows the canonical `Completed / non-Canceled` rule at the derived Query owner: Canceled Issues contribute neither numerator nor denominator, empty effective scope is unavailable, and the Milestone presentation consumes completed/effective counts. The frozen Default Project lower-layer target is implemented as well. No remaining concrete lower-layer or frozen-design semantic mismatch is currently verified; the active gaps are formal UI implementation and explicitly deferred conveniences recorded in Section 4.4.

### 1.1 Historical implementation checkpoints

Important established checkpoints include:

- Effective Structural Query Foundation at `858a74f49d74ca61c875ad54d78f58b0202fbd07`;
- Canonical Derived Facts Foundation at `7cd07b638add1a7e7364f89c2fcc69d7cb2ed095`;
- Core Work Application Coverage at `df003d6d0152ed3f39cdee7fb7fdfd78a20c41d0`;
- Configuration Application Boundary at `6b3a9200b33b86843f59dfe848f496081b5b5b10`;
- Shared Overlay Interaction Foundation at `3d374ebab20b0120c879b215bacddf1cc64ffeaf`;
- Project Lifecycle Closure at `844728131f0a0acf7df4213322a7837c16b47dab`;
- Initiative Focus & Project Assignment at `4b5171e67c1dd483f3812a618d3386a3725204ae`;
- Project Milestone Management at `d775e94aacbb8e8970e72f7f2dc8e1cf9f9e2d7a`;
- Cycle Planning & Rollover at `826424ff673499d3aaef1669875db2719b1d9e5a`;
- Project / Cycle Board & List Interaction Foundation at `c87723486e95c2915ff02388540e2fd189010b63`;
- Workflow Issue Peek & Planning Properties at `afd7ff5743fcd3497bf1dbcdd6c4493025996e5e`;
- Project Details Editing at `982316b3adcbad23c42b4e487e111814c96895f8`;
- Initiative Details Editing at `f24879238a705605f7d125621c60c40e6062a3f2`;
- Label Configuration & Management at `f23aa36b6327759fecc872510ae6c5546577c73e`;
- Status Configuration & Management at `4ff7898e6add44b4d7dd7a441dda6d4543a94079`;
- Milestone Details Editing at `05a9aa25db09acb6c1c20e554435962efb567728`;
- Global Search & Project-less Workflow at `9aa3fcd5d1dff72954cd7d5fc95a844da0890d79`;
- Home Routing & Weekly Note at `0b41143ba40843e3858249a1825f513366d03a3b`;
- Weekly Note Integrity Hardening at `926c6ee7714c4171a91c53ead76848a325c321cf`;
- Integrity Batch Failure-Safety Hardening at `eb6d98fb28be81d8153aca0429705b05846499de`;
- Required Workflow Project & Default Project at `b88b671f1b7d7a81f931e70f052ed2d20fdd0fe4`;
- Project Status Four-State Configuration Closure at `b3b541b21d06af86b79f9bd718d9a317090596b0`.

The Global Search checkpoint is especially important to interpret correctly. At `9aa3f...`, the then-current Domain intentionally allowed `projectId: null`/absent Workflow Issues in `Trail/Collections/Projectless Issues.md`, and representative host validation proved that design worked. The newer Product/Domain baseline supersedes that **target model**, not the validity of the historical evidence. Search, Peek, cross-carrier movement, and the shared Markdown EOF fix established by that checkpoint remain reusable evidence; the Projectless state/carrier itself is absent from the current runtime target.

The historical Cycle checkpoints are interpreted the same way. `826424f...` and `c877234...` prove useful Cycle planning, membership, query, and shared Board/List mechanics. The current Product/Domain/UI Cycle closure supersedes any older user-facing automation or presentation that conflicts with the current target, including automatic-rollover assumptions, analytics-heavy presentation, or a Cycle-specific collection stack.

### 1.2 Published corrective-slice status

The canonical Product/Domain/Data chain establishes one global StatusCategory vocabulary with entity-specific applicability:

```text
StatusCategory vocabulary
-> Backlog | Unstarted | Started | Completed | Canceled

Issue applicability
-> Backlog | Unstarted | Started | Completed | Canceled

Project applicability
-> Unstarted | Started | Completed | Canceled
-> no Backlog
```

StatusCategory is the stable system semantic used for lifecycle rules. Concrete StatusDefinitions are the named statuses users see and configure. The V1 default user-facing Issue Statuses are `Backlog`, `Todo`, `In Progress`, `Done`, and `Canceled`; the V1 default user-facing Project Statuses are `Planned`, `In Progress`, `Completed`, and `Canceled`. Product/UI prose should use the concrete names when describing the default user experience and use StatusCategory names only when the rule itself is category-level.

The bounded **Project Status Four-State Configuration Closure** is implemented, verified, and published at `b3b541b21d06af86b79f9bd718d9a317090596b0`. One canonical entity-specific applicability drives the logical Configuration shape and the normal consumers of that shape instead of allowing each layer to invent a Project/Backlog exception.

The validated logical model gives Issue five Status category buckets and Project four. Project StatusDefinition values cannot carry Backlog in the validated logical Configuration. Default configuration creates nine StatusDefinitions total: five for Issue and four for Project.

Validation, current-schema Plugin Data parsing/serialization, Configuration Application mutations/canonical ordering, shared Status Query, Status Picker, and Obsidian Settings consume the same applicability. Current-schema Plugin Data rejects a Project Backlog bucket rather than treating it as a compatibility path. The checked-in development Plugin Data is aligned to Issue 5 / Project 4.

No production migration was introduced for this pre-V1 correction. If a future released schema requires retaining legacy Project Backlog data, Migration must own that explicit one-way transition rather than normal runtime validation or codecs accepting both shapes.

## 2. Objective

Complete the frozen V1 design by composing coherent user-value workflows over the established foundations.

The implementation consumes the established project answers:

```text
product.md
-> domain.md
-> data.md
-> architecture.md
-> ui.md
-> design-to-code-map.md
```

The active strategy is now foundation-first at the UI boundary while remaining dependency-aware below it:

```text
established canonical foundations
-> correct any newly exposed lower-layer divergence at its owner
-> remove legacy active presentation
-> establish accepted visual foundation + core primitives
-> establish shared semantic UI components / interaction mechanisms
-> compose coherent product workflows
-> focused verification
-> next workflow
```

A missing upper-layer feature must not cause a temporary lower-layer model, placeholder entity, compatibility path, fake default, or second mechanism. In particular, `Standalone` must not become a Project subtype merely because it is initially convenient as a default UI selection.

## 3. Reuse

Reuse existing canonical owners and mature external primitives where they remove well-understood interaction risk instead of rebuilding them per page.

Current reusable capability areas include:

- Domain model, rules, validation, and semantic planning;
- Project lifecycle and Project target-acceptance rules;
- Project Markdown carrier, including owned Milestones and Workflow Issues;
- Markdown schema/codecs and authoritative Persistence;
- shared Mutation materialization/execution and Source Sync;
- destination-first Source Transition and staged Integrity Batch safety;
- committed/effective Runtime, source ownership, reconciliation, and structural/reference indexes;
- shared structural and explicitly defined derived Query capabilities;
- independently reusable host/UI-neutral mechanisms only after explicit review; legacy page, shell, pattern, primitive, and CSS presentation is not reusable by default;
- existing Cycle record/persistence, `issuesByCycleId` / `cyclesByIssueId` / `currentCycleId` runtime indexes, Cycle application/planning operations, and shared Project/Cycle Board/List evidence;
- Configuration and Workspace State plugin-data persistence;
- Diagnostics and architecture guards.

The Default Project does not need a new Project codec, Project source kind, Domain subtype, lifecycle policy, query model, or workspace implementation. It reuses an ordinary Project plus a Workspace State reference and the normal Project route.

Status applicability likewise does not need a second Project Status subsystem. The shared StatusCategory vocabulary remains global; one canonical entity-specific applicability defines the legal subset consumed by Configuration, validation, persistence, Application, Query, and UI.

The formal V1 UI implementation does not migrate or incrementally restyle the current POC presentation. The active presentation layer starts from a clean UI tree and a new visual foundation; the current `plugin/src/ui/**` presentation and root `styles.css` are historical implementation evidence, not a framework to preserve.

Public commit `2049ed14aaa00c501090fca64b553379eb2a4e7c` is the durable archive boundary for that legacy presentation. Trail does not add an in-repository `archive/legacy-ui` tree: Git history preserves the old implementation without leaving dead presentation code in active search, lint, typecheck, or design reasoning.

Legacy code reuse is opt-in and evidence-driven. A pure helper, state model, host bridge, Application-facing contract, or independently useful interaction algorithm may be retained, relocated, or rewritten only after review shows that it carries no obsolete layout, styling, component hierarchy, or page-composition assumption. Existing JSX, CSS, page shells, rows/cards, dialogs, pickers, and other presentation components receive no reuse preference merely because they already exist.

Existing UI-oriented dependencies receive the same treatment. A package already used by the POC is not automatically part of the V1 stack; Radix, drag/drop utilities, or any other current dependency stays only when the new foundation or an accepted interaction requires it. Dependency choice follows the Architecture reuse order, not legacy lock-in.

The resolved Creation target makes reuse a first-order implementation constraint. Triage, Issue, Project, and Initiative creation must compose one shared Creation Composer shell and the same title/body, property picker/control, footer/action, focus, responsive, and capability-gating primitives. Entity/page code supplies only its field registry, legal prefills/defaults, and Application submit intent. Create/Edit may reuse these lower-level primitives without forcing both workflows into one universal surface. Existing inline/page-local title forms and the old row-local Triage Accept selectors are implementation evidence only and must not become parallel creation stacks.

Quick Capture is only a title-first Obsidian-wide entry into the standard Triage Composer. It performs no mutation before the full Composer's Create action. V1 deliberately does not add saved Drafts or Create-more. Home's creation affordance is one `+` menu over Triage/Issue/Project/Initiative; Projects Root keeps a Linear-style primary New Project affordance with secondary Initiative creation.

The resolved Triage target reuses the existing Triage Domain/Data carrier, standard Create Issue/Create Project use cases, Source Transition safety, the resolved shared Filter grammar, shared property primitives, and the resolved shared Selection/Action system. Triage page semantics, creation/Accept composition, its `Due / Priority / Labels` Filter registry, and its menu/selection/keyboard interaction authority are resolved. Triage does not justify a TriageItem entity, Triage-specific create form, Snooze state, second filter system, or page-specific command/Bulk model.

The resolved Cycle target reuses the existing Cycle Domain/Data carrier and runtime indexes plus the shared Workflow Issue collection. At the UI layer it consumes the single Filter grammar, List/Board mechanism, Issue Row/Card language, Selection/Action system, Project capability projection, and Inspector primitives established by the new foundation-first stack; this is target-level reuse across new consumers, not permission to preserve legacy POC components. Current/Historical Cycle use `Status / Project / Priority / Milestone / Labels / Due / Estimate`; Project Workspace intentionally has no Cycle Filter and instead marks Current Cycle membership on its Row/Card. Cycle does not justify an Issue-side `cycleId`, future-Cycle model, automatic cadence/rollover engine, Cycle-specific Status workflow, analytics snapshot history, per-membership timestamps, second Board/Filter implementation, or Cycle-local action registry.

The Home **Weekly Meeting Notes** module reuses the existing Trail-managed `Collections/Weekly Update.md` utility and utility-source persistence. `Weekly Meeting Notes` is the user-facing Home surface; `Weekly Update` is the backing utility/file name. Neither introduces a Domain entity.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 8 - Product Workspace Implementation**.

Required Workflow Project & Default Project and Project Status Four-State Configuration Closure are published implementation checkpoints. Project Workspace/Projects Root, Initiative Focus, Triage, Cycle, Creation Surface, simplified shared Filter, shared Selection/Action design, Home, Workspace Grid/responsive composition, Search, Runtime/Data-Issue/optimistic feedback, and the Default Project setter are now resolved at the target-design level, so Gate 8 may treat the V1 UI authority as frozen. The exposed lower-layer semantic corrections through Milestone Progress are closed. The next active implementation boundary is a deliberate UI Reset: remove the legacy POC presentation from the active tree while preserving a buildable Obsidian host bridge, then establish the new visual foundation before product-page composition. The remaining UI gaps are recorded in Section 4.4.

### 4.2 Required Workflow Project & Default Project slice

The prior corrective slice was published at `b88b671f1b7d7a81f931e70f052ed2d20fdd0fe4`.

#### Domain / validation

- Refactor Issue contracts so Triage and Workflow relationship requiredness is explicit rather than inherited from one optional shared base.
- Triage has no Project and no Milestone.
- Workflow Issue has required `projectId` and optional same-Project `milestoneId`.
- Workspace/reference validation rejects a Workflow Issue whose Project is missing or absent.
- Remove Projectless execution capability and Projectless Milestone special-case logic.
- Workflow create and Project move commands require an explicit Project target.
- Normal Project lifecycle/acceptance rules remain the only Project capability rules; Default Project status never bypasses them.

#### Workspace State / bootstrap

The following bullets record the **historical `b88...` implementation target**, not the current authority:

- add optional `defaultProjectId` to synchronized Workspace State;
- fresh bootstrap creates the normal default Configuration, then creates one ordinary Project titled `Standalone` at reserved physical sequence `0000` using normal Project creation/default Status semantics and stores its stable ID as `defaultProjectId`; `0000` belongs to the seed source rather than Default identity;
- the Project has no special field and may later be renamed, assigned to an Initiative, transitioned, completed, canceled, reopened, or deleted like any other Project;
- deleting the referenced Project clears `defaultProjectId`;
- established workspaces with an invalid dangling Default Project reference are Data Issues rather than silent auto-repair candidates.

The current Product/Domain/Data/UI authority and this lower-layer alignment supersede the optional/clear-on-delete parts of that historical target: normal ready Workspace State requires one Default Project; persisted/pre-ready Plugin Data may omit the field only as initialization recovery input; missing-only startup recovery adopts a valid Project carrier at reserved sequence `0000` regardless of readable title or creates `Projects/0000 Standalone.md` only when that carrier is absent; invalid reserved data, dangling references, and later missing-field refreshes fail through normal Data-Issue handling. The current Default is not deletable. `workspace.setDefaultProject` is an independent Workspace State mutation, after which the former Default may be deleted normally. The lower-layer Workspace Application setter now exists; the searchable Trail Settings control with no empty choice remains formal UI wiring work.

#### Data / persistence

Normal runtime removes:

```text
Trail/Collections/Projectless Issues.md
projectless-issues source kind
Projectless Issues codec
Projectless required singleton bootstrap/discovery
Projectless repository mutation branch
Workflow-without-Project placement branch
```

Every Workflow Issue is placed in the owning ordinary Project source. Triage stays in `Collections/Triage.md`; Cycles stay in `Collections/Cycles.md`.

The existing Project carrier already owns Project, Milestone, and Workflow Issue records and remains the one canonical carrier for the seeded `Standalone` Project.

#### Application / query / UI

- Triage Accept historically required a Project selection because the target was a Workflow Issue; the current UI design now chooses Issue or Project, and only the Issue branch keeps that requirement.
- Any context-less Workflow Issue create surface requires a Project selection.
- Query exposes legal Project target candidates and resolves the current Default Project as an initial candidate only when legal for the requested action.
- UI may preselect that candidate; Application/Domain receive the selected explicit Project ID.
- Project-local Workflow create preselects the current Project but the resolved Composer may let the user change it before submission; Application/Domain receive the final explicit selected Project ID.
- Issue move always means Project -> Project; `No Project` is not a legal target.
- The left Workspace section renders the referenced Default Project using its current Project title and routes to the normal Project Workspace.
- The same Project remains visible normally in Projects Root under its actual Initiative/`No Initiative` grouping.

The current alignment closes the remaining Project-control drift in this historical slice. Workflow create/move and the current Triage-Accept-to-Workflow path require an explicit Project through Planning and Application typed contracts; shared Query exposes only legal explicit move destinations while retaining the Issue's current Project as its selected relationship; the Workflow Issue row has no empty Project destination; and Card/Cycle/Board presentation uses `Project unavailable` only as fail-closed abnormal-data feedback rather than a normal Projectless state. Board Project swimlanes no longer construct a `projectless` group, and Board drag/drop metadata requires a concrete Project on both source and target.

#### Project delete

The historical `b88...` implementation first removed Projectless child-work behavior but still cleared `defaultProjectId` when deleting the current Default. Current authority and implementation now remove that behavior entirely.

Current behavior is two independent intents:

```text
Project A is current Default
-> Delete Project A is rejected
-> user chooses existing Project B through workspace.setDefaultProject(B)
-> Workspace State commits with Default = B

Delete former Default Project A
-> require explicit legal replacement Project C for preserved child Workflow Issues when needed
-> move preserved Workflow Issues to C
-> clear old Project-A Milestone relation on those Issues
-> remove Project-A Milestones
-> remove Project A
```

The child-work replacement is the only Project Delete replacement input. It is independent from the earlier Workspace Default change; B and C may happen to be the same Project when legal, but Project Delete neither infers nor mutates Default Project. No `replacementDefaultProjectId`, compound delete-plus-default intent, or new persistence transaction topology is introduced.

The existing destination-first Integrity Batch safety tradeoff remains for preserved child work: prepare preserved Issues at the destination before destructive source removal, and prefer detectable duplicate/error recovery over silent loss if a later destructive operation fails.

#### Migration / development data

This was a breaking current-schema replacement, not a permanent dual model.

If legacy persisted data must be retained, Migration owns a one-way transition:

```text
legacy Projectless Issues.md
-> choose/create one ordinary legal target Project
-> assign every legacy Workflow Issue to that Project
-> verify complete current graph
-> remove legacy Projectless carrier
-> normal runtime starts on current schema only
```

The checked-in repository `Trail/` tree remains disposable host-test observation data and may be updated to the current schema as part of implementation validation. It is not itself a production migration contract.

### 4.3 Project Status Four-State Configuration Closure

The corrective slice was published at `b3b541b21d06af86b79f9bd718d9a317090596b0`.

#### Canonical logical model

- Keep the global StatusCategory vocabulary at Backlog, Unstarted, Started, Completed, Canceled.
- Use one canonical entity-specific applicability: Issue uses all five categories; Project uses Unstarted, Started, Completed, Canceled.
- Model `workflowStatuses.issue` with five category configurations and `workflowStatuses.project` with four.
- Prevent a validated Project StatusDefinition from using Backlog without introducing a separate Project Status subsystem.
- Keep Issue-only workflow/board behavior on the full five-category vocabulary.

Default user-facing names are a separate presentation/configuration concern: Issue defaults are `Backlog / Todo / In Progress / Done / Canceled`; Project defaults are `Planned / In Progress / Completed / Canceled`.

#### Defaults / validation / persistence

- Fresh default Configuration creates five Issue StatusDefinitions and four Project StatusDefinitions.
- Configuration validation iterates only the applicable category set for each entity type and rejects invalid definition/entity/category relationships.
- Current Plugin Data requires exactly five Issue Status buckets and exactly four Project Status buckets.
- Current-schema parsing rejects Project Backlog as an unknown key; serialization emits no Project Backlog bucket.
- No legacy compatibility branch or automatic migration is added to normal runtime.

#### Application / Query / UI

- Configuration Application status creation, ordering, defaults, deletion, and canonicalization consume legal entity/category targets rather than accepting every global category for Project.
- Shared Status Query returns category groups from the canonical applicability.
- Status configuration UI may use StatusCategory as the fixed system grouping for concrete StatusDefinitions.
- Normal List/Board/Picker presentation uses concrete StatusDefinitions; it does not add a second category selection level merely because multiple concrete Statuses may share one category.
- Obsidian Settings generates only applicable status-category sections and routes mutations through the same legal target model.

#### Tests / development data

- Shared fixtures and Domain contract tests model Issue 5 / Project 4.
- Default Configuration, validation, codec, Configuration Application, Query, and Status Picker tests cover the four-category Project shape.
- Fresh bootstrap deterministic test IDs are aligned with nine default StatusDefinitions rather than the obsolete ten-definition sequence.
- Checked-in `.obsidian/plugins/trail/data.json` contains no Project Backlog bucket; existing Project Markdown references already point to legal Project statuses and require no status migration.

### 4.4 Current verified gaps

With V1 `ui.md` frozen and the earlier implementation checkpoints preserved as evidence, the remaining verified gaps are:

Canonical Estimate alignment, Workflow Issue Project-control alignment, Cycle interaction/vocabulary alignment, and Milestone Progress semantic alignment are no longer verified gaps. The current implementation uses fixed T-Shirt Estimate levels `S/M/L/XL` (`small/medium/large/xlarge`), required Workspace Configuration weights with V1 defaults `1/2/5/10`, current-schema enum persistence, live weighted Cycle Effort, and shared fixed-level Issue property/status controls. Workflow Issue create/move and the current Triage-Accept-to-Workflow path require an explicit Project through typed Planning/Application contracts; legal move targets come from shared capability-aware Query; normal Project controls expose no empty destination; and Card/Cycle/Board fallbacks treat an unavailable required Project as abnormal data rather than as a normal Projectless state. Cycle user-action boundaries expose `start()` / `Start Cycle` above Application while retaining `Open` only as Domain lifecycle terminology; explicit Close never starts another Cycle, and optional Start-next convenience derives current non-terminal candidates only from a closed source Cycle without persisting a rollover snapshot. Milestone Progress now exposes completed/effective counts over current Milestone membership, excludes Canceled Issues from both counts, and returns unavailable when no non-Canceled Issue remains. The remaining gaps are:

- **Default Project Settings/UI alignment gap** — the lower-layer required-Default contract is now aligned: canonical ready Workspace State requires `defaultProjectId`, persisted omission is restricted to initialization recovery, missing-only startup recovery uses the reserved sequence-`0000` Project carrier, external missing/dangling state fails closed, Project Delete rejects the current Default, and Workspace Application exposes the independent setter. Remaining V1 work is wiring the searchable Trail Settings control with no empty choice plus the current-Default Delete affordance/guidance to these contracts; UI must not reintroduce a delete-time replacement Default;
- **formal UI implementation gap** — replace the legacy POC presentation rather than aligning it in place. The new active UI stack must begin from a clean visual foundation and then implement Location/View Bars, shared Creation Composer, simplified Filter/session state, Selection/Action system, Project/Initiative/Triage/Cycle/Home/Search composition, Workspace Grid, Inspector/Peek ownership, Linear-like Runtime feedback, Default Project settings interaction, density, and responsive behavior without preserving legacy page/component/CSS structure as a compatibility constraint;
- **explicitly deferred conveniences** — Custom Views, Favorites, and the future Workspace Issues collection do not block the V1 implementation plan.

These are the remaining implementation gaps after the Milestone Progress semantic alignment slice. Canonical Estimate, Project-control, Cycle interaction, and Milestone Progress corrections are completed implementation evidence below; the remaining active work should continue through the frozen UI owners rather than by introducing page-local compatibility behavior.

Creation Surface design is resolved but **not claimed implemented**. Target UI uses one shared Linear-inspired Composer infrastructure for Triage, Workflow Issue, Project, and Initiative creation. Quick Capture is a title-first Obsidian-wide entry that opens the full Triage Composer before any mutation. Home has one `+` menu over Triage/Issue/Project/Initiative; Projects Root keeps a Linear-style primary New Project action and secondary Initiative creation. Issue Project is an explicit required relation that may be context-prefilled but remains editable; normal-width Issue creation directly exposes Priority/Labels/Milestone/Estimate/Due. Workflow Status and Cycle are absent from Issue creation, Project Status is absent from Project creation, and Initiative has no Status. V1 has no saved Draft/Create-more. Illegal creation and relation targets are capability-gated before normal completion where possible, while Domain/Application remain the final submit-time authority.

Simplified shared Filter design is resolved but **not claimed implemented**. One shared interaction owns `Filter -> Property -> Value(s)`, immediate application, one clause per property, discrete-value OR within a property, AND across properties, nullable `No ...` pseudo-values, and Due cutoff presets (`Overdue`, `Today`, `This week`, `This month`, optional `No due`, `Pick date...`). Applied clauses remain directly editable/clearable in the View Bar. State is location-scoped, session-only UI runtime state: it may survive navigation within one Trail session but is not canonical Runtime, Markdown, Plugin Data, Workspace State, or Custom View persistence. Project Workspace uses `Status / Priority / Milestone / Labels / Due / Estimate` with no Cycle Filter; Current Cycle membership is a compact default Row/Card marker there. Projects Root, Current/Historical Cycle, and Triage consume the registries frozen in `ui.md`.

Shared Selection/Action design is also resolved but **not claimed implemented**. Trail follows Linear's mature highlight/selection/context/command interaction grammar while keeping exact keybindings Trail-owned and Obsidian-conflict-aware. One shared Action Registry is consumed by Context Menu, Command Menu, overflow affordances, optional Bulk surfaces, and keyboard dispatch; those surfaces may expose different useful subsets without duplicating action semantics. Bulk is deliberately narrow and consumer-driven: it requires one common action + one common target, and target-bearing controls use the intersection of each selected item's ordinary legal targets. Milestone Bulk therefore requires a same-Project selection and a Milestone legal for every selected Issue. Selection remains transient UI state; no Bulk/Selection Domain entity or second legality model is introduced.

The current implementation diverges materially from the Creation target: Navigation Capture currently navigates to Triage rather than providing the title-first global launcher; Triage capture and several Project/Issue/Initiative create paths use old inline/title-only forms; Triage Accept still has old direct action/select plumbing; and current Application create methods expose narrower title-only command shapes before separate property edits. These are implementation gaps/evidence, not authority, and should be replaced through shared Composer/property primitives rather than preserved as parallel stacks.

Triage's page-specific target interaction is resolved: it is a Linear-inspired intake/review queue with all active entries browseable, a derived seven-day/minimum-10 Review Set, a narrow Filter registry over Due/Priority/Labels, constrained Display ordering, sequential Review Surface, Accept->Issue/Project using the normal creation flows with title/body prefill only, Defer as review-Due movement, and Delete rather than a persisted Discard concept. The shared Filter, Selection/Action, and cross-surface Runtime feedback grammars are resolved. This is **design authority**, not a claim that the current implementation already matches it.

Cycle's page-specific target interaction is also resolved. Current Cycle is a Cycle-owned `issueIds` scope over the shared Workflow Issue collection, defaults to the normal execution Board with Project swimlanes, supports the complete List, consumes the resolved shared Filter grammar with its Cycle property registry, keeps membership independent from Issue lifecycle/Project facts, and derives Progress/Effort from current member facts and configured Estimate weights. `Start Cycle`, `Close Cycle`, and `Start next Cycle` are explicit; there are no future Cycles, automatic cadence/rollover, Issue-side Cycle field, or history snapshots. Historical Cycle is final membership shown as a flat List over current Issue projections. Shared Selection/Action and cross-surface Runtime feedback semantics are resolved as well; no second Filter, command, or save-status grammar is needed.

Initiative Focus target composition is resolved. It is the standard Project collection scoped to one Initiative, reusing the Project Summary Row, Project actions, Selection, Filter, ordering, responsive behavior, and standard Project Composer. It is List-only, does not repeat Initiative grouping/filtering, does not expose Board/Timeline/Issue collection semantics, and uses the same lightweight narrative-context disclosure pattern as Project Workspace for the Initiative description. `New Project` prefills the current Initiative but leaves the relation editable. This is target design authority, not a claim that the current implementation already matches it.

Home target content/data semantics are resolved as a modular visual-first homepage. Work Pulse stays lightweight: Current Cycle period + Progress, Triage Overdue/Remain bars, and In Progress Project progress micro-bars. Personal modules are derived rather than persisted analytics: Lifecycle Activity Heatmap counts `createdAt`, `firstStartedAt`, and `terminalAt` events equally per day and uses one hue with intensity driven by total event count; Work Trend recomputes Backlog stock, Active stock, and daily Completed flow from the currently retained lifecycle timestamps; Temporal Orientation shows current date/week plus Triage Review Due and Workflow Issue Due markers; **Weekly Meeting Notes** is the user-facing Home module backed by the existing lightweight `Collections/Weekly Update.md` work-meeting utility with Current + Archive and only Open/Read, Edit Current, and Archive/Next behavior. Home introduces no Estimate weighting in the Heatmap, no daily snapshots, no activity log, no productivity score, no new weekly-note entity, and no hidden Home ranking model. Workspace Grid behavior is resolved at the interaction level: Home reflows modules according to actual Obsidian pane capacity while exact track count/spans, borders, and final compact-or-hide calibration remain implementation-time visual decisions.

Workspace Grid/responsive composition is resolved across the major surfaces. Obsidian owns sidebars/splits and therefore the Main View capacity; Trail has no one narrow global max width; Lists progressively reduce secondary metadata; Board/Timeline own their horizontal overflow; Full Item/Weekly Meeting Notes may use a comfortable inner content measure; Triage Review remains Main View UI and becomes focused when Queue+Review no longer fit side by side. Persistent Inspector is host-owned and only exists for stable primary-entity locations. On entry to an Inspector-capable Trail location, current Obsidian capacity decides whether Trail initially reveals its Inspector; after the location is active, user visibility changes and resize behavior are not automatically overridden. Returning to a location performs a fresh entry-time decision rather than restoring a persisted per-visit Inspector state.

Global Search target interaction is resolved. The Navigation-header Search action enters a focused Search location over Initiatives, Projects, Workflow Issues, and Triage entries. Results are grouped by entity kind; Project/Initiative results navigate normally, Workflow Issue results use the shared Peek before explicit Full Item open, and Triage results enter the normal Triage Review Surface. Search has no persistent Inspector and does not absorb ordinary Obsidian Vault-note search or introduce an advanced saved-query/filter model.

Runtime feedback target interaction is resolved. Normal local optimistic success is silent; fast loading/refresh/pending transitions do not automatically surface status UI; only sustained work uses a quiet Linear-like shell status, with reveal timing deferred to representative performance testing. Mutation failure rolls back failed optimism and uses concise transient error feedback. Data Issues and read-only states remain persistent only while unhealthy and preserve trustworthy LKG content where available; source-local repair may expose `Open source` without turning diagnostics into a product dashboard.

Default Project target interaction is resolved. Normal ready Workspace State requires one Default Project reference. The lower layer now implements missing-only initialization recovery through the reserved sequence-`0000` Project carrier, fails closed for invalid/dangling/later-missing state, exposes the independent Workspace setter, and rejects Project Delete while the target is current Default. Trail Settings still needs to wire one searchable Project replacement control with no empty option, and Project UI still needs to present the delete guard/guidance. These rules do not create a Standalone subtype, delete-time replacement argument, or lifecycle bypass.

Required Workflow Project & Default Project, the current Required Default Project ready-state lower-layer alignment, Project Status Four-State Configuration Closure, Canonical Estimate Alignment, Workflow Issue Project-control Alignment, Cycle Interaction/Vocabulary Alignment, Milestone Progress Semantic Alignment, Label Configuration & Management, Status Configuration & Management, Milestone Details Editing, Search mechanics, Home Routing/Weekly Update persistence, and Integrity Batch failure-safety are completed implementation evidence. The Projectless portion of the historical Search checkpoint remains superseded and no longer exists in normal runtime.

### 4.5 Next: UI Reset and foundation-first V1 implementation

The bounded V1 interaction design is complete and `ui.md` remains the presentation authority. Implementation now deliberately resets the active POC presentation instead of using it as the structural or visual base for V1.

The reset has four rules:

1. Git history, anchored by `2049ed14aaa00c501090fca64b553379eb2a4e7c`, is the archive for the legacy presentation; do not keep a second inactive UI tree in the repository.
2. Lower-layer Domain, Data, Mutation, Runtime, Query, and Application owners remain active foundations. UI-neutral host bridges or algorithms may survive only after explicit review.
3. Visual language is established before business-page composition. The reference order stays exactly as `ui.md` defines it: current Linear application UI, official current Linear material, transferable reference material such as `awesome-design-md`, then Obsidian host constraints and Trail-specific differences.
4. A later page may not skip a missing shared foundation by introducing a page-local duplicate component, Filter, action model, overlay stack, or styling vocabulary.

The executable V1 UI master checklist is:

- [ ] **1. UI Reset / clean active-tree scaffold**
  - remove legacy active presentation code and legacy CSS instead of moving it into an archive directory;
  - remove tests whose sole purpose is proving obsolete presentation, while retaining or relocating tests that protect independent mechanisms;
  - detach or rebuild host-adapter imports so the plugin remains buildable with one minimal new UI root;
  - retain no old page, shell, primitive, pattern, row/card, dialog, or CSS contract merely to ease migration.
- [ ] **2. Foundation Lab bootstrap**
  - expose one development/calibration surface inside the real Obsidian Trail view;
  - show visual tokens, typography, component states, overlays, and semantic micro-component examples without pretending that the Lab is a product location;
  - use representative fixture data only to make visual states reviewable.
- [ ] **3. Visual Foundation acceptance**
  - calibrate canvas/surface hierarchy, text hierarchy, accent and semantic colors, spacing, radius, hairlines/elevation, typography, icon sizing, focus/hover/pressed/disabled states, and restrained motion;
  - start from Linear's current visual grammar and transferable token families, but adapt values where real Obsidian host integration requires it;
  - obtain explicit visual acceptance in Obsidian before page composition depends on these tokens.
- [ ] **4. Core Primitive Kit**
  - Button/IconButton, Input/Textarea, Checkbox, segmented control, Badge/Tag, Tooltip, Popover, Menu, Select/Combobox, Dialog, Separator, Kbd, Progress, and common loading/disabled/destructive states;
  - prefer mature browser/Obsidian/Radix mechanics where they fit, wrapped by one Trail visual contract rather than page-local styling.
- [ ] **5. Trail semantic micro-components**
  - Status, Priority, Estimate, Project/Initiative identity, Milestone, Due, Label, property control, action item, filter clause, progress indicator, and stable entity-icon language;
  - keep one visual identity for each Domain concept across compact and expanded surfaces.
- [ ] **6. Full-shell Obsidian calibration**
  - validate Trail canvas, left navigation carrier, main view, overlay behavior, future Inspector surface, scrollbars, focus, typography, and pane-width behavior inside Obsidian Default Dark;
  - freeze shell-level visual thresholds only after real-host comparison rather than in isolated CSS.
- [ ] **7. Formal shell / navigation / collection framework**
  - implement Location Bar, optional Context disclosure, optional View Bar, navigation, content/overlay carriers, collection/list/grid foundations, and Inspector/Peek carrier ownership;
  - keep Obsidian responsible for tabs, splits, Ribbon, sidebar mechanics, and workspace chrome.
- [ ] **8. Product feature composition**
  - Projects Root and Initiative Focus;
  - Project Workspace plus Workflow Issue collection/List/Board/Milestone presentation;
  - shared Creation Composer, simplified Filter, Selection/Action Registry, Context/Command/overflow/Bulk/keyboard consumers;
  - Triage queue/review and Accept flows;
  - Current/Historical Cycles;
  - Home modules and Workspace Grid;
  - Search/deep navigation;
  - Default Project Settings selector and current-Default Delete guidance.
- [ ] **9. Visual / responsive / performance calibration**
  - tune final density, breakpoints, collection overflow, narrow-pane reduction, Inspector entry thresholds, and sustained-work feedback against representative real Obsidian use;
  - keep exact pixel values implementation-owned unless Product/UI authority explicitly promotes one to a contract.
- [ ] **10. V1 integration / hardening**
  - run complete workflow, keyboard/focus/accessibility, loading/error/Data-Issue, lifecycle/capability, navigation-continuity, and performance verification;
  - close documentation and representative host evidence only after one coherent active UI stack remains.

This checklist is dependency guidance, not a demand for ten giant commits. Each stage may be delivered through small coherent slices, but later slices consume the accepted foundations instead of forking them. Product-page assembly begins only after the visual foundation and core component language are stable enough that normal page work is primarily composition rather than repeated component redesign.

Custom Views and Favorites remain explicitly deferred. The future Workspace Issues collection remains deferred as well.

The working authority chain remains:

```text
Product responsibilities
-> Architecture ownership
-> Linear/Obsidian references where useful
-> Trail-specific resolved target in ui.md
-> Design-to-Code owner
-> implementation
```

## 5. Build Order

```text
1. Domain / Validation Foundation                        ESTABLISHED
   |
2. Semantic Planning Foundation                         ESTABLISHED
   |
3. Data / Persistence / Mutation Foundation             ESTABLISHED
   |
4. Runtime / Index Foundation                           ESTABLISHED
   |
5. Query / Derived Foundation                           ESTABLISHED
   |
6. Application Foundation                               ESTABLISHED
   |
7. Shared capability foundations                        ESTABLISHED
   |
8. Product Workspace / V1 UI Implementation             ACTIVE
   |- Lower-layer semantic corrections                  CLOSED THROUGH MILESTONE PROGRESS
   |- V1 UI interaction authority                       FROZEN
   |- Legacy POC presentation archive boundary          2049ed14
   |- UI Reset / clean active-tree scaffold              NEXT
   |- Foundation Lab bootstrap                          QUEUED
   |- Visual Foundation acceptance                      QUEUED
   |- Core Primitive Kit                                QUEUED
   |- Trail semantic micro-components                   QUEUED
   |- Full-shell Obsidian calibration                   QUEUED
   |- Shell / navigation / collection framework         QUEUED
   |- Product feature composition                       QUEUED
   |  |- Projects / Initiative Focus
   |  |- Project Workspace
   |  |- Creation + Filter + Selection / Actions
   |  |- Triage
   |  |- Cycles
   |  |- Home
   |  |- Search / deep navigation
   |  `- Default Project Settings / delete guidance
   |- Visual / responsive / performance calibration    QUEUED
   |- Custom Views / Favorites                          DEFERRED
   `- Formal V1 UI implementation closure               QUEUED
   |
9. V1 Integration / Hardening
```

Completed Gate 8 implementation slices at the current documented baseline include:

- Project Lifecycle Closure;
- Initiative Focus & Project Assignment;
- Project Milestone Management;
- Cycle Planning & Rollover **(historical implementation evidence; current Cycle target supersedes conflicting automation/presentation semantics)**;
- Project / Cycle Board & List Interaction Foundation;
- Workflow Issue Peek & Planning Properties;
- Project Details Editing;
- Initiative Details Editing;
- Label Configuration & Management;
- Status Configuration & Management;
- Milestone Details Editing;
- Global Search & Project-less Workflow **(historical checkpoint; Projectless target later superseded)**;
- Home Routing & Weekly Note **(historical checkpoint name; current user-facing module is Weekly Meeting Notes and the backing utility is Weekly Update)**;
- Required Workflow Project & Default Project **(historical slice; current required-Default ready-state target is stricter)**;
- Project Status Four-State Configuration Closure;
- Canonical Estimate Alignment;
- Workflow Issue Project-control Alignment;
- Cycle Interaction/Vocabulary Alignment;
- Milestone Progress Semantic Alignment **(current checkpoint)**.

Triage, broader Cycle page composition, Creation Surface, simplified shared Filter, shared Selection/Action, Initiative Focus, Home, Workspace Grid, Search, Runtime feedback, and the Default Project Settings/delete-affordance UI are not completed implementation slices merely because their target semantics are frozen. Their consumers still require formal implementation alignment. The bounded Cycle Start/Close/Start-next and Milestone Progress semantic corrections are completed. The Required Default Project ready-state lower layer, Canonical Estimate alignment, Workflow Issue Project-control alignment, Cycle interaction/vocabulary alignment, and Milestone Progress derived Query contract are completed foundations and should be consumed rather than re-modeled by those UI slices.

The historical UI-oriented checkpoints above remain evidence for capabilities they proved, but their active JSX/CSS presentation is intentionally not a V1 implementation foundation. When the UI Reset lands, Git history preserves those implementations while the active tree is allowed to become smaller before the new design-system stack grows.

A previously completed lower-layer owner may be edited during a later slice when an upstream canonical model changes. That does not create a second implementation track or erase earlier evidence.

## 6. Risk & Verification

### 6.1 Published Project Status Four-State evidence

The Project Status Four-State Configuration Closure at `b3b541b21d06af86b79f9bd718d9a317090596b0` verifies:

- the shared StatusCategory vocabulary remains five-category while canonical applicability is Issue 5 / Project 4;
- validated logical Configuration has no Project Backlog bucket and a Project StatusDefinition cannot use Backlog;
- fresh default Configuration creates nine StatusDefinitions total: five Issue plus four Project;
- validation and current-schema Plugin Data enforce the entity-specific category sets rather than requiring or accepting Project Backlog;
- Plugin Data serialization emits Issue five-category and Project four-category status configuration;
- Configuration Application, Query, Status Picker, and Obsidian Settings consume the canonical applicability rather than layer-local Project/Backlog special cases;
- Issue workflow presentation remains five-category;
- checked-in development Plugin Data is aligned to Issue 5 / Project 4;
- bootstrap deterministic ID expectations are aligned to the nine-definition default Configuration;
- focused fresh-bootstrap verification passes all 3 tests;
- full `npm run check` passes: ESLint is green, 105 Vitest files / 349 tests pass, TypeScript `tsc --noEmit` passes, and the production esbuild completes;
- full `git diff --check` passes after the final repair.

No production legacy-data migration was introduced for this pre-V1 correction. If legacy Project Backlog persistence must later be retained, Migration remains the explicit owner rather than broadening the current parser/serializer or validated logical model.

### 6.2 Published Required Workflow Project & Default Project evidence

The Required Workflow Project & Default Project slice at `b88b671f1b7d7a81f931e70f052ed2d20fdd0fe4` verifies the historical checkpoint state:

- Domain types/record validation cannot represent or accept committed Projectless Workflow Issue state;
- Triage cannot retain Project/Milestone relations;
- Workflow create requires an existing legal Project and starts in Backlog;
- the then-current Triage Accept flow required an explicit legal Project because its target was a Workflow Issue;
- context-less create/default selection resolves the Default Project only at Query/UI and submits an explicit ID;
- Default Project rename updates the sidebar label through Project identity rather than title lookup;
- Initiative assignment and lifecycle changes on the Default Project behave exactly like ordinary Project operations;
- that historical slice cleared the Workspace State reference when the Default Project was deleted;
- moving Issue Project A -> Project B preserves identity, clears invalid old Milestone relation, and has no valid Projectless destination;
- deleting a Project with child Issues requires a legal replacement Project and preserves those Issues;
- deleting a Project without child Issues does not invent a replacement requirement;
- normal source discovery/placement contains no Projectless source kind/path;
- fresh bootstrap produces Triage/Cycles + ordinary `Trail/Projects/0000 Standalone.md` + coherent `defaultProjectId`; ordinary subsequent Project allocation begins at `0001`;
- external edits/reload converge through existing Source Sync and source-health behavior;
- full `npm run check` and `git diff --check` passed before that checkpoint;
- representative real-Obsidian validation proved a real left-split Trail Navigation, navigation within one primary Trail tab, ordinary Default Project routing, title/filename rename with stable sequence `0000`, and Default resolution after plugin reload;
- the diagnostics-enabled host check was followed by a production `npm run build` so the generated bundle returned to production mode.

This evidence remains historical and valid for the mechanisms it proved. The current ready-state alignment now additionally requires and implements canonical required `defaultProjectId`, missing-only initialization recovery through the reserved sequence-`0000` carrier, fail-closed external/dangling handling, an independent Workspace Default setter, and rejection of Project Delete while the target is current Default. Local verification for this alignment is green across ESLint, 107 Vitest files / 359 tests, TypeScript `tsc --noEmit`, production esbuild, and `git diff --check`. The remaining Default Project alignment work is the frozen Settings/delete-affordance UI wiring in Section 4.4.

No production legacy-data migration was introduced for that pre-V1 corrective slice. The checked-in development Vault was aligned directly to the current schema for host evidence; if legacy user-data retention becomes required, the explicit one-way Migration contract above remains the owner.

### 6.3 Canonical Estimate alignment evidence

The Canonical Estimate alignment verifies:

- `TrailEstimate` is exactly the fixed canonical level set `small | medium | large | xlarge`, presented as `S / M / L / XL`;
- canonical Workspace Configuration requires one numeric weight for every fixed level, with V1 defaults `1 / 2 / 5 / 10`;
- Configuration validation rejects missing/unknown levels and non-positive or non-finite weights rather than inventing read-time defaults;
- current Markdown schema/codecs persist the stable Estimate keyword rather than a numeric Issue estimate, and normal current-schema parsing does not retain a dual numeric Estimate model;
- current Plugin Data physically persists required `estimateWeights`, while the existing validated `TrailConfigurationApplication.change()` / `replace-configuration` path remains the normal lower-layer mutation boundary for weight changes;
- changing weights never rewrites Issue Markdown or reinterprets the canonical T-Shirt level stored on an Issue;
- Issue command/planning/application paths consume the fixed Estimate type, and Completed Workflow Issues continue to require a present legal level;
- Cycle Effort is derived live from current Cycle membership, each present member Estimate, and the current configured weights; Status does not remove a member's present Estimate from Effort, while an absent Estimate contributes no weight;
- existing Workflow Issue Row/Card, Peek/property editing, and completion-gate surfaces use the fixed T-Shirt presentation/picker rather than numeric Estimate entry;
- checked-in development Plugin Data and Project Markdown fixtures are aligned to the current schema;
- local full verification is green across ESLint, 107 Vitest files / 364 tests, TypeScript `tsc --noEmit`, production esbuild, and `git diff --check`.

No production legacy-data migration or normal-runtime compatibility parser was introduced for the pre-V1 numeric Estimate shape. If a released legacy schema later requires retention, Migration owns that explicit one-way transition. The frozen shared Filter design still remains formal UI implementation work; this slice does not create a temporary page-local Filter or a one-off Estimate-weight Settings subsystem.

### 6.4 Workflow Issue Project-control alignment evidence

The current Workflow Issue Project-control alignment verifies:

- Workflow Issue create and Project-move command contracts require concrete `projectId` / `targetProjectId` values, so normal typed Planning intent no longer represents a missing Project and the planners retain final existence/status/capability validation;
- Issue Application `create()` and `moveToProject()` require explicit Project IDs and normalize those IDs before planning rather than accepting `undefined` as a normal intent;
- the current Triage Accept-to-Workflow path likewise requires an explicit Project through both Triage Application and Planning; the later shared Creation Composer may change the UI composition, but it must still submit one explicit legal Project for the Issue branch;
- diagnostics-observed Application wrappers expose the same required signatures instead of reintroducing optional Project values above Application;
- shared `selectTrailWorkflowIssueMoveProjectIds()` derives explicit move destinations from current readable Project/Issue Status capability, while preserving the Issue's current Project as the selected relationship even when that Project would not currently accept a moved-in Issue in the same state;
- the Workflow Issue row removes the empty `No Project` option and submits only IDs from the legal target Query; an unavailable required current Project is represented as disabled `Project unavailable` abnormal-data feedback rather than as a legal empty relation;
- Workflow Issue Card, Peek-related presentation, Cycle planning rows, and shared Board swimlanes no longer render/group missing Project as ordinary `No Project`/`projectless` state; unreadable required Project references fail closed as `Project unavailable`;
- Project swimlanes group only by concrete Workflow Issue `projectId`; the obsolete `projectless` lane is gone;
- Board drag/drop source and target metadata require concrete Project IDs, and runtime type guards reject Project-missing drag/drop records before Status-drop resolution; same-Board/same-Project Status semantics remain unchanged;
- focused tests cover legal Workflow move targets, current-Project retention, absence of the `No Project` option, and rejection of Project-missing DnD data; obsolete tests whose sole purpose was submitting a missing Project through typed Planning commands were removed rather than preserving an invalid contract;
- local full verification is green across ESLint, 107 Vitest files / 367 tests, TypeScript `tsc --noEmit`, production esbuild, and `git diff --check`.

This alignment does not weaken malformed-source handling or introduce a hidden fallback Project. Persistence/validation still owns invalid or dangling Project references as Data Issues, and formal Creation/Filter/Selection UI work must consume this required-Project contract rather than recreate optional Project semantics.

### 6.5 Cycle interaction/vocabulary alignment evidence

The current Cycle interaction/vocabulary alignment verifies:

- the UI-facing Cycle Application action is `start()` rather than `open()`, while Domain lifecycle/planning terminology deliberately retains `planOpenTrailCycle`, `isTrailCycleOpen`, and the logical mutation intent `planning.cycle.open`;
- `TrailUiActions`, diagnostics wrappers, and diagnostics telemetry consume the same user-action vocabulary, including `ui.cycle.start`, instead of reintroducing `open` above the Domain lifecycle boundary;
- the no-Current-Cycle interaction presents `Start Cycle`; explicit Close presents an optional `Start next Cycle` convenience rather than automatically creating another Cycle, and canceling that convenience returns to the ordinary Start flow;
- shared `selectTrailNextCycleCandidateIssueIds()` accepts only a closed source Cycle and derives its initial selection from that Cycle's final membership plus current readable Issue facts, excluding members that are currently terminal; no unfinished-at-close snapshot or rollover persistence is introduced;
- explicit Close submits only the Close mutation. Tests verify that no Start action is invoked by closing, while the optional next-Cycle flow remains editable and can be canceled;
- Cycle membership remains independent from Issue Status, Project, Milestone, or other Issue facts, and this bounded correction does not add future Cycle records, automatic cadence, Status coupling, or Cycle-local snapshot state;
- local full verification is green across ESLint, 107 Vitest files / 367 tests, TypeScript `tsc --noEmit`, production esbuild, and `git diff --check`.

The historical Cycle Planning & Rollover checkpoint at `826424ff673499d3aaef1669875db2719b1d9e5a` and Project / Cycle Board & List Interaction Foundation at `c87723486e95c2915ff02388540e2fd189010b63` remain useful evidence for established Cycle storage, planning/membership operations, current-Cycle lookup, Issue/Cycle runtime relationships, and shared Board/List mechanics. Their historical names do not restore a rollover product contract.

The resolved Cycle target still requires explicit membership changes, `Start Cycle`, `Close Cycle`, optional explicit `Start next Cycle`, no future Cycle objects, no automatic Status coupling, no automatic rollover, no analytics snapshot history, Current Cycle default Board with Project swimlanes, and flat List-only Historical Cycle presentation. This slice closes the active lifecycle-action/vocabulary mismatch; broader Filter/View/Selection/responsive Cycle page composition remains part of the formal UI implementation gap.

### 6.6 Milestone Progress semantic alignment evidence

The current Milestone Progress semantic alignment verifies:

- `selectTrailMilestoneProgress()` remains the canonical derived Query owner and now exposes `completedIssueCount` / `effectiveIssueCount` rather than terminal/total counts that conflate Completed and Canceled semantics;
- current Milestone membership is resolved through the existing runtime index and current readable Workflow Issue facts; no Milestone lifecycle, completion field, snapshot, or persisted progress value is introduced;
- Canceled Issues are excluded from both numerator and denominator, while only Completed Issues increment the completed count; Started, Unstarted, and Backlog Issues remain in the effective denominator without partial credit;
- if the effective non-Canceled Issue scope is empty, Progress is unavailable (`undefined`) rather than fabricated as 0% or 100%; missing Configuration, missing Milestone, malformed non-Workflow membership, or unresolved StatusDefinition continue to fail closed as unavailable;
- `TrailMilestoneRow` consumes the same completed/effective contract and presents `N of M Issues completed`; it no longer presents terminal counts as Milestone Progress;
- focused derived-query coverage includes a Canceled Issue that is actually assigned to the Milestone and verifies that `1 Completed + 1 Canceled` projects as `1 / 1`, while optimistic reopen and committed-refresh behavior remain covered;
- the existing Project page integration assertion is aligned to the completed wording without adding page-local progress logic;
- local full verification is green across ESLint, 107 Vitest files / 367 tests, TypeScript `tsc --noEmit`, production esbuild, and `git diff --check`.

This correction changes only derived semantics and their existing presentation consumer. It does not change Status lifecycle rules, Milestone membership, Issue persistence, Project/Cycle semantics, or introduce a generic Progress subsystem.

### 6.7 Historical evidence policy

Do not delete tests merely because their old Product scenario used Projectless or older Cycle composition if they still protect an independent mechanism such as:

- Markdown EOF record deletion;
- Source Transition failure ordering;
- Project-source placement/rename;
- Cycle membership persistence/index convergence;
- search ranking/discovery;
- Runtime reconciliation;
- Integrity Batch destination-first failure safety.

Rewrite or relocate scenario-specific assertions so the independent mechanism remains covered under the current Product/Domain model. Remove only tests whose sole purpose is validating an obsolete semantic contract.

The UI Reset follows the same evidence rule. Legacy UI tests that only assert obsolete page structure, wording, styling, or component composition may be removed with that presentation. A test that protects an independent Query/Application contract, host bridge, drag/drop rule, focus/portal behavior, mutation capability, or other still-valid mechanism must be retained, relocated, or rewritten at its canonical owner before the legacy UI file disappears.

### 6.8 General verification discipline

For each active Gate 8 slice:

- verify the current repository and concrete Product workflow before changing code;
- inspect legacy UI only as historical evidence or code-mining input after target behavior is resolved upstream; never treat its component tree or CSS as the migration baseline;
- reuse established Query/Application owners, while new shared UI owners are built once from the accepted foundation rather than inherited from legacy presentation by default;
- repair exposed lower-layer gaps at the canonical owner instead of Page-local workarounds;
- keep one active UI stack: do not retain legacy and replacement page/component/CSS systems in parallel beyond the smallest atomic reset transition;
- run focused tests for changed owners and directly affected shared owners while iterating;
- run one full `npm run check` at the coherent stable checkpoint;
- run `git diff --check` before checkpoint;
- keep dependency audit clean when dependency state changes or a security advisory is encountered;
- use representative real Obsidian validation when the slice changes host-specific, persistence, focus/portal, drag/pointer, keyboard, or other behavior that unit/jsdom tests cannot establish reliably;
- keep the diagnostics-enabled bundle loaded throughout interactive host verification and restore it after production checks.

## 7. Final State

V1 implementation is ready for final product hardening only after the frozen Product/Domain/Data/UI answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or Page-private reconstructions. The exposed lower-layer semantic corrections through Milestone Progress are closed. Before final hardening, the legacy POC presentation must leave the active implementation, one visually accepted foundation/primitives/semantic-component stack must replace it, and the remaining product locations plus Default Project Settings/delete guidance must be composed on that single stack. Cycle Start/Close/Start-next interaction/vocabulary, Milestone Progress semantics, the Required Default Project ready-state lower layer, Canonical Estimate alignment, and Workflow Issue Project-control legality are already closed.

The model must continue to contain no normal-runtime Projectless Workflow state; the Default Project remains an ordinary Project selected by required Workspace State, with only the independent current-Default Delete guard added by that designation; Status Configuration preserves the global semantic vocabulary while enforcing entity-specific applicability; normal UI presents concrete StatusDefinitions rather than exposing StatusCategory as a second interaction hierarchy; Filter state remains session-only UI state; Creation/Triage/Cycle composition reuses shared interaction/query/UI mechanisms without new authority models; the legacy POC presentation survives only in Git history rather than as a parallel active UI tree; deferred Custom Views/Favorites do not leak speculative implementation into V1; dependency gates are coherent; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the active construction stage, execution baseline, current verified gaps, build order, and verification evidence. Historical checkpoint behavior and names are retained as evidence even when a later upstream design decision supersedes their target semantics.

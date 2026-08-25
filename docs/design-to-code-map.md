# Trail Design-to-Code Map

## 1. System Map

Trail design flows from user-visible requirements to implementation through one traceable chain:

```text
Product behavior
→ Domain semantics / invariants
→ Data representation / authority
→ Architecture capability / flow
→ UI Design answer when presentation or interaction is involved
→ Canonical code owner
→ Owner-level verification
```

Representative mappings:

| Product behavior | Domain / Data basis | Architecture capability | Canonical code owner | Verification owner |
|---|---|---|---|---|
| Quick Capture creates Triage work | Triage Issue context + required review Due; no Project/Milestone | semantic create plan + single-source persistence | `domain/planning`, `application/triage`, shared mutation/persistence | planner + application + representative host |
| Triage review queue | Triage Issue + Due/Priority/Labels; Review Set is derived, not persisted | page selector + shared filter/sort + transient sequential review state | `query`, `ui/pages/triage`, shared `ui/interactions`/filter primitives | query + UI |
| Accept Triage | source Triage identity is replaced by a new standard Workflow Issue or Project; V1 auto-seeds title/body only; source removed only after target exists | target-kind choice + normal target create use case + destination-first Source Transition | `ui/pages/triage`, `application/triage`, `application/issues` / `application/projects`, shared mutation/source-sync | planner/application + transition/source-sync + representative host |
| Create Workflow Issue | Workflow Issue requires exactly one Project and begins in Backlog | explicit target Project + semantic create plan | `domain/planning`, `application/issues`, `query` where a default candidate is needed, shared mutation | planner + application/UI |
| Change Issue Status | StatusDefinition + lifecycle/Estimate + owning-Project capability invariants | Replace plan + Single Transaction | `domain/planning`, `application/issues`, shared mutation | planner + application/UI |
| Move Issue between Projects | stable Issue identity + required target Project + Milestone scope + placement integrity | legal-target selection + Source Transition | `domain/planning`, `application/issues`, `query`, `mutation` | planner + application + representative host |
| Default Project | Workspace State `defaultProjectId?` referencing an ordinary Project | bootstrap seed + reference resolution + normal Project navigation | `domain/model`, `source-sync/bootstrap`, `persistence/plugin-data`, `query`, `ui/shell` | workspace validation/bootstrap + query/navigation + representative host |
| Delete Project | child Workflow Issues require an explicit legal replacement Project; old Project Milestones removed; Default Project reference cleared when applicable | semantic multi-entity plan + Integrity Batch | `domain/planning`, `application/projects`, `query`, `mutation`, `source-sync` | planner + materialization/execution + representative host |
| Projects Root / Initiative Focus | Project→Initiative relation + derived summaries/activity; Initiative Focus final aggregate presentation still pending UI closure | Projects Root Project collection + pending multi-Project Initiative workspace composition | `query`, `ui/pages/projects`, reusable Project/Issue collection/filter/board/timeline components as the final consumer requires | query + UI |
| Project Workspace Board/List | same Project Issue set, Status presentation; Default Project is not a separate workspace kind | effective query + page presentation | `query`, `ui/pages/projects`, reusable board/entity components | query + UI |
| Milestone management | Project-scoped Milestone + same-Project Workflow Issue relation | semantic plans + same-source/Integrity operations | `domain/planning`, `application/milestones`, shared mutation | planner + application + UI |
| Initiative organization | Project→Initiative relation; derived Initiative progress | semantic plans + derived query | `domain/planning`, `application/initiatives`, `query` | planner + query + UI |
| Current Cycle Issue collection | Open Cycle `issueIds` + live Workflow Issue facts; Issue records have no Cycle field | Cycle selector + shared Issue Filter/List/Board presentation + runtime membership indexes | `query`, `ui/pages/cycles`, reusable `ui/entities` / `ui/interactions` | query + UI |
| Current Cycle membership | Open Cycle owns membership; membership is independent of Issue Status/Project/etc. | semantic add/remove plans + entry-point-specific candidate selectors | `domain/planning`, `application/cycles`, `query`, shared selection/context actions | planner + application + query/UI |
| Cycle lifecycle | at most one Open Cycle; explicit start/close; Closed membership frozen; next-Cycle candidates are derived from previous members' current non-terminal state | semantic plans + current-Cycle selector + candidate derivation | `domain/planning`, `application/cycles`, `query`, `ui/pages/cycles` | planner + application + query/UI |
| Cycle Progress / Effort | Progress uses Completed / non-Canceled current members; Effort sums present current member Estimates regardless of Status | reusable derived aggregation over Cycle membership | `query/derived`, `ui/pages/cycles`, Cycle Inspector composition | query + UI |
| Historical Cycle | Closed Cycle final `issueIds` + current live Workflow Issue fields; no Issue/Status/Estimate snapshot | closed-Cycle selectors + flat List projection | `query`, `ui/pages/cycles`, reusable Issue Row/filter primitives | query + UI |
| Labels and Status configuration | configuration definitions + reference integrity | configuration plans + Integrity Batch as needed | `domain/model`, `domain/validation`, `application/configuration`, `mutation` | validation + mutation + application |
| Home | derived facts from same Runtime | shared/page-specific selectors + modules | `query`, `ui/pages/home` | query + UI |
| External managed-file change | current physical schema + authoritative persistence | Refresh / source-health convergence | `source-sync`, `runtime`, adapters | source-sync + representative host |
| Legacy Projectless schema upgrade | old Projectless Workflow records → ordinary Project ownership | explicit one-way migration; no dual normal-runtime model | `migration` plus existing persistence/validation owners | migration + full graph validation + representative fixture |

Cycle UI does not introduce another work-item model, Board engine, Filter grammar, or snapshot subsystem. It composes the existing Cycle record and runtime membership indexes with shared Issue collection/query/UI capabilities. Cycle-level discovery may intentionally narrow candidates by entry-point context without turning that narrowing into a Domain membership invariant. The shared Filter owner is intentionally a simplified Trail interaction rather than a clone of Linear's advanced filter/view-builder capability.

Initiative Focus remains owned by the existing Projects/query/UI boundaries, but its final multi-Project working composition is part of the remaining V1 UI closure. No new domain or persistence model should be introduced merely to resolve that presentation. Custom Views and Favorites are deferred and therefore create no V1 implementation obligation until a later product/UI closure reactivates them.

A future Workspace Issues collection is intentionally not mapped as a V1 page. When introduced, it should query all Workflow Issues across real Projects and reuse the shared Issue collection/filter presentation; it must not reintroduce a Projectless state.

The table is traceability, not a duplicate feature specification. Product, Domain, Data, Architecture, and UI Design remain the authorities for their respective behavior, semantics, representation, mechanisms, presentation, and interaction answers.

## 2. Capability Map

### 2.1 Domain capabilities

| Capability | Inputs / dependencies | Owner |
|---|---|---|
| Core entity/config/workspace-state contracts, including `defaultProjectId?` | Product + Domain | `domain/model` |
| Value and state rules | Domain | `domain/rules` |
| Field/domain/reference/workspace validation | Domain + Configuration + Workspace State | `domain/validation` |
| Pure semantic mutation planning | validated planning state + normalized command | `domain/planning` |

Workflow Issue Project requiredness belongs to the Domain model/validation/planning owners. `Standalone` does not: it is the initial title of an ordinary bootstrapped Project, not a subtype or flag.

Triage's user-facing queue/review model does not create a new Domain entity. Domain continues to own the Triage-context Issue contract and the target-creation/source-removal semantics; UI/Query own Review Set, filtering, ordering presentation, and sequential review state.

Cycle membership likewise does not create an Issue-side Cycle property. Domain owns the Open/Closed Cycle lifecycle and Cycle-owned Workflow Issue membership; Query/UI own current/historical collection projection, candidate discovery, filtering, ordering, Progress/Effort presentation, and Board/List composition.

### 2.2 Persistence capabilities

| Capability | Inputs / dependencies | Owner |
|---|---|---|
| Managed path authority | Data persistence design | `markdown/schema/trail-paths.ts` |
| Physical field/schema registry | Data persistence design | `markdown/schema/trail-physical-schema.ts` |
| Shared Markdown structural operations | physical grammar | `markdown/core` |
| Source-specific codecs | schema + Markdown core + Domain record types | `markdown/codecs` |
| Source/plugin-data ports | architecture host boundary | `persistence/ports` |
| Authoritative Domain source repository | ports + codecs/schema | `persistence/domain-sources` |
| Plugin configuration/workspace-state repository | plugin-data port + Data contracts | `persistence/plugin-data` |
| Weekly Note persistence | utility source contract | `persistence/utility-sources` |

Normal runtime has no `Projectless Issues` path, source kind, codec, or repository branch. Every Workflow Issue is physically owned by its Project carrier.

Cycle persistence remains the existing Cycle record with `issueIds`; no Issue `cycleId`, Cycle analytics snapshot, per-membership timestamp, future-Cycle carrier, or second history store is introduced by the UI closure.

### 2.3 Mutation and runtime capabilities

| Capability | Inputs / dependencies | Owner |
|---|---|---|
| Logical Mutation Plan | Domain planner effects | `mutation/plans` |
| Command/pending coordination | Runtime + plan | `mutation/coordinator` |
| Global serial execution order | mutation work | `mutation/queue` |
| Placement resolution / physical materialization | plan + runtime ownership + Data schema | `mutation/physical` |
| Single / Source Transition / Integrity Batch execution | physical plan + Persistence | `mutation/execution` |
| Committed/effective runtime store | authoritative state + pending plans | `runtime/store`, `runtime/projection` |
| Source ownership | authoritative source contributions | `runtime/ownership` |
| Structural/reference indexes | committed authoritative data | `runtime/indexes` |
| Source contribution reconciliation | repository/source results | `runtime/reconcile` |
| Runtime lifecycle / source health | bootstrap/refresh/mutation outcomes | `runtime/control` + runtime health types |

### 2.4 Synchronization, query, and application capabilities

| Capability | Inputs / dependencies | Owner |
|---|---|---|
| Workspace bootstrap/discovery, including ordinary Default Project seed | Persistence + managed paths + default Configuration | `source-sync/bootstrap`, `source-sync/discovery` |
| Trail-write settlement/convergence | Persistence result + Runtime | `source-sync` |
| External authoritative refresh | managed host events + loader + Runtime | `source-sync/refresh` |
| Effective/query helpers | Runtime + temporal/config/workspace context | `query/shared` |
| Legal Project target/default-candidate selection | Effective Runtime + Workspace State + Project/Issue capability | `query` |
| Derived calculations | Domain facts + temporal/config context | `query/derived` |
| Product page selectors | shared query + product page needs | `query` page-specific modules |
| User use cases | Domain/Query/Mutation contracts | `application/<business-area>` |
| Create-time similarity guard | effective Runtime + text/relation signals | `application/similarity` plus query/helper logic |

Default selection is a UI/query concern. Application/Domain Workflow commands receive the explicit Project chosen for the operation rather than interpreting an absent Project as `Standalone`.

Triage Accept does not get a parallel create stack. The Triage surface selects the target kind and initializes the standard Issue/Project creation flow with title/body; normal target Application/Domain rules own the target draft/creation, while `application/triage` owns consuming the source only after successful target establishment.

Cycle candidate discovery is also a Query/UI concern. An Open Cycle may contain any Workflow Issue allowed by the Domain relationship; a Cycle-level Add selector may primarily surface non-terminal work from In Progress Projects, while Project-local actions can add Backlog work from a Not Started Project. Both routes submit the same explicit membership intent to `application/cycles`.

### 2.5 UI, host, and cross-cutting capabilities

| Capability | Inputs / dependencies | Owner |
|---|---|---|
| Product pages/workspaces | UI Design + Query + Application | `ui/pages` |
| Trail navigation + Default Project shortcut | UI Design + Workspace State/query + stable Project route | `ui/shell` |
| Stable entity presentation | UI Design + entity IDs + effective Runtime selection | `ui/entities` |
| Reusable interactions | UI Design + UI state + Application intents | `ui/interactions` |
| Reusable visual primitives/patterns | UI Design + design-system tokens | `ui/primitives`, `ui/patterns`, `ui/design-system` |
| Obsidian source/plugin-data/workspace/file-event bridge | Obsidian API | `adapters/obsidian` |
| Development technical observability | architecture events | `diagnostics` |
| Breaking schema upgrade | Data migration requirements + Persistence | `migration` |
| Benchmarks/profiling | representative corpus/workflows, including large long-lived Projects | `performance` |
| Whole-graph composition | all ports/capabilities | `main.ts` |

Shared mechanisms appear once in this map. A new feature consumes an existing capability unless it introduces a genuinely new mechanism.

## 3. Code Ownership Map

| Responsibility | Canonical owner | Must not be redefined in |
|---|---|---|
| Core Entity / Configuration / Workspace State shape | `plugin/src/domain/model/` | Markdown, UI, adapters |
| Workflow Issue Project requiredness and relationship invariants | `plugin/src/domain/model/`, `domain/validation/`, `domain/planning/` | UI defaults or Persistence placement |
| Pure domain/value rules | `plugin/src/domain/rules/` | UI or Persistence |
| Domain/reference/workspace validation | `plugin/src/domain/validation/` | codecs or feature services as duplicate business rules |
| Pure semantic planning | `plugin/src/domain/planning/` | Application or Persistence |
| Managed paths | `plugin/src/markdown/schema/trail-paths.ts` | feature code/adapters |
| Physical schema and canonical field order | `plugin/src/markdown/schema/trail-physical-schema.ts` | independent writers |
| Shared Markdown structure operations | `plugin/src/markdown/core/` | Application/Domain |
| Carrier grammar | `plugin/src/markdown/codecs/` | Domain/Persistence feature-specific parsers |
| Authoritative Domain source I/O/repository | `plugin/src/persistence/domain-sources/` | Application/UI |
| Plugin data repository | `plugin/src/persistence/plugin-data/` | UI/Settings direct save calls |
| Utility source persistence | `plugin/src/persistence/utility-sources/` | Domain runtime |
| Host-agnostic persistence ports | `plugin/src/persistence/ports/` | Domain |
| Mutation plan contract | `plugin/src/mutation/plans/` | feature-local plan types |
| Mutation coordination | `plugin/src/mutation/coordinator/` | page-local pending logic |
| Global queue | `plugin/src/mutation/queue/` | features/pages |
| Physical transaction materialization | `plugin/src/mutation/physical/` | Application/planner |
| Transaction execution | `plugin/src/mutation/execution/` | Markdown/Application |
| Committed Runtime | `plugin/src/runtime/store/` | pages/persistence |
| Optimistic projection | `plugin/src/runtime/projection/` | component-local entity truth |
| Reconciliation | `plugin/src/runtime/reconcile/` | feature-specific reread code |
| Source ownership | `plugin/src/runtime/ownership/` | parser metadata on entities |
| Runtime indexes | `plugin/src/runtime/indexes/` | UI caches as competing truth |
| Runtime control/source health | `plugin/src/runtime/control/` and runtime state | Application-specific lifecycle systems |
| Bootstrap/discovery/refresh/convergence | `plugin/src/source-sync/` | `main.ts` or feature services |
| Derived/shared/page read selection | `plugin/src/query/` | UI rebuilding persistence/index logic |
| Default Project resolution / legal default target candidate | `plugin/src/query/` | Domain Project subtype checks or title matching |
| Business use cases | `plugin/src/application/` | UI or persistence |
| Product composition | `plugin/src/ui/pages/` | Domain/Application |
| Navigation and stable Project shortcut routing | `plugin/src/ui/shell/` | Project entity model or persistence filenames |
| Entity components | `plugin/src/ui/entities/` | page-specific copies |
| Shared interactions | `plugin/src/ui/interactions/` | per-page duplicated command/selection mechanics |
| Visual primitives/patterns/design tokens | `plugin/src/ui/primitives/`, `patterns/`, `design-system/` | ad hoc per-page systems |
| Obsidian integration | `plugin/src/adapters/obsidian/` | Domain/Application/Runtime |
| Development diagnostics | `plugin/src/diagnostics/` | Product history |
| Legacy Projectless one-way upgrade | `plugin/src/migration/` | normal Runtime/Domain dual-model branches |
| Composition and host registration | `plugin/src/main.ts` | business logic or persistence policy |

Code ownership is target ownership, not an implementation-progress indicator. If a target directory is not yet present, the responsibility is still mapped there; `docs/implementation.md` records whether the capability is currently implemented.

## 4. Target Code Tree

```text
plugin/src/
├─ domain/
│  ├─ model/
│  ├─ validation/
│  ├─ planning/
│  └─ rules/
│
├─ application/
│  ├─ triage/
│  ├─ projects/
│  ├─ issues/
│  ├─ initiatives/
│  ├─ milestones/
│  ├─ cycles/
│  ├─ configuration/
│  ├─ workspace/
│  └─ similarity/
│
├─ markdown/
│  ├─ core/
│  ├─ schema/
│  │  ├─ trail-paths.ts
│  │  └─ trail-physical-schema.ts
│  └─ codecs/
│     ├─ trail-initiative-codec.ts
│     ├─ trail-project-codec.ts
│     ├─ trail-triage-codec.ts
│     └─ trail-cycles-codec.ts
│
├─ persistence/
│  ├─ domain-sources/
│  ├─ plugin-data/
│  ├─ utility-sources/
│  └─ ports/
│
├─ mutation/
│  ├─ plans/
│  ├─ coordinator/
│  ├─ queue/
│  ├─ physical/
│  └─ execution/
│
├─ runtime/
│  ├─ store/
│  ├─ projection/
│  ├─ reconcile/
│  ├─ ownership/
│  ├─ indexes/
│  └─ control/
│
├─ source-sync/
│  ├─ bootstrap/
│  ├─ discovery/
│  └─ refresh/
│
├─ query/
│  ├─ derived/
│  ├─ shared/
│  └─ page-specific selectors
│
├─ ui/
│  ├─ shell/
│  ├─ pages/
│  │  ├─ home/
│  │  ├─ projects/
│  │  ├─ triage/
│  │  └─ cycles/
│  ├─ entities/
│  ├─ interactions/
│  ├─ primitives/
│  ├─ patterns/
│  └─ design-system/
│
├─ adapters/
│  └─ obsidian/
│
├─ diagnostics/
├─ migration/
├─ performance/
└─ main.ts
```

A future Workspace Issues page belongs under `ui/pages` only when that deferred product surface is designed. Normal runtime does not retain `trail-projectless-issues-codec.ts` or another Projectless compatibility branch; any legacy reader needed for a one-way upgrade is scoped to `migration`.

The tree defines where established responsibilities belong. It is not a promise to create empty directories, placeholder services, compatibility facades, or speculative code before a capability is required by the dependency-ordered implementation plan.

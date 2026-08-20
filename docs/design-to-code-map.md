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
| Quick Capture creates Triage work | Triage Issue context + required Due | semantic create plan + single-source persistence | `domain/planning`, `application/triage`, shared mutation/persistence | planner + application + representative host |
| Accept Triage | new Workflow identity; source removed only after legal target exists | Source Transition | `domain/planning`, `application/triage`, `mutation`, `source-sync` | planner + transition/source-sync + representative host |
| Change Issue Status | StatusDefinition + lifecycle/Estimate invariants | Replace plan + Single Transaction | `domain/planning`, `application/issues`, shared mutation | planner + application/UI |
| Move Issue between Projects | stable Issue identity + Project/Milestone invariants + placement integrity | Source Transition | `domain/planning`, `application/issues`, `mutation` | planner + application + representative host |
| Project Board/List | same Project Issue set, Status presentation | effective query + page presentation | `query`, `ui/pages/projects`, reusable board/entity components | query + UI |
| Milestone management | Project-scoped Milestone + same-Project Issue relation | semantic plans + same-source/Integrity operations | `domain/planning`, `application/milestones`, shared mutation | planner + application + UI |
| Initiative organization | Project→Initiative relation; derived Initiative progress | semantic plans + derived query | `domain/planning`, `application/initiatives`, `query` | planner + query + UI |
| Current Cycle | open Cycle + Workflow Issue membership | semantic plans + Cycle selectors | `domain/planning`, `application/cycles`, `query`, `ui/pages/cycles` | planner + query + UI |
| Labels and Status configuration | configuration definitions + reference integrity | configuration plans + Integrity Batch as needed | `domain/model`, `domain/validation`, `application/configuration`, `mutation` | validation + mutation + application |
| Home | derived facts from same Runtime | shared/page-specific selectors + modules | `query`, `ui/pages/home` | query + UI |
| External managed-file change | current physical schema + authoritative persistence | Refresh / source-health convergence | `source-sync`, `runtime`, adapters | source-sync + representative host |

The table is traceability, not a duplicate feature specification. Product, Domain, Data, Architecture, and UI Design remain the authorities for their respective behavior, semantics, representation, mechanisms, presentation, and interaction answers.

## 2. Capability Map

### 2.1 Domain capabilities

| Capability | Inputs / dependencies | Owner |
|---|---|---|
| Core entity/config/workspace-state contracts | Product + Domain | `domain/model` |
| Value and state rules | Domain | `domain/rules` |
| Field/domain/reference/workspace validation | Domain + Configuration | `domain/validation` |
| Pure semantic mutation planning | validated planning state + normalized command | `domain/planning` |

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
| Workspace bootstrap/discovery | Persistence + managed paths | `source-sync/bootstrap`, `source-sync/discovery` |
| Trail-write settlement/convergence | Persistence result + Runtime | `source-sync` |
| External authoritative refresh | managed host events + loader + Runtime | `source-sync/refresh` |
| Effective/query helpers | Runtime + temporal/config context | `query/shared` |
| Derived calculations | Domain facts + temporal/config context | `query/derived` |
| Product page selectors | shared query + product page needs | `query` page-specific modules |
| User use cases | Domain/Query/Mutation contracts | `application/<business-area>` |
| Create-time similarity guard | effective Runtime + text/relation signals | `application/similarity` plus query/helper logic |

### 2.5 UI, host, and cross-cutting capabilities

| Capability | Inputs / dependencies | Owner |
|---|---|---|
| Product pages/workspaces | UI Design + Query + Application | `ui/pages` |
| Stable entity presentation | UI Design + entity IDs + effective Runtime selection | `ui/entities` |
| Reusable interactions | UI Design + UI state + Application intents | `ui/interactions` |
| Reusable visual primitives/patterns | UI Design + design-system tokens | `ui/primitives`, `ui/patterns`, `ui/design-system` |
| Obsidian source/plugin-data/workspace/file-event bridge | Obsidian API | `adapters/obsidian` |
| Development technical observability | architecture events | `diagnostics` |
| Breaking schema upgrade | Data migration requirements + Persistence | `migration` |
| Benchmarks/profiling | representative corpus/workflows | `performance` |
| Whole-graph composition | all ports/capabilities | `main.ts` |

Shared mechanisms appear once in this map. A new feature consumes an existing capability unless it introduces a genuinely new mechanism.

## 3. Code Ownership Map

| Responsibility | Canonical owner | Must not be redefined in |
|---|---|---|
| Core Entity / Configuration / Workspace State shape | `plugin/src/domain/model/` | Markdown, UI, adapters |
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
| Business use cases | `plugin/src/application/` | UI or persistence |
| Product composition | `plugin/src/ui/pages/` | Domain/Application |
| Entity components | `plugin/src/ui/entities/` | page-specific copies |
| Shared interactions | `plugin/src/ui/interactions/` | per-page duplicated command/selection mechanics |
| Visual primitives/patterns/design tokens | `plugin/src/ui/primitives/`, `patterns/`, `design-system/` | ad hoc per-page systems |
| Obsidian integration | `plugin/src/adapters/obsidian/` | Domain/Application/Runtime |
| Development diagnostics | `plugin/src/diagnostics/` | Product history |
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
│     ├─ trail-projectless-issues-codec.ts
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

The tree defines where established responsibilities belong. It is not a promise to create empty directories, placeholder services, compatibility facades, or speculative code before a capability is required by the dependency-ordered implementation plan.

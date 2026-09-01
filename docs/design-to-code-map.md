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
| Quick Capture creates Triage work | Triage Issue context + required review Due; no Project/Milestone | title-first UI draft → standard Triage Composer → normal semantic create plan; no mutation before Create | shared creation `ui/interactions` / `ui/patterns`, `application/triage`, `domain/planning`, shared mutation/persistence | UI interaction + planner + application + representative host |
| Standard creation surfaces | Existing Triage/Workflow Issue/Project/Initiative contracts and defaults; no new draft Domain entity | one shared Creation Composer shell + shared title/body/property controls + invocation prefill + capability-gated target selection | shared `ui/interactions`, `ui/patterns`, `ui/primitives`, page invocation owners, normal target Application modules | UI interaction + target application/planner + representative host where keyboard/focus requires it |
| Triage review queue | Triage Issue + Due/Priority/Labels; Review Set is derived, not persisted | page selector + shared filter/sort + transient sequential review state | `query`, `ui/pages/triage`, shared `ui/interactions`/filter primitives | query + UI |
| Accept Triage | source Triage identity is replaced by a new standard Workflow Issue or Project; Workflow target always has one explicit legal Project; V1 auto-seeds title/body only | target-kind choice + standard target Composer/use case + destination-first Source Transition | `ui/pages/triage`, shared creation `ui/interactions`, `application/triage`, `application/issues` / `application/projects`, shared mutation/source-sync | planner/application + UI + transition/source-sync + representative host |
| Create Workflow Issue | Workflow Issue requires exactly one Project and begins in Backlog | standard Issue Composer + explicit legal target Project + semantic create plan; context/default only prefill the final explicit selection | shared creation `ui/interactions`, `query`, `domain/planning`, `application/issues`, shared mutation | planner + application + UI |
| Create Project / Initiative | Existing entity contracts/defaults; Project uses configured Unstarted-category default; Initiative has no Status | standard entity Composer + optional context prefill + normal semantic create plan | shared creation `ui/interactions`, `application/projects` / `application/initiatives`, `domain/planning`, shared mutation | planner + application + UI |
| Change Issue Status | StatusDefinition + lifecycle/Estimate + owning-Project capability invariants | Replace plan + Single Transaction | `domain/planning`, `application/issues`, shared mutation | planner + application/UI |
| Move Issue between Projects | stable Issue identity + required target Project + Milestone scope + placement integrity | legal-target selection + Source Transition | `domain/planning`, `application/issues`, `query`, `mutation` | planner + application + representative host |
| Default Project | required normal-ready Workspace `defaultProjectId` referencing one ordinary Project; persisted pre-ready state may omit it only for narrow initialization recovery | fresh seed + reserved-sequence-`0000` missing-only startup recovery + independent `workspace.setDefaultProject` + normal Project navigation | `domain/model`, `domain/validation`, `domain/planning`, `application/workspace`, `source-sync/bootstrap`, `persistence/plugin-data`, `query`, `ui/shell`, Obsidian Settings adapter | workspace validation/bootstrap + setter planning/application + query/navigation/settings + representative host |
| Delete Project | current Default is not a legal delete target; otherwise child Workflow Issues require an explicit legal replacement Project and old Project Milestones are removed | current-Default planner guard + ordinary semantic Project Delete; child-work repair uses existing materialization/Integrity Batch without a Workspace State replacement | `domain/planning`, `application/projects`, `query`, `mutation`, `source-sync` | delete-guard planner + materialization/execution + representative host |
| Projects Root / Initiative Focus | Project→Initiative relation + derived Project summaries; Initiative Focus is the same Project collection scoped to one Initiative | Projects Root Project collection + Initiative-scoped List-only Project collection reusing Project Row/actions/filter/order | `query`, `ui/pages/projects`, reusable Project collection/row/filter components | query + UI |
| Project Workspace Board/List | same Project Issue set; UI groups/columns by concrete StatusDefinitions while StatusCategory remains the rule-level lifecycle semantic | effective query + page presentation | `query`, `ui/pages/projects`, reusable board/entity components | query + UI |
| Shared collection Filter | supported collection facts + location-scoped session-only UI Filter state; no persisted query/view object | shared property/value filter projection + reusable popover/applied-clause interaction; discrete values OR within a property, properties AND, Due uses cutoff semantics | `query`, shared `ui/interactions` / `ui/patterns`, page registry consumers | query semantics + shared UI interaction |
| Shared Selection / Action system | existing entity capabilities and Application intents; no Selection/Bulk Domain entity | transient selection + one Action Registry consumed by Context Menu, Command Menu, overflow, Bulk surfaces, and keyboard dispatch; Bulk target candidates are the intersection of ordinary legal targets | `query`, shared `ui/interactions` / `ui/patterns`, existing `application` use cases, Obsidian adapter for final keybinding integration | shared UI interaction + focused application + representative host for keyboard/focus |
| Estimate level / weight mapping | Issue Estimate target is fixed T-Shirt `S/M/L/XL`; Workspace Configuration maps levels to numeric weights, default `1/2/5/10` | canonical enum validation/persistence + configuration lookup + weighted derived aggregation | `domain/model`, `domain/validation`, `markdown/schema` / codecs, `persistence/plugin-data`, `query/derived`, shared property/filter UI | domain/data/config + derived query + UI |
| Milestone management | Project-scoped Milestone + same-Project Workflow Issue relation | semantic plans + same-source/Integrity operations | `domain/planning`, `application/milestones`, shared mutation | planner + application + UI |
| Milestone Progress | current associated Issues; Canceled excluded from numerator and denominator; Completed counts as complete | reusable derived aggregation | `query/derived`, `ui/entities` / Project Inspector composition | derived query + UI |
| Initiative organization | Project→Initiative relation; derived Initiative progress | semantic plans + derived query | `domain/planning`, `application/initiatives`, `query` | planner + query + UI |
| Current Cycle Issue collection | Open Cycle `issueIds` + live Workflow Issue facts; Issue records have no Cycle field | Cycle selector + shared Issue Filter/List/Board presentation + runtime membership indexes | `query`, `ui/pages/cycles`, reusable `ui/entities` / `ui/interactions` | query + UI |
| Current Cycle membership | Open Cycle owns membership; membership is independent of Issue Status/Project/etc. | semantic add/remove plans + entry-point-specific candidate selectors | `domain/planning`, `application/cycles`, `query`, shared selection/context actions | planner + application + query/UI |
| Cycle lifecycle | at most one Open Cycle; user actions are Start Cycle / Close Cycle / Start next Cycle; Closed membership frozen; next-Cycle candidates are derived from previous members' current open state | semantic plans + current-Cycle selector + next-Cycle candidate selector | `domain/planning`, `application/cycles`, `query`, `ui/pages/cycles` | planner + application + query/UI |
| Cycle Progress / Effort | Progress uses Completed / non-Canceled current members; Effort sums the current configured weight of each present member T-Shirt Estimate regardless of Status | reusable derived aggregation over Cycle membership + Estimate weight Configuration | `query/derived`, `ui/pages/cycles`, Cycle Inspector composition | query + UI |
| Historical Cycle | Closed Cycle final `issueIds` + current live Workflow Issue fields; no Issue/Status/Estimate snapshot | closed-Cycle selectors + flat List projection | `query`, `ui/pages/cycles`, reusable Issue Row/filter primitives | query + UI |
| Labels and Status configuration | configuration definitions + reference integrity | configuration plans + Integrity Batch as needed | `domain/model`, `domain/validation`, `application/configuration`, `mutation` | validation + mutation + application |
| Home | current Runtime lifecycle timestamps, Project/Cycle/Triage summaries, Due facts, and existing Weekly Update utility; no new telemetry/snapshot Domain data | Home selectors for Work Pulse, lifecycle Heatmap, Work Trend, Temporal Orientation, Weekly Meeting Notes + shared `+` creation menu | `query`, `ui/pages/home`, `persistence/utility-sources`, shared creation `ui/interactions` | query + UI |
| Workspace Grid / responsive composition | presentation-only pane capacity and transient location-entry state; no new Domain/Data fact or persisted per-visit layout | Obsidian-owned sidebars/splits + Trail Workspace Frame/Page Composition + component-owned List/Board/Timeline/Home/Triage behavior; Inspector reveal is decided on location entry only | `ui/shell`, `ui/pages`, shared `ui/entities` / `ui/patterns`, `adapters/obsidian` for host side-view integration | shared UI + representative Obsidian host across pane/split/sidebar sizes |
| Global Search | existing Initiative/Project/Workflow Issue/Triage projections; no Search Domain entity or Vault-note ownership | Search location + grouped Query results + entity-specific activation through normal navigation, Workflow Issue Peek, or Triage Review | `query/search`, `ui/pages/search`, shared Peek/navigation interactions, `ui/shell` entry action | query + UI + representative keyboard/focus host |
| Runtime / Data-Issue feedback | existing Runtime `control`, optimistic `pending`, Source Health, and LKG committed state; no persisted feedback state | silent fast-path optimism + performance-delayed lightweight loading/saving/refreshing status + transient failure toast + persistent scoped Data-Issue/read-only warning | `runtime`, `query`, shared `ui/patterns` / `ui/interactions`, `ui/shell`, Obsidian adapter for `Open source` host action | runtime/query + shared UI + performance calibration + representative host |
| External managed-file change | current physical schema + authoritative persistence | Refresh / source-health convergence | `source-sync`, `runtime`, adapters | source-sync + representative host |
| Legacy Projectless schema upgrade | old Projectless Workflow records → ordinary Project ownership | explicit one-way migration; no dual normal-runtime model | `migration` plus existing persistence/validation owners | migration + full graph validation + representative fixture |

Creation does not introduce a second domain model or a page-specific stack. Triage, Issue, Project, and Initiative creation share one Composer infrastructure and the same lower-level property/menu/focus primitives; invocation context supplies only initial UI state and never bypasses canonical target legality. Quick Capture is only a title-first entry into the Triage Composer. V1 does not introduce a persisted Draft entity, Create-more semantics, or pre-Create mutation.

Cycle UI does not introduce another work-item model, Board engine, Filter grammar, or snapshot subsystem. It composes the existing Cycle record and runtime membership indexes with shared Issue collection/query/UI capabilities. User-visible actions use Start/Close/Start next terminology; Open/Closed remains the Domain/Data lifecycle state. Cycle-level discovery may intentionally narrow candidates by entry-point context without turning that narrowing into a Domain membership invariant.

The shared Filter grammar is resolved once across Projects Root, Project Workspace, Triage, Current Cycle, and Historical Cycle. Pages supply only their supported property registry and collection scope. Filter clauses are location-scoped session-only UI state, not canonical Runtime or persistence; Project Workspace does not add a redundant Cycle filter, and Current Cycle membership is surfaced there through the shared Row/Card marker instead. No consumer may reintroduce a page-local boolean builder, hidden quick-filter state, or persisted Filter object to implement this V1 behavior.

The shared Selection/Action system is resolved the same way: one transient selection model and one Action Registry feed Context Menu, Command Menu, overflow actions, optional Bulk surfaces, and keyboard dispatch. Presentation surfaces may expose different useful subsets, but they resolve the same Action IDs and ordinary Query/Application capabilities. Bulk adds no new Domain legality model: a selection may execute only a common action with a common target, and target-bearing controls use the intersection of each selected item's ordinary legal targets. Exact shortcut bindings remain host calibration so Obsidian conflicts do not leak into action semantics.

Initiative Focus, Home content, Workspace Grid/responsive composition, global Search, Runtime/Data-Issue/optimistic feedback, and the Default Project setter are frozen at the V1 target-interaction level. Runtime feedback consumes existing control/pending/health/LKG mechanisms and follows Linear's low-noise grammar; the Default setter consumes the required Workspace reference and ordinary Project picker/navigation semantics. No closure introduces a new work-item subtype or second persistence authority. Custom Views and Favorites remain deferred and therefore create no V1 implementation obligation until a later product/UI closure reactivates them.

A future Workspace Issues collection is intentionally not mapped as a V1 page. When introduced, it should query all Workflow Issues across real Projects and reuse the shared Issue collection/filter presentation; it must not reintroduce a Projectless state.

The table is traceability, not a duplicate feature specification. Product, Domain, Data, Architecture, and UI Design remain the authorities for their respective behavior, semantics, representation, mechanisms, presentation, and interaction answers.

## 2. Capability Map

### 2.1 Domain capabilities

| Capability | Inputs / dependencies | Owner |
|---|---|---|
| Core entity/config/workspace-state contracts, including fixed Estimate target levels, Estimate weight Configuration target, and required normal-ready `defaultProjectId` | Product + Domain | `domain/model` |
| Value and state rules | Domain | `domain/rules` |
| Field/domain/reference/workspace validation | Domain + Configuration + Workspace State | `domain/validation` |
| Pure semantic mutation planning | validated planning state + normalized command | `domain/planning` |

Workflow Issue Project requiredness belongs to the Domain model/validation/planning owners. `Standalone` does not: it is the initial title of an ordinary bootstrapped Project, not a subtype or flag.

Creation UI state does not create a Draft Domain entity. Canonical entity creation still begins at the normal Application/Domain create boundary; the shared Composer only holds transient title/body/property selections until Create succeeds.

Triage's user-facing queue/review model does not create a new Domain entity. Domain continues to own the Triage-context Issue contract and the target-creation/source-removal semantics; UI/Query own Review Set, filtering, ordering presentation, and sequential review state.

Cycle membership likewise does not create an Issue-side Cycle property. Domain owns the Open/Closed Cycle lifecycle and Cycle-owned Workflow Issue membership; Query/UI own current/historical collection projection, next-Cycle candidate discovery, filtering, ordering, Progress/Effort presentation, and Board/List composition.

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
| Weekly Update utility persistence | utility source contract | `persistence/utility-sources` |

Normal runtime has no `Projectless Issues` path, source kind, codec, or repository branch. Every Workflow Issue is physically owned by its Project carrier.

Creation adds no draft persistence path. An unfinished Composer is UI state only and closing it writes nothing.

Filter adds no persistence path either. Active clauses live only in location-scoped UI session state; they are not written to Markdown, Plugin Data, Workspace State, Custom Views, or the committed/effective canonical Runtime store.

Issue persistence target stores the fixed Estimate level (`small | medium | large | xlarge`), while Plugin Configuration stores the numeric weight for each fixed level. A weight change does not rewrite Issue Markdown. Legacy numeric Estimate persistence, if retained, requires explicit one-way migration rather than dual normal-runtime parsing.

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
| Workspace bootstrap/discovery, including ordinary Default Project seed and missing-reference recovery through the reserved Project sequence `0000` carrier | Persistence + managed paths + default Configuration + Workspace State | `source-sync/bootstrap`, `source-sync/discovery` |
| Trail-write settlement/convergence | Persistence result + Runtime | `source-sync` |
| External authoritative refresh | managed host events + loader + Runtime | `source-sync/refresh` |
| Effective/query helpers | Runtime + temporal/config/workspace context | `query/shared` |
| Legal Project target/default-candidate selection | Effective Runtime + Workspace State + Project/Issue capability | `query` |
| Derived calculations, including Milestone Progress and target Estimate-weight/Home projections | Domain facts + temporal/config context | `query/derived` |
| Product page selectors | shared query + product page needs | `query` page-specific modules |
| User use cases | Domain/Query/Mutation contracts | `application/<business-area>` |
| Create-time similarity guard | effective Runtime + text/relation signals | `application/similarity` plus query/helper logic |

Default selection is a UI/query concern. Application/Domain Workflow commands receive the explicit Project chosen for the operation rather than interpreting an absent Project as `Standalone` or `No Project`.

The shared Composer consumes legal-target/default-candidate Query output rather than reimplementing capability rules. Project-local or Milestone-local invocation may prefill a relation; Home/context-neutral creation may prefill the legal Default Project; the final selected relation is still explicit. If Project changes, Project-scoped dependent choices such as an incompatible Milestone are cleared in UI state before submit.

Triage Accept does not get a parallel create stack. The Triage surface selects the target kind and initializes the standard Issue/Project Composer with title/body; normal target Application/Domain rules own target creation, while `application/triage` owns consuming the source only after successful target establishment. A Workflow target always receives an explicit Project ID.

Cycle candidate discovery is also a Query/UI concern. An Open Cycle may contain any Workflow Issue allowed by the Domain relationship; the target Query capability is a next-Cycle candidate selector for the Start-next convenience rather than a “rollover” product concept. The current rollover-named implementation is tracked as an alignment gap in `implementation.md`.

### 2.5 UI, host, and cross-cutting capabilities

| Capability | Inputs / dependencies | Owner |
|---|---|---|
| Product pages/workspaces | UI Design + Query + Application | `ui/pages` |
| Trail navigation + Default Project shortcut | UI Design + Workspace State/query + stable Project route | `ui/shell` |
| Foundation Lab / visual calibration harness | resolved design tokens + representative states; no product-location semantics | `ui/foundation` as development/calibration-only consumer |
| Design-token authority / host presentation mapping | current Linear reference + real-Obsidian calibration | canonical `plugin/styles/tokens.css`, `plugin/styles/obsidian-variables.css`, and `plugin/styles/obsidian-native.css`; generated plugin `styles.css` is delivery output only; future `ui/design-system` helpers only when TS ownership is actually needed |
| Workspace Frame / responsive page composition / location-entry Inspector reveal | UI Design + current Obsidian pane capacity + location capabilities | `ui/shell`, `ui/pages`, `adapters/obsidian`; CSS container queries/layout for visual-only response |
| Global Search surface and activation | UI Design + Search Query + normal navigation/Peek/Triage Review targets | `query/search`, `ui/pages/search`, shared `ui/patterns` / `ui/interactions`, `ui/shell` |
| Runtime loading/pending/failure/Data-Issue/read-only feedback | UI Design + Runtime control/pending/health + LKG Query + performance calibration | shared `ui/patterns` / `ui/interactions`, `ui/shell`, `query`, `performance`, Obsidian adapter where host actions are needed |
| Default Project Settings setter / current-Default delete guidance | UI Design + required Workspace reference + Project Query/picker + Workspace Application mutation + Project delete capability | Obsidian Settings adapter, shared Project Picker, `application/workspace`, `application/projects`, `query` |
| Stable entity presentation | UI Design + entity IDs + effective Runtime selection | `ui/entities` |
| Shared Creation Composer / transient create UI state | UI Design + Query capability/defaults + target Application intents | `ui/interactions`, `ui/patterns` |
| Shared collection Filter / location-scoped session state | UI Design + page registry + Query filter semantics | `ui/interactions`, `ui/patterns`, `query` |
| Shared compact PropertyControl shell | UI Design + caller-supplied semantic property content; no picker/Domain semantics | `ui/patterns/trail-property-control.tsx`, `plugin/styles/patterns.css` |
| Shared property pickers / semantic property grammar | UI Design + reusable entity property presentation + legal target/query semantics | `ui/entities`, `ui/interactions`, `ui/patterns`, `query` as required by the property |
| Shared selection/action registry, Context/Command/Bulk orchestration, shortcut dispatch | UI Design + transient selection state + Query capabilities + Application intents | `ui/interactions`, `ui/patterns`, `adapters/obsidian` for host binding |
| Reusable visual primitives/patterns | UI Design + design-system tokens | `ui/primitives`, `ui/patterns`, `ui/design-system` |
| Obsidian source/plugin-data/workspace/file-event bridge | Obsidian API | `adapters/obsidian` |
| Development technical observability | architecture events | `diagnostics` |
| Breaking schema upgrade | Data migration requirements + Persistence | `migration` |
| Benchmarks/profiling | representative corpus/workflows, including large long-lived Projects | `performance` |
| Whole-graph composition | all ports/capabilities | `main.ts` |

Shared mechanisms appear once in this map. A new feature consumes an existing capability unless it introduces a genuinely new mechanism. In particular, page-local create forms must not duplicate the shared Composer/property stack.

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
| Weekly Update utility persistence | `plugin/src/persistence/utility-sources/` | Domain runtime |
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
| Milestone Progress aggregation | `plugin/src/query/derived/` | UI count arithmetic |
| Cycle next-candidate selection | `plugin/src/query/cycles/` | UI-local “rollover” logic |
| Default Project resolution / legal default target candidate | `plugin/src/query/` | Domain Project subtype checks or title matching |
| Default Project startup recovery | `plugin/src/source-sync/bootstrap/` + normal Project/plugin-data Persistence owners | Query fallback, external-refresh repair, or UI title/path matching |
| Default Project setter and current-Default delete guard | `plugin/src/domain/planning/`, `plugin/src/application/workspace/`, `plugin/src/application/projects/`, shared Project Picker, `plugin/src/adapters/obsidian/` Settings | delete-time replacement arguments, direct Settings persistence writes, or a second Default-Project model |
| Runtime feedback presentation | `plugin/src/ui/patterns/`, `plugin/src/ui/interactions/`, `plugin/src/ui/shell/` consuming Runtime/Query | page-local save/error state machines or persisted feedback facts |
| Business use cases | `plugin/src/application/` | UI or persistence |
| Product composition | `plugin/src/ui/pages/` | Domain/Application |
| Navigation and stable Project shortcut routing | `plugin/src/ui/shell/` | Project entity model or persistence filenames |
| Foundation Lab calibration presentation | `plugin/src/ui/foundation/` | production primitives/pages; production code must not depend on Lab classes/components |
| Resolved visual tokens and Obsidian host mapping | `plugin/styles/tokens.css`, `plugin/styles/obsidian-variables.css`, `plugin/styles/obsidian-native.css`; `plugin/src/ui/design-system/` only for TS-side contracts/helpers when required | repeated raw design values, late repair overrides, page-local theme systems |
| Entity components | `plugin/src/ui/entities/` | page-specific copies |
| Shared Creation Composer and create-state orchestration | `plugin/src/ui/interactions/`, `plugin/src/ui/patterns/` | page-local inline/modal create stacks |
| Shared collection Filter grammar and session state | `plugin/src/ui/interactions/`, `plugin/src/ui/patterns/`, `plugin/src/query/` | page-private filter engines, hidden quick-filter state, or `runtime/store` canonical entity state |
| Shared compact PropertyControl presentation shell | `plugin/src/ui/patterns/trail-property-control.tsx` + `plugin/styles/patterns.css` | property-specific semantics, picker/open state, legal targets, Query/Application mutation, or page-local copies |
| Shared property pickers and semantic property controls | `plugin/src/ui/entities/`, `plugin/src/ui/interactions/`, reusable `plugin/src/ui/patterns/`, and `plugin/src/query/` where target legality is derived | per-page property widgets or `TrailPropertyControl` as a business-semantics owner |
| Shared Selection / Action Registry / Bulk target intersection / shortcut dispatch | `plugin/src/ui/interactions/`, `plugin/src/ui/patterns/` with host binding in `plugin/src/adapters/obsidian/` | page-local command menus, page-local selection state machines, duplicate action catalogs, or shortcut-specific business logic |
| Core primitive visual/interaction contracts | `plugin/src/ui/primitives/` + `plugin/styles/tokens.css` / `plugin/styles/primitives.css` | page-local low-level controls or arbitrary caller-owned pixel/color props |
| Shared visual/composition patterns | `plugin/src/ui/patterns/` + `plugin/styles/patterns.css` | page-local copies or giant universal components |
| Stylesheet source ordering / generated Obsidian delivery | canonical `plugin/styles/` modules + the explicit stylesheet manifest in `esbuild.config.mjs` | root source `styles.css`, `@import`/glob-order ownership, or a second build/watch source list |
| Shared transient interaction mechanics/state | `plugin/src/ui/interactions/` | canonical Runtime, page-local duplicate selection/filter/action systems |
| Trail semantic presentation | `plugin/src/ui/entities/` | generic primitives or page-private entity copies |
| Obsidian integration | `plugin/src/adapters/obsidian/` | Domain/Application/Runtime |
| Development diagnostics | `plugin/src/diagnostics/` | Product history |
| Legacy Projectless one-way upgrade | `plugin/src/migration/` | normal Runtime/Domain dual-model branches |
| Composition and host registration | `plugin/src/main.ts` | business logic or persistence policy |

Code ownership is target ownership, not an implementation-progress indicator. If a target directory is not yet present, the responsibility is still mapped there; `docs/implementation.md` records whether the capability is currently implemented.

## 4. Target Code Tree

```text
plugin/
├─ styles/
│  ├─ tokens.css
│  ├─ obsidian-variables.css
│  ├─ obsidian-native.css
│  ├─ primitives.css
│  ├─ patterns.css
│  ├─ shell.css
│  └─ foundation.css
│
└─ src/
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
   │  ├─ cycles/
   │  ├─ shared/
   │  └─ page-specific selectors
   │
   ├─ ui/
   │  ├─ design-system/        TS-side design contracts/helpers only when required
   │  ├─ primitives/           generic semantic controls; no Trail Domain knowledge
   │  ├─ interactions/         shared headless transient UI mechanics/state
   │  ├─ patterns/             reusable interface composition over primitives/interactions
   │  ├─ entities/             Trail semantic presentation over Query/capabilities
   │  ├─ pages/
   │  │  ├─ home/
   │  │  ├─ projects/
   │  │  ├─ triage/
   │  │  └─ cycles/
   │  ├─ shell/                navigation/location/workspace composition
   │  └─ foundation/           development/calibration consumer only
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

Canonical stylesheet source lives under `plugin/styles/` and follows Architecture Section 3.11 ownership rather than mechanically mirroring the UI TypeScript tree. `esbuild.config.mjs` composes those modules through one explicit ordered manifest into the generated `.obsidian/plugins/trail/styles.css` host delivery artifact; that generated file is not a second source authority. `ui/foundation` may consume tokens/contracts to make them reviewable, but no production shell/page/entity/pattern/primitive may depend on Foundation Lab components or `trail-lab-*` styling.

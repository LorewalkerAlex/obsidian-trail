# Trail Implementation

## 1. Baseline

### 1.1 Code baseline

The active formal implementation is `plugin/` on `main`.

The code baseline used to create this implementation plan is:

```text
ae3b667aa2df0a555e1f93bb2eb9c2eb99342a72
feat: add issue project move
```

The documentation authority re-baseline that introduces this file changes project documentation/repository hygiene only. It does not change `plugin/src`. The first code implementation checkpoint after that cutover begins from the then-current verified `main` HEAD.

### 1.2 Current proven product behavior

The current implementation already provides and has verification evidence for:

- Quick Capture → Triage Issue;
- Triage edit, defer/Due change, and delete;
- Project creation;
- Workflow Issue creation;
- Workflow Issue Status lifecycle basics, including Completed/Estimate and lifecycle timestamps;
- Triage Accept creating a new Workflow Issue identity;
- Triage Convert to Project creating a new Project identity;
- identity-preserving Issue move between Projects with cross-Project Milestone clearing and terminal-Project guard.

These behaviors remain valid implementation assets. They do not determine the order in which the remaining V1 foundation is completed.

### 1.3 Current proven shared mechanisms

The repository already contains reusable evidence/capability for:

- canonical Domain/entity/config/workspace-state types;
- Domain/configuration/workspace validation infrastructure;
- current Markdown paths/schema/core and explicit Initiative/Project/Triage/Projectless/Cycles codecs;
- Domain source and plugin-data repositories;
- committed Runtime + ordered pending optimistic projection + control + source health;
- source ownership and `issuesByProjectId` runtime index;
- generic Create/Replace/Delete logical effects and mutation coordination;
- one global serial Mutation Queue;
- dequeue-time placement/physical transaction materialization;
- Single, Source Transition, and Integrity Batch persistence transaction types;
- destination-first Source Transition execution and bounded compensation boundaries;
- source bootstrap/discovery and one authoritative external full-refresh ingress;
- Trail-owned host-event suppression and authoritative reread/reconcile;
- shared effective/status/source-health query helpers;
- Triage/Projects UI and Obsidian host composition;
- development Diagnostics and architecture/lint guards.

These mechanisms are reused rather than recreated per future product feature.

## 2. Objective

Complete the already-frozen V1 design from the bottom up, in dependency order, before resuming dependent product-workspace implementation.

The implementation must converge on the established target in:

```text
product.md
→ domain.md
→ data.md
→ architecture.md
→ design-to-code-map.md
```

The active strategy is **contract-driven bottom-up implementation**:

```text
foundational semantics and integrity
→ shared technical support
→ read/application capabilities
→ shared interaction capabilities
→ product workspaces
```

A missing upper-layer feature must not cause a temporary lower-layer model, placeholder entity, compatibility path, fake default, or second mechanism. A capability that is not yet exposed by UI remains part of the same canonical model and must be preserved by mutations that do not edit it.

## 3. Reuse

### 3.1 Reuse rules

For each implementation step:

1. reuse existing canonical owners and proven mechanisms;
2. extend an existing owner when the design already maps the responsibility there;
3. add a new owner only if the Design-to-Code Map is genuinely insufficient and the upstream design is updated first;
4. preserve unrelated canonical fields/relations even when the current UI does not expose them;
5. do not create production placeholders solely to reserve future behavior;
6. reuse owner-level verification evidence instead of repeating unchanged persistence/host failure cases for every feature.

### 3.2 Canonical-but-not-yet-exposed data

A field/relationship can be fully canonical even when no current page edits it.

Example: if a Project edit use case changes title or Due while `initiativeId` and `labelIds` are not yet exposed in that UI, the mutation must preserve those canonical values exactly. UI absence never means the data concept is absent or disposable.

### 3.3 No temporary surrogate model

The following are not acceptable implementation shortcuts:

- fake “Default Initiative” or “General Project” objects to avoid proper optional relations;
- temporary Milestone/Label/Status representations that will later be migrated to the already-defined canonical model;
- alternate file carriers for a behavior whose target carrier is already defined;
- feature-local persistence/mutation stacks alongside shared owners;
- compatibility aliases or dual paths used as an intended steady state;
- storing derived state because its selector has not been implemented yet.

If an upper-layer behavior has a real blocking dependency, either implement the required canonical dependency first or defer that behavior as a whole.

## 4. Changes

### 4.1 Completion matrix

The next work is organized by architectural layer, not by isolated UI feature.

| Layer | Frozen target | Current implementation | Required work before dependent layers |
|---|---|---|---|
| Domain Model | Initiative/Project/Milestone/Issue/Cycle + Configuration + Workspace State | Strong structural foundation present | Audit exact alignment with `domain.md`; fill only real contract gaps |
| Domain Validation / Rules | field, lifecycle, relationship, reference, workspace invariants | Record/config/workspace validation exists | Create rule-by-rule coverage matrix; complete missing derived/integrity rules |
| Semantic Planning | all V1-defined legal state transitions | Triage + Issue + Project planning only | Complete planning foundation for remaining core entity/configuration/destructive relations |
| Data / Markdown | all frozen carriers/schema/config/workspace persistence | Current schema and Initiative/Project/Triage/Projectless/Cycles codecs exist | Audit read/write completeness for every frozen carrier and planned effect; no new physical model |
| Persistence / Mutation | Single / Source Transition / Integrity Batch across Domain/config/workspace effects | Shared plan/materializer/executor foundation exists | Prove all required planned operations can materialize/execute through canonical topologies |
| Runtime | complete authoritative universe, ownership, high-value structural/reference indexes | Runtime shape/ownership exist; only `issuesByProjectId` is currently materialized | Add only frozen high-value relation/reference indexes needed by integrity and downstream reads |
| Query / Derived | shared derived facts, structural selection, filter/sort/group/search building blocks, page selectors | effective/status/source-health helpers exist | Complete reusable read foundation before pages depend on ad hoc scans |
| Application | V1 business areas mapped to thin use cases | Triage, Issues, Projects exist | Add Initiative/Milestone/Cycle/Configuration/Workspace/Similarity areas as their dependencies become complete |
| Shared UI capabilities | reusable pickers, board/list mechanics, Peek/actions/selection/commands/design system as needed | shell/entity/Triage/Projects foundations exist | Establish shared mechanics before multiple pages independently need them |
| Product Workspaces | Projects/Initiatives, Project execution, Cycles/Views, Home/Utilities | Triage and minimal Projects page only | Build after lower-layer gates pass |

The matrix describes implementation gaps only; it does not redefine the upstream design.

### 4.2 Domain/validation completion work

Create an executable/checkable coverage matrix against `domain.md` and confirm that canonical types/rules/validators cover at least:

- Project↔Initiative relationship legality;
- Milestone ownership and same-Project Issue/Milestone legality;
- Triage vs Workflow context-conditioned fields;
- Issue Status lifecycle timestamps and Completed Estimate;
- terminal Project acceptance / Complete / Reopen rules;
- Cycle open/closed/membership rules and max-one-open invariant;
- LabelGroup registration and Single/Multiple constraints;
- StatusDefinition/default/order reference integrity;
- delete/replacement relation-resolution postconditions;
- derived completion/timeline inputs where they support later Query.

Do not add UI or Application behavior merely to test these rules.

### 4.3 Semantic planning completion work

After Domain/Validation is complete, implement pure planners/builders for the V1 state transitions that downstream Application will require, grouped by domain owner rather than page.

Expected planning areas include:

- Initiative create/edit/delete and Project Initiative membership;
- Project edit/lifecycle/delete and relation-integrity effects;
- Milestone create/edit/delete and Issue Milestone assignment/clearing;
- Issue field edits, projectless/project moves, delete, and remaining lifecycle actions;
- Cycle create/add/remove/close/create-next/delete;
- Label/LabelGroup and Status configuration changes that require reference repair;
- supported Workspace State changes such as Custom Views/Favorites when their concrete product capability is implemented.

Planning produces legal logical effects only. It does not choose Markdown ranges, call repositories, or create UI prompts.

### 4.4 Data/Persistence/Mutation completion work

Use the existing physical schema/carriers. Audit that every planned effect can be represented and persisted without a feature-local writer.

Required shared mechanics include:

- file-backed Initiative/Project create/edit/rename/delete;
- Project-source Milestone/Issue insertion/replacement/removal;
- projectless/Triage/Cycle source operations;
- plugin-data Configuration/Workspace State replacement;
- source placement resolution for new/existing entities;
- Single Transaction for one-carrier updates;
- Source Transition for placement changes/create-target-before-delete-source;
- Integrity Batch for multi-reference destructive/configuration operations.

Add executor/materializer behavior only where an already-defined topology cannot yet execute a frozen planned operation. Do not introduce a fourth generic transaction mechanism.

### 4.5 Runtime/index completion work

After persistence/mutation support is stable, build the stable indexes that multiple integrity/query consumers require.

Candidate frozen high-value indexes include:

```text
projectsByInitiativeId
milestonesByProjectId
issuesByProjectId          # already present
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

Each index must have a concrete integrity/query consumer or stable relation rationale. Do not prebuild indexes for arbitrary field combinations.

Runtime reconciliation must update affected indexes atomically with authoritative state and preserve stable object references where data did not change.

### 4.6 Query foundation work

Build shared read capabilities before page-specific components begin reproducing them:

- structural narrowing by Project/Initiative/Milestone/Cycle;
- Status/category interpretation;
- Initiative/Project/Milestone completion/progress and activity derivation;
- Due/attention temporal derivation;
- default Triage/Backlog/Started ordering;
- supported filtering/sorting/grouping dimensions;
- fuzzy search appropriate to personal scale;
- stable ID/grouped-ID result shapes.

Do not create a generic query DSL or persistent query cache engine.

### 4.7 Application foundation work

Once Domain planning and required lower layers are complete, add thin business-area use cases under the target owners:

```text
application/
├─ initiatives/
├─ projects/
├─ milestones/
├─ issues/
├─ triage/
├─ cycles/
├─ configuration/
├─ workspace/
└─ similarity/
```

Application normalizes input, invokes Domain/Query, submits through shared Mutation, and exposes UI-facing results. It does not own persistence mechanics.

### 4.8 Shared UI capability work

Before Project/Cycle/Home pages independently invent similar interaction mechanisms, establish the shared capabilities that have more than one real consumer or are required by the next product workspaces:

- Status/Project/Milestone/Cycle/Label property pickers using common picker mechanics;
- Board/List primitives with Status drag semantics;
- Peek and lightweight editor/draft handling;
- context actions and NeedsInput handling;
- Selection/Bulk/Command/shortcut framework where actual V1 consumers need it;
- design-system tokens/primitives and responsive pane behavior;
- virtualization only where representative long-list evidence requires it.

Shared mechanisms must not absorb product-specific candidate/rule logic.

### 4.9 Product workspace work

After foundation gates, implement user workspaces as compositions of established capabilities. The expected product-level sequence is then chosen by dependency and user value, likely around:

1. complete Projects/Initiatives/Project Workspace execution;
2. Cycle planning workspace;
3. Views/Search/Favorites and global task selection surfaces;
4. Home + Weekly Note/global entry points;
5. V1 interaction/recovery/performance hardening.

These are product checkpoints, not excuses to reopen lower-layer design. Exact grouping can be adjusted once the lower-layer completion matrix is green and the current repository is re-inspected.

## 5. Build Order

Implementation proceeds through layer gates. A later gate may begin only when its required lower-layer contracts are complete enough that it does not have to invent temporary substitutes.

```text
1. Domain / Validation Completion
   ↓
2. Semantic Planning Completion
   ↓
3. Data / Persistence / Mutation Operational Completion
   ↓
4. Runtime / Index Foundation Completion
   ↓
5. Query / Derived Foundation Completion
   ↓
6. Application Foundation Completion
   ↓
7. Shared UI Capability Completion
   ↓
8. Product Workspace Implementation
   ↓
9. V1 Integration / Hardening
```

### 5.1 Gate 1 — Domain / Validation

Exit when the frozen V1 domain rules have explicit canonical implementations/tests and no upper layer needs to invent missing semantics.

### 5.2 Gate 2 — Semantic Planning

Exit when the required V1 state transitions can produce complete legal logical plans using only Domain inputs/contracts.

### 5.3 Gate 3 — Data / Persistence / Mutation

Exit when those planned effects can materialize through the existing persistence carriers and three transaction topologies, including required integrity operations, without feature-local I/O stacks.

### 5.4 Gate 4 — Runtime / Index

Exit when authoritative state, ownership, and required high-value structural/reference indexes support integrity and downstream reads coherently.

### 5.5 Gate 5 — Query / Derived

Exit when shared structural/derived/filter/sort/group/search capabilities exist for known V1 consumers and pages no longer need to reconstruct them ad hoc.

### 5.6 Gate 6 — Application

Exit when each required V1 business area has a thin canonical use-case owner over the completed lower layers.

### 5.7 Gate 7 — Shared UI capabilities

Exit when common interaction/presentation mechanisms required by multiple upcoming workspaces have one canonical owner and mechanism-level tests.

### 5.8 Gate 8 — Product workspaces

Build coherent user workflows using established foundations. A product checkpoint should be large enough to change actual use, but it must not backfill temporary foundation as part of the page implementation.

### 5.9 Gate 9 — V1 hardening

Integrate responsive behavior, recovery/undo scope, performance evidence, diagnostics boundaries, full regression, and release-readiness without changing upstream semantics merely for implementation convenience.

## 6. Risk & Verification

### 6.1 Main risks

The main risk in this phase is architectural drift caused by implementing upper-layer features before their shared dependencies are complete.

Specific risks:

- a page creates feature-local business logic because the Domain planner is incomplete;
- hidden canonical fields are dropped by an edit UI that does not expose them;
- a missing relation index causes pages to create private state/caches;
- configuration deletes/changes create dangling references because Integrity Batch consumers are absent;
- future Initiative/Milestone/Cycle behavior creates parallel persistence paths despite existing carriers;
- tests repeatedly prove existing host mechanisms while missing new semantic integrity.

### 6.2 Verification strategy

During each gate:

- run focused tests for changed owners and directly affected shared owners;
- use typecheck/lint/build as appropriate to the changed layer;
- reuse already-proven lower-layer evidence unless the risk actually changed;
- add architecture/lint/test guards when a high-value boundary can be enforced mechanically;
- run one full `npm run check` at each coherent stable checkpoint rather than after every small internal change;
- use `git diff --check` before checkpoint;
- perform real Obsidian validation only for new/changed host, persistence, synchronization, continuous-interaction, or other independent real-host risks that automated owner tests cannot establish.

For destructive/integrity operations, tests must prove final graph legality and relevant failure boundaries, not merely successful field changes.

### 6.3 Documentation verification

At each stable checkpoint, update only the implementation facts affected by that checkpoint. Upstream Product/Domain/Data/Architecture/Mapping documents change only when the corresponding design answer truly changes; progress alone does not edit them.

Repository searches should reject references to superseded document names or removed archive paths after the documentation cutover.

## 7. Final State

The V1 implementation is ready for final product hardening when:

- every frozen Core Entity/configuration/workspace-state concept has one canonical implementation owner;
- Domain invariants and V1 state transitions are complete before UI depends on them;
- all authoritative mutations use the same Mutation/Persistence/Source Sync architecture;
- all frozen carriers are supported without temporary alternate storage;
- Runtime contains one committed/pending/control/health model with the required structural/reference indexes;
- Query exposes reusable derived/selection capabilities rather than page-private reconstruction;
- Application exposes thin use cases for the supported business areas;
- shared UI mechanics have one canonical owner and product pages compose them;
- Project/Initiative, Cycle, Views, Home, and remaining V1 experiences operate without temporary domain/data/architecture substitutes;
- the codebase retains no compatibility scaffold, duplicate mechanism, feature-local persistence stack, or placeholder model whose purpose is “fix later”;
- `npm run check`, architecture guards, focused owner tests, and representative real-host evidence are green for the final integrated state;
- `README.md` and this file describe current repository reality without becoming a historical checkpoint ledger.

# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The latest published implementation checkpoint immediately preceding the current Project Status Four-State Configuration Closure is:

```text
b88b671f1b7d7a81f931e70f052ed2d20fdd0fe4
feat: require workflow projects and add default project
```

Its authoritative design parent is:

```text
5e481fe3d0cbe5aafe2d49210091eb2cd3d7345d
docs: require project ownership and default project
```

The implementation baseline already contains the completed Project Lifecycle, Initiative/Project organization, Project Milestone, Cycle Planning, shared Project/Cycle Workflow presentation, Workflow Issue Peek & Planning Properties, Project Details Editing, Initiative Details Editing, Label Configuration & Management, Status Configuration & Management, Milestone Details Editing, Global Search & Project-less Workflow, Home Routing & Weekly Note, Weekly Note integrity hardening, Integrity Batch failure-safety hardening, and Required Workflow Project & Default Project slices.

Those checkpoints remain historical implementation evidence. This document does not rewrite their recorded behavior after later Product/Domain decisions change the target.

Gate 1 - Domain / Validation Completion, Gate 2 - Semantic Planning Completion, Gate 3 - Data / Persistence / Mutation Operational Completion, Gate 4 - Runtime / Index Foundation Completion, Gate 5 - Query / Derived Foundation Completion, Gate 6 - Application Foundation Completion, and Gate 7 - Shared UI Capability Completion remain established foundations. The current corrective slice reopens a bounded set of Status Configuration owners inside those foundations; it does not invalidate the architecture or restart the gate sequence.

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
- Required Workflow Project & Default Project at `b88b671f1b7d7a81f931e70f052ed2d20fdd0fe4`.

The Global Search checkpoint is especially important to interpret correctly. At `9aa3f...`, the then-current Domain intentionally allowed `projectId: null`/absent Workflow Issues in `Trail/Collections/Projectless Issues.md`, and representative host validation proved that design worked. The newer Product/Domain baseline supersedes that **target model**, not the validity of the historical evidence. Search, Peek, cross-carrier movement, and the shared Markdown EOF fix established by that checkpoint remain reusable evidence; the Projectless state/carrier itself is absent from the current runtime target.

### 1.2 Current corrective-slice status

The canonical Product/Domain/Data chain already establishes one global StatusCategory vocabulary with entity-specific applicability:

```text
StatusCategory vocabulary
→ Backlog | Unstarted | Started | Completed | Canceled

Issue applicability
→ Backlog | Unstarted | Started | Completed | Canceled

Project applicability
→ Unstarted | Started | Completed | Canceled
→ no Backlog
```

The bounded **Project Status Four-State Configuration Closure** is implemented and locally verified, pending checkpoint publication. One canonical entity-specific applicability now drives the logical Configuration shape and the normal consumers of that shape instead of allowing each layer to invent a Project/Backlog exception.

The validated logical model now gives Issue five Status category buckets and Project four. Project StatusDefinition values cannot carry Backlog in the validated logical Configuration. Default configuration creates nine StatusDefinitions total: five for Issue and four for Project.

Validation, current-schema Plugin Data parsing/serialization, Configuration Application mutations/canonical ordering, shared Status Query, Status Picker, and Obsidian Settings all consume the same applicability. Current-schema Plugin Data rejects a Project Backlog bucket rather than treating it as a compatibility path. The checked-in development Plugin Data is aligned to Issue 5 / Project 4.

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

The active strategy remains dependency-aware vertical implementation:

```text
established canonical foundations
-> correct any newly exposed lower-layer divergence at its owner
-> coherent product workflow
-> consumer-driven shared mechanism where justified
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
- existing Project Workspace, Project collection, Issue row/Peek, and navigation mechanisms where they match the resolved UI target;
- Configuration and Workspace State plugin-data persistence;
- Diagnostics and architecture guards.

The Default Project does not need a new Project codec, Project source kind, Domain subtype, lifecycle policy, query model, or workspace implementation. It reuses an ordinary Project plus a Workspace State reference and the normal Project route.

Status applicability likewise does not need a second Project Status subsystem. The shared StatusCategory vocabulary remains global; one canonical entity-specific applicability defines the legal subset consumed by Configuration, validation, persistence, Application, Query, and UI.

Reuse of current UI work means reuse the canonical mechanism or evidence when it still fits the resolved target, not preservation of the current POC presentation. The present shell layout, CSS treatment, native select/form composition, page-local navigation, modal Peek/details carriers, and Workflow List/Board presentation remain non-authoritative where `ui.md` defines a different target.

The resolved Triage target likewise reuses the existing Triage Domain/Data carrier, standard Create Issue/Create Project use cases, Source Transition safety, shared Filter grammar, shared property primitives, and shared menu/selection mechanics. It does not justify a TriageItem entity, Triage-specific create form, Snooze state, or second filter grammar.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 8 - Product Workspace Implementation**.

The bounded **Project Status Four-State Configuration Closure** corrective cross-layer slice is green and ready for checkpoint publication. Gate 8 then continues remaining V1 UI design closure and formal UI implementation against the resolved `ui.md` target.

The correction closes an implementation/schema mismatch against an already-authoritative Product/Domain/Data rule. It does not redefine Status semantics or create a second Status mechanism.

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

- Add optional `defaultProjectId` to synchronized Workspace State.
- Fresh bootstrap creates the normal default Configuration, then creates one ordinary Project titled `Standalone` at reserved physical sequence `0000` using normal Project creation/default Status semantics and stores its stable ID as `defaultProjectId`; `0000` belongs to the seed source rather than Default identity.
- The Project has no special field and may later be renamed, assigned to an Initiative, transitioned, completed, canceled, reopened, or deleted like any other Project.
- Deleting the referenced Project clears `defaultProjectId`; Trail does not silently select or create another default.
- Established workspaces with an invalid dangling Default Project reference are Data Issues rather than silent auto-repair candidates.

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

- Triage Accept requires a Project selection.
- Any context-less Workflow Issue create surface requires a Project selection.
- Query exposes legal Project target candidates and resolves the current Default Project as an initial candidate only when legal for the requested action.
- UI may preselect that candidate; Application/Domain receive the selected explicit Project ID.
- Project-local Workflow create continues to submit the current Project.
- Issue move always means Project → Project; remove `No Project` as a target.
- The left Workspace section renders the referenced Default Project using its current Project title and routes to the normal Project Workspace.
- The same Project remains visible normally in Projects Root under its actual Initiative/`No Initiative` grouping.
- If `defaultProjectId` is absent, the shortcut is absent; Projects/Cycles remain available.
- A dedicated end-user “set Default Project” control is not required for this corrective slice unless later product work explicitly freezes that interaction.

This subsection records the historical `b88...` target. The newer resolved Triage UI target supersedes its **user-facing Accept composition**: Accept now chooses Issue or Project, and only the Issue branch uses the explicit-Project rule above. The underlying required-Project invariant and standard Workflow Issue creation path remain valid implementation evidence.

#### Project delete

Project delete must no longer create Projectless Workflow Issues.

If the Project owns child Workflow Issues:

```text
Delete Project A
-> require explicit legal replacement Project B
-> move preserved Workflow Issues to B
-> clear old Project-A Milestone relation on those Issues
-> remove Project-A Milestones
-> remove Project A
-> if defaultProjectId == A, clear defaultProjectId
```

If no child Workflow Issues exist, no replacement Project is required.

The UI may initially select the current Default Project as the replacement only when it exists, is not the Project being deleted, and is legal for all affected Issue states. The Domain plan still receives an explicit replacement. The replacement used for child work never implicitly becomes the new Default Project.

The existing destination-first Integrity Batch safety tradeoff remains: prepare preserved Issues at the destination before destructive source removal, and prefer detectable duplicate/error recovery over silent loss if a later destructive operation fails.

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

#### Canonical logical model

- Keep the global StatusCategory vocabulary at Backlog, Unstarted, Started, Completed, Canceled.
- Add one canonical entity-specific applicability: Issue uses all five categories; Project uses Unstarted, Started, Completed, Canceled.
- Model `workflowStatuses.issue` with five category configurations and `workflowStatuses.project` with four.
- Prevent a validated Project StatusDefinition from using Backlog without introducing a separate Project Status subsystem.
- Keep Issue-only workflow/board behavior on the full five-state vocabulary.

#### Defaults / validation / persistence

- Fresh default Configuration creates five Issue StatusDefinitions and four Project StatusDefinitions.
- Configuration validation iterates only the applicable category set for each entity type and rejects invalid definition/entity/category relationships.
- Current Plugin Data requires exactly five Issue Status buckets and exactly four Project Status buckets.
- Current-schema parsing rejects Project Backlog as an unknown key; serialization emits no Project Backlog bucket.
- No legacy compatibility branch or automatic migration is added to normal runtime.

#### Application / Query / UI

- Configuration Application status creation, ordering, defaults, deletion, and canonicalization consume legal entity/category targets rather than accepting every global category for Project.
- Shared Status Query returns category groups from the canonical applicability.
- Status Picker renders the groups returned by Query, so Project surfaces contain four groups while Issue surfaces retain five.
- Obsidian Settings generates only applicable status-category sections and routes mutations through the same legal target model.

#### Tests / development data

- Shared fixtures and Domain contract tests model Issue 5 / Project 4.
- Default Configuration, validation, codec, Configuration Application, Query, and Status Picker tests cover the four-state Project shape.
- Fresh bootstrap deterministic test IDs are aligned with nine default StatusDefinitions rather than the obsolete ten-definition sequence.
- Checked-in `.obsidian/plugins/trail/data.json` contains no Project Backlog bucket; existing Project Markdown references already point to legal Project statuses and require no status migration.

### 4.4 Current verified gaps

With Required Workflow Project & Default Project published, the Four-State correction green, and the Triage target now resolved in Product/Domain/UI, remaining verified gaps are grouped as follows:

- **remaining UI design-closure gaps** — Cycle-specific creation/filter/presentation/capability details remain the next explicit design target; Home/Search/Custom View and other explicitly deferred compositions remain consumer-by-consumer work;
- **formal UI implementation gaps** — the real Obsidian left-split Trail Navigation and Default Project shortcut establish the correct host/navigation mechanism, but shell, Location Bar/View Bar, collection composition, Triage queue/review composition, density, and visual calibration still need implementation alignment with `ui.md`;
- **product composition gaps** — remaining Home composition such as Triage Summary and Activity Heatmap;
- **consumer-driven shared UI gaps** — Selection, Bulk Actions, Context Menu, Command Menu, broader property pickers, and later saved presentation state where real consumers justify them.

Triage's target interaction is now resolved: it is a Linear-inspired intake/review queue with all active entries browseable, a derived seven-day/minimum-10 Review Set, shared-filter grammar over Review Due/Priority/Labels, constrained Display ordering, sequential Review Surface, Accept→Issue/Project using the normal creation modals with title/body prefill only, Defer as review-Due movement, and Delete rather than a persisted Discard concept. This is **design authority**, not a claim that the current implementation already matches it.

Required Workflow Project & Default Project, Project Status Four-State Configuration Closure, Label Configuration & Management, Status Configuration & Management, Milestone Details Editing, Search mechanics, Home Routing & Weekly Note, Weekly Note hardening, and Integrity Batch failure-safety are completed implementation evidence. The Projectless portion of the historical Search checkpoint remains superseded and no longer exists in normal runtime.

### 4.5 Next: remaining UI design closure, then formal UI implementation

Continue V1 design closure with **Cycles** before treating the whole UI design as frozen. Triage-specific Row/review/filter/Accept/Defer behavior is no longer an explicitly deferred UI decision.

The working chain remains:

```text
Product responsibilities
-> Architecture ownership
-> current Linear equivalent
-> Obsidian/browser host capability
-> resolved target in ui.md
-> Design-to-Code owner
-> implementation
```

After the remaining product-level UI gaps are frozen, audit the current rendering against `ui.md` and implement the formal shell/page closure. Current Trail rendering remains functional evidence, not a visual/layout/component baseline.

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
7. Shared UI Capability Foundation                      ESTABLISHED
   |
8. Product Workspace Implementation                     ACTIVE
   ├─ Required Workflow Project & Default Project       COMPLETED
   ├─ Project Status Four-State Configuration Closure   COMPLETED
   ├─ Triage UI design closure                          RESOLVED DESIGN
   ├─ Cycle UI design closure                           NEXT DESIGN
   ├─ Formal UI implementation closure                  AFTER DESIGN
   └─ remaining Home composition                        AS CONSUMED
   |
9. V1 Integration / Hardening
```

Completed Gate 8 implementation slices at this candidate checkpoint include:

- Project Lifecycle Closure;
- Initiative Focus & Project Assignment;
- Project Milestone Management;
- Cycle Planning & Rollover;
- Project / Cycle Board & List Interaction Foundation;
- Workflow Issue Peek & Planning Properties;
- Project Details Editing;
- Initiative Details Editing;
- Label Configuration & Management;
- Status Configuration & Management;
- Milestone Details Editing;
- Global Search & Project-less Workflow **(historical checkpoint; Projectless target later superseded)**;
- Home Routing & Weekly Note;
- Required Workflow Project & Default Project;
- Project Status Four-State Configuration Closure.

Triage UI design closure is not listed as a completed implementation slice because this documentation checkpoint freezes the target; implementation alignment remains future Gate 8 work.

A previously completed lower-layer owner may be edited during a later slice when an upstream canonical model changes. That does not create a second implementation track or erase earlier evidence.

## 6. Risk & Verification

### 6.1 Verified Project Status Four-State evidence

The Project Status Four-State Configuration Closure now verifies:

- the shared StatusCategory vocabulary remains five-state while canonical applicability is Issue 5 / Project 4;
- validated logical Configuration has no Project Backlog bucket and a Project StatusDefinition cannot use Backlog;
- fresh default Configuration creates nine StatusDefinitions total: five Issue plus four Project;
- validation and current-schema Plugin Data enforce the entity-specific category sets rather than requiring or accepting Project Backlog;
- Plugin Data serialization emits Issue five-state and Project four-state status configuration;
- Configuration Application, Query, Status Picker, and Obsidian Settings consume the canonical applicability rather than layer-local Project/Backlog special cases;
- Issue workflow presentation remains five-state;
- checked-in development Plugin Data is aligned to Issue 5 / Project 4;
- bootstrap deterministic ID expectations are aligned to the nine-definition default Configuration;
- focused fresh-bootstrap verification passes all 3 tests;
- full `npm run check` passes: ESLint is green, 105 Vitest files / 349 tests pass, TypeScript `tsc --noEmit` passes, and the production esbuild completes;
- full `git diff --check` passes after the final repair.

No production legacy-data migration was introduced for this pre-V1 correction. If legacy Project Backlog persistence must later be retained, Migration remains the explicit owner rather than broadening the current parser/serializer or validated logical model.

### 6.2 Published Required Workflow Project & Default Project evidence

The Required Workflow Project & Default Project slice at `b88b671f1b7d7a81f931e70f052ed2d20fdd0fe4` verifies:

- Domain types/record validation cannot represent or accept committed Projectless Workflow Issue state;
- Triage cannot retain Project/Milestone relations;
- Workflow create requires an existing legal Project and starts in Backlog;
- Triage Accept requires an explicit legal Project;
- context-less create/default selection resolves the Default Project only at Query/UI and submits an explicit ID;
- Default Project rename updates the sidebar label through Project identity rather than title lookup;
- Initiative assignment and lifecycle changes on the Default Project behave exactly like ordinary Project operations;
- deleting the Default Project clears the Workspace State reference;
- moving Issue Project A → Project B preserves identity, clears invalid old Milestone relation, and has no No-Project destination;
- deleting a Project with child Issues requires a legal replacement Project and preserves those Issues;
- deleting a Project without child Issues does not invent a replacement requirement;
- normal source discovery/placement contains no Projectless source kind/path;
- fresh bootstrap produces Triage/Cycles + ordinary `Trail/Projects/0000 Standalone.md` + coherent `defaultProjectId`; ordinary subsequent Project allocation begins at `0001`;
- external edits/reload converge through existing Source Sync and source-health behavior;
- full `npm run check` and `git diff --check` passed before that checkpoint;
- representative real-Obsidian validation proved a real left-split Trail Navigation, navigation within one primary Trail tab, ordinary Default Project routing, title/filename rename with stable sequence `0000`, and Default resolution after plugin reload;
- the diagnostics-enabled host check was followed by a production `npm run build` so the generated bundle returned to production mode.

This evidence remains historical and valid for the Issue-target branch of the newer Triage Accept design. The current target additionally allows Accept→Project through the normal Project create flow; that target has not yet been claimed as implemented/host-verified by this historical checkpoint.

No production legacy-data migration was introduced for that pre-V1 corrective slice. The checked-in development Vault was aligned directly to the current schema for host evidence; if legacy user-data retention becomes required, the explicit one-way Migration contract above remains the owner.

### 6.3 Historical evidence policy

Do not delete tests merely because their old Product scenario used Projectless if they still protect an independent mechanism such as:

- Markdown EOF record deletion;
- Source Transition failure ordering;
- Project-source placement/rename;
- search ranking/discovery;
- Runtime reconciliation;
- Integrity Batch destination-first failure safety.

Rewrite or relocate scenario-specific assertions so the independent mechanism remains covered under the new required-Project model. Remove only tests whose sole purpose is validating the obsolete Projectless semantic contract.

### 6.4 General verification discipline

For each active Gate 8 slice:

- verify the current repository and concrete Product workflow before changing code;
- inspect current UI only after target behavior is resolved upstream;
- reuse existing Query/Application/shared UI owners before adding another mechanism;
- repair exposed lower-layer gaps at the canonical owner instead of Page-local workarounds;
- run focused tests for changed owners and directly affected shared owners while iterating;
- run one full `npm run check` at the coherent stable checkpoint;
- run `git diff --check` before checkpoint;
- keep dependency audit clean when dependency state changes or a security advisory is encountered;
- use representative real Obsidian validation when the slice changes host-specific, persistence, focus/portal, drag/pointer, keyboard, or other behavior that unit/jsdom tests cannot establish reliably;
- keep the diagnostics-enabled bundle loaded throughout interactive host verification and restore it after production checks.

## 7. Final State

V1 implementation is ready for final product hardening when the frozen project answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or Page-private reconstructions; the model contains no normal-runtime Projectless Workflow state; the Default Project is only an ordinary Project reference/default UI target; Status Configuration preserves the global semantic vocabulary while enforcing entity-specific applicability; dependency gates are coherent; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the active construction stage, execution baseline, current verified gaps, build order, and verification evidence. Historical checkpoint behavior is retained as evidence even when a later upstream design decision supersedes its target semantics.

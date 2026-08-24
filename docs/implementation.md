# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The latest pushed implementation checkpoint remains:

```text
eb6d98fb28be81d8153aca0429705b05846499de
fix: harden integrity batch failure safety
```

The repository documentation baseline used for this plan is:

```text
b7a32dedaea3b382970be13c548efcd9a910d292
docs: close project timeline design
```

The implementation baseline already contains the completed Project Lifecycle, Initiative/Project organization, Project Milestone, Cycle Planning, shared Project/Cycle Workflow presentation, Workflow Issue Peek & Planning Properties, Project Details Editing, Initiative Details Editing, Label Configuration & Management, Status Configuration & Management, Milestone Details Editing, Global Search & Project-less Workflow, Home Routing & Weekly Note, Weekly Note integrity hardening, and Integrity Batch failure-safety hardening slices.

Those checkpoints remain historical implementation evidence. This document does not rewrite their recorded behavior after later Product/Domain decisions change the target.

Gate 1 - Domain / Validation Completion, Gate 2 - Semantic Planning Completion, Gate 3 - Data / Persistence / Mutation Operational Completion, Gate 4 - Runtime / Index Foundation Completion, Gate 5 - Query / Derived Foundation Completion, Gate 6 - Application Foundation Completion, and Gate 7 - Shared UI Capability Completion remain established foundations. The current target revision reopens a bounded set of owners inside those foundations; it does not invalidate the architecture or restart the gate sequence.

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
- Integrity Batch Failure-Safety Hardening at `eb6d98fb28be81d8153aca0429705b05846499de`.

The Global Search checkpoint is especially important to interpret correctly. At `9aa3f...`, the then-current Domain intentionally allowed `projectId: null`/absent Workflow Issues in `Trail/Collections/Projectless Issues.md`, and representative host validation proved that design worked. The new Product/Domain baseline supersedes that **target model**, not the validity of the historical evidence. Search, Peek, cross-carrier movement, and the shared Markdown EOF fix established by that checkpoint remain reusable evidence; the Projectless state/carrier itself must now be removed from the target implementation.

### 1.2 Current target correction

The authoritative design chain now establishes:

```text
Workflow Issue → exactly one Project
Triage Issue   → no Project / no Milestone

Default Project
→ Workspace State reference to an ordinary Project
→ fresh Workspace seeds ordinary Project title "Standalone"
→ no Project subtype / systemRole / special lifecycle / special carrier
```

The current implementation still has optional Workflow `projectId`, a Projectless source kind/carrier, `No Project` creation/move behavior, and Project delete that clears child `projectId`. Those are now explicit implementation divergences from the target and must be corrected before broader UI closure treats the model as stable.

The correction is intentionally small in concept: move special handling out of the Project entity and reduce it to Workspace default selection/navigation plus a required Workflow Project relationship.

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

Reuse of current UI work means reuse the canonical mechanism or evidence when it still fits the resolved target, not preservation of the current POC presentation. The present shell layout, CSS treatment, native select/form composition, page-local navigation, modal Peek/details carriers, and Workflow List/Board presentation remain non-authoritative where `ui.md` defines a different target.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 8 - Product Workspace Implementation**.

Before continuing the wider formal UI closure, Gate 8 now contains one corrective cross-layer slice:

> **Required Workflow Project & Default Project**

This slice implements the new upstream model through existing canonical owners instead of hiding it in sidebar code or a migration compatibility branch.

### 4.2 Required Workflow Project & Default Project slice

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
- Fresh bootstrap creates the normal default Configuration, then creates one ordinary Project titled `Standalone` using normal Project creation/default Status semantics and stores its stable ID as `defaultProjectId`.
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

This is a breaking current-schema replacement, not a permanent dual model.

If legacy persisted data must be retained, Migration owns a one-way transition:

```text
legacy Projectless Issues.md
-> choose/create one ordinary legal target Project
-> assign every legacy Workflow Issue to that Project
-> verify complete current graph
-> remove legacy Projectless carrier
-> normal runtime starts on current schema only
```

The checked-in repository `Trail/` tree remains disposable host-test observation data and may be updated to the new current schema as part of implementation validation. It is not itself a production migration contract.

### 4.3 Current verified gaps

After this documentation correction, verified gaps are grouped as follows:

- **model correction gap** — current implementation still supports Projectless Workflow while the target requires Project ownership and Default Project Workspace State;
- **product composition gaps** — remaining Home composition such as Triage Summary and Activity Heatmap;
- **formal UI closure gaps** — navigation/shell and consumer compositions must be aligned with `ui.md`, including the Default Project shortcut and removal of V1 Workspace Issues;
- **consumer-driven shared UI gaps** — Selection, Bulk Actions, Context Menu, Command Menu, broader property pickers, and later saved presentation state where real consumers justify them.

Label Configuration & Management, Status Configuration & Management, Milestone Details Editing, Search mechanics, Home Routing & Weekly Note, Weekly Note hardening, and Integrity Batch failure-safety remain completed evidence. The Projectless portion of the Search checkpoint is simply no longer the target state.

### 4.4 Formal UI closure after the correction

Once Required Workflow Project & Default Project is green, resume formal UI closure against Linear as Trail's primary visual and interaction reference:

```text
Product responsibilities
-> Architecture ownership
-> current Linear equivalent
-> Obsidian/browser host capability
-> resolved target in ui.md
-> Design-to-Code owner
-> implementation
```

Current Trail rendering remains functional evidence, not a visual/layout/component baseline.

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
   ├─ Required Workflow Project & Default Project       NEXT CORRECTIVE SLICE
   ├─ Formal UI closure                                 AFTER CORRECTION
   └─ remaining Home composition                        AS CONSUMED
   |
9. V1 Integration / Hardening
```

Completed Gate 8 checkpoints remain:

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
- Home Routing & Weekly Note.

A previously completed lower-layer owner may be edited during the corrective slice because the upstream canonical model changed. That does not create a second implementation track or erase earlier evidence.

## 6. Risk & Verification

### 6.1 Required corrective-slice evidence

The Required Workflow Project & Default Project slice should verify at minimum:

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
- fresh bootstrap produces Triage/Cycles + ordinary `Standalone` Project + coherent `defaultProjectId` and survives reload;
- legacy migration, if required, leaves no old Projectless carrier and validates the full graph;
- external edits/reload converge through existing Source Sync and source-health behavior;
- full `npm run check` and `git diff --check` pass before checkpoint;
- representative real-Obsidian validation covers the changed persistence/navigation behavior with diagnostics restored afterward.

### 6.2 Historical evidence policy

Do not delete tests merely because their old Product scenario used Projectless if they still protect an independent mechanism such as:

- Markdown EOF record deletion;
- Source Transition failure ordering;
- Project-source placement/rename;
- search ranking/discovery;
- Runtime reconciliation;
- Integrity Batch destination-first failure safety.

Rewrite or relocate scenario-specific assertions so the independent mechanism remains covered under the new required-Project model. Remove only tests whose sole purpose is validating the obsolete Projectless semantic contract.

### 6.3 General verification discipline

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

V1 implementation is ready for final product hardening when the frozen project answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or Page-private reconstructions; the model contains no normal-runtime Projectless Workflow state; the Default Project is only an ordinary Project reference/default UI target; dependency gates are coherent; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the active construction stage, execution baseline, current verified gaps, build order, and verification evidence. Historical checkpoint behavior is retained as evidence even when a later upstream design decision supersedes its target semantics.

# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The latest pushed implementation checkpoint is:

```text
eb6d98fb28be81d8153aca0429705b05846499de
fix: harden integrity batch failure safety
```

This baseline includes the completed Project Lifecycle, Initiative/Project organization, Project Milestone, Cycle Planning, shared Project/Cycle Workflow presentation, Workflow Issue Peek & Planning Properties, Project Details Editing, Initiative Details Editing, Label Configuration & Management, Status Configuration & Management, Milestone Details Editing, Global Search & Project-less Workflow, and Home Routing & Weekly Note slices, including the follow-up Weekly Note integrity hardening, plus the repository-audit-driven Integrity Batch Failure-Safety hardening and the quality-baseline cleanup between them. Earlier repository states remain available through Git history and are not repeated as competing execution baselines.

Gate 1 - Domain / Validation Completion, Gate 2 - Semantic Planning Completion, Gate 3 - Data / Persistence / Mutation Operational Completion, Gate 4 - Runtime / Index Foundation Completion, Gate 5 - Query / Derived Foundation Completion, Gate 6 - Application Foundation Completion, and Gate 7 - Shared UI Capability Completion are complete foundations for the current stage.

Gate 5 closure evidence includes Effective Structural Query Foundation at `858a74f49d74ca61c875ad54d78f58b0202fbd07` with CI #71, Canonical Derived Facts Foundation at `7cd07b638add1a7e7364f89c2fcc69d7cb2ed095` with CI #72, and the final Query audit finding no remaining executable shared/derived gap before product-specific selectors are frozen.

Gate 6 closure evidence includes:

- Core Work Application Coverage at `df003d6d0152ed3f39cdee7fb7fdfd78a20c41d0` with CI #73;
- the missing Initiative-create semantic owner corrected in `domain/planning` instead of bypassed by Application;
- canonical Application facades for Triage, Initiative, Project, Milestone, Workflow Issue, and Cycle use cases;
- Configuration Application Boundary at `6b3a9200b33b86843f59dfe848f496081b5b5b10` with CI #74;
- Configuration reference repair remaining explicit through `NeedsInput` while Source Sync owns authoritative plugin-data settlement;
- the Gate 6 Exit Audit finding that Workspace-State editing and create-time similarity remain intentionally consumer-driven because their concrete product contracts are not yet frozen.

Gate 7 closure evidence includes:

- Shared Overlay Interaction Foundation at `3d374ebab20b0120c879b215bacddf1cc64ffeaf` with CI #75;
- Trail-owned Dialog and AlertDialog mechanics over Radix primitives, consumed by Workflow completion input and Triage deletion;
- shared Application action-result handling, local time conversion, Runtime write gating, feedback, and stable entity-row ownership remaining canonical;
- the Gate 7 Exit Audit passing with no justified pre-consumer Slice B. Context Menu, Peek, Selection, Bulk Actions, Command Menu, property pickers, and later presentation primitives remain consumer-driven Gate 8 work.

Gate 7 and Gate 8 UI checkpoints are implementation evidence, not a formal presentation baseline. They validate Product semantics, Application/Mutation paths, host/library mechanics, and representative integration behavior. Unless a target UI answer is explicitly recorded upstream, the current React layout, CSS treatment, native form controls, page-local navigation, modal Peek/details carriers, and presentation composition are functional validation carriers and may be replaced wholesale during UI closure.

Gate 8 evidence now includes:

- **Project Lifecycle Closure** at `844728131f0a0acf7df4213322a7837c16b47dab`, exposing explicit Project lifecycle control while preserving Domain/Application ownership of completion legality and reusing one configured Status picker across Project and Workflow Issue consumers;
- Quality Baseline Hardening at `f84c6f10a4708cb11a85d1071a9dcf50c29b3603`, followed by the whitespace-only correction at `12a438d538400d4f377d0183f72f172bfce42e5b`;
- **Initiative Focus & Project Assignment** at `4b5171e67c1dd483f3812a618d3386a3725204ae`, implementing `Projects Root -> Initiative Focus -> Project Workspace`, Initiative creation, explicit Project Initiative assignment/unassignment, and optimistic relationship queries through existing Application semantics;
- **Project Milestone Management** at `d775e94aacbb8e8970e72f7f2dc8e1cf9f9e2d7a`, implementing Milestone creation, derived current-scope progress, Issue assignment/unassignment, and delete-with-Issue-preservation through existing Domain/Application owners;
- **Cycle Planning & Rollover** at `826424ff673499d3aaef1669875db2719b1d9e5a`, implementing explicit Cycle opening/membership/closing, optional rollover, and retained closed history without changing Issue facts;
- **Project / Cycle Board & List Interaction Foundation** at `c87723486e95c2915ff02388540e2fd189010b63`, introducing one shared Workflow presentation owner, Status-only Board drag over Atlassian Pragmatic Drag and Drop, Project swimlanes for Current Cycle, and the existing Status/Estimate mutation path as the non-drag and completion authority;
- the Board/List checkpoint passed 74/74 test files and 250/250 tests, zero-warning lint, TypeScript, production build, `git diff --check`, dependency audit with zero vulnerabilities, representative Obsidian drag/persistence validation, and GitHub verification of the exact 15-file pushed scope;
- Board/List completion records the interaction foundation only: final Board/card/column sizing, density, pane proportions, and any future List drag behavior remain later UI/interaction design work;
- **Workflow Issue Peek & Planning Properties** at `afd7ff5743fcd3497bf1dbcdd6c4493025996e5e`, adding the canonical planning-property edit path for title, description, Priority, Estimate, Due, and Labels; enforcing Completed-Estimate retention and safe managed-Markdown descriptions; and exposing one shared lightweight Issue-details carrier from Project/Cycle List and Board;
- the Peek checkpoint passed 78/78 test files and 261/261 tests, zero-warning lint, TypeScript, production build, and `git diff --check`; representative Obsidian validation confirmed property persistence, Priority editing, Completed-Estimate protection, reload convergence, and a clean Runtime with no pending or source-health residue;
- the current Radix Dialog is only a temporary carrier for the verified Peek content/editing contract. Final Linear-style Peek positioning, non-blocking interaction, keyboard traversal, dimensions, density, responsive behavior, and broader Selection/Context Menu/Command Menu integration remain later interaction/UI work;
- **Project Details Editing** at `982316b3adcbad23c42b4e487e111814c96895f8`, adding canonical lightweight Project editing for title, description, Priority, Due, and Labels while leaving Status and Initiative on their existing explicit controls;
- the Project Details checkpoint passed 83/83 test files and 271/271 tests, zero-warning lint, TypeScript, production build, and `git diff --check`; representative Obsidian validation confirmed title-driven source rename, property persistence, plugin reload convergence, preservation of the existing contained Workflow Issue, and a clean Runtime with no pending residue;
- **Initiative Details Editing** at `f24879238a705605f7d125621c60c40e6062a3f2`, adding canonical lightweight Initiative editing for title, description, Priority, Due, and Labels from Initiative Focus;
- the Initiative Details checkpoint passed 90/90 test files and 281/281 tests, zero-warning lint, TypeScript, production build, and `git diff --check`; representative Obsidian validation confirmed Initiative creation, title-driven source rename, description/Priority/Due persistence, plugin reload convergence, and a clean Runtime with no pending or source-health residue;
- **Label Configuration & Management** at `f23aa36b6327759fecc872510ae6c5546577c73e`, exposing Workspace-owned LabelGroup/Label management through Trail's Obsidian settings while preserving the existing Configuration Application, semantic planning, explicit reference repair, Source Sync, plugin-data persistence, and entity-side Label selection owners;
- the Label Configuration checkpoint passed 91/91 test files and 285/285 tests, zero-warning lint, TypeScript, production build, and `git diff --check`; representative Obsidian validation confirmed LabelGroup/Label create/edit/delete, Single/Multiple applicability, stable-ID rename behavior, destructive Multiple-to-Single reference repair across Project/Issue Markdown, Configuration persistence in `data.json`, Settings refresh after Runtime initialization, reload convergence, and a clean Runtime with no pending or source-health residue;
- **Status Configuration & Management** at `4ff7898e6add44b4d7dd7a441dda6d4543a94079`, extending the same Trail Settings surface with fixed-category Issue/Project Status create, rename, in-category reorder, default selection, and explicit destructive replacement while preserving the existing Configuration planner, Source Sync, plugin-data persistence, and Status consumers;
- the Status Configuration checkpoint passed focused zero-warning lint, focused Application/Label-regression/codec tests, TypeScript, a full `npm run check`, and `git diff --check`; representative Obsidian validation confirmed Status create/rename/reorder/default behavior, live picker/default-consumer refresh, destructive default/reference replacement, and reload convergence. Final read-only persistence evidence confirmed the deleted test Status had no Configuration or Markdown residue, the test Issue resolved to the replacement Backlog default, and `firstStartedAt`/`terminalAt` remained absent during definition-reference repair;
- **Milestone Details Editing** at `05a9aa25db09acb6c1c20e554435962efb567728`, adding canonical lightweight Milestone editing for title, description, and Due while preserving stable Milestone identity, owning Project, linked Workflow Issues, and derived progress;
- the Milestone Details checkpoint passed focused zero-warning lint, mechanism-focused planner/Application/materialization/UI/diagnostics coverage, a full `npm run check`, `git diff --check`, and diagnostics-bundle restoration. Representative Obsidian validation created `M-EDIT`, linked `HOST-Q Issue2`, edited the Milestone to `M-EDIT Renamed` with persisted description and Due, preserved the Issue's Milestone reference and progress across the edit, and converged after plugin reload with Runtime `ready`, empty pending state, and no source-health issues;
- **Global Search & Project-less Workflow** at `9aa3fcd5d1dff72954cd7d5fc95a844da0890d79`, adding deterministic read-only Runtime search across Initiative, Project, Milestone, Triage Issue, and Workflow Issue while reusing existing structural navigation, Workflow Peek, entity rows, and canonical Issue mutation owners;
- the Global Search checkpoint passed focused zero-warning lint, focused Search/project-less Application/placement/UI/diagnostics tests, TypeScript, representative Obsidian validation, a full `npm run check`, and final `git diff --check` after repairing a common Markdown EOF-deletion formatting edge. The host flow captured `SEARCH-PL`, accepted it with `projectId: null` into `Trail/Collections/Projectless Issues.md`, discovered and inspected it through Search, moved it from the project-less carrier into `BOARD-A`, opened `M-EDIT Renamed` through the existing Project hierarchy, and reloaded to Runtime `ready` with empty pending state and no source-health issues. The exposed EOF edge is fixed at the shared Markdown range-removal owner so deleting the final record canonicalizes only terminal line breaks while middle-record deletion stays byte-local;
- **Home Routing & Weekly Note** at `0b41143ba40843e3858249a1825f513366d03a3b`, making Home the default Trail entry point, composing configured time plus Current Cycle and work-structure summaries from readable Runtime, reusing existing Projects/Cycles routing, and adding Weekly Note as a lazy non-Domain Markdown utility through existing SourceIO and host write-guard boundaries;
- the Home checkpoint passed focused zero-warning lint, 6 focused test files with 14 tests including the architecture guard, TypeScript, diagnostics build, representative Obsidian validation, a full `npm run check`, final `git diff --check`, and diagnostics-bundle restoration. Host validation confirmed that opening Home did not eagerly create `Weekly Update.md`, first Save created it, re-entry and plugin reload preserved content, Archive wrote the configured-zone `2026-08-19` entry and cleared Current, Trail-owned create/modify events were suppressed by the write guard, and final Runtime was `ready` with empty pending state and no source-health issues; the temporary Weekly Note fixture was removed afterward;
- **Weekly Note Integrity Hardening** at `926c6ee7714c4171a91c53ead76848a325c321cf`, closing two post-implementation audit findings without changing Home or Weekly Note product scope: the utility repository now rejects H1/H2 headings in Current and Archive bodies before persistence, and Save/Archive carry the loaded Current snapshot as a write-time precondition so an external edit causes an explicit conflict instead of a stale overwrite; Application only carries that precondition while Home preserves the local draft and surfaces the error;
- the integrity checkpoint passed zero-warning lint, focused Weekly Note Application/repository/Home/Shell tests, TypeScript, diagnostics build, a full `npm run check`, final `git diff --check`, diagnostics-bundle restoration, and GitHub verification of the exact 7-file code scope. Representative Obsidian validation confirmed that reserved H2 content never reached persistence, H3 remained valid, an external `Weekly Update.md` edit triggered `external-refresh` and Runtime `ready -> refreshing -> ready`, the stale Home save failed with `Weekly Note Current changed on disk. Reopen Home before saving.`, the externally edited Current remained authoritative, and final Runtime was `ready` with empty pending state and no source-health issues; the temporary Weekly Note fixture was removed afterward;
- **Integrity Batch Failure-Safety Hardening** at `eb6d98fb28be81d8153aca0429705b05846499de` closes the repository-audit finding that a logically atomic multi-carrier repair could previously persist an unsafe ordinary-failure prefix. Physical Integrity Batch plans now use the ordered `prepare -> destructive -> commit` stage contract, mixed Plugin Data + Domain materialization proves a safe pre-commit bridge before I/O, plugin-data cutover occurs last when that bridge is valid, and the executor rejects malformed stage contents while retaining durable-prefix evidence for recovery;
- the Integrity Batch hardening passed zero-warning lint, focused projection/materialization/executor/Source Sync owner tests, a cross-consumer matrix covering Status and Label configuration, generic configuration repair, destructive planners, Mutation coordination, Project Delete materialization, and Source Sync settlement/recovery, TypeScript, diagnostics build, a full `npm run check`, final `git diff --check`, and diagnostics-bundle restoration. The hardening deliberately preserves the existing destination-first Project Delete duplicate-over-loss policy and does not introduce a general rollback framework, transaction graph, or new Product/Domain/Data model;
- repository-root `Trail/` remains versioned as disposable host-test observation data. The repository development Vault also versions `.obsidian/plugins/trail/data.json` so its Configuration/Workspace State reference IDs remain coherent with checked-in `Trail/` observations across machines; generated plugin bundles, diagnostics, graph state, and workspace state remain ignored. These development-Vault values are not Product facts or production defaults;
- lint fails on warnings through `eslint . --max-warnings=0`, and the dev-only transitive `nanoid` resolution remains at the audited fixed version `3.3.18`.

Push-triggered GitHub Actions status for the recent Gate 8 commits was not available through the connected GitHub workflow lookup, so this document does not invent CI run numbers for those commits.

Current implementation facts in this document are expected to move as work advances; stable target answers remain in the upstream project documents, including `ui.md` for resolved target presentation and interaction answers.

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

The active strategy is dependency-aware vertical implementation:

```text
established canonical foundations
-> coherent product workflow
-> consumer-driven shared mechanism where justified
-> focused verification
-> next workflow
```

A missing upper-layer feature must not cause a temporary lower-layer model, placeholder entity, compatibility path, fake default, or second mechanism. If product implementation exposes a concrete lower-layer omission, correct the canonical lower-layer owner before consuming it.

## 3. Reuse

Reuse existing canonical owners and mature external primitives where they remove well-understood interaction risk instead of rebuilding them per page.

Current reusable capability areas include:

- Domain model, rules, validation, and semantic planning;
- Markdown schema/codecs and authoritative Persistence;
- shared Mutation materialization/execution and Source Sync;
- committed/effective Runtime, source ownership, reconciliation, and structural/reference indexes;
- shared structural and explicitly defined derived Query capabilities;
- currently executable Application use cases;
- validated UI-side mechanisms and evidence such as action-result handling, local time conversion, Runtime write gating, Application-backed Status/Label/property paths, Status-only Board drag semantics with the proven drag-and-drop mechanism, Obsidian Settings integration, and Radix modal mechanics for genuinely modal consumers;
- Diagnostics and architecture guards.

Reuse of current UI work means reuse the canonical mechanism or evidence when it still fits the resolved target, not preservation of the current POC presentation. The present shell layout, CSS treatment, native select/form composition, page-local navigation, modal Peek/details carriers, and Workflow List/Board presentation are non-authoritative and may be replaced rather than migrated.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. UI must keep drafts/continuous interaction local and emit only Application intents for authoritative changes.

A shared UI owner is introduced when there is real reuse pressure, a sufficiently stable contract, and a clear reduction in duplicate mechanism. Existing consumer count is evidence, not a mechanical threshold. Similar-looking controls remain separate when their candidates, interaction rules, or Application mapping are materially different.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 8 - Product Workspace Implementation**.

Gate 8 is planned around user workflows rather than component inventories. During formal UI closure, target design starts from Product responsibilities and Architecture ownership, maps equivalent Linear behavior onto Obsidian/browser host capabilities first, records resolved Trail presentation and interaction answers in `ui.md`, and only then maps those answers to implementation owners. Current Trail rendering is not a design input; it is consulted afterward only for reusable mechanisms and evidence.

Completed Gate 8 slices:

- **Project Lifecycle Closure** at `844728131f0a0acf7df4213322a7837c16b47dab`;
- **Initiative Focus & Project Assignment** at `4b5171e67c1dd483f3812a618d3386a3725204ae`;
- **Project Milestone Management** at `d775e94aacbb8e8970e72f7f2dc8e1cf9f9e2d7a`;
- **Cycle Planning & Rollover** at `826424ff673499d3aaef1669875db2719b1d9e5a`;
- **Project / Cycle Board & List Interaction Foundation** at `c87723486e95c2915ff02388540e2fd189010b63`;
- **Workflow Issue Peek & Planning Properties** at `afd7ff5743fcd3497bf1dbcdd6c4493025996e5e`;
- **Project Details Editing** at `982316b3adcbad23c42b4e487e111814c96895f8`;
- **Initiative Details Editing** at `f24879238a705605f7d125621c60c40e6062a3f2`;
- **Label Configuration & Management** at `f23aa36b6327759fecc872510ae6c5546577c73e`;
- **Status Configuration & Management** at `4ff7898e6add44b4d7dd7a441dda6d4543a94079`;
- **Milestone Details Editing** at `05a9aa25db09acb6c1c20e554435962efb567728`;
- **Global Search & Project-less Workflow** at `9aa3fcd5d1dff72954cd7d5fc95a844da0890d79`;
- **Home Routing & Weekly Note** at `0b41143ba40843e3858249a1825f513366d03a3b`, integrity-hardened at `926c6ee7714c4171a91c53ead76848a325c321cf`.

The completed **Project Details Editing** slice closes the lightweight Project-facts editing gap without merging Status or Initiative relationship changes into the same interaction:

```text
Project Workspace
-> open lightweight Project details editor
-> edit Project planning properties
-> canonical Semantic Plan / Application Replace
-> authoritative Project Markdown rewrite
-> title change optionally renames the file-backed Project source
-> same Project identity and contained entities remain intact
```

The slice:

1. adds a canonical Project planning-property edit planner rather than mutating Project Domain objects from UI;
2. exposes `ProjectApplication.editProperties` with command normalization, stale-baseline protection, Domain validation, and no-op detection;
3. edits title, description, Priority, Due, and Labels while preserving identity, Status, Initiative relation, and unrelated canonical fields;
4. continues to rely on canonical Label applicability and single-selection rules instead of duplicating Label business rules in UI;
5. generalizes the managed-record body guard so both Project and Workflow Issue descriptions reject root H1/H2 structure while allowing ordinary Markdown, H3-H6, and fenced examples;
6. reuses one shared Label editor across Workflow Issue Peek and Project Details once a second real consumer establishes reuse pressure;
7. keeps Project Status and Initiative assignment on their existing explicit Project Workspace controls rather than duplicating them inside the details dialog;
8. reuses the existing Trail Dialog primitive as a temporary lightweight Project details carrier and the existing configured-timezone local date/time conversion for Due;
9. preserves file-backed source identity semantics: editing a Project title rewrites the authoritative source and materializes the canonical Project path rename in the same transaction;
10. extends diagnostics so real-host evidence correlates Project-property UI intent with mutation, source processing, source rename, committed Runtime publication, and pending convergence.

The Project Details host scenario edited `BOARD-B` to `BOARD-B DETAILS`, persisted description/Priority/Due, renamed `Trail/Projects/0002 BOARD-B.md` to `Trail/Projects/0002 BOARD-B DETAILS.md`, preserved the contained `B-LANE` Workflow Issue, and remained correct after plugin reload with empty Runtime pending state. The host fixture had no configured Labels, so Label editing is established by planner/Application/UI automated coverage rather than that representative host scenario.

This slice validates the Project-details content/editing and title-rename contract, not final Project Workspace visual design. The Dialog carrier remains a functional intermediate surface; broader property-presentation polish, final pane/layout density, Selection/Context Menu/Command Menu composition, and other UI refinement remain later Gate 8 work.

The completed **Initiative Details Editing** slice closes the equivalent lightweight Initiative-facts editing gap without introducing Initiative Status or another relationship model:

```text
Initiative Focus
-> open lightweight Initiative details editor
-> edit Initiative planning properties
-> canonical Semantic Plan / Application Replace
-> authoritative Initiative Markdown rewrite
-> title change optionally renames the file-backed Initiative source
-> same Initiative identity and Project relationships remain intact
```

The slice adds the Initiative properties planner/Application path, reuses configured-timezone Due conversion and the shared Label editor, applies the managed-record H1/H2 body guard to Initiative descriptions, preserves file-backed rename semantics, and extends diagnostics through the same mutation/persistence/reconcile chain used by Project details. The representative host scenario created `INIT-HOST`, edited it to `INIT-HOST DETAILS`, persisted description/Priority/Due, renamed its authoritative Markdown source, and remained correct after reload with empty Runtime pending state and no source-health issues.

That host run also exposed a development-Vault integrity problem rather than an Initiative feature defect: versioned `Trail/` Markdown referenced StatusDefinition IDs from one machine while plugin `data.json` on another machine contained independently bootstrapped IDs. The development Vault now versions its `data.json` alongside `Trail/` observation data so those two authoritative persistence classes stay coherent during cross-machine host validation.

The completed **Label Configuration & Management** slice turns the existing Label infrastructure into an actual product capability without introducing a second Configuration path:

```text
Settings -> Trail -> Labels
-> create/edit/delete LabelGroups and Labels
-> Configuration Application / semantic planning
-> explicit reference repair when required
-> Source Sync / authoritative data.json
-> Runtime Configuration refresh
-> Initiative / Project / Issue Label selection
-> authoritative Markdown labelIds
```

The slice:

1. exposes LabelGroup/Label management through Obsidian's declarative Plugin Settings API and refreshes the settings surface when Runtime Configuration becomes available after initialization;
2. supports LabelGroup name, Single/Multiple selection mode, Initiative/Project/Issue applicability, and Label create/rename/move/delete while keeping stable IDs authoritative;
3. routes every change through the existing Configuration Application and semantic planner rather than saving `data.json` directly from Settings;
4. preserves explicit `NeedsInput` reference repair for destructive changes. Removing applicability, deleting Labels/Groups, or changing a Group from Multiple to Single clears only Label selections that become invalid and preserves the work entities themselves;
5. avoids arbitrary data selection during Multiple-to-Single repair: an entity with conflicting Labels from that Group loses the conflicting Group selection instead of Trail silently choosing one Label, while already-valid single selections remain;
6. canonicalizes LabelGroup and Label ordering by stable ID before submission so strict Configuration postconditions match the plugin-data codec's canonical physical ordering instead of producing a false postcondition failure after a successful save;
7. keeps entity-side selection in the existing shared Label editor, so Initiative, Project, and Workflow Issue consumers immediately use newly configured values according to applicability and Single/Multiple rules;
8. keeps Settings drafts local until an explicit create/save/delete action emits an Application intent; Runtime publication then refreshes the declarative settings definitions from authoritative Configuration.

Representative host validation created `Area` and `Technology` groups, created and renamed stable-ID Labels, applied Labels to Initiative/Project/Issue records, and then changed `Technology` from Multiple to Single. Explicit reference repair cleared the Project's conflicting two-Label Technology selection while preserving `B-LANE`'s valid TypeScript selection and all Area selections. The final fixture contains `Area` and `Technology` plus `Professional`, `Personal`, `TypeScript`, and `Obsidian`; Initiative, Project, and Issue Markdown retain the expected stable Label IDs. Reloaded Runtime remained `ready` with empty pending state and no source-health issues.


The completed **Status Configuration & Management** slice turns the existing Status infrastructure into an explicit Workspace configuration capability without introducing another persistence or lifecycle path:

```text
Settings -> Trail -> Statuses
-> create / rename / reorder within a fixed Category
-> set Category default
-> delete with explicit default/reference replacement when required
-> Configuration Application / semantic planning
-> Source Sync / authoritative data.json + affected Markdown
-> Runtime Configuration refresh
-> existing Status picker and creation consumers
```

The slice:

1. replaces the Label-only settings owner with one Trail Settings surface that composes Status and Label configuration rather than creating separate settings mechanisms;
2. adds semantic Status intents to the existing Configuration Application for create, rename, in-category reorder, default selection, and delete while continuing to route authoritative change through the generic Configuration planner;
3. keeps Status Category immutable in V1. Reorder, default selection, and destructive reference repair are limited to the same entity type and fixed Category rather than treating a Category change as an ordinary configuration edit;
4. preserves default semantics: changing a Category default affects future creation/default consumers and does not rewrite existing Entity references;
5. keeps deletion inputs explicit. Deleting the current default and replacing existing Entity references are separate requirements, even when the user chooses the same replacement Status for both;
6. treats definition-reference repair as semantic configuration migration, not a lifecycle transition. Repair changes only `statusDefinitionId`, so lifecycle timestamps and completion requirements are not recomputed;
7. canonicalizes logical StatusDefinition ordering to the plugin-data codec's physical entity/category ordering so strict authoritative reread postconditions converge after create/reorder operations;
8. adds a codec round-trip guard for multiple ordered Status definitions and a mechanism-focused Application test set rather than duplicating equivalent Issue/Project business-path tests.

Representative host validation created and renamed `HOST-Q Ready`, changed its Backlog order/default, created `HOST-Q Issue` through the real Workflow Issue consumer, then deleted the configured Status while explicitly selecting both the new Backlog default and the existing-reference replacement. Reload converged correctly. Because the host session temporarily lost diagnostics when a production build replaced the development bundle, the operation sequence is supported by direct user observation while final persistence was independently re-read: `HOST-Q Ready` had zero Configuration/Markdown residue, `HOST-Q Issue` resolved to the Backlog default, and `firstStartedAt` plus `terminalAt` remained absent. Development host verification therefore keeps diagnostics enabled continuously so accidental or corrected user actions remain observable rather than relying on final persistence alone.

The completed **Milestone Details Editing** slice closes the remaining known lightweight Milestone-facts editing gap without introducing an independent Milestone lifecycle or moving Project ownership into the editor:

```text
Project Workspace -> Milestone Edit
-> edit Title / Description / Due
-> canonical Semantic Plan / Application Replace
-> same-carrier Project Markdown record replacement
-> Runtime publication / existing Milestone progress queries
-> same Milestone identity, Project ownership, and Issue references remain intact
```

The slice adds `MilestoneApplication.editProperties`, stale-baseline protection and normalized no-op handling, reuses the existing Milestone record replacement path inside the owning Project Markdown source, exposes a Trail Dialog from the Milestone row, and extends diagnostics with `ui.milestone.properties.*` without recording description content. Project ownership remains immutable in this editing surface, and Milestone progress continues to be derived from linked Workflow Issues rather than stored as Milestone lifecycle state.

Representative host validation created `M-EDIT`, assigned `HOST-Q Issue2`, edited the Milestone to `M-EDIT Renamed` with description `Milestone host detail check` and a new Due, and then reloaded the plugin. Diagnostics showed `workflow.milestone.edit-properties` as one `replace-entity`, authoritative processing of `Trail/Projects/0001 BOARD-A.md`, Runtime publication, mutation commit, and UI completion. After reload, authoritative Markdown and Runtime retained the edited Milestone under the same stable ID and Project ID, `HOST-Q Issue2` still referenced that Milestone, pending state was empty, and source health was clean.

The completed **Global Search & Project-less Workflow** slice closes the known discovery gap for Workflow Issues that intentionally have no Project without inventing another page-specific data model or saved-view schema:

```text
Search
-> read current readable Runtime
-> deterministic title / description matching
-> Initiative / Project / Milestone -> existing Projects hierarchy
-> Workflow Issue -> existing row + Peek
-> Triage Issue -> existing Triage row

Triage -> Accept -> No Project
-> existing Projectless Issues Markdown carrier
-> Search discovery / Peek
-> existing move-to-Project mutation
-> owning Project Markdown carrier
```

The slice:

1. adds a product-specific read-only Search query over the current readable Runtime instead of introducing another persistence layer, background index, fuzzy-search dependency, or Workspace State schema;
2. searches title-bearing Initiative, Project, Milestone, Triage Issue, and Workflow Issue records by normalized title and description, with deterministic exact/prefix/title-contains/description ordering; Cycles remain on their time-oriented surface because they do not own a canonical user-facing title;
3. routes Initiative and Project results into the existing Projects hierarchy, opens a Milestone through its owning Project, and reuses the established Workflow Issue row/Peek and Triage row rather than creating a second details surface;
4. restores the Domain's existing optional-Project Triage Accept contract at the Application/UI boundary and exposes an explicit `No Project` choice instead of requiring a Project only because the earlier UI lacked discovery;
5. reuses the existing `Trail/Collections/Projectless Issues.md` carrier and generic cross-source move-to-Project mutation. A project-less Workflow Issue therefore remains a normal Issue and becomes Project-owned through the same existing `moveToProject` capability;
6. keeps Search transient and read-only. It does not freeze Home, Custom View, Favorites, Filter, Group, Sort, or saved-presentation contracts that remain intentionally deferred;
7. extends diagnostics for Triage Accept so `projectId: null` is explicit, while Search itself does not emit mutation telemetry because query/open actions are read-only;
8. fixes the shared Markdown EOF record-deletion edge exposed by the host flow: when a deleted record reaches EOF, `removeMarkdownRange` now reduces terminal separators to the source's single line ending, while middle-record deletion remains byte-local. Direct Domain Source regression coverage prevents empty Triage/Projectless carriers from accumulating a blank line at EOF.

Representative host validation captured `SEARCH-PL` in Triage, accepted it with `No Project`, found it through Global Search, opened the existing Workflow Peek, reassigned it to `BOARD-A` from Search, opened `M-EDIT Renamed` through the existing Project hierarchy, and reloaded the plugin. Diagnostics recorded `ui.triage.accept.*` with `projectId: null`, authoritative creation in `Projectless Issues.md`, `ui.workflow.issue-project.*` from `sourceProjectId: null` to `BOARD-A`, processing of both old/new carriers, committed Runtime publication, and empty pending state. Reloaded evidence showed `SEARCH-PL` owned by `Trail/Projects/0001 BOARD-A.md`, empty Triage/Projectless containers, Runtime `ready`, and no source-health issues.

The completed **Home Routing & Weekly Note** slice closes the executable Home-shell and Weekly Note gap without turning Home into a separate data system or freezing deferred Workspace State contracts:

```text
Trail open
-> Home default route
-> configured Date / Time
-> readable Runtime Home query
   -> Current Cycle summary
   -> Initiative / Project counts
-> existing Projects / Cycles routing

Weekly Note
-> lazy Trail/Collections/Weekly Update.md
-> load Current + dated Archive entries
-> Save Current -> SourceIO create/process
-> Archive Current -> ## YYYY-MM-DD
-> existing host write guard suppresses Trail-owned Vault events
```

The slice:

1. makes Home the default Trail page while keeping Triage, Search, Projects, and Cycles as existing sibling surfaces rather than introducing another navigation or workspace model;
2. adds a read-only Home query over readable Runtime for Initiative/Project counts and the current open Cycle summary, so Home composition does not introduce another persisted projection or index;
3. renders Date/Time from Trail's configured timezone and routes Home summary actions into the existing Projects and Cycles pages;
4. keeps Weekly Note explicitly outside the Domain model. Its canonical structured shape lives with Markdown schema ownership while a persistence utility repository owns physical `Trail/Collections/Weekly Update.md` parsing and writing;
5. keeps Weekly Note reads lazy: a missing file produces an empty snapshot and merely opening Home does not create the source. The first Save creates the canonical file, while later Save/Archive operations use the existing SourceIO process path;
6. keeps Application independent from Persistence through a Weekly Note gateway capability. Weekly Note writes reuse Runtime write gating, while reads remain available without introducing Domain mutation planning for a non-Domain utility;
7. preserves user drafts locally in the Home UI rather than reloading them on unrelated Runtime revisions; explicit Home re-entry or plugin reload rereads authoritative Markdown;
8. reuses the existing host write guard for Trail-owned create/modify events, preventing Weekly Note persistence from causing an unnecessary managed-source refresh loop;
9. leaves Triage Summary and Activity Heatmap as the remaining Home V1 composition work; saved Views, Favorites, generic Filter/Group/Sort, and Home customization persistence remain deferred until concrete Product consumers justify their contracts.

Representative host validation opened Trail directly on Home, exercised the existing Projects/Cycles routes, created Current through the first Weekly Note Save, reread the note after navigation, archived it under `2026-08-19` using the development Vault's configured timezone, and reloaded the plugin with the archived state intact. Diagnostics recorded SourceIO `create` and `process` completion together with matching `trail-write-suppressed` host events. Final validation evidence showed Runtime `ready`, empty pending state, no source-health issues, and the expected archived Markdown; the host fixture was then removed so versioned `Trail/` data returned to its checkpoint baseline.

The `926c6ee7714c4171a91c53ead76848a325c321cf` integrity follow-up hardens the same existing owners rather than adding another persistence or state mechanism. Weekly Note H1/H2 structure is validated before any create/process write, H3-H6 remain valid body content, and Save/Archive compare the latest parsed Current against the snapshot originally loaded by Home before transforming the source. A conflict rejects the write while preserving the local draft for explicit user reconciliation. The corrective Host pass verified both boundaries against the real Vault: invalid H2 input never reached `Weekly Update.md`, and a native external edit remained authoritative when a stale Home draft attempted to save; navigating away and back then reread the external Current.

The `eb6d98fb28be81d8153aca0429705b05846499de` **Integrity Batch Failure-Safety Hardening** checkpoint is a lower-layer corrective slice discovered by repository-wide audit, not a new Product feature. It strengthens the existing Mutation topology while preserving the already-established planner, persistence, Source Sync, and Runtime ownership model:

```text
logical multi-carrier repair
-> dequeue-time materialization
-> classify prepare / destructive / commit stages
-> for mixed Plugin Data + Domain repair, prove the pre-commit bridge before I/O
-> prepare non-destructive Domain changes
-> destructive Domain carrier removal when required
-> commit plugin data last when present
-> authoritative settlement or full recovery
```

The hardening:

1. centralizes logical-effect projection so optimistic Runtime replay and materialization bridge checks consume the same state-effect semantics rather than maintaining parallel mutation interpretations;
2. fixes Integrity Batch to the ordered `prepare -> destructive -> commit` contract, omitting empty stages while giving each present stage a narrow operation responsibility;
3. projects mixed Configuration/Domain repairs before I/O and permits them only when Entity repair can first reach a state valid under both the current and next Configuration/Workspace State. A non-bridgeable cutover is rejected before persistence rather than partially writing and relying on rollback;
4. moves plugin-data replacement to the final commit stage for bridgeable mixed repairs while preserving ordinary single plugin-data replacement as a Single Transaction;
5. makes the executor independently validate stage topology, stop on the first failed operation, and surface the durable completed prefix so existing Source Sync recovery has concrete persistence evidence;
6. retains Project Delete's existing destination-first safety tradeoff. If target Issue preparation succeeds but later source destruction fails, a detectable duplicate/error is still preferred to silent loss and authoritative recovery remains the convergence boundary;
7. deliberately does not add a general transaction graph, batch filesystem transaction, recursive rollback state machine, or speculative compensation policy.

This slice is verified entirely at the shared mechanism and consumer-contract layers because its independent risks are injected persistence failures and illegal stage/cutover shapes, not an Obsidian-only UI or host behavior. No additional manual Host scenario is required for this checkpoint.

### 4.2 Current verified gaps

Current Product gaps split into three groups:

- Product composition gaps whose lower-layer owners already exist, including remaining Home composition (Triage Summary and Activity Heatmap), future saved View composition, and other workflow surfaces selected from the current Product contract rather than a pre-ordered component list;
- consumer-driven shared UI gaps such as Selection, Bulk Actions, Context Menu, Command Menu, broader property pickers, and later saved presentation state;
- lower-layer gaps newly exposed by concrete Product consumers, which must still be repaired at their canonical owners rather than hidden behind Page-local workarounds.

Label Configuration & Management is no longer a verified gap. Workspace Configuration now has a user-facing Label management surface, and Initiative/Project/Issue Label selection has representative host evidence through `data.json`, Markdown persistence, explicit reference repair, and Runtime convergence.

Status Configuration & Management is also no longer a verified gap. Issue and Project Status definitions, fixed-category ordering, defaults, and destructive replacement are now editable through the same Trail Settings boundary while existing Status consumers continue to read Runtime Configuration.

Milestone Details Editing is no longer a verified gap. Title, description, and Due now have a canonical Milestone edit path while Project ownership, stable identity, linked Workflow Issues, and derived progress remain unchanged.

Global Search and project-less Workflow discovery are no longer verified gaps. Triage Accept now preserves the Domain's optional Project contract, project-less Workflow Issues remain discoverable through Search and existing Peek, and the existing move-to-Project path can later attach them to a Project without introducing a dedicated project-less page.

Home Routing & Weekly Note are no longer verified gaps. Trail now has a default Home route, configured Date/Time, Current Cycle and work-structure summaries, existing Projects/Cycles routing, and a lazy non-Domain Weekly Note backed by canonical Markdown and existing SourceIO/write-guard boundaries. The `926c6ee7714c4171a91c53ead76848a325c321cf` integrity follow-up also closes the known Weekly Note structural-heading and stale-Current overwrite findings without adding Domain or Runtime state.

The Integrity Batch unsafe-prefix audit finding is no longer a verified lower-layer gap. Bridgeable mixed repairs now have an explicit safe cutover, non-bridgeable repairs fail before I/O, malformed stage plans are rejected by execution, and ordinary failure prefixes are surfaced to the existing authoritative recovery path without introducing a parallel transaction system.

Home V1 now has a frozen composition: Date/Time, Current Cycle Summary, Triage Summary, Projects/Initiatives Summary, Activity Heatmap, and Weekly Note. Current implementation still needs Triage Summary and Activity Heatmap. Focus is not a current Trail V1 concept. Saved Views, Favorites, and any Home customization persistence remain deferred until real use establishes a concrete need and contract. Global Search and the current Home query remain transient Runtime projections and do not freeze or substitute for future Workspace State contracts.

The next Gate 8 direction is formal UI closure against Linear as Trail's primary visual and interaction reference. UI design is target-state work: start from Product responsibilities, apply Architecture ownership, map equivalent Linear behavior onto Obsidian/browser host capabilities first, record the resolved Trail presentation and interaction answer in `ui.md`, and only then map it to code. Current Trail rendering is functional evidence, not a visual, layout, or component baseline. Lower-layer work is introduced only when the resolved target exposes a concrete gap.

Product and Domain now clarify Home V1 composition, Activity Heatmap derivation, and the removal of the previously ambiguous Home Focus concept. Data and Architecture need no ownership or persistence-model change for that clarification. `ui.md` is the dedicated authority for resolved target presentation and interaction answers, while Design-to-Code Map traces those answers to implementation owners. Architecture continues to carry the established Integrity Batch safe staged-cutover and recovery contract.

## 5. Build Order

Implementation proceeds through dependency-ordered gates. Within Gate 8, slices are ordered by user-value dependency rather than by component type.

```text
1. Domain / Validation Completion          COMPLETE
   |
2. Semantic Planning Completion           COMPLETE
   |
3. Data / Persistence / Mutation Operational Completion   COMPLETE
   |
4. Runtime / Index Foundation Completion   COMPLETE
   |
5. Query / Derived Foundation Completion   COMPLETE
   |
6. Application Foundation Completion       COMPLETE
   |
7. Shared UI Capability Completion         COMPLETE
   |
8. Product Workspace Implementation        ACTIVE
   |
9. V1 Integration / Hardening
```

### 5.1 Gates 1-7

Complete. The frozen V1 Domain, semantic planning, persistence/mutation, Runtime/index, Query, Application, and justified pre-consumer shared UI foundations have canonical implementation/test ownership. For UI-related checkpoints, completion means the required mechanisms and evidence exist; it does not freeze their current POC presentation as the formal UI target.

### 5.2 Gate 8 - Product workspaces

Active. Build coherent user workflows by composing the established foundations. Re-audit dependencies after each meaningful slice instead of pre-ordering Peek, Context Menu, Selection, or other components as an infrastructure sequence.

Completed:

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
- Global Search & Project-less Workflow;
- Home Routing & Weekly Note.

Active:

- UI closure is the active Gate 8 direction: define and implement the formal Trail UI target from Product, Architecture, and `ui.md`, using Linear as the presentation/interaction reference and Obsidian/browser host reuse first; complete Triage Summary and Activity Heatmap on Home; and repair only concrete lower-layer gaps exposed by resolved target consumers.

### 5.3 Gate 9 - V1 hardening

Complete integration, recovery, performance, responsive behavior, diagnostics boundaries, regression evidence, and release readiness without redefining upstream semantics for implementation convenience.

## 6. Risk & Verification

For each active Gate 8 slice:

- verify the current repository and the concrete Product workflow before defining changes;
- for formal UI work, derive the target from Product, Architecture, `ui.md`, Linear reference evidence, and Obsidian/browser capabilities rather than from current Trail rendering;
- inspect current UI only after the target is resolved, and reuse only mechanisms/evidence that still fit that target;
- reuse existing Query/Application/shared UI owners before adding another mechanism;
- repair exposed lower-layer gaps at the canonical owner instead of Page-local workarounds;
- run focused tests for changed owners and directly affected shared owners while iterating;
- run one full `npm run check` at the coherent stable checkpoint before commit;
- run `git diff --check` before checkpoint;
- keep `npm audit` clean when dependency state changes or a security advisory is encountered;
- use representative real Obsidian validation when the slice changes host-specific, persistence, focus/portal, drag/pointer, keyboard, or other behavior that jsdom/pure tests cannot establish reliably;
- keep the diagnostics-enabled bundle loaded throughout interactive development-host verification. `npm run check` and production builds may replace it with diagnostics-disabled output, so restore `npm run build:diagnostics` before returning the Vault to further manual interaction.

The completed Peek checkpoint reused the existing Radix portal/focus primitive while adding a new cross-workspace consumer and a new authoritative Issue property mutation. Automated coverage and representative real-Obsidian validation both passed. Host evidence covered Project/Cycle access to the same Issue state, planning-property persistence, Priority editing, Completed-Estimate protection, plugin reload convergence, and clean Runtime settlement. The current Dialog was validated only as a temporary functional carrier, not as final Peek interaction or visual design.

The completed Project Details checkpoint reused the established Project Application/Source Sync path while adding the canonical Project planning-property edit planner and a second consumer of shared Label editing. Automated coverage and representative real-Obsidian validation both passed. Host evidence covered Project title-driven file rename, description/Priority/Due persistence, preservation of contained Workflow Issue data, plugin reload convergence, and empty Runtime pending state; the representative host configuration had no Labels, so Label interaction remained automated-test evidence only.

The completed Initiative Details checkpoint extended the same property-editing and file-backed rename contract to Initiative while preserving Initiative identity and Project relationships. Automated coverage and representative real-Obsidian validation both passed at 90/90 test files and 281/281 tests. The host run also verified the development-Vault persistence boundary after checking in `data.json` so cross-machine Configuration IDs and versioned `Trail/` observation records initialize coherently.

The completed Label Configuration checkpoint reused the existing Configuration Application, semantic planning, explicit reference-repair, Source Sync, plugin-data, Runtime, and entity Label-selection owners rather than creating a Settings-specific persistence path. Automated coverage and representative real-Obsidian validation both passed at 91/91 test files and 285/285 tests. Host evidence covered Settings initialization refresh, LabelGroup/Label create/edit/delete, stable-ID rename propagation, Initiative/Project/Issue selection, Multiple-to-Single destructive repair, authoritative `data.json` and Markdown persistence, strict Configuration postcondition convergence, and final Runtime `ready` with empty pending state and no source-health issues.

The completed Status Configuration checkpoint reused the same Configuration planner, Source Sync, plugin-data, Runtime, and Status consumer owners while adding Status-specific Application intents and the combined Trail Settings surface. Focused owner-level checks and the full repository `npm run check` passed, followed by `git diff --check`; the development bundle was then restored with `npm run build:diagnostics`. Representative host evidence covered fixed-category create/rename/reorder/default behavior, real Workflow Issue default consumption, explicit delete-time default/reference replacement, reload convergence, and final persistence showing no deleted-Status residue or lifecycle-timestamp side effects.

The completed Milestone Details checkpoint reused the existing Milestone Domain record, generic identity-preserving Replace materialization, Project Markdown carrier, Runtime reconciliation, Trail Dialog, and derived progress query rather than adding a second editing or persistence mechanism. Focused owner-level checks and the full repository `npm run check` passed, followed by `git diff --check`; the development bundle was then restored and explicitly verified to contain the diagnostics evidence command. Real-host diagnostics correlated Milestone UI submission/completion with one `workflow.milestone.edit-properties` Replace, Project-source processing, Runtime publication, and mutation commit. Reload evidence retained `M-EDIT Renamed`, its description/Due, the same stable Milestone and Project IDs, and the `HOST-Q Issue2` reference with Runtime `ready`, empty pending state, and no source-health issues.

The completed Global Search & Project-less Workflow checkpoint reused readable Runtime state, existing entity rows/Peek, structural Project routing, the existing project-less carrier, and the canonical move-to-Project mutation instead of introducing search persistence or another Issue lifecycle. Focused Search/project-less tests, TypeScript, and representative real-host validation passed. The first full `npm run check` also passed, while `git diff --check` exposed an EOF separator left by deleting the last record from Triage and Projectless managed collections. That lower-layer Markdown-core edge was repaired at `removeMarkdownRange`, covered by direct Domain Source regression, and the final full `npm run check` plus `git diff --check` passed with diagnostics rebuilt afterward. Host evidence confirmed No-Project Accept, project-less Search/Peek discovery, cross-carrier reassignment to `BOARD-A`, structural Milestone routing, reload convergence, empty pending state, and clean source health.

The completed Home Routing & Weekly Note checkpoint reused readable Runtime state, configured-time conversion, existing Projects/Cycles routing, the canonical Weekly Update path, SourceIO, and the host write guard rather than introducing a Home data store, Domain entity, or second persistence path. Focused lint and tests passed after correcting two test-only contract mistakes, followed by TypeScript, diagnostics build, representative real-host validation, a full `npm run check`, final `git diff --check`, and diagnostics-bundle restoration. Host evidence covered lazy source creation, Current persistence, navigation/reload reread, dated Archive persistence, SourceIO create/process completion, suppression of matching Trail-owned Vault events, Runtime `ready`, empty pending state, clean source health, and restoration of the versioned `Trail/` host-test baseline.

The `926c6ee7714c4171a91c53ead76848a325c321cf` Weekly Note integrity checkpoint then repaired the two audit findings at the utility repository boundary and passed zero-warning lint, focused Weekly Note/Application/Home/Shell tests, TypeScript, a full `npm run check`, `git diff --check`, and diagnostics-bundle restoration. Real-host evidence showed the reserved-heading guard prevented H2 from reaching persistence and the stale-Current precondition rejected an overwrite after an external managed-file edit. Diagnostics captured the external `modify` as `external-refresh`, Runtime convergence back to `ready`, and the rejected SourceIO process with the explicit conflict message; final evidence retained the external Current with empty pending state and clean source health.

The `eb6d98fb28be81d8153aca0429705b05846499de` Integrity Batch Failure-Safety checkpoint hardened the existing shared Mutation/Runtime boundaries rather than adding a feature-specific recovery path. Focused owner tests first established Runtime effect projection reuse, bridgeable mixed Configuration/Domain materialization, fixed physical stage contents, executor rejection of malformed batches, and durable-prefix evidence across prepare/destructive/commit failure points. A second consumer matrix passed across Status and Label Configuration Application, generic Configuration planning, destructive planners, Mutation coordination, Project Delete materialization, Integrity Batch settlement, and Authoritative Source Sync. Zero-warning lint, TypeScript, diagnostics build, full `npm run check`, final `git diff --check`, and diagnostics-bundle restoration then passed on the frozen seven-file code scope. Because the independent risk is synthetic persistence failure ordering rather than a host-specific interaction, this checkpoint intentionally reuses existing repository/Source Sync host evidence instead of adding a redundant manual Obsidian scenario.

Gate completion is recorded only after repository-grounded audit plus passing implementation evidence. Product, Domain, Data, Architecture, UI Design, and Design-to-Code Map change only when their corresponding project answers truly change.

## 7. Final State

V1 implementation is ready for final product hardening when the frozen project answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or page-private reconstructions; the dependency gates are complete; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the active construction stage, execution baseline, current verified gaps, build order, gate completion state, and verification evidence.

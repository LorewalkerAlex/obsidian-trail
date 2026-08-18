# Trail Implementation

## 1. Baseline

The active formal implementation is `plugin/` on `main`.

The pushed Gate 8 checkpoint immediately preceding the completed Workflow Issue Peek & Planning Properties checkpoint is:

```text
c87723486e95c2915ff02388540e2fd189010b63
feat: add workflow board interaction foundation
```

This baseline includes the completed Project Lifecycle, Initiative/Project organization, Project Milestone, Cycle Planning, and shared Project/Cycle Workflow presentation slices plus the quality-baseline cleanup between them. Earlier repository states remain available through Git history and are not repeated as competing execution baselines.

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

Gate 8 evidence now includes:

- **Project Lifecycle Closure** at `844728131f0a0acf7df4213322a7837c16b47dab`, exposing explicit Project lifecycle control while preserving Domain/Application ownership of completion legality and reusing one configured Status picker across Project and Workflow Issue consumers;
- Quality Baseline Hardening at `f84c6f10a4708cb11a85d1071a9dcf50c29b3603`, followed by the whitespace-only correction at `12a438d538400d4f377d0183f72f172bfce42e5b`;
- **Initiative Focus & Project Assignment** at `4b5171e67c1dd483f3812a618d3386a3725204ae`, implementing `Projects Root -> Initiative Focus -> Project Workspace`, Initiative creation, explicit Project Initiative assignment/unassignment, and optimistic relationship queries through existing Application semantics;
- **Project Milestone Management** at `d775e94aacbb8e8970e72f7f2dc8e1cf9f9e2d7a`, implementing Milestone creation, derived current-scope progress, Issue assignment/unassignment, and delete-with-Issue-preservation through existing Domain/Application owners;
- **Cycle Planning & Rollover** at `826424ff673499d3aaef1669875db2719b1d9e5a`, implementing explicit Cycle opening/membership/closing, optional rollover, and retained closed history without changing Issue facts;
- **Project / Cycle Board & List Interaction Foundation** at `c87723486e95c2915ff02388540e2fd189010b63`, introducing one shared Workflow presentation owner, Status-only Board drag over Atlassian Pragmatic Drag and Drop, Project swimlanes for Current Cycle, and the existing Status/Estimate mutation path as the non-drag and completion authority;
- the Board/List checkpoint passed 74/74 test files and 250/250 tests, zero-warning lint, TypeScript, production build, `git diff --check`, dependency audit with zero vulnerabilities, representative Obsidian drag/persistence validation, and GitHub verification of the exact 15-file pushed scope;
- Board/List completion records the interaction foundation only: final Board/card/column sizing, density, pane proportions, and any future List drag behavior remain later UI/interaction design work;
- **Workflow Issue Peek & Planning Properties** is completed in this checkpoint, adding the canonical planning-property edit path for title, description, Priority, Estimate, Due, and Labels; enforcing Completed-Estimate retention and safe managed-Markdown descriptions; and exposing one shared lightweight Issue-details carrier from Project/Cycle List and Board;
- the Peek checkpoint passed 78/78 test files and 261/261 tests, zero-warning lint, TypeScript, production build, and `git diff --check`; representative Obsidian validation confirmed property persistence, Priority editing, Completed-Estimate protection, reload convergence, and a clean Runtime with no pending or source-health residue;
- the current Radix Dialog is only a temporary carrier for the verified Peek content/editing contract. Final Linear-style Peek positioning, non-blocking interaction, keyboard traversal, dimensions, density, responsive behavior, and broader Selection/Context Menu/Command Menu integration remain later interaction/UI work;
- repository-root `Trail/` is versioned only as disposable host-test observation data so real Obsidian Markdown write effects are visible in Git diffs. Its concrete contents are not Product facts, are not a stable fixture baseline, and may be created, changed, or deleted as a test requires;
- lint fails on warnings through `eslint . --max-warnings=0`, and the dev-only transitive `nanoid` resolution remains at the audited fixed version `3.3.18`.

Push-triggered GitHub Actions status for the recent Gate 8 commits was not available through the connected GitHub workflow lookup, so this document does not invent CI run numbers for those commits.

Current implementation facts in this document are expected to move as work advances; stable target answers remain in the upstream project documents.

## 2. Objective

Complete the frozen V1 design by composing coherent user-value workflows over the established foundations.

The implementation consumes the established project answers:

```text
product.md
-> domain.md
-> data.md
-> architecture.md
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
- UI action-result handling, local time conversion, Runtime write gating, feedback patterns, shared Status selection, shared overlay mechanics, and shared Workflow List/Board presentation;
- Diagnostics and architecture guards.

Implementation must preserve unrelated canonical fields and relations even when the current use case does not expose them. UI must keep drafts/continuous interaction local and emit only Application intents for authoritative changes.

A shared UI owner is introduced when there is real reuse pressure, a sufficiently stable contract, and a clear reduction in duplicate mechanism. Existing consumer count is evidence, not a mechanical threshold. Similar-looking controls remain separate when their candidates, interaction rules, or Application mapping are materially different.

## 4. Changes

### 4.1 Current gate

Current work is **Gate 8 - Product Workspace Implementation**.

Gate 8 is planned around user workflows rather than component inventories. Shared UI capabilities may continue to be added, but only when a real Product consumer freezes enough of the contract to justify a canonical shared owner.

Completed Gate 8 slices:

- **Project Lifecycle Closure** at `844728131f0a0acf7df4213322a7837c16b47dab`;
- **Initiative Focus & Project Assignment** at `4b5171e67c1dd483f3812a618d3386a3725204ae`;
- **Project Milestone Management** at `d775e94aacbb8e8970e72f7f2dc8e1cf9f9e2d7a`;
- **Cycle Planning & Rollover** at `826424ff673499d3aaef1669875db2719b1d9e5a`;
- **Project / Cycle Board & List Interaction Foundation** at `c87723486e95c2915ff02388540e2fd189010b63`;
- **Workflow Issue Peek & Planning Properties** in this checkpoint.

The completed **Workflow Issue Peek & Planning Properties** slice closes the concrete editing gap exposed by the Project/Cycle execution consumers before Home Focus, saved Views, or richer filtering are composed over those facts:

```text
Workflow Issue in Project or Cycle
-> open one shared lightweight Peek without leaving context
-> edit planning properties
-> canonical Semantic Plan / Application Replace
-> authoritative Markdown persistence
-> same effective Issue visible from every consumer
```

The slice:

1. adds a canonical Workflow Issue planning-property edit planner rather than mutating Domain objects from UI;
2. exposes one `IssueApplication.editProperties` use case with command normalization and no-op detection;
3. edits the complete lightweight planning-property snapshot: title, description, priority, estimate, due, and Labels;
4. preserves identity, Status, Project, Milestone, Cycle membership, creation/start/terminal lifecycle facts, and all unrelated canonical fields;
5. refuses to clear Estimate from an already Completed Issue and continues to rely on existing Domain label applicability/single-select rules;
6. closes the exposed physical-write gap by rejecting a Workflow Issue description that would create root H1/H2 managed structure while still allowing ordinary Markdown, H3-H6, and fenced examples;
7. keeps Project, Milestone, and Status editing on their existing explicit controls rather than duplicating those mechanisms inside Peek;
8. introduces one shared Workflow Issue Peek opened from both List rows and Board cards, so Project and Current Cycle consume the same interaction owner;
9. reuses the existing Trail Dialog primitive as the current Peek carrier and configured-timezone local date/time conversion for Due;
10. keeps Peek draft/focus state local and rebuildable; only accepted Application actions become authoritative;
11. extends diagnostics so real-host validation can correlate planning-property UI actions with the existing mutation/persistence/runtime evidence chain.

This slice establishes the Peek content/editing contract and planning-property mutation path, not final Peek UI design. The current Dialog carrier is intentionally temporary; final Linear-style Peek placement, non-blocking behavior, keyboard traversal, dimensions, visual density, responsive treatment, and broader Selection/Context Menu/Command Menu composition remain later UI/interaction work. No next Gate 8 slice is preselected in this checkpoint; select it only after re-auditing the pushed repository baseline.

### 4.2 Current verified gaps

Current Product gaps split into three groups:

- Product composition gaps whose lower-layer owners already exist, including later Home/View composition and additional lightweight entity editing surfaces beyond Workflow Issue planning properties;
- consumer-driven shared UI gaps such as Selection, Bulk Actions, Context Menu, Command Menu, broader property pickers, and later saved presentation state;
- real lower-layer gaps that must be repaired at their canonical owners when reached, including the current Triage Application narrowing that requires a Project even though Domain Accept permits project-less Workflow creation.

Home Focus and saved Views remain deferred while their exact composition/filter contracts are intentionally unfrozen in Workspace State. Trail should not invent those schemas merely to surface a page early.

The project-less Triage Accept gap remains deferred because the current Product contract does not yet freeze a complete discovery/management surface for project-less Workflow Issues. Trail should not invent a page merely to expose a lower-layer capability.

Product, Domain, Data, Architecture, and Design-to-Code Map remain unchanged unless implementation evidence exposes a contradiction in those authorities.

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

Complete. The frozen V1 Domain, semantic planning, persistence/mutation, Runtime/index, Query, Application, and justified pre-consumer shared UI foundations have canonical implementation/test ownership.

### 5.2 Gate 8 - Product workspaces

Active. Build coherent user workflows by composing the established foundations. Re-audit dependencies after each meaningful slice instead of pre-ordering Peek, Context Menu, Selection, or other components as an infrastructure sequence.

Completed:

- Project Lifecycle Closure;
- Initiative Focus & Project Assignment;
- Project Milestone Management;
- Cycle Planning & Rollover;
- Project / Cycle Board & List Interaction Foundation;
- Workflow Issue Peek & Planning Properties.

Active:

- no Gate 8 slice is preselected; choose the next coherent workflow from the latest pushed repository facts.

### 5.3 Gate 9 - V1 hardening

Complete integration, recovery, performance, responsive behavior, diagnostics boundaries, regression evidence, and release readiness without redefining upstream semantics for implementation convenience.

## 6. Risk & Verification

For each active Gate 8 slice:

- verify the current repository and the concrete Product workflow before defining changes;
- reuse existing Query/Application/shared UI owners before adding another mechanism;
- repair exposed lower-layer gaps at the canonical owner instead of Page-local workarounds;
- run focused tests for changed owners and directly affected shared owners while iterating;
- run one full `npm run check` at the coherent stable checkpoint before commit;
- run `git diff --check` before checkpoint;
- keep `npm audit` clean when dependency state changes or a security advisory is encountered;
- use representative real Obsidian validation when the slice changes host-specific, persistence, focus/portal, drag/pointer, keyboard, or other behavior that jsdom/pure tests cannot establish reliably.

The completed Peek checkpoint reused the existing Radix portal/focus primitive while adding a new cross-workspace consumer and a new authoritative Issue property mutation. Automated coverage and representative real-Obsidian validation both passed. Host evidence covered Project/Cycle access to the same Issue state, planning-property persistence, Priority editing, Completed-Estimate protection, plugin reload convergence, and clean Runtime settlement. The current Dialog was validated only as a temporary functional carrier, not as final Peek interaction or visual design.

Gate completion is recorded only after repository-grounded audit plus passing implementation evidence. Product, Domain, Data, Architecture, and Design-to-Code Map change only when their corresponding project answers truly change.

## 7. Final State

V1 implementation is ready for final product hardening when the frozen project answers are implemented through their canonical owners without temporary models, alternate persistence paths, duplicate mechanisms, or page-private reconstructions; the dependency gates are complete; and automated plus representative real-host verification is green for the integrated product.

`README.md` remains an entry point. This file owns the active construction stage, execution baseline, current verified gaps, build order, gate completion state, and verification evidence.

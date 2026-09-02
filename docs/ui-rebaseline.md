# Trail V1 UI Rebaseline

> **Lifecycle: temporary working document.** This file exists only for the V1 UI rebaseline. It does not become a new permanent design authority. Durable decisions must be folded into the canonical documents (`product.md`, `domain.md`, `data.md`, `architecture.md`, `ui.md`, `design-to-code-map.md`, and `implementation.md`). When the UI rebaseline is complete and those documents reflect the accepted state, delete this file.

## 1. Status and authority

This document defines the active UI construction rules while Trail V1 UI is being rebaselined.

It does **not** replace Product, Domain, Data, Architecture, or `docs/ui.md`. Those documents remain authoritative for their respective responsibilities.

For UI implementation planning and progress, this document **supersedes the previous Triage-first Phase A/B/C construction strategy in `docs/implementation.md` until that document is explicitly recalibrated**. It also temporarily suspends the **freeze status** declared by `ui.md` Section 17: the existing UI behaviors remain the target design baseline, but this rebaseline may correct omissions or cross-document contradictions before V1 UI is frozen again. Current implementation is never a reason to reopen a resolved Product/UI behavior.

The current repository checkpoint at the start of this rebaseline is:

```text
04dba6f6350d94c7ca9aa5dab23961e3b090ac75
docs: checkpoint phase c review audit
```

The last checkpoint before the production Triage vertical began is:

```text
fcf9de7f80339a4817432cb8ca88f6b5408152f5
docs: define triage vertical implementation plan
```

`fcf9de7` is a useful historical code boundary, not a design authority.

## 2. Why the UI is being rebaselined

The previous UI sequence allowed a real product vertical to become the primary driver for shared UI contracts before the rest of the V1 surfaces had been compared against those contracts.

That produced useful implementation evidence, but it also created a dangerous feedback loop:

```text
first product page
-> local implementation choice
-> promoted to shared component/interaction
-> later design work treats the promoted code as established
-> later pages inherit the first page's assumptions
```

The rebaseline breaks that loop.

From this point forward:

> Existing code may demonstrate a possible implementation, but it does not prove that the implementation is the correct target.

A passing test proves consistency with the behavior encoded by that test. It does **not** prove that the encoded behavior is the correct Product/UI contract.

A component being mounted in a production page does **not** make its API or interaction contract authoritative.

A historical document marking a phase `COMPLETE` means only that the checkpoint satisfied the criteria used at that time. It does **not** freeze those UI decisions under the new rebaseline.

## 3. Authority when code and design disagree

Use the following authority order:

```text
Product
-> Domain
-> Data
-> Architecture
-> UI Design
-> current cross-surface UI coverage decisions
-> implementation evidence
```

When current code conflicts with a higher-level answer, fix or remove the code. Do not reinterpret the higher-level answer to preserve the implementation.

Authority order identifies **which document owns a kind of decision**. It must not be applied as a mechanical rule that lets a stale upstream summary erase a later explicit design closure. When canonical documents disagree, inspect the decision chronology and closure evidence:

- a later explicit Product/UI closure with clear rationale and updates across the affected design/construction documents is durable design evidence;
- if that closure failed to update the canonical owner for one summary, treat the mismatch as **documentation drift** and repair the canonical owner rather than reopening the already-closed behavior;
- recency alone never lets implementation code, tests, screenshots, or a lower-level implementation note outrank Product/UI authority;
- genuinely contradictory decisions, missing scenarios, or an explicit new user decision still require a real reopen and new closure.

This means authority and chronology work together: authority determines ownership, while chronology prevents stale documentation from masquerading as a newer decision.

When the documents leave a real interaction or presentation question unresolved, the unresolved point must be discussed and recorded before production composition treats one existing code path as the default answer.

Current code, current tests, CI, historical screenshots, and previous-session conclusions are evidence only unless they are directly supported by the current authority chain and decision history.

### 3.1 Rule zero - implementation cannot promote itself

An implementation becomes an accepted UI contract only through the documentation and coverage process. It cannot promote itself because it is old, green, polished, mounted in production, shown in Foundation Lab, or reused by another component.

Implementation evidence may reveal feasibility constraints, host behavior, regressions, or hidden dependencies. When that evidence changes the target answer, record the target answer in `docs/ui.md` first and then update coverage status. Do not let the code silently fill a design gap.

## 4. Explicit status of the current Triage vertical

The current production Triage implementation is **retired as active UI design precedent**. It remains available as checkpoint evidence until a later surgical code reset removes or replaces it.

In particular, the following current code must not be used as an architectural or interaction precedent merely because it exists:

- `plugin/src/ui/pages/triage/trail-triage-page.tsx`;
- `plugin/src/ui/pages/triage/trail-triage-review-surface.tsx`;
- `plugin/src/ui/pages/triage/trail-triage-view-controls.tsx`;
- their current page-level tests;
- Triage page composition in `plugin/styles/pages.css`;
- current `TrailApp` production dispatch into the Triage page;
- current production-only Triage navigation wiring;
- the checked-in Triage presentation/E2E fixture additions introduced for the vertical;
- page-private Review draft/anchor/save/transition/feedback mechanics;
- any test whose only purpose is to lock one of those current mechanics.

These files may be read when investigating useful implementation evidence or lower-layer integration requirements, but their current behavior is not a default answer for the rebuilt UI.

No new V1 UI work should depend on those production-page contracts before the rebaseline explicitly reaccepts the relevant responsibility.

## 5. Existing design-to-code mappings during rebaseline

Existing UI rows in `docs/design-to-code-map.md` remain useful as **target ownership hypotheses and traceability**. They do not certify that the currently named implementation is correct or accepted.

Until the corresponding responsibility in `docs/ui-coverage.md` is closed:

- an existing path is not automatically the accepted owner;
- a current component name does not freeze the final component boundary;
- a current test suite does not freeze the intended interaction;
- historical Phase A/B/C `COMPLETE` language is historical evidence only;
- production consumer count is not an acceptance criterion.

After a responsibility is reaccepted, `docs/design-to-code-map.md` should be calibrated to the final owner rather than preserving an obsolete mapping for compatibility with old code.

## 6. What remains established

The UI rebaseline does **not** reopen the whole application.

The established Product/Domain/Data/Architecture layers remain the starting point unless a separate contradiction is discovered through evidence.

Examples include:

- canonical entity and configuration models;
- lifecycle and validation rules;
- Markdown physical ownership and codecs;
- authoritative Persistence;
- Mutation Plans and execution ordering;
- committed/effective Runtime and optimistic projection;
- Runtime reconciliation, ownership, indexes, control, and source health;
- Query ownership of derived facts, ordering, legal targets, and temporal semantics;
- Application ownership of semantic use cases;
- existing semantic planners where they remain consistent with the higher-level design.

The current effort is specifically a **UI construction reset**: presentation, interaction, reusable UI ownership, page composition, and the relationship between Foundation Lab and production consumers.

## 7. UI implementation status model

During the rebaseline every UI implementation belongs to one of four statuses.

### 7.1 Pre-vertical independent implementation

An independent production component that existed before the Triage production vertical and is consumed directly by Foundation Lab rather than copied there.

Current examples include the existing primitive/pattern foundation such as:

- `TrailButton`;
- `TrailIconButton`;
- `TrailCheckbox`;
- `TrailInput`;
- `TrailTextarea`;
- `TrailProgress`;
- `TrailSeparator`;
- `TrailCollectionRow`;
- `TrailPropertyControl`;
- `TrailViewBar` / `TrailViewLayoutSwitch`;
- shared Priority presentation/selection;
- `TrailTriageRow` as an independent semantic row specimen.

This status records **implementation provenance only**. It does not assert that the component contract is correct, accepted, or immutable. Cross-surface discussion may change the API, variants, mechanics, presentation, ownership, or even remove the component.

### 7.2 Candidate implementation

Reusable-looking code introduced or materially shaped by the Triage vertical but not yet validated against the broader V1 surface set.

Current examples include:

- `TrailDueDate`;
- `TrailLabelDots`;
- `TrailDuePropertySelect`;
- `TrailLabelPropertySelect`;
- `TrailViewPopover`;
- `TrailCollectionFilter` and its transient state helper;
- shared collection-filter Query helpers;
- `TrailWorkspaceShell` / `TrailLocationBar`;
- the page-level Obsidian View State bridge.

Candidate code is valuable implementation evidence. It is **not an accepted contract**.

A later discussion may keep it unchanged, change its public API, split responsibilities, move ownership, replace its mechanic, or delete it.

No consumer should be designed around a candidate merely to avoid changing existing code.

### 7.3 Foundation Lab-only specimen

Foundation Lab intentionally contains visual/calibration specimens that are not production components.

Examples currently include parts of:

- secondary/ghost/demo-hover button specimens;
- calibration-only icon drawings;
- tooltip specimen;
- menu specimen;
- composer specimen;
- local status/label visual examples.

A Lab specimen becoming visually convincing does not promote it into a production API.

Promotion requires an independent reusable owner and an explicit component contract.

### 7.4 Vertical code pending rollback/replacement

Page-private code created to make the current Triage vertical work belongs here unless explicitly reaccepted.

This status is deliberately stronger than `candidate`: downstream work should **not depend on it**.

The code reset itself will happen only after the documentation rebaseline is sufficiently explicit to guide the replacement.

## 8. Foundation Lab as continuous verification infrastructure

Foundation Lab is a **long-lived engineering validation surface**. It is not a temporary pre-page gallery, not a product page, and not a second implementation framework.

The rebaseline documents are temporary. Foundation Lab is not. Its scenarios should remain available throughout V1 development and later UI evolution so reusable UI contracts can be inspected, calibrated, and regression-tested independently from any one product page.

The intended graph is:

```text
authoritative Product/UI answer
-> cross-surface scenario closure
-> independent reusable component / interaction / pattern
              |
              +-- Foundation Lab representative scenarios
              |      -> semantic/component verification
              |      -> width/focus/keyboard/state calibration
              |      -> reusable regression coverage
              |
              +-- one or more production compositions
                     -> page/workflow verification
                     -> real-Obsidian verification
```

Production code must never depend on:

- Foundation Lab components;
- `trail-lab-*` selectors;
- Lab fixture state;
- Lab-only mock interactions;
- variants or behavior added only to make a Foundation specimen look correct.

Foundation Lab should instead import the same independent production owner that product pages import.

### 8.1 Long-lived role

Foundation Lab accompanies the entire UI development process:

- component/pattern design;
- shared interaction implementation;
- visual calibration;
- production page assembly;
- production bug investigation;
- regression testing;
- responsive/focus/keyboard calibration;
- later features that reuse or extend established UI owners.

Exact development access may evolve, but Foundation Lab must remain reachable in the engineering workflow. It does not need to become a normal user-facing product navigation destination.

A reusable owner should not disappear from Foundation merely because a production consumer now exists.

### 8.2 What Foundation Lab may own

Foundation Lab may own harness concerns such as:

- deterministic fixture/fake data;
- scenario selectors;
- width/pane/host containers;
- explicit state toggles;
- host-context simulation where practical;
- debug outlines/logging;
- interaction/event readouts;
- specimen headings/descriptions;
- side-by-side comparison of stable variants/states;
- focused integration specimens that compose several real reusable owners to verify their boundary.

It must not own product workflow semantics, canonical Query/Application legality, page navigation meaning, or Foundation-specific production variants.

### 8.3 Mandatory Foundation loop for reusable UI

For each reusable responsibility selected for implementation:

1. identify representative scenarios from `docs/ui-coverage.md`;
2. implement the independent production owner outside `ui/foundation`;
3. import that exact owner into Foundation Lab;
4. exercise applicable normal/edge/width/focus/keyboard/error states;
5. keep those scenarios after acceptance as reusable regression fixtures;
6. when production exposes a reusable contract bug, reproduce or add the representative case in Foundation before or with the shared fix when practical;
7. reverify Foundation and affected production consumers after the fix.

Foundation verification is therefore not a one-time stage before pages. It is a continuing gate and regression surface for shared UI work.

### 8.4 What Foundation Lab must prove

Foundation verification should cover the stable contract of a reusable owner, for example:

- semantic variants;
- disabled/read-only states;
- hover/focus/pressed/selected/highlighted states where meaningful;
- narrow/normal/wide geometry;
- long/empty content;
- keyboard/focus behavior where the owner owns it;
- error/pending presentation where the owner owns it;
- interaction with the real Obsidian host when host mechanics materially affect the answer.

Foundation Lab does **not** prove page workflow correctness. Page-local sequencing, data projection, navigation meaning, and final composition remain page/feature responsibilities and require production/host verification.

### 8.5 No fake completion through specimens

If a Foundation section needs a reusable control that does not yet exist, do not permanently simulate the final control with a `.trail-lab-*` implementation and then treat the visual result as completed component work.

Use a Lab-only specimen only while the responsibility is intentionally unresolved. Once the responsibility is selected for implementation, create the independent owner first and replace the specimen with the real consumer.

Do not clone complete Home/Triage/Project/Cycle/Search pages into Foundation merely for screenshots. Foundation may compose several real owners only when the composition itself is a reusable pattern/interaction boundary rather than a second page implementation.

## 9. New UI implementation process

The unit of progress is no longer a product vertical. It is a **resolved UI responsibility across the V1 scenarios that constrain it**.

The workflow is:

```text
authoritative product/UI design
-> enumerate relevant page/surface scenarios
-> identify UI responsibilities
-> compare those responsibilities across V1 consumers
-> decide shared vs page-local ownership
-> inspect existing code only as evidence
-> define or revise the independent component/interaction contract
-> verify representative states in Foundation Lab
-> mark the responsibility ready for composition
-> compose pages from accepted owners
-> validate the real page in Obsidian
-> feed reusable production regressions back into Foundation scenarios
```

The active scenario inventory lives in `docs/ui-coverage.md`.

### 9.1 Discussion before extraction

Do not create a shared component merely because two current files look similar.

First ask whether the responsibility is actually the same across the relevant V1 surfaces.

Examples:

- Priority identity is inherently shared because it is one Domain concept;
- a generic collection Filter is shared only if its grammar, lifetime, focus mechanics, and page integration hold across the target collections;
- a Triage sequential Review progression rule is page/workflow behavior, not a generic collection primitive;
- title editing in Triage Review and full Workflow Issue body editing may share presentation pieces without sharing the same full editor lifecycle.

### 9.2 Cross-surface constraint before acceptance

A shared contract should be tested against all already-designed consumers that can materially constrain it, even if those consumers are not implemented yet.

This does not require building every page first. It requires using the design documents to prevent the first implemented page from accidentally defining the entire system.

### 9.3 Production composition is intentionally late

A page may be discussed before all its components exist, but final production composition should use accepted independent owners rather than creating replacement-bound page-private UI.

If a page discussion discovers a missing shared responsibility, pause the page composition, settle the shared responsibility, verify it in Foundation Lab, then resume composition.

## 10. Acceptance rules

### 10.1 What does not establish correctness

None of the following is sufficient by itself:

- code already exists;
- tests pass;
- CI passes;
- a previous phase was marked `COMPLETE`;
- a component has one production consumer;
- a host screenshot looked acceptable;
- the current implementation is difficult to change;
- a current test assumes the behavior;
- a prior session described the behavior as established.

These are evidence, not authority.

### 10.2 Reusable component acceptance

A reusable UI owner is accepted only when:

1. its responsibility is defined against authoritative Product/UI design;
2. its intended V1 consumers have been considered for materially different requirements;
3. its ownership boundary is explicit;
4. its API does not expose one page's accidental workflow state as a generic contract;
5. Foundation Lab uses the production component directly for representative states and keeps those scenarios as regression coverage;
6. component-level tests verify semantics rather than source-shape accidents;
7. representative Obsidian validation exists when host mechanics/presentation can change the answer;
8. reusable contract bugs found later in production are fed back into Foundation scenarios when applicable;
9. `docs/ui-coverage.md` records the accepted status.

Acceptance is revisable when later authoritative design exposes a real contradiction, but existing code alone is never a reason to reject the correction.

### 10.3 Page acceptance

A production page is accepted only when:

- its scenarios are closed in `docs/ui-coverage.md`;
- its reusable responsibilities are already accepted or explicitly page-local;
- it does not depend on Foundation Lab code;
- it does not duplicate Domain/Query/Application legality;
- responsive/focus/keyboard/error/loading states required by the page are covered;
- representative real-Obsidian validation passes;
- the design-to-code map is calibrated to the final owners after implementation.

## 11. Active documentation set

Use the documents as follows during the rebaseline:

| Document | Responsibility |
| --- | --- |
| `product.md` | user-visible product requirements and scope |
| `domain.md` | canonical concepts, invariants, lifecycle semantics |
| `data.md` | authoritative representation and persistence facts |
| `architecture.md` | system boundaries, flow, runtime/mutation/host mechanisms |
| `ui.md` | target UI presentation and interaction answers |
| `ui-rebaseline.md` | active UI construction/acceptance rules and old-code status |
| `ui-coverage.md` | active V1 scenario/responsibility/component coverage |
| `design-to-code-map.md` | target ownership/traceability; never a source of UI behavior or acceptance by itself |
| `implementation.md` | broader construction history and implementation facts; its previous Triage-first UI execution plan is superseded here until recalibrated |

When two documents appear to conflict, resolve the conflict using the authority order rather than using current code as the tiebreaker.

## 12. Immediate work

The next work is documentation and Foundation closure, not continued Phase C implementation.

### Step 1 - UI coverage inventory

Complete the V1 surface/scenario inventory in `docs/ui-coverage.md` from `ui.md`.

For each scenario identify:

- the user goal;
- the surface/page/overlay;
- reusable UI responsibilities;
- page-local workflow responsibilities;
- relevant Domain/Query/Application capability;
- existing implementation evidence, if any;
- unresolved questions;
- component status.

### Step 2 - component inventory and classification

Classify existing UI assets as:

- pre-vertical independent implementation;
- Candidate implementation;
- Lab-only specimen;
- Vertical code pending rollback/replacement.

Do not promote a candidate merely to reduce rewrite cost.

### Step 3 - settle shared contracts in dependency order

Start with responsibilities that constrain many later surfaces, such as:

- icon mechanism/language;
- buttons and icon actions;
- fields and lightweight inline/content editing presentation;
- property controls and property pickers;
- menus/popovers/confirmation mechanics;
- View Bar and Filter grammar/lifetime;
- shared feedback and non-writable/data-issue presentation;
- navigation/location shell;
- selection/action/keyboard ownership;
- Composer shell and creation controls.

The exact order may change when the coverage matrix reveals a stronger dependency. The matrix, not the old Triage phase order, controls the sequence.

### Step 4 - Foundation verification and regression baseline

For each resolved shared owner:

- replace any equivalent Lab-only specimen with the production component where appropriate;
- add representative Foundation scenarios;
- verify semantic/component tests;
- calibrate in real Obsidian where needed;
- keep the accepted scenarios as reusable regression coverage;
- update `ui-coverage.md` status.

This step establishes the initial Foundation baseline but does not end Foundation involvement. Every later reusable UI change or reusable production regression returns through the same Foundation verification loop.

### Step 5 - production UI reset

Once the replacement boundaries are documented, perform a surgical code reset:

- restore Foundation-only active UI hosting where appropriate;
- remove current Triage production page composition and page-private Review machinery;
- remove or reset vertical-only fixtures/tests that would otherwise lock the old design;
- retain established lower layers;
- retain useful candidate code only as independent candidates, not active product truth;
- preserve shared visual calibration that remains valid independently of the old Triage page.

This is a normal forward commit. Do not rewrite Git history merely to hide the implementation evidence.

### Step 6 - page composition from accepted owners

After sufficient shared coverage closure, implement product pages from the accepted contracts.

The sequence should be chosen from dependency and coverage evidence, not because Triage happened to be the first previous production page.

## 13. Current gate

The active gate is:

```text
Gate 8 - V1 UI Rebaseline / Coverage Closure
```

Current status:

```text
Product / Domain / Data / Architecture       established baseline
UI target design (`ui.md`)                   authoritative, coverage review in progress
Foundation Lab                               permanent continuous verification/regression environment
pre-vertical independent components          retained, revisable
post-vertical shared-looking UI code         candidate until reaccepted
production Triage vertical                   retired as design precedent; pending rollback/replacement
old Phase A/B/C completion labels            historical only
production page implementation               paused until coverage/component closure
```

There is no active `Phase C` implementation target under this rebaseline.

The next checkpoint should be a **documentation/coverage rebaseline checkpoint**, followed by focused Foundation/component checkpoints. Product-page completion resumes only after those owners are ready.


## 14. Rebaseline exit and durable transfer

When this temporary document is deleted, its durable rules must already be reflected in the canonical documentation and engineering practice. In particular, the final documentation must preserve that:

- current implementation never outranks Product/UI authority;
- reusable UI contracts are constrained cross-surface before acceptance;
- Foundation Lab remains a permanent engineering validation/regression environment;
- production pages consume the same independent owners verified in Foundation;
- reusable regressions discovered in production feed back into Foundation scenarios;
- Foundation-only presentation/behavior never becomes a hidden production contract.

Deleting `ui-rebaseline.md` must **not** imply deleting or demoting Foundation Lab.

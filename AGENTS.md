# Trail Agent Guide

> **Role:** Canonical repository workflow for AI-assisted engineering sessions.
>
> This file defines how an agent enters the repository, finds authority, changes code or documentation, validates work, and publishes a completed round. It does **not** define Trail product, domain, data, architecture, UI, or implementation facts.

## 1. Durable baseline

GitHub `origin/main` is the durable project checkpoint.

At the start of every session:

1. establish the current `origin/main` commit;
2. treat chat history, handoffs, screenshots, and previous-session summaries as pointers only;
3. verify repository facts from the current repository before relying on them;
4. do not reopen decisions already recorded as closed unless current repository evidence creates a real contradiction.

A local checkout may contain valid in-progress work. Never discard, reset, overwrite, or silently replace pre-existing local changes merely to match `origin/main`.

## 2. Session bootstrap

Before designing a change, read in this order:

1. `AGENTS.md` — repository workflow;
2. `ENGINEERING.md` — engineering principles and authority rules;
3. `README.md` — repository layout, environment, and commands;
4. `docs/implementation.md` — current implementation state, active gaps, project-specific validation notes, and current completion criteria.

Then read only the authority documents relevant to the task, following the project chain:

```text
docs/product.md
    ↓
docs/domain.md
    ↓
docs/data.md
    ↓
docs/architecture.md
    ↓
docs/ui.md
    ↓
docs/ui-blueprints.md
    ↓
docs/design-to-code-map.md
    ↓
docs/implementation.md
    ↓
code
```

Do not ask the user to restate repository facts that can be established from these files.

## 3. Task intent

Interpret short user instructions by intent:

- **Investigate / inspect / explain** — read and diagnose; do not mutate or publish unless requested.
- **Fix / change / implement** — carry the task through the appropriate implementation and validation flow. Unless the user explicitly asks for local-only work, the target completion state is a verified GitHub checkpoint.
- **Release** — treat release as a separate explicit workflow from ordinary development. Do not infer that a normal commit should become a release.

If the request is sufficiently clear from repository evidence, proceed without asking the user to repeat the workflow or provide already-known context.

## 4. Understand before editing

Before the first implementation edit:

1. identify the canonical owner of the behavior or fact;
2. inspect the current implementation and relevant tests;
3. trace the real consumer graph far enough to understand impact;
4. distinguish a local defect from a shared-owner defect;
5. prefer the smallest coherent root-cause fix over a page-local workaround or parallel mechanism.

For changed public types, schemas, invariants, or shared helpers, inspect applicable validators/codecs, persistence boundaries, Application/Query consumers, UI/settings consumers, fixtures/builders, diagnostics, host adapters, and checked-in development data.

Reuse existing owners and mechanisms. Do not introduce a second authority because it is convenient for the current task.

## 5. Execution environments

### Local agent / Codex

Use the local checkout directly.

Before the first mutation, establish only the facts needed to work safely:

- repository identity;
- active branch;
- local `HEAD`;
- current `origin/main` after `git fetch origin`;
- pre-existing local changes that overlap the intended work.

Do not use destructive reset/clean operations to force alignment. Preserve unrelated user work.

### Web agent

Use current GitHub `main` as the source baseline and treat the user as the local execution bridge.

When local mutation is required, prefer exact validated final files over source-edit instructions. Keep apply/validation separate from commit/push. After the user reports a successful assistant-directed mutation, treat that result as the new session-local state unless later evidence contradicts it.

## 6. Change discipline

For every implementation round:

- define one coherent change slice;
- maintain an explicit intended path manifest;
- keep unrelated cleanup out of the slice;
- preserve established ownership and dependency direction;
- add or update tests around the changed invariant/behavior at the correct owner boundary;
- use real Obsidian host validation only when automated checks cannot establish the host-specific property.

Before requesting host validation, confirm that the available fixture can actually exercise the behavior and ask for the smallest action sequence that proves the remaining risk.

## 7. Validation

Use the repository's current validation policy in `docs/implementation.md` and select checks by **responsibility and consumer impact**, not by changed-file count.

Minimum rules:

- every text change gets diff/whitespace sanity such as `git diff --check`;
- pure non-executable documentation stays at documentation-level validation unless it is an executable contract;
- local UI/Query/Application work gets focused owner/direct-consumer validation, with typecheck/build when compilation or bundling is affected;
- shared contracts, Domain/schema, build/tooling, broad runtime/infrastructure changes, uncertain consumer graphs, and formal release gates escalate to repository-wide `npm run check`;
- host-only behavior gets representative Obsidian validation after deterministic automated checks are green.

Do not run a broader check merely as ritual. If a failure reveals wider impact than expected, broaden the validation scope and repair the same candidate before publication.

## 8. Documentation calibration

After implementation and required validation are green, update only factual documentation directly affected by the change.

Keep authority in the correct file:

- product intent and scope → `docs/product.md`;
- terminology/invariants/lifecycle → `docs/domain.md`;
- persistence/schema/integrity → `docs/data.md`;
- boundaries/owners/flows → `docs/architecture.md`;
- canonical UI behavior → `docs/ui.md`;
- Page composition/owner blueprint → `docs/ui-blueprints.md`;
- design-to-code ownership → `docs/design-to-code-map.md`;
- current implementation state/evidence → `docs/implementation.md`;
- repository workflow → `AGENTS.md`.

Do not duplicate the same resolved fact across multiple authorities merely for convenience.

## 9. Publication

Ordinary implementation publication follows the current publication rule in `docs/implementation.md`.

At the publication boundary:

1. confirm the session baseline and fetch current `origin/main`;
2. if remote `main` moved during the session, reconcile before publishing and rerun any validation invalidated by that movement;
3. make sure unrelated work is not already staged;
4. stage only the explicit intended path manifest; never use `git add -A` when the paths are known;
5. run staged diff sanity and inspect staged name/status plus stat;
6. commit and push as a step separate from mutation/validation;
7. re-read GitHub and verify the resulting remote commit;
8. inspect the relevant CI run before calling the round complete.

If commit succeeds but push fails, push the existing commit rather than recreating it.

If the active environment cannot complete publication, report the exact last verified boundary and the remaining publication step; do not describe unpublished work as delivered.

## 10. Release boundary

A Git commit is not a release.

Normal development may accumulate multiple verified commits on `main` without changing the version installed in the user's real Obsidian Vault. A release is performed only on explicit request and must use the repository release procedure once that procedure is established in `RELEASING.md`.

Until `RELEASING.md` exists, do not improvise or silently create a GitHub Release.

The development Vault may use development/diagnostics builds. A real personal Vault should consume release production artifacts rather than arbitrary development bundles.

## 11. Concurrency and recovery

Default to one writer per checkout.

If Web and local agents, or multiple local sessions, need to work in parallel, use separate worktrees/branches rather than editing the same checkout concurrently.

Enter reconciliation mode when evidence shows that another session/process changed the same checkout or remote baseline, a mutation failed partway through, host behavior contradicted the expected transition, or tooling produced unexpected side effects. Inspect only the state required to remove that ambiguity; do not perform broad destructive cleanup.

## 12. Completion

For an implementation task, "done" means the requested behavior is implemented at the correct owner, the affected consumer graph has been addressed, the appropriate validation is green, required factual documentation is calibrated, and the intended checkpoint has been verified on GitHub with relevant CI checked.

A task may intentionally stop earlier only when the user requests an earlier boundary such as investigation-only or local-validation-only. State that boundary explicitly.

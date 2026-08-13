# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail has completed its POC exit and the formal Product Design, Canonical Domain, Logical Data Model, Markdown Physical Model, Technical Design, Formal Intake, and basic Workflow stages. Formal implementation is now in the **Intake → Workflow** stage. The complete Formal Triage vertical path, development-only structured Diagnostics foundation, Triage Management actions, Workflow Entry vertical path, and Triage Accept cross-source flow are implemented and validated in real Obsidian; the next user-facing Slice is Triage Convert to Project.

The current design and implementation chain is:

~~~text
docs/product-design-baseline.md
    ↓
docs/canonical-domain-model.md
    ↓
docs/logical-data-model.md
    ↓
docs/markdown-physical-model.md
    ↓
docs/technical-design-baseline.md
    ↓
docs/implementation-plan.md
~~~

Project progress, the current Slice, and implementation checkpoints are maintained in `docs/implementation-plan.md`. Closed design documents record their own contracts and authority boundaries rather than duplicating project progress.

The active runtime is the **Formal Trail implementation**, not the former POC validation shell. Formal Intake covers Formal workspace initialization, Quick Capture, Triage Issue parsing/serialization, Due resolution through the configured IANA timezone, Zustand committed + optimistic runtime state, serial mutation execution, `Vault.process()` persistence, reload reconstruction, host-file reconciliation, and Triage Management for title / Due editing, seven-calendar-day defer, and delete. Workflow Entry extends that same Formal runtime with Project creation, Project-owned Workflow Issue creation, configured default status resolution, Issue lifecycle transitions, first-start / terminal timestamps, the Completed Estimate gate, reload reconstruction, Project / Issue Markdown parsing, and source-scoped external-change reconciliation. Triage Accept now connects those two stable paths: accepting a Triage Issue creates a new Project-owned Workflow Issue identity with the configured Backlog default and its own `createdAt`, verifies the destination before deleting the source, does not inherit the Triage Due, and uses guarded compensation if source deletion fails after target creation. Real Obsidian regression has verified these paths together with invalid-source isolation, last-known-good runtime retention, missing-required-singleton protection, stale-edit protection, and production Diagnostics exclusion.

The exact POC implementation / fixture / style baseline remains preserved under `archive/poc/` as technical evidence. POC-era Area / Task / Fleeting Note code is no longer part of the active runtime, lint, or test path.

Formal implementation follows the **reuse before build** policy in `docs/technical-design-baseline.md`: Obsidian / host / browser capabilities and mature focused libraries are evaluated before custom infrastructure. POC evidence can inform a choice but does not receive default priority over a better formal implementation.

Development Diagnostics are observability infrastructure only, not Product Activity / Domain history. Production builds exclude Diagnostics; diagnostics-enabled development builds expose the structured trace and copy command for real-host testing. The next user-facing Slice is Triage Convert to Project, reusing the cross-source safety evidence established by Triage Accept without widening the current Slice into unrelated knowledge actions.

Active branch:

~~~text
main
~~~

## Git worktrees

Development work is performed in the `obsidian-trail-active/` worktree on `main`.

The presence or branch state of any sibling worktree is a local machine arrangement, not a project workflow requirement. Project commands and handoffs should remain environment-independent and assume they are run from the active repository root.

## Repository layout

The repository root is also used as the development Obsidian Vault.

~~~text
obsidian-trail-active/
|-- .obsidian/
|   |-- community-plugins.json
|   `-- plugins/
|       `-- trail/        Generated files loaded by Obsidian; ignored by Git
|-- archive/
|   `-- poc/              Exact POC implementation / fixture / style baseline
|-- plugin/
|   `-- src/              Current active Formal Trail plugin source code
|-- Trail/                Local Formal Domain Markdown created at runtime; ignored by Git
`-- docs/                 Product, design, and implementation documents
~~~

The root `Trail/` directory is authoritative user/domain persistence produced by the Formal plugin. It is intentionally not a checked-in development fixture. Fresh initialization creates the structure defined by `docs/markdown-physical-model.md`; real Obsidian tests must use guarded fixture setup/cleanup rather than committing generated Domain Markdown. The archived POC fixture remains under `archive/poc/Trail/` and is unaffected by the root-only ignore rule.

## Development environment

Required versions:

~~~text
Node.js 24.19.0
npm 11.17.0
~~~

Node.js is managed with nvm-windows on the current development machines.

Confirm the active versions:

~~~powershell
nvm current
node --version
npm --version
~~~

Expected output:

~~~text
v24.19.0
v24.19.0
11.17.0
~~~

## Initial setup

After cloning the repository or switching to a new worktree, activate the required Node.js version:

~~~powershell
nvm use 24.19.0
~~~

Install the exact project dependencies with:

~~~powershell
npm ci
~~~

## Plugin development workflow

Trail source code is developed under:

~~~text
plugin/
~~~

The build process places generated plugin files under:

~~~text
.obsidian/plugins/trail/
~~~

The generated plugin contains:

~~~text
main.js
manifest.json
styles.css
~~~

Available commands:

~~~powershell
npm run dev
npm run lint
npm run test
npm run test:run
npm run test:run:verbose
npm run typecheck
npm run build
npm run build:diagnostics
npm run check
~~~

- `npm run dev` watches source and static files, updates `.obsidian/plugins/trail/`, and keeps development Diagnostics enabled.
- `npm run lint` checks active source against ESLint and Obsidian plugin rules.
- `npm run test` starts Vitest in interactive watch mode.
- `npm run test:run` runs the active test suite once with the compact reporter.
- `npm run test:run:verbose` runs the same suite with detailed output.
- `npm run typecheck` checks TypeScript without generating files.
- `npm run build` type-checks and creates a production plugin build with Development Diagnostics disabled.
- `npm run build:diagnostics` type-checks and creates a one-shot Diagnostics-enabled plugin build for real Obsidian testing.
- `npm run check` runs lint, tests, type-checking, and the production build.

During one implementation slice, run focused tests plus directly affected regression tests. Run the full `npm run check` once when a coherent slice is complete and ready for a repository checkpoint. Real Obsidian regression should cover representative independent code paths, host integrations, and failure modes rather than mechanically repeating the same implementation path for every field or control.

## Testing in Obsidian

The active plugin is now the Formal Trail runtime. For real Obsidian regression testing:

1. Open the repository root as an Obsidian Vault.
2. Build or keep `npm run dev` active. When a deterministic one-shot structured trace is needed, use `npm run build:diagnostics`.
3. Enable Trail under **Settings → Community plugins**.
4. Open Trail from the Ribbon or **Trail: Open**.
5. Reload the plugin after rebuilding when Obsidian still has an older bundle loaded.
6. Use a written protocol covering repository / Obsidian starting state, exact fixture data, default values, expected UI / disk end state, cleanup / restore, and whether the test Vault should remain open.
7. Treat root `Trail/`, plugin `data.json`, and development Diagnostics trace files as local test/runtime state; do not commit them as implementation source.

Formal real-host evidence now covers Fresh bootstrap; Quick Capture persistence/reload; Triage legal external-edit reconciliation, invalid-source isolation/recovery, missing-required-singleton protection, Edit / Defer / Delete, and stale-edit conflict protection; structured Diagnostics across reload sessions; Project creation; Workflow Issue creation; Started / Completed / reopen lifecycle semantics; the Completed Estimate gate; Workflow reload reconstruction; external Project / Issue Markdown reconciliation; and Triage Accept with a new Workflow identity, destination write/verify before source deletion, coordinated optimistic projection, queued host events, and final authoritative reconciliation. Current UI is a functional Formal Triage + Projects surface; Triage Convert to Project is the next user-facing implementation Slice, while Board / List organization and final visual system refinement remain later work.

Development Diagnostics are enabled only in diagnostics-enabled development builds. They persist a compact JSONL trace under `<vault-config>/plugins/trail/diagnostics/trace.jsonl`, keep at most the latest two sessions with at most 2000 events per session, and expose **Trail: Copy diagnostics trace** to copy up to the latest two sessions. Events use IDs, paths, lifecycle stages, revisions, counts, validation codes, and changed field names for diagnosis; title, description, and full Markdown content are not persisted by default. The trace is development observability, not Canonical Domain state, Event Sourcing, or Product Activity history.

## Continuous integration

GitHub Actions uses the Node.js version from `.nvmrc`, installs dependencies with `npm ci`, and runs:

~~~powershell
npm run check
~~~

## Design documents

- `docs/product-design-baseline.md` — Product Design source of truth.
- `docs/canonical-domain-model.md` — canonical Domain objects, semantics, lifecycle, relationships, field contracts, and derivation boundaries.
- `docs/logical-data-model.md` — logical records, persistence roles, stable references, timestamp contract, Query Contract, and Mutation Contract.
- `docs/markdown-physical-model.md` — authoritative Vault / Markdown / `data.json` persistence layout, serialization rules, validation boundaries, and migration policy.
- `docs/technical-design-baseline.md` — formal Technical Design baseline for Runtime, optimistic state, mutation planning/execution, reconciliation, page selectors, frontend architecture, performance, reusable UI infrastructure, and diagnostics boundaries.
- `docs/implementation-plan.md` — V1 implementation roadmap, current near-term focus, and implementation checkpoints; this is the single source of truth for project implementation progress.
- `docs/product-domain-hld.md` — POC-era Product / Domain HLD retained as historical design and validation context; superseded where it conflicts with current canonical docs.
- `docs/technical-design.md` — POC technical baseline and verified architecture evidence only; superseded where it conflicts with the formal design chain.

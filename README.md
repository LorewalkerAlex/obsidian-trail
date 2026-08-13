# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail has completed its POC exit and the formal Product Design, Canonical Domain, Logical Data Model, Markdown Physical Model, and Technical Design stages. Formal implementation is in the **Formal Intake** stage, and the first complete Formal Triage vertical path is now implemented and validated.

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

The active runtime is now the **Formal Triage implementation**, not the former POC validation shell. The completed vertical path covers Formal workspace initialization, Quick Capture, Triage Issue parsing/serialization, Due resolution through the configured IANA timezone, Zustand committed + optimistic runtime state, serial mutation execution, `Vault.process()` persistence, reload reconstruction, and host-file reconciliation. Real Obsidian regression has also verified invalid-source isolation with last-known-good runtime state and refusal to silently recreate a missing required Triage singleton.

The exact POC implementation / fixture / style baseline remains preserved under `archive/poc/` as technical evidence. POC-era Area / Task / Fleeting Note code is no longer part of the active runtime, lint, or test path.

Formal implementation follows the **reuse before build** policy in `docs/technical-design-baseline.md`: Obsidian / host / browser capabilities and mature focused libraries are evaluated before custom infrastructure. POC evidence can inform a choice but does not receive default priority over a better formal implementation.

The next cross-cutting implementation step is a development-only structured diagnostics trace for real Obsidian testing. It will remain observability infrastructure rather than Product Activity / Domain history. After that foundation, the next user-facing Slice is Triage Management.

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
npm run check
~~~

- `npm run dev` watches source and static files and updates `.obsidian/plugins/trail/`.
- `npm run lint` checks active source against ESLint and Obsidian plugin rules.
- `npm run test` starts Vitest in interactive watch mode.
- `npm run test:run` runs the active test suite once with the compact reporter.
- `npm run test:run:verbose` runs the same suite with detailed output.
- `npm run typecheck` checks TypeScript without generating files.
- `npm run build` type-checks and creates a production plugin build.
- `npm run check` runs lint, tests, type-checking, and the production build.

During one implementation slice, run focused tests plus directly affected regression tests. Run the full `npm run check` once when a coherent slice is complete and ready for a repository checkpoint.

## Testing in Obsidian

The active plugin is now the Formal Triage runtime. For real Obsidian regression testing:

1. Open the repository root as an Obsidian Vault.
2. Build or keep `npm run dev` active.
3. Enable Trail under **Settings → Community plugins**.
4. Open Trail from the Ribbon or **Trail: Open**.
5. Reload the plugin after rebuilding when Obsidian still has an older bundle loaded.
6. Use a written protocol covering repository / Obsidian starting state, exact fixture data, default values, expected UI / disk end state, cleanup / restore, and whether the test Vault should remain open.
7. Treat root `Trail/` and plugin `data.json` as local test/runtime state; do not commit them as implementation source.

The current Formal Triage path has real-host evidence for Fresh bootstrap, Quick Capture persistence, reload reconstruction, valid external-edit reconciliation, invalid-source isolation/recovery, and missing-required-singleton protection. Current UI is a functional Formal Triage surface; final visual system refinement and additional Triage actions belong to later slices.

Development diagnostics will be added before the next interactive real-host Slice so one user action can be correlated across UI intent, command planning, optimistic state, mutation execution, validation, reconciliation, and error/recovery stages without turning those traces into Product history.

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

# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail has completed its POC exit and the formal Product Design, Canonical Domain, Logical Data Model, Markdown Physical Model, and Technical Design stages. The V1 Implementation Plan is established, and formal implementation is now in the Formal Intake stage.

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

The current implementation focus is **Formal Intake / Formal Triage Intake**. Gate A is complete: the exact POC baseline has been preserved under `archive/poc/`; Zustand and `mdast-util-from-markdown` have passed focused implementation validation; and the Formal configuration, workspace classification/bootstrap foundation, and Obsidian host boundary are implemented and covered by focused tests. The active runtime is still the POC validation shell until Gate B builds the Formal Triage vertical path and performs the final active-path cutover.

The POC remains valuable as technical evidence. It verified reusable capabilities including Markdown discovery and parsing, stable identity, guarded single-file mutation, representative cross-file mutation and compensation, Runtime Store convergence, a global Mutation Queue, optimistic UI, draft editing, native Obsidian Modal integration, host file-event reconciliation, and UTF-8 BOM tolerance at the read boundary.

Formal implementation follows the **reuse before build** policy in `docs/technical-design-baseline.md`: Obsidian / host / browser capabilities and mature focused libraries are evaluated before custom infrastructure. POC evidence can inform a choice but does not receive default priority over a better formal implementation.

Active branch:

~~~text
main
~~~

## Git worktrees

Development work is performed in the `obsidian-trail-active/` worktree on `main`.

The presence or branch state of any sibling worktree is a local machine arrangement, not a project workflow requirement. Project commands and handoffs should remain environment-independent and assume they are run from the active repository root.

## Repository layout

The repository root is currently also used as the development Obsidian Vault.

~~~text
obsidian-trail-active/
|-- .obsidian/
|   |-- community-plugins.json
|   `-- plugins/
|       `-- trail/        Generated files loaded by Obsidian
|-- archive/
|   `-- poc/              Exact POC implementation / fixture / style baseline
|-- plugin/
|   `-- src/              Current active Trail plugin source code
|-- Trail/                Current checked-in Vault fixtures
`-- docs/                 Product, design, and implementation documents
~~~

The active `Trail/` fixtures still reflect POC-era persistence and are not the formal production persistence model. Gate A has already preserved the original POC fixture and implementation baseline under `archive/poc/`. Gate B of the Formal Triage Intake slice will replace the active development fixture/runtime path with the structure defined by `docs/markdown-physical-model.md`, while keeping archived POC files outside active build / runtime / lint / test paths. No POC schema migration compatibility is required.

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
npm run bench:vault
npm run check
~~~

- `npm run dev` watches source and static files and updates `.obsidian/plugins/trail/`.
- `npm run lint` checks source against ESLint and Obsidian plugin rules.
- `npm run test` starts Vitest in interactive watch mode.
- `npm run test:run` runs the test suite once with the compact reporter.
- `npm run test:run:verbose` runs the same suite with detailed output.
- `npm run typecheck` checks TypeScript without generating files.
- `npm run build` type-checks and creates a production plugin build.
- `npm run bench:vault` runs the repeatable full-read benchmark outside the normal test / CI path.
- `npm run check` runs lint, tests, type-checking, and the production build.

During one implementation slice, run focused tests plus directly affected regression tests. Run the full `npm run check` once when a slice is complete and ready to commit or push.

## Testing in Obsidian

The current plugin implementation remains the POC validation shell until Gate B of Formal Triage Intake replaces the active runtime path. When performing real Obsidian regression testing:

1. Open the repository root as an Obsidian Vault.
2. Build or keep `npm run dev` active.
3. Enable Trail under **Settings → Community plugins**.
4. Open Trail from the Ribbon or **Trail: Open**.
5. Reload the plugin after rebuilding when Obsidian still has an older bundle loaded.
6. Use a written test protocol covering repository / Obsidian starting state, exact fixture data, default values, any Developer Console hook, expected UI / disk end state, cleanup, and whether Obsidian should remain open.

The POC currently demonstrates Project Board / List behavior, optimistic Task status changes, Task-title Modal editing, Fleeting Note lifecycle / conversion paths, Quick Capture, Runtime Store reconciliation, guarded writes, and cross-file compensation. These are technical probes, not formal Product / Data schema commitments. Formal implementation must revalidate the techniques it chooses to carry forward.

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
- `docs/technical-design-baseline.md` — formal Technical Design baseline for Runtime, optimistic state, mutation planning/execution, reconciliation, page selectors, frontend architecture, performance, and reusable UI infrastructure.
- `docs/implementation-plan.md` — V1 implementation roadmap, current near-term focus, and implementation checkpoints; this is the single source of truth for project implementation progress.
- `docs/product-domain-hld.md` — POC-era Product / Domain HLD retained as historical design and validation context; superseded where it conflicts with current canonical docs.
- `docs/technical-design.md` — POC technical baseline and verified architecture evidence only; superseded where it conflicts with the formal design chain.

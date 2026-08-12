# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail has completed its POC exit, Product Design, Canonical Domain Design, Logical Data Model, and Markdown Physical Model stages on the active `poc/plugin-shell` branch. A first formal Technical Design baseline has now been established and is the current design focus.

The current design authority chain is:

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
~~~

The current design stage is **Technical Design**: refining the first formal baseline for Parser, Runtime Store, optimistic state, Mutation planning/execution, reconciliation, page data selection, frontend rendering, validation, migration, and Obsidian integration. POC-era implementation remains technical evidence only and must not redefine the formal schema.

The POC remains valuable as technical evidence. It verified reusable capabilities including Markdown discovery and parsing, stable identity, guarded single-file mutation, representative cross-file mutation and compensation, Runtime Store convergence, a global Mutation Queue, optimistic UI, draft editing, native Obsidian Modal integration, host file-event reconciliation, and UTF-8 BOM tolerance at the read boundary.

The final POC exit architecture concluded that the core approach is viable and that larger structural decisions belong in formal design rather than continued POC expansion.

Active branch:

~~~text
poc/plugin-shell
~~~

Canonical Domain closeout baseline before the current Logical / Physical design closeout:

~~~text
ec43eae70b828c7f9888fd71b7d80847ba14624e
~~~

## Git worktrees

Each development machine uses two Git worktrees:

~~~text
obsidian-trail/          main branch for review, merge, and release
obsidian-trail-active/   active short-lived development branch
~~~

Development work should be performed in `obsidian-trail-active/`.

## POC repository layout

During the POC, the Git repository root is also used as the Obsidian Vault root.

~~~text
obsidian-trail-active/
|-- .obsidian/
|   |-- community-plugins.json
|   `-- plugins/
|       `-- trail/        Generated files loaded by Obsidian
|-- plugin/
|   `-- src/              Trail plugin source code
|-- Trail/                Checked-in POC Markdown fixtures
`-- docs/                 Product and technical design documents
~~~

This repository layout is POC evidence, not the formal production persistence layout. The formal Domain Markdown layout is defined by `docs/markdown-physical-model.md`.

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

The current plugin implementation remains the POC validation shell. When performing real Obsidian regression testing:

1. Open the repository root as an Obsidian Vault.
2. Build or keep `npm run dev` active.
3. Enable Trail under **Settings → Community plugins**.
4. Open Trail from the Ribbon or **Trail: Open**.
5. Reload the plugin after rebuilding when Obsidian still has an older bundle loaded.
6. Use a written test protocol covering repository / Obsidian starting state, exact fixture data, default values, any Developer Console hook, expected UI / disk end state, cleanup, and whether Obsidian should remain open.

The POC currently demonstrates Project Board / List behavior, optimistic Task status changes, Task-title Modal editing, Fleeting Note lifecycle / conversion paths, Quick Capture, Runtime Store reconciliation, guarded writes, and cross-file compensation. These are technical probes, not formal Product / Data schema commitments.

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
- `docs/product-domain-hld.md` — POC-era Product / Domain HLD retained as historical design and validation context; superseded where it conflicts with current canonical docs.
- `docs/technical-design-baseline.md` — formal Technical Design baseline for Runtime, optimistic state, mutation planning/execution, reconciliation, page selectors, frontend architecture, performance, and reusable UI infrastructure.
- `docs/technical-design.md` — POC technical baseline and verified architecture evidence only; superseded where it conflicts with the formal design chain.
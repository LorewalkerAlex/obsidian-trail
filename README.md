# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail has completed its POC exit, formal Product Design, Canonical Domain, Logical Data Model, Markdown Physical Model, Technical Design, Formal Intake, basic Workflow, Implementation Architecture Re-baseline, and Codebase Simplification checkpoints.

The current engineering stage is **Clean Plugin Rebuild**. An independent Architecture Implementation Audit after the Simplification checkpoint found that the existing implementation still carries several Design-to-Code ownership drifts even though its validated user behavior and technical evidence remain useful. Net-new Intake → Workflow work is therefore paused until the clean rebuild is cut over.

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
docs/implementation-architecture.md
    ↓
docs/implementation-plan.md
~~~

`docs/implementation-architecture.md` is the authority for Formal code ownership, dependency direction, Runtime, Mutation, Persistence, Source Sync, Markdown, Query, UI and host boundaries. `docs/implementation-plan.md` is the source of truth for implementation progress and the current rebuild/cutover sequence.

The 2026-08-16 legacy reference checkpoint is `6061ca45569fe7664e0b37ed279928c9559e8592`. Its automated and representative real-Obsidian evidence remains valuable: 49 test files / 191 tests, lint with zero warnings, TypeScript typecheck, production and Diagnostics builds, external managed-file refresh, and a reviewed Diagnostics trace with no warn/error events. The rebuild reuses proven behavior and mechanisms selectively, but does not inherit the old code structure as an architectural baseline.

## Clean rebuild model

The rebuild happens on the current `main` branch and in the current working directory. No separate rebuild worktree or branch is required.

~~~text
plugin/                 Existing runnable reference implementation
plugin-rebuild/         Clean Formal implementation under rebuild
~~~

During the rebuild:

- `plugin/` stays available for live comparison, behavior reference, and proven technical evidence.
- `plugin-rebuild/` must not import production code from `plugin/`.
- Capabilities copied or rewritten from the reference implementation land directly in the canonical owner defined by `docs/implementation-architecture.md`.
- Legacy tests are evidence, not compatibility requirements. Relevant behavior/risk tests are re-established under the new owner.
- No compatibility facade, old/new import bridge, dual mutation plan, or temporary wrong owner is introduced just to ease migration.
- Obsidian production/Diagnostics builds continue to use `plugin/` until the rebuild passes its Cutover Gate.

After parity, full architecture audit, automated checks, and necessary real-host regression, the cutover removes or archives the old `plugin/` and promotes `plugin-rebuild/` to the formal `plugin/` path. `Triage Convert to Project` resumes only after that cutover.

The exact POC implementation / fixture / style baseline remains under `archive/poc/` as earlier technical evidence. It is not part of the active Formal runtime.

## Repository layout

The repository root is also used as the development Obsidian Vault.

~~~text
obsidian-trail-active/
|-- .obsidian/
|   `-- plugins/
|       `-- trail/            Generated plugin loaded by Obsidian; ignored by Git
|-- archive/
|   `-- poc/                  Exact POC implementation / fixture / style baseline
|-- plugin/
|   `-- src/                  Current runnable reference implementation during rebuild
|-- plugin-rebuild/
|   `-- src/                  Clean Formal implementation under rebuild
|-- Trail/                    Local Domain Markdown created at runtime; ignored by Git
`-- docs/                     Product, design and implementation documents
~~~

The root `Trail/` directory is authoritative user/domain persistence produced by the running plugin. It is intentionally not a checked-in fixture. Real Obsidian tests use guarded fixture setup/cleanup rather than committing generated Domain Markdown.

## Development environment

Required versions:

~~~text
Node.js 24.19.0
npm 11.17.0
~~~

Confirm the active versions:

~~~powershell
node --version
npm --version
~~~

Expected output:

~~~text
v24.19.0
11.17.0
~~~

Install the exact project dependencies with:

~~~powershell
npm ci
~~~

## Development workflow

The current runnable plugin still builds from:

~~~text
plugin/
~~~

The clean replacement is developed independently under:

~~~text
plugin-rebuild/
~~~

Generated Obsidian plugin files remain under:

~~~text
.obsidian/plugins/trail/
~~~

Available commands include:

~~~powershell
npm run dev
npm run lint
npm run lint:rebuild
npm run test
npm run test:run
npm run test:run:verbose
npm run test:run:rebuild
npm run typecheck
npm run typecheck:rebuild
npm run check:rebuild
npm run build
npm run build:diagnostics
npm run check
~~~

- `npm run dev` watches/builds the current runnable `plugin/` reference implementation.
- `npm run lint` checks the repository source, including rebuild architecture rules.
- `npm run lint:rebuild` checks only the rebuild source/config surface.
- `npm run test:run` runs the current runnable plugin test suite once.
- `npm run test:run:rebuild` runs only the rebuild test suite.
- `npm run typecheck` checks the current runnable plugin.
- `npm run typecheck:rebuild` checks only `plugin-rebuild/`.
- `npm run check:rebuild` runs rebuild lint, typecheck and tests without building an Obsidian artifact.
- `npm run build` and `npm run build:diagnostics` still produce the current runnable plugin until cutover.
- `npm run check` validates both the legacy reference and the clean rebuild, then performs the current production build.

During a rebuild slice, use focused owner tests first. Run the full root `npm run check` once when a coherent checkpoint is ready. A green legacy suite does not make legacy ownership authoritative; a green rebuild suite does not replace the need for final architecture and real-host gates.

## Testing in Obsidian

Until cutover, real Obsidian regression exercises the current runnable `plugin/` unless a rebuild slice explicitly adds a safe temporary rebuild build path for an independent host risk. Do not make `plugin-rebuild/` the active Obsidian plugin merely to test a compile-time or pure-domain checkpoint.

Every real-host test that is actually needed begins with an explicit protocol covering repository/build state, starting Trail Vault state, required reload, exact actions, expected UI and authoritative-disk result, Diagnostics hooks, cleanup, and final Vault state. Host-state resets operate only on the Trail Vault under test, not unrelated Obsidian windows.

Development Diagnostics remain development observability only, not Product Activity / Domain history.

## Continuous integration

GitHub Actions uses the Node.js version from `.nvmrc`, installs dependencies with `npm ci`, and runs:

~~~powershell
npm run check
~~~

During the rebuild this command validates both trees while the production build still targets `plugin/`. After cutover, the temporary rebuild scripts/config are removed or folded back into the normal `plugin/` toolchain.

## Design documents

- `docs/product-design-baseline.md` — Product Design source of truth.
- `docs/canonical-domain-model.md` — canonical Domain objects, semantics, lifecycle, relationships, field contracts, and derivation boundaries.
- `docs/logical-data-model.md` — logical records, persistence roles, stable references, timestamp contract, Query Contract, and Mutation Contract.
- `docs/markdown-physical-model.md` — authoritative Vault / Markdown / `data.json` persistence layout, serialization rules, validation boundaries, and migration policy.
- `docs/technical-design-baseline.md` — formal conceptual Technical Design for Runtime, optimistic state, mutation planning/execution, reconciliation, frontend architecture, performance and diagnostics boundaries.
- `docs/implementation-architecture.md` — formal code module architecture, dependency direction, shared capabilities, standard read/write pipeline, testing ownership and long-term owner map.
- `docs/implementation-plan.md` — V1 roadmap, current rebuild stage, Cutover Gate and implementation checkpoints.
- `docs/product-domain-hld.md` — POC-era Product / Domain HLD retained as historical design context; superseded where it conflicts with current canonical docs.
- `docs/technical-design.md` — POC technical baseline and verified architecture evidence only; superseded where it conflicts with the formal design chain.
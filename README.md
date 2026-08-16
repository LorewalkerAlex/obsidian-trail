# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail has completed its POC exit, formal Product Design, Canonical Domain, Logical Data Model, Markdown Physical Model, Technical Design, Formal Intake, basic Workflow, **Implementation Architecture Re-baseline**, and **Codebase Simplification** stages. The current engineering stage is **Intake → Workflow**; the next net-new user slice is **Triage Convert to Project**.

The simplified active implementation now follows the long-term owner map in `docs/implementation-architecture.md`: canonical managed paths and Markdown codecs, authoritative Persistence / Source Sync, the final Runtime shape, one global mutation pipeline, a thin UI-facing Application facade, Obsidian host adapters, and a thin `main.ts` composition root. Architecture anti-drift is enforced by ESLint plus focused conformance tests rather than documentation alone.

The 2026-08-16 Simplification Exit passed the active automated suite with zero ESLint warnings, 49 test files / 191 tests, TypeScript typecheck, production build, Diagnostics build, and `git diff --check`. Representative real-Obsidian regression confirmed Trail-controlled write-event suppression and external managed-file refresh; the reviewed Diagnostics session contained no `warn` / `error` events.

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

`docs/implementation-architecture.md` defines the Formal code module map, dependency direction, shared Domain Effects, Physical / Markdown operations, standard read/write framework, Runtime ownership, proportional reliability, and independent-risk testing rules. `docs/implementation-plan.md` remains the single source of truth for project progress and implementation checkpoints.

With Codebase Simplification complete, net-new Intake → Workflow work resumes on the cleaned architecture, beginning with **Triage Convert to Project**. Future slices should reuse the canonical owner/capability boundaries instead of recreating transitional feature stacks.

The exact POC implementation / fixture / style baseline remains preserved under `archive/poc/` as technical evidence. POC-era Area / Task / Fleeting Note code is not part of the active runtime, lint, or test path and is not a target of the formal implementation.

Formal implementation follows the **reuse before build** policy in `docs/technical-design-baseline.md` and the capability-ownership rules in `docs/implementation-architecture.md`. General mechanisms are implemented once and reused by multiple semantic Use Cases; tests follow the same ownership model so an already-proven parser, source mutation or host integration is not mechanically re-tested for every field or Feature name.

Development Diagnostics remain observability infrastructure only, not Product Activity / Domain history. Production builds exclude Diagnostics.

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
`-- docs/                 Product, design and implementation documents
~~~

The root `Trail/` directory is authoritative user/domain persistence produced by the Formal plugin. It is intentionally not a checked-in development fixture. Fresh initialization creates the structure defined by `docs/markdown-physical-model.md`; real Obsidian tests must use guarded fixture setup/cleanup rather than committing generated Domain Markdown. The archived POC fixture remains under `archive/poc/Trail/` and is unaffected by the root-only ignore rule.

## Development environment

Required versions:

~~~text
Node.js 24.19.0
npm 11.17.0
~~~

Node.js is managed with nvm-windows on the current development machines. On machines where the NVM symlink cannot be activated because of local Windows permissions, the installed Node version can be placed on the current terminal PATH directly; project Git and npm commands remain the same across environments.

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

## Initial setup

After cloning the repository or switching to a new worktree, make Node.js 24.19.0 available in the current terminal, then install the exact project dependencies:

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

During one implementation slice, run focused tests plus directly affected representative regressions. Run the full `npm run check` once when a coherent checkpoint is ready. Shared mechanism tests are owned by the shared capability; Feature tests cover Feature semantics and wiring rather than repeating the same Markdown or host-risk matrix under different names.

## Testing in Obsidian

The active plugin is the Formal Trail runtime. Real Obsidian regression follows **independent-risk sampling**: once a shared implementation path has representative host evidence, do not repeat the same real-host test merely because a different field, Entity or button reuses it. Add real-host coverage when a change introduces a genuinely different Obsidian API, source type, cross-source execution pattern, host event interaction or other independent risk.

Every real-host test that is actually needed still begins with an explicit protocol covering:

1. repository / branch / build state and the starting Trail Vault state；
2. whether the Trail plugin / relevant Trail Vault must be reloaded before the test；
3. the exact page / view to open, fixture data and important default values；
4. any Development Diagnostics / Developer Console hook that must be armed；
5. the expected UI and authoritative-disk end state；
6. cleanup / restore steps, including restoration of any diagnostics hook；
7. whether the relevant Trail Vault should remain open, be closed, or be reloaded afterward.

If a host-state reset is needed, operate only on the relevant Trail Vault / plugin lifecycle; do not close unrelated Obsidian windows or Vaults. Test fixture names should be short and visually distinct so manual verification remains low-friction.

Development Diagnostics are enabled only in diagnostics-enabled development builds. They persist a compact JSONL trace under `<vault-config>/plugins/trail/diagnostics/trace.jsonl`, keep at most the latest two sessions with at most 2000 events per session, and expose **Trail: Copy diagnostics trace**. The trace is development observability, not Canonical Domain state, Event Sourcing, or Product Activity history.

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
- `docs/technical-design-baseline.md` — formal conceptual Technical Design for Runtime, optimistic state, mutation planning/execution, reconciliation, frontend architecture, performance and diagnostics boundaries.
- `docs/implementation-architecture.md` — formal code module architecture, dependency direction, shared capabilities, standard read/write pipeline, testing ownership and Re-baseline migration contract.
- `docs/implementation-plan.md` — V1 roadmap, current stage and implementation checkpoints.
- `docs/product-domain-hld.md` — POC-era Product / Domain HLD retained as historical design and validation context; superseded where it conflicts with current canonical docs.
- `docs/technical-design.md` — POC technical baseline and verified architecture evidence only; superseded where it conflicts with the formal design chain.

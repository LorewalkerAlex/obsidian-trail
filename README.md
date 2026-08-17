# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail has completed its POC exit, formal Product Design, Canonical Domain, Logical Data Model, Markdown Physical Model, Technical Design, Formal Intake, basic Workflow, Implementation Architecture Re-baseline, Codebase Simplification, Clean Plugin Rebuild, independent Architecture Implementation Audit, and directory Cutover checkpoints.

The current engineering stage is **Intake → Workflow**. The first net-new slice after Cutover is `Triage Convert to Project`.

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

`docs/implementation-architecture.md` is the authority for Formal code ownership, dependency direction, Runtime, Mutation, Persistence, Source Sync, Markdown, Query, UI and host boundaries. `docs/implementation-plan.md` is the source of truth for implementation progress and the current feature sequence.

The 2026-08-16 legacy reference checkpoint is `6061ca45569fe7664e0b37ed279928c9559e8592`. Its automated and representative real-Obsidian evidence remains valuable: 49 test files / 191 tests, lint with zero warnings, TypeScript typecheck, production and Diagnostics builds, external managed-file refresh, and a reviewed Diagnostics trace with no warn/error events. Git history now preserves that implementation; it is no longer kept as a second active plugin source tree.

The clean rebuild completed parity validation for Quick Capture, Triage Management, Project / Workflow Issue, and Triage Accept, plus independent-risk evidence for managed-file external refresh, read-only recovery, destination-first source transitions, safe compensation boundaries, host event suppression, and development Validation Evidence. The independent Architecture Implementation Audit on 2026-08-17 returned **PASS** with no blocking finding. Cutover then promoted the audited clean implementation to the canonical `plugin/` path and removed the temporary dual-tree build/test configuration.

## Formal implementation model

The repository has one active Formal plugin implementation:

~~~text
plugin/
`-- src/                  Formal implementation and current Obsidian build target
~~~

The old Formal implementation remains recoverable from Git history at checkpoint `6061ca45569fe7664e0b37ed279928c9559e8592`; it is intentionally not duplicated under `archive/`. The exact POC implementation / fixture / style baseline remains under `archive/poc/` as historical technical evidence and is not part of the active Formal runtime.

The Formal source follows the ownership map in `docs/implementation-architecture.md`: Domain, Application, Markdown, Persistence, Runtime, Mutation, Source Sync, Query, UI, Obsidian adapters, Diagnostics, and the thin composition root each keep one canonical owner and dependency direction.

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
|   `-- src/                  Formal Trail implementation
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

The active Obsidian source and build target is:

~~~text
plugin/
~~~

Generated Obsidian plugin files remain under:

~~~text
.obsidian/plugins/trail/
~~~

Available commands include:

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

- `npm run dev` watches/builds the Formal Obsidian entry.
- `npm run lint` checks the repository source and architecture restrictions.
- `npm run test:run` runs the Formal automated test suite once.
- `npm run typecheck` checks the Formal implementation.
- `npm run build` typechecks and creates the production Obsidian bundle with development Diagnostics disabled.
- `npm run build:diagnostics` typechecks and creates the development Diagnostics bundle.
- `npm run check` runs lint, the Formal test suite, typecheck, and the production build through the normal toolchain.

During a feature slice, use focused owner tests first. Run the full root `npm run check` once when a coherent checkpoint is ready. Architecture and representative real-host evidence remain separate exit gates where the change affects those risks.

## Testing in Obsidian

Real Obsidian regression exercises the Formal bundle generated under `.obsidian/plugins/trail/`. Representative validation covers the Host boundary rather than repeating every pure planner/query rule already owned by automated tests.

Diagnostics builds expose `Trail: Copy validation evidence`, which exports recent structured diagnostics together with the current Runtime snapshot, plugin data, and raw managed Trail Markdown. This is development verification infrastructure only: it must not participate in product correctness or ship in the production bundle.

The representative clean-rebuild real-host evidence was reviewed before Cutover, including recovery from `read-only-error` after a later valid managed-source refresh. Cutover itself changes repository ownership paths/tooling rather than product behavior, so that retained evidence remains the host-behavior baseline. Real-host test data is cleaned after review so the local `Trail/` persistence does not accumulate stale QA fixtures. Host-state resets operate only on the Trail Vault under test, not unrelated Obsidian windows.

## Continuous integration

GitHub Actions uses the Node.js version from `.nvmrc`, installs dependencies with `npm ci`, and runs:

~~~powershell
npm run check
~~~

After Cutover, this is the single Formal validation path; no temporary dual-tree scripts or alternate test configuration remain.

## Design documents

- `docs/product-design-baseline.md` — Product Design source of truth.
- `docs/canonical-domain-model.md` — canonical Domain objects, semantics, lifecycle, relationships, field contracts, and derivation boundaries.
- `docs/logical-data-model.md` — logical records, persistence roles, stable references, timestamp contract, Query Contract, and Mutation Contract.
- `docs/markdown-physical-model.md` — authoritative Vault / Markdown / `data.json` persistence layout, serialization rules, validation boundaries, and migration policy.
- `docs/technical-design-baseline.md` — formal conceptual Technical Design for Runtime, optimistic state, mutation planning/execution, reconciliation, frontend architecture, performance and diagnostics boundaries.
- `docs/implementation-architecture.md` — formal code module architecture, dependency direction, shared capabilities, standard read/write pipeline, testing ownership and long-term owner map.
- `docs/implementation-plan.md` — V1 roadmap, current stage, completed Cutover checkpoint, and implementation sequence.
- `docs/product-domain-hld.md` — POC-era Product / Domain HLD retained as historical design context; superseded where it conflicts with current canonical docs.
- `docs/technical-design.md` — POC technical baseline and verified architecture evidence only; superseded where it conflicts with the formal design chain.
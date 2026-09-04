# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian. It keeps authoritative work data in readable Markdown while providing a focused personal execution UI on top of the Vault.

## Current development state

Current implementation baseline, active gaps, build order, and verification state are maintained in [`docs/implementation.md`](docs/implementation.md).

## Engineering and project documentation

Repository-level engineering rules live in [`ENGINEERING.md`](ENGINEERING.md).

Trail-specific project answers follow this authority chain:

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
```

Current execution is planned separately:

```text
docs/implementation.md
    ↓
code
```

- `docs/product.md` — user-facing purpose, V1 scope, model, experience, and product rules.
- `docs/domain.md` — canonical terminology, entities, relationships, lifecycle, invariants, and derived/historical facts.
- `docs/data.md` — logical records, identity, references, authority, Markdown/plugin-data persistence, integrity, and schema evolution.
- `docs/architecture.md` — system boundaries, dependency direction, runtime/write flows, reliability, host responsibility, and target architecture.
- `docs/ui.md` — canonical V1 UI behavior and presentation semantics. Current implementation appearance is not authority for this document.
- `docs/ui-blueprints.md` — durable V1 Page-composition, responsive, and shared-owner blueprint synthesized from the completed UI drawing pass. It concretizes `ui.md` without redefining Product/Domain semantics.
- `docs/design-to-code-map.md` — traceability from resolved design responsibilities to canonical code owners and the target code tree.
- `docs/implementation.md` — current implementation facts, alignment debt, active construction plan, and verification state.

Git history is the historical archive. Superseded POC notes, drawing workbenches, and checkpoint narratives do not need to remain duplicated in the active documentation tree.

## Repository layout

The repository root can also be used as the development Obsidian Vault.

```text
obsidian-trail/
├─ .github/
├─ .obsidian/
│  └─ plugins/
│     └─ trail/
│        ├─ data.json    version-controlled development-Vault Configuration / Workspace State
│        └─ ...          generated plugin output and diagnostics; ignored by Git
├─ docs/                 Trail project documentation
├─ plugin/
│  ├─ src/               active TypeScript/React implementation
│  └─ styles/            canonical modular stylesheet sources
├─ Trail/                version-controlled host-test observation data
├─ ENGINEERING.md
├─ README.md
└─ ...
```

`Trail/` is disposable test data for the repository development Vault. It is versioned so real Obsidian persistence effects can be inspected through ordinary Git diffs. The development Vault also versions its `data.json` alongside `Trail/` observation data so those two authoritative persistence classes stay coherent during cross-machine host validation. These checked-in development-Vault values are not Product facts or production defaults. Generated plugin bundles, diagnostics, graph state, and workspace state remain machine-local/ignored.

## Development environment

Required versions:

```text
Node.js 24.19.0
npm 11.17.0
```

Check the active versions:

```powershell
node --version
npm --version
```

Install exact dependencies:

```powershell
npm ci
```

## Commands

```powershell
npm run dev
npm run lint
npm run test
npm run test:run
npm run test:run:verbose
npm run typecheck
npm run build
npm run build:diagnostics
npm run check
```

- `npm run dev` watches active TypeScript/React and canonical stylesheet modules and writes generated Obsidian plugin artifacts.
- `npm run lint` includes architectural dependency restrictions.
- `npm run test:run` runs the formal automated test suite once.
- `npm run typecheck` checks the TypeScript implementation.
- `npm run build` creates the production JavaScript bundle and deterministically composes canonical stylesheet modules into generated Obsidian `styles.css`.
- `npm run build:diagnostics` creates a diagnostics-enabled development bundle and the same generated stylesheet.
- `npm run check` runs lint, tests, typecheck, and the production build.

During implementation, use focused owner/direct-consumer validation while iterating. Run the full `npm run check` at coherent cross-cutting or release checkpoints rather than after every small internal change.

For interactive development-host work, keep a diagnostics-enabled bundle loaded. `npm run check` ends with the production build and therefore disables diagnostics; after a production build, run `npm run build:diagnostics` before returning to manual Obsidian interaction when operation-trace evidence is needed.

## Real Obsidian verification

Representative real-host verification exercises host-specific risks that pure or jsdom tests cannot establish reliably. Diagnostics builds expose development-only evidence for the command/mutation/persistence/reconcile chain.

When `Trail/` is used during host validation, Git diff is an additional observation channel for Markdown write effects. Versioned development-Vault `data.json` keeps Configuration/Workspace State references coherent with those observations across machines. Correctness must not depend on diagnostics output or on any specific checked-in development fixture value.

## Continuous integration

GitHub Actions installs dependencies with `npm ci` and runs:

```powershell
npm run check
```

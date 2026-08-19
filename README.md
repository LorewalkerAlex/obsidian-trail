# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian. It keeps authoritative work data in readable Markdown while providing a focused task and project execution UI on top of the Vault.

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
docs/design-to-code-map.md
```

Current execution is planned separately:

```text
docs/implementation.md
    ↓
code
```

- `docs/product.md` — user-facing product purpose, scope, model, experience, and product rules.
- `docs/domain.md` — canonical terminology, domain model, relationships, lifecycle, invariants, and derived/historical facts.
- `docs/data.md` — logical records, identity, references, authority, Markdown / plugin-data persistence, integrity, and schema evolution.
- `docs/architecture.md` — system boundaries, shared capabilities, dependency direction, runtime/write flows, reliability, and target architecture.
- `docs/design-to-code-map.md` — traceability from design responsibilities to canonical code owners and the target code tree.
- `docs/implementation.md` — current execution baseline, active changes, dependency-ordered build plan, and verification state.

Git history is the historical archive. Superseded POC code and documents are not duplicated in the active repository tree.

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
│  └─ src/               active formal implementation
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

- `npm run dev` watches the active plugin source and writes the generated Obsidian bundle.
- `npm run lint` includes architectural dependency restrictions.
- `npm run test:run` runs the formal automated test suite once.
- `npm run typecheck` checks the TypeScript implementation.
- `npm run build` creates the production bundle with development diagnostics disabled.
- `npm run build:diagnostics` creates a diagnostics-enabled development bundle.
- `npm run check` runs lint, tests, typecheck, and the production build.

During implementation, use focused owner-level validation while iterating. Run the full `npm run check` at a coherent checkpoint rather than after every small internal change.

For interactive development-host work, keep a diagnostics-enabled bundle loaded. `npm run check` ends with the production build and therefore disables diagnostics; after any production `npm run check` or `npm run build`, run `npm run build:diagnostics` before returning to manual Obsidian interaction so the development operation trace remains available.

## Real Obsidian verification

Representative real-host verification exercises host-specific risks that cannot be established by pure or jsdom tests alone. Diagnostics builds expose development-only validation evidence for the command / mutation / persistence / reconcile chain.

When `Trail/` is used during host validation, Git diff is an additional observation channel for the actual Markdown write effects. The versioned development-Vault `data.json` keeps Configuration/Workspace State references coherent with those observations across machines. The test state remains development evidence only; production correctness must not depend on diagnostics output or on any specific checked-in `Trail/` or development-Vault configuration value.

## Continuous integration

GitHub Actions installs dependencies with `npm ci` and runs:

```powershell
npm run check
```

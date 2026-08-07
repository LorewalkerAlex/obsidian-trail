# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail has reached the POC exit candidate stage. The POC is evaluated by reusable technical capabilities rather than by completion of every first-version product feature. Concrete Task, Project, and Fleeting Note paths were used as representative probes for Markdown reading and parsing, guarded single-file mutation, cross-file compensation, Runtime Store convergence, queueing, optimistic UI, draft editing, native Obsidian Modal integration, and host file-event reconciliation.

The repeated single-file guarded Markdown mutation path has been consolidated into a shared pure Markdown utility reused by Task status writing and Active Fleeting Note editing. A native Obsidian Task-title Modal has also verified the draft-based edit path end to end: dirty-close protection, Save / Cancel, stale-Fingerprint rejection, draft preservation on failure, and return to the existing Project workspace. UTF-8 BOM compatibility has been verified at the Trail read boundary without rewriting the user's file.

The POC exit architecture audit found no need to replace the core approach or copy the heavier indexing infrastructure used by mature plugins such as Tasks or Dataview. Final POC cleanup is intentionally limited to correctness issues already demonstrated by the current architecture. Larger structural changes such as an application action layer, React-native external-store subscription, incremental indexing, release packaging, and configurable metadata schema resolution are inputs to the formal design / LLD stage rather than reasons to keep expanding the POC.

The active POC branch is:

~~~text
poc/plugin-shell
~~~

The current POC has established the plugin shell, Markdown discovery and parsing, stable UUID identity, source ranges and Fingerprint guards, a plugin-level Runtime Store with a mutation refresh boundary, a plugin-level generic global Mutation Queue, Vault file-event reconciliation, reusable guarded region edits, and reusable cross-file Mutation semantics. Task status changes, Task-title editing, Fleeting Note-to-Task and Fleeting Note-to-Project conversion, Archive, Delete to Trash, Restore, Quick Capture, and Active Fleeting Note editing are routed through the plugin entrypoint.

Trail discovers checked-in fixtures under `Trail/`, parses Area, Project, Task, Subtask, Task Note, Project Note, and Fleeting Note data, and renders the confirmed Store snapshot in a single Trail `ItemView`. The Project workspace provides Board and List views over the same Task set; Task status changes use optimistic UI with local Pending/error state, while Task-title and Fleeting Note editing use draft-based flows with stale-Fingerprint protection.

The plugin listens for relevant `create`, `modify`, `delete`, and `rename` events under the managed Trail scope, debounces refreshes, and ignores unrelated files. External Project, Area, Task, and Fleeting Note changes converge into an open Trail view without reopening it. The reader uses one Markdown snapshot for Frontmatter and body parsing, tolerates a single UTF-8 BOM at the start of managed files, and does not rewrite the original file merely to normalize encoding.

Representative cross-file flows create or confirm their target before removing the source and expose `unchanged`, `compensated`, and `partial` outcomes. Project compensation rechecks the latest file content before deleting an unchanged created target, and all authoritative writes remain inside the global Mutation Queue and Runtime Store mutation boundary.

The current full POC audit baseline is commit `9d4992e91dcab4e5183e71520d2495432a297109` (`feat: validate core poc mutation and modal capabilities`), for which `npm run check` passed ESLint, 32 test files with 198 / 198 tests, TypeScript type-checking, and the production build. Subsequent correctness cleanup is validated separately before the final POC exit commit.

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

The POC layout is provisional and may change after testing.

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

Once `package-lock.json` has been committed, install the exact project dependencies with:

~~~powershell
npm ci
~~~

## Plugin development workflow

Trail source code is developed under:

~~~text
plugin/
~~~

The build process will place the generated plugin files under:

~~~text
.obsidian/plugins/trail/
~~~

Obsidian will load the plugin from that directory.

The generated plugin will contain:

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
- `npm run lint` checks the source against ESLint and the Obsidian plugin rules.
- `npm run test` starts Vitest in interactive watch mode.
- `npm run test:run` runs the test suite once with the compact Vitest dot reporter.
- `npm run test:run:verbose` runs the same test suite with Vitest's default detailed reporter.
- `npm run typecheck` checks TypeScript without generating files.
- `npm run build` type-checks and creates a production plugin build.
- `npm run bench:vault` runs the repeatable full-read benchmark without adding it to the normal test or CI path.
- `npm run check` runs lint, tests, type-checking, and the production build.

During one development slice, run the new or changed tests plus the directly affected regression tests. Add targeted lint, type-checking, or a production build when shared infrastructure or the Obsidian-loaded bundle changes. Run the full `npm run check` once when the slice is complete and ready to commit or push.

## Testing in Obsidian

1. Open the repository root as an Obsidian Vault.
2. Run `npm run build`, or keep `npm run dev` active during development.
3. Enable Trail under **Settings → Community plugins**.
4. Open Trail from the Ribbon or run the **Trail: Open** command.
5. Opening Trail again should reveal the existing Trail view instead of creating another Trail view.
6. Reload Trail after rebuilding when Obsidian still has an older build loaded.

With the checked-in fixture, the Dashboard should show `1 Area · 1 Project · 3 Tasks · 0 Fleeting Notes`.

While Trail is open, editing a managed Project Markdown file should update the view automatically. Creating, deleting, or renaming a direct Project file under `Trail/Areas/<Area>/` should also reconcile the displayed data, while unrelated Markdown outside the managed scope should not affect Trail.

From Areas, open a specific Project and confirm that returning through the Project navigation keeps that selection. In Board view, drag Tasks across all five status columns and confirm that the card moves immediately, shows `Updating...`, then converges to the Markdown result without a flashback. A rejected write or injected Fingerprint conflict must return only the affected card to its confirmed column and show its error while other Task controls remain available. Dragging a Task with an incomplete Subtask into `completed` must be rejected by the existing domain rule and rolled back. Successful completion must add a `+08:00` completion timestamp; dragging the Task out of `completed` must remove it. List view must show the same selected Project and effective statuses, and its status selects should exercise the same queue and write path. Restore the checked-in fixture before committing.

The Fleeting Notes page reads the active, archived, and deleted lifecycle files. Creating or editing a valid top-level record in any managed lifecycle file should update the open page automatically. Quick Capture should create the active file when absent, add one UUID-backed record, clear the input only after success, and update both the Dashboard count and the Fleeting Notes page without reloading the plugin. Editing an active Note should preserve its UUID and lifecycle metadata. If the same Markdown record changes outside Trail after Edit begins, Save must reject the stale Fingerprint and keep the draft open instead of overwriting the external change. To test Task conversion, select a target Project and click `Convert to Task`; the Note should disappear only after the queued cross-file Mutation completes, the new `backlog` / `medium` Task should appear in the selected Project, and no transient Data issues should appear. To test Project conversion, keep or choose the target Area, review the suggested Project name, and click `Convert to Project`; Trail should create one `planned` Project with a new UUID and canonical `Overview / Tasks / Notes` sections, then remove the source Note only after the Project is confirmed. An existing file or folder at the target path must remain untouched and return an `unchanged` result. Archive should move an active Note to `Trail/Archive/Fleeting Notes.md`; Delete should move it to `Trail/Trash/Fleeting Notes.md`; Restore should return it to the active file while preserving its UUID and `created` timestamp. The UI remains ordered by `created` even though restored records are appended physically. Remove local Quick Capture, lifecycle, and conversion test files before committing.

Each real Obsidian test should state the starting repository and Obsidian state, whether the plugin must be reloaded, the exact view and test data, which values remain at their defaults, any Developer Console hook and its restore command, the expected disk and UI end state, and whether Obsidian should remain open. Use short, visually distinct fixture names. Before closing Developer Tools after fault injection, confirm every temporary restore hook is `undefined`.

## Continuous integration

GitHub Actions uses the Node.js version from `.nvmrc`, installs the exact dependency tree with `npm ci`, and runs:

~~~powershell
npm run check
~~~

## Design documents

- `docs/product-domain-hld.md`
- `docs/technical-design.md`

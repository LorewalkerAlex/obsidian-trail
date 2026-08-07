# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail is currently in the proof-of-concept stage. The POC is evaluated by reusable technical capabilities rather than by completion of every first-version product feature. Concrete Task, Project, and Fleeting Note paths are representative probes that prove reading, guarded Markdown mutation, cross-file compensation, Runtime Store convergence, queueing, optimistic UI, draft handling, and Obsidian host integration.

The POC capability matrix has now been aligned, and the repeated single-file guarded Markdown mutation path has been consolidated into a shared pure Markdown utility reused by both Task status writing and Active Fleeting Note editing. The next capability probe is a minimal Task-title Modal draft flow; after that, the capability matrix will be reviewed again before deciding whether to exit POC.

The active POC branch is:

~~~text
poc/plugin-shell
~~~

The current POC has established the plugin shell, Markdown reading, precise Task status write-back, a plugin-level Runtime Store with a mutation refresh boundary, a plugin-level generic global Mutation Queue, Vault file-event reconciliation, and reusable cross-file Mutation semantics. Task status changes, Fleeting Note-to-Task and Fleeting Note-to-Project conversion, Archive, Delete to Trash, and Restore are routed through the plugin entrypoint. Trail discovers checked-in fixtures under `Trail/`, parses Area, Project, Task, Subtask, Task Note, Project Note, and Fleeting Note data, and renders the confirmed Store snapshot in a single Trail `ItemView`. Active, archived, and deleted Fleeting Notes are read from dedicated Markdown files and displayed in an interactive lifecycle page.

The plugin listens for relevant `create`, `modify`, `delete`, and `rename` events under `Trail/Areas/` and for the managed Fleeting Note lifecycle files under `Trail/Fleeting Notes.md`, `Trail/Archive/Fleeting Notes.md`, and `Trail/Trash/Fleeting Notes.md`. It debounces refreshes and ignores unrelated or nested files outside the managed scope. External Project and Fleeting Note lifecycle changes update an open Trail view without reopening it. Area and Project frontmatter are parsed from the same `Vault.cachedRead()` Markdown snapshot as the body, avoiding a post-Mutation race with stale `MetadataCache` data. While a queued Mutation is running, the Runtime Store suppresses file-event refreshes and performs one final reconciliation after the Mutation finishes, including failure paths.

Areas now provides a real Project entry path, and the selected Project remains active while navigating between Trail pages. The Project workspace offers Board and List views over the same Task set. The Board groups Tasks into `backlog`, `todo`, `doing`, `blocked`, and `completed`, automatically sorts each column by priority, due date, creation time, and UUID, and supports native cross-column drag and drop without adding a drag library. Every Task also keeps a status select as a keyboard- and test-friendly fallback. Status changes update the UI optimistically, show pending feedback only on the affected Task, and roll that Task back with a local error when the queued write fails or its Fingerprint is stale. Moving into `completed` supplies a `+08:00` completion timestamp; moving out lets the existing Writer remove it. The write path relocates the Task by UUID in the latest file content, verifies its source Fingerprint, applies a minimal title-line replacement through `Vault.process()`, reparses the written Markdown, and reconciles the shared Runtime Store.

The representative cross-file POC converts a Fleeting Note into either a new `backlog` / `medium` Task or a new `planned` Project. Project conversion lets the user choose an Area and edit a Windows-safe Project name, creates a new UUID and canonical `Overview / Tasks / Notes` Markdown, writes the Fleeting Note text into `Overview`, confirms the parsed result, removes the source record, and compensates an unchanged created Project through Obsidian's FileManager if source removal fails. Existing file or folder paths are reported as `unchanged` conflicts rather than overwritten. The same cross-file executor also powers Fleeting Note Archive, Delete to Trash, and Restore while preserving the original Fleeting Note UUID and `created` timestamp.

The Fleeting Notes page uses card-based Active, Archived, and Trash sections, keeps each section ordered by `created`, and exposes pending, error, and `Review required` states. Fleeting Note-to-Task, lifecycle, and Fleeting Note-to-Project success and representative failure paths have been verified end to end in Windows Desktop Obsidian. Project conversion host verification covered successful creation, an existing-path `unchanged` result, a representative `partial` result, manual recovery, Runtime Store convergence, and queue continuation.

The Dashboard now shows the active Fleeting Note count and provides a minimal Quick Capture form. A successful capture trims one non-empty line, generates a new UUID and `+08:00` `created` timestamp, creates `Trail/Fleeting Notes.md` when needed, confirms the parsed record, and clears the input. Creation failures keep the draft visible. Active Fleeting Notes can also edit only their visible text while preserving UUID, `created`, and optional `cleanup_due` metadata. The editor pins the Note snapshot from the moment editing begins, so a Runtime Store refresh cannot silently replace the expected Fingerprint; an external Markdown change rejects Save, keeps the draft open, and still allows a later valid edit after cancellation. Quick Capture, normal editing, external-change conflict rejection, Dashboard counting, Runtime Store convergence, and queue continuation have been verified in Windows Desktop Obsidian.

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

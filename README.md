# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail is currently in the proof-of-concept stage.

The active POC branch is:

~~~text
poc/plugin-shell
~~~

The current POC has established the plugin shell, Markdown reading, precise Task status write-back, a plugin-level Runtime Store with a mutation refresh boundary, a plugin-level generic global Mutation Queue, Vault file-event reconciliation, and reusable cross-file Mutation semantics. Task status changes, Fleeting Note-to-Task and Fleeting Note-to-Project conversion, Archive, Delete to Trash, and Restore are routed through the plugin entrypoint. Trail discovers checked-in fixtures under `Trail/`, parses Area, Project, Task, Subtask, Task Note, Project Note, and Fleeting Note data, and renders the confirmed Store snapshot in a single Trail `ItemView`. Active, archived, and deleted Fleeting Notes are read from dedicated Markdown files and displayed in an interactive lifecycle page.

The plugin listens for relevant `create`, `modify`, `delete`, and `rename` events under `Trail/Areas/` and for the managed Fleeting Note lifecycle files under `Trail/Fleeting Notes.md`, `Trail/Archive/Fleeting Notes.md`, and `Trail/Trash/Fleeting Notes.md`. It debounces refreshes and ignores unrelated or nested files outside the managed scope. External Project and Fleeting Note lifecycle changes update an open Trail view without reopening it. Area and Project frontmatter are parsed from the same `Vault.cachedRead()` Markdown snapshot as the body, avoiding a post-Mutation race with stale `MetadataCache` data. While a queued Mutation is running, the Runtime Store suppresses file-event refreshes and performs one final reconciliation after the Mutation finishes, including failure paths.

On the Project page, temporary `Mark doing` and `Mark todo` actions can move an existing Task between `todo` and `doing`. Each Task shows pending feedback while a typed update callback submits its command to the plugin-level serial queue. The write path relocates the Task by UUID in the latest file content, verifies its source Fingerprint, applies a minimal title-line replacement through `Vault.process()`, reparses the written Markdown, and reconciles the shared Runtime Store.

The representative cross-file POC converts a Fleeting Note into either a new `backlog` / `medium` Task or a new `planned` Project. Project conversion lets the user choose an Area and edit a Windows-safe Project name, creates a new UUID and canonical `Overview / Tasks / Notes` Markdown, writes the Fleeting Note text into `Overview`, confirms the parsed result, removes the source record, and compensates an unchanged created Project through Obsidian's FileManager if source removal fails. Existing file or folder paths are reported as `unchanged` conflicts rather than overwritten. The same cross-file executor also powers Fleeting Note Archive, Delete to Trash, and Restore while preserving the original Fleeting Note UUID and `created` timestamp.

The Fleeting Notes page uses card-based Active, Archived, and Trash sections, keeps each section ordered by `created`, and exposes pending, error, and `Review required` states. Fleeting Note-to-Task, lifecycle, and Fleeting Note-to-Project success and representative failure paths have been verified end to end in Windows Desktop Obsidian. Project conversion host verification covered successful creation, an existing-path `unchanged` result, a representative `partial` result, manual recovery, Runtime Store convergence, and queue continuation.

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
npm run typecheck
npm run build
npm run bench:vault
npm run check
~~~

- `npm run dev` watches source and static files and updates `.obsidian/plugins/trail/`.
- `npm run lint` checks the source against ESLint and the Obsidian plugin rules.
- `npm run test` starts Vitest in interactive watch mode.
- `npm run test:run` runs the test suite once.
- `npm run typecheck` checks TypeScript without generating files.
- `npm run build` type-checks and creates a production plugin build.
- `npm run bench:vault` runs the repeatable full-read benchmark without adding it to the normal test or CI path.
- `npm run check` runs lint, tests, type-checking, and the production build.

## Testing in Obsidian

1. Open the repository root as an Obsidian Vault.
2. Run `npm run build`, or keep `npm run dev` active during development.
3. Enable Trail under **Settings → Community plugins**.
4. Open Trail from the Ribbon or run the **Trail: Open** command.
5. Opening Trail again should reveal the existing Trail view instead of creating another Trail view.
6. Reload Trail after rebuilding when Obsidian still has an older build loaded.

With the checked-in fixture, the Dashboard should show `1 Area · 1 Project · 3 Tasks`.

While Trail is open, editing a managed Project Markdown file should update the view automatically. Creating, deleting, or renaming a direct Project file under `Trail/Areas/<Area>/` should also reconcile the displayed data, while unrelated Markdown outside the managed scope should not affect Trail.

On the Project page, `todo` and `doing` Tasks expose temporary `Mark doing` and `Mark todo` actions. Clicking either action may show `Updating...` briefly, should change only the Task status metadata, keep the checkbox unchecked, pass the write through the plugin-level serial queue, and refresh the shared Store without a visible flashback. Test both directions and restore the checked-in fixture before committing.

The Fleeting Notes page reads the active, archived, and deleted lifecycle files. Creating or editing a valid top-level record in any managed lifecycle file should update the open page automatically. To test Task conversion, select a target Project and click `Convert to Task`; the Note should disappear only after the queued cross-file Mutation completes, the new `backlog` / `medium` Task should appear in the selected Project, and no transient Data issues should appear. To test Project conversion, keep or choose the target Area, review the suggested Project name, and click `Convert to Project`; Trail should create one `planned` Project with a new UUID and canonical `Overview / Tasks / Notes` sections, then remove the source Note only after the Project is confirmed. An existing file or folder at the target path must remain untouched and return an `unchanged` result. Archive should move an active Note to `Trail/Archive/Fleeting Notes.md`; Delete should move it to `Trail/Trash/Fleeting Notes.md`; Restore should return it to the active file while preserving its UUID and `created` timestamp. The UI remains ordered by `created` even though restored records are appended physically. Remove local lifecycle and conversion test files before committing.

Each real Obsidian test should state the starting repository and Obsidian state, whether the plugin must be reloaded, the exact view and test data, which values remain at their defaults, any Developer Console hook and its restore command, the expected disk and UI end state, and whether Obsidian should remain open. Use short, visually distinct fixture names. Before closing Developer Tools after fault injection, confirm every temporary restore hook is `undefined`.

## Continuous integration

GitHub Actions uses the Node.js version from `.nvmrc`, installs the exact dependency tree with `npm ci`, and runs:

~~~powershell
npm run check
~~~

## Design documents

- `docs/product-domain-hld.md`
- `docs/technical-design.md`

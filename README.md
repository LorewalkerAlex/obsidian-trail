# Trail

Trail is a Markdown-first personal project and task management plugin for Obsidian.

## Current status

Trail is currently in the proof-of-concept stage.

The active POC branch is:

~~~text
poc/plugin-shell
~~~

The current POC has established the plugin shell, Markdown reading, precise Task status write-back, a plugin-level Runtime Store, a plugin-level generic global Mutation Queue, and Vault file-event reconciliation. Task status changes are the first command type routed through that Queue. Trail discovers checked-in fixtures under `Trail/`, parses Area, Project, Task, Subtask, Task Note, and Project Note data, and renders the confirmed Store snapshot in a single Trail `ItemView`.

The plugin listens for relevant `create`, `modify`, `delete`, and `rename` events under `Trail/Areas/`, debounces refreshes, and ignores unrelated or nested files outside the managed scope. External Markdown changes, Project file creation, deletion, and rename now update an open Trail view without reopening it.

On the Project page, temporary `Mark doing` and `Mark todo` actions can move an existing Task between `todo` and `doing`. Each Task shows pending feedback while a typed update callback submits its command to the plugin-level serial queue. The write path relocates the Task by UUID in the latest file content, verifies its source Fingerprint, applies a minimal title-line replacement through `Vault.process()`, reparses the written Markdown, and reconciles the shared Runtime Store.

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

## Continuous integration

GitHub Actions uses the Node.js version from `.nvmrc`, installs the exact dependency tree with `npm ci`, and runs:

~~~powershell
npm run check
~~~

## Design documents

- `docs/product-domain-hld.md`
- `docs/technical-design.md`

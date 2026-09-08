# Stage 8 Design Holds

> **Status: temporary, non-authoritative design hold.** This note preserves unresolved Stage 8 decisions and already-observed visual contradictions without changing the canonical Product / Domain / Data / Architecture / UI contract. When the held decisions are closed, migrate the accepted outcome into the normal authority chain and delete this note.

## 1. Workflow Issue human-readable identifier

### 1.1 Direction already established

Trail should gain a compact human-readable Workflow Issue identifier for scanning, search, copying, Peek, Full Item, and other Issue surfaces.

A Workspace-wide constant prefix does not provide enough distinction. The current preferred direction is therefore **Project-scoped visible prefixes/keys**, with every Project owning a required prefix/key used by its Workflow Issues.

This direction is intentionally not yet a schema or Domain decision.

Current canonical opaque `IssueId` remains the stable internal identity while this design is unresolved. Existing Domain behavior that a Workflow Issue may move between Projects without replacing its stable Issue identity also remains unchanged until the identifier design explicitly resolves the visible-reference consequences.

### 1.2 Decisions still open

The identifier design must be closed as one coherent model rather than added as an isolated display field. At minimum resolve:

- Project key format, length, allowed characters, case normalization, uniqueness scope, reserved values, and initial/default generation;
- whether Project key is editable after Project creation and what a key change means for existing Issue references;
- numeric allocation scope: per-Project sequence, Workspace sequence combined with Project key, or another model;
- allocation ownership and monotonicity, including deletion/non-reuse and failed/aborted create behavior;
- the exact moment a Triage source receives a Workflow Issue identifier, if ever before successful formalization;
- cross-Project Move behavior: whether the visible identifier changes, remains historical, or gains a new current alias;
- old-identifier lookup, redirect/alias behavior, collision handling, and whether alias history is persisted;
- behavior when a Project itself is renamed, moved between Initiatives, archived/terminal, or has its key changed;
- duplicate/import/create-from-existing behavior and whether each new Workflow Issue always receives a fresh number;
- persistence ownership for Project key, Issue number/current identifier, allocator state, and any alias history;
- deterministic migration/backfill for existing Projects and Workflow Issues;
- search grammar, copy-reference behavior, URL/location handling, Markdown references, and Obsidian link interaction;
- presentation in Issue Row/Card, Peek, Issue Full Item, Issue Inspector, Sidebar Search, Board, Cycle surfaces, and future command/action surfaces;
- validation, diagnostics, fixture, migration, and test coverage required to keep identifiers durable.

### 1.3 Known authority/code impact when design resumes

Expected authority review:

```text
product.md
-> domain.md
-> data.md
-> architecture.md
-> ui.md
-> ui-blueprints.md
-> design-to-code-map.md
-> implementation.md
```

Expected implementation impact includes at least:

```text
Domain Project / Workflow Issue model
Persistence schema + codecs + serializer order
Workspace/configuration state if an allocator/registry belongs there
Application Project creation/update + Workflow Issue creation + cross-Project Move
migration/backfill + startup validation
Runtime indexes / Query presentation projections / Search
Issue Row/Card / Peek / Full Item / Inspector / Board / Cycle consumers
Foundation fixtures + checked-in diagnostics sources + tests
```

Do not introduce a temporary fake identifier field into checked-in diagnostics data or Foundation fixtures before this closure. Visual calibration may reserve conceptual space for a future identifier, but it must not invent identifier business truth.

## 2. Issue Row visual correction discovered during Stage 8 calibration

This is a separate UI correction that does **not** need to wait for the identifier design:

- a Workflow Issue Row should retain the Issue Status glyph even when the collection is already grouped by Status;
- Status remains part of fast Issue identity scanning rather than being replaced by the enclosing Status section;
- Foundation and real Product Pages must consume the same production Workflow Issue Row owner and the same layout algorithm;
- absent optional metadata should disappear without reserving empty columns;
- trailing metadata should remain a compact scanning cluster rather than being stretched to the far edge of a wide Main View;
- the future human-readable identifier, once designed, belongs in the primary Issue identity cluster rather than being simulated now.

The current canonical UI text that omits Status from Status-grouped Project Workspace rows must be corrected together with the later Stage 8 documentation calibration. Until then, implementation calibration should not treat that stale omission as a reason to keep the production row visually inconsistent with the accepted Linear-derived grammar.

## 3. Temporary Stage 8 sequencing

Until the identifier design is resumed:

1. keep this note as the unresolved-design checkpoint;
2. improve checked-in diagnostics data so Issue UI can be calibrated with realistic Status/property/body pressure;
3. calibrate the production Workflow Issue Row and Project Workspace using the same owner in Foundation and the real Page;
4. continue the Stage 8 Peek / Full Item visual chain only after the shared row grammar is coherent;
5. return to identifier design before introducing any real identifier schema, migration, search reference, or UI identifier field;
6. after closure, update canonical authorities first, then implement the full identifier model and delete this temporary note.

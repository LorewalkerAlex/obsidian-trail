# Trail Release Guide

> **Role:** Canonical procedure for turning a verified `main` checkpoint into a Trail release.
>
> Ordinary development publication is governed by `AGENTS.md` and `docs/implementation.md`. A Git commit is not a release. Use this procedure only when the user explicitly requests a release.

## 1. Release model

Trail uses GitHub Releases as the production distribution boundary.

```text
verified GitHub main
        ↓
release version preparation
        ↓
release commit on main
        ↓
green main CI
        ↓
exact x.y.z Git tag
        ↓
.github/workflows/release.yml
        ↓
GitHub Release
        ↓
main.js + manifest.json + styles.css
        ↓
real Obsidian Vault
```

The repository development Vault may use development or diagnostics builds. A real personal Vault should consume only published production release assets.

## 2. Version policy

Use stable three-part versions only:

- patch fixes: `1.0.0` → `1.0.1`;
- compatible feature releases: `1.0.x` → `1.1.0`;
- intentionally incompatible releases: `1.x.x` → `2.0.0`.

Do not use prerelease suffixes such as `-beta` or `-preview` unless this document is explicitly revised to support them.

The release version must agree across:

- `package.json`;
- `package-lock.json`;
- `manifest.json`;
- `versions.json`;
- the Git tag.

`manifest.json.minAppVersion` remains the compatibility authority for the current release. `versions.json` records the minimum Obsidian version for each published Trail version.

## 3. Prepare a release commit

Start from the latest verified `origin/main`. Do not release uncommitted work or an unverified local-only checkpoint.

Choose the requested version bump and run one of:

```text
npm version patch --no-git-tag-version
npm version minor --no-git-tag-version
npm version major --no-git-tag-version
```

For an explicitly requested version, use:

```text
npm version <x.y.z> --no-git-tag-version
```

The npm `version` lifecycle runs `version-bump.mjs`, which synchronizes `manifest.json` and `versions.json`. `--no-git-tag-version` prevents npm from creating a commit or Git tag; publication remains under the repository workflow rather than npm side effects.

Then verify the prepared metadata and run the release gate:

```text
npm run release:verify -- <x.y.z>
npm run check
git diff --check
```

Inspect the intended release diff. A normal release-preparation commit should contain the version metadata changes and no unrelated implementation work.

Commit and push the release preparation separately, for example:

```text
chore: release 1.0.1
```

Do not create or push the release tag until the exact release commit is present on GitHub `main` and its ordinary CI is green.

## 4. Create the release tag

After the release commit is verified on GitHub and CI is green, create an annotated tag whose name is exactly the version:

```text
git tag -a 1.0.1 -m "Trail 1.0.1"
git push origin 1.0.1
```

Do not add a `v` prefix. The tag must match the version in `manifest.json` exactly.

Tag publication is the explicit release trigger. Do not retag a different commit under an existing version. If a published release is wrong, fix the repository and publish a new patch version.

## 5. Automated release workflow

A matching stable version tag triggers `.github/workflows/release.yml`.

The workflow:

1. checks out the exact tagged source;
2. installs exact dependencies with `npm ci`;
3. verifies the tag against `package.json`, `manifest.json`, and `versions.json`;
4. runs repository-wide `npm run check`;
5. verifies the production build emitted `main.js`, `manifest.json`, and `styles.css` under `.obsidian/plugins/trail/`;
6. verifies the built manifest exactly matches the tagged root manifest;
7. creates a published GitHub Release named with the exact version;
8. uploads the three production assets.

The workflow intentionally publishes the release directly rather than creating a draft so the user's real Vault can consume it immediately after the workflow succeeds.

## 6. Verify a published release

A release is complete only after verifying on GitHub that:

- the tag points to the intended release commit;
- the Release exists and is published, not draft;
- the Release version matches `manifest.json`;
- `main.js`, `manifest.json`, and `styles.css` are attached;
- the release workflow completed successfully.

Do not describe a tag push alone as a completed release.

## 7. Install and update the real Vault

For personal use before Trail is listed in the Obsidian Community directory, use BRAT to track `LorewalkerAlex/obsidian-trail` releases.

The real Vault should track published releases, not `main` development output. After a new release succeeds, use BRAT's update check to move the Vault to that release.

If a newly published version causes a production problem, stop using that version in the real Vault and select a previously known-good release while the fix is developed. Publish the repair as a new patch version rather than rewriting an existing release.

## 8. Future Community directory publication

Submitting Trail to the Obsidian Community directory is a separate product-distribution decision. The GitHub Release structure in this guide is compatible with that future path, but Community submission prerequisites and review requirements should be handled in a dedicated release task when needed.

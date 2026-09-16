# Linear Visual Reference Set

> **Role:** Supporting visual evidence for Trail Stage 12B calibration.
>
> **Captured:** 2026-09-16.
>
> **Source policy:** Only official Linear sources (`linear.app` and `webassets.linear.app`) are used here. These images are third-party reference material and must not be reused as Trail production assets.

## 1. How to use this reference set

Trail remains governed by its own Product/UI contracts and by Obsidian host mechanics. These references answer a narrower question: **what can be directly observed in Linear's current visual presentation?**

For each calibration round:

1. identify the Trail production owner from `docs/design-to-code-map.md` section 4.4;
2. open the matching official Linear reference below;
3. separate observable visual facts from assumptions about hidden behavior;
4. adapt only the relevant presentation facts to Trail's existing owner and product constraints;
5. verify the result in Foundation and the real Product consumers.

Do not infer undocumented Linear behavior from a screenshot. Do not let a Linear screenshot override a closed Trail Product/Domain/UI decision.

## 2. Official source principles

The March 12, 2026 Linear interface refresh is the system-level anchor for this set. The article explicitly describes these presentation goals:

- secondary navigation/orientation should recede so primary work takes precedence;
- icon use was reduced and icon sizes were scaled down;
- borders and separators were reduced/softened so structure remains legible without visual clutter;
- the default palette moved away from a cooler blue cast toward a warmer gray while preserving crisp contrast;
- location/view header actions were reorganized into more predictable layers.

Source:

- https://linear.app/now/behind-the-latest-design-refresh

## 3. Reference matrix

| File | Official source | Trail owners/surfaces to compare | Observable facts to inspect |
| --- | --- | --- | --- |
| `01-header-system.png` | 2026 interface refresh | Page Header, View Bar, shell chrome | Distinct app/location/view/content layers; action placement is predictable; header structure is present without turning every layer into a heavy card. |
| `02-sidebar-refresh.png` | 2026 interface refresh | Sidebar navigation, global icon grammar | Refined smaller icons, muted inactive text, additional vertical spacing, and lower navigation prominence relative to the work surface. |
| `03-view-structure.png` | 2026 interface refresh | View Bar, Filter/Display controls, separators | Filter/Display controls sit in a quiet dedicated layer; borders and separators are restrained; controls do not visually compete with content. |
| `04-my-issues.png` | current My Issues documentation | Group Header, Collection Row, Workflow Issue Row | Group headers form clear full-width structural bands; a row strongly prioritizes priority/ID/status/title and does not expose every available property as a permanent column. |
| `05-issue-sidebar.png` | Jul 23, 2026 changelog | Inspector carrier and Issue Inspector composition | Sidebar uses named sections (`Diffs`, `Properties`) and a vertical semantic-value stack rather than a dense settings-table presentation. |
| `06-issue-composer.png` | current Create Issues documentation | Standard Composer family | Title/body dominate the surface; property controls form a compact secondary row; footer action hierarchy is explicit. |
| `07-project-overview.png` | current Project Overview documentation | Project page identity, project properties/resources, Inspector calibration | Strong project identity and summary precede compact property/resource groups; long-form description and milestones live in quieter lower sections. |

## 4. File provenance

### 01-header-system.png

Page:
- https://linear.app/now/behind-the-latest-design-refresh

Official image:
- https://webassets.linear.app/images/ornj730p/production/b15d343ed41c5e938c26f9e2f5a61c7b63285caa-3904x2160.png?auto=format&dpr=2&q=95

### 02-sidebar-refresh.png

Page:
- https://linear.app/now/behind-the-latest-design-refresh

Official image:
- https://webassets.linear.app/images/ornj730p/production/b6d6be14c96978b10553cfb9205be1065087e793-3904x2720.png?auto=format&dpr=2&q=95

### 03-view-structure.png

Page:
- https://linear.app/now/behind-the-latest-design-refresh

Official image:
- https://webassets.linear.app/images/ornj730p/production/67561baa677fbc429d94edd080e95aecabb6bae2-3904x2720.png?auto=format&dpr=2&q=95

### 04-my-issues.png

Page:
- https://linear.app/docs/my-issues

Official image:
- https://webassets.linear.app/images/ornj730p/production/70c22a56e776bfbffa920091b64a28845ca8eaeb-1864x842.png?auto=format&dpr=2&q=95&w=1440

### 05-issue-sidebar.png

Page:
- https://linear.app/changelog/2026-07-23-agent-assisted-editing

Official image:
- https://webassets.linear.app/images/ornj730p/production/fdbe518ba5882edab1681f7410f9af78716021f2-3600x2058.png?auto=format&dpr=2&q=95

### 06-issue-composer.png

Page:
- https://linear.app/docs/creating-issues

Official image:
- https://webassets.linear.app/images/ornj730p/production/25ae979891503f4780b6e837aaa71b5027c67281-1224x534.png?auto=format&dpr=2&q=95&w=1440

### 07-project-overview.png

Page:
- https://linear.app/docs/project-overview

Official image:
- https://webassets.linear.app/images/ornj730p/production/6f0a51a748dfb751052a8dc0e0b67670c845ab6c-2296x2006.png?auto=format&dpr=2&q=95&w=1440

## 5. Trail authority relationship

Use this evidence together with:

- `docs/ui.md` — Trail UI behavior and presentation semantics;
- `docs/ui-blueprints.md` — accepted V1 composition and shared-owner boundaries;
- `docs/design-to-code-map.md` section 4.4 — Page/surface composition and consumer impact map;
- Foundation Lab — production-owner visual calibration consumer.

When an official Linear source changes materially, add or replace the relevant reference deliberately and update the capture date. Do not accumulate competing screenshots for the same responsibility without explaining which one is the current calibration anchor.

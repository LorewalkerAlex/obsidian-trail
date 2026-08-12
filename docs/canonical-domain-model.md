# Trail Canonical Domain Model

> 状态：Canonical Domain 已收口
> 最后更新：2026-08-12
> 适用对象：个人使用
> 上游 Product Design：`docs/product-design-baseline.md`
> Canonical Domain 基线 commit：`ec43eae70b828c7f9888fd71b7d80847ba14624e`
> 当前阶段：Markdown Physical Model 已收口；Technical Design baseline 第一轮已形成

## 1. 文档定位

本文记录 Trail 已确认、与具体 Markdown schema 和实现技术无关的 Canonical Domain Contract。

权威性顺序：

1. `docs/product-design-baseline.md`：产品语义 source of truth。
2. 本文：把产品语义收敛为 Domain objects、relations、field semantics、lifecycle 和 invariants。
3. `docs/logical-data-model.md`：把本文转换为 logical records、references、constraints、configuration、query 与 mutation contract。
4. `docs/technical-design-baseline.md`：正式 Technical Design；`docs/technical-design.md` 与 POC 代码只提供技术证据，不反向定义正式 Domain。

Markdown 文件、目录、frontmatter、block、source range、fingerprint、parser、writer、runtime cache 等继续位于 Canonical Domain 外。

## 2. Design Progress

| 阶段 | 状态 | 说明 |
|---|---|---|
| POC 技术验证 | ✅ 完成 | 技术证据保留，不继续扩张 POC |
| Product Design | ✅ 完成 | `product-design-baseline.md` |
| Canonical Domain | ✅ 完成 | 本文 |
| Logical Data Model | ✅ 完成 | `logical-data-model.md` |
| Markdown Physical Model | ✅ 完成 | `markdown-physical-model.md` |
| Technical Design | 🟡 进行中 | `technical-design-baseline.md` 已形成第一轮正式 baseline |
| Implementation Plan | ⬜ 后续 | 纵向用户价值切片 |
| Formal Implementation | ⬜ 后续 | 正式开发与验证 |

## 3. Canonical Object Classification

### 3.1 Workspace Boundary

Workspace 是 Trail 的单例 Domain / Configuration Boundary，不是日常创建、移动、完成或删除的业务对象。

当前不把 Workspace 建模为普通 Core Entity，也不要求每条记录重复 `workspaceId`。具体物理持久化方式后置。

### 3.2 Core Entities

当前 Core Entities：

- Initiative
- Project
- Milestone
- Issue
- Cycle

这些对象具有业务连续性：创建新的实例不会覆盖旧实例，旧实例本身仍然是当前或历史业务事实。

### 3.3 Workspace Configuration Definitions

当前正式 Workspace configuration definitions：

- StatusDefinition
- LabelGroup
- Label

它们不是 Core Domain Data。它们可以拥有 stable reference identity，供 Entity 稳定引用，但旧配置版本本身不要求像 Issue / Project / Cycle 一样永久保留历史连续性。

配置替换或删除仍必须维护对当前 Domain Data 和 User Workspace State 的 reference integrity。

### 3.4 Domain Values

当前主要 Domain Values：

- Priority
- Estimate
- Due temporal value
- StatusCategory
- LabelGroup selection mode

Domain Value 不因为被多个 Entity 使用就自动提升为独立 Entity。

### 3.5 System Context

Triage 是 Issue 正常 workflow 之前的 intake context：

- 直接承载 `Issue(context = Triage)`；
- 不创建 TriageItem；
- 不是普通 Project；
- 不是第六个 StatusCategory；
- 与 Workflow 复用 Issue 类型，但字段 requiredness / product semantics 可根据 context 不同；
- Triage Issue 本身不会通过普通 Status 修改“变成” Workflow Issue。

Accept 是一个 create-target-before-delete-source 的 application use case：从 Triage Issue 的适用内容预填并创建一个 **新的** Workflow Issue（new identity），target 成功持久化后才删除 source Triage Issue。

### 3.6 User Workspace State

CustomView、Favorites、Home composition 等是持久化 User Workspace State。

它们表达用户如何组织、查询和导航 Trail，类似 Saved Search / Bookmark / Workspace layout；它们不是 Core Domain Data，也不是系统行为定义。

### 3.7 Derived / Runtime State

Progress、Health、Attention、Due Soon、Overdue、actual Timeline、Analytics、automatic Progress Summary 等属于 Derived State。

Derived value 可以计算、缓存或物化，但只要能从 canonical facts + configuration + current time 重建，就不能成为第二份 authoritative truth。

## 4. Identity 与 Relationship Contract

Core Entity identity 与名称、标题、Markdown path 解耦。修改可变字段和合法 membership 不改变对象 identity。

Canonical relationships：

- Project → Initiative：0..1；Project 可以移动 Initiative。
- Milestone → Project：exactly 1；Milestone 是 Project-scoped，正常模型不支持跨 Project reparent。
- Issue → Project：0..1；Issue 可以 project-less，也可以移动 Project。
- Issue → Milestone：0..1 且只能位于当前 Issue.project scope；project-less Issue 不允许 Milestone。
- Cycle ↔ Issue：Cycle 表达 planning membership；同一时刻最多一个 Open Cycle。Closed Cycle 保留自己的最终 membership 作为最小历史事实。

关系变化必须保持最终 graph 合法。例如 Issue 从 Project A 移到 Project B 时，Project A 的 Milestone relation 必须在同一 logical mutation 中清除或替换成 Project B 的 Milestone。

## 5. Initiative Domain Contract

Initiative 表达多个阶段性 Project 共同推进的长期目标。

Canonical facts：

- title / lightweight description；
- optional Priority；
- optional Due；
- applicable Labels。

不维护：

- workflow Status；
- child project list 的第二份 authoritative relation；
- manual Progress / Health；
- actual started / completed timestamps。

Completion 派生规则：至少有一个当前 child Project，且所有当前 child Projects 都为 Completed 或 Canceled 时，Initiative 派生为 Completed；空 Initiative 不算 Completed。

Actual activity timeline 从当前 child Projects 下的 Issue lifecycle facts 聚合。

## 6. Project Domain Contract

Project 表达明确、可完成的 Outcome / Deliverable。

Canonical facts：

- title / lightweight description；
- Project-scoped StatusDefinition；
- optional Initiative membership；
- optional Priority；
- optional Due；
- applicable Labels。

Project Status 是用户显式 lifecycle judgment，完全独立于 Issue completion ratio 和 actual work timeline。

### 6.1 Complete / Reopen

Complete Project 是显式 user action：

- Project 下不能仍存在当前 non-terminal Issue；
- 所有 Issues terminal 并不会自动 Complete Project；
- Complete 只改变 Project lifecycle Status，不保存一个“实际工作结束时间”。

Completed Project 若要重新承载新的 non-terminal Issue，必须先显式 Reopen。Reopen 只改变 Project lifecycle，不修改现有 Issue Status。

### 6.2 Actual Activity Timeline

Project 不持久化 startedAt / completedAt / closedAt 用于工作时间线。

- actual start = 当前 Project scope 下最早相关 `Issue.firstStartedAt`；
- actual work end = 真实完成工作的末端，优先使用当前 scope 下 Completed Issues 的 terminal facts；
- 后来取消一个从未实际执行的 Issue 不应人为拉长实际工作时间线；
- 用户点击 Complete 的时间不是 actual work end。

当前模型不记录 membership history，因此移动 Issue 后，派生 Timeline / Progress 按当前关系重新计算。

## 7. Milestone Domain Contract

Milestone 是 Project 内阶段性 Outcome / checkpoint。

Canonical facts：

- title / lightweight description；
- exactly one owning Project；
- optional Due。

V1 不注册 Trail Labels，不维护 Priority、Estimate、Status、manual completion 或 own lifecycle timestamps。

Completion、Progress、actual activity timeline 都由当前关联 Issues 派生。

## 8. Issue Domain Contract

Issue 是 Trail 最小结构化工作单元，不递归。

Canonical semantics：

- title / lightweight description；
- context：Triage 或 Workflow；
- Workflow context 下必须选择有效 Issue StatusDefinition；Triage context 下没有 normal workflow Status；
- optional Project；
- optional Milestone，且必须位于当前 Project scope；
- optional Priority；
- optional Estimate；
- context-conditioned Due；
- applicable Labels；
- Workflow creation fact `createdAt`；
- minimal lifecycle historical facts：first started time、current terminal entry time。

### 8.1 Context-conditioned Field Contract

Triage Issue：

- `statusDefinitionId` absent；
- `due` required；
- `createdAt` absent；
- Due 表达下一次希望重新处理 capture 的时间；Quick Capture 默认由 Application temporal policy 生成 `+7 days`。

Workflow Issue：

- `statusDefinitionId` required；
- `createdAt` required 且 immutable；
- `due` optional；
- V1 正常创建进入 Backlog，`createdAt` 记录该 workflow creation / initial Backlog 时间。

Backlog 默认排序使用 `Priority → createdAt`；Started / Active 默认排序使用 `Priority → firstStartedAt`。排序属于 presentation/read model，但 `createdAt` 因此具有明确产品价值并成为 canonical fact。

### 8.2 Estimate Invariant

Estimate 是有限、离散、相对的 ordinal work-size value，不是 duration。

- 创建 / 执行阶段允许空；
- Issue 处于 Completed Category 时必须非空；
- Completed 期间不能清空，但可以改为另一个合法值。

### 8.3 Issue Lifecycle Historical Facts

`firstStartedAt` 表示第一次进入 Started Category 的时刻：

- 第一次进入 Started 时写入；
- 后续 Started 内部 Status 切换不改；
- Completed / Canceled 后 reopen 也不重置。

`terminalAt` 表示当前 terminal 状态的进入时刻：

- 从 non-terminal 进入 Completed / Canceled 时写入；
- 离开 terminal 回到 non-terminal 时清空；
- 同一 terminal Category 内切换具体 StatusDefinition 不重置；
- Completed ↔ Canceled 这种 terminal Category 变化应更新为新的当前 terminal entry time；
- 不保留完整 terminal / reopen history。

### 8.4 Accept Is Create-Then-Delete, Not Context Mutation

Accept 不保留 source identity：

```text
Issue A (Triage)
→ Create Issue B (Workflow, new ID, own createdAt)
→ persist + validate B
→ delete A
```

Applicable source fields可以作为 target create 的初始值，但 Triage Due 不自动成为 Workflow Due。target create 未成功时 source 必须保持原样。

## 9. Status Definition Contract

系统固定 `StatusCategory`：

- Backlog
- Unstarted
- Started
- Completed
- Canceled

Issue 与 Project 各自拥有自己的 StatusDefinition 集合；具体 Definition 具有 stable identity、display name、entity type 和固定 Category 语义。

Category 内可以配置多个二级 Status，例如 Started 下的 In Progress / Waiting / Review。

Status ordering 是 Workspace Configuration 的一部分：Category 使用固定系统顺序；同一 Category 内的 StatusDefinition 使用用户配置顺序。该顺序可供 Board columns / pickers 等 presentation 使用，不进入 Entity record。

每个 Category 配置一个 default Status，用于 category-level shortcut；Default 是未来 mutation 的选择规则，不重解释已有 Entity。

StatusDefinition rename 不改变引用 identity；删除或 Category 语义变更必须通过 Mutation Integrity 解决现有引用和受影响 invariants。

## 10. Label / LabelGroup Contract

每个 Label 必须且只属于一个 LabelGroup。

LabelGroup：

- selection mode = Single 或 Multiple；
- 由 Entity Type 注册适用范围；
- 当前可注册 Initiative、Project、Issue；Milestone V1 不使用 Trail Labels。

Single 表示同组最多选一个 Label，不表示 required。

Label 自身不维护 applicability。新 Label 加入 Group 后，自动可供所有已注册 Entity Types 使用。

自由无结构标签继续使用 Obsidian tag；物理 tag/property 表示不属于 Canonical Domain。

## 11. Due / Temporal Capability Contract

Due 是 Entity 当前用户设定的时间目标 / 关注时间点。它是 canonical fact；不同 context 可以赋予不同 presentation 和 derived behavior。

- Initiative / Project / Milestone / Workflow Issue：Due optional。
- Triage Issue：Due required。
- Workflow Due 表达希望 / 计划完成工作的时间点。
- Triage Due 表达下一次希望重新处理 capture 的时间点，并作为 Triage 的主要排序轴。
- Due Soon、Overdue、Attention、Reminder 等根据 Due + configuration + current time 派生，不重复持久化。
- 时间经过本身不直接修改 Core Entity lifecycle。

### 11.1 Triage Defer

Triage 中“暂时不想处理”只修改同一个 Issue Due，例如 `+7 days`。

因此 Canonical Issue 不包含 `attentionAt`、`reviewAt`、`snoozedUntil`、`isSnoozed` 或独立 Snooze state。

### 11.2 Reminder

Reminder 不是独立 Domain Field / Entity。它是基于现有 temporal facts、configuration 与 now 计算出来的 notification / attention capability。

需要随手提醒时，使用普通 project-less Workflow Issue + Due，并可结合 Label / Custom View 组织，不额外创造 Reminder Data。

## 12. Cycle Domain Contract

Cycle 是用户显式开启和关闭的 planning timebox。

Canonical semantics：

- 任一时刻最多一个 Open / Current Cycle；允许没有 Current Cycle；
- 不提前创建 Planned / Next Cycle；
- Issue 可以在 Open Cycle 中随时加入或移出；membership 不强制改变 Issue Status；
- Triage Issue 不能进入 Current Cycle；Accept 创建成功的新 Workflow Issue 才可加入，source Triage Issue 永远不加入；
- Cycle 自己记录实际 started time、创建时确认的 planned end、实际 ended time；
- Closed Cycle 保留最终 Issue membership；不建立独立 Cycle snapshot / participation history Entity。

### 12.1 Planned End Default

默认建议规则为 EndOfNextWeek：以周一至周日为自然周，取开启日期所在周之后的下一自然周周日。

默认规则属于 Workspace configuration；用户创建 Cycle 时可以直接选择其他日期。确认后的具体 planned end 属于该 Cycle 自己的数据，后续配置变化不回写。

到达 planned end 不自动 Close Cycle。

### 12.2 Close / Next Cycle

关闭 Current Cycle 时：

- actual ended time 被记录；
- Closed Cycle membership 固化为最终 membership；
- 若有 non-terminal Issues，进入显式 Create Next Cycle flow；所有 unfinished / non-terminal Issues 默认处于 selected 状态，不区分 Started / Unstarted；
- 用户可以取消任意候选项后再确认创建，也可以取消整个 flow；取消整个 flow 后进入无 Current Cycle 的合法状态；
- Completed / Canceled Issues 不进入下一 Cycle 的 unfinished candidates。

## 13. Canonical / Historical / Derived State Principle

统一原则：

1. **Current Canonical Facts**：持久化当前权威事实。
2. **Historical Facts**：只有过去事实未来无法重建，并且已经有明确产品价值时，才保存最小必要历史。
3. **Derived State**：能从 canonical facts + configuration + current time 得到的结果不保存第二份 authoritative truth。
4. **Diagnostics ≠ Product History**：开发 / 测试日志可以详细记录 action、mutation、write、reparse、reconcile、rollback、error，但不进入正式 Product History。

Trail 当前不建设完整 Activity / Event Log。Home Activity Heatmap 等可组合 `createdAt`、`firstStartedAt`、`terminalAt` 等当前 canonical facts 做派生可视化，但不要求不可变审计历史，也不因此新增 Event/Activity Entity。

## 14. Field Contract / Mutation Integrity

每个持久化字段或 relation 都必须定义：

- semantic；
- applicability；
- requiredness；
- genuine default（只有真实业务 default 才允许）；
- validation；
- state-conditioned invariant。

任何 mutation 提交后的整个 canonical graph 必须满足这些 contracts。

通用 resolution：

- optional relation 可以清空；
- required 且存在 genuine default 时可以回落；
- required 且没有 genuine default 时必须要求合法 replacement 或取消；
- 不为了方便删除而发明 default；
- definition change / relation repair / delete target 作为一个完整 logical operation，不能暴露半合法 committed state。

## 15. Capability 不等于 Domain Field

当一个产品能力可以由已有 canonical facts + configuration + query/runtime calculation 完整表达时，不新增持久化字段或 Entity。

当前明确实例：

- Triage Defer = Move / Set Due Action；
- Reminder = temporal facts + policy + now 的 derived notification；
- Due Soon / Overdue / Attention = runtime derived；
- Project / Milestone / Initiative Progress / Timeline = Issue facts 聚合；
- Home Focus / Projects / Current Cycle / Triage / Custom View = selector / presentation；
- Duplicate Detection = create-time soft guardrail；
- Activity Heatmap = current canonical facts 的 derived visualization。

## 16. 明确不进入 Canonical Domain 的内容

- Markdown file / folder / frontmatter / block / source range / fingerprint；
- parser / writer metadata；
- Runtime Store / reverse indexes / caches；
- optimistic UI / mutation queue / file locking / compensation implementation；
- Board / List / Modal / component tree；
- Filter UI / menu state / selection state；
- Undo storage / Trash / Git restore mechanism；
- full diagnostic log representation。

## 17. 当前阶段

Canonical Domain 继续保持已收口状态。本轮只校准已经产生明确产品价值的新事实与行为：Workflow Issue `createdAt`、Triage Due contract、Accept 新 identity、StatusDefinition ordering，以及 Heatmap 的 derived-only 边界。

Markdown Physical Model 已收口；正式 Technical Design 由 `docs/technical-design-baseline.md` 承担。`docs/technical-design.md` 继续只作为 POC 技术证据。

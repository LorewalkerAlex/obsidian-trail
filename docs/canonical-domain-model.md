# Trail Canonical Domain Model

> 状态：Canonical Domain 已收口
> 最后更新：2026-08-10
> 适用对象：个人使用
> 上游 Product Design source of truth：`docs/product-design-baseline.md`
> 上游正式基线 commit：`45891f5b17f4b5842a6b21279e160ead4eaef8b7`
> 当前阶段：Canonical Domain Design 已完成；下一阶段进入 Logical Data Model

## 1. 文档定位与权威性

本文记录 Trail 已确认的、与具体存储和实现无关的 Canonical Domain 结论。

权威性规则：

- `docs/product-design-baseline.md` 是当前唯一 Product Design source of truth；其中已经包含最终确认的 Create-time Duplicate Detection / Similarity Guard。
- 本文负责把已经确认的 Product Semantics 转换为精确的 Domain Contract，并在每个完整决策簇确认后立即增量更新。
- `docs/product-domain-hld.md` 是旧 Domain / HLD 输入；与当前 Product Design 或本文冲突时，不作为现行 Domain 依据。
- `docs/technical-design.md` 和 POC 代码只提供技术证据，不反向定义 Canonical Domain。
- Markdown 文件、目录、frontmatter、block、source range、fingerprint、parser、writer、TypeScript 类型等属于后续 Logical / Physical Data Model 或 Technical Design，不在本文当前阶段决定。

## 2. Design Progress

| 阶段 | 状态 | 当前说明 |
|---|---|---|
| POC 技术验证 | ✅ 完成 | 作为 Technical Evidence 保留，不继续扩展 POC |
| Product Design | ✅ 完成 | `docs/product-design-baseline.md` 为唯一 source of truth |
| Canonical Domain — Object Classification | ✅ 完成 | Workspace Boundary、对象分类与 Domain 外边界已收口 |
| Canonical Domain — Core Entity Relationships | ✅ 完成 | Initiative / Project / Milestone / Issue / Cycle 的 scope、membership、cardinality 与核心 invariant 已收口 |
| Canonical Domain — Lifecycle / Workflow | ✅ 完成 | Issue / Triage、Cycle、Project Complete / Reopen、Initiative / Milestone 被动完成、无 Archive、Delete / relation resolution 已收口 |
| Canonical Domain — Definitions / Domain Values | ✅ 完成 | Status / Label 定义系统、Field Contract、Priority、Estimate、Due 与通用 temporal semantics 已收口 |
| Canonical Domain — Canonical / Historical / Derived State | ✅ 完成 | Persistence & Derivation Rule、最小 historical facts、Derived State 与 diagnostics 边界已收口 |
| Canonical Domain — Final Audit | ✅ 完成 | Project / Issue workflow、Definitions、Product State、时间语义与 Domain 外边界完成一致性审计 |
| Logical Data Model | ⬜ 后续 | 决定逻辑字段、引用、约束和历史表达，不决定 Markdown |
| Physical Markdown Model | ⬜ 后续 | 决定 Vault / Markdown 中的实际持久化结构 |
| Technical Design | ⬜ 后续 | Parser、Store、Mutation、Reconciliation、Query、UI integration 等 |
| Implementation Plan | ⬜ 后续 | 按纵向用户价值切片规划正式实现 |
| Formal Implementation | ⬜ 后续 | 进入正式开发与验证 |

## 3. 当前设计边界

Canonical Domain Design 先回答：

- Trail 中哪些概念属于 Core Entity、Workspace-level Definition、Domain Value、System Context、Derived State、Persisted Product / Query State 或 Capability / Policy；
- Domain 对象之间的 identity、scope、membership、cardinality、lifecycle 和 invariant；
- 哪些事实是 authoritative canonical facts，哪些信息应运行时派生；
- 哪些概念明确不进入 Domain。

当前不冻结：

- UUID / workspaceId / identifier 的具体字段或格式；
- Aggregate Root 与 transaction boundary；
- Markdown schema、路径、容器、序列化字段；
- TypeScript interface / class；
- parser / writer / mutation 实现；
- UI component 或页面结构。

## 4. Decision Cluster 1 — Workspace Boundary 与对象分类

### 4.1 Workspace

Workspace 当前定义为 **Trail 的单例 Domain / Configuration Boundary**。

它的职责是：

- 划定一个 Trail 个人工作系统中的 Domain scope；
- 统一承载 Workspace-level Definitions，例如 Status Definition、Label Group、Label；
- 统一承载 Workspace-level Settings，例如 Cycle cadence / defaults 以及其他共享产品设置；
- 作为 Initiative、Project、Milestone、Issue、Cycle 等 Core Entities 所处的共同产品边界；
- 作为 Triage 等 system context 以及 Custom View / Favorite 等 persisted product state 的共同配置与查询边界。

Workspace **不是用户日常创建、移动、完成或归档的业务对象**。

本阶段不决定：

- Workspace 是否属于普通 Entity；
- 是否需要稳定 workspace identity；
- 是否存在 `workspaceId`；
- Workspace 如何持久化。

单例性质本身不用于推导上述 Logical Data Model 结论。

### 4.2 Core Entities

当前 Core Entities：

- `Initiative`
- `Project`
- `Milestone`
- `Issue`
- `Cycle`

这些对象拥有独立的 Domain 生命周期与对象连续性。具体 identifier 表示、存储字段和 Aggregate 边界后置。

### 4.3 Workspace-level Definitions

当前 Workspace-level Definitions：

- `StatusDefinition`
- `LabelGroup`
- `Label`

Definition 表达 Workspace 内可配置、可复用的正式定义，不等同于某个 Entity 当前选择的值，也不等同于物理 Markdown tag / property。

Definition 的 identifier 表示和持久化模型后置。

### 4.4 Domain Values

Domain Value 表达附着于 Entity / Definition 的业务值，本身不因为当前设计阶段需要而提升为独立 Entity。

当前正式 Domain Values / field semantics 包括：

- `Priority`
- `Estimate`
- `Due`
- `StatusCategory`
- Label Group 的 selection mode 等规则值

其中：

- `Priority` 是固定的粗粒度系统值，不是 Workspace Definition；`No Priority` 表示字段为空，不是第五个等级。
- `Estimate` 是 Issue 的有限、离散、相对 work-size ordinal value，不是时间 duration；具体 scale 后置。
- `Due` 是 Trail 唯一的用户计划截止语义；不再保留独立 `Target Date`。
- `StatusCategory` 是固定系统语义；具体可配置 Status 由 `StatusDefinition` 表达。
- Reminder / Snooze 与 Due 在更高层共享 user-authored temporal field contract，但各自保留不同产品语义与触发效果。

具体序列化、类型、identifier 与默认值 representation 全部后置到 Logical / Physical Data Model。

### 4.5 System Context

`Triage` 是 **System Context / Intake Context**。

它：

- 直接承载 Issue；
- 不创建独立 `TriageItem` Domain；
- 不是普通 Project；
- 不是第六个普通 `StatusCategory`；
- 表达 Issue 进入正常 workflow 之前的 intake context。

Triage 最终在 Logical Data Model 中如何表示，本阶段不决定。

### 4.6 Derived State

以下信息属于 Derived State，不作为需要人工同步维护的 canonical facts：

- `Progress`
- `Health`
- `Attention` / due-soon / overdue 等基于事实推导的注意力状态
- `Analytics`
- automatic Project `Progress Summary` / Activity Summary

Derived State 可以计算、缓存或物化，但不能仅因为被展示或缓存就升级为 authoritative Domain fact。

### 4.7 Persisted Product / Query State

当前归入 persisted product preference / query / presentation state：

- `CustomView`
- `Favorite`

它们可以被持久化，但不因此自动视为 Core Domain Entity。

当前只冻结语义分类：

- Custom View 是保存下来的 query + presentation；
- Favorite 是用户的高频导航偏好 / product preference。

是否为它们设置独立 identity、identifier 或独立记录属于后续 Logical Data Model。

### 4.8 Capabilities / Policies / Convenience

以下概念当前属于创建、操作、自动化或便捷能力，而不是新的 Core Domain Entity：

- `Quick Capture`
- Create-time `Duplicate Detection / Similarity Guard`
- `Templates`
- `Recurring`
- 其他以后建立在 Core Domain 之上的 automation / convenience 能力

其中 Duplicate Detection：

- 发生在 Create Issue / Quick Capture 创建前；
- 是 soft guardrail；
- 不新增 Duplicate Status；
- 不新增 `duplicateOf`；
- 不建立 Duplicate relation；
- 不修改 Canonical Issue Domain。

Reminder 与 Snooze 不升级为新的 Core Domain Entity。它们与 Due 共享通用 user-authored temporal field contract，再由产品语义特化：Due 表达完成约束，Reminder 表达提醒触发，Snooze 表达暂时降低注意力并在到期后重新提升。Inbox 仍保留为后置 product capability。

### 4.9 Persistence Constructs — Domain 外

以下概念全部位于 Canonical Domain 外：

- Markdown container；
- file / folder path；
- frontmatter；
- Markdown heading / block；
- source range；
- fingerprint；
- parser / writer metadata；
- Git diff / serialization marker。

物理结构可以承载 Domain 对象，但不能反向创造 Domain membership 或把 system container 变成普通 Project。

## 5. Decision Cluster 2 — Core Entity Identity、Scope、Membership 与 Cardinality

### 5.1 Identity 只定义 Domain 连续性

`Initiative`、`Project`、`Milestone`、`Issue`、`Cycle` 作为 Core Entities，都具有 Domain 层面的对象连续性。

本阶段只表达：修改标题、状态、可变属性或允许变化的 membership，不会仅因此把对象变成另一个对象。

本阶段不决定：

- identifier 字段名；
- UUID 或其他 ID 格式；
- identifier 是否出现在 Markdown frontmatter；
- 是否使用复合 key；
- Aggregate identity 或 storage identity。

### 5.2 Initiative 与 Project

- 一个 Initiative 可以包含零个或多个 Project。
- 一个 Project 可以不属于任何 Initiative。
- 一个 Project 最多属于一个 Initiative。
- 多 Initiative membership 不允许。
- Project 可以从一个 Initiative 调整到另一个 Initiative，并保持为同一个 Project。

因此 Initiative membership 是 Project 的可变 Domain membership，不是 Project identity 的组成部分。

### 5.3 Project 与 Milestone

Milestone 是 **Project-scoped Core Entity**。

- 一个 Project 可以拥有零个或多个 Milestone。
- 一个 Milestone 必须且只属于一个 Project。
- Milestone 不存在 project-less 状态。
- Trail 当前不设计 Milestone 在不同 Project 之间直接 reparent / move 的基础能力。
- Milestone 的 Project scope 在其生命周期内固定。

这里的“Project scope 固定”只定义 Domain 语义，不用于推导 Milestone identifier、文件路径或其他 Logical / Physical Data Model 结构。

如果未来出现“把一个 Milestone 提升为独立 Project”之类的产品便利操作，应建模为一个 **composed action / convenience command**，例如创建新 Project、迁移相关 Issues、再处理原 Milestone，而不是把 `Milestone.project` 改成另一个 Project。是否提供该便利操作属于后续产品能力，不是当前 Canonical Domain 必备能力。

### 5.4 Project 与 Issue

- 一个 Project 可以包含零个或多个 Issue。
- 一个 Issue 可以不属于任何 Project。
- 一个 Issue 最多属于一个 Project。
- 多 Project membership 不允许。
- Issue 可以从一个 Project 调整到另一个 Project，并保持为同一个 Issue。

因此 Project membership 是 Issue 的可变 Domain membership，不是 Issue identity 的组成部分。

### 5.5 Project-scoped Milestone Selection

Issue 与 Milestone 的关系不是“允许先建立任意关系，再额外检查两个 Project 是否一致”。

正式语义是：

- Milestone 本身属于某个 Project scope；
- 当 Issue 已属于某个 Project 时，Issue 只能从 **该 Project 提供的 Milestones** 中选择零个或一个；
- project-less Issue 没有可选 Milestone；
- 因此跨 Project 的 `Issue → Milestone` 关联从正常 Domain 操作上就不存在。

换句话说，`Issue.milestone` 是 **Issue 当前 Project scope 内的可选关联**。

如果 Issue 从 Project A 移动到 Project B，则原来属于 Project A scope 的 Milestone 关联不能继续保留；移动完成后的合法状态只能是：

- 不关联 Milestone；或
- 关联 Project B scope 内的一个 Milestone。

具体交互是自动清除、要求用户重新选择，还是由组合操作一次完成，属于后续 Interaction / Action Design，不在本阶段冻结。

### 5.6 Cycle 与 Issue

- 一个 Cycle 可以包含零个或多个 Issue。
- 一个 Issue 当前可以不属于 Cycle。
- 一个 Issue 当前最多属于一个 Cycle。
- project-less Issue 也可以进入 Cycle。
- Cycle membership 与 Project membership 相互独立；进入 Cycle 不要求 Issue 属于 Project。
- Cycle membership 表达当前 planning focus，不改变 Issue 的 Status 或 Project membership。

Issue 当前 Cycle membership 仍然只表达当前 planning focus。Closed Cycle 本身可以继续保留其时间边界与最终 membership；Canonical Domain 不预先引入独立 CycleParticipationHistory、CycleSnapshot 或完整 transition log。未来若出现明确历史能力且现有稳定事实无法重建，再增加最小必要 historical fact。

### 5.7 Core Relationship Summary

| 关系 | Canonical cardinality / scope | 当前语义 |
|---|---|---|
| Project → Initiative | `0..1` | Project 可无 Initiative，最多属于一个，可调整 membership |
| Milestone → Project | `exactly 1` | Milestone 是 Project-scoped，Project scope 固定，不支持跨 Project reparent |
| Issue → Project | `0..1` | Issue 可 project-less，最多属于一个，可调整 membership |
| Issue → Milestone | `0..1 within Issue.project` | 仅能选择当前 Project scope 内的 Milestone；project-less Issue 不可选择 |
| Issue → Cycle | `0..1 current` | 当前 planning association；Closed Cycle 历史优先依赖 Cycle 自身边界 / membership 与稳定 lifecycle facts，不预建独立 history model |

### 5.8 本簇不决定的内容

本簇明确不决定：

- 删除 Project 时 Milestone / Issue 的 lifecycle 行为；
- Archive / Delete / Restore / Reopen 语义；
- Issue 改 Project 时 Milestone 在 UI 上如何处理；
- Milestone 转 Project 是否成为正式产品 command；
- identifier、foreign-key-like reference 或 Markdown link 的具体表示；
- Aggregate、transaction、mutation boundary。

这些分别进入 Lifecycle / Workflow、Logical Data Model 或 Technical Design；历史表达遵循后文的最小 Historical Fact 原则。

## 6. 已解决的跨簇一致性问题

Definitions / Domain Values 决策簇已经解决此前登记的上游交叉问题：

- Initiative / Project / Issue 不再通过 Label 自身维护 `applicability`；改为 **Entity Type 注册 LabelGroup**，注册后该类型的实体可以使用该 Group 下全部 Labels。
- 每个 Trail `Label` 必须属于一个 `LabelGroup`；自由、无结构标签继续由 Obsidian 原生 tag 承担。
- `Target Date` 不进入 Canonical Domain；Trail 统一使用 `Due` 表达用户计划截止时间。
- Project 与 Issue 都使用通用 Status workflow 能力，但各自注册自己的 `StatusDefinition` 集合；共享固定 `StatusCategory` 系统语义。
- Definition 删除、字段清空、关系变化等不再逐特性设计规则，统一遵循 Domain Field Contract / Mutation Integrity。

## 7. Decision Cluster 3 — Lifecycle / Workflow Model

本簇只补充 Product Design 尚未完整冻结的 lifecycle / workflow 语义。已经在 `docs/product-design-baseline.md` 明确的产品规则直接继承，不重新作为待决问题。

### 7.1 Status workflow 不使用强制 transition graph

Issue 的正常 Status workflow 不建立“只有某个 Status 才能进入另一个 Status”的强制转换图。

正式语义：

- Issue 当前选择一个已经注册的 `StatusDefinition`；
- 用户可以在正常 workflow 的已注册 StatusDefinitions 之间直接切换；
- 不要求按固定顺序经历 Backlog → Unstarted → Started → Completed；
- 从 Completed / Canceled 回到其他正常 Status，在产品语义上属于 reopen / 恢复工作，但不需要为此建立独立的 transition graph；
- reopen 对 `completed_at`、历史记录和 Analytics 的影响留到 Canonical / Historical / Derived State 决策簇处理。

Domain 层需要保证：每个 `StatusDefinition` 归属于一个系统固定的 `StatusCategory`。

### 7.2 Status 选择的 Product Interaction 约束

这一条是由本轮 Domain 讨论确认的 **Product Interaction requirement**，不是额外的 Domain Entity 或 Domain invariant：

- 修改 Issue Status 时，选择界面先按 `StatusCategory` 展示一级菜单；
- 进入某个 Category 后，二级菜单展示该 Category 下已经注册的具体 `StatusDefinition`；
- 用户实际选择的是具体 `StatusDefinition`，Category 负责组织和表达稳定语义。

因此 Domain Model 只冻结 `StatusDefinition → StatusCategory` 的语义归属；菜单结构属于 Product / Interaction 层。后续最终审计时，应确认这一交互要求也在相应 Product Design / Interaction 文档中有唯一明确落点。

### 7.3 Triage 是单向进入正常 workflow 的 intake context

Triage 位于正常 Status workflow 之外。

正式生命周期语义：

- Quick Capture 可以创建处于 Triage context 的 Issue；
- Triage Issue 经用户显式 Accept 后进入正常 Issue workflow；
- Accept 后不支持把该 Issue 再通过普通 Status 修改“退回 Triage”；
- 如果一个已 Accept Issue 暂时不准备处理，应使用正常 workflow 中合适的 Status，例如 Backlog，而不是重新进入 Triage；
- `Snooze` 继续只影响 Triage 中的注意力 / 再呈现时机，不把 Triage 变成普通 StatusCategory。

这意味着 Triage 的语义边界是“尚未正式接受进入工作系统的 intake context”，而不是可在正常 Status workflow 中任意往返的一种 Status。

### 7.4 Issue / Triage lifecycle 当前完成度

Issue / Triage 这一子簇已经收口：

- 正常 StatusDefinitions 之间不建立强制 transition graph；
- StatusDefinition 必须归属于固定 StatusCategory；
- Status 修改交互按 Category → registered Status 两级选择；
- Triage 不属于正常 Status workflow；
- Accept 后进入正常 workflow，不再退回 Triage；
- reopen 的历史事实处理后置，不在本子簇提前决定。

### 7.5 Cycle lifecycle 不支持提前创建 / 规划 Next Cycle

Trail 当前不引入 `Planned Cycle`、`Next Cycle` 或其他未来 Cycle 生命周期状态。

正式语义：

- 用户不会在 Current Cycle 仍进行时提前创建或规划下一 Cycle；
- 未来想做的工作继续通过 Backlog、普通 Issue planning 和其他现有机制表达，不需要为了“下一轮计划”先创建一个 Cycle；
- 系统中可以存在 Historical Cycles，并且任意时刻最多存在一个 Current Cycle；
- Cycle 之间允许没有 Current Cycle 的空档；
- 创建 Cycle 是一个显式用户流程，创建完成后该 Cycle 成为新的 Current Cycle。

因此 Canonical Domain 不需要为了预规划而增加 Planned / Draft / Next Cycle 等额外状态。

### 7.6 关闭 Cycle 时的下一 Cycle 创建流程

关闭 Current Cycle 时，如果该 Cycle 中仍有未完成 Issue，Trail 启动一个显式的 **Create Next Cycle** 流程。

这里的“未完成 Issue”指仍处于非终态正常 workflow 的 Issue；已经 Completed 或 Canceled 的 Issue 不作为下一 Cycle 的预填候选。

该流程的正式语义：

- 关闭当前 Cycle 本身仍然是用户显式动作；
- 如果存在未完成 Issue，Create Next Cycle 流程自动预填这些 Issue 作为候选；
- 用户可以在创建流程中决定是否真正创建下一 Cycle；
- 预填不是无条件 rollover，用户可以调整最终纳入新 Cycle 的 Issue；
- 因为这是正常的 Create Cycle 流程，用户也可以在创建时加入其他希望进入新 Cycle 的 Issue；
- 只有用户确认创建后，新 Cycle 才成为 Current Cycle，最终选中的 Issues 才获得新的 current Cycle membership。

如果用户取消 Create Next Cycle：

- 原 Current Cycle 仍然完成关闭；
- 系统进入没有 Current Cycle 的合法空档；
- 未完成 Issues 保持各自原有 Status；
- 它们不被自动加入任何未来 Cycle。

因此 Trail 不区分 Started / Unstarted 两套 rollover 规则。Cycle 衔接统一通过“关闭时预填未完成 Issues → 用户确认 Create Cycle”的显式流程处理。

如果关闭 Current Cycle 时没有未完成 Issue，则不需要为了衔接而自动打开 Create Next Cycle 流程。用户之后需要新 Cycle 时再正常创建。

### 7.7 Cycle lifecycle 当前完成度

Cycle lifecycle 这一子簇已经收口：

- Cycle 由用户显式创建和关闭；
- 任意时刻最多一个 Current Cycle；
- 不提前创建 / 规划 Next Cycle；
- 不引入 Planned / Draft / Next Cycle 状态；
- Current Cycle 进行中，Issue 可以随时加入或移出；
- Cycle membership 不强制改变 Issue Status；
- 关闭 Cycle 时若仍有未完成 Issue，进入 Create Next Cycle 流程并自动预填这些 Issues；
- 用户确认后才创建新 Cycle 并建立新的 Cycle membership；
- 用户取消则允许进入无 Current Cycle 的空档；
- Completed / Canceled Issues 不进入未完成 Issue 预填；
- Closed Cycle 的历史优先通过 Cycle 自身时间边界 / membership 与 Issue 稳定 lifecycle facts表达；Canonical Domain 不预建独立 snapshot / participation history。

### 7.8 Project Completion 是显式用户 Action，并有前置条件

Project 是否达到 Outcome 仍然由用户判断；系统不会因为 Progress、Issue completion ratio、Health 或其他派生信息而自动把 Project 标记为 Completed。

`Complete Project` 是一个 **显式用户 Action**。当用户主动执行该 Action 时，Trail 要求该 Project 下已经不存在未终态 Issue。

因此：

- 如果 Project 下仍有未终态 Issue，`Complete Project` 默认不能直接成功；
- Trail 应把这些未终态 Issues 明确展示给用户处理；
- 用户可以逐个处理，也可以使用基于现有 Issue Actions 的低成本批量操作，例如批量 `Done / Complete` 或批量 `Cancel`；
- 也可以通过已有 membership 操作把某些 Issue 移到其他 Project 或变成 project-less，再重新执行 `Complete Project`；
- 只有当该 Project 下所有剩余 Issues 都已经进入终态，或已经不再属于该 Project 时，`Complete Project` 才能成功。

这里的“终态”沿用 Issue 正常 workflow 的 terminal semantics，即 `Completed` 或 `Canceled` Category。

这条规则只约束 **用户主动执行 Project completion action 的行为**。它不意味着被动展示必须联动改变 Project 状态：

- Project Progress / Health / Analytics / Dashboard 等派生展示不会自动触发 `Complete Project`；
- 即使所有 Issues 都已经终态，Project 仍不会自动 Completed；
- 用户仍需显式确认 Outcome 已经完成并执行 `Complete Project`。

因此 Project completion 同时满足两层语义：

1. **Outcome judgment belongs to the user**：系统不根据 Issue 集合自动决定 Project 已完成；
2. **Explicit completion requires closure**：一旦用户主动完成 Project，就必须先把该 Project 下所有未终态 Issue 了结或移出。

批量 Done / Cancel 只是 Completion flow 中对已有 Issue Actions 的 convenience / bulk composition，不创造新的 Domain lifecycle 状态。

### 7.9 Project lifecycle 当前完成度

当前 Project lifecycle 已确认：

- Project 是明确可完成的 Outcome / Deliverable；
- Project completion 只能由用户显式触发，不由 Progress、Health、Issue completion 或其他派生状态自动触发；
- 所有 Issues 都完成也不会自动把 Project 标记 Completed；
- 用户执行 `Complete Project` 时，如果仍存在属于该 Project 的未终态 Issue，Action 被阻止并进入显式处理流程；
- 用户处理完这些 Issues 后再完成 Project；
- 处理流程可以组合现有单项或批量 Issue Actions，不需要引入新的 Domain Entity 或特殊 completion state。

Project 的 Reopen 与 Archive 边界进一步明确为：

- 已 Completed 的 Project 如果再次需要承载未完成工作，必须由用户显式执行 `Reopen Project`；不会因为创建或移入新的未终态 Issue 而被动恢复为未完成；
- `Reopen Project` 只改变 Project 自身的生命周期事实，不自动修改原有 Issue Status；
- Trail 不为 Project 增加独立 Archive lifecycle；Completed / Canceled / 长时间未编辑的 Project 是否继续出现在高注意力工作界面，由 View / Filter / ordering / presentation 处理；
- Initiative、Milestone、Issue 同样不因为“减少界面占用”而额外引入 Archive 状态；
- 是否以及如何依据 latest edit / activity 时间排序属于 Query / View / Presentation 语义，不把 Archive 重新包装成隐藏的 Domain 状态。

Project 的 Delete / Restore 语义仍在后续 gap audit 中处理。

### 7.10 Initiative completion 是被动派生结果

Initiative 不拥有用户维护的独立 lifecycle Status，也不拥有 `Complete Initiative` Action。它的当前完成状态完全由属于该 Initiative 的 Projects 的状态派生。

正式语义：

- 用户不需要、也不应该手工维护 Initiative Status 或独立的 Initiative completion fact；
- 当 Initiative 下的 Projects 满足完成条件时，Initiative 自动表现为完成；
- 如果之后向一个已经表现为完成的 Initiative 新增一个尚未完成的 Project，Initiative 会再次表现为未完成；
- Initiative completion 因此不是不可逆的生命周期事件，而是随当前 Project membership 与 Project states 变化的 Derived State；
- Project 的完成仍然遵循 7.8 / 7.9：只能由用户显式执行 `Complete Project`，不会因为 Initiative 需要完成而被自动修改。

Initiative 的派生完成条件进一步明确为：

- Initiative 至少包含一个 Project；空 Initiative 不派生为 Completed；
- `Completed Project` 与 `Canceled Project` 都视为已经了结，不阻塞 Initiative 完成；
- 当 Initiative 至少包含一个 Project，且其当前所有 Projects 都已经 Completed 或 Canceled 时，Initiative 派生为 Completed；
- 只要存在任一未了结 Project，Initiative 就派生为未完成；
- 如果已完成的 Initiative 后续新增未了结 Project，或已有 Project 从终态恢复为未终态，Initiative 会立即重新派生为未完成。

### 7.11 Milestone completion 是被动派生结果

Milestone 不拥有用户维护的独立 completion Status，也不拥有 `Complete Milestone` Action。它的完成状态完全由当前关联到该 Milestone 的 Issues 的状态派生。

正式语义：

- 用户不手工维护 Milestone completion；
- Milestone completion 随相关 Issues 的当前状态实时派生；
- 如果一个原本表现为完成的 Milestone 后续又关联了新的未完成 Issue，或者相关 Issue 被 reopen，Milestone 可以再次表现为未完成；
- Milestone completion 因此不是独立 authoritative fact，也不是不可逆 lifecycle event；
- Milestone 的 Progress 与 completion 都来自相关 Issue facts，不反向自动修改 Issue Status。

Milestone 的派生完成条件进一步明确为：

- Milestone 至少关联一个 Issue；空 Milestone 不派生为 Completed；
- `Completed Issue` 与 `Canceled Issue` 都属于终态，都视为已经了结，不阻塞 Milestone 完成；
- 当 Milestone 至少关联一个 Issue，且其当前所有关联 Issues 都处于 Completed 或 Canceled Category 时，Milestone 派生为 Completed；
- 只要存在任一非终态关联 Issue，Milestone 就派生为未完成；
- 如果已完成的 Milestone 后续关联新的非终态 Issue，或已有 Issue 被 reopen，Milestone 会立即重新派生为未完成。

### 7.12 主动完成与被动完成的边界

当前三个层级的 completion 语义明确区分：

- **Project**：主动完成。Outcome 是否完成由用户判断，并通过显式 `Complete Project` Action 落实；Action 有“无未终态 Issue”的前置条件。
- **Initiative**：被动完成。没有用户维护的独立 lifecycle Status 或 completion Action，完成状态由其 Projects 派生。
- **Milestone**：被动完成。没有用户维护的独立 completion Status 或 completion Action，完成状态由相关 Issues 派生。

被动 completion 只用于表达当前派生状态，不触发下层对象的状态修改，也不替代用户主动 Project completion。

被动 completion 的统一边界规则：

- `Canceled` 子项属于已了结，不阻塞上层派生完成；
- 空集合不派生为 Completed；上层对象必须至少存在一个用于判断完成的子项；
- 被动 completion 可以随 membership 或子项状态变化而双向变化，不属于不可逆 lifecycle event。

### 7.13 Reopen 与 Archive 边界

Reopen / Archive 子簇已经收口：

- Project completion 是显式用户 Action，因此撤销该 completion 也必须通过显式 `Reopen Project`；
- Completed Project 在 Reopen 前不承载新的未终态工作；
- Reopen 不自动改变原有 Issues；
- Trail 不引入 Project Archive lifecycle；
- Initiative / Milestone / Issue 也不为界面收纳目的增加 Archive lifecycle；
- 不活跃对象是否沉出主要工作界面由 View、Filter、ordering 与 presentation 解决，而不是新增 Archive Domain state。

### 7.14 Delete / Restore 与关联对象处理

Delete 是显式 destructive action，但 `Deleted` 不进入 Entity 的正常 Domain Status / lifecycle。

正式语义：

- `Complete` / `Canceled` 表达对象真实存在过并已经结束；`Delete` 表达用户明确要求该对象不再作为当前 Trail 对象存在；
- Trail 不为 Initiative / Project / Milestone / Issue / Cycle 增加通用 `Deleted` Status；
- `Restore` 不作为这些 Entity 的 Domain lifecycle action；Undo、Trash、Git / 文件历史等恢复机制属于后续 Application / Persistence / Recovery Design；
- Delete 必须由用户显式触发；有受影响关联对象时不能静默级联处理。

当删除目标存在受影响关系时，Delete Action 本身进入一个 **relation resolution flow**：

1. 明确展示将受影响的关联对象与关系；
2. 提供一个默认 resolution；默认方案优先保留其他已有 Entity / 工作历史，只删除用户明确选择的目标对象；
3. 用户不接受默认方案时，可以选择其他合法 resolution，例如移动关联对象、清除关系、逐项处理，或显式选择更强的级联删除；
4. 用户可以取消整个 Delete Action；
5. Delete target 与 relation resolution 在产品语义上是一个完整操作：只有最终确认后才一起生效，取消或失败不能留下“目标删了一半、关联处理了一半”的中间结果。

具体默认 resolution：

- **Delete Initiative**：默认保留 Projects，并移除它们的 Initiative membership，使其成为没有 Initiative 的 Projects；可选把 Projects 移到另一个 Initiative，或取消删除。
- **Delete Milestone**：默认保留 Issues，它们继续属于原 Project，只清除被删除 Milestone 的关联；可选把相关 Issues 移到同 Project 的另一个 Milestone、逐项处理，或取消删除。
- **Delete Project**：默认保留 Issues，使其变为 project-less，并清除原 Project scope 内的 Milestone 关联；Project-scoped Milestones 随 Project 删除。用户也可以把 Issues 移到其他 Project、逐项处理，或明确选择同时删除相关 Issues。系统不能在没有明确确认的情况下把 Project 下的 Issues 一并删除。
- **Delete Issue**：删除 Issue 本身，并移除其 Project / Milestone / Cycle 等 membership；不级联删除其他 Entity。
- **Delete Cycle**：删除 Cycle 本身，但默认保留 Issues 及其 Status；删除 Closed / Historical Cycle 时应明确提示这会移除该 Cycle 本身保存的时间边界、membership 与相应历史上下文。

上述 resolution 是 Product / Domain Action 语义；确认对话框、按钮排布和交互细节属于后续 Interaction Design。

### 7.15 Lifecycle / Workflow 最终收口

Lifecycle / Workflow 决策簇已经完成。当前正式结论包括：

- Issue 正常 StatusDefinitions 之间不使用强制 transition graph；
- Status 选择按固定 Category 组织已注册 StatusDefinition；
- Triage 是单向进入正常 workflow 的 intake context，Accept 后不退回 Triage；
- Cycle 由用户显式创建 / 关闭，不提前创建 Next Cycle；关闭时如有未完成 Issue，通过预填的 Create Next Cycle flow 由用户确认是否创建；
- Project completion 是用户显式 Action，并要求先处理所有未终态 Issue；
- Completed Project 再次承载未完成工作前必须显式 Reopen；
- Initiative / Milestone completion 都是被动 Derived State，Canceled 子项视为已了结，空集合不派生 Completed；
- Trail 不引入 Archive lifecycle；界面收纳由 View / Filter / ordering / presentation 解决；
- Delete 是显式 destructive action，但不引入 `Deleted` Domain Status；有关联内容时必须进入 relation resolution flow；
- 默认 Delete resolution 优先保留其他已有 Entity，用户可以选择其他合法处理方案；
- Delete + relation resolution 作为一个完整产品操作，不允许半完成状态。

本簇不决定 historical facts 的具体逻辑字段、Undo / Trash / Git 等恢复机制，以及 mutation transaction / rollback 的技术实现。Historical Fact 的保留原则在后续 Canonical 决策簇统一定义；Logical representation 与实现继续后置，不重新打开本簇已经冻结的用户行为。

## 8. Decision Cluster 4 — Definitions / Domain Values

### 8.1 Domain Field Contract / Mutation Integrity

所有可持久字段与关系都遵循统一的 **Domain Field Contract**。每个字段至少明确：

- semantic：它表达什么；
- applicability：哪些 Entity / Definition 拥有它；
- requiredness：始终必需、可空，或只在某个 Action / state 下必需；
- default：是否存在真正有业务意义的合法默认值；
- validation：哪些组合状态不合法。

统一 Mutation Integrity 规则：

> 任意 mutation 完成后的 Domain 数据都必须满足字段 contract。

因此删除 Definition、清空值、移动关系或删除父对象时，不为每个特性单独维护一套删除规则，而先检查受影响字段：

- optional → 可以清空；
- required 且定义了合法 domain default → 可以回落到该 default；
- required 且没有合法 default → 操作不能静默完成，必须要求用户提供合法替代值或取消；
- 若存在多种合法 relation resolution → Product flow 可以提供推荐默认方案与其他选择。

为了删除方便临时“随便找一个值”不属于 domain default。

如果某字段是进入某个 state 的必要条件，则默认在对象保持该 state 期间持续必需；只有明确属于一次性 Action input 时才例外。

### 8.2 Status 是通用 Workflow Definition 能力

`StatusCategory` 是系统固定语义：

- `Backlog`
- `Unstarted`
- `Started`
- `Completed`
- `Canceled`

`StatusDefinition` 是 Workspace-level、可配置的具体 Status，并且每个 Definition 必须归属于一个 Category。

Status 能力按 **Entity Type** 注册：

- Issue 注册自己的 StatusDefinitions；
- Project 注册自己的 StatusDefinitions；
- 两者共享固定 StatusCategory 语义与通用 Field Contract，但不要求共享同一批具体 StatusDefinitions；
- Initiative 与 Milestone 不注册独立 workflow：它们的 completion 继续由下层事实派生。

例如 Issue 可以有 `Started → In Progress / Waiting`，而 Project 可以有 `Started → In Progress / Paused`。两者 Category 相同，但具体 Definition 独立。

StatusDefinition 的重命名保持 Definition identity；删除或替换 Definition 不需要专属 lifecycle rule，统一走 Mutation Integrity。Issue / Project 当前 Status 若为 required，则删除被使用 Definition 后不能留下非法空值。

### 8.3 LabelGroup / Label

Label 系统采用 **Group 定义维度，Entity Type 注册 Group** 的模型。

正式规则：

- `LabelGroup` 是 Workspace-level 分类维度；
- `Label` 必须且只属于一个 LabelGroup；
- Label 本身不维护 Initiative / Project / Issue applicability；
- Entity Type 注册 LabelGroup 后，该类型的全部实体都可以使用该 Group 下的 Labels；
- 新增到 Group 的 Label 自动对所有已注册该 Group 的 Entity Type 可用；
- `Single` Group 对一个实体最多选择一个该组 Label；`Multiple` Group 允许多个；
- Label 可以由用户命名为任何分类概念，但不会因此获得 Status、Priority、Due 等系统业务语义；
- 无结构、自由标签继续由 Obsidian 原生 tag 承担，不再额外提供 ungrouped Trail Label。

删除 Label / LabelGroup 时继续走统一 Mutation Integrity / relation resolution，不单独发明 Label 删除 lifecycle。

### 8.4 Priority

Priority 是固定系统 Domain Value，而不是 Workspace Definition。

正式等级：

`Urgent > High > Medium > Low`

未设置时为 `null`，UI 可显示 `No Priority`；`No Priority` 不是第五个值。

Priority 可用于 Initiative、Project、Issue。默认不擅自填 `Medium` 或其他值。

### 8.5 Estimate

Estimate 是 Issue 的 **有限、离散、相对的 ordinal work-size value**，不是时间 duration。

正式规则：

- Issue 创建与执行期间可以为空；
- 进入 `Completed` 前必须有 Estimate；
- 如果一个字段是进入 state 的必要条件，则在保持该 state 期间默认持续必需，因此 Completed Issue 的 Estimate 不能清空；
- Completed 后仍可把 Estimate 从一个合法值修改成另一个合法值；
- 不维护 Complexity、Final Estimate 或确认历史；
- Estimate 不参与 Cycle capacity gate、自动拆分或 workflow 限制；
- 具体 scale 继续后置，不影响其 ordinal / relative Domain 定位。

### 8.6 User-authored Temporal Fields

Trail 统一使用 `Due` 作为计划截止时间的正式产品与 Domain 术语，不保留独立 `Target Date`。

`Due`、`Reminder`、`Snooze Until` 在更高层共享同一类 user-authored temporal field contract：

- 时间值可以为空；
- 时间经过本身不直接篡改 Core Entity lifecycle；
- 当前时间与字段值可以产生运行时派生状态；
- 修改 / 清空继续遵循 Field Contract。

三者在产品语义与到点后的效果上特化：

- `Due`：表达“应该在什么时候之前完成”，可用于 Initiative / Project / Milestone / Issue；到期驱动 overdue / attention / health 等派生信号；
- `Reminder`：表达“什么时候提醒我”；到点触发提醒 / attention capability；
- `Snooze Until`：表达“什么时候之前暂时降低 intake attention”；到点后恢复正常 Triage attention。

Cycle 是 planning timebox，使用自己的实际 started / ended boundary 与 cadence，不再借用 Target Date。

### 8.7 Definitions / Domain Values 收口

本簇确认：

- Definition / Value 的变更优先遵循全局 Field Contract / Mutation Integrity，而不是逐特性设计删除规则；
- Project / Issue workflow 共享 StatusCategory 语义、各自注册具体 StatusDefinitions；
- Label applicability 由 Entity Type 注册 LabelGroup 决定；
- Priority / Estimate / Due 的 Domain 语义已冻结；
- Target Date 从 Trail Canonical Domain 删除；
- Reminder / Snooze 与 Due 共用 temporal contract，再按产品语义特化。

## 9. Decision Cluster 5 — Canonical / Historical / Derived State

### 9.1 Persistence & Derivation Rule

Trail 统一把状态信息分成三类：

1. **Current Canonical Facts**：用户或 Domain Action 直接决定、且不能从其他 authoritative facts 还原的当前业务事实；需要持久化。
2. **Historical Facts**：过去发生且未来无法从当前事实恢复，并且已经有明确产品价值的最小历史事实；按需持久化。
3. **Derived State**：可以从 canonical / historical facts 与当前时间稳定计算的结果；不作为第二份 authoritative truth 保存。

统一原则：

> 同一个业务事实只保留一个 authoritative source；能稳定计算出来的结果不要再维护第二份需要人工同步的状态。

### 9.2 Current Canonical Facts

典型 current facts 包括：

- Entity 自身内容字段；
- 当前 StatusDefinition；
- Project / Initiative / Milestone / Cycle membership；
- Priority / Estimate / Due / Labels；
- Workspace Definitions 与必要 settings。

具体 Logical field shape 后置。

### 9.3 Historical Facts — 最小化而非 Event Log

Trail 不建设完整 Product Activity / Event Log。

只在同时满足以下条件时新增 historical fact：

- 事实发生后如果不保存，未来无法由已有 authoritative facts 重建；
- 已经存在明确的产品行为、分析或解释需求，而不是“以后也许有用”。

已经确认的重要语义：

- `firstStartedAt` / `started_at` 表达 Issue 第一次进入 Started 的时间，Issue 后续从 Completed / Canceled reopen 时不重置；
- Complete / Cancel 等需要的时间事实只保存满足当前产品能力所需的最小集合；不因为 reopen 就预建完整 transition history；
- `started_at → completed_at` 只能解释 elapsed duration，不代表实际工作时长。

如果未来真的需要“reopen 次数 / 每次 transition 时间”等能力，再根据该产品需求增加最小事实。

### 9.4 Cycle 历史不预建独立模型

Closed Cycle 本身继续作为已有 Core Entity 存在，并可保留实际 started / ended boundary 与最终 membership。

Canonical Domain 当前不引入：

- Cycle snapshot entity；
- Cycle participation history entity；
- Issue historicalCycleIds；
- 完整 membership transition log。

历史分析优先尝试从 Cycle 自身时间边界 / membership 与 Issue 已有稳定 lifecycle facts 重建。若未来某项明确的 Cycle 历史能力无法可靠得到，再补那一个最小 historical fact，而不是提前建设通用历史系统。

### 9.5 Derived State

以下内容继续属于 Derived State：

- Project / Initiative / Milestone Progress；
- Initiative / Milestone completion；
- Project Health；
- Due Soon / Overdue / Attention；
- Analytics / Insights；
- automatic Project Progress Update / Activity Summary。

Derived State 可以缓存或物化用于性能，但缓存不是 authoritative truth，必须能从事实重新构建。

### 9.6 Product / Query / Presentation State

“需要持久化”不等于“属于 Canonical Domain”。

以下内容可以保存，但仍属于 Product / Query / Presentation State：

- `CustomView`：saved query + presentation；
- `Favorite`：高频导航偏好；
- Dashboard layout / module composition；
- 其他 display / query preferences。

临时 Filter、Search、selection、展开折叠、Modal open state 等则属于 ephemeral interaction state。

即使 Logical Data Model 最终为 CustomView / Favorite 分配 identifier，也不能据此反推它们成为 Core Domain Entity。

### 9.7 Development / Test Diagnostics 与 Product History 分离

正式 Product History 保持最小化，但开发和真实 Obsidian 测试需要充分的 observability。

开发 / test diagnostic log 可以记录：

- user action / command；
- runtime diff；
- mutation enqueue / commit；
- Vault write；
- reparse / reconcile；
- rollback / conflict / error。

这些日志用于让用户直观看到真实操作反馈，也让远程协作中的 ChatGPT 能根据回传日志判断系统实际发生了什么。

它们属于 diagnostics / observability，不是 Canonical Historical Facts，不作为正式 Analytics source，也不能反向塑造 Product Domain。

### 9.8 Canonical / Historical / Derived State 收口

本簇确认：

- 事实优先，派生状态不重复成为 authoritative data；
- Historical Facts 只保留已经有明确产品价值且无法重建的最小事实；
- Trail 不为了理论上的未来分析提前建设 Event Log / Snapshot system；
- Closed Cycle 历史先依靠实体自身与稳定事实，不预建 participation history；
- 开发 / 测试日志与正式 Product History 完全分层。

## 10. Final Domain Boundary Audit

### 10.1 Core Domain

当前 Core Entities：

- Initiative
- Project
- Milestone
- Issue
- Cycle

Workspace 是单例 Domain / Configuration Boundary；是否需要稳定 workspace identity 留到 Logical Data Model。

Workspace-level Definitions：

- StatusDefinition
- LabelGroup
- Label

核心 Domain Values / field semantics：

- StatusCategory
- Priority
- Estimate
- Due
- common Field Contract / temporal field semantics

System Context：

- Triage

### 10.2 Domain 外但产品内的状态与能力

明确不作为 Core Entity：

- CustomView / Favorite / Dashboard layout：persisted product / query / presentation state；
- Progress / Health / Attention / Overdue / Analytics / Progress Summary：derived state；
- Quick Capture / Duplicate Detection / Templates / Recurring / Reminder / Snooze：capability / policy / temporal specialization；
- Filter / Search / selection / Modal state：query / interaction state。

### 10.3 Persistence / Technical Boundary

以下继续严格位于 Domain 外：

- Markdown file / container / folder；
- frontmatter / heading / block；
- source range / fingerprint；
- parser / writer metadata；
- Runtime Store cache；
- mutation queue / optimistic UI；
- Git / Trash / backup / rollback mechanism；
- development diagnostic log representation。

这些可以承载、保护或观察 Domain，但不能反向定义 Domain membership、identity 或 lifecycle。

### 10.4 Final Invariants

最终审计确认以下核心 invariant 均能由上层规则解释，不需要逐特性重复定义：

- 一个 Project 最多属于一个 Initiative；
- Milestone 必须且只属于一个 Project，且不跨 Project reparent；
- 一个 Issue 最多属于一个 Project；
- Issue 的 Milestone 必须来自当前 Project scope；project-less Issue 没有 Milestone；
- Issue 当前最多属于一个 Current Cycle；Cycle membership 与 Project 独立；
- Project / Issue 各自使用已注册且归属合法 StatusCategory 的 StatusDefinition；
- Triage Issue Accept 后进入正常 Issue workflow，不通过普通 Status 退回 Triage；
- Completed Issue 必须持续拥有合法 Estimate；
- Single LabelGroup 对一个实体最多一个 Label；实体只能使用其 Entity Type 已注册的 LabelGroups；
- Project 只有在不存在未终态 Issue 时才能显式 Complete；Completed Project 再承载未终态工作前必须显式 Reopen；
- Initiative / Milestone completion 均为 Derived State，Canceled 子项视为已了结，空集合不派生 Completed；
- 任意 mutation 完成后都必须满足字段与关系 contract；Delete / Definition removal 不允许留下非法空值或半完成关系状态。

### 10.5 Final Audit 结论

Canonical Domain 当前不存在需要补充的新 Core Entity 或新的特性级规则体系。

已完成的关键清理包括：

- 不保留 Team / Assignee 协作层；
- 不保留 Area Entity、Sub-issue、Project Dependency、Generic Issue Relation；
- 不保留独立 TriageItem / Fleeting Note Domain；
- 不保留 Target Date；统一使用 Due；
- 不保留 Label 自身 applicability；改为 Entity Type 注册 LabelGroup；
- 不保留 Duplicate Status / relation；Duplicate Detection 是 create-time guard；
- 不保留 Initiative / Milestone 人工 completion state；
- 不保留 Archive lifecycle / Deleted Status；
- 不保留人工 Project Health / Project Update；
- 不保留完整 Product Activity / Event Log；
- 不让 Markdown / POC schema / Runtime Store 反向定义正式 Domain。

## 11. Canonical Domain Exit / 下一阶段

Canonical Domain Design 至此完成。

进入下一阶段：**Logical Data Model**。

Logical Data Model 的目标是把上述 Domain Contract 转成精确、实现无关的逻辑数据结构，包括：

- Entity / Definition / product-state 的 logical records；
- stable identity 与 references；
- fields、nullability、defaults、constraints；
- StatusDefinition / LabelGroup registration 等 configuration relationships；
- minimal lifecycle timestamps / historical facts；
- Derived State 的输入边界与是否允许 materialized cache；
- migration / compatibility assumptions。

Logical Data Model 仍然 **不决定 Markdown 文件结构**。文件、frontmatter、block、container、source locator 等继续留给后续 Physical Markdown Model。

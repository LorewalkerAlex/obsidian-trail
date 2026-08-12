# Trail Personal Product Design

> 状态：当前 Product Design canonical baseline
> 最后更新：2026-08-12
> 适用对象：个人使用
> 参考基线：Linear 的成熟产品原语与交互模型
> POC 技术退出基线：`7a564ff9fada3d0f5af09052c24f1fe51e0ec143`
> Canonical Domain 基线：`ec43eae70b828c7f9888fd71b7d80847ba14624e`
> 当前阶段：Markdown Physical Model 已收口；Technical Design baseline 第一轮已形成

## 1. 文档定位与权威性

本文是 Trail 当前 Product Design 的 source of truth，记录已经确认的产品原语、语义边界、Linear 适配结论和被替代的旧方案。

权威性规则：

- 本文优先于更早的 `docs/product-domain-hld.md`、Yggdrasil / Workbench 顶层设计和 POC-era 产品假设。
- `docs/canonical-domain-model.md` 把本文产品语义转换为实现无关的 Domain Contract。
- `docs/logical-data-model.md` 把当前 Product / Domain Contract 转成 logical records、references、constraints、configuration、query 与 mutation contract；它不决定 Markdown 物理表示。
- `docs/technical-design-baseline.md` 记录正式 Technical Design；`docs/technical-design.md` 只保留 POC 技术证据。POC schema 不反向约束正式 Product / Domain / Logical / Physical Model。
- Handoff 只用于跨 Session 交接，不替代上述 canonical 文档。
- 本文只保存当前结论、必要 rationale 和 superseded decisions，不保存完整讨论过程。

## 2. Baseline 原则

1. **Linear-first，不从零发明成熟任务管理原语。** 对个人执行有价值且与 Trail 目标不冲突的成熟模式优先采用。
2. **删除协作负担，而不是删除成熟结构。** Team、Assignee、订阅、团队汇报等协作语义移除；Initiative、Project、Issue、Cycle、View 等执行原语保留。
3. **长期目标、阶段成果、具体工作、长期分类严格分工。** Initiative、Project、Milestone、Issue、Label 不互相冒充。
4. **Issue 是最小结构化工作单元。** 不建立递归 Sub-issue / parentIssue hierarchy；更细步骤留在普通 Markdown checklist 等非 Domain 内容中。
5. **产品 Capability 不等于 Domain Field。** 能由已有 canonical facts + configuration + query/runtime calculation 表达的 Reminder、Snooze、Due Soon、Overdue、Attention 等能力，不新增重复 Entity 或持久化 flag。
6. **View 先参考 Linear 成熟模式，再按真实需求做 Trail delta。** Filter / Group / Saved View 只在具体页面需要时增加；不为了“通用能力完整”先造 Query DSL 或万能 View Builder。
7. **派生优于人工维护。** Progress、Health、Attention、Analytics、Timeline、Project Progress Summary 等尽量从 authoritative facts 与必要历史事实推导。
8. **快速操作必须配套低成本恢复。** Selection、drag、bulk action、shortcut 等高速度交互应有即时反馈和 Undo / Recovery。
9. **数据模型与展示模型分离。** Entity 拥有完整 canonical facts；Board / List / Card / Dashboard 只展示当前 View / Module 需要的信息。
10. **Domain 语义先于物理 Markdown 表示。** 文件、block、frontmatter、tag、link、HTML marker 等只影响 persistence / parser / mutation，不改变上层 Domain。
11. **优先复用 Obsidian / Markdown 原生能力。** Trail 不建设第二套完整文档编辑系统。
12. **页面共享 Runtime / Action / UI primitives，但保留自己的产品职责。** 系统页面不必伪装成 Custom View；真正重复的数据选择、布局和组件能力再抽取复用。
13. **显示名称与内部语义解耦。** UI alias / localization 可以变化，不改变稳定 identity 与业务语义。
14. **保留扩展边界，但不提前实现未来复杂度。** Templates、Recurring、Inbox、Integrations、AI/Agent 等基于成熟模型后置，不反向驱动核心 Domain。
15. **Mutation 后的数据合法性优先于逐特性补丁。** 字段、关系、Definition 删除或替换统一遵循 Field Contract / Mutation Integrity。

## 3. Canonical Product Model

```text
Workspace

Initiative
└─ Project
   ├─ Milestone
   └─ Issue

正交能力：
Status / Priority / Cycle / Due / Labels / Estimate

查询与呈现：
View / Filter / Group / Sort / Board / List / Modules
```

这不是严格目录树：

- Project 最多属于一个 Initiative，也可以没有 Initiative。
- Milestone 必须且只属于一个 Project。
- Issue 最多属于一个 Project，也允许 project-less。
- Issue 选择 Milestone 时，只能从当前 Project 的 Milestones 中选择；project-less Issue 不选择 Milestone。
- Label、Cycle、Status、Priority、Due 等不是层级。

### 3.1 Workspace

Workspace 是个人 Trail 系统的单例产品边界，不是日常创建和管理的业务对象。

Workspace 统一拥有或约束：

- workflow / Status definitions 与 defaults；
- Label / LabelGroup definitions 与 registration；
- Cycle 默认结束规则；
- timezone 与其他共享插件设置；
- Custom Views、Favorites、Dashboard composition 等用户 Workspace State。

单例全局规则更接近插件 / Workspace configuration，不要求用 Markdown 业务记录表达。

### 3.2 Initiative

Initiative 表达由多个阶段性 Project 共同推进的长期目标。

- 可以拥有 Priority、Due、Labels、Description。
- 最多聚合多个 Project；Project 可以移动到另一个 Initiative。
- 不维护独立 workflow Status，也不提供 Complete Initiative Action。
- 至少存在一个 Project，且所有当前 Projects 都为 Completed 或 Canceled 时，Initiative 派生为 Completed；空 Initiative 不算 Completed。
- Progress、Health、actual activity timeline 均派生。

### 3.3 Project

Project 表达明确、可完成的 Outcome / Deliverable，而不是永不完成的责任领域。

- 最多属于一个 Initiative。
- 可以拥有 Milestones、Issues、Description、Status、Priority、Due、Labels。
- Project Status 是用户对 Project lifecycle 的显式判断，不由 Issue completion 自动决定。
- Complete Project 前必须不存在当前 non-terminal Issue。
- Completed Project 若要重新承载新的 non-terminal work，必须先显式 Reopen；Reopen 不修改已有 Issue Status。
- Project 的实际工作开始 / 结束时间不使用用户点击 Complete 的时刻，而从当前 scope 下 Issue 的实际 lifecycle facts 派生。

### 3.4 Milestone

Milestone 是 Project 内阶段性 Outcome / checkpoint。

- 必须且只属于一个 Project；正常模型不支持跨 Project reparent。
- Issue 最多关联一个当前 Project scope 内的 Milestone。
- 可拥有 Description 与 Due。
- V1 不使用 Trail Labels。
- 不维护独立 Status 或手工 completion；Progress / completion / actual activity timeline 全部由当前关联 Issues 派生。

### 3.5 Issue

Issue 是 Trail 最小结构化工作单元。

主要能力：

- Title / lightweight Description；
- context：Triage 或 Workflow；
- Workflow Status；
- Priority；
- Project（可空）；
- Milestone（可空且受 Project scope 约束）；
- Cycle planning membership；
- Due；
- Estimate（Workflow Completed 时必须非空）；
- Labels；
- minimal lifecycle timestamps。

Issue 可以没有 Project。项目外 Workflow Issue 仍是普通 Issue，不需要伪造一个普通 Project 作为父级。

Triage 与 Workflow 复用同一个 Issue 类型，但字段使用规则可以不同：Triage 没有 normal workflow Status；Workflow 才进入正式 Status lifecycle。

V1 的 Workflow Issue 正常创建进入 Backlog，并记录 immutable `createdAt`。Backlog 默认排序使用 `Priority → createdAt`；进入 Started 后，active 工作区默认使用 `Priority → firstStartedAt`。不为 Issue 引入通用手工 rank/order。

Triage 不使用 `createdAt` 作为排序轴；它使用 required Due 来表达下一次希望重新处理该 capture 的时间。

Canonical Domain 不包含 Sub-issue、parentIssueId 或递归 Issue hierarchy。更大工作拆成 Project / Milestone / 平级 Issues；更细执行步骤使用普通 Markdown checklist。

## 4. Classification：Labels / Label Groups

Trail Label 是结构化 Workspace configuration，不替代 Obsidian 自由 tag。

- 每个 Label 必须且只属于一个 LabelGroup。
- LabelGroup 是分类维度，selection mode 为 Single 或 Multiple。
- Label 自身不维护 applicability；Entity Type 注册 LabelGroup。
- 当前 V1 Label-capable types：Initiative、Project、Issue。
- Milestone 当前不注册 Trail LabelGroup。
- Single 表示同一 Entity 在该 Group 中最多选一个，不代表必须选一个。
- 新 Label 加入已注册 Group 后，自动可供该 Entity Type 使用。

Area / Responsibility 不建立独立 Domain Entity，使用 LabelGroup + View / Filter / Group 表达。

## 5. Status / Priority / Estimate

### 5.1 Status

固定系统 `StatusCategory`：

- Backlog
- Unstarted
- Started
- Completed
- Canceled

Issue 与 Project 各自拥有自己的可配置 `StatusDefinition` 集合；共享 Category 语义，但不共享具体 definitions。

具体 Status 可以在同一 Category 内扩展，例如 Issue / Started 下的 In Progress、Waiting、Review。正常 Status 不建立强制 transition graph。

Status display / Board column ordering 采用两层规则：

1. StatusCategory 使用固定系统顺序；
2. 同一 Category 内的 StatusDefinition 使用用户配置顺序。

每个 Category 配置一个 default Status，用于 Complete、Cancel、Start、Move to Backlog 等 category-level shortcut；用户需要少数二级状态时再进入二级菜单选择具体 Status。改变 default 只影响未来 mutation，不重解释已有 Entity。

Initiative / Milestone 不维护独立 workflow Status。

### 5.2 Priority

正式 Priority：Urgent > High > Medium > Low；未设置为 null，UI 显示 No Priority。

### 5.3 Estimate

Estimate 只属于 Issue，是有限、离散、相对的 ordinal work-size value，不是时间 duration。

- 创建 / 执行期间允许 null。
- Issue 进入并保持 Completed 时必须非空。
- Completed 后仍可改为另一个合法 Estimate。
- 不用于 Cycle capacity gate、自动 workload 限制或自动拆分。

## 6. Due、Defer、Reminder 与时间表现

Trail 使用一个通用 `Due` canonical fact 表达 Entity 当前设定的时间目标 / 关注时间点。不同 context 可以对同一个 Due 做不同产品解释，不为表现形式重复造字段。

- Initiative / Project / Milestone / Workflow Issue 的 Due optional。
- Triage Issue 的 Due required。
- Due 接近、到达、超过后的 due-soon / overdue / attention 等都是 runtime derived state。
- 时间经过本身不会自动修改 Status 或 lifecycle。
- Due 的底层时间值使用统一 timestamp contract；显示精度和 calendar 计算由 temporal contract 与 timezone 决定。

### 6.1 Workflow Issue Due

Workflow Issue 的 Due 表达用户希望 / 计划完成该工作的时间点。Trail 可以用它做醒目 attention；错过 Due 本身不触发强制 lifecycle mutation。

### 6.2 Triage Due / Defer

Triage Issue 的 Due 表达“什么时候希望重新处理这个 capture”，同时作为 Triage 的主要排序轴。

- Quick Capture 默认 Due = 当前时间基础上的 `+7 days`。
- 想暂时不处理时，直接把 Due 往后移。
- 不建立独立 Snooze / Defer state。
- 不保存 `reviewAt`、`attentionAt`、`snoozedUntil`、`isSnoozed`。

### 6.3 Reminder

Reminder 不是独立 Domain Field。它是基于已有时间事实、configuration 与当前时间计算出来的通知 / attention capability。

需要一个“随手提醒”时，使用普通 project-less Workflow Issue + Due，并按需用 Label / Saved View 组织即可；不需要 Reminder Entity。

## 7. Cycle

Cycle 是用户显式开启和关闭的个人 planning timebox，与 Issue Status 正交。它在使用体验上像一个短期、跨 Project 的 focus container，但 Domain 上不是 Project / Initiative。

核心规则：

- 任一时刻至多一个 Open / Current Cycle，允许没有 Current Cycle 的空档。
- 不提前创建 Planned / Next Cycle。
- Workflow Issue 可以在 Open Cycle 生命周期中随时加入或移出；membership 不自动改变 Issue Status。
- Triage Issue 不能进入 Current Cycle；只有新建成功的 Workflow Issue 才能加入。
- 关闭 Cycle 时记录实际 ended time；Closed Cycle 保留最终 membership。
- 若关闭时仍有 non-terminal Issues，随后打开显式 Create Next Cycle flow 并预填这些 Issues；用户可以调整或取消。取消后合法地进入无 Current Cycle 状态。

### 7.1 Current Cycle View

Current Cycle 的主要工作视图按以下成熟结构组织：

```text
Columns = Issue Status
Rows / Swimlanes = Issue Project
```

- Project swimlane 只是视觉分块，不是 Project mutation target。
- 横向 drag 只改变 Status。
- Projectless Issue 使用 `No Project` swimlane。
- Add / Remove Cycle membership 使用显式 Action，不通过 drag。

### 7.2 默认结束日期

Cycle 创建时有一个默认结束日期建议，但用户可以在创建 UI 中直接选择其他日期。

当前默认规则：**EndOfNextWeek**。

- 以周一至周日为一个自然周。
- 取 Cycle 开启日期所在周之后的下一自然周周日。
- 周一开启时，计划日期范围正好覆盖本周一到下一周周日，共 14 个 calendar days。
- 周中开启仍统一落到下一周周日，而不是机械执行 `start + 14 days`。

用户确认创建后，具体 `plannedEnd` 成为该 Cycle 自己的数据；以后修改默认规则不回写已创建 Cycle。

到 plannedEnd 不自动关闭 Cycle；用户仍显式 Close，actual ended time 与计划边界可以不同。

## 8. Triage / Quick Capture

Triage 是 Issue 进入正常 workflow 之前的 intake context，不是第六个 StatusCategory，也不创建 TriageItem。

Quick Capture 是多入口 capability：全局快捷键、Command Menu、Triage 页面的一行输入 / 小 `+`、以及其他合适页面的轻量入口都可以创建同一种 `Issue(context=triage)`。

Triage 页面本身是专用 List，不做 Board / Timeline / 通用 Group。

Triage Issue：

- 没有 normal workflow Status；
- Due required；
- Quick Capture 默认 Due = `+7 days`；
- 默认主要按 Due 从近到远排序；
- 通常不依赖 Priority；
- 可以随时搜索、打开、编辑和丰富内容。

### 8.1 Accept

Accept **不是** `context: Triage → Workflow` 的 identity-preserving mutation。

唯一正确行为：

```text
Source Issue A (context=Triage)
→ Create NEW Issue B (context=Workflow, new stable ID)
→ 用 A 的适用内容预填 B
→ 用户确认 Workflow 必需字段
→ B 成功持久化并验证
→ Delete A
```

- target create 失败时，source A 保持原样。
- Triage Due 不自动继承为 Workflow Due。
- 新 Workflow Issue 获得自己的 `createdAt`。
- 只有 target 成功后才删除 source，避免 capture 丢失。

Convert to Project / Convert to Note 若启用，也遵循 create-target-before-delete-source。

Create-time Duplicate Detection / Similarity Guard 仍是创建前 soft guardrail，不新增 Duplicate Status、relation、pointer 或自动 merge。

## 9. View / Query / Navigation

### 9.1 Linear-first View Strategy

Trail 不从零设计万能 View system。先以 Linear 已验证的常用页面 / View 为 baseline，再根据单人、Obsidian、Markdown 场景做明确 delta。

系统页面共享同一个 Runtime Domain Model、Action Model 和 UI primitives，但不要求每个系统页面都表示成 Custom View。

V1 不提供用户编写 Query Syntax，也不要求 arbitrary AND / OR / NOT expression tree。底层只实现当前页面和 Saved View 真正需要的 structured filters / selectors，并按实际使用逐步增加。

### 9.2 Custom View

Custom View 是用户把当前已经调舒服的 scope / filter / group / sort / presentation 保存下来，属于持久化 User Workspace State，而不是 Query Language。

它可以频繁创建、修改、删除，不需要保留旧版本历史。删除 View 不删除底层 Entity。

### 9.3 Filter / Group / Sort

- Filter 可以按真实需求使用 Status、Project、Priority、Area、Label、Due、Cycle 等已有 facts / derived values。
- Label 默认是筛选 facet，不是通用 Group 轴。
- Group 只开放少量稳定业务维度，例如 Status、Project、Priority、Area；不提供任意字段 Group。
- 不为 V1 设计 BI 式多层 Sort Builder 或 Generic Filter DSL。
- Board / List 是同一批数据的不同 presentation。

### 9.4 Favorites

Favorites 类似浏览器书签 / pin，是用户维护的高频导航层，不是 Entity 的 `favorite=true` 字段。

可以指向 Initiative、Project、Cycle、Issue、Custom View 等可导航目标。Favorite 自身不需要业务历史连续性。

## 10. Projects Workspace / Project Experience 与 Derived State

Projects 是一个动态 drill-down workspace，不把 Initiative / Project 各自做成互相割裂的一级导航：

```text
Projects
→ Initiative Focus
→ Project Workspace
```

Projects Root 主要看 Initiative + Projects 分布；Initiative Focus 看该 Initiative 下的 Projects；Project Workspace 直接进入该 Project 的 Issue 执行层。允许从 Home、Search、Favorite 等直接 deep-link 到 Project，不强迫逐级进入。

Project Workspace 不设置重型 Overview tab。主区域是 Issues Board / List；Description、Milestones、Related Notes 与其他 properties 放到按需 Details / Peek / hover/focus 内容里。

Project Board 的 Columns = Status；Issue Card drag 只表达 Status change。Project / Milestone relation 通过 Context Menu、Property Picker、Details 等显式 Action 修改。

Project / Initiative / Milestone 的 Progress、Health、Attention、Timeline 不保存为 authoritative facts。

实际 activity timeline 从当前 scope 下 Issue facts 派生：

- actual start：最早相关 `Issue.firstStartedAt`；
- actual work end：以真实 Completed Issue 的终止时间为主，不因为后来取消一个从未实际执行的 Issue 而人为拉长工作时间线。

Project Status 与实际 activity timeline 完全分离。用户点击 Complete 的时间不是 Project actual work end。

当前关系历史不单独持久化，因此 Issue / Project membership 改变后，会按当前关系重新贡献到 Project / Initiative / Milestone 的派生 Progress / Timeline；这是当前 minimal-history 模型的明确取舍。

Health 必须可解释；证据不足时显示 Unknown，而不是强行推断。

Automatic Project Progress / Activity Summary 是 derived summary，不是人工周报 Entity。

## 11. Interaction System

Trail 复用统一 Action Model：Focus、Peek、Selection、Bulk Actions、Context Menu、Command Menu、Keyboard Shortcuts、Search、Undo / Recovery 是同一系统的不同入口。

Peek 是基础交互能力，不属于某一个页面；它用于在 Board / List / Project / Cycle / Triage 等上下文中快速查看和编辑轻量信息，而不强迫离开当前 workspace。

全局 drag 规则：

> **Issue Card drag 只表达 Status change。**

Project、Milestone、Cycle membership 等关系修改必须使用显式 Action；Cycle 的 Project swimlane 只是 presentation。

其他原则：

- 高速可逆操作优先 `Fast Action + Immediate Feedback + Undo / Recovery`。
- 不把快捷键做成功能唯一入口。
- Context Menu 只显示当前对象 / Selection 合法 Actions。
- Command Menu 主要用于做事情；Search 主要用于找对象。
- Trail 在 Obsidian 可任意分栏中运行，响应式优先基于 pane/container width，支持 Expanded / Compact / Minimal presentation。
- Contextual submenu 后续实现优先采用成熟 pointer-grace / safe-triangle primitive，避免鼠标斜向移动误关子菜单。

## 12. Delete / Relation Resolution

Deleted 不作为正常 Domain Status；Archive 也不作为 Initiative / Project / Milestone / Issue 的通用 lifecycle。

Delete target 与 relation resolution 必须作为一个完整合法 mutation 处理，不能留下半删除 / dangling relation。

默认保护其他已有业务数据：

- Delete Initiative：保留 Projects，使其无 Initiative，或由用户迁移。
- Delete Milestone：保留 Issues，清除 / 替换 Milestone relation。
- Delete Project：默认保留 Issues，使其 project-less，并清除原 Milestone；Project-scoped Milestones 随 Project 删除；用户可选择更强处理。
- Delete Issue：移除 Issue 及 memberships，不级联删除其他 Entity。
- Delete Cycle：保留 Issues / Status，但明确提示会失去对应 Cycle 历史上下文。

Undo、Obsidian Trash、Git / 文件历史属于 Application / Persistence / Recovery Design，不成为 Domain lifecycle。

## 13. Obsidian-native Documents / Editing

Trail Entity 只需要 lightweight editing：Title、短 Description / Notes、结构化 properties 和明确 Actions。

复杂内容继续使用独立 Obsidian Markdown 文档；Trail 不建设复杂 Markdown editor 或第二套 Documents Domain。Related Documents 优先利用普通 wiki links / backlinks 聚合。

## 14. History / Analytics

正式产品不记录完整 Activity / Event Log。

只持久化未来无法重建且已有明确产品价值的最小历史事实。当前关键事实包括 Workflow Issue `createdAt`、Issue 第一次进入 Started 的时间、当前 terminal entry time，以及 Cycle 自身实际时间边界与最终 membership。

开发 / 测试 diagnostic log 可以详细记录 action、mutation、Vault write、reparse、reconcile、rollback 与 error，但它不是 Product History 或 Analytics source。

Analytics 是只读 derived layer，不反向成为 authoritative domain state。

Home Activity Heatmap 也只使用当前 canonical facts 可以派生出的多种活动信号，例如 workflow creation、first start、current terminal entry 等；具体权重 / 展示算法后续可调，但绝不为了热力图新增永久 Activity Entity / Event Log。Heatmap 不承诺不可变审计历史。

## 15. Home / Page Composition

Home 是 Trail 的全局总览 / routing 页面，不是另一个万能 Query View。V1 固定 composition：

```text
Date / Time
Focus
Current Cycle Summary
Projects / Initiatives Summary
Activity Heatmap
Weekly Note
```

Focus 优先回答“现在最值得注意什么”；Current Cycle / Projects 只显示摘要与跳转，不复制完整工作区。

底层组件仍保持模块化和可复用，但 V1 不做自由 Dashboard Builder、Widget Marketplace 或复杂 resize/reorder 系统。以后只有真实使用证明需要时，才增加隐藏 / 重排等有限 DIY。

Dashboard / Home composition 仍属于 User Workspace State 的可扩展边界，但固定 V1 layout 不要求一开始就保存完整 builder state。

### 15.1 Weekly Note Utility

Weekly Note 是 Home 上的轻量 Markdown utility，不是 Domain Entity，也不与 Issue / Project / Cycle / Analytics 自动联动。

- 使用一个固定 Markdown 文件；
- 复用 Issue 同款 lightweight editor / Modal；
- `Edit / Save` 修改 Current 区域；
- `Archive` 把 Current 内容移动到 Archive 下的日期块并清空 Current；
- V1 手动 Archive，不加 scheduler / auto archive；
- 不建立 Runtime Index、Query、Status、Due 或专用 Domain model。

## 16. Convenience / Deferred Capabilities

- Issue / Project Templates：创建 convenience；模板之后变化不隐式修改实例。
- Recurring：规则到点后创建普通 Issue，不建立 RecurringTask Domain type。
- Reminder：基于已有 temporal facts + configuration + now 派生通知 / attention，不建立 Reminder field / entity。
- Inbox：后置 notification-like information surface，不与 Triage 混用。
- Integrations / API / AI Agents：后置；未经显式用户授权不自动修改 authoritative data。

## 17. Superseded Decisions

以下旧方案不得作为现行设计重新引用：

- 独立 Area Domain Entity → LabelGroup + registration + View / Filter / Group。
- Fleeting Note / TriageItem 作为正式双轨 Domain → Quick Capture 直接创建 Triage Issue。
- Sub-issue / parentIssue hierarchy → 删除；Issue 是最小结构化工作单元。
- Generic Related / Blocking relations → 删除；等待使用 Status / content / normal links。
- Linear post-hoc Duplicate relation / status → 创建前 Similarity Guard。
- Complexity 独立字段 → 单一 Estimate。
- Planned / Next Cycle 预创建与自动 rollover → 显式 Close + 可选 Create Next Cycle。
- Cycle 固定 duration / `start + N days` 默认 → EndOfNextWeek 日历规则 + 每个 Cycle 自己确认 plannedEnd。
- Initiative / Milestone 人工 completion Status → completion 派生。
- Issue completion ratio 自动 Complete Project → 删除；Project completion 必须显式。
- Archive / Deleted 作为通用 Domain lifecycle → 删除。
- 人工 Project Health / 人工周报 → derived Health / Progress Summary。
- 独立 Documents / Resource Domain → Obsidian Markdown + native links/backlinks。
- Dashboard 私有数据 / 私有 Widget system → 共享 Query / Action / Modules。
- Target Date / Planned Start Date 重复计划字段 → 删除。
- Label 自身维护 applicability → Entity Type 注册 LabelGroup。
- Reminder / Snooze 各自拥有独立 temporal field → 删除；Reminder 派生，Snooze 是 Set Due action。
- Triage `reviewAt` → 删除。
- POC-era Task / Subtask / Fleeting Note schema 作为正式产品约束 → 删除。
- `Accept = context mutation` → 删除；Accept 创建新 Workflow Issue，target 成功后才删除 source Triage Issue。
- Advanced Filter / arbitrary AND/OR/NOT 作为 V1 必备能力 → 删除；View/Filter 按成熟页面和真实需求渐进扩展。

## 18. 当前阶段

Product Design、Canonical Domain、Logical Data Model 与 Markdown Physical Model 已形成正式基线。Technical Design 已建立第一轮正式 baseline，并继续在实现前细化。

当前 authoritative design chain：

```text
product-design-baseline.md
    ↓
canonical-domain-model.md
    ↓
logical-data-model.md
    ↓
markdown-physical-model.md
    ↓
technical-design-baseline.md
    ↓
Implementation Plan
    ↓
Formal Implementation
```

`docs/technical-design.md` 继续作为 POC 技术证据，不再承担正式 Technical Design 权威性。后续 Technical Design 必须保留本文已经确认的产品行为，不为了实现方便重新引入万能 Query DSL、TriageItem、Snooze field、Activity Log 或其他已删除复杂度。

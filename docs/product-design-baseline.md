# Trail Personal Product Design

> 状态：当前 Product Design canonical baseline
> 最后更新：2026-08-10
> 适用对象：个人使用
> 参考基线：Linear 的成熟产品原语与交互模型
> POC 技术退出基线：`7a564ff9fada3d0f5af09052c24f1fe51e0ec143`
> 下一阶段：Logical Data Model；Canonical Domain 已收口，在稳定 Domain Contract 之下先冻结逻辑数据结构，再进入 Markdown 物理表示

## 1. 文档定位与权威性

本文是 Trail 当前产品设计的 **source of truth**，记录已经确认的产品原语、语义边界、Linear 适配结论以及被替代的旧方案。

权威性规则：

- 本文优先于更早的 `docs/product-domain-hld.md`、Yggdrasil / Workbench 顶层设计以及 POC-era 产品假设；
- `docs/technical-design.md` 继续保存 POC 已验证的技术事实，但 POC schema 不反向约束新的 Product / Domain Model；
- Handoff 用于说明“从哪里继续”，不作为正式产品决策的唯一事实来源；
- 完成一个完整决策簇后，同步更新本文或后续更权威的 Canonical Domain 文档，避免依赖聊天上下文回忆；
- 本文只保存当前结论、必要 rationale 和 superseded decisions，不保存完整讨论过程。

当前阶段已经结束逐项模仿 Linear 的探索性 review。后续只有出现新的产品问题时才重新打开某项决策，不因为 Linear 仍有更多功能就持续扩张 baseline。

## 2. Baseline 原则

1. **Linear-first，不从零发明成熟任务管理原语。** 对个人执行有价值且与 Trail 目标不冲突的成熟模式优先采用。
2. **删除协作负担，而不是删除成熟结构。** Team、Assignee、订阅、团队汇报等协作语义移除；Initiative、Project、Issue、Cycle、View 等执行原语保留。
3. **长期目标、阶段成果、具体工作、长期分类严格分工。** Initiative、Project、Milestone、Issue、Label 不互相冒充。
4. **Issue 是最小结构化工作单元。** 不建立递归 Sub-issue / parentIssue hierarchy；更细步骤留在普通 Markdown checklist 等非 Domain 内容中。
5. **计划、执行、截止、提醒互相正交。** Cycle、Status、Due、Reminder、Triage Snooze 不混用。
6. **新增“怎么看”的需求优先通过 Filter / Group / View 解决。** 不轻易新增 Domain Entity 或专用页面。
7. **派生优于人工维护。** Progress、Health、Analytics、Project Progress Update 等尽量由 authoritative facts 与必要历史事实推导。
8. **快速操作必须配套低成本恢复。** Selection、drag、bulk action、shortcut 等高速度交互应有即时反馈和 Undo / Recovery。
9. **数据模型与展示模型分离。** Entity 拥有完整属性；Board / List / Card / Dashboard 只展示当前 View / Module 需要的信息。
10. **Domain 语义先于物理 Markdown 表示。** 文件、block、frontmatter、tag、link、HTML marker 等只影响 persistence / parser / mutation，不改变上层 Domain。
11. **优先复用 Obsidian / Markdown 原生能力。** Trail 不建设第二套完整文档编辑系统。
12. **页面差异优先由 scope / query / layout / composition 表达。** Dashboard、Project、My Issues、Current Cycle 等不各自复制业务逻辑。
13. **显示名称与内部语义解耦。** 当前优先使用成熟通用术语；未来 UI alias / localization 可以变化，不改变稳定 Domain identity。
14. **保留扩展边界，但不提前实现未来复杂度。** Templates、Recurring、Inbox、Integrations、AI/Agent 等基于成熟模型后置，不反向驱动核心 Domain。
15. **Mutation 后的数据合法性优先于逐特性补丁。** 字段、关系、Definition 删除或替换统一遵循 Domain Field Contract；允许为空就清空，required 只有存在合法 domain default 才回落，否则必须提示用户选择合法替代。

## 3. Decision Status

本文使用四种状态：

- **Adopt**：直接采用为个人版 baseline；
- **Adapt**：采用核心思想，但根据个人 / Obsidian 场景调整；
- **Defer**：语义边界已明确，但详细实现或体验后置；
- **Reject**：当前明确不纳入产品设计。

`Superseded` 单独记录在第 15 节，表示曾经成立但已被更新决策替代，后续不得作为现行设计重新引用。

## 4. Canonical Product Model

```text
Workspace

Initiative
└─ Project
   ├─ Milestone
   └─ Issue

正交维度：
Status / Priority / Cycle / Due / Labels / Estimate

查询与呈现：
View / Filter / Group / Board / List / Modules
```

这不是一棵“所有东西都必须有父级”的严格目录树：

- Project 最多属于一个 Initiative，也可以没有 Initiative；
- Milestone 必须且只属于一个 Project；
- Issue 最多属于一个 Project，也允许 `project = null`；
- Issue 在选择 Milestone 时，只能从当前 Project 提供的 Milestones 中选择；project-less Issue 不选择 Milestone；
- Label、Cycle、Status、Priority 等是正交属性，不是层级。

### 4.1 Workspace — Adopt

Workspace 是个人 Trail 系统的顶层产品边界，不是日常分类实体。

Workspace 统一拥有：

- workflow / Status definitions；
- Cycle cadence；
- Label / Label Group definitions；
- 全局 View / Favorite / shared product settings。

### 4.2 Team / Assignee — Reject

个人版不建立 Team，也不保留 Team-owned workflow、Assignee、团队 ownership 等协作语义。

原本由 Linear Team 承担的 workflow / Cycle / Label 配置提升为 Workspace 级能力。

### 4.3 Initiative — Adopt

Initiative 表达由多个阶段性 Project 共同推进的长期目标或长期项目。

核心语义：

- 关注长期 Goal，而不是具体执行；
- 可以关联多个 Project；
- 可以拥有 Priority、Due、Labels、Description，并聚合相关普通 Markdown 文档；
- 不维护独立 Initiative Status，也不提供 `Complete Initiative` Action；
- Progress 与 completion 都由下层 Project 当前状态派生；
- 空 Initiative 不视为 Completed；
- 至少存在一个 Project，且所有 Projects 都已经 Completed 或 Canceled 时，Initiative 派生为 Completed；
- Canceled Project 视为已了结，不阻塞 Initiative completion；
- 新增未完成 Project，或原 Project 从终态恢复为未终态后，Initiative 会重新表现为未完成；
- 不把大量 Issue 直接平铺为 Initiative 的执行内容。

判断问题：**这个长期目标需要多个独立成果共同推进吗？** 如果是，优先使用 Initiative。

### 4.4 Project — Adopt

Project 表达明确、可完成的 Outcome / Deliverable，而不是长期分类文件夹。

核心语义：

- 有明确结果与完成条件；
- 可以长期持续，但不应成为永不完成的责任领域；
- 最多属于一个 Initiative；
- 可以拥有 Milestone、Issue、Overview context、Status、Priority、Due、Labels；
- 一个 Issue 至多归属一个 Project。

“工作 / 健康 / 学习 / 兴趣”等长期不会完成的概念不作为 Project，优先由 Project Label Group 表达。

### 4.5 Milestone — Adopt, optional

Milestone 是 Project 内部的阶段性 Outcome / checkpoint，不是更小的 Project，也不是可执行任务。

核心规则：

- 小 Project 不要求创建 Milestone；
- Milestone 必须且只属于一个 Project；
- Milestone 是 Project-scoped，不设计跨 Project reparent / move 基础能力；
- Issue 至多关联一个 Milestone，并且只能从当前 Project 的 Milestones 中选择；
- 可以拥有可选 Due；
- Milestone Progress 与 completion 都由关联 Issue 当前状态派生；
- 不维护独立 Milestone completion Status，也不提供 `Complete Milestone` Action；
- 空 Milestone 不视为 Completed；
- 至少关联一个 Issue，且所有关联 Issues 都处于 Completed 或 Canceled 时，Milestone 派生为 Completed；
- Canceled Issue 视为已了结，不阻塞 Milestone completion；
- 新增未完成 Issue 或 reopen 已关联 Issue 后，Milestone 会重新表现为未完成；
- Milestone 如果真实复杂度增长为独立 Outcome，可以由用户显式提升 / 转换为 Project；这类能力是组合已有创建 / 迁移 / 删除操作的 convenience action，不改变 Milestone 的 Project-scoped 基础语义；
- Milestone 不引入 Issue hierarchy。

### 4.6 Issue — Adopt

Issue 是 Trail 最小的结构化工作单元。

不要为临时任务、工作任务、个人任务、周期任务制造不同 Task 类型；优先由 Project、Cycle、Status、Priority、Labels、Due 等表达差异。

主要属性方向：

- Title / lightweight Description / Notes；
- Status；
- Priority；
- Project（可空）；
- Milestone（可空）；
- Cycle（可空）；
- Due（可空）；
- Estimate（可空；可随时修改；进入 Completed 时必须非空）；
- Labels；
- Reminder（后置能力）。

Issue 可以没有 Project。物理持久化阶段允许使用专用 system Markdown container 承载 project-less Issues，但该容器在 Domain 上不是普通 Project。

### 4.7 Sub-issue / parentIssueId — Reject

Canonical Domain **不包含 Sub-issue、parentIssueId 或递归 Issue hierarchy**。

当一个 Issue 过大时：

1. 用户重新提炼原 Issue 的目标；
2. 如果它实际代表 Project 内的阶段性 Outcome，可提升 / 转换为 Milestone；
3. 创建若干彼此独立、平级、完整的 Issues；
4. 更细的执行步骤使用普通 Markdown checklist 等非 Domain 内容。

系统不自动判断 Project / Milestone / Issue 的正确粒度，用户通过使用逐步形成经验。

### 4.8 Project Dependency — Reject

当前不引入 Project `blocked by / blocking` 依赖关系。

个人场景的关系维护成本高于收益。未来只有出现明确、持续、无法由现有模型表达的个人价值时才重新评估。

### 4.9 Generic Issue Relations — Reject

不建立通用 Issue Relation graph。

- `Related`：Reject。普通 Project / Labels / Markdown links 已足够表达大部分“相关”；
- `Blocking / Blocked by`：Reject。个人执行中的等待语义优先使用 `Waiting` Status；具体等待对象可写在内容或普通链接中；
- Linear 式 post-hoc `Duplicate` relation / status：Reject。Trail 的 Duplicate 能力改为创建时的相似性检查，不进入 Issue lifecycle，也不进入 Canonical Issue Domain。

## 5. Classification：Labels / Label Groups

### 5.1 Labels — Adopt

Label 与 LabelGroup 都是 Workspace-level 分类定义，不拆成独立的 Initiative / Project / Issue label namespaces。

Trail Label 是结构化分类，不替代 Obsidian 原生自由 tag：

- 每个 Label 必须且只属于一个 LabelGroup；
- Label 本身不维护 Initiative / Project / Issue applicability；
- Label 可以表达用户自定义的分类维度，但不会因此获得 Status、Priority、Due 等系统业务语义；
- 无结构的自由标签继续使用 Obsidian tag。

Issue View 仍可以利用所属 Project 的 Project Labels 过滤 / 分组，避免把 Project 级分类重复写入每个 Issue。

### 5.2 Label Groups — Adopt

LabelGroup 是 Workspace-level 分类维度。

每个 LabelGroup 至少具有：

- selection mode：`Single` 或 `Multiple`；
- 组内 Labels。

**LabelGroup 的适用范围由 Entity Type 注册决定**，不是 Label 自己声明 applicability。

例如：

```text
Label Group: Area            [Single]
- Work
- Personal
- Health
- Learning

registered by:
- Initiative
- Project

Label Group: Technology      [Multiple]
- TypeScript
- React
- Obsidian

registered by:
- Project
- Issue
```

某 Entity Type 注册一个 LabelGroup 后，该类型的所有实体都可以使用 Group 下的 Labels；以后新增到该 Group 的 Label 自动可用，不需要逐 Label 配置 scope。

同一 Single Group 内最多一个 Label；Multiple Group 允许多个。

### 5.3 Area — Reject as Domain Entity

Area / Responsibility 不建立独立 Domain Entity。

“工作 / 生活 / 健康 / 学习”等长期领域优先表达为 Label Group；具体由哪些 Entity Type 使用，通过 LabelGroup registration 配置。需要查看时使用 Filter / Group / Custom View。

Obsidian tag / property 等只是后续 serialization candidate，不等同于 Canonical Label Domain。

## 6. Status、Priority、Backlog、Cycle 与时间语义

### 6.1 Status — Adopt

使用“固定 Category + Entity-Type-scoped StatusDefinition”模型。

正常 workflow 的固定 StatusCategory：

- Backlog；
- Unstarted；
- Started；
- Completed；
- Canceled。

Status 是可复用的 workflow capability：拥有独立 lifecycle 的 Entity Type 注册自己的具体 StatusDefinitions。

当前：

- Issue 注册自己的 StatusDefinitions；
- Project 注册自己的 StatusDefinitions；
- Issue 与 Project 共享固定 StatusCategory 语义，但不要求共享同一批具体 StatusDefinitions；
- Initiative / Milestone 不维护独立 workflow Status，它们的 completion 继续派生。

Triage 不作为第六个普通 StatusCategory。它是 Issue 正常执行 workflow 之外的 system intake context；Triage Issue 被 Accept 后才进入正常 Issue Status workflow，Accept 后不通过普通 Status 修改退回 Triage。

具体 Status 可以在 Category 内扩展，例如：

```text
Issue / Started
├─ In Progress
├─ Waiting
└─ Review

Project / Started
├─ In Progress
└─ Paused
```

`Waiting` 用于表达个人工作受外部条件影响、暂时无法继续推进，不依赖 Blocking relation。

正常 Status 之间不建立强制 transition graph；用户可以直接选择对应 Entity Type 已注册的 StatusDefinition。修改 Status 的产品交互采用 **一级 StatusCategory → 二级该 Category 下已注册 StatusDefinition** 的选择结构。

StatusDefinition 的删除、替换和引用修复统一遵循 Domain Field Contract / Mutation Integrity，不再为 Status 单独建立一套删除 lifecycle。

### 6.2 Priority — Adopt

正式 Priority 等级只有：

- Urgent；
- High；
- Medium；
- Low。

未设置 Priority 时字段为 `null`，UI 显示为 **No Priority**；No Priority 不是第五个正式等级。

默认排序语义：

```text
Urgent > High > Medium > Low > No Priority
```

不扩张到 1–10 等高判断成本等级。

### 6.3 Backlog — Adopt

Backlog 表达：**这件工作已经确认值得正式追踪，但尚未进入近期 planning focus。**

Backlog 不是永久收藏夹，应主动保持可管理和可清理。

Triage 与 Backlog 的边界：

- Triage：尚未确认是否应进入正式 workflow；
- Backlog：已经确认值得追踪，只是当前不准备近期执行。

### 6.4 Active — Adopt as system View

Active 不是新状态，而是系统 View：所有进入 Unstarted / Started Category 的 Issues。

### 6.5 Cycle — Adopt

Cycle 是用户显式开启和关闭的个人 planning timebox，表达近期 planning focus，与 Status 和 Due 正交。

它不是固定日历槽，也不要求按周 / 双周自动连续生成。用户通常可以采用约两周的默认规划节奏，但实际 Cycle 可以因工作节奏、休假、生病或其他现实情况提前结束、延后结束，也允许 Cycle 之间存在没有 Current Cycle 的空档。

核心规则：

- Cycle ≠ Status；
- Cycle ≠ Due；
- 任一时刻至多一个开放中的 Current Cycle；
- 不提前创建或规划未来 Next Cycle，不引入 Planned / Draft / Next Cycle 生命周期状态；
- 开启 Cycle 时记录实际 `started_at`；
- 关闭 Cycle 时记录实际 `ended_at`；
- Workspace 可以配置 Cycle 默认目标时长；展示层可根据实际 `started_at` 与 cadence 推导参考结束时间，但不建立独立 Target Date / Due，也不自动强制关闭；
- Backlog Issue 加入 Current / Open Cycle 时，可以自然进入 Workspace 配置的默认 Unstarted Status；
- Issue 可以在 Open / Current Cycle 的整个生命周期中随时加入或移出，不只限于 Cycle Start；
- 临时出现的工作可以直接加入当前 Cycle；
- 从 Cycle 移出不强制改变 Issue Status；
- Cycle membership 表达 planning focus，不是不可变承诺；
- 已完成 Issue 保留其完成时所在 Cycle；
- 关闭 Current Cycle 时，如果仍有非终态 Issue，系统进入显式 **Create Next Cycle** 流程，并自动预填这些未完成 Issues；
- 预填不是无条件 rollover，用户可以调整候选、加入其他 Issue，或取消创建；
- 只有用户确认后才创建新的 Current Cycle 并建立最终选择的 Cycle membership；
- 用户取消创建时，原 Cycle 仍完成关闭，系统允许进入没有 Current Cycle 的空档；未完成 Issue 保持原 Status，不自动进入任何未来 Cycle；
- Completed / Canceled Issues 不进入下一 Cycle 的未完成候选；
- 不再区分 Started 自动 rollover 与 Unstarted 候选两套规则；
- Estimate 不用于 Cycle capacity planning、自动 workload gate、计划成立判断或阻止 Issue 加入 Cycle。

Cycle 的默认目标时长属于 Workspace 配置 / 详细产品设置，不改变上述 Domain 语义。

### 6.6 Due — Adopt

Trail 统一使用 **Due** 表达用户计划截止时间，不再同时维护独立 Target Date。

Due 表达：**这项工作应该在什么时候之前完成。**

可用于 Initiative、Project、Milestone、Issue；是否填写都为 optional，不提供无业务依据的默认日期。

Due 本身是 authoritative user-authored fact；`due soon / overdue / attention level / health evidence` 等不作为重复 Domain 状态持久化，而是运行时根据 Due 与当前时间派生。

产品要求：

- 随 Due 接近逐步增强 attention；
- 最后 24 小时至少进入强提醒；
- 逾期后保持最高注意级；
- 时间经过本身不会自动 Complete / Cancel / 修改 Entity Status；
- 具体视觉阈值与表现留给 Interaction / UI Design。

Due、Reminder 与 Triage Snooze 在更高层共享 user-authored temporal field contract，但产品语义不同：

- Due = 完成约束；
- Reminder = 什么时候提醒；
- Snooze = 什么时候重新提升 intake attention。

Cycle 是 planning timebox，不使用 Due 代替自己的 started / ended boundary。

### 6.7 Estimate — Adopt

Estimate 表达 Issue 的相对工作量，是 **有限、离散、相对的 ordinal work-size value**，不是时间 duration。

核心规则：

- Estimate 是单一字段，不再额外引入 Complexity、Final Estimate 或另一套完成后估计字段；
- Issue 在创建和执行期间允许 `estimate = null`；
- Issue 进入 Completed 时必须 Estimate 非空；如果当前为空，Done / Complete 动作提示用户补充；
- 由于 Estimate 是 Completed state 的必要条件，Issue 保持 Completed 期间不能把 Estimate 清空；
- Completed 后仍可以把 Estimate 修改为另一个合法值；
- 不要求为了完成确认保存额外的 Estimate confirmation 状态或完整修改历史。

Estimate 的主要价值是帮助形成更好的工作量判断与历史参照，可用于：

- Project / Cycle / 时间段的工作量分布观察；
- Analytics / Dashboard；
- 历史 Estimate 分布与完成情况对照；
- 为未来 Issue 的估算提供个人经验参考。

Estimate 明确不用于：

- Cycle capacity planning；
- 自动 workload gate；
- 自动判断计划是否成立；
- 阻止 Issue 加入 Cycle；
- 自动拆分 Issue 或强制提升为 Milestone。

具体 scale / UI 输入方式继续后置，不改变其 finite / discrete / relative / ordinal Domain 定位。

## 7. Triage / Quick Capture

### 7.1 Triage — Adapt Linear, simplify Trail

Triage 直接使用 **Issue**，不再存在独立 `TriageItem` Domain。

Quick Capture 是低成本创建入口：

```text
Quick Capture
    ↓
Create Triage Issue
```

Triage Issue 仍然是正式 Issue，因此可以随时：

- 搜索；
- 打开；
- 编辑 / refine；
- 添加正常 Issue 属性；
- 后续进入正式 workflow 或转换为其他对象。

### 7.2 Create-time Duplicate Detection / Similarity Guard — Adopt

Duplicate 不是 Issue 的状态、关系或处理结果，而是创建 Issue 时的轻量重复检测能力。

适用入口：

- 普通 Create Issue；
- Quick Capture / Create Triage Issue。

核心行为：

1. 用户输入足够的标题 / 内容后，系统在真正创建之前对现有及历史 Issues 做轻量相似性检查；
2. 初版优先使用简单、可解释、低成本的信号，例如：
   - 标题规范化后的 exact match；
   - normalized edit distance / Levenshtein similarity；
   - token / keyword overlap；
   - Project / Label 等上下文可以作为排序辅助，但不作为硬 identity key；
3. 检查范围可以包含 Triage、Backlog、Unstarted、Started、Completed、Canceled 等历史与当前 Issues，避免只在 Active work 中发现重复；
4. 命中疑似重复时，展示最相似的少量候选及其当前状态 / Project 等上下文；
5. 用户可以：
   - 打开已有 Issue；
   - 继续编辑 / 补充已有 Issue；
   - 明确选择 **Create anyway**。

Duplicate Detection 是 **soft guardrail**，不是算法自动否决创建。相似性阈值、候选数量、评分组合和性能策略留到后续 Interaction / Technical Design 冻结。

该能力属于 Creation UX / convenience layer：

- 不新增 `Duplicate` Status；
- 不新增 `duplicateOf` / canonical pointer；
- 不建立 Duplicate relation；
- 不修改 Canonical Issue Domain；
- 不自动合并或改写历史 Issue 内容。

### 7.3 Triage Actions

核心处理动作：

- **Accept**：进入正常 Issue workflow，可进入 Backlog，也可直接进入当前执行计划；Accept 后不通过普通 Status 修改返回 Triage；
- **Snooze / Defer**：延后当前处理优先级；
- **Decline**：结束并进入 Canceled / Declined 类状态；
- **Convert to Project**：发现它实际上是一个 Outcome 时显式转换；
- **Convert to Note**：发现它不是工作，而是值得保留的普通知识 / 内容时转换为普通 Obsidian Markdown Note。

### 7.4 Snooze — Adopt Linear semantics with accessibility guarantee

Snooze 表达“以后再处理”，不是“内容暂时不可访问”。

Snooze 与 Due / Reminder 共用 user-authored temporal field contract，但 Snooze 的产品效果特化为“到时间后重新提升 intake attention”。

被 Snooze 的 Triage Issue：

- 默认 Triage queue 中可以弱化 / 隐藏；
- 仍然可以通过 Search 找到；
- 仍然可以直接打开和编辑；
- Triage View Options 应允许查看 snoozed items；
- 到 `snoozedUntil` 或出现新的 activity 时重新提升到 Triage queue。

### 7.5 reviewAt — Reject / removed

不再维护额外 `reviewAt` / 强制 review deadline。

Snooze 已经提供明确的“以后再处理”时间语义；未 Snooze 的内容本来就持续留在 Triage queue。避免维护两套相似时间字段。

### 7.6 Physical container input

Data Model / Persistence 阶段允许：

```text
triage.md
└─ Triage Issues

unprojected.md (or equivalent system container)
└─ project = null 的普通 Issues

Project-A.md
└─ Project-owned Issues
```

这些 system Markdown containers 可以复用 Project Markdown 承载 Issue 的物理结构，但在 Domain 上 **不是普通 Project**，不具有 Initiative / Milestone / Project Status / Project Progress 等 Project 语义。

文件名、目录和最终 serialization 仍由 Data Model / Physical Model 冻结。

## 8. View / Query / Navigation Model

### 8.1 Filter — Adopt

Filter 是临时查询，只决定当前显示哪些对象，不拥有数据。

支持按 Status、Priority、Project、Cycle、Labels、Due 等组合过滤。

### 8.2 Advanced Filter — Adopt progressively

底层保留嵌套 AND / OR 等组合表达能力；普通 UI 采用渐进式展示，不强迫所有用户面对复杂 Query Builder。

### 8.3 Custom View — Adopt

Custom View 是 **saved query + presentation**。

至少包含：

- Scope；
- Filters；
- Layout；
- Grouping / Sub-grouping；
- Ordering；
- Display Properties。

删除 View 不删除底层 Entity。

### 8.4 Board / List — Adopt

Board 与 List 是同一数据和 Action Model 的不同 Layout。

Grouping 可以基于 Status、Project、Priority、Cycle、Label 等属性。

Board 中跨 Group 拖动意味着修改对应属性，例如：

- Group by Status：拖栏 = Set Status；
- Group by Priority：拖栏 = Set Priority。

### 8.5 Grouping / Sub-grouping — Adopt

Board 可以通过 Sub-grouping 形成 swimlanes；List 可以通过层级 grouping 展示同一批数据。

### 8.6 Display Properties — Adopt

Entity 拥有完整属性；Card / Row 只显示当前 View 需要的字段。

### 8.7 Favorites — Adopt

Favorites 是用户构建的高频导航层，可收藏：

- Cycle；
- Project；
- Initiative；
- Custom View；
- 重要 Issue。

Favorite 的核心语义只是“我经常去这里”。

### 8.8 Personal Focus / My Issues — Adapt

保留 Linear My Issues 的 curated focus 思想，删除 Assignee 等协作语义。

它不是简单“全部 Issue”列表，而是面向个人执行的 attention-oriented View。

候选关注顺序可以综合：

- Urgent；
- In Progress；
- Due Soon / Overdue；
- Current Cycle / Unstarted；
- Other Active；
- Backlog（后置或折叠）。

具体默认排序属于后续 Interaction Design，可通过 View / presentation 调整。

## 9. Project / Initiative Experience

### 9.1 Project page composition — Adopt

Project 需要 Overview context，但不要求独立复制一套业务页面。

产品上可以在同一 Project 页面组合：

- Summary / Description；
- Status / Priority / Initiative / Dates / Labels；
- Related Documents；
- Milestones；
- Derived Progress / Health；
- Board / List Issue Workspace。

Project Issues 仍然使用统一的 Issue View / Query / Action 能力，`project = currentProject` 只是 scope/filter。

### 9.2 Project Status / Completion / Reopen — Adopt

Project 拥有自己的 StatusDefinitions；与 Issue 共享固定 StatusCategory 语义，但不共享具体 StatusDefinition 集合。Project Status 与 Issue completion 独立。

即使所有 Issues 都完成，系统也不会自动把 Project 标记 Completed；是否达到 Outcome 由用户判断，并通过显式 `Complete Project` Action 完成。

`Complete Project` 是主动的项目收尾操作：

- 如果 Project 下仍存在未终态 Issue，默认不允许直接完成 Project；
- Completion flow 应明确展示这些 Issues，要求用户先处理；
- 用户可以逐个处理，也可以使用批量 Done / Complete、批量 Cancel 等基于现有 Issue Actions 的快捷操作；
- 用户也可以把仍需继续追踪的 Issue 移到其他 Project 或变成 project-less；
- 当 Project 下不再存在未终态 Issue 后，用户才能完成 Project。

Progress、Health、Analytics、Dashboard 等被动或派生展示不会自动触发 `Complete Project`，也不会替用户完成项目收尾确认。

Completed Project 如果再次需要承载未终态工作，必须先由用户显式执行 `Reopen Project`；不会因为新增或移入 Issue 自动 Reopen。Reopen 只改变 Project 自身生命周期，不自动修改已有 Issue Status。

Trail 不增加独立 Project Archive lifecycle；Initiative、Milestone、Issue 同样不为了界面收纳增加 Archive 状态。不活跃对象是否继续出现在主要工作界面，由 View、Filter、ordering 和 presentation 处理，例如可利用 latest edit / activity 进行排序。

### 9.3 Progress — Derived

Project / Milestone Progress 不允许用户手填一个 authoritative 百分比。

优先从以下事实派生：

- Issue completion；
- Milestone completion。

Initiative Progress 同样由 Projects 派生。

### 9.4 Health — Derived

不采用人工维护 Project Health。

Health 是根据当前事实与必要历史事实派生的解释性信号。候选状态：

- On Track；
- At Risk；
- Off Track；
- Unknown / Insufficient Data。

候选证据：

- Due 与 Progress / 时间进度；
- Milestone delay；
- Issue overdue；
- 多次 Cycle rollover / repeated cross-cycle continuation；
- 同类历史 Project elapsed-duration distribution；
- 其他可解释执行事实。

Health 必须尽可能解释“为什么”；数据不足时显示 Unknown，不强行推断。

### 9.5 Automatic Project Progress Update — Adopt as derived summary

不采用 Linear 式人工周报 / 手工 Project Update 维护。

保留 **自动 Project Progress Update / Activity Summary**：根据 Project authoritative facts 和历史变化，简要汇报一段时间内发生的变化，例如：

- Issue 状态 / 完成量变化；
- scope 增减；
- Milestone 进展；
- Project Progress 变化；
- Due 变化；
- Derived Health 变化；
- 其他显著、可解释的变化。

Update 不是新的 authoritative 业务事实。具体生成频率、展示位置、历史保留方式与是否持久化留到后续 Product / Technical Design。

### 9.6 Timeline — Adapt / detail later

Timeline 可作为高层 Project / Initiative 时间视角，但不要求用户维护第二套 Timeline 数据。

优先利用已有 Due、Cycle / lifecycle boundaries、Status、actual start/completion 等事实；不再维护独立 Target Date 或 Planned Start Date 作为第二套计划时间。

当前不显示 Project dependency lines，因为 Project Dependency 已 Reject。

## 10. Interaction System

以下能力是同一套 Interaction System 的不同入口，而不是独立 feature islands。

### 10.1 Focus / Highlight — Adopt

Focus 表示当前键盘 / 快捷操作目标，不等于 Selection，也不等于 Open。

### 10.2 Peek — Adopt

Peek 用于快速理解对象而不离开当前上下文。

应同时考虑键盘效率与鼠标可发现性；不把重要能力做成只有快捷键才能发现的隐藏功能。

### 10.3 Selection / Multi-selection — Adopt

Selection 是 Action target。单个与多个 Entity 共用统一 Selection Model。

### 10.4 Bulk Actions — Adopt

Bulk Action 不建立独立 Batch Edit 产品；同一个 Action Model 接受 single target 或 target set。

### 10.5 Context Menu — Adopt

Context Menu 是鼠标用户的 contextual Action 入口，只显示当前对象 / Selection 可执行行为。

### 10.6 Command Menu — Adopt

Command Menu 是可搜索的上下文 Action / navigation 入口。

产品职责包括：

- Navigation / Quick Open；
- Action Search；
- 对当前 Focus / Selection 执行 contextual actions。

Search 与 Command Menu 在产品意图上仍应区分：Search 主要用于“找对象”，Command 主要用于“做事情”。

### 10.7 Keyboard Shortcuts — Adopt

快捷键是高频 Action 的最快入口，但不能成为功能唯一入口。

### 10.8 Search — Adopt

区分：

- Global Search：跨实体查找；
- Find in View：临时缩小当前工作集；
- Quick Open：快速导航已知对象。

### 10.9 Undo / Recovery — Adopt as foundation

高频可逆 mutation 优先采用：

`Fast Action + Immediate Feedback + Undo / Recovery`

不要为了安全给所有可逆操作增加确认框；不可逆或高风险 destructive action 才使用更强确认。

### 10.10 Interaction feedback / affordance — Adopt

正式 UI 需要明确的 hover、focus、pressed、selected、disabled、loading、error 等状态和适度 micro-interactions，同时保持可访问的 `focus-visible`。

视觉反馈可以使用高亮、描边、阴影、elevation、transition，但避免过度动画。

### 10.11 Container-adaptive layout — Adopt

Trail 运行在可任意分栏的 Obsidian Workspace 中。响应式判断优先基于 pane / container width，而非只看应用窗口宽度。

同一业务 View / Module 根据空间切换 Expanded / Compact / Minimal presentation；不复制业务逻辑。

### 10.12 Delete / Relation Resolution — Adopt

Delete 是显式 destructive action，但 `Deleted` 不作为 Initiative / Project / Milestone / Issue / Cycle 的正常 Domain Status。

删除目标存在受影响关联对象时，必须进入明确的 relation resolution flow：

- 删除前展示受影响对象和关系；
- 提供一个默认处理方案；默认方案优先保留其他已有 Entity / 工作历史，只删除用户明确选择的目标；
- 用户不接受默认方案时，可以选择其他合法处理，例如移动关联对象、清除关系、逐项处理，或明确选择更强的级联删除；
- 用户可以取消整个操作；
- Delete target 与 relation resolution 作为一个完整操作确认和执行，不能留下半删除 / 半迁移状态。

默认行为：

- Delete Initiative：保留 Projects，使其变成无 Initiative；可选择迁移到另一个 Initiative；
- Delete Milestone：保留 Issues，仍属于原 Project，只清除 Milestone；可选择移到同 Project 的另一个 Milestone；
- Delete Project：默认保留 Issues，使其 project-less，并清除原 Milestone；Project-scoped Milestones 随 Project 删除。用户可以选择迁移 Issues、逐项处理，或明确选择同时删除相关 Issues；
- Delete Issue：删除 Issue 并移除其 memberships，不级联删除其他 Entity；
- Delete Cycle：删除 Cycle，但默认保留 Issues 及其 Status；删除历史 Cycle 时需要明确提示会失去相应 Cycle 历史上下文。

`Restore` 不作为上述 Entity 的 Domain lifecycle。Undo、Obsidian Trash、Git / 文件历史等恢复能力属于后续 Application / Persistence / Recovery Design。

## 11. Obsidian-native Documents / Editing

### 11.1 No separate Documents system — Adapt

不复制 Linear 独立 Documents 数据 / 编辑系统。

普通 Obsidian Markdown 文档仍是普通文档；Trail 负责 Domain interpretation、Runtime Query / View、Action 与轻量 Entity editing。

### 11.2 Lightweight entity editing — Adopt

Initiative / Project / Issue 等 Trail Entity 只需要轻量文本编辑：

- Title；
- 简短 Description / Notes；
- 结构化 properties；
- 由明确 Action 驱动的确定性修改。

复杂内容（长文、表格、图片、嵌入、研究笔记、设计文档等）放在独立 Obsidian Markdown 文档中。

Trail 不建设复杂 Markdown editor。复杂文档查看 / 编辑优先使用 Obsidian 原生 MarkdownView / Live Preview 与官方扩展能力。

### 11.3 Related Documents via native links/backlinks — Adapt

最常见关联方式是普通文档写入指向 Trail Entity 的 `[[wiki link]]`。

Trail 基于 Obsidian resolved-link / backlink 信息，在 Entity 页面自动聚合相关文档：

- 不新增独立 Resource Domain Entity；
- 不要求用户额外维护 Resource relation；
- 点击后进入 Obsidian 原生文档编辑体验；
- 如果未来自动聚合噪声过高，再评估 Pin / Curate 等轻量增强。

## 12. History / Analytics / Derived State

### 12.1 No full Product Activity Log — Reject

正式产品不记录每一次编辑、拖动或属性修改的完整 Activity Log。

历史数据遵循最小事实原则：只有当一个过去事实未来无法从 authoritative data 重建，并且已经有明确产品价值时才持久化。

当前确认：

- Issue 第一次进入 Started 时记录 `started_at` / `firstStartedAt`；后续从 Completed / Canceled reopen 不重置；
- Complete / Cancel 等只保留满足当前产品能力所需的最小 lifecycle timestamps，不预建完整 transition history；
- `started_at → completed_at` 只能解释 elapsed duration，不代表实际工作时长；
- Closed Cycle 优先依靠 Cycle 自身 started / ended boundary、最终 membership 与 Issue 已有稳定 facts；不预建 Cycle snapshot / participation-history entity。

如果未来出现明确历史视图或 Analytics 无法由现有事实可靠得到结果，再增加那一个最小 historical fact。

开发 / 测试 diagnostic log 例外：它可以详细记录 action、mutation、Vault write、reparse、reconcile、rollback 与 error，用于真实 Obsidian 验证和远程协作诊断，但它不是 Product History，也不是 Analytics source。

### 12.2 Analytics / Insights — Adopt

Analytics 是只读派生层：

- 当前状态分析直接消费 Runtime Domain Model / Store；
- 历史分析消费必要 historical facts，并在查询时计算；
- derived result 不成为 authoritative domain state。

候选内容：

- Project elapsed-duration distribution；
- Cycle completion trend（现有事实足够时）；
- Issue completion by priority；
- Estimate distribution；
- lifecycle / status duration（有足够事实时）；
- Projects completed by Area / Labels；
- Derived Health evidence；
- 自动 Project Progress Update 所需变化摘要。

统计设计优先考虑中位数、分位区间、样本量等稳健信息，不把简单平均数当默认唯一依据。

## 13. Dashboard / Page Composition

### 13.1 Dashboard — Adopt as normal composition

Dashboard 是首页 / 默认视图组合，不拥有专用业务数据、业务逻辑或私有 Widget system。

它与 Project、Initiative、My Issues、Current Cycle、Custom View 等共享：

- Runtime Domain Data；
- Query / Filter；
- Action Model；
- Page Shell / Layout；
- composable Modules / Widgets；
- reusable Entity Components。

Dashboard 的差异只是“展示什么、如何编排与强调”。

候选模块可包含：

- 当前 / 高优先级工作；
- starred / favorited Projects / Views；
- Project / Cycle / completion statistics；
- heatmap 等可视化；
- clock / date；
- Quick Capture；
- 周会准备等基于普通 Note / Quick Capture 的组合模块。

这些模块原则上也可在其他页面复用。

### 13.2 No dedicated Daily Review subsystem

不新增 Morning Review / Evening Review / Daily Review Domain 或专用业务子系统。

个人节奏优先通过 My Issues、Current Cycle、Backlog、Custom Views、Dashboard composition 与普通 Note 组合表达。

## 14. Convenience / Automation / Deferred Capabilities

### 14.1 Issue Templates — Adopt, implement later

Template 是创建 Issue 的便捷起点，可预填 Description 与 properties，不是新的 Entity type。

### 14.2 Project Templates — Adopt, implement later

Project Template 可预填 Description、Milestones、Issue skeleton 等；模板后续变化不应隐式修改已经实例化的 Project。

### 14.3 Recurring Issues — Adopt, implement later

Recurring Rule 到期后创建正常 Issue，后续完全遵循普通 Issue workflow。

不创建特殊 `RecurringTask` Domain type。

### 14.4 Reminder — Adopt concept, detail later

Reminder 表达“什么时候重新提醒我注意这个 Issue”。

Due、Reminder、Triage Snooze 在更高层共享同一类 user-authored temporal field contract：时间值可空、到点判断由当前时间派生、时间经过本身不直接修改 Core Entity lifecycle。

三者产品语义分别是：

- Due = 应在什么时候之前完成；
- Reminder = 什么时候提醒；
- Triage Snooze = 什么时候重新提升 intake 注意力。

具体 notification / Inbox delivery 体验后置。

### 14.5 Inbox — Defer, concept retained

Inbox 未来用于 notification-like 信息：提醒、外部集成事件、后台任务结果等。

与 Triage 分工：

- Triage：新工作是否 / 如何进入正常 workflow；
- Inbox：系统有哪些新事件值得注意。

首期可以不实现。

### 14.6 Explicit Automation Rules — Adopt selectively

优先实现明确、可解释、可关闭的自动规则，例如：

- Current Cycle 关闭且存在未完成 Issue → 打开 Create Next Cycle flow 并预填这些 Issues，由用户确认是否创建；
- Recurring schedule reached → create normal Issue；
- Reminder reached → create attention / Inbox event；
- authoritative facts changed → recompute derived analytics / health / summaries。

当前不做通用 IF/THEN Automation Builder。

### 14.7 Integrations / API / AI Agents — Defer

保留扩展边界，但不让这些未来能力驱动当前 Canonical Domain。

未来 AI / Agent 应消费成熟的 Entity / Action / Permission 模型；未经显式用户授权，不应自动修改 Vault authoritative data。

## 15. Superseded Decisions

以下旧方案已经被当前设计完全替代。旧方案不得再作为现行 Product Design 引用。

- **独立 Area Domain Entity → 删除。** 长期领域改用 LabelGroup + Entity Type registration + View / Filter / Group。
- **Fleeting Note 作为独立正式 Domain → 删除。** Quick Capture 直接创建 Triage Issue；非工作内容转换为普通 Obsidian Markdown Note。
- **独立 `TriageItem` → 删除。** Triage 直接使用 Issue。
- **Triage `reviewAt` / 强制 review deadline → 删除。** 未来重新提升注意力统一使用 Snooze / Defer。
- **Triage 必须经过特殊 Review lifecycle 才能继续保留 → 删除。** Triage Issue 可以像普通 Issue 一样随时编辑；Snooze 只管理注意力。
- **Sub-issue / Parent Issue hierarchy → 删除。** Issue 是最小结构化工作单元；更大工作拆成平级 Issue / Milestone，更细步骤使用 Markdown checklist。
- **Project `blocked by / blocking` dependency → 删除。**
- **Generic `Related` Issue relation → 删除。**
- **Issue `Blocking / Blocked by` relation → 删除。** 等待语义使用 `Waiting` Status，具体原因写在内容或普通链接中。
- **Linear 式 Duplicate Status / relation / post-hoc duplicate lifecycle → 删除。** 改为 Create-time Duplicate Detection / Similarity Guard；创建前提示疑似已有 Issue，不改变 Issue Domain。
- **Complexity 作为独立 Issue 字段 → 删除。** 统一使用单一 `Estimate` 字段；Completed state 要求 Estimate 持续非空，但可修改为其他合法 Estimate。
- **Started 自动 rollover、Unstarted 只作为下一 Cycle 候选的双轨规则 → 删除。** 统一改为关闭 Cycle 时预填全部非终态 Issues 到显式 Create Next Cycle flow，由用户确认最终选择。
- **提前创建 / 规划 Planned / Next Cycle → 删除。** 未来工作留在 Backlog / 普通 planning，只有显式创建后才存在新的 Current Cycle。
- **Initiative 独立人工 Status / `Complete Initiative` → 删除。** Initiative completion 改为由 Projects 被动派生。
- **Milestone 独立人工 completion → 删除。** Milestone Progress / completion 都由关联 Issues 被动派生。
- **自动根据 Issues 完成率 Complete Project → 删除。** Project completion 必须由用户显式确认，并先处理所有未终态 Issue。
- **为了界面收纳增加 Archive lifecycle → 删除。** 使用 View / Filter / ordering / presentation 管理低注意力对象。
- **`Deleted` 作为普通 Domain Status / 通用 Restore lifecycle → 删除。** Delete 是 destructive action；恢复机制属于 Application / Persistence / Recovery。
- **人工维护 Project Health → 删除。** Health 由 Issues / Milestones / Dates 等事实派生。
- **Linear 式人工 Project Update / 周报实体 → 删除。** 改为基于事实变化自动生成 Project Progress Update / Activity Summary。
- **独立 Documents / Resource Domain system → 删除。** 使用普通 Obsidian Markdown + native links/backlinks + Related Documents 聚合。
- **Dashboard 私有数据、私有业务逻辑或私有 Widget system → 删除。** Dashboard 只是共享 Query / Action / Module 的一种页面组合。
- **POC-era Task / Subtask / Fleeting Note schema 作为正式产品约束 → 删除。** POC schema 只代表验证载体；正式 Domain 以本文和后续 Canonical Domain 文档为准。

- **Target Date / Planned Start Date 作为独立用户计划字段 → 删除。** Trail 统一使用 Due 表达 completion constraint；实际 lifecycle times 与 Cycle boundaries 单独记录，不维护重复计划时间。
- **Label 自身维护 Issue / Project / Initiative applicability → 删除。** 改为 Entity Type 注册 LabelGroup，Label 只属于 Group。
- **为 Status / Label / Delete 等逐特性定义数据修复规则 → 删除。** 统一采用 Domain Field Contract / Mutation Integrity：optional 可清空，required 有合法 default 才回落，否则提示用户选择合法替代。

## 16. 明确偏离 Linear 的地方

| Linear 能力 / 默认思路 | Trail Personal Baseline |
| --- | --- |
| Team | Reject；Workspace 统一 workflow |
| Assignee / collaboration ownership | Reject |
| Team-scoped workflow / Cycle | Adapt 为 Workspace 级 |
| Initiative | Adopt；completion 被动派生，不维护独立 Status |
| Project | Adopt；显式 Complete / Reopen，无 Archive lifecycle |
| Milestone | Adopt，可选；completion 被动派生 |
| Issue | Adopt |
| Sub-issue / parent-child Issue hierarchy | Reject |
| Project Dependency | Reject |
| Related relation | Reject |
| Blocking relation | Reject；Waiting Status 替代个人等待语义 |
| Linear Duplicate status / relation | Reject post-hoc duplicate lifecycle；改为 Create-time Duplicate Detection / Similarity Guard，不新增 Duplicate Status 或 relation |
| Fixed / pre-created next Cycle + automatic rollover | Reject；Cycle 关闭时进入显式 Create Next Cycle flow，由用户确认 |
| Estimate-based Cycle capacity planning | Reject；Estimate 用于估算与观察，不作为硬性计划约束 |
| Target Date / planned start fields | Reject as duplicate planning dates；Trail 统一使用 Due + actual lifecycle / Cycle boundaries |
| Label applicability on each label | Adapt；改为 Entity Type 注册 LabelGroup |
| My Issues | Adapt 为 personal curated focus |
| Triage | Adapt 为个人 Quick Capture / intake；直接使用 Issue |
| Triage `reviewAt` | Reject；采用 Snooze / Defer |
| Inbox | Defer，但保留概念边界 |
| Manual Project Health | Reject；Derived Health |
| Manual Project Updates | Reject；改为 automatic derived Progress Update / Activity Summary |
| Full product Activity Log | Reject；只保留有分析价值的 historical facts |
| Timeline dependency lines | Reject with Project Dependency；Timeline 本身可后置设计 |
| Linear Documents system | Adapt 为 Obsidian Markdown + native links/backlinks |
| Collaboration notifications / subscriptions | Reject / future Inbox extension |
| General automation builder | Defer |
| Agent-driven workflow | Defer |

## 17. Deferred Design Inputs（不重新打开 Product Semantics）

以下内容进入后续阶段，但不表示上层产品语义仍未确定。

### 17.1 Logical Data Model

Canonical Domain 已完成。下一阶段把现行 Domain Contract 转成实现无关的 logical records / fields / references：

- Initiative / Project / Milestone / Issue / Cycle records；
- Workspace Definitions 与 Entity Type registration；
- stable identity 与 logical references；
- Field Contract：nullability、defaults、validation、state-conditioned requiredness；
- minimal lifecycle timestamps / historical facts；
- CustomView / Favorite 等 persisted product-state records；
- Derived State input / cache boundary。

这一阶段仍不决定 Markdown file / block / frontmatter 的物理表达。

### 17.2 Markdown Physical Model

在 Domain Contract 稳定后再冻结：

- Project / Initiative / system container 文件结构；
- `triage.md` / project-less Issue container 的实际命名与目录；
- Issue block serialization；
- frontmatter / tag / link / block marker 的职责；
- parser / serializer / mutation 粒度；
- Git diff / conflict / recovery 特性。

相同物理结构可以服务不同 Domain container，但物理复用不能把 system container 误建模成普通 Project。

### 17.3 Project Progress Update detail

已确认它是 derived summary；仍后置：

- 生成频率；
- UI 展示位置；
- 是否保留历史快照；
- 是否持久化文本结果还是按需生成；
- 如何避免噪声更新。

### 17.4 UI / Interaction Design

后续需要冻结：

- Design tokens / component library；
- Card / Row display density；
- Peek / Detail presentation；
- Triage Snooze View Options；
- deadline attention 的具体视觉阈值；
- Status Category → StatusDefinition 二级选择的具体菜单实现；
- Delete relation resolution flow 的对话框 / selection / bulk interaction；
- container breakpoints；
- context submenu pointer grace / safe triangle；
- animation / accessibility details。

### 17.5 Local materialized Runtime Store / sync architecture

作为 Technical Design 输入：

- UI read path 消费本地 Runtime Store / index；
- structured mutation 支持 optimistic UI；
- authoritative mutation 经串行 mutation pipeline；
- Vault write 后 reparse / verify / reconcile；
- external Vault changes 通过 file events 回到 reconciliation；
- Vault 保持 durable source of truth；
- Runtime Store 是可重建派生状态。

### 17.6 Development Diagnostic Activity Log

开发 / 真实 Obsidian 测试阶段可通过显式开发开关记录结构化 diagnostic log，用于还原 Action、runtime diff、mutation、reparse、reconcile、rollback 与错误。

它不是正式 Product History，也不是 Analytics source。

## 18. Product Design 收口与下一阶段

Linear-first Product Design 与 Canonical Domain Design 均已完成。当前核心结论：

1. **个人版保留 Linear 的成熟执行骨架，但删除团队协作层。**
2. **Initiative → Project → Milestone / Issue 形成目标、成果、阶段、执行的明确分工；Issue 不再递归。**
3. **Status 是通用 workflow capability：Issue / Project 各自注册具体 StatusDefinitions，共享固定 StatusCategory。**
4. **LabelGroup 是结构化分类维度；Entity Type 注册 Group，Label 不再逐项维护 applicability。**
5. **Due 是统一 completion deadline；Target Date / Planned Start Date 不再作为独立计划时间。Due / Reminder / Snooze 共享 temporal contract，再按产品效果特化。**
6. **Domain Field Contract / Mutation Integrity 统一约束字段、关系、Definition 删除与 mutation 后的数据合法性。**
7. **Estimate 是有限、离散、相对的 ordinal work-size；Completed Issue 必须持续拥有合法 Estimate。**
8. **Triage 直接使用 Issue；Quick Capture 是入口，不再建 Fleeting Note / TriageItem 双轨模型。**
9. **Cycle 不提前规划 Next Cycle；关闭时通过显式 Create Next Cycle flow 处理未完成工作。**
10. **Project completion 是主动用户 Action；Initiative / Milestone completion 被动派生。**
11. **事实 / 历史 / 派生严格分层；不建设完整 Product Event Log，也不提前建设 Cycle history snapshot。**
12. **开发 / 测试 diagnostics 可以详细记录真实操作链路，但不进入正式 Product History。**
13. **Views / Filters / Group / Layout 是“怎么看”的核心抽象；CustomView / Favorite 等即使持久化，也不自动升级成 Core Domain Entity。**
14. **Trail 不引入 Archive lifecycle 或通用 Deleted Status；Delete / Definition change 统一受 Mutation Integrity 与 relation resolution 约束。**
15. **Obsidian Markdown 是持久化与知识文档宿主，Trail 不建设第二套完整文档系统。**
16. **Templates、Recurring、Inbox、Integrations、AI 等都建立在核心 Domain 之上，不反向增加核心复杂度。**

下一阶段正式进入 **Logical Data Model**。已经冻结的 Product / Canonical Domain semantics 不因数据建模而重新打开；Logical Data Model 只负责把它们转换为精确的 logical records、fields、references、constraints 与最小 historical facts，并继续把 Markdown 物理表示留给后续 Physical Markdown Model。

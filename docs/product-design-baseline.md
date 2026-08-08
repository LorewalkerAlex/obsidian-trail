# Trail Personal Product Design

> 状态：当前 Product Design 基线（Stage 1 Linear baseline + Stage 2 Trail-specific adaptations）<br>
> 最后更新：2026-08-08<br>
> 适用对象：个人使用<br>
> 参考基线：Linear 的成熟产品原语与交互模型<br>
> 仓库参考点：`poc/plugin-shell` POC Exit commit `7a564ff9fada3d0f5af09052c24f1fe51e0ec143`<br>
> 下一阶段：Domain / Data Model Design；在统一 Runtime Domain Contract 之下比较 Markdown 持久化方案

## 1. 文档定位与权威性

本文记录 Trail 在完成 Linear baseline review 后确认的个人版产品原语、语义边界和裁剪决定。它不是 Linear 功能清单，也不是 Trail 的 Technical Design。

Stage 2 Trail-specific review 已完成，本文现在同时包含 Linear baseline 与已经确认的 Trail 偏移/约束：

- 本文是当前产品原语、交互模型和规划语义的最高优先级 Product Design 基线；
- `docs/product-domain-hld.md` 仍保留为 POC-era 产品与领域设计记录，其中已经被本文明确替代的 Area / Task / Subtask / Fleeting Note / 页面结构等结论不再作为当前产品决策依据；
- `docs/technical-design.md` 继续保留 POC 已验证的技术事实与实现证据；产品模型发生变化时，不应把旧 POC schema 误当成新的产品约束；
- 下一阶段进入 Domain / Data Model Design：先定义统一 Runtime Domain Contract，再比较 Markdown 物理表示、Parser / Serializer / Mutation 边界与性能/冲突特性。

本文只保存当前结论与必要 rationale，不保存完整讨论过程。

## 2. Baseline 原则

1. **Linear-first，不从零发明任务管理原语。** 对个人执行有价值且与 Trail 目标不冲突的成熟模式优先采用。
2. **删除协作负担，而不是删除成熟结构。** Team、Assignee、订阅、团队汇报等协作语义可以移除；Initiative、Project、Issue、Cycle、View 等执行原语继续保留。
3. **长期目标、阶段成果、具体工作、长期分类严格分工。** 不用单一层级承担所有组织语义。
4. **计划、执行、截止、提醒互相正交。** Cycle、Status、Due、Reminder、Triage Snooze 不混用。
5. **新增“怎么看”的需求优先通过 Filter / Group / View 解决。** 不轻易增加新 Domain Entity 或专门页面。
6. **渐进式结构化。** 简单工作保持简单；真实复杂度增加后再引入 Sub-issue、Milestone、Project 等结构。
7. **派生优于人工维护。** Progress、Health、Analytics 等尽量由已有事实和历史数据推导，不要求额外周报式维护。
8. **快速操作必须配套低成本恢复。** Selection、drag、bulk action、shortcut 等高速度交互应有即时反馈和 Undo / Recovery。
9. **数据模型与展示模型分离。** Entity 拥有完整属性；具体 Board / List / Card 只展示当前 View 需要的信息。
10. **保留扩展位，但不提前实现未来复杂度。** Inbox、Integrations、Agent 等可保留概念边界，首期没有真实价值时不实现。
11. **Domain 语义先于物理 Markdown 表示。** Trail UI 与业务查询只消费统一 Runtime Domain Model；一文件一对象、同文件 block、checkbox、frontmatter、tag、link、HTML marker 等只影响解析、写回、冲突粒度和效率，不改变上层语义。
12. **优先复用 Obsidian / Markdown 原生能力。** 物理层能无歧义承载 Trail 语义时不重复造格式；相同底层格式可以由 Obsidian 与 Trail 以不同规则解释和使用。

## 3. Decision Status

本文使用四种状态：

- **Adopt**：直接采用为个人版 baseline；
- **Adapt**：采用核心思想，但删除或调整团队/平台语义；
- **Defer**：概念保留，当前阶段后置；
- **Reject**：当前明确不纳入产品设计。

## 4. 核心对象模型

### 4.1 Workspace — Adopt

Workspace 是整个个人工作系统的顶层产品边界。它不是日常分类实体，也不承担 Project 层级职责。

个人版不需要多 Team workflow，因此 Workspace 直接拥有全局 workflow、Cycle cadence、Label definitions 等共享配置。

### 4.2 Team — Reject

Team 对个人版没有独立产品价值，删除 Team、Assignee、Team-owned workflow 等协作语义。

原本由 Team 承担的 workflow / Cycle / Label 配置能力提升为 Workspace 级能力。

### 4.3 Initiative — Adopt

Initiative 表达由多个阶段性 Project 共同推进的长期目标或长期项目。

核心语义：

- 关注长期 Goal，而不是具体执行；
- 可以关联多个 Project；
- 可以拥有 Status、Priority、Target Date、Labels、Description，并聚合 Related Documents；
- Progress 由下层 Project 派生；
- 不把大量 Issue 直接平铺为 Initiative 的执行内容。

判断问题：**这个长期目标需要多个独立成果共同推进吗？** 如果是，优先使用 Initiative。

### 4.4 Project — Adopt

Project 表达一个明确、可完成的 Outcome / Deliverable，而不是长期分类文件夹。

核心语义：

- 有明确结果；
- 可以长期持续，但应存在完成条件；
- 可以属于一个 Initiative；
- 可以拥有 Milestone、Issue、Overview、Status、Priority、Target Date、Labels，并聚合 Related Documents；
- 一个 Issue 至多归属一个 Project。

“工作 / 健康 / 学习 / 兴趣”等不会完成的长期领域不作为 Project。

### 4.5 Milestone — Adopt, optional

Milestone 表达单个 Project 生命周期中的重要阶段，而不是更小的 Project。

核心规则：

- 小 Project 不要求创建 Milestone；
- Issue 可以归属具体 Milestone；
- Milestone Progress 由关联 Issue 派生；
- 如果 Milestone 真实复杂度增长到拥有独立 Outcome，可升级为 Project。

### 4.6 Issue — Adopt

Issue 是个人版最主要的可执行工作单位。

不要为临时任务、工作任务、个人任务、周期任务等制造不同 Task 类型；优先由 Project、Cycle、Status、Priority、Labels、Due 等属性表达差异。

主要属性方向：

- Title / Description；
- Status；
- Priority；
- Project；
- Milestone（可选）；
- Cycle；
- Due；
- Estimate；
- Labels；
- Parent / Sub-issues；
- Reminder（后续能力）。

### 4.7 Sub-issue — Adopt

Sub-issue 仍然是完整 Issue，而不是只拥有 checkbox 的轻量对象。

它用于“一块工作太大，不适合单个 Issue，但又不足以成为 Project”的拆解。

Sub-issue 可以拥有独立 Status、Priority、Cycle、Due、Description 等 Issue 属性。

同时保留 Markdown checklist 的产品空间：

- **Sub-issue**：值得独立追踪的工作；
- **Checklist**：Issue 内容内部无需独立管理的小步骤。

### 4.8 Project Dependency — Reject for now

当前不引入 Project `blocked by / blocking` 依赖关系。对个人使用价值较低，会增加关系维护成本。

未来只有出现明确、持续的个人使用价值时再评估。

### 4.9 Issue Relations — Defer

`related / blocked by / blocking / duplicate` 等 Issue Relations 暂不进入核心 baseline 实现范围。

保留概念空间，待真实个人工作流验证后决定。

## 5. 分类体系

### 5.1 Issue Labels — Adopt

Issue Labels 用于 Issue 的横向、多值分类，不承担层级职责。

### 5.2 Project Labels — Adopt

Project Labels 与 Issue Labels 分开。Project 的长期分类、业务领域、Project Type 等使用 Project Labels 表达。

Issue View 应支持通过其所属 Project 的 Project Label 进行过滤或分组，避免在所有 Issue 上重复冗余 Project 级分类。

### 5.3 Label Groups — Adopt

Label Group 用于有明确语义的互斥分类维度，例如：

```text
Project Label Group: Area
- Work
- Personal
- Health
- Learning

Issue Label Group: Type
- Bug
- Feature
- Research
- Maintenance
```

同一个 Group 内只选择一个具体 Label；不同 Group 互相正交。

长期不会完成的“Area / Responsibility”类概念优先表达为 Project Label Group，而不是新增层级实体。

Label 的 Domain 语义不要求 Trail 自创新的物理 metadata 格式。后续 Data Design 可以优先复用 Obsidian tag / property 等已有表示；同一个底层 token 在 Obsidian 中仍可作为通用 Tag，而 Trail 只在受管 Entity / context 中按 Label、Label Group、适用 Entity 类型和互斥约束解释它。最终 serialization 形式在 Domain Contract 稳定后再决定。

## 6. Issue 执行与计划语义

### 6.1 Status — Adopt

使用“稳定 Status Category + 可配置 Display Status”模型。

稳定 Category：

- Backlog；
- Unstarted；
- Started；
- Completed；
- Canceled。

具体显示状态可以在 Category 内扩展，例如 Started 下可有 `In Progress / Waiting / Review`。

个人版由 Workspace 统一拥有 workflow。

### 6.2 Priority — Adopt

采用粗粒度 Priority：

- No Priority；
- Low；
- Medium；
- High；
- Urgent。

不增加 1–10 或过多 P 级别，避免无收益的判断成本。

### 6.3 Backlog — Adopt

Backlog 表达：**这件工作已经确认值得追踪，但尚未承诺近期执行。**

Backlog 不是永久收藏夹，应主动保持可管理和可清理。

### 6.4 Cycle — Adopt

Cycle 是近期 planning timebox，表达“在哪个周期承诺推进这些 Issue”。

核心原则：

- Cycle 与 Status 分离；
- Cycle 与 Due 分离；
- Backlog Issue 加入 Cycle 时可以自然进入 Todo / Active；
- Cycle 结束后未完成 Issue 可以 rollover；
- 第一阶段不使用 Estimate 做 Cycle capacity 限制或自动负载判断。

Cycle cadence 的具体长度不在当前 Product Design 中冻结，留给后续配置 / 详细交互设计确认。

### 6.5 Active — Adopt

Active 是系统 View，而不是新状态。

语义：所有进入 Unstarted / Started Category 的 Issue，即已经进入真实执行体系的工作。

### 6.6 Due — Adopt

Due 只表达真正 Deadline：**最晚什么时候必须完成。**

不把 Due 当作“我准备哪天做”的计划日期。

### 6.7 Estimate — Adopt

Estimate 保留并默认可用，表达 Issue 的相对工作量 / 复杂度。

用途：

- Project / Cycle / 时间段的工作量统计；
- 历史分布与趋势；
- Analytics / Dashboard；
- 可能参与某些 Progress 展示。

当前明确不用于：

- Cycle capacity planning；
- 自动负载限制；
- 自动判断“计划能否成立”；
- 阻止 Issue 加入 Cycle。

未来如果真实个人使用中出现容量规划价值，再单独评估。

## 7. Intake 与注意力入口

### 7.1 Triage — Adapt

保留 Linear 的 processing boundary 思想，但按个人工作/知识捕获场景扩展语义。

Triage 承载所有**当前尚不足以成为正式 Issue / Project，但仍值得继续保留和加工的内容**。Quick Capture 只是低成本写入 Triage 的入口，不再单独建立 Fleeting Note Domain Entity。

核心规则：

- Triage item 可以跨多轮持续 refine，不要求第一次处理就离开 Triage；
- 每条 Triage item 自动具有 `review_at` / review deadline，语义是“最迟何时必须重新处理”，不是 Issue Due Date；
- review deadline 到期不自动删除，但必须进入显著 attention / overdue 状态；
- 不能无操作地无限延期；延长 `review_at` 必须进入一次显式 Review，并发生有意义的处理；
- 合法处理包括：编辑/强化内容后重新安排下一次 Review、转换为 Issue、转换为 Project、沉淀/链接为有价值的普通 Markdown 内容，或 Discard；
- 系统只要求“显式处理 + 必要的数据变化”，不试图用 AI 或规则判断用户这次编辑是否“足够有价值”。

Triage 与 Backlog 的区别保持不变：

- Triage：尚未成熟到值得作为正式工作追踪；
- Backlog：已经确认值得追踪，只是尚未承诺近期执行。

Triage 的 Review / Snooze 只表示“什么时候再次处理这条未成熟内容”，与 Due、Cycle、Reminder 分离。

### 7.2 Personal Focus / My Issues — Adapt

保留 Linear My Issues 的 curated focus 思想，但删除 `Assignee = me` 等协作语义。

它不是“所有 Issue”的简单列表，而是系统按 attention value 组织的个人执行入口。

候选 attention ordering：

1. Urgent；
2. In Progress；
3. Due Soon；
4. Current Cycle / Todo；
5. Other Active；
6. Backlog（可折叠或后置）。

最终显示名称暂不冻结；底层语义与 UI alias 解耦。

### 7.3 Inbox — Defer, concept retained

Inbox 作为正式概念保留，但首期可以不实现。

未来职责：统一承载提醒、外部集成事件、后台任务结果或其他 notification-like 信息。

Inbox 与 Triage 严格分工：

- Triage 处理“新工作如何进入 workflow”；
- Inbox 处理“系统有哪些新事件值得我注意”。

## 8. View / Query / Navigation 模型

### 8.1 Filter — Adopt

Filter 是临时查询，只决定当前显示哪些对象，不拥有数据，也不改变底层实体。

支持按 Status、Priority、Project、Cycle、Labels、Due 等组合条件过滤。

### 8.2 Advanced Filter — Adopt, progressively disclosed

底层保留嵌套 AND / OR 表达能力，但普通 UI 不要求一开始暴露复杂 Query Builder。

### 8.3 View — Adopt

Custom View 是 **saved query + presentation**，而不是新的工作容器。

一个 View 至少包含：

- Scope；
- Filters；
- Layout（Board / List）；
- Grouping；
- Sub-grouping；
- Ordering；
- Display Properties。

删除 View 不删除任何 Issue / Project。

### 8.4 Board / List — Adopt

Board 和 List 是同一底层数据的不同 Layout，不是两个业务系统。

Grouping 可以基于 Status、Project、Priority、Cycle、Label 等属性。

Board 中跨 Group 拖动意味着修改目标属性，例如：

- Group by Status：拖栏 = Set Status；
- Group by Priority：拖栏 = Set Priority。

### 8.5 Grouping / Sub-grouping — Adopt

Board 的 Sub-grouping 可形成 swimlane；List 可以通过层级 grouping 组织同一批数据。

### 8.6 Display Properties — Adopt

Entity 拥有完整属性，Card / Row 只根据当前 View 决定显示哪些属性。

数据模型与 presentation model 分离。

### 8.7 Favorites — Adopt

Favorites 是用户构建的导航层，可以统一收藏不同类型入口：

- Cycle；
- Project；
- Initiative；
- Custom View；
- 重要 Issue。

Favorite 的核心语义只是“我经常去这里”，不要求对象类型一致。

## 9. Project / Initiative 产品体验

### 9.1 Project Overview — Adopt

Project Overview 是 Project 上下文和高层状态中心，与 Issue 执行区分开。

候选内容：

- Summary / Description；
- Status / Priority；
- Initiative；
- Dates；
- Project Labels；
- Related Documents / Resources；
- Milestones；
- Progress；
- Derived Health。

### 9.2 Project Status — Adopt

Project Status 与 Issue completion 独立。

即使所有 Issue 都完成，Project 也不自动强制进入 Completed；最终 Outcome 是否完成仍由 Project 生命周期语义决定。

### 9.3 Progress — Adopt, derived

Progress 不允许用户直接维护一个主观百分比作为正式事实。

优先由：

- Issue completion；
- Milestone completion；
- 可选 Estimate totals；

等已有工作事实派生。

### 9.4 Health — Adapt to derived health

不采用 Linear 的人工 Project Health / 定期 Update 模式。

Health 是系统派生信号，候选状态：

- On Track；
- At Risk；
- Off Track；
- Unknown / Insufficient Data。

候选信号：

- Project 实际/已用时间与同类型历史 Project 时长分布对比；
- Target Date 与当前 Progress / 时间进度对比；
- Milestone 是否明显晚于目标；
- Issue overdue；
- 多次 Cycle rollover；
- 其他可解释的执行历史统计。

统计基准不应只依赖简单平均数；正式 Analytics 设计时应优先考虑中位数、分位区间、样本量等稳健信息。

Health 必须尽可能解释“为什么”，而不是只显示不可解释的红黄绿灯。

没有足够事实或历史样本时显示 Unknown，而不是强行推断。

### 9.5 Project Updates — Reject

不实现独立 Project Update 实体或周报式人工维护机制。

需要历史时依赖有明确分析价值的持久化历史事实；需要状态摘要时优先由 Analytics / Derived Health 自动生成。

### 9.6 Timeline — Adapt / design later

Timeline 保留为候选高层展示能力，但不要求用户额外维护一套 Timeline 数据。

优先利用已经存在的：

- Project Start / Target Date；
- Initiative relationship；
- Milestone dates；
- Project Status；
- 实际开始/完成时间；
- 可解释的派生 Forecast。

最终可能区分 Planned / Actual / Forecast。具体 UI 与预测方式留到详细产品设计阶段。

当前不引入 Project dependency lines。

## 10. Interaction System

以下能力作为同一套 Interaction System，而不是独立页面 feature。

### 10.1 Focus / Highlight — Adopt

Focus 表示当前键盘或快捷操作目标，不等于 Selection，也不等于 Open。

### 10.2 Peek — Adopt, improve discoverability

Peek 表示快速查看对象详情但不离开当前上下文。

保留键盘快速入口，同时应给鼠标用户足够可发现的 affordance，不故意做成隐藏功能。

### 10.3 Selection / Multi-selection — Adopt

单选与多选共享统一 Selection Model，Selection 是 Action 的 target。

### 10.4 Bulk Actions — Adopt

单对象和多对象操作共用同一个 Action Model，不实现独立 Batch Edit 产品。

### 10.5 Context Menu — Adopt

Context Menu 是鼠标用户的就地操作入口，只显示当前对象 / Selection 可执行的 contextual actions。

### 10.6 Command Menu — Adopt

Command Menu 同时承担：

- Navigation；
- Object Search / Quick Open；
- Action Search；
- 对当前 Selection 执行 contextual actions。

### 10.7 Keyboard Shortcuts — Adopt

快捷键是高频操作的最快路径，但不应成为功能唯一入口。

### 10.8 Search — Adopt

区分三种 intent：

- Global Search：跨实体寻找内容；
- Find in View：临时缩小当前 View 结果；
- Quick Open：快速导航到已知对象。

### 10.9 Undo / Recovery — Adopt as foundation

高频 mutation 应优先支持：

`Fast Action + Immediate Feedback + Undo / Recovery`

不应为了安全给所有可逆操作都加确认框。

不可逆或高风险 destructive action 才需要更强确认 / recovery policy。

文本编辑另行需要 draft protection / version recovery。

## 11. Reuse、Automation 与扩展能力

### 11.1 Issue Templates — Adopt

Template 是创建起点，不是新的实体类型。可以预填 Description 与常用 properties。

### 11.2 Project Templates — Adopt

允许重复类型的 Project 预置 Description、Milestones、Issue skeleton 等。

Template 后续变更不应神秘修改已经实例化的 Project。

### 11.3 Recurring Issues — Adopt

Recurring Rule 到期后创建正常 Issue，之后完全遵循普通 Issue workflow。

不创建特殊 `RecurringTask` 类型。

### 11.4 Reminder — Adopt concept

Reminder 表达“什么时候重新提醒我注意这件 Issue”。

与其他时间语义区分：

- Cycle = 计划在哪个 timebox 做；
- Due = 最迟什么时候完成；
- Reminder = 什么时候提醒；
- Triage Snooze = 什么时候重新决定怎么处理。

### 11.5 Documents / Resources — Adapt

不复制 Linear 独立的 Documents 数据/编辑系统。Obsidian Vault 中的普通 Markdown 文档继续作为普通文档存在，并使用 Obsidian 原生编辑器查看和编辑。

Trail 实体只需要轻量文本输入与结构化 Action；复杂内容（长文、表格、图片、研究笔记、设计文档等）应放在独立 Markdown 文档中。

最常见的关联方式是普通文档主动写入指向 Trail 实体的 `[[wiki link]]`，例如文档中引用 `[[Project A]]`：

- Obsidian 继续把它作为普通 link / backlink 关系；
- Trail 基于 Obsidian 的 resolved-link / backlink 信息，在 Project / Initiative / Issue 等 Entity 页面自动聚合 Related Documents；
- 用户从 Trail 点击后直接跳转到该普通 Markdown 文档，并交由 Obsidian 原生 editor 处理；
- 当前不新增独立 Resource Domain Entity，也不要求用户同时维护另一份 Resource relation。

如果未来自动聚合产生明显噪声，再评估 Pin / Curate 等轻量增强；首期不提前增加双重关系维护。

### 11.6 Historical Facts — Adapt; full Activity Log rejected

正式产品当前不建设完整 Activity Log，也不记录每一次普通编辑、拖动或属性修改。

需要长期分析价值的历史事实由 Domain Action 在业务动作发生时确定性写入，例如：

- 首次进入 Started 时记录 `started_at`；
- 进入 Completed 时记录 `completed_at`；
- 必要时记录 `canceled_at`；
- 对明确需要分析的 Cycle participation / rollover、Triage review / refine 等记录对应事实。

`started_at → completed_at` 表示 **elapsed duration / 历时**，不能称为实际耗时或工作时长；用户可能并行处理多个任务、暂停任务，或处理 Trail 未记录的工作。

历史分析在需要时从这些持久化事实计算，不预先持久化 duration、均值、趋势等派生结果。只有未来出现明确产品问题时，才增加新的历史事实或更细的 transition/event 记录。

### 11.7 Analytics / Insights — Adopt

Analytics 是只读派生层：

- **现状分析**直接消费插件内存中的 Runtime Domain Model / Store；
- **历史分析**消费 Domain Action 已持久化的必要历史事实，并在查询/分析时计算结果；
- Analytics 不反过来要求用户维护额外统计字段，也不把派生结果当作 authoritative domain state。

候选内容包括：

- Project elapsed-duration distribution；
- Cycle completion trend；
- Issue completion by priority；
- Estimate distribution；
- Rollover frequency；
- 在有足够事实时计算的 lifecycle / status duration；
- Projects completed by Area / Project Label；
- Derived Health evidence。

### 11.8 Dashboard — Adopt as normal page composition

Dashboard 只是一个首页 / 默认 View composition，不拥有专用业务数据、专用业务逻辑或专用 Widget 体系。

它与 Project、Initiative、My Issues、Current Cycle、Custom View 等页面共享同一套：

- Runtime Domain Data；
- Query / Filter；
- Action Model；
- Page Shell / Layout；
- 可组合 Modules / Widgets；
- Entity Components。

Dashboard 的差异仅在于选择展示哪些内容、如何编排和强调。Dashboard 中可用的 Module / Widget 原则上也可复用于其他页面；其他页面的可组合模块也可以进入 Dashboard。

不新增 Morning Review / Evening Review / Daily Review 等专用页面或 Domain Entity。个人日常节奏优先通过 Linear-style 常用页面与 Custom Views 组合表达。

### 11.9 Explicit Automation Rules — Adopt selectively

优先实现明确、可解释、可关闭的产品规则，例如：

- Cycle ended → unfinished Issue rollover；
- Recurring schedule reached → create normal Issue；
- Reminder reached → create Inbox notification；
- authoritative facts changed → recompute derived analytics / health。

当前不做通用 IF/THEN Automation Builder。

### 11.10 Integrations / API — Defer

保留外部集成和 API 的扩展边界，但不进入首期核心产品模型。

### 11.11 AI / Agents — Defer

AI / Agent 不作为当前核心 Product Model 驱动力。

未来 Agent 应消费成熟的 Entity / Action / Permission 模型，而不是反过来决定核心 Domain。

## 12. 明确偏离 Linear 的地方

当前个人版 baseline 的主要偏离：

| Linear 能力 | Trail Personal Baseline |
| --- | --- |
| Team | Reject；个人 Workspace 统一 workflow |
| Assignee / collaboration ownership | Reject |
| Team-scoped workflow / Cycle | Adapt 为 Workspace 级 |
| Initiative | Adopt |
| Project | Adopt |
| Milestone | Adopt，可选 |
| Issue / Sub-issue | Adopt |
| Project Dependency | Reject for now |
| Issue Relations | Defer |
| Estimate capacity planning | Reject；Estimate 只用于统计/观察 |
| My Issues | Adapt 为 curated personal focus |
| Triage | Adapt 为可持续 refine、带强制 review deadline 的个人 intake / incubation |
| Inbox | Defer，但正式概念保留 |
| Project Health manual updates | Reject；改为 Derived Health |
| Project Updates | Reject |
| Full product Activity Log | Reject；只持久化有分析价值的 Action-side historical facts |
| Timeline | Adapt；零额外维护原则 |
| Documents | Adapt；普通 Markdown + Obsidian links/backlinks 自动形成 Related Documents |
| Collaboration notifications / subscriptions | Reject / future Inbox extension |
| General automation builder | Defer |
| Agent workflows | Defer |

## 13. Deferred Design Inputs

以下内容已经确认值得进入后续 UI / Interaction / Technical Design；它们不改变已经收口的 Product Domain 语义。

### 13.1 UI Design System Reference

**Reference:** `VoltAgent/awesome-design-md`, Linear `DESIGN.md`。

**Use in:** UI Design / Trail Design System。

**Distilled principles:**

- 可作为视觉语言、Design Token、组件状态和布局原则的参考起点；
- 不视为 Linear 官方 Design System；
- 不直接照搬 Linear 品牌资产、专有字体或 marketing-site 风格；
- Trail Design System 应结合 Obsidian 宿主主题与原生 CSS variables 建立自己的 token mapping；
- 后续仍要以真实产品交互需求和 Obsidian host constraints 校准。

**Status:** Deferred to UI Design。

### 13.2 Local Materialized State / Sync Model

**Reference:** Linear 的 local client database / sync engine 思路。

**Use in:** Technical Design — Data Interaction Architecture。

**Distilled principles:**

- UI read path 优先消费本地 materialized Runtime Store / index，不在 render/read path 直接进行 Vault I/O；
- 结构化 mutation 可以 optimistic update UI；
- authoritative mutation 进入串行 mutation pipeline；
- 持久化到 Vault 后 reparse / verify / reconcile；
- 外部 Vault changes 通过 file events 回到同一 reconciliation path；
- Vault 仍是 durable source of truth；
- Runtime Store 是可重建派生状态；
- 只有启动性能或 Vault 规模出现真实瓶颈后，才评估 persistent client cache / database，并保持其可重建、非 authoritative。

**Status:** Input to Technical Design / LLD。

### 13.3 Pointer Grace / Safe Triangle

**Reference:** Linear contextual submenu 的 safe-triangle / pointer-grace pattern。

**Use in:** Interaction Design / UI primitive selection。

**Distilled principles:**

- Nested menu 应容忍从父菜单项斜向移动到 submenu 的自然鼠标轨迹；
- 使用 pointer grace / safe polygon 等成熟模式避免 submenu 意外关闭；
- 更一般地关注 hover delay、popover pointer tolerance、drag hysteresis 等 interaction tolerance；
- 选择 UI primitive / component library 时优先检查已有成熟实现，不默认自行造轮子。

**Status:** Input to Interaction Design。

### 13.4 Obsidian Pane Adaptive Layout

**Use in:** UI / Interaction Design。

**Distilled principles:**

- Trail 运行在可任意分栏的 Obsidian Workspace 中，响应式判断优先基于实际 pane / container width，而不是只看应用窗口宽度；
- 不为窄 pane 复制另一套业务页面；同一 View / Module 根据可用空间采用 Expanded / Compact / Minimal presentation；
- 优先使用 progressive disclosure、density change、layout switching 与必要的局部滚动；
- Board 在过窄容器中不强行压缩所有列，可切换/降级到更适合当前宽度的 presentation；
- 该约束只影响 presentation，不改变 Runtime Domain Model、Query、Action 或页面业务语义。

**Status:** Input to UI / Interaction Design。

### 13.5 Development Diagnostic Activity Log

**Use in:** Development / real Obsidian regression testing。

**Distilled principles:**

- 开发/测试阶段允许通过显式开发开关启用临时 Diagnostic Activity Log；
- 日志用于记录用户操作、Domain Action、关键 Runtime State diff、Mutation / Vault write / Reparse / Reconcile / rollback 结果和错误，帮助还原真实实操过程；
- 优先记录结构化 ID、状态和关键 diff，不无必要 dump 完整 Markdown 或敏感内容；
- 该日志不是正式 Product History / Activity Domain，不作为 Analytics 数据源，也不改变 authoritative business state；
- 生产默认关闭，开发与实机测试完成后关闭或移除持久日志输出。

**Status:** Development / Testing facility only。

## 14. Stage 2 收口与下一阶段

Stage 1 已确认成熟 Linear 原语在个人版中的 Adopt / Adapt / Defer / Reject；Stage 2 已完成 Trail-specific review。当前不再为了“Trail 特有”而新增概念，已有 View / Filter / Group / Layout / Action 能表达的需求优先继续复用这些 primitives。

Stage 2 形成的主要结论：

1. **Obsidian / Markdown 是 Trail 的持久化宿主，不是另一套并行文档系统。** Trail 不复制 Linear 独立 Documents 系统；复杂内容继续作为普通 Markdown，通过 Obsidian links/backlinks 与 Trail Entity 形成上下文关系。
2. **Runtime Domain Model 与物理持久化格式解耦。** 插件把受管 Markdown 解析/规范化为统一 Runtime Domain Model / Store；Board、List、Project、Initiative、My Issues、Custom View、Dashboard 等 UI 只消费运行时数据。不同持久化方案只影响 Parser / Writer、mutation 粒度、冲突范围、I/O、可寻址性、Git diff / recovery 等数据层特性。
3. **优先复用 Obsidian / Markdown 原生物理表达。** Tag、frontmatter、link、block、checkbox、HTML marker 等都只是候选 serialization mechanisms；相同底层格式可以由 Obsidian 与 Trail 按不同语义解释，不因 Domain 语义不同就必然重复造 metadata。
4. **Triage 扩展为个人内容孵化机制。** Quick Capture 直接进入 Triage；未成熟内容可以跨多轮 refine，但受强制 review deadline 约束，最终转为 Issue / Project / 有价值内容或 Discard。
5. **不建设正式完整 Activity Log。** 只由有分析价值的 Domain Action 持久化必要历史事实；当前状态分析直接读 Runtime Store，历史分析按需从历史事实计算。开发/测试阶段的 Diagnostic Activity Log 与正式产品历史严格分离。
6. **Dashboard 和个人 Review 不形成新的业务子系统。** Dashboard 只是共享 Page / Query / Module / Action 能力组成的首页；日常 review 节奏通过常用页面和 Custom Views 表达。
7. **Obsidian pane 宽度只形成 presentation constraint。** 同一业务 View / Module 做 container-adaptive presentation，不复制业务逻辑或 Domain Model。

下一阶段正式进入 **Domain / Data Model Design**。建议顺序：

1. 定义 Canonical Runtime Domain Model：Initiative、Project、Milestone、Issue / Sub-issue、Cycle、Triage、Label / Label Group、View 及其关系和生命周期；
2. 明确 Value Object、稳定 ID、历史事实、Action side effects 与不变量；
3. 定义 Runtime Entity 与 source locator / persistence identity 的边界；
4. 在 Domain Contract 已稳定后，再比较 Markdown 物理表示候选与 Parser / Serializer / Mutation 方案；
5. 随 Domain/Data Model 设计同步校准 `docs/product-domain-hld.md` 与后续 `docs/technical-design.md`，明确哪些 POC-era schema 继续保留、哪些只是验证载体。

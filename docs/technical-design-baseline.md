# Trail Technical Design Baseline

> 状态：Formal Technical Design baseline（第一轮）
> 最后更新：2026-08-12
> 上游 Product：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 上游 Logical Data Model：`docs/logical-data-model.md`
> 上游 Physical Model：`docs/markdown-physical-model.md`
> POC 技术证据：`docs/technical-design.md`

## 1. 文档定位

本文把已经确认的 Product / Domain / Logical / Physical contracts 转换为正式实现架构。

本文不是 POC schema 的延续。旧 `docs/technical-design.md` 继续保留作为可复用技术证据，其中已经验证的 Parser、guarded mutation、cross-file compensation、Runtime Store、Mutation Queue、optimistic UI、file-event reconciliation、Obsidian Modal、BOM compatibility、scale benchmark 等可以被正式实现复用；POC-era Area / Task / Subtask / Fleeting 数据结构不具有权威性。

本轮 Technical Design 只冻结已经讨论清楚的架构边界。具体 React component tree、CSS 数值、library API wiring、虚拟列表阈值、动画参数等后置到 Implementation Design / slice implementation。

## 2. Design Goals

正式实现优先级：

1. **Correctness**：Runtime 只信任已经 parse + validate 的 current data。
2. **Instant interaction**：用户动作立即反映在 UI，不等待 Markdown I/O。
3. **Recoverability**：write / external edit / cross-file partial failure 不默默丢数据。
4. **Simple personal-scale architecture**：为十年个人数据设计，不为企业并发或无限历史过度优化。
5. **Linear-quality UX**：高信息密度、稳定布局、细致状态、键盘友好、拖拽顺滑、Peek 即时。
6. **Markdown-first persistence**：Markdown / `data.json` 是 authoritative persistence，Runtime 可重建。
7. **Modularity without framework inflation**：只抽真正重复的 Runtime / UI primitives，不先造万能 DSL 或页面框架。

## 3. Scale Assumptions

面向约十年个人使用，而不是 Linear 企业规模。

用于设计 / benchmark 的保守 corpus：

```text
Initiatives          < 100
Projects             ~ 2,000
Issues               ~ 20,000–40,000（测试可到 50,000）
Cycles               ~ 260–300
Labels               ~ 200–300
Saved / Custom Views < 10 expected, not a hard limit
Heavy Project        500–1,000 Issues
Projectless container 5,000–10,000 Issues
Large result list    ~ 5,000 Issues
```

核心结论：

- throughput / multi-user concurrency 不是 V1 concern；
- historical growth 主要影响 cold rebuild、内存和全局扫描；
- 日常单次 mutation 成本应主要取决于 affected source / entity，不随十年历史线性增长；
- UI visible item count 受屏幕限制，渲染质量比 query 极限吞吐更重要。

## 4. High-Level Runtime Pipeline

Read path：

```text
Authoritative Persistence
  Vault Markdown + plugin data
        ↓
Source Discovery / Snapshot Reader
        ↓
Physical Parser + Physical Validation
        ↓
Canonical Record Assembly
        ↓
Domain / Reference / Workspace Validation
        ↓
Committed Runtime Store
        ↓
Indexes / Derived Selectors
        ↓
Effective Runtime View
        ↓
React UI
```

Write path：

```text
UI Intent
  ↓
Application Command
  ↓
Domain Mutation Planner
  ↓
Ready / NeedsInput / Rejected
  ↓ Ready
Optimistic Projection ───────→ UI immediately
  │
  └→ Serial Mutation Queue
        ↓
     latest-source read + precondition check
        ↓
     Physical Mutation Plan
        ↓
     guarded write
        ↓
     re-read + parse + validate
        ↓
     Committed Runtime reconciliation
        ↓
     remove pending projection
```

## 5. Committed Runtime + Optimistic Overlay + Local UI State

正式采用三层状态模型：

```text
1. Committed Runtime
   已从 authoritative persistence 重读、parse、validate、reconcile 的可信状态

2. Central Optimistic Overlay
   用户已经确认动作、但持久化尚未最终确认的稀疏 pending effects

3. Local Ephemeral UI State
   drag pointer、hover、selection、modal draft、open/close、resize 等短生命交互
```

UI 读取：

```text
Effective State = Committed Runtime + Ordered Pending Plans
```

Local ephemeral state 不进入 Domain overlay。

### 5.1 Why Not Mix Pending Into Committed

Committed Runtime 必须始终回答：

> 当前已经由 authoritative source 确认的事实是什么？

因此不能在 write 前把 source ownership、status、project relation 等直接“假装提交”。否则失败回滚、external edit conflict、cross-container move source lookup 都会混淆 confirmed 与 intended state。

### 5.2 Central Overlay

Optimistic state 必须是 central，而不是只存在某个 Card local state。

同一个 Issue 如果同时出现在 Project Board、Current Cycle、Home Focus、Peek，所有 View 必须看到同一个 optimistic result。

正常成功路径不显示持续 `Saving...`。只有异常变慢、冲突、失败、partial 等情况才使用 pending/error indicator。

## 6. Domain Mutation Planner

核心原则：

> 用户意图只定义一次业务规则；optimistic projection 和最终 persistence mutation 必须从同一个 Domain Mutation Plan 推导。

概念接口：

```text
plan(planningState, command) -> PlanResult
```

Planner 是纯 Domain logic：

- 不读 / 写 Markdown；
- 不操作 React / DOM；
- 不弹 Toast；
- 不自行调用不确定的 `now` / UUID generator。

Command normalizer 在进入 Planner 前固定：

- command ID
- effective timestamp
- new entity ID（如适用）
- user input

### 6.1 PlanResult

```text
Ready(DomainMutationPlan)
NeedsInput(requiredInput)
Rejected(reason)
```

例如 Completed Issue 要求 Estimate：

```text
CompleteIssue
→ estimate missing
→ NeedsInput(Estimate)
→ user selects value
→ one complete atomic plan
```

不允许 UI 先乐观显示非法 Completed，然后等 writer 报错。

### 6.2 DomainMutationPlan

至少包含：

```text
Preconditions
Effects
Affected Scope
Postconditions
```

Mutation Plan 是“完整合法状态变化”，不是随手 patch 一个字段。

例如 Move Issue A from Project P1 to P2：

```text
Effects:
  projectId: P1 → P2
  milestoneId: old P1 milestone → null / valid P2 milestone
```

Milestone scope rule 只定义一次，不能让 Board / Context Menu / Writer 各自复制业务逻辑。

## 7. Planning State 与 Pending Replay

新 Command 针对 **Effective / Planning State** 规划，而不是只看 committed state。

```text
Planning State
= Committed Runtime
+ ordered pending mutation plans
```

如果用户快速执行：

```text
#1 Status Todo → Doing
#2 Priority Medium → High
```

第二个 Command 应看到第一个 optimistic result。

Pending 数量在个人场景通常为 0–2，因此 V1 采用简单 ordered replay：

- 前一 plan commit → committed advance，移除该 plan，剩余 plans replay。
- 前一 plan fail → 去掉失败 plan，从最新 committed state 重新检查 / replay 后续 plans。
- 后续 plan 若不再合法 → cancel / surface error。

不建立复杂 dependency graph。

## 8. Runtime Store

Committed Runtime 使用 normalized maps，不构建嵌套 mutable tree：

```text
initiativesById
projectsById
milestonesById
issuesById
cyclesById
```

Entity 未变化时尽量保留 object reference；单个 Issue 修改不应重建整个 Workspace snapshot 中所有实体。

### 8.1 Structural / Integrity Indexes

V1 维护少量稳定高价值 indexes：

```text
projectsByInitiativeId
milestonesByProjectId
issuesByProjectId
issuesByMilestoneId
cyclesByIssueId
currentCycleId
refsByLabelId
refsByStatusDefinitionId
labelUsageCount
```

可以按实现需要调整具体 naming / shape，但原则是：

> Index 因稳定关系、referential integrity 或已证明的热点而存在，不因“字段存在”就创建。

V1 不预建：

- issuesByEveryPriorityCombination
- generic due tree
- full-text inverted index
- materialized query engine
- persistent query cache graph

### 8.2 Source Ownership Index

Runtime 必须明确 physical source ownership：

```text
sourceByEntityId
contributionBySourcePath
```

例如：

```text
issue-123 → Trail/Projects/0007 Project A.md
0007 Project A.md → Project A + Milestones + Issues contribution
```

这支持：

- per-source external edit reconcile；
- cross-container mutation source/destination lookup；
- fault isolation；
- 不扫描全 Vault 即可替换一个 source contribution。

## 9. Reconciliation

单个 managed source 变化时：

```text
read latest source
→ parse + validate
→ compare old contribution vs new contribution
→ added / changed / removed / unchanged entities
→ update records + indexes atomically
→ publish one new committed revision
```

未变化 Entity 保持原 object reference。

一次 reconcile 对 UI 不暴露半更新中间态。

Invalid source：

- isolate smallest reliable fault domain；
- 不把 invalid object 混入 trusted graph；
- unrelated valid work 继续工作；
- global prerequisite（例如 corrupt configuration）只阻止依赖它的 mutation/capability。

## 10. Physical Mutation Planner / Executor

Domain Planner 决定“Domain 世界应该变成什么”。

Physical Planner 决定“哪些 Markdown / data.json source 要如何变化”。

```text
DomainMutationPlan
+ Source Ownership Index
+ Physical Schema Registry
→ PersistenceMutationPlan
```

Writer 不包含 Domain business rules。

### 10.1 In-Place Mutation

不改变 physical container 的变化原地写：

- Status
- Priority
- Due
- Estimate
- same-project Milestone
- title / description
- label set

Board drag 只产生 Status in-place mutation。

### 10.2 Cross-Container Move

改变 physical container 的 relation mutation：

- Project A → Project B
- Projectless → Project
- Project → Projectless

Domain 仍然是 **同一个 Issue identity 的 Move**。

Physical execution 使用安全顺序：

```text
1. read + validate source and destination latest snapshots
2. build complete source' / destination'
3. write destination first
4. verify destination
5. remove source record / write source'
6. verify source
7. re-read both + parse + validate
8. reconcile committed runtime
```

选择“目标先写、来源后删”是为了把最坏 failure mode 从 silent data loss 降为 detectable duplicate ID。

### 10.3 Compensation Outcomes

Cross-file physical transaction 不是数据库事务。沿用 POC 已验证的 outcome vocabulary：

```text
unchanged
compensated
partial
```

- destination write 失败 → source untouched → unchanged。
- destination 成功、source delete 失败 → 尝试恢复 destination pre-image → compensated。
- compensation 也失败 → partial；停止猜测，重读真实磁盘状态，清除 optimistic projection，报告 Data Issue。

Duplicate IDs 一律视为 ambiguity，不能 first/last wins。

## 11. Accept / Convert Triage

Accept 与 Move 不同。

```text
Triage Issue A
→ Create NEW Workflow Issue B
→ B persist + validate success
→ Delete A
```

两者 identity 不同。

Physical implementation：

1. 从最新 Triage source 读取 A。
2. 创建 B 的完整 Workflow record；B 有新 ID、Status、createdAt 等合法字段。
3. `due` 不从 Triage 自动继承为 Workflow Due。
4. 把 B 写入目标 Project file 或 Projectless Issues container。
5. re-read + validate B 成功。
6. 再从 `Triage.md` 删除 A。
7. source delete failure 时优先保证 B 和 A 都仍可检测，绝不先删除 A。

Convert to Project / Note 若实现也使用 create-target-before-delete-source。

## 12. Mutation Queue

V1 使用 **global serial Mutation Queue**。

原因：

- 单人、低频，没有吞吐压力；
- Markdown cross-file mutation + reconciliation 更容易证明正确；
- POC 已验证 serial queue 可行；
- 避免同一 source 上并发写导致复杂 lost update。

Queue 不阻止 UI optimistic interaction。

Command technical lifecycle 可用于 diagnostics：

```text
Created
→ Planned
→ Pending
→ Writing
→ Verifying
→ Committed
```

失败：

```text
Planning → NeedsInput / Rejected
Pending/Writing/Verifying → Conflict / Failed / Partial
```

这些状态不进入 Canonical Domain。

## 13. Latest-Source Guard / External Conflict

真正写入前必须重读 affected source 最新 snapshot，并检查 plan preconditions / fingerprint / source identity。

例如用户看到 Doing 并点击 Complete，但外部 Markdown 已改为 Canceled：

```text
expected = Doing
latest = Canceled
→ Conflict
→ no overwrite
→ remove/recompute optimistic projection
→ reconcile latest valid source
```

不因为 UI 先 optimistic 就强制覆盖 external edit。

## 14. View / Data Selection

V1 不实现 generic query language。

架构：

```text
Effective Runtime
→ Page-specific selectors
→ small shared filter/sort/group helpers
→ Entity IDs / grouped IDs
→ React components
```

主要 selectors：

- Home focus / summaries / heatmap
- Projects root / Initiative focus
- Project Issues
- Triage
- Current Cycle / Past Cycle
- Custom View（有限配置）

### 14.1 Candidate Narrowing

能够直接使用 structural index 时先缩小 candidate set，例如：

```text
Project page
→ issuesByProjectId[projectId]
→ filter / sort
```

如果多个 index 可用，简单选择更小 candidate set 即可。V1 不构建 cost-based optimizer。

### 14.2 Result Shape

View selector 优先返回 stable Entity IDs / grouped ID arrays，而不是复制整份 Entity objects。

Entity component 再按 ID 订阅 / 选择有效 Entity。

### 14.3 Ordering

V1 默认：

```text
Backlog:
Priority → createdAt → stable ID

Started / Active:
Priority → firstStartedAt → stable ID
```

不持久化 manual rank。

### 14.4 Grouping

Project Board：

```text
Columns = Status
```

Current Cycle Board：

```text
Columns = Status
Rows / Swimlanes = Project
```

Cycle Project swimlane 是 presentation，不是 Project drag target。

普通 Label 不作为通用 Group；Area 等明确 promoted Single LabelGroup 才可作为 curated grouping dimension。

## 15. Product Page Architecture

### 15.1 Home

固定 V1 composition：

```text
Date / Time
Focus
Current Cycle Summary
Projects / Initiatives Summary
Activity Heatmap
Weekly Note
```

Home 是总览 / routing，不复制 Project/Cycle 完整工作区。

Heatmap 纯派生，可组合多种现有 canonical facts；不建立 Activity/Event Log。

### 15.2 Projects Workspace

一个动态 workspace：

```text
Projects
→ Initiative Focus
→ Project Workspace
```

允许直接 deep-link / search 到 Project。

Project Workspace 直接显示 Issues Board/List；Project description、Milestones、Related Notes 等进入按需 Details / Peek / hover/focus content，不设重型 Overview tab。

### 15.3 Triage

专用 List：

- Quick Capture lightweight input；
- Due-driven ordering；
- Peek；
- Accept / Convert / Delete 等显式 actions。

不做 Board / Timeline / generic group。

### 15.4 Cycles

Root 显示 Current + History。

Current Cycle：

```text
Status columns
× Project swimlanes
```

Add / Remove Cycle membership 使用显式 Action，不使用 drag。

Close & Plan Next 时，当前 Cycle 中所有 unfinished / non-terminal Issues 都作为 **默认勾选** 的候选项进入创建流程，不区分 Started / Unstarted。用户可以取消任意项；只有确认创建后才写入新 Cycle membership，取消整个 flow 则保持没有 Current Cycle。

## 16. Frontend State / React Rendering

当前仓库依赖 React / ReactDOM。正式实现目标是：selection / selector 可以较粗，但 render 要细。

原则：

- normalized Runtime；
- unchanged entities 保留 stable object reference；
- active view selector 返回 IDs；
- IssueCard / IssueRow / ProjectRow / Widget 等自然成为 render boundary；
- 组件尽量只订阅自己需要的 entity / slice；
- local ephemeral state 留在交互组件，不写 Runtime 每帧状态；
- 用 Profiler / benchmark 驱动 memoization，不 blanket `memo/useMemo/useCallback`。

当前领先候选（尚未加入 package，implementation slice 前再次核对）：

- Runtime-to-React：Zustand vanilla + selectors；
- accessible headless primitives：Radix Primitives；
- drag/drop：dnd-kit；
- long-list virtualization：TanStack Virtual；
- command menu：cmdk；
- animation：CSS first，必要时 Motion。

这些是实现候选，不是 Domain contract；若后续技术验证出现更优成熟库，可替换而不改变上层设计。

## 17. Drag / Continuous Interaction

交互分三类：

### 17.1 Continuous

Scroll / drag / resize / hover animation：

- 不每帧写 Runtime / Domain；
- drag pointer、DragOverlay、hovered target 保持 local UI state；
- 只有 drop 后才发出 `ChangeIssueStatus` Command。

### 17.2 Discrete

Complete / Priority / Status / Move / Add Cycle：

- 点击即 optimistic；
- persistence 可在后台完成；
- failure 时 overlay 移除 / replay，显示清晰错误。

### 17.3 Input

Title / description / filter / Weekly Note editor：

- typing 保持 local draft；
- Save / Enter 发一个 mutation；
- 不每按一个键写 Markdown。

## 18. Virtualization

Virtualization 是 reusable rendering capability，不是所有页面默认机制。

优先使用场景：

- large global result list
- large Triage/history
- long List View
- search results

先不强制：

- normal Project Board
- Current Cycle Board
- small Home widgets

Board virtualization 与 DnD / dynamic height 组合更复杂，只有 heavy-board benchmark 证明必要才启用。

## 19. Performance Strategy

V1：

```text
YES  Full in-memory Runtime
YES  Full cold rebuild
YES  Per-source reparse / reconcile
YES  Small structural indexes
YES  Serial Mutation Queue
YES  On-demand active selectors
YES  Simple memoization
YES  Reusable long-list virtualization

NO   IndexedDB persistent runtime cache initially
NO   Web Worker initially
NO   complex query dependency graph
NO   materialized query cache engine
NO   enterprise fine-grained reactive graph for scale alone
NO   concurrent mutation throughput design
```

Cold startup O(N) 可接受。目标是桌面十年 corpus 约 1–2s 理想、2–3s 仍可接受；只有真实 benchmark 明显更差再引入 persistent cache / worker。

Obsidian plugin load 应避免在最早 onload 阶段做不必要重工作；正式实现可在 host layout ready 后初始化 Runtime，并先显示 shell/loading state。

单次日常 mutation 成本应以 affected source 为主，而不是 full workspace scan。

## 20. Design System / Obsidian Shell Theme

Trail 目标是 Linear-quality Trail，而不是把 Linear 风格组件塞进默认 Obsidian 外壳。

```text
Linear product / interaction reference
        ↓
Trail Design System
        ├─ Trail UI
        └─ Obsidian Shell Theme
```

Design System 层级：

```text
Tokens
→ Primitives
→ Entity Components
→ Composite Patterns
→ Page Composition
```

Tokens 至少涵盖：

- color
- spacing
- radius
- typography
- shadow
- motion
- z-index

Obsidian shell 也使用同一 token/theme layer：

- 优先覆盖稳定 Obsidian CSS variables；
- variables 不够时使用 targeted selectors；
- 通过显式 root theme scope/class 控制启用 / 禁用；
- 避免大量脆弱的逐节点 selector；
- Trail 私有使用，不受社区插件发布约束，但仍以维护性为准。

复制 Linear 的是信息密度、状态质量、交互一致性、键盘优先和响应感，不机械复制 exact RGB / radius / width。

## 21. Reusable UI Capabilities

V1 重点复用：

- Button / IconButton
- Input / lightweight editor
- Tooltip / Popover
- Context Menu / Dropdown
- Dialog / Modal
- Property Picker
- Peek
- Command Menu
- IssueCard / IssueRow
- ProjectRow
- LabelChip
- BoardColumn / Swimlane
- optional VirtualList wrapper

Contextual submenu 优先采用成熟 safe-triangle / pointer-grace primitive，避免鼠标斜向移动到 submenu 时误关闭。

Responsive / narrow Obsidian pane 是正式要求：breakpoints、compact density、progressive disclosure、必要时局部横向滚动 / layout switch。

## 22. Weekly Note Utility

Weekly Note 不进入 Runtime Domain Store。

实现为：

```text
WeeklyNoteWidget
WeeklyNoteEditor (reuse lightweight editor/modal)
WeeklyNoteFileService
```

文件：`Trail/Collections/Weekly Update.md`。

Actions：

```text
Edit / Save Current
Archive Current
```

两者都使用最新 snapshot + guarded single-file mutation。

不做：

- automatic Issue/Cycle linking
- generated weekly report
- scheduler / auto archive
- runtime index / query
- dedicated domain model

## 23. Create-time Similarity Guard

Duplicate detection 是创建路径上的可选 soft guard，不是 Runtime relationship。

实现可在 Create Issue / Project 等命令进入最终 create plan 前，使用当前 Runtime 的 title / text / relation signals 查找少量相似候选并提示用户。用户可以忽略提示继续创建。

V1 不保存 duplicate relation、merge history 或长期 duplicate status。若普通 O(N) / scoped search 在个人规模 benchmark 足够快，不为该能力预建复杂 full-text index。

## 24. Diagnostics / Observability

开发与实机测试需要详细技术日志，用于判断：

- command
- plan
- optimistic overlay
- latest-source guard
- write result
- parse/validate
- reconcile
- compensation
- rollback / replay
- error category

这些日志是 observability，不是 Product Activity Log。

实机测试每次必须有明确 protocol：repository / Obsidian starting state、是否 reload、fixture、默认值、console hook、expected end state、cleanup / restore。

## 25. Migration

Runtime 只支持 current physical schema。

未来 schema change：

```text
explicit preflight
→ one-time migration
→ post-validation
→ current runtime only
```

不永久保留多版本 parser branches。

## 26. Testing Strategy

### 26.1 Pure Domain / Planner Tests

Domain Mutation Planner 应尽量纯函数，可脱离 Obsidian 测试：

```text
Given current state
When command
Expect PlanResult / Effects / invariants
```

重点：

- Move Project clears invalid Milestone
- Complete requires Estimate
- Accept creates new identity, not context patch
- Triage due required
- Cycle add/remove does not change Status

### 26.2 Physical Tests

- parse/serialize canonical order
- Triage / Workflow context-conditioned fields
- cross-container destination-first + compensation
- duplicate ID isolation
- external edit conflict
- Weekly Note Current edit / Archive

### 26.3 Runtime Tests

- source contribution reconcile
- stable object reuse for unchanged entities
- indexes update atomically
- pending replay
- cross-view optimistic consistency

### 26.4 UI / Performance Tests

Representative corpus：

- Home
- normal Project ~50 Issues
- heavy Project ~1,000 Issues
- Current Cycle multi-Project board
- 2,000+ result list
- 5,000 search results
- 40k/50k cold rebuild

关注：

- click feedback
- drag smoothness
- rerender scope
- list scroll
- Peek / popover latency
- cold rebuild

## 27. Deferred Decisions

后续 implementation slice 再决定：

- exact Zustand / Radix / dnd-kit / virtualizer API integration
- exact Project Details interaction / width
- exact Home layout / heatmap algorithm
- exact long-list virtualization threshold
- exact animation curves/durations
- exact CSS token values
- exact Custom View filter operator list
- exact terminal-status ordering presentation
- exact notification delivery policy

这些不能反向改变已冻结的 Product / Domain behavior。

## 28. Formal Technical Design Summary

V1 核心实现形态：

```text
Markdown + data.json
→ Parse / Validate
→ Normalized Committed Runtime + structural/source indexes
→ Ordered Pending Mutation Plans / Optimistic Overlay
→ Page-specific selectors
→ React + Trail Design System

User action
→ Application Command
→ Pure Domain Mutation Planner
→ Optimistic Projection
→ Serial Mutation Queue
→ Latest-source guarded Physical Mutation
→ Re-read / Validate
→ Runtime Reconcile
```

核心取舍：

- correctness boundary 清楚，但 optimistic UX 即时；
- personal scale 下保持简单 O(N) / structural-index strategy；
- Cross-container physical move 目标先写、来源后删，允许 detectable duplicate 优先于 silent data loss；
- 页面以 Linear 成熟 View 为 baseline 做 Trail delta；
- 不先造 Query DSL / Activity Log / enterprise cache machinery；
- 复用同一 Runtime、UI primitives 和 Markdown mutation infrastructure，避免每个页面建立独立业务栈。

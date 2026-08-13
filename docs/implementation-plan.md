# Trail V1 Implementation Plan

> 状态：当前 Implementation Plan baseline
> 最后更新：2026-08-13
> 上游 Product：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 上游 Logical Data Model：`docs/logical-data-model.md`
> 上游 Physical Model：`docs/markdown-physical-model.md`
> 上游 Technical Design：`docs/technical-design-baseline.md`
> 当前阶段：Intake → Workflow

## 1. 文档定位

本文记录 Trail V1 从正式设计进入正式实现后的总体路线、当前近期计划和阶段 checkpoint。

本文是项目实现进度的单一权威来源：当前阶段、近期 Slice 和 Implementation Checkpoints 只在本文维护。README 只做入口摘要；已经收口的 Product / Domain / Logical / Physical / Technical Design 文档只记录各自的 contract 与 authority boundary，不重复维护项目进度。

本文不是逐任务 backlog，也不提前冻结全部未来 Session。距离当前越近的实现范围越具体；中远期只保留稳定的能力顺序和用户价值边界，并根据已经完成的正式实现继续展开。

正式实现以 Product / Canonical Domain / Logical / Physical / Technical Design 为约束。POC 只作为技术证据：已经验证的方法可以继续采用，但正式实现仍需结合当前架构与 Implementation Selection Policy 重新判断是否保留、重构或替换。

## 2. V1 Implementation Roadmap

| 阶段 | 目标 | 状态 |
|---|---|---|
| Formal Design | Product、Domain、Logical、Physical 与 Technical Design 收口 | 已完成 |
| Formal Intake | 建立正式运行主链，打通 Quick Capture → Triage，并完善基本 Triage 管理 | 已完成 |
| Workflow | 建立 Project / Workflow Issue 的基本执行闭环 | 已完成 |
| Intake → Workflow | Triage Accept / Convert 接入正式 Workflow | 当前 |
| Project Organization | Board / List、Move、Milestone、Initiative 等项目组织能力 | 待开始 |
| Cycles & Views | Cycle、Filter、Custom View、Search、Favorites 等组织与查看能力 | 待开始 |
| Home & Utilities | Home、Weekly Note 与全局入口 | 待开始 |
| V1 Hardening | 响应式、性能、恢复、诊断、整体回归与 V1 收口 | 待开始 |

以上阶段表达 V1 的总体建设顺序，不等同于固定 Session 数量。独立能力可以在依赖满足后调整顺序；具体 Slice 只在进入近期计划后展开。

## 3. 当前阶段：Intake → Workflow

Formal Intake 已经形成完整且经过真实 Obsidian 验证的稳定入口链路：

```text
Workspace initialization
→ Quick Capture
→ Triage Issue
→ Triage List
→ Edit / Defer / Delete
→ authoritative Markdown
→ reload / external change 后正确恢复
```

Workflow Entry 现在也已经形成经过自动化与真实 Obsidian 验证的最小执行闭环：

```text
Create Project
→ Project Markdown
→ Create Workflow Issue
→ Backlog / Started / Completed / reopen lifecycle
→ Completed Estimate gate
→ authoritative Markdown
→ reload / external change 后正确恢复
```

Project 创建使用 Project `Unstarted` category 的 configured default；Fresh Workspace 下显示为 `Planned`。Workflow Issue 创建使用 Issue `Backlog` configured default。Issue 第一次进入 Started 写入 `firstStartedAt`；进入 Completed / Canceled 写入 `terminalAt`；reopen 清除当前 `terminalAt` 但保留首次开始时间。Completed 缺少 Estimate 时 Planner 返回 `NeedsInput`，不会先制造非法 optimistic state 或写入无效 Markdown。

Workflow Runtime 与 Triage 继续共享正式的 committed + ordered optimistic state、global serial mutation queue、latest-source guard、`Vault.process()`、authoritative reread / validation 和 reconcile 机制。Project / Workflow Issue source 采用 source-scoped fault isolation；外部 Project / Issue Markdown 修改可以通过 host event 触发 reread / parse / reconcile，而不需要 reload。

Development Diagnostics 继续作为 development-only observability 基础设施，已在 Workflow Entry 实机验证中用于重建 Project / Issue mutation、Estimate gate、reload reconstruction 和 external reconcile；production build 仍默认排除 Diagnostics。

Workflow 基本执行闭环至此完成。当前进入 Intake → Workflow 阶段；下一步是 Triage Accept，使已经稳定的 Intake 入口真正进入已经可见、可操作的 Workflow。

### 3.1 近期计划

| Slice | 目标 | 状态 |
|---|---|---|
| Formal Triage Intake | Initialize Trail；Quick Capture 创建正式 Triage Issue；列表即时可见；持久化、reload 与外部变化后正确恢复 | 已完成 |
| Development Diagnostics | 为后续真实 Obsidian 操作建立 session-scoped structured trace；不进入 Domain / Product Activity history | 已完成 |
| Triage Management | 编辑 Triage title / Due，defer 与 delete；验证正式 mutation 主链继续复用 | 已完成 |
| Workflow Entry | 创建 Project / Workflow Issue；完成基本 Issue lifecycle、Estimate gate、reload 与外部 reconcile | 已完成 |
| Triage Accept | 将 Triage Issue 显式接受为新的 Workflow Issue，并接入正式跨容器 mutation | 下一步 |

当前稳定 checkpoint：

- [x] **Gate A — Formal foundation**：固化 POC baseline archive；完成 Zustand / Markdown parser focused validation；建立 Formal Configuration、Workspace safety classification/bootstrap 与 Obsidian host boundary。
- [x] **Gate B — Formal Triage vertical path**：建立正式 Triage model/parser、Quick Capture command/planner、Zustand committed + optimistic runtime、serial mutation、`Vault.process()` persistence/reconciliation，并完成 active POC → Formal cutover。
- [x] **Real Obsidian Intake validation**：验证 Fresh bootstrap、Quick Capture persistence/reload、合法外部修改 reconcile、非法 source last-known-good 隔离与恢复、required singleton 缺失保护。
- [x] **Development Diagnostics**：建立 development-only session trace，覆盖 command / optimistic / queue / persistence / validation / reconcile；验证跨 session 保留、实体/字段 diff、两 session retention 与 production build 排除。
- [x] **Triage Management**：验证 title / Due 编辑、七个日历日 defer、delete、optimistic mutation、外部修改 reconcile、stale edit 拒绝覆盖以及 production build 边界。
- [x] **Workflow Entry**：验证 Project / Workflow Issue 创建、configured defaults、Started / terminal lifecycle 时间、Completed Estimate gate、optimistic mutation、reload reconstruction、Project / Issue external reconcile 与 source-scoped fault isolation。

下一步进入 Triage Accept。其核心不是简单“移动 Markdown block”，而是按 Canonical Domain contract 创建新的 Workflow Issue identity，并在跨容器 mutation 成功后移除原 Triage Issue；目标 Project、status default、optimistic projection、跨文件 failure/compensation 和 authoritative reconcile 必须继续服从正式 mutation 主链。

Convert to Project / Convert to Note 等其他 Intake → Workflow / knowledge actions 不强行并入 Triage Accept 第一小步；根据 Triage Accept 的正式跨容器实现结果再展开。

### 3.2 Formal Cutover

Formal active path 已完成 implementation authority cutover：

- `plugin/src/` 与正式 `styles.css` 只承载 Formal Implementation；
- 根目录 `Trail/` 是 Formal plugin 在真实 Vault 中创建和维护的 authoritative Domain Markdown，本地开发环境通过 root-only Git ignore 排除，不再作为 checked-in fixture；
- POC implementation、tests、fixtures 与样式保存在 `archive/poc/`，并退出 active build / runtime / lint / test path；POC 设计与技术证据文档继续按既定位置保留；
- 不长期维护 Formal / POC 双实现，也不要求 Formal schema 兼容 POC persistence；
- POC 中验证过的技术能力可以重新采用，但必须按当前 Formal architecture 实现，而不是继续扩展旧 POC 业务结构。

## 4. 实施原则

- **纵向用户价值优先**：Slice 应从用户操作穿过正式 Domain、Runtime、Persistence 和 UI，而不是按 Parser / Store / UI 分层独立开发。
- **Formal Design 权威**：实现不能由现有 POC schema 或代码结构反向定义正式模型。
- **POC evidence, not inheritance**：POC 证明过的技术是证据而不是默认实现优先级；通用能力仍按 `Obsidian / host / browser → mature focused library → thin Trail adapter → justified custom implementation` 的顺序评估。
- **近期具体、远期粗粒度**：只展开即将实施的 Slice；远期 roadmap 保留调整空间。
- **正式验证重新建立**：POC 测试不能替代 Formal tests；每条正式路径都需要自动化验证与必要的真实 Obsidian 回归。
- **实机回归按独立风险取样**：真实 Obsidian 回归优先覆盖独立 code path、host integration 与 failure mode；同一实现链已经有代表性实机证据后，不按字段或按钮机械重复相同测试，除非新的操作引入不同风险。
- **Checkpoint 后再推进**：一个 Slice 只有在实现、验证、文档校准、commit / push 和远端回查完成后才视为完成。

## 5. Implementation Checkpoints

| Checkpoint | 状态 | 结果 |
|---|---|---|
| POC Exit | 已完成 | 核心技术路线已获得足够可行性证据 |
| Product Design | 已完成 | Formal Product baseline 已收口 |
| Canonical Domain | 已完成 | Canonical Domain 已收口 |
| Logical Data Model | 已完成 | Logical model 已收口 |
| Markdown Physical Model | 已完成 | Formal persistence model 已收口 |
| Technical Design | 已完成 | Formal implementation architecture baseline 已收口 |
| Implementation Plan | 已形成 | V1 总路线与近期计划建立 |
| Formal Triage Intake | 已完成 | Formal foundation、Triage vertical path、active cutover 与真实 Obsidian 验证已完成 |
| Development Diagnostics | 已完成 | development-only structured trace 已完成并通过真实 Obsidian 与 production boundary 验证 |
| Triage Management | 已完成 | title / Due 编辑、defer、delete 与 stale-edit protection 已通过自动化和真实 Obsidian 验证 |
| Formal Intake | 已完成 | Formal Triage Intake、Development Diagnostics 与 Triage Management 形成稳定入口链路 |
| Workflow Entry | 已完成 | Project / Workflow Issue 最小执行闭环、Estimate gate、reload 与 external reconcile 已通过自动化和真实 Obsidian 验证 |
| Formal Workflow | 已完成 | Project / Workflow Issue 已经可见、可创建、可执行并能从 Markdown 重建 |
| Intake → Workflow | 当前 | 下一步 Triage Accept |
| V1 Exit | 待开始 | — |

Checkpoint 只记录真正形成稳定阶段边界的结果，不追踪每个内部实现任务。完成一个阶段后更新本表，并展开下一阶段的近期计划。

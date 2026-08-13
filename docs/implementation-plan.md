# Trail V1 Implementation Plan

> 状态：当前 Implementation Plan baseline
> 最后更新：2026-08-13
> 上游 Product：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 上游 Logical Data Model：`docs/logical-data-model.md`
> 上游 Physical Model：`docs/markdown-physical-model.md`
> 上游 Technical Design：`docs/technical-design-baseline.md`
> 当前阶段：Formal Intake

## 1. 文档定位

本文记录 Trail V1 从正式设计进入正式实现后的总体路线、当前近期计划和阶段 checkpoint。

本文是项目实现进度的单一权威来源：当前阶段、近期 Slice 和 Implementation Checkpoints 只在本文维护。README 只做入口摘要；已经收口的 Product / Domain / Logical / Physical / Technical Design 文档只记录各自的 contract 与 authority boundary，不重复维护项目进度。

本文不是逐任务 backlog，也不提前冻结全部未来 Session。距离当前越近的实现范围越具体；中远期只保留稳定的能力顺序和用户价值边界，并根据已经完成的正式实现继续展开。

正式实现以 Product / Canonical Domain / Logical / Physical / Technical Design 为约束。POC 只作为技术证据：已经验证的方法可以继续采用，但正式实现仍需结合当前架构与 Implementation Selection Policy 重新判断是否保留、重构或替换。

## 2. V1 Implementation Roadmap

| 阶段 | 目标 | 状态 |
|---|---|---|
| Formal Design | Product、Domain、Logical、Physical 与 Technical Design 收口 | 已完成 |
| Formal Intake | 建立正式运行主链，打通 Quick Capture → Triage，并完善基本 Triage 管理 | 当前 |
| Workflow | 建立 Project / Workflow Issue 的基本执行闭环 | 待开始 |
| Intake → Workflow | Triage Accept / Convert 接入正式 Workflow | 待开始 |
| Project Organization | Board / List、Move、Milestone、Initiative 等项目组织能力 | 待开始 |
| Cycles & Views | Cycle、Filter、Custom View、Search、Favorites 等组织与查看能力 | 待开始 |
| Home & Utilities | Home、Weekly Note 与全局入口 | 待开始 |
| V1 Hardening | 响应式、性能、恢复、诊断、整体回归与 V1 收口 | 待开始 |

以上阶段表达 V1 的总体建设顺序，不等同于固定 Session 数量。独立能力可以在依赖满足后调整顺序；具体 Slice 只在进入近期计划后展开。

## 3. 当前阶段：Formal Intake

Formal Intake 的第一条正式纵向链路已经打通：

```text
Workspace initialization
→ Quick Capture
→ Triage Issue
→ Triage List
→ authoritative Markdown
→ reload / external change 后正确恢复
```

active runtime 已完成 POC validation shell → Formal Triage cutover。POC 中已经验证的 Parser、guarded mutation、Mutation Queue、optimistic UI、Vault event reconciliation 等继续作为技术证据，但正式实现按当前架构和 reuse-before-build policy 重新选择实现方案；不继承 POC-era Area / Task / Fleeting Note schema，也不建立 POC → Formal migration compatibility。

Development Diagnostics 已作为独立的开发/实机测试 observability 基础设施补齐，并通过真实 Obsidian 验证。它只记录结构化生命周期、实体/字段级 reconcile diff 和必要诊断元数据，不进入 Canonical Domain、Event Sourcing 或 Product Activity history；production build 默认关闭。

### 3.1 近期计划

| Slice | 目标 | 状态 |
|---|---|---|
| Formal Triage Intake | Initialize Trail；Quick Capture 创建正式 Triage Issue；列表即时可见；持久化、reload 与外部变化后正确恢复 | 已完成 |
| Development Diagnostics | 为后续真实 Obsidian 操作建立 session-scoped structured trace；不进入 Domain / Product Activity history | 已完成 |
| Triage Management | 编辑 Triage title / Due，defer 与 delete；验证正式 mutation 主链继续复用 | 下一步 |
| Workflow Entry | 建立 Project / Workflow Issue 的最小可用执行闭环 | 待开始 |

Formal Intake 当前稳定 checkpoint：

- [x] **Gate A — Formal foundation**：固化 POC baseline archive；完成 Zustand / Markdown parser focused validation；建立 Formal Configuration、Workspace safety classification/bootstrap 与 Obsidian host boundary。
- [x] **Gate B — Formal Triage vertical path**：建立正式 Triage model/parser、Quick Capture command/planner、Zustand committed + optimistic runtime、serial mutation、`Vault.process()` persistence/reconciliation，并完成 active POC → Formal cutover。
- [x] **Real Obsidian validation**：验证 Fresh bootstrap、Quick Capture persistence/reload、合法外部修改 reconcile、非法 source last-known-good 隔离与恢复、required singleton 缺失保护。
- [x] **Development Diagnostics**：建立 development-only session trace，覆盖 command / optimistic / queue / persistence / validation / reconcile；验证跨 session 保留、实体/字段 diff、两 session retention 与 production build 排除。

下一步进入 Triage Management，继续在同一正式 mutation 主链上补齐 title / Due 编辑、defer 与 delete，并用现有 Diagnostics 辅助真实 Obsidian 回归。

`Workflow Entry` 的具体边界在 Triage Management 完成后根据实际实现规模重新评估，不提前固定 Board、DnD、Peek、Priority 或 Milestone 是否属于同一 Slice。

Triage Accept 后置到 Workflow 已经可见、可操作之后，使 Intake → Workflow 成为完整用户路径，而不是只完成一次跨容器持久化操作。

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
| Implementation Plan | 已形成 | V1 总路线与 Formal Intake 近期计划建立 |
| Formal Triage Intake | 已完成 | Formal foundation、Triage vertical path、active cutover 与真实 Obsidian 验证已完成 |
| Development Diagnostics | 已完成 | development-only structured trace 已完成并通过真实 Obsidian 与 production boundary 验证 |
| Formal Intake | 当前 | 下一步 Triage Management |
| Formal Workflow | 待开始 | — |
| V1 Exit | 待开始 | — |

Checkpoint 只记录真正形成稳定阶段边界的结果，不追踪每个内部实现任务。完成一个阶段后更新本表，并展开下一阶段的近期计划。
# Trail V1 Implementation Plan

> 状态：当前 Implementation Plan baseline
> 最后更新：2026-08-12
> 上游 Product：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 上游 Logical Data Model：`docs/logical-data-model.md`
> 上游 Physical Model：`docs/markdown-physical-model.md`
> 上游 Technical Design：`docs/technical-design-baseline.md`
> 当前阶段：Formal Intake

## 1. 文档定位

本文记录 Trail V1 从正式设计进入正式实现后的总体路线、当前近期计划和阶段 checkpoint。

本文不是逐任务 backlog，也不提前冻结全部未来 Session。距离当前越近的实现范围越具体；中远期只保留稳定的能力顺序和用户价值边界，并根据已经完成的正式实现继续展开。

正式实现以 Product / Canonical Domain / Logical / Physical / Technical Design 为约束。POC 只作为技术证据：已经验证的方法可以继续采用，但正式实现仍需结合当前架构重新判断是否保留、重构或替换。

## 2. V1 Implementation Roadmap

| 阶段 | 目标 | 状态 |
|---|---|---|
| Formal Design | Product、Domain、Logical、Physical 与 Technical Design 收口 | 已完成 |
| Formal Intake | 建立正式运行主链，打通 Quick Capture → Triage | 当前 |
| Workflow | 建立 Project / Workflow Issue 的基本执行闭环 | 待开始 |
| Intake → Workflow | Triage Accept / Convert 接入正式 Workflow | 待开始 |
| Project Organization | Board / List、Move、Milestone、Initiative 等项目组织能力 | 待开始 |
| Cycles & Views | Cycle、Filter、Custom View、Search、Favorites 等组织与查看能力 | 待开始 |
| Home & Utilities | Home、Weekly Note 与全局入口 | 待开始 |
| V1 Hardening | 响应式、性能、恢复、诊断、整体回归与 V1 收口 | 待开始 |

以上阶段表达 V1 的总体建设顺序，不等同于固定 Session 数量。独立能力可以在依赖满足后调整顺序；具体 Slice 只在进入近期计划后展开。

## 3. 当前阶段：Formal Intake

Formal Intake 的目标是建立第一条完整的正式纵向链路：

```text
Workspace initialization
→ Quick Capture
→ Triage Issue
→ Triage List
→ authoritative Markdown
→ reload / external change 后正确恢复
```

这一阶段同时完成正式运行路径对 POC validation shell 的接管。POC 中已经验证的 Parser、guarded mutation、Mutation Queue、optimistic UI、Vault event reconciliation 等能力继续作为实现候选和技术证据，但不继承 POC-era Area / Task / Fleeting Note schema，也不建立 POC → Formal migration compatibility。

### 3.1 近期计划

| Slice | 目标 | 状态 |
|---|---|---|
| Formal Triage Intake | Initialize Trail；Quick Capture 创建正式 Triage Issue；列表即时可见；持久化、reload 与外部变化后正确恢复 | 当前 |
| Triage Management | 编辑 Triage title / Due，defer 与 delete；验证正式 mutation 主链可复用 | 待开始 |
| Workflow Entry | 建立 Project / Workflow Issue 的最小可用执行闭环 | 待开始 |

`Workflow Entry` 的具体边界在前两个 Slice 完成后根据实际实现规模重新评估，不提前固定 Board、DnD、Peek、Priority 或 Milestone 是否属于同一 Slice。

Triage Accept 后置到 Workflow 已经可见、可操作之后，使 Intake → Workflow 成为完整用户路径，而不是只完成一次跨容器持久化操作。

### 3.2 Formal Cutover

Formal Intake 同时完成 implementation authority cutover：

- `plugin/src/`、根目录 `Trail/` 与正式 `styles.css` 只承载 Formal Implementation；
- POC implementation、tests、fixtures 与样式退出 active build / runtime / test path，保留到明确的 POC archive 或 Git history 作为技术证据；
- 不长期维护 Formal / POC 双实现，也不要求 Formal schema 兼容 POC persistence；
- POC 中验证过的技术能力可以重新采用，但必须按当前 Formal architecture 实现，而不是继续扩展旧 POC 业务结构。

## 4. 实施原则

- **纵向用户价值优先**：Slice 应从用户操作穿过正式 Domain、Runtime、Persistence 和 UI，而不是按 Parser / Store / UI 分层独立开发。
- **Formal Design 权威**：实现不能由现有 POC schema 或代码结构反向定义正式模型。
- **POC evidence first**：已验证技术优先作为候选，但正式实现需要重新比较与当前架构的适配度。
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
| Formal Intake | 当前 | 第一条正式纵向链路待实现 |
| Formal Workflow | 待开始 | — |
| V1 Exit | 待开始 | — |

Checkpoint 只记录真正形成稳定阶段边界的结果，不追踪每个内部实现任务。完成一个阶段后更新本表，并展开下一阶段的近期计划。

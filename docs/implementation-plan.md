# Trail V1 Implementation Plan

> 状态：当前 Implementation Plan baseline
> 最后更新：2026-08-15
> 上游 Product：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 上游 Logical Data Model：`docs/logical-data-model.md`
> 上游 Physical Model：`docs/markdown-physical-model.md`
> 上游 Technical Design：`docs/technical-design-baseline.md`
> Implementation Architecture：`docs/implementation-architecture.md`
> 当前阶段：Implementation Architecture Re-baseline

## 1. 文档定位

本文记录 Trail V1 从正式设计进入正式实现后的总体路线、当前近期计划和阶段 checkpoint。

本文是项目实现进度的单一权威来源。Product / Domain / Logical / Physical / Technical Design 继续记录各自 contract；`docs/implementation-architecture.md` 记录代码模块、依赖和标准调用框架；本文只维护阶段顺序、近期迁移范围和完成状态。

正式实现仍以用户价值路线为主，不因为 Architecture Re-baseline 转向无限重构。Re-baseline 的目的，是先把已经实现的 Formal 能力迁移到可复用架构，再继续新增 Feature。

## 2. V1 Implementation Roadmap

| 阶段 | 目标 | 状态 |
|---|---|---|
| Formal Design | Product、Domain、Logical、Physical 与 Technical Design 收口 | 已完成 |
| Formal Intake | 建立正式运行主链，打通 Quick Capture → Triage，并完善基本 Triage 管理 | 已完成 |
| Workflow | 建立 Project / Workflow Issue 的基本执行闭环 | 已完成 |
| **Implementation Architecture Re-baseline** | 固化共享模块与调用框架；把当前 Formal Intake / Workflow / Accept 迁移到新架构 | **当前（Exit 验证通过，待 checkpoint）** |
| Codebase Simplification | Re-baseline 验收后进行全仓库代码审计、删除过渡/重复/死代码并简化不必要抽象 | 待开始 |
| Intake → Workflow | 在稳定且清理后的新架构上继续 Triage → Workflow / Project 转换能力 | 待继续 |
| Project Organization | Board / List、Move、Milestone、Initiative 等项目组织能力 | 待开始 |
| Cycles & Views | Cycle、Filter、Custom View、Search、Favorites 等组织与查看能力 | 待开始 |
| Home & Utilities | Home、Weekly Note 与全局入口 | 待开始 |
| V1 Hardening | 响应式、性能、恢复、诊断、整体回归与 V1 收口 | 待开始 |

Triage Accept 已经在 Re-baseline 之前实现并通过自动化与真实 Obsidian 验证。它现在作为现有行为和跨 source 技术证据进入重构，不要求保留旧 Service / executor 结构。Re-baseline 完成后，Accept 应成为新架构上的已迁移能力；`Triage Convert to Project` 是下一个净新增用户 Slice。

## 3. 当前阶段：Implementation Architecture Re-baseline

当前 Product / Domain / Physical contracts 不重做。重点调整 Formal Implementation 的工程结构：

```text
Feature-specific stacks
        ↓
shared Domain effects
shared Markdown / Physical capabilities
shared Runtime projection / reconcile
shared mutation execution
thin Application use cases
modular UI
```

详细模块图、依赖方向、标准 Read / Write Framework、测试 ownership 和 reliability 尺度由 `docs/implementation-architecture.md` 定义。

### 3.1 近期计划

| Slice | 目标 | 状态 |
|---|---|---|
| Architecture Contract | 固化目标模块、依赖规则、Domain Effects、Source Operations、Read / Write Framework、Testing / Reliability 原则；完成文档 checkpoint、push 后 consistency review | 已完成 |
| Markdown + Persistence Foundation | 建立共享 Markdown Core、Physical Schema / Registry、Domain Source I/O / Repository 与 Plugin Data I/O / Repository；迁移 Triage / Project physical path | 已完成 |
| Runtime + Mutation Foundation | 拆分 Runtime ownership；建立共享 projection / physical planning / single- and multi-source execution | 已完成 |
| Existing Formal Migration | 迁移 Quick Capture、Triage Management、Workflow Entry、Triage Accept；删除被共享能力取代的 feature-owned lifecycle | 已完成 |
| UI + Test Ownership Cleanup | 拆 Formal UI module；提取重复 interaction；按 independent risk 重组测试 | 已完成 |
| Re-baseline Exit | full check、代表性 real-host 回归、文档校准、commit / push / GitHub 回查 | 当前（本地验收通过，待 checkpoint） |

Architecture Contract、**Markdown + Persistence Foundation**、**Runtime + Mutation Foundation**、**Existing Formal Migration** 与 **UI + Test Ownership Cleanup** 已完成。Re-baseline Exit 的自动化与真实 Obsidian 验收已经通过，当前只剩文档校准后的 commit / push 与 GitHub 回查。

### 3.2 Re-baseline 原则

- **行为保留，代码结构不保守**：Triage / Workflow / Accept 已验证行为是资产；旧 class、file、service 可拆分、合并或局部重写。
- **先框架、后迁移、再新增**：先建立共享 module/call framework，再迁移现有 Formal 功能；Re-baseline 未完成前不新增 Convert。
- **Capability-first**：Feature 组合共享能力，不再自带 parser / runtime / persistence / execution stack。
- **One mechanism, one owner**：同一机制只有一个 canonical implementation。
- **Reuse code, reuse evidence**：机制测试在所属层证明一次，上层只测试新增语义和独立风险。
- **Proportional Reliability**：保护现实数据完整性，不为极低概率多重故障建立庞大恢复树。
- **不偏航**：不改变 V1 Product roadmap，不重做 Canonical Domain，不扩展 `archive/poc/`，不提前建设未来未知能力。

### 3.3 Re-baseline Exit Gate

只有以下条件同时满足，才进入 Intake → Workflow：

- active Formal code 已按新模块依赖迁移；
- Triage / Project 共享 Markdown / persistence 基础机制；
- Runtime / Mutation lifecycle 不再按 Feature 复制；
- Triage Accept 已迁移到共享 multi-source capability；
- UI 与测试 ownership 已完成必要收敛；
- 现有 Formal user behavior 无回归；
- full `npm run check` 通过；
- 只对新增独立 host risk 完成代表性真实 Obsidian 验证；
- 文档、commit / push、GitHub 回查完成。

### 3.4 当前 Re-baseline Exit 验证结果

2026-08-15 已完成本地 Exit 验证：

- `npm run check` 通过；
- `npm run build:diagnostics` 通过；
- `git diff --check` 通过；
- 代表性真实 Obsidian 回归通过：Fresh bootstrap / reload、Quick Capture、Project 创建、Triage Accept、Workflow status mutation、Estimate required input、外部 Project Markdown 修改后的自动 reconcile；
- Development Diagnostics trace 已检查，测试会话无 `warn` / `error`，Triage Accept 明确以 `committed` 结束，未进入 `compensated` / `partial`；
- Fresh Workspace 的 Accept 测试前置条件已校准：必须先创建至少一个 Project，避免把“无目标 Project 时不可 Accept”的正确产品约束误判为故障。

因此 Re-baseline 的代码与 real-host 验收 Gate 已满足；checkpoint 仍需完成文档提交、push 与 GitHub 回查后才能正式关闭。

## 4. Re-baseline 后：Codebase Simplification → Intake → Workflow

Re-baseline Exit 验收通过后，先执行一次独立的 **Codebase Simplification**，再恢复产品路线。该轮以全仓库 active code 为范围，审计并删除无真实 consumer 的过渡 facade、重复实现、死代码、重复测试与没有独立 ownership 的过度抽象；同时检查 `archive/poc/` 是否仍有保留在工作树中的价值。清理必须以引用、依赖、测试与 Git 历史证据为依据，不以文件数量或主观观感直接删除。

Codebase Simplification 完成并重新通过完整验证后，再进入 Intake → Workflow。

已存在的 Triage Accept 不重新作为新 Feature 开发；它应已经成为新架构中的稳定 capability consumer。

第一个净新增 Slice：

```text
Triage Convert to Project
```

它应直接复用新的 Domain Effects、Physical Planner、source transaction executor、Runtime projection / reconcile 和 Markdown / persistence infrastructure，只新增 Triage → Project 的业务 planner / field mapping / UI intent。

Convert to Note 仍属于后续 knowledge action，不阻塞下一步。

## 5. Implementation Checkpoints

| Checkpoint | 状态 | 结果 |
|---|---|---|
| POC Exit | 已完成 | 核心技术路线获得足够可行性证据 |
| Product Design | 已完成 | Formal Product baseline 已收口 |
| Canonical Domain | 已完成 | Canonical Domain 已收口 |
| Logical Data Model | 已完成 | Logical model 已收口 |
| Markdown Physical Model | 已完成 | Formal persistence model 已收口 |
| Technical Design | 已完成 | Formal Technical Design baseline 已收口 |
| Implementation Plan | 已形成 | V1 总路线与近期计划建立 |
| Formal Triage Intake | 已完成 | Formal foundation、Triage vertical path、active cutover 与真实 Obsidian 验证完成 |
| Development Diagnostics | 已完成 | development-only structured trace 完成并验证 production boundary |
| Triage Management | 已完成 | Edit / Defer / Delete 与 stale-edit protection 完成 |
| Formal Intake | 已完成 | Quick Capture → Triage → Management 形成稳定入口链路 |
| Workflow Entry | 已完成 | Project / Workflow Issue 基本执行闭环完成 |
| Formal Workflow | 已完成 | Workflow 可创建、执行并从 Markdown 重建 |
| Triage Accept | 已完成（迁移输入） | 新 identity、destination-first、optimistic / reconcile 与真实 host evidence 已建立 |
| **Implementation Architecture Re-baseline** | **当前（Exit 验证通过）** | Architecture Contract、Markdown + Persistence Foundation、Runtime + Mutation Foundation、Existing Formal Migration 与 UI + Test Ownership Cleanup 已完成；full check、Diagnostics build、real-host regression 与 trace review 已通过，待 commit / push / GitHub 回查 |
| Codebase Simplification | 待开始 | Re-baseline 验收后进行全仓库代码审计与瘦身，再开始净新增 Feature |
| Intake → Workflow | 待继续 | Codebase Simplification 后以 Convert to Project 作为第一个净新增 Slice |
| V1 Exit | 待开始 | — |

Checkpoint 只记录稳定阶段边界，不追踪每个内部实现任务。

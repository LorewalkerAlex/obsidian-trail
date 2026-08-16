# Trail V1 Implementation Plan

> 状态：当前 Implementation Plan baseline
> 最后更新：2026-08-16
> 上游 Product：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 上游 Logical Data Model：`docs/logical-data-model.md`
> 上游 Physical Model：`docs/markdown-physical-model.md`
> 上游 Technical Design：`docs/technical-design-baseline.md`
> Implementation Architecture：`docs/implementation-architecture.md`
> 当前阶段：**Clean Plugin Rebuild**

## 1. 文档定位

本文记录 Trail V1 从正式设计进入实现后的总体路线、当前近期计划和稳定 checkpoint。

Product / Domain / Logical / Physical / Technical Design 继续记录各自 contract；`docs/implementation-architecture.md` 是正式代码 ownership、依赖方向与标准调用框架的 authority；本文只记录实施顺序、当前阶段与完成状态。

2026-08-16 的独立 Architecture Implementation Audit 发现：现有 `plugin/` 的已验证用户行为和技术机制仍然有价值，但实际 Design → Code Mapping 仍存在 planner ownership、future carrier owner、Workspace State contract、external refresh 双轨和 guard coverage 等结构偏差。继续在旧目录上逐项修补容易再次把迁移历史带入最终结构，因此暂停 `Triage Convert to Project`，改为在**当前 main、当前工作目录**中并行建立 clean `plugin-rebuild/`。

这次 Rebuild 不重做已经收口的 Product / Domain / Logical / Physical / Technical Design。旧 `plugin/` 在 Rebuild 期间继续作为可运行 reference implementation 与已验证 evidence source；新 `plugin-rebuild/` 从第一天只接受正式 Architecture owner，不依赖旧 production code。完成 parity、Architecture Audit 与 real-host gate 后一次性 Cutover。

## 2. V1 Implementation Roadmap

| 阶段 | 目标 | 状态 |
|---|---|---|
| Formal Design | Product、Domain、Logical、Physical 与 Technical Design 收口 | 已完成 |
| Formal Intake | Quick Capture → Triage 与基本 Triage 管理 | 已完成 |
| Workflow | Project / Workflow Issue 基本执行闭环 | 已完成 |
| Implementation Architecture Re-baseline | 建立共享模块与调用框架并迁移既有 Formal 行为 | 已完成 |
| Codebase Simplification | 审计并清理旧实现中的过渡/重复/死代码 | 已完成 |
| **Clean Plugin Rebuild** | 在独立目录按最终 Architecture 重建 production implementation，并完成一次 Cutover | **当前** |
| Intake → Workflow | 继续 Triage → Workflow / Project 转换；首个净新增 Slice 为 `Triage Convert to Project` | Rebuild 后继续 |
| Project Organization | Board / List、Move、Milestone、Initiative 等 | 待开始 |
| Cycles & Views | Cycle、Filter、Custom View、Search、Favorites 等 | 待开始 |
| Home & Utilities | Home、Weekly Note 与全局入口 | 待开始 |
| V1 Hardening | 响应式、性能、恢复、诊断与整体回归 | 待开始 |

## 3. 已完成实现资产

已有 checkpoint 不作废。它们继续提供两类资产：

1. **产品行为证据**：Quick Capture、Triage Management、Project / Workflow Issue、Triage Accept 等已经明确过的行为与边界；
2. **技术风险证据**：Markdown parsing / guarded write、optimistic Runtime、serial mutation、authoritative reread、reconcile、destination-first cross-source mutation、Obsidian file events、Diagnostics 等已经经过自动化或真实宿主验证的机制。

Implementation Architecture Re-baseline checkpoint `9e12e32e870a2299023b64804e3070abe138eb0b` 已完成 full check、Diagnostics build、代表性 real-Obsidian regression、push 后 GitHub 回查与 CI。

Codebase Simplification checkpoint `6061ca45569fe7664e0b37ed279928c9559e8592` 进一步完成 49 test files / 191 tests、lint 0 warnings、TypeScript typecheck、production / Diagnostics build、external managed-file refresh 与 clean Diagnostics trace。独立 Audit 否决的是“该目录已经可以作为最终长期 Design → Code baseline”的结论，不是否定这些行为和风险证据。

因此 Rebuild 的原则是：**保留技术资产，不继承历史结构。**

## 4. 当前阶段：Clean Plugin Rebuild

### 4.1 工作模型

整个 Rebuild 在当前 `main` 与当前工作目录内完成：

```text
plugin/                 existing runnable reference implementation
plugin-rebuild/         clean Formal implementation under rebuild
```

Rebuild 期间：

- `plugin/` 不做结构性 remediation，不为了 Rebuild 修改旧 owner；
- `plugin-rebuild/` 不允许 import `plugin/` production code；
- 可以阅读、比较和有选择地移植旧实现，但被移植的能力必须直接落到最终 owner；
- 旧测试不是兼容性要求。只有仍然证明正式行为或独立技术风险的 evidence 才在新 owner 下重新建立；
- 不创建 compatibility facade、old/new import bridge、双 Plan 或“先放错位置以后再搬”的临时 owner；
- 不为了填满 Architecture tree 创建无 consumer 的空 service / repository；已冻结 type/schema/codec/fail-closed boundary 则应在对应 owner 出现；
- Rebuild checkpoint 可以逐阶段提交，但每个已建立 capability 都必须已经是其最终 ownership。

在 Cutover 前，Obsidian production / Diagnostics build 仍从 `plugin/` 生成；`plugin-rebuild/` 使用独立 typecheck/test/lint boundary。根 `npm run check` 同时验证 legacy reference 与 rebuild，确保并行阶段没有把现有可运行基线弄坏。

### 4.2 Rebuild 阶段

| Rebuild Slice | 结果 | 状态 |
|---|---|---|
| Boundary + Domain Foundation | 独立工具链、legacy-import guard、冻结 Core Entity / Configuration / Workspace State contract | 已完成 |
| Markdown + Persistence Foundation | canonical paths/schema/core/explicit codecs、Plugin Data 与 authoritative source repository | 已完成 |
| Runtime + Mutation Foundation | final committed/pending/control/health Runtime、semantic planning、global serial mutation、physical execution | 已完成 |
| **Source Sync + Application** | bootstrap/discovery/full external refresh、thin use cases、existing Triage/Project/Issue/Accept 行为迁移 | **当前** |
| Query + UI + Host Composition | selectors、UI modules、Obsidian adapters、thin `main.ts` | 待开始 |
| Parity + Independent-risk Validation | existing Formal behavior parity、targeted risk tests、Diagnostics 与必要 real-host regression | 待开始 |
| Architecture Audit + Cutover | 全量 Design → Code audit；删除旧 `plugin/`，`plugin-rebuild/` 切换为正式 `plugin/` | 待开始 |

这不是按技术层做长期碎片化开发。每个基础 Slice 的目的都是一次建立后续多个用户 Feature 共同消费的稳定纵向能力；基础主干完成后，继续以用户价值 Slice 开发。

### 4.3 Rebuild 硬约束

Rebuild 从第一天锁住本次 Audit 暴露的关键问题：

- Pure semantic planning 的 canonical owner 是 `domain/planning/`；Application 只做 use-case normalization / orchestration；
- Core Entity / Configuration / Workspace State 使用正式 compile-time contract；Custom View / Favorites 不再退化成 `unknown[]`；
- Initiative / Projectless Issues / Cycles 等 frozen carrier 各自拥有明确 codec / validation owner，不合并成万能 frozen module；
- 可能存在于 Workspace 的合法 managed carrier 必须 fail-closed，不允许静默忽略；
- external managed-file change 的 V1 ingress 只有正式 full authoritative refresh lifecycle，不保留另一套旧 incremental ingress；
- Runtime 顶层保持 `committed / pending / control / health`；
- `main.ts` 只负责 lifecycle、composition 和 host registration；
- Architecture guard / lint 应阻止关键 reverse dependency 与 `plugin-rebuild → plugin` dependency，而不是只依赖文档 review。

### 4.4 Cutover Gate

只有以下条件同时满足，才允许目录切换并继续净新增 Feature：

- `plugin-rebuild/src/` 能逐项映射到 `docs/implementation-architecture.md` §5，且 Audit finding 全部在结构上消失；
- rebuild production code 不 import legacy `plugin/`，不存在 compatibility bridge；
- 已实现 Formal behavior 与旧 reference baseline 达到所需 parity；
- future frozen contracts / carriers 的当前必要 fail-closed boundary 到位；
- one mechanism / one owner：Runtime、Mutation、Source Sync、Persistence、Markdown、Query 均无双轨；
- focused owner tests、full rebuild checks、root `npm run check` 与 `git diff --check` 通过；
- 必要的 representative real-Obsidian regression 与 Diagnostics trace 通过；
- 最终 Architecture Implementation Audit = PASS；
- README / Implementation Plan 与实际 Cutover 状态一致。

Cutover 本身是一次结构替换，而不是第二轮重构：删除或归档旧 `plugin/`，把 `plugin-rebuild/` 切换为正式 `plugin/`，同步恢复正式 build/test path，随后再继续 `Triage Convert to Project`。

## 5. 当前近期计划

当前推进 **Source Sync + Application**：

- 建立统一 bootstrap / discovery：加载 Plugin Data，发现并读取 managed Domain sources，完成 parse / validate / ownership / indexes 后发布 authoritative Runtime；
- 建立 unexpected managed-file change 的唯一 V1 ingress：进入 `refreshing`、关闭 mutation gate、full authoritative reload、成功后原子 publish，失败时保留可信 last-known-good 并进入只读错误；
- Source Sync 负责 authoritative verification / reconcile / source health 收敛，Application 不直接依赖 raw Persistence、Markdown 或 host adapter；
- 把已有 Triage、Project、Workflow Issue、Triage Accept 行为迁入 thin Application use cases，统一为 normalize input → pure planner → Mutation Coordinator；
- 本 Slice 不提前建立 Query / UI / Obsidian Host Composition；现有 runnable `plugin/` 继续保持不变；
- 本 checkpoint 验证并 push 后，再进入 Query + UI + Host Composition。

## 6. Implementation Checkpoints

| Checkpoint | 状态 | 结果 |
|---|---|---|
| POC Exit | 已完成 | 核心技术路线获得可行性证据 |
| Product Design | 已完成 | Formal Product baseline 收口 |
| Canonical Domain | 已完成 | Canonical Domain 收口 |
| Logical Data Model | 已完成 | Logical model 收口 |
| Markdown Physical Model | 已完成 | Formal persistence model 收口 |
| Technical Design | 已完成 | Formal Technical Design baseline 收口 |
| Formal Intake | 已完成 | Quick Capture → Triage → Management 稳定入口链路 |
| Formal Workflow | 已完成 | Project / Workflow Issue 基本执行闭环 |
| Triage Accept | 已完成 | new identity、destination-first、optimistic/reconcile 与 real-host evidence |
| Implementation Architecture Re-baseline | 已完成 | `9e12e32e...` 已 push 并通过 GitHub / CI / real-host exit evidence |
| Codebase Simplification | 已完成 | `6061ca45...` 为当前 legacy reference baseline；行为/技术 evidence 保留 |
| Rebuild Boundary + Domain Foundation | 已完成 | `501a09a5...` 建立独立 rebuild 工具链、Domain contract 与双向 legacy-import guard |
| Rebuild Markdown + Persistence Foundation | 已完成 | 五类 explicit codec、Physical Schema Registry、DomainSourceRepository、Plugin Data physical ↔ logical boundary 与 owner guards 已建立 |
| Rebuild Runtime + Mutation Foundation | 已完成 | final Runtime shape、logical Plan、ordered pending replay、global serial queue、dequeue-time physical topology 与 Persistence-only execution 已建立 |
| **Clean Plugin Rebuild** | **当前** | 当前进入 Source Sync + Application；通过 Cutover Gate 后替换 legacy `plugin/` |
| Intake → Workflow | Rebuild 后继续 | 首个净新增 Slice：`Triage Convert to Project` |
| V1 Exit | 待开始 | — |

Checkpoint 只记录稳定阶段边界，不追踪每个微型实现任务。

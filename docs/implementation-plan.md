# Trail V1 Implementation Plan

> 状态：当前 Implementation Plan baseline
> 最后更新：2026-08-17
> 上游 Product：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 上游 Logical Data Model：`docs/logical-data-model.md`
> 上游 Physical Model：`docs/markdown-physical-model.md`
> 上游 Technical Design：`docs/technical-design-baseline.md`
> Implementation Architecture：`docs/implementation-architecture.md`
> 当前阶段：**Project Organization**

## 1. 文档定位

本文记录 Trail V1 从正式设计进入实现后的总体路线、当前近期计划和稳定 checkpoint。

Product / Domain / Logical / Physical / Technical Design 继续记录各自 contract；`docs/implementation-architecture.md` 是正式代码 ownership、依赖方向与标准调用框架的 authority；本文只记录实施顺序、当前阶段与完成状态。

2026-08-16 的独立 Architecture Implementation Audit 发现：当时 `plugin/` 中已经验证的用户行为和技术机制仍然有价值，但实际 Design → Code Mapping 存在 planner ownership、future carrier owner、Workspace State contract、external refresh 双轨和 guard coverage 等结构偏差。为了避免继续在旧目录上逐项修补并把迁移历史带入最终结构，`Triage Convert to Project` 被暂停，工程转入 clean rebuild。

Clean rebuild 没有重做已经收口的 Product / Domain / Logical / Physical / Technical Design，而是重新按 `docs/implementation-architecture.md` 的最终 owner 建立 Domain、Markdown/Persistence、Runtime/Mutation、Source Sync/Application、Query/UI/Host Composition，并重新建立必要的 Formal behavior parity 与 independent-risk evidence。

2026-08-17，本 Session 从公开 `main`、canonical design chain、实际 clean source tree、测试与 build 配置重新执行 Design → Code Architecture Implementation Audit，结论为 **AUDIT PASS**，无 blocking finding。随后 Cutover 将通过审计的 clean implementation 提升为正式 `plugin/`，删除旧 active implementation 与临时双轨 build/test 配置；旧实现继续由 Git checkpoint `6061ca45569fe7664e0b37ed279928c9559e8592` 保留，不在工作树中复制第二份 archive。

Cutover 后重新进入用户价值开发，并完成第一个净新增 Slice：`Triage Convert to Project`。该 Slice 只补齐 Domain planning → Application intent → Diagnostics/UI action → Triage UI，复用既有 generic destination-first Source Transition，没有改写 Mutation / Persistence / Runtime 主干。自动化 focused tests、Diagnostics build、完整 `npm run check` 与 `git diff --check` 均通过；代表性 real-Obsidian Validation Evidence 进一步确认新 Project source 先创建成功，再删除 Triage source，最终 Runtime 收敛为 `issues=0 / projects=1`、`pending=[]`、`control=ready`、无 Source Health issue，且未出现 warn/error diagnostics。QA fixture 已清理并恢复 production bundle。

因此 **Intake → Workflow** 阶段完成，当前进入下一既定阶段：**Project Organization**。具体首个 Project Organization Slice 不在此处预先猜测；稳定 checkpoint 提交并回查后，从实际仓库和既定候选能力中评估最小完整用户价值切片。

## 2. V1 Implementation Roadmap

| 阶段 | 目标 | 状态 |
|---|---|---|
| Formal Design | Product、Domain、Logical、Physical 与 Technical Design 收口 | 已完成 |
| Formal Intake | Quick Capture → Triage 与基本 Triage 管理 | 已完成 |
| Workflow | Project / Workflow Issue 基本执行闭环 | 已完成 |
| Implementation Architecture Re-baseline | 建立共享模块与调用框架并迁移既有 Formal 行为 | 已完成 |
| Codebase Simplification | 审计并清理旧实现中的过渡/重复/死代码 | 已完成 |
| Clean Plugin Rebuild | 按最终 owner 重建共享主干、完成 parity / independent-risk validation、独立 Architecture Audit 与目录 Cutover | 已完成 |
| Intake → Workflow | Triage Accept 与 Triage Convert to Project 形成 intake → normal workflow / project 的核心转换能力 | 已完成 |
| **Project Organization** | Board / List、Move、Milestone、Initiative 等 | **当前** |
| Cycles & Views | Cycle、Filter、Custom View、Search、Favorites 等 | 待开始 |
| Home & Utilities | Home、Weekly Note 与全局入口 | 待开始 |
| V1 Hardening | 响应式、性能、恢复、诊断与整体回归 | 待开始 |

## 3. 已完成实现资产

已有 checkpoint 不作废。它们继续提供两类资产：

1. **产品行为证据**：Quick Capture、Triage Management、Project / Workflow Issue、Triage Accept、Triage Convert to Project 等已经明确过的行为与边界；
2. **技术风险证据**：Markdown parsing / guarded write、optimistic Runtime、serial mutation、authoritative reread、reconcile、destination-first cross-source mutation、Obsidian file events、Diagnostics 等已经经过自动化或真实宿主验证的机制。

Implementation Architecture Re-baseline checkpoint `9e12e32e870a2299023b64804e3070abe138eb0b` 已完成 full check、Diagnostics build、代表性 real-Obsidian regression、push 后 GitHub 回查与 CI。

Codebase Simplification checkpoint `6061ca45569fe7664e0b37ed279928c9559e8592` 完成 49 test files / 191 tests、lint 0 warnings、TypeScript typecheck、production / Diagnostics build、external managed-file refresh 与 clean Diagnostics trace。后续 Audit 否决的是“该目录已经可以作为最终长期 Design → Code baseline”的结论，不是否定这些行为和风险证据。

Clean rebuild 在新的最终 owner 下重新建立所需行为与独立技术风险证据，并完成代表性 real-host Validation Evidence。2026-08-17 的独立 Architecture Implementation Audit 进一步确认 planner ownership、future carrier owner、Workspace State contract、external refresh ingress、Runtime / Mutation / Persistence 边界、UI / Host boundary 与 architecture guard coverage 均达到 Cutover 要求。

Cutover 后的 `Triage Convert to Project` 证明净新增 Feature 可以沿现有 owner 和标准写链路完成，而不需要重新打开已通过 Audit 的共享架构：Product create-target-before-delete-source 语义映射为一条 logical Plan，由既有 materializer 自动选择 file-backed Source Transition，并由同一 Runtime / Source Sync / Persistence 主干完成 target-first 持久化与 authoritative convergence。

因此正式基线继续遵循：**保留技术资产，不继承历史结构；一个能力只有一个长期 owner。**

## 4. Clean Plugin Rebuild 与 Cutover（已完成）

### 4.1 Cutover 后工作模型

Cutover 后只保留一个 active Formal implementation：

```text
plugin/                 Formal implementation and current Obsidian build target
archive/poc/            historical POC evidence only
```

旧 Formal implementation 不再作为第二套 active source 留在工作树中；如需历史比较，使用 Git checkpoint `6061ca45569fe7664e0b37ed279928c9559e8592`。这样避免继续存在双实现、双测试入口、重复 lint scope 或“旧代码仍像当前 owner”的歧义。

正式 `plugin/src/` 直接对应 `docs/implementation-architecture.md` 的 owner map；根 `tsconfig.json`、`vitest.config.ts`、ESLint 与 esbuild 统一服务这一个 source tree。Production / Diagnostics 仍共享同一 composition root，通过 compile-time Diagnostics flag 区分，development Validation Evidence 不进入 production correctness。

### 4.2 Rebuild / Cutover 阶段结果

| Rebuild Slice | 结果 | 状态 |
|---|---|---|
| Boundary + Domain Foundation | 独立工具链、冻结 Core Entity / Configuration / Workspace State contract | 已完成 |
| Markdown + Persistence Foundation | canonical paths/schema/core/explicit codecs、Plugin Data 与 authoritative source repository | 已完成 |
| Runtime + Mutation Foundation | final committed/pending/control/health Runtime、semantic planning、global serial mutation、physical execution | 已完成 |
| Source Sync + Application | bootstrap/discovery/full external refresh、thin use cases、existing Triage/Project/Issue/Accept 行为迁移 | 已完成 |
| Query + UI + Host Composition | selectors、Triage / Projects UI、Obsidian adapters、thin `main.ts`、development validation evidence | 已完成 |
| Parity + Independent-risk Validation | Formal behavior parity、read-only recovery、source transition、host suppression 与代表性 real-host evidence | 已完成 |
| Architecture Implementation Audit | 从实际公开代码重新核对 Design → Code Mapping；AUDIT PASS，无 blocking finding | 已完成 |
| Directory Cutover | clean implementation 提升到正式 `plugin/`，旧 active tree 与临时双轨配置移除，正常 build/test path 恢复 | 已完成 |

### 4.3 Cutover 后硬约束

后续 Feature 必须继续维持以下架构约束：

- Pure semantic planning 的 canonical owner 是 `domain/planning/`；Application 只做 use-case normalization / orchestration；
- Core Entity / Configuration / Workspace State 使用正式 compile-time contract；Custom View / Favorites 不退化成 `unknown[]`；
- Initiative / Projectless Issues / Cycles 等 frozen carrier 各自拥有明确 codec / validation owner，不合并成万能 frozen module；
- 可能存在于 Workspace 的合法 managed carrier 必须 fail-closed，不允许静默忽略；
- external managed-file change 的 V1 ingress 只有正式 full authoritative refresh lifecycle，不再引入另一套 incremental ingress；
- Runtime 顶层保持 `committed / pending / control / health`；
- Mutation 继续使用一条 global serial queue、dequeue-time materialization 与 Persistence-only physical execution；
- `main.ts` 只负责 lifecycle、composition 和 host registration；
- UI 读取 Effective Runtime / Query selector，以 stable ID 订阅并通过 Application intent 发起离散业务动作；
- Architecture guard / lint 继续阻止关键 reverse dependency，不能依赖文档 review 代替可执行约束；
- 不重新建立第二套 implementation tree、compatibility facade、旧新 import bridge 或双 Plan。

### 4.4 Cutover Exit Gate

本次 Cutover 的 exit gate 保持以下标准：

- Formal source 能逐项映射到 `docs/implementation-architecture.md` §5；
- 已实现 Formal behavior 与 retained legacy evidence 达到所需 parity；
- future frozen contracts / carriers 的当前必要 fail-closed boundary 到位；
- one mechanism / one owner：Runtime、Mutation、Source Sync、Persistence、Markdown、Query 均无双轨；
- focused architecture guard、正常 `npm run check` 与 `git diff --check` 通过；
- Production build 使用正式 composition root，Diagnostics build 仍可用于 Validation Evidence，而 production bundle 不包含 development-only validation command；
- 必要的 representative real-Obsidian regression 与 Diagnostics / Validation Evidence 已有有效 retained evidence；
- 最终 Architecture Implementation Audit = PASS；
- README / Implementation Plan 与实际 Cutover 状态一致；
- Cutover 失败时整笔恢复到原双树 checkpoint，不留下半切换目录状态。

Cutover 只做结构替换和正常工具链恢复，不包含第二轮架构重构，也不增加净新 Product Feature。

## 5. 当前近期计划

当前进入 **Project Organization**。Roadmap 已冻结的候选能力包括 Board / List、Issue Move、Milestone 与 Initiative，但本节不提前把其中任意一个宣布为下一 Slice。

下一个 Slice 的选择原则：

- 新 checkpoint 开始时先重新核对公开 `main`、Implementation Plan、相关 Product / Domain contract、当前 Project UI / Query / Application / Planner / persistence support 与测试；
- 优先选择能形成一个完整用户价值闭环、并最大化复用现有 owner 的最小 Slice，而不是为了目录或 API 完整性实现孤立底层能力；
- 若 Board / List、Move、Milestone、Initiative 中某项已经有足够底层 contract / carrier 支撑，应优先从缺失的用户行为链补齐，不另建 parallel mechanism；
- 继续遵循 Domain rule / semantic plan → Application intent → Mutation/Persistence → Runtime reconcile → Query/UI → focused tests → 必要 real-host evidence；
- 中途按受影响 owner 做定向验证，准备稳定 checkpoint 时再运行一次完整 `npm run check`；
- 当前 `Triage Convert to Project` checkpoint 完成 commit/push、GitHub/CI 回查后，再开始该评估，避免把两个独立用户价值 Slice 混入同一未提交工作区。

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
| Codebase Simplification | 已完成 | `6061ca45...` 保留 legacy behavior / technical evidence |
| Rebuild Boundary + Domain Foundation | 已完成 | Domain contract 与 clean owner boundary 已建立 |
| Rebuild Markdown + Persistence Foundation | 已完成 | explicit codecs、Physical Schema Registry、DomainSourceRepository、Plugin Data boundary 已建立 |
| Rebuild Runtime + Mutation Foundation | 已完成 | final Runtime shape、logical Plan、global serial queue、dequeue-time physical topology 与 Persistence-only execution 已建立 |
| Rebuild Source Sync + Application | 已完成 | 统一 bootstrap/discovery/full refresh、Source Health、refresh barrier、authoritative mutation settlement 与既有 Formal Application 行为已建立 |
| Rebuild Query + UI + Host Composition | 已完成 | effective Runtime selectors、Triage / Projects UI、Obsidian host adapters、thin composition root 与 development Validation Evidence 已建立 |
| Rebuild Parity + Independent-risk Validation | 已完成 | Formal behavior parity、read-only recovery 独立风险与代表性 Validation Evidence 已通过 |
| Architecture Implementation Audit | 已完成 | 2026-08-17 AUDIT PASS，无 blocking finding |
| Directory Cutover | 已完成 | clean implementation 成为唯一正式 `plugin/`；临时双轨工具链移除 |
| Triage Convert to Project | 已完成 | new Project identity、create-target-before-delete-source、existing file-backed Source Transition、automated + real-host evidence |
| Intake → Workflow | 已完成 | Triage Accept + Triage Convert to Project 完成核心 intake conversion path |
| **Project Organization** | **当前** | 下一具体 Slice 待 checkpoint 后基于实际仓库选择 |
| V1 Exit | 待开始 | — |

Checkpoint 只记录稳定阶段边界，不追踪每个微型实现任务。

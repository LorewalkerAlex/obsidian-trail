# Trail V1 Implementation Plan

> 状态：当前 Implementation Plan baseline
> 最后更新：2026-08-16
> 上游 Product：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 上游 Logical Data Model：`docs/logical-data-model.md`
> 上游 Physical Model：`docs/markdown-physical-model.md`
> 上游 Technical Design：`docs/technical-design-baseline.md`
> Implementation Architecture：`docs/implementation-architecture.md`
> 当前阶段：Intake → Workflow

## 1. 文档定位

本文记录 Trail V1 从正式设计进入正式实现后的总体路线、当前近期计划和阶段 checkpoint。

本文是项目实现进度的单一权威来源。Product / Domain / Logical / Physical / Technical Design 继续记录各自 contract；`docs/implementation-architecture.md` 记录代码模块、依赖和标准调用框架；本文只维护阶段顺序、近期迁移范围和完成状态。

正式实现仍以用户价值路线为主。Implementation Architecture Re-baseline 已完成；当前 Codebase Simplification 的目的，是在继续净新增 Feature 前审计 active code，删除没有真实价值的过渡层、重复实现和不必要抽象，同时保持已经验证的行为和架构 contract。

## 2. V1 Implementation Roadmap

| 阶段 | 目标 | 状态 |
|---|---|---|
| Formal Design | Product、Domain、Logical、Physical 与 Technical Design 收口 | 已完成 |
| Formal Intake | 建立正式运行主链，打通 Quick Capture → Triage，并完善基本 Triage 管理 | 已完成 |
| Workflow | 建立 Project / Workflow Issue 的基本执行闭环 | 已完成 |
| **Implementation Architecture Re-baseline** | 固化共享模块与调用框架；把当前 Formal Intake / Workflow / Accept 迁移到新架构 | **已完成** |
| **Codebase Simplification** | Re-baseline 验收后进行全仓库代码审计、删除过渡/重复/死代码并简化不必要抽象 | **已完成** |
| **Intake → Workflow** | 在稳定且清理后的新架构上继续 Triage → Workflow / Project 转换能力 | **当前** |
| Project Organization | Board / List、Move、Milestone、Initiative 等项目组织能力 | 待开始 |
| Cycles & Views | Cycle、Filter、Custom View、Search、Favorites 等组织与查看能力 | 待开始 |
| Home & Utilities | Home、Weekly Note 与全局入口 | 待开始 |
| V1 Hardening | 响应式、性能、恢复、诊断、整体回归与 V1 收口 | 待开始 |

Triage Accept 已经完成并迁移到 Re-baseline 后的共享架构，继续作为现有行为和跨 source 技术证据保留；`Triage Convert to Project` 是 Codebase Simplification 完成后的下一个净新增用户 Slice。

## 3. 已完成阶段：Implementation Architecture Re-baseline

Product / Domain / Physical contracts 未重做。Re-baseline 调整了 Formal Implementation 的工程结构：

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

### 3.1 Re-baseline Slices

| Slice | 目标 | 状态 |
|---|---|---|
| Architecture Contract | 固化目标模块、依赖规则、Domain Effects、Source Operations、Read / Write Framework、Testing / Reliability 原则；完成文档 checkpoint、push 后 consistency review | 已完成 |
| Markdown + Persistence Foundation | 建立共享 Markdown Core、Physical Schema / Registry、Domain Source I/O / Repository 与 Plugin Data I/O / Repository；迁移 Triage / Project physical path | 已完成 |
| Runtime + Mutation Foundation | 拆分 Runtime ownership；建立共享 projection / physical planning / single- and multi-source execution | 已完成 |
| Existing Formal Migration | 迁移 Quick Capture、Triage Management、Workflow Entry、Triage Accept；删除被共享能力取代的 feature-owned lifecycle | 已完成 |
| UI + Test Ownership Cleanup | 拆 Formal UI module；提取重复 interaction；按 independent risk 重组测试 | 已完成 |
| Re-baseline Exit | full check、代表性 real-host 回归、文档校准、commit / push / GitHub 回查 | 已完成 |

Re-baseline 的全部 Slice 已完成。实现 checkpoint `9e12e32e870a2299023b64804e3070abe138eb0b` 已提交并推送到 `main`；GitHub post-push 回查确认代码与 ownership 变更已落盘，GitHub Actions `check` job 成功。当前进入 **Codebase Simplification**。

### 3.2 Re-baseline 原则

- **行为保留，代码结构不保守**：Triage / Workflow / Accept 已验证行为是资产；旧 class、file、service 可拆分、合并或局部重写。
- **先框架、后迁移、再新增**：先建立共享 module/call framework，再迁移现有 Formal 功能；Re-baseline 完成前不新增 Convert。
- **Capability-first**：Feature 组合共享能力，不再自带 parser / runtime / persistence / execution stack。
- **One mechanism, one owner**：同一机制只有一个 canonical implementation。
- **Reuse code, reuse evidence**：机制测试在所属层证明一次，上层只测试新增语义和独立风险。
- **Proportional Reliability**：保护现实数据完整性，不为极低概率多重故障建立庞大恢复树。
- **不偏航**：不改变 V1 Product roadmap，不重做 Canonical Domain，不扩展 `archive/poc/`，不提前建设未来未知能力。

### 3.3 Re-baseline Exit Gate

只有以下条件同时满足，Re-baseline 才完成并进入 Codebase Simplification：

- active Formal code 已按新模块依赖迁移；
- Triage / Project 共享 Markdown / persistence 基础机制；
- Runtime / Mutation lifecycle 不再按 Feature 复制；
- Triage Accept 已迁移到共享 multi-source capability；
- UI 与测试 ownership 已完成必要收敛；
- 现有 Formal user behavior 无回归；
- full `npm run check` 通过；
- 只对新增独立 host risk 完成代表性真实 Obsidian 验证；
- 文档、commit / push、GitHub 回查完成。

### 3.4 Re-baseline Exit 验证结果

2026-08-15 已完成 Exit 验证：

- `npm run check` 通过；
- `npm run build:diagnostics` 通过；
- `git diff --check` 通过；
- 代表性真实 Obsidian 回归通过：Fresh bootstrap / reload、Quick Capture、Project 创建、Triage Accept、Workflow status mutation、Estimate required input、外部 Project Markdown 修改后的自动 reconcile；
- Development Diagnostics trace 已检查，测试会话无 `warn` / `error`，Triage Accept 明确以 `committed` 结束，未进入 `compensated` / `partial`；
- Fresh Workspace 的 Accept 测试前置条件已校准：必须先创建至少一个 Project，避免把“无目标 Project 时不可 Accept”的正确产品约束误判为故障；
- Re-baseline implementation checkpoint `9e12e32e870a2299023b64804e3070abe138eb0b` 已提交并推送到 `main`；
- GitHub post-push 回查完成；该 checkpoint 对应的 GitHub Actions `check` job 成功。

因此 Re-baseline Exit Gate 已全部满足，**Implementation Architecture Re-baseline 正式关闭**。

## 4. 已完成阶段：Codebase Simplification

本阶段执行了一次独立的 **Codebase Simplification**。目标不是“尽量少写代码”，而是让 active code 一次收敛到 `docs/implementation-architecture.md` §5 的 **Design → Code Mapping / Target Codebase Map**，形成适合长期继续堆功能的干净基线。

本阶段同时做减法与补正：删除迁移 scaffolding、重复实现和错误 ownership；保留已经冻结的未来 Entity / carrier / capability owner，并把缺失的长期 contract 放回正确位置。未来预留不通过 compatibility facade、双 Plan、旧 import path 或半套 Feature lifecycle 实现。

本阶段可以分多轮本地 ZIP 实施和验证，但**任何准备形成 checkpoint 的状态都必须是单一最终 ownership**：同一 capability 不允许为了“迁移方便”在 main 中长期同时保留新旧两套入口。

### 4.1 Target Map 与状态 Overlay

结构 authority 只来自 `docs/implementation-architecture.md` §5；本文只记录当前收敛状态：

```text
Design / Architecture authority                 Current cleanup target
│
├─ Canonical Domain + Logical Data Model      → domain/          final purity
├─ Product Behavior                           → application/     feature semantics only
├─ Mutation Technical Design                  → mutation/        remove feature-plan dual track
├─ Runtime Technical Design                   → runtime/         authoritative/ownership/indexes/pending/control/health
├─ Synchronization Technical Design           → source-sync/     authoritative source lifecycle / full refresh
├─ Persistence / Physical boundary            → persistence/     authoritative carrier read/write
├─ Markdown Physical Model                    → markdown/        single path + schema + codec authority
├─ Logical Query Contract                     → query/           retain read-side ownership
├─ Product / Interaction                      → ui/              keep page/action boundary
├─ Obsidian Host                              → adapters/        Vault / plugin-data / managed-event adapters
└─ Composition Root                           → main.ts          lifecycle / composition / host registration
```

Initiative、Milestone、Cycle、Projectless Issue、Configuration、Workspace State 等已经冻结的未来结构继续保留长期 owner。不存在实现内容时不强制创建空目录；已冻结 type/schema/codec contract 可以存在，行为仍可 deferred。

### 4.2 Simplification Slices

| Slice | 目标 | 状态 |
|---|---|---|
| Target Codebase Map & Cleanup Contract | 将设计层映射到唯一 code owner，明确 RESERVED future owner、anti-drift 与 Exit 标准 | 已完成 |
| Path / Layout Authority | 建立唯一 managed-path authority；消除 Feature / Workspace / Adapter 中重复 `Trail/...` 拼接与 path truth | 已完成 |
| **Domain Purity + Application Ownership** | Domain 只保留 business facts/rules/planning；Use Case 正式进入 `application/`；移出 source/persistence/runtime concern | 已完成 |
| **Persistence + Source Sync Finalization** | 删除旧 Domain persistence gateways / duck typing；收口 authoritative source lifecycle 与 external refresh owner | **已完成** |
| **Runtime Final Shape** | 收口 authoritative / ownership / indexes / pending / control；删除 compatibility alias 与 parser/source metadata leakage | **已完成** |
| **Feature Plan / Service Simplification** | 复用共享 lifecycle，拆掉 Feature Service 中重复 orchestration；Feature 只保留业务语义与独立风险 | **已完成** |
| **Host / Composition / UI Boundary** | `main.ts` 只做 composition/registration；host file events 进入 adapter/source-sync；UI 保持纯 read/intent | **已完成** |
| **Tests / Tooling / Stage-language Cleanup** | 删除 active technology spike / duplicate evidence；增加 anti-drift guards；清除 production migration-stage terminology | **已完成** |
| Simplification Exit | full check、Diagnostics build、代表性 real-host regression、trace review、文档校准、commit/push/GitHub audit | **已完成** |

### 4.3 Long-term cleanup rules

- **不删除未来骨架**：已冻结 Entity / carrier / capability owner 必须保留或补全；没有当前 behavior 不等于没有长期位置。
- **不保留迁移骨架**：compatibility facade、old/new 双入口、transitional Plan、capability duck typing 不属于未来设计，必须退出 production path。
- **事实只有一个 authority**：路径、schema、Domain type、source ownership、Runtime index 等不得在多个 Feature 中重复定义或重新拼装。
- **不要为了树而拆文件**：目录映射代表 ownership，不要求每个框都对应一个微型 wrapper；一个文件只有在拥有独立职责时才存在。
- **也不要为了少文件合并 owner**：未来明确的 Initiative / Milestone / Cycle / Projectless carrier 不因当前未启用就重新塞回一个万能模块。
- **生产代码不带阶段身份**：`Formal`、`Compatibility`、`Transitional`、`current slice` 等只允许出现在历史/迁移文档或确有意义的 migration tooling，不成为产品概念或长期 module identity。
- **本地可以分轮，checkpoint 不留双轨**：同一 cleanup slice 内可以短暂搬迁，但准备提交前必须完成 consumer cutover 并删除旧 owner。

### 4.4 Codebase Simplification Exit Gate

只有以下条件同时满足，本阶段才可以关闭并重新开始净新增 Feature：

- 实际 `plugin/src/` 可以逐项映射回 Architecture §5，当前 active owner 不再与目标树冲突；
- production source 中不存在仅为迁移保留的 compatibility re-export / transitional adapter / alternate import path；
- managed root / directories / singleton paths / path predicates 只有一个 canonical path authority，其他模块不重新拼 authoritative `Trail/...`；
- `domain/` 不含 Markdown range/offset、source diagnostic、Persistence/Obsidian/Runtime orchestration；
- `application/` 正式承载现有 Triage / Project / Issue / Workspace use cases，并且不直接依赖 raw Markdown / Obsidian；
- Persistence contract、Source Sync、Runtime final shape 与 Architecture owner 对齐，不依赖 duck typing 或 flat compatibility alias；
- Initiative / Milestone / Cycle / Projectless Issue 等 RESERVED future owner 与已冻结 type/schema contract 仍然清晰，未为了减 LOC 被抹掉；
- `main.ts` 只保留 plugin lifecycle、composition 与 host registration；
- active mechanism tests 跟随 canonical owner，技术选型 spike / 重复 evidence 退出 active suite；
- lint/type/test guard 能阻止关键反向依赖、旧 owner import 与重复 path authority重新出现；
- `npm run check`、`npm run build:diagnostics`、`git diff --check` 通过；
- 代表性真实 Obsidian 主链与 Development Diagnostics trace 继续干净；
- README、Implementation Architecture、Implementation Plan 与真实代码事实一致；
- checkpoint commit / push / GitHub review / CI 完成。

### 4.5 最终 Slice：Simplification Exit

**Tests / Tooling / Stage-language Cleanup 已完成。** 本轮完成的长期收口包括：

- active technology-selection evidence 退出测试主链；`mdast-util-from-markdown` 与 Zustand 继续由正式 Markdown Core / Runtime Store consumer 使用，不以独立 spike test 证明库本身；
- ESLint 增加关键 dependency-direction guard，Architecture Guard 测试锁住 retired owner、active spike/benchmark、重复 managed-path authority 与 production migration-stage terminology；
- production source 的 `Formal` / `current slice` 等迁移阶段命名收敛为长期 `managed` / canonical owner 语义；Projects root 的生产文案也统一复用 `TRAIL_PROJECTS_PATH`；
- Exit audit 保留并恢复 `TrailRefreshController` 的两条独立并发风险证据：refresh 期间再次收到 managed event 必须重读，以及 external refresh 必须排在正在执行的 mutation 后面。

代码侧最终验证已通过：ESLint `--max-warnings 0`，49 个 test files / 191 tests，TypeScript typecheck、production build 与 `git diff --check` 全部成功。

代表性真实 Obsidian Exit 回归也已通过：Diagnostics build 下 Workspace 正常初始化；Quick Capture 的 Trail-controlled `Triage.md` 写入由 exact active-write token 抑制 host refresh；随后从外部修改 `Trail/Collections/Triage.md` 能进入 `refresh.external.enqueued` 并完成 `refresh.published`，UI 自动收敛。测试 Session 共 88 个已汇总事件，`warn/error = 0`；完整 trace 同时确认 Quick Capture 经过 optimistic → persistence verify → reconcile → `command.committed`。

Simplification Exit 本地与真实宿主验证已经完成；本 checkpoint 提交并推送后进行 GitHub / CI 终验。Codebase Simplification 至此关闭，下一净新增 Slice 进入 **Intake → Workflow / Triage Convert to Project**。

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
| Triage Accept | 已完成 | 新 identity、destination-first、optimistic / reconcile 与真实 host evidence 已建立，并完成新架构迁移 |
| **Implementation Architecture Re-baseline** | **已完成** | `9e12e32e870a2299023b64804e3070abe138eb0b` 已 push 并通过 GitHub 回查与 CI；full check、Diagnostics build、real-host regression 与 trace review 全部通过 |
| **Codebase Simplification** | **已完成** | 所有内部 Slice 与 Simplification Exit 验证已完成；49 test files / 191 tests、lint 0 warnings、production/Diagnostics build、real-host external refresh 与 clean Diagnostics trace 已验证；本 checkpoint push 后只做 GitHub / CI 终验 |
| **Intake → Workflow** | **当前** | 以 Triage Convert to Project 作为 Codebase Simplification 后的第一个净新增 Slice |
| V1 Exit | 待开始 | — |

Checkpoint 只记录稳定阶段边界，不追踪每个内部实现任务。

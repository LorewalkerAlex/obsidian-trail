# Trail Implementation Architecture

> 状态：Implementation Architecture Re-baseline 设计基线
> 最后更新：2026-08-14
> 上游 Product：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 上游 Logical Data Model：`docs/logical-data-model.md`
> 上游 Physical Model：`docs/markdown-physical-model.md`
> 上游 Technical Design：`docs/technical-design-baseline.md`
> 下游进度：`docs/implementation-plan.md`

## 1. 文档定位

本文把已经收口的 Product / Canonical Domain / Logical / Physical / Technical Design 投影为正式代码的模块 ownership、dependency direction、核心 contracts、标准调用路径与渐进实现边界。

本文不是新的产品或 Domain authority，也不重新定义 Markdown Physical Model。上游设计继续决定“Trail 应该是什么”；本文决定“代码如何长期承载这些已经确定的设计”。

Implementation Plan 只维护阶段、近期 Slice 和 checkpoint；具体实现必须同时满足上游设计与本文 architecture contract。

当前正式实现已经证明 Quick Capture、Triage Management、Workflow Entry、Triage Accept、global serial mutation queue、optimistic runtime、`Vault.process()`、authoritative reread/reconcile 和 Development Diagnostics 等能力可行。Re-baseline 的目标不是丢弃这些业务事实，而是把已经证明可用的逻辑迁移到更清晰、可复用、能够承载完整 Technical Design 的正式结构中。

## 2. Architecture Goals

Trail V1 的 implementation architecture 采用 **Modular Monolith + Functional Core / Imperative Shell + Ports & Adapters**。不新增服务端、数据库、事件总线或复杂框架。

核心目标：

1. 完整承载 Technical Design 已确定的 Initiative / Project / Milestone / Issue / Cycle、Configuration、Workspace State、Runtime、Mutation、Query、UI、Host、Diagnostics、Migration 与 Performance 边界。
2. 正常产品功能从 UI 到 persistence 再回到 Runtime 必须完整贯通，不以“后续再做”为理由留下半条主链。
3. 同一种机制只有一个 canonical implementation owner；业务 Feature 复用 capability，不复制 persistence、queue、reconcile、picker、board 等底层机制。
4. 当前个人本地场景按真实风险分配可靠性预算：高价值保护现在完成，低概率组合异常先使用统一 fail-closed / reload / error 边界，后续根据真实运行证据渐进细化。
5. 当前已知结构提前设计完整；明确 deferred 的库 API、视觉数值、阈值和低概率 recovery 细节保持可替换，不提前固化。

## 3. Cross-cutting Engineering Principles

### 3.1 Structural Completeness, Incremental Implementation

已经由 Canonical / Logical / Physical / Technical Design 确定的对象、carrier、页面与 capability 必须在 architecture 中拥有 owner 和 contract，即使当前尚未有用户入口。

例如 Runtime 从一开始就按以下完整 Entity universe 设计：

```text
Initiative
Project
Milestone
Issue
Cycle
```

未进入当前 Slice 的 behavior 可以保留 TODO / unsupported implementation，但不能让 architecture 假设这些对象不存在。

正式 TypeScript 中，已经冻结的结构优先成为可编译 type / interface；只有尚未冻结到足以成为正式 contract 的细节使用 TODO，而不是堆积 commented-out pseudo implementation。

### 3.2 Logic / Behavior / Capability Separation

前端与核心逻辑使用同一原则：**业务逻辑、业务行为、可复用能力分开**。

- **Logic**：纯规则与计算，例如 Domain validation、planner、status lifecycle、derived progress、filter / sort / grouping rule。
- **Behavior**：面向用户意图的 use case 或页面交互，例如 Accept Triage、Move Issue、Close Cycle、Project Board drop、Open Peek。
- **Capability**：可被多个 behavior 复用的机制，例如 mutation queue、persistence repository、runtime projection、picker、board primitive、modal、search helper、virtual list。

新增需求默认按以下顺序判断：

```text
能否通过已有 Logic + Capability 组合完成？
→ 否：是否只需扩展 / 修改已有 Logic？
→ 否：是否需要新增业务 Behavior？
→ 只有出现新的底层机制时，才新增 Capability。
```

因此代码复用不以“让所有东西长得一样”为目标，而以“相同机制只有一个 owner”为目标。

### 3.3 Capability Ownership & Reuse

一个共享 capability 对应：

```text
one canonical implementation
+
one canonical mechanism test suite
```

Feature 只保留自己的业务语义、输入映射和独立风险。

第二次真实出现相同机制时优先比较并抽取；不因为潜在未来需要提前建设通用 framework。

### 3.4 Independent-risk Testing / Evidence Reuse

底层机制一旦在所属层级充分证明，上层复用时不重复机械验证同一批行为。

```text
一次证明，按层复用；新增测试只覆盖新增语义和新增风险。
```

原子化不仅为了复用代码，也为了复用验证证据。

### 3.5 Full Functional Path, Coarse Failure Boundary

正常功能路径需要完整实现：

```text
UI Intent
→ Application Use Case
→ Planner
→ Mutation Plan
→ Optimistic Projection
→ Queue
→ Physical Planning
→ Persistence
→ Authoritative Reread / Validation
→ Runtime Reconcile
→ Confirmed UI
```

异常路径不要求一开始穷举所有组合。V1 至少有统一的大兜底：

```text
failure
→ stop / clear affected optimistic work
→ authoritative refresh
→ success: restore reliable runtime + report operation failure
→ failure: read-only error + explicit Data Issue
```

只对现实后果明显且成本低的风险增加专项保护，例如 cross-source destination-first 与一次 bounded compensation。

### 3.6 Proportional Reliability / Progressive Hardening

Trail 是单用户、纯本地、Markdown-first、串行 mutation 的个人插件。优先防止真实的数据丢失、错误覆盖和持久化损坏；不为极低概率的多重故障组合建设递归 recovery state machine。

Technical Design 中已经确定的 fault isolation、source reconciliation、validation scope 等能力继续存在于 architecture contract；V1 可以先采用更粗的 refresh / mutation availability policy。后续若真实运行证明某类问题频繁，再在既有 strategy / policy / executor 内细化，而不是重构主干。

### 3.7 Reuse Before Build, No Framework Inflation

依次优先：

```text
Obsidian / browser / host capability
→ mature focused library
→ thin Trail adapter
→ justified custom implementation
```

不建设 generic query DSL、universal Markdown AST editor、arbitrary transaction graph、schema-driven UI framework 或其他当前产品不需要的通用平台。

## 4. Authority and Dependency Model

正式 authority chain：

```text
Product Design
→ Canonical Domain
→ Logical Data Model
→ Markdown Physical Model
→ Technical Design
→ Implementation Architecture
→ Implementation Plan
→ Formal Implementation
```

Dependency direction：

```text
UI
↓
Application + Query
↓
Domain / Mutation / Runtime contracts
↓
Persistence contracts
↓
Markdown / Plugin-data mechanisms
↓
Host ports

Obsidian adapters implement ports upward.
Composition Root is the only layer allowed to know the whole graph.
```

禁止反向依赖：

```text
Domain      ✕ Obsidian / React / Markdown parser
Planner     ✕ React / Vault API
Runtime     ✕ Markdown parser / page component
Persistence ✕ Product page / UI behavior
Query       ✕ persistence mutation
UI          ✕ Vault / plugin data direct write
```

## 5. Target Module Ownership

以下是 ownership map，不要求当前立即创建所有空目录。只有出现实际实现内容时才落目录，但 owner 从本 architecture 起已经确定。

```text
plugin/src/
├─ domain/
│  ├─ model/
│  ├─ validation/
│  ├─ planning/
│  └─ rules/
│
├─ application/
│  ├─ initiatives/
│  ├─ projects/
│  ├─ milestones/
│  ├─ issues/
│  ├─ triage/
│  ├─ cycles/
│  ├─ configuration/
│  ├─ workspace/
│  └─ similarity/
│
├─ mutation/
│  ├─ plans/
│  ├─ coordinator/
│  ├─ queue/
│  ├─ physical/
│  └─ execution/
│
├─ runtime/
│  ├─ store/
│  ├─ projection/
│  ├─ reconcile/
│  ├─ ownership/
│  ├─ indexes/
│  └─ control/
│
├─ query/
│  ├─ derived/
│  ├─ shared/
│  └─ page-specific selectors
│
├─ persistence/
│  ├─ domain-sources/
│  ├─ plugin-data/
│  ├─ utility-sources/
│  └─ ports/
│
├─ markdown/
│  ├─ core/
│  ├─ schema/
│  └─ codecs/
│
├─ source-sync/
│  ├─ bootstrap/
│  ├─ discovery/
│  └─ refresh/
│
├─ ui/
│  ├─ shell/
│  ├─ pages/
│  ├─ entities/
│  ├─ interactions/
│  ├─ primitives/
│  ├─ patterns/
│  └─ design-system/
│
├─ adapters/obsidian/
├─ diagnostics/
├─ migration/
├─ performance/
└─ main.ts              # composition root / host registration only
```

Custom View 不拥有独立 query engine。它优先复用系统页面已经存在的 scope / filter / sort / group / derived / presentation capability，通过持久化参数重新组合；只有未来出现无法由现有能力覆盖的真实需求时，才新增 Custom View 专用 selector。

## 6. Authoritative State Universe

Trail 的 authoritative persistence 分成三类：Domain Data、Configuration、Workspace State。

```ts
interface TrailAuthoritativeState {
  readonly domain: TrailDomainState;
  readonly configuration: TrailConfigurationState;
  readonly workspaceState: TrailWorkspaceState;
}
```

### 6.1 Domain State

```ts
interface TrailDomainState {
  readonly initiativesById: ReadonlyMap<InitiativeId, TrailInitiative>;
  readonly projectsById: ReadonlyMap<ProjectId, TrailProject>;
  readonly milestonesById: ReadonlyMap<MilestoneId, TrailMilestone>;
  readonly issuesById: ReadonlyMap<IssueId, TrailIssue>;
  readonly cyclesById: ReadonlyMap<CycleId, TrailCycle>;
}
```

不建立 bloated `BaseEntity`。Core Entity 真正共享的只有 stable ID；generic dispatch 使用 implementation wrapper，而不是向 persisted record 强加 `kind` / `type` 字段。

概念：

```ts
type TrailDomainEntity =
  | { kind: "initiative"; value: TrailInitiative }
  | { kind: "project"; value: TrailProject }
  | { kind: "milestone"; value: TrailMilestone }
  | { kind: "issue"; value: TrailIssue }
  | { kind: "cycle"; value: TrailCycle };
```

### 6.2 Configuration State

Configuration 是 Planner、Validator、Query 的正式输入，不是 Settings UI 私有数据。

至少包括：

```text
Status definitions + category order/defaults
LabelGroups + Labels + registrations
Cycle defaults
Temporal / timezone policy
```

已批准但当前尚未实现的 configuration capability 应在对应 slice 中补充 concrete type，不提前发明未知字段。

### 6.3 Workspace State

至少包括：

```text
Custom Views
Favorites (authoritative ordered list)
Home composition
```

Home exact layout schema 仍属于 Technical Design 已明确 deferred 的交互细节；architecture 只冻结 persistence ownership 与消费边界。

## 7. Runtime Architecture

Runtime 分成 Committed、Indexes/Ownership、Pending Overlay、Control 四个职责。

```ts
interface TrailRuntime {
  readonly committed: TrailCommittedRuntime | null;
  readonly pending: readonly TrailPendingMutation[];
  readonly control: TrailRuntimeControl;
}

interface TrailCommittedRuntime {
  readonly revision: number;
  readonly authoritative: TrailAuthoritativeState;
  readonly ownership: TrailSourceOwnership;
  readonly indexes: TrailRuntimeIndexes;
}
```

### 7.1 Committed vs Effective

```text
Effective State
= Committed Runtime
+ ordered Pending TrailMutationPlans
```

Committed 只表示已经由 authoritative persistence 确认的事实。Pending 是 ordered optimistic intent。hover、drag pointer、modal draft、selection 等 local UI state 不进入 Runtime。

### 7.2 Structural / Reference Indexes

Architecture 从一开始允许完整高价值 index：

```text
projectsByInitiativeId
milestonesByProjectId
issuesByProjectId
issuesByMilestoneId
issuesByCycleId
cyclesByIssueId
currentCycleId
entityRefsByLabelId
entityRefsByStatusDefinitionId
labelUsageCount
statusDefinitionsByCategory
labelGroupsByEntityType
```

只为稳定关系、referential integrity 或已证明的查询热点建立 index；不因字段存在就预建 index。

### 7.3 Source Ownership

Runtime 维护 logical ownership：

```text
entity → authoritative source path
source path → entity refs
```

不把 H2 offset、marker range、AST node 或 persistence fingerprint 泄漏进 Runtime。

### 7.4 Runtime Control

概念状态：

```text
loading
ready
refreshing
read-only-error
```

refreshing 时可显示 last-known-good committed state，但暂停 mutation。首次加载失败时 committed 可以为空。read-only-error 不伪造空 Workspace。

## 8. Validation Architecture

Validation 保留 Physical Model 已确定的完整层级：

```text
Physical Validation
→ Field Validation
→ Domain Validation
→ Reference Validation
→ Workspace Validation
```

- Physical / Field：由 Markdown codec / plugin-data repository owner。
- Domain：由 Domain validation owner。
- Reference：验证 stable references、scope、applicability。
- Workspace：验证 duplicate identity、max one Open Cycle、configuration defaults 等 workspace-wide invariants。

统一 issue 至少保留 stage、severity、code、message 与 scope。scope 能表达 workspace、configuration、source、entity，以便未来细化 fault isolation。

V1 mutation availability policy 可以粗粒度：出现 blocking validation error 时全局暂停 mutation。Technical Design 的更细 source / record isolation 不从 architecture 删除；未来只需细化 availability / refresh policy，而不重构 Validator、Repository、Runtime 或 UI 主链。

## 9. Persistence Carrier Architecture

Persistence 不做万能 `Repository<T>`。三种 carrier 分开建模，共享真正的底层能力。

```text
Domain Markdown
├─ Initiative files
├─ Project files
├─ Triage.md
├─ Projectless Issues.md
└─ Cycles.md

Plugin data.json
├─ Configuration
└─ Workspace State

Utility Markdown
└─ Weekly Update.md
```

普通 Obsidian Markdown 不属于 Trail authoritative persistence。

### 9.1 SourceIO

`SourceIO` 是非常薄的 Obsidian Vault port：

```ts
interface SourceIO {
  read(path: string): Promise<string>;
  process(path: string, transform: (latest: string) => string): Promise<void>;
  create(path: string, content: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  delete(path: string): Promise<void>;
  list(path: string): Promise<readonly SourceEntry[]>;
}
```

它不知道 Project、Issue、Triage、Runtime 或 React，不提供 retry tree。

### 9.2 PluginDataIO / Repository

Plugin `data.json` 使用独立 port：

```ts
interface PluginDataIO {
  load(): Promise<unknown>;
  save(data: unknown): Promise<void>;
}
```

`PluginDataRepository` 负责 parse / validate `configuration` 与 `workspaceState`，以完整合法 snapshot 为 normal write unit。个人本地规模下不需要 incremental JSON patch engine。

### 9.3 Markdown Core

Markdown Core 只拥有共享结构机制：

```text
parse structural headings / frontmatter
find section / record / range
insert record
replace record
remove record
replace section body
preserve untouched bytes / line endings where practical
```

推荐“AST / parser 用于识别结构，source ranges 用于局部 mutation”；不建设 whole-document generic AST editor。

Markdown Core 不知道 Project status、Issue context 或 Cycle semantics。

### 9.4 Physical Schema Registry + Explicit Codecs

Registry 是 parser / serializer / validator / fixture 的 current schema source of truth，表达 field carrier、type、requiredness、canonical order、missing behavior、applicable structure。

显式 codec 至少对应：

```text
Initiative
Project
Triage
Projectless Issues
Cycles
```

共享 field / record mechanism，但不建设万能 schema DSL / `GenericTrailCodec`。Project、Triage、Cycles 的 structural grammar 保留显式语义。

### 9.5 DomainSourceRepository

Domain Markdown 的 canonical repository 组合 SourceIO + Registry + Codec + Markdown Core，统一负责：

```text
read
parse
validate
process latest snapshot
apply managed mutation
authoritative reread
return parsed source result
```

Application / Feature 不再各自实现 `Vault.process → reread → parse → verify`。

### 9.6 UtilitySourceRepository

Weekly Note 复用 SourceIO、Markdown Core、editor/error capability，但不进入 Domain Runtime、Domain Schema Registry、Mutation Plan 或 indexes。

## 10. Domain Source Snapshot and Reconciliation

Reader 输出不把“整个文件是否完美”简化成一个 boolean。Architecture 允许 source 内最小可信 fault domain，但 V1 error policy 可以较粗。

概念：

```ts
type DomainSourceReadResult =
  | {
      kind: "accepted";
      snapshot: DomainSourceSnapshot;
      issues: readonly TrailDataIssue[];
    }
  | {
      kind: "rejected";
      path: TrailSourcePath;
      issues: readonly TrailDataIssue[];
    }
  | {
      kind: "missing";
      path: TrailSourcePath;
    };
```

`accepted` 可以包含局部 issue；只有 file identity / core structure 已经不可信时才 rejected。未来细粒度 isolation 可以利用这些结构，V1 可以将任何 blocking issue 交给全局 mutation gate。

Runtime Reconciler 拥有：

```text
replaceDomainSource
removeDomainSource
replacePluginData
full rebuild
```

正常 Trail-controlled mutation 只 reconcile affected source；external unexpected change 的 V1 strategy 可以 full workspace reload。

## 11. Mutation Architecture

### 11.1 Semantic Command

Command 表达用户意图，例如：

```text
ChangeIssueStatus
MoveIssueToProject
AcceptTriageIssue
CompleteProject
AddIssueToCurrentCycle
DeleteLabel
ReorderFavorites
```

不使用 generic `PatchEntity(field, value)` 代替业务语义。

### 11.2 Command Normalization

进入 Planner 前固定：

```text
commandId
effectiveAt
new entity IDs
normalized user input
date-only → Timestamp resolution
```

Planner 不调用不确定的 clock / UUID generator。

### 11.3 PlanResult

```text
Ready(TrailMutationPlan)
NeedsInput(requiredInput)
Rejected(reason)
```

NeedsInput 在合法 plan 形成前返回，例如 Completed Issue 缺 Estimate；不先制造非法 optimistic state。

### 11.4 TrailMutationPlan

Implementation-level 顶层 plan 覆盖完整 authoritative universe：

```ts
interface TrailMutationPlan {
  readonly commandId: string;
  readonly intent: string;
  readonly preconditions: readonly TrailPrecondition[];
  readonly effects: readonly TrailStateEffect[];
  readonly affectedScope: TrailAffectedScope;
  readonly postconditions: readonly TrailPostcondition[];
}
```

Domain effects 使用三个原子最终状态变化：

```text
Create(Entity)
Replace(before → after)
Delete(Entity)
```

同一 Entity 在一个 plan 中只保留一个最终 effect；Plan 表达 logical delta，不记录 Planner 的内部步骤。

Configuration 与 Workspace State 当前可以使用 coarse-grained before → after replace。低频完整 replacement 优先于提前建立复杂 incremental patch model。

`intent` 只用于 semantic metadata / diagnostics，不作为 Runtime 或 persistence executor 的 behavior switch。

### 11.5 Preconditions and Postconditions

Precondition 主要保护 logical assumptions，而不是建设 per-entity MVCC：entity existence/equality、Project 是否仍能接受 work、Cycle 是否 Open、required definition 是否存在等。

External persistence change 主要由 refresh gate 处理，不要求每个字段 mutation 都维护独立 file fingerprint / version protocol。

Effect 的基础 postcondition 可由 plan builder 推导；全局 Domain / Workspace invariant 继续由 Validator 负责。

### 11.6 Pending Replay

Pending 保存 Prepared Command + Plan：

```text
Committed
+ Pending #1
+ Pending #2
→ Effective Planning State
```

前序 plan 失败时，可从最新 committed state 重新规划尚未执行的 prepared commands。effectiveAt、ID 和用户输入已经固定，因此 replan deterministic；不建设复杂 dependency graph。

### 11.7 Global Serial Queue

V1 保留一个 global serial mutation queue。UI optimistic interaction 不等待 queue，但 persistence 串行执行，避免在个人 Markdown 场景为吞吐量引入 lock manager / concurrent scheduler。

### 11.8 Physical Plan at Dequeue Time

Domain plan 立即用于 optimistic projection，但 `PersistenceTransactionPlan` 在真正 dequeue 时根据最新 committed Runtime、source ownership 与 Physical Model materialize。

这允许：

```text
#1 Create Project B
#2 Create Issue in optimistic B
```

#2 的业务 planning 能看到 B；#1 commit 后 #2 dequeue，Physical Planner 才解析到 B 的实际 source path，无需 command dependency graph。

## 12. Persistence Transaction Topologies

已知正常行为由三种 topology 覆盖；不建设 arbitrary transaction DSL。

### 12.1 Single Transaction

覆盖单一 authoritative carrier 的正常 mutation，例如 Issue field/status、Triage capture/edit/defer/delete、Project/Initiative create/edit、Cycle record update、ordinary Configuration/Workspace State update。

File-backed Initiative / Project title rename 可以作为同一 logical source transaction 的 readable filename projection。

### 12.2 Source Transition

覆盖 physical placement 跨 source 或 create-target-before-delete-source：

```text
Move Issue Project A → Project B
Projectless ↔ Project
Accept Triage
Convert Triage → Project
```

统一顺序：

```text
target operation
→ authoritative verify target
→ source destructive operation
→ authoritative verify source
→ reconcile
```

正常 Feature 只产生 logical effects，不自己实现跨文件顺序。

如果 source destructive step 失败，只尝试一次明确安全的 bounded compensation；仍无法安全收敛则停止猜测，authoritative reload 并报告 partial/error。

### 12.3 Integrity Batch

为已经由 Logical Model 确定但低频的 cross-carrier reference-integrity mutation预留，例如 Delete Label、destructive StatusDefinition replacement。

Architecture 只冻结这一 topology 和 owner，不提前建设 generic transaction graph。V1 首次实现此类 capability 时优先采用简单 staged execution，失败进入 authoritative reload / validation 大兜底。

## 13. Placement Architecture

`PlacementResolver` 只负责 Entity → physical placement：

```text
Initiative                         → Initiatives/<sequence> <title>.md
Project                            → Projects/<sequence> <title>.md
Milestone                          → owning Project source
Triage Issue                       → Collections/Triage.md
Workflow Issue + Project           → owning Project source
Workflow Issue + no Project        → Collections/Projectless Issues.md
Cycle                              → Collections/Cycles.md
```

Existing entity 优先使用 Runtime source ownership；new entity 根据 Domain relationship + Physical Model 解析目标。

不要把 Entity → source path 与 source → Markdown record range 合并成一个 universal `locate()`。

Initiative / Project filename allocation 使用一个小型 `FileBackedEntityPathAllocator`：运行时扫描合法 sequence → `max + 1` → sanitize readable suffix。不持久化 allocator，不建设 reservation / gap management。

## 14. External Persistence and Refresh Strategy

Architecture 保留 Source Synchronization / fault-scope 能力，但 V1 按个人真实风险使用粗策略。

### 14.1 Trail-controlled Normal Write

```text
Trail mutation
→ affected source write
→ authoritative reread affected source
→ parse / validate
→ incremental reconcile
```

这是正常高频路径，不因为异常兜底简单化而每次 full reload。

### 14.2 Unexpected External Change

当前个人场景中，用户正常不会手工修改 managed data；主要潜在来源是 Sync，且真实冲突窗口极小。因此 V1 可以：

```text
unexpected managed persistence event
→ Runtime refreshing
→ close mutation gate
→ full authoritative reload
→ validate
→ success: atomic replace committed + ready
→ failure: retain viewable LKG when possible + read-only-error
```

不为每个 field / record 提前实现 stale comparison、fingerprint、version vector 或复杂 merge。

未来如果真实运行证明 full reload 太慢或局部 external changes 高频，只需替换 / 细化 `RefreshStrategy` 与 `MutationAvailabilityPolicy`，复用现有 source scope、ownership、repository、validator、reconciler；主架构不变。

### 14.3 Trail-owned Host Events

Mutation execution scope 记录当前 Trail 正在修改的 affected paths。由这些写入触发的 Obsidian host events 不作为 unexpected external change 触发 full refresh，因为 executor 已负责 authoritative reread/reconcile。

不建设 causal event graph；如果后续真实 host 行为需要更细 suppression，再基于证据增加。

## 15. Query / Selector Architecture

V1 不建立 generic query engine。Read side：

```text
Effective Runtime
+ Now / Temporal Context
→ Derived Logic
→ page-specific selection / shared small helpers
→ stable IDs / grouped IDs / small summaries
→ UI
```

### 15.1 Derived Logic

Progress、Health、Due state、Attention、actual activity range 等由纯 derived capability 计算。第一版直接计算；只有 profiling 证明昂贵时才 materialize cache。

### 15.2 Shared Read Capabilities

共享真实重复能力：scope narrowing、filter、sort、group、fuzzy search。不要暴露 arbitrary boolean AST / SQL-like DSL。

### 15.3 Product Page Selectors

系统页面保留明确行为 owner：

```text
Home
Projects / Initiative focus
Project Workspace
Triage
Current / Historical Cycles
```

Board / List 只是同一 candidate set 的不同 presentation，不拥有第二份数据。

### 15.4 Custom View

Custom View 优先持久化参数并复用已有系统页面使用的 selection / derived / filter / sort / group / presentation capability。当前不创建独立 `CustomViewQueryEngine` 或默认专用 selector。

只有未来出现不能通过既有能力组合表达的真实需求时，才增加对应 Custom View specific logic。

### 15.5 Search

个人规模下优先 candidate narrowing + simple fuzzy matching；不提前建立 persistent inverted index。性能证据出现后可以在 search capability 内替换实现。

## 16. Application Architecture

Application 按业务区域组织，而不是按 CRUD 动词：

```text
initiatives
projects
milestones
issues
triage
cycles
configuration
workspace
similarity
```

Use Case 负责：normalize input → invoke pure Logic / Planner → submit to Mutation Coordinator。Application 不直接使用 Markdown、Vault API 或手工修改 Runtime。

允许一个薄的 composition facade 暴露各业务 service，但不把所有行为重新包进巨大 `TrailApplication` switch。

Create-time Similarity Guard 是可选 soft guard：在最终 create plan 前复用当前 Runtime 的 title/text/relation signals 提示少量候选；用户可以继续创建；不保存 duplicate relation，不进入 Domain invariant。

## 17. UI Architecture

UI 同样遵守 Logic / Behavior / Capability separation。

```text
ui/
├─ shell/
├─ pages/
│  ├─ home/
│  ├─ projects/
│  ├─ triage/
│  └─ cycles/
├─ entities/
├─ interactions/
├─ primitives/
├─ patterns/
└─ design-system/
```

页面负责 product composition；Entity component 负责稳定视觉表达；interaction capability 负责跨页面复用的行为机制；primitive / pattern 负责 Button、Popover、Picker、Peek、BoardColumn 等真正共享机制。

不建设万能 `GenericEntityCard` / schema-driven form framework。

### 17.1 Continuous / Discrete / Input

- Continuous：scroll / drag / resize / hover / animation 保持 local UI state；drop 后才发 semantic Command。
- Discrete：Status / Priority / Complete / Accept / Add Cycle 等发 Application Use Case，立即 optimistic。
- Input：typing 保持 local draft；Save / Enter 提交一个 semantic mutation。

### 17.2 Shared Interaction Capabilities

可复用 `useTrailAction` 类机制统一处理 use case result、NeedsInput、pending/error presentation；Feature-specific Picker / Modal 决定具体输入 UI。

同一 Entity 在 Home、Project、Cycle、Peek 中都通过 ID 读取 Effective Runtime，不在各页面复制自己的 Entity state。

### 17.3 Picker / Board / Peek

Property Picker 共享 keyboard/search/popover/selection mechanism，但候选与业务规则由各自 selector / application logic 提供。

Board primitive 可以服务 Project Board 与 Cycle Board；Project/Cycle 仍保留各自 product composition，不用几十个参数做 universal board framework。

Peek / Modal 使用同一 Entity ID；编辑 draft 本地保存，提交 semantic mutation。

### 17.4 Virtualization / Responsive / Design System

Virtualization 是可替换 rendering capability，优先用于长列表 / search / history，不默认用于普通 Board。具体库和 threshold 按 benchmark 决定。

当前不做 mobile，但 narrow Obsidian pane 是正式 desktop requirement，layout capability 从一开始允许 wide / compact / narrow presentation。

Design System 层级：

```text
Tokens
→ Primitives
→ Entity Components
→ Composite Patterns
→ Page Composition
```

Trail UI 与 Obsidian Shell Theme 共用同一 token/theme ownership；exact visual values 仍按后续 UI slice 收口。

## 18. Bootstrap / Synchronization / Host

### 18.1 Bootstrap

统一 Bootstrap 在 Obsidian layout ready 后运行：

```text
load plugin data
→ discover Domain sources
→ read / parse / validate
→ reference + workspace validation
→ build ownership + indexes
→ publish Committed Runtime
→ ready
```

UI bootstrap 前只显示 loading shell，不让各页面自行初始化数据。

Fresh installation 与 initialized workspace missing required singleton 必须区分。Fresh 可以 explicit bootstrap；已初始化后缺失 Triage / Projectless Issues / Cycles 等 required source 是 Data Issue，不静默补空文件。Weekly Update lazy-created，不是 bootstrap prerequisite。

### 18.2 Refresh Strategy

Architecture 对 host create/modify/delete/rename 提供统一 RefreshController。V1 external path 使用 FullWorkspaceRefreshStrategy；未来可以替换为 affected-source refresh，不改变上层。

### 18.3 Obsidian Adapter

Obsidian 只通过 ports 暴露：Vault I/O、plugin data、workspace/layout lifecycle、commands、views、file events。

`main.ts` 最终只承担 composition root 与 host registration，不承载 Domain / persistence / page behavior。

## 19. Weekly Note Utility

Weekly Note 不是 Domain Data，也不进入 Trail Runtime / Mutation Plan / Domain Schema Registry。

```text
WeeklyNote UI Behavior
→ WeeklyNote Service
→ UtilitySourceRepository
→ SourceIO + Markdown Core
```

它复用 editor、Modal、guarded single-file mutation、error presentation 等 capability，但保持 utility ownership。

## 20. Diagnostics / Observability

Development Diagnostics 是统一技术观察能力：

```text
command
planning
pending
queue
physical planning
persistence
verification
reconcile
refresh
compensation / failure
```

通过 command/correlation identity 连通链路。Feature 不各自 `console.log`。Diagnostics 不进入 Canonical Domain、Product Activity Log 或 Event Sourcing；production 默认关闭 / 排除详细 trace。

## 21. Migration Architecture

Breaking Physical Schema migration 与正常 product mutation 分离：

```text
explicit preflight
→ migration plan
→ transform
→ full validation
→ current-schema runtime
```

Migration 可以复用 SourceIO、PluginDataIO、Codecs、Validation、Diagnostics，但不经过 normal optimistic Runtime / user mutation flow。

第一次真实 breaking schema 出现前只保留 owner / contract TODO，不提前设计未知 version protocol 或 dual parser。

## 22. Performance Architecture

V1 默认：

```text
full in-memory Runtime
full cold rebuild
per-source normal reconcile
small structural/reference indexes
global serial mutation queue
page selectors
ordinary React rendering
```

Performance capability 先提供 benchmark / profiling ownership，再按证据增加 derived cache、virtualization、persistent cache、worker 或其他机制。

优化不能反向改变 Domain / Logical semantics，也不能把 cache 变成第二份 authoritative truth。

## 23. Testing Ownership

测试按 capability ownership 分层：

```text
Domain / Planner
→ business rules, invariants, PlanResult / Effects

Markdown Core
→ structural/range mechanisms

Codec / Schema
→ source-specific grammar and field mapping

Repository / Host Adapter
→ process/create/read/reparse contract

Runtime
→ projection, source reconcile, indexes, pending replay

Mutation Executor
→ single / transition / integrity topology

Application Feature
→ semantic command → correct plan / wiring

UI
→ real interaction behavior and presentation contract

Real Obsidian
→ representative independent host mechanisms / failure modes only
```

不按每个字段/按钮重复已经在 capability owner 层证明的 host/persistence failure behavior。

V1 正常功能测试需要完整覆盖主链；异常测试覆盖独立 failure boundary，不追求组合爆炸。

## 24. Current Implementation → Target Ownership

现有 Formal code 是 migration input，不是 Target Architecture authority。代表性映射：

```text
trail-issue.ts / trail-project.ts
→ domain/model

trail-configuration.ts
→ configuration model + plugin-data contracts

trail-triage-plan.ts / trail-workflow-plan.ts
→ domain/planning + canonical TrailMutationPlan

trail-triage-intake.ts
trail-triage-management.ts
trail-workflow-entry.ts
trail-triage-accept.ts
→ application use cases + pure planners + shared mutation coordinator/executors

trail-runtime.ts
→ runtime/store + projection + reconcile + ownership + indexes + control

trail-managed-markdown.ts
→ markdown/core shared structure

trail-triage-markdown.ts
trail-project-markdown.ts
trail-project-issue-delete.ts
→ explicit codecs using shared Markdown Core / Registry

trail-triage-persistence-obsidian.ts
trail-workflow-persistence-obsidian.ts
→ Obsidian SourceIO adapter + DomainSourceRepository

trail-mutation-queue.ts
→ keep as canonical global serialization capability, migrate ownership without rewriting proven semantics unnecessarily

trail-application.ts
→ thin application composition / business-area services

trail-app.tsx
→ page / entity / interaction / primitive split

trail-view.tsx
→ thin Obsidian view adapter

main.ts
→ composition root / host lifecycle

diagnostics/*
→ keep as canonical development observability capability, adapt event taxonomy to new shared lifecycle
```

Triage Accept 保留已经验证的业务 mapping、new identity、destination-first order 和 bounded compensation evidence，但旧 feature-specific service/executor shape 可以重写为共享 Source Transition mechanism。

## 25. Re-baseline Implementation Sequence

Architecture code migration 不按“每个 Feature 再重写一遍底层”推进，而按 capability owner 建立后迁移已经证明的业务逻辑。

```text
A. Architecture Contract
   - canonical module / dependency / contract baseline

B. Markdown + Persistence Foundation
   - Markdown Core
   - Physical Registry / explicit Codecs
   - SourceIO / PluginDataIO
   - Domain / Plugin-data repositories

C. Runtime + Mutation Foundation
   - complete Runtime state/index/control shape
   - generic Create/Replace/Delete projection
   - TrailMutationPlan / coordinator
   - Physical Planner
   - Single / Source Transition executors
   - global queue reuse

D. Existing Formal Behavior Migration
   - Quick Capture
   - Triage Edit / Defer / Delete
   - Project Create
   - Workflow Issue Create / lifecycle
   - Triage Accept

E. UI + Test Ownership Cleanup
   - split current Formal UI by product/interaction/capability
   - relocate mechanism tests to canonical owners
   - delete true duplicates only after evidence is preserved

F. Re-baseline Validation / Exit
   - focused integration
   - full npm run check once at coherent cutover
   - representative real Obsidian host regression
   - docs calibration
   - commit / push / GitHub re-verification
```

Re-baseline 完成前不继续增加 net-new user-facing Feature。完成后重新进入 Intake → Workflow，第一项 net-new Slice 是 Triage Convert to Project。

第一条适合用于验证新 architecture 的既有业务路径优先选择 Triage Edit / Defer / Delete：它能验证 Entity → Planner → optimistic Replace/Delete → same-source mutation → reread/reconcile，同时没有 create-source / multi-source 独立复杂度。随后迁移 Quick Capture、Workflow single-source path，最后用 Triage Accept 证明共享 Source Transition。

## 26. Architecture Exit Criteria

Implementation Architecture Re-baseline 只有同时满足以下条件才退出：

1. 上游 Product / Domain / Logical / Physical / Technical Design 中已确定的正常 V1 capability 都在 architecture 中有明确 owner / contract / extension point。
2. 正常 read/write/bootstrap/refresh path 可以贯通，不依赖 Feature-specific persistence stack。
3. Initiative / Project / Milestone / Issue / Cycle、Configuration、Workspace State 能自然进入同一 Runtime/Mutation architecture，不需要未来修改主干 ownership。
4. Custom View 复用现有 read/presentation capability，不提前形成第二套 query system。
5. 当前已验证 Formal behaviors 在新 architecture 上重新通过自动化与代表性真实 Obsidian验证。
6. 共享机制测试归位，Feature 不再重复验证相同底层 failure path。
7. V1 exception handling 有统一 fail-closed boundary；细粒度 hardening 可以通过 strategy / policy / executor 内部增强，而不要求主干重构。
8. `npm run check` 在 coherent cutover 时完整通过一次；production Diagnostics boundary 保持成立。
9. README、Implementation Plan、Architecture 文档与实际代码状态一致，并完成 push 后 GitHub review。

## 27. Closeout

本文冻结的是 implementation structure 与 ownership，不冻结所有未来细节。

未来新需求默认先问：

```text
能否复用已有 Capability？
能否通过新增/修改 Logic 表达？
是否只需要新增 Behavior 进行组合？
是否真的出现了一个新的底层机制？
```

只要正常 Feature 可以主要通过“新增业务逻辑 / 行为 + 复用既有能力”落地，并且 reliability / performance 的增强主要是已有 policy / strategy / executor 的细化，而不是推倒主干，这套 Architecture 就达到了目标。

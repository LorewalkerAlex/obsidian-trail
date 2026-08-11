# Trail Logical Data Model

> 状态：Logical Data Model 已收口
> 最后更新：2026-08-11
> 上游 Product Design：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 交付基线：`poc/plugin-shell @ ec43eae70b828c7f9888fd71b7d80847ba14624e`
> 下一阶段：Markdown Physical Model

## 1. 文档定位

本文把已经冻结的 Product Design / Canonical Domain 转换为实现无关的 Logical Data Model。

本文决定：

- 哪些持久化内容属于 Domain Data、System / Domain Configuration、User Workspace State 或 Runtime / Derived；
- Core Records 的 logical fields、references、nullability 和 cross-record invariants；
- stable identity 与 canonical relationship direction；
- minimal historical facts；
- temporal logical contract；
- Query Contract；
- Action / Mutation logical contract；
- configuration replacement 与 reference integrity。

本文不决定：

- Markdown 文件数量、目录、文件名；
- frontmatter / body block / property / tag / wikilink 的具体编码；
- UUID 实际格式；
- JSON / YAML / Markdown / Obsidian plugin data 的最终载体；
- TypeScript interface / class 细节；
- parser / writer / mutation queue / optimistic UI / reconciliation 实现。

## 2. Persistence Roles

Trail 的持久化状态分为三类 authoritative state；Runtime / Derived 为可重建状态。

```text
Persistent State

A. Domain Data
├─ Initiative
├─ Project
├─ Milestone
├─ Issue
└─ Cycle

B. System / Domain Configuration
├─ StatusDefinitions
├─ Workflow defaults
├─ LabelGroups
├─ Labels
├─ LabelGroup registrations
├─ Cycle default end rule
├─ timezone
└─ other singleton behavior defaults

C. User Workspace State
├─ Custom Views
├─ Favorites
└─ Dashboard / page composition

Runtime / Derived
├─ reverse / bidirectional indexes
├─ current-cycle lookup
├─ progress / health / attention
├─ actual activity timelines
├─ due-soon / overdue / reminders
├─ query result caches
└─ other rebuildable materialized views
```

### 2.1 Domain Data 的判定

Domain Data 具有业务历史连续性：新实例不能覆盖旧实例，旧实例本身仍然是当前或历史业务事实。

例如：创建一个新 Issue 或新 Cycle 不能覆盖旧 Issue / Cycle。

### 2.2 Configuration 的判定

Configuration 描述 Trail 当前如何定义、约束或默认执行行为。它可以包含多个 entry，也可以有 stable reference ID，但旧配置版本本身不要求永久保留历史连续性。

例如：

- 可以把一个 StatusDefinition rename；
- 可以删除 / 替换 Label；
- 可以改变 default Status；
- 可以改变未来 Cycle 创建时的 default end rule。

配置可以整体或局部替换，但替换完成后的 Configuration + Domain Data + User Workspace State 必须满足 reference integrity。

### 2.3 User Workspace State 的判定

Custom View / Favorite / Dashboard composition 更像 Saved Search、Bookmark、Pinned navigation 和 Workspace layout。

它们由用户频繁创建、修改、删除，不是 Trail 的系统行为规则，也不是有业务历史连续性的 Core Domain Data。

## 3. Stable Identity

### 3.1 Core Entity IDs

以下 Core Entities 都使用 stable opaque immutable ID：

- Initiative
- Project
- Milestone
- Issue
- Cycle

ID 在 Workspace 内唯一。Title、name、Markdown path、container location 都不是 identity。

### 3.2 Configuration Entry IDs

以下 Configuration entries 也使用 stable IDs，因为 Domain Data / Workspace State 会引用它们：

- StatusDefinition
- LabelGroup
- Label

这里的 ID 是 **configuration reference identity**，不意味着配置 entry 具有业务历史连续性。

### 3.3 User Workspace State IDs

Custom View 需要 stable ID，以支持 rename 后仍被 Favorite / Dashboard module 等稳定引用。

Favorites 列表项本身不要求独立 ID。

### 3.4 Workspace Identity

V1 Workspace 是隐式 singleton boundary：

- 不要求普通 WorkspaceRecord；
- 不要求所有记录重复 `workspaceId`；
- 未来若真实出现 multi-workspace requirement，再扩展 identity / partition contract。

## 4. Canonical Relationship Direction

每个关系只保存一个 authoritative direction。Inverse collections 由 Runtime Store 建立，不保存第二份 authoritative truth。

普通结构关系使用 child → parent：

```text
Project.initiativeId?
Milestone.projectId
Issue.projectId?
Issue.milestoneId?
```

因此不同时保存：

```text
Initiative.projectIds
Project.milestoneIds
Project.issueIds
Milestone.issueIds
```

### 4.1 Cycle Membership Exception

Cycle membership 是有意的例外：

```text
Cycle.issueIds
```

它保存在 Cycle 侧，因为 Closed Cycle 需要保留最终 membership 作为最小历史事实。

Issue 不保存单一 `cycleId`，否则 Issue 进入新 Cycle 时会覆盖旧 Cycle 的历史 membership。

Runtime 可以同时建立：

```text
issuesByCycleId
cyclesByIssueId
currentCycleId
```

这些都必须可从 authoritative state 重建。

## 5. Minimal Entity Record Principle

Core Entities 只共享真正共同的 `id`。不建立 bloated `BaseEntity` / `BaseRecord`。

除非出现明确产品价值，V1 不自动增加：

- type
- createdAt
- updatedAt
- deletedAt
- version
- sourcePath
- fingerprint

其中 version / fingerprint 属于后续 persistence / concurrency implementation；Deleted 不是 normal lifecycle；created / updated timestamps 只有出现真实 query / product requirement 后再加入。

## 6. Domain Data Records

### 6.1 InitiativeRecord

```text
InitiativeRecord {
    id: InitiativeId

    title: NonEmptyText
    description?: Text

    priority?: Priority
    due?: TemporalValue
    labelIds: Set<LabelId>
}
```

约束：

- `labelIds` 只能引用 Initiative 已注册 LabelGroup 下的 Labels；
- Single LabelGroup 同一 Initiative 最多一个 Label；
- 不保存 projectIds；
- 不保存 Status、Progress、Health 或 timeline timestamps。

### 6.2 ProjectRecord

```text
ProjectRecord {
    id: ProjectId

    title: NonEmptyText
    description?: Text

    statusDefinitionId: StatusDefinitionId
    initiativeId?: InitiativeId

    priority?: Priority
    due?: TemporalValue
    labelIds: Set<LabelId>
}
```

约束：

- `statusDefinitionId` 必须引用 Project entityType 的 StatusDefinition；
- `initiativeId` optional；
- 不保存 issueIds / milestoneIds；
- 不保存 startedAt / completedAt / closedAt / terminalAt；
- 不保存 Progress / Health / actual timeline。

Project Status 是用户 lifecycle judgment，不等于 actual work activity time。

### 6.3 MilestoneRecord

```text
MilestoneRecord {
    id: MilestoneId

    title: NonEmptyText
    description?: Text

    projectId: ProjectId
    due?: TemporalValue
}
```

约束：

- `projectId` required；
- 正常 mutation 不支持跨 Project reparent；
- 不保存 issueIds；
- V1 不保存 labels / priority / estimate / status；
- completion / progress / actual timeline 全部派生。

### 6.4 IssueRecord

```text
IssueRecord {
    id: IssueId

    title: NonEmptyText
    description?: Text

    context: Triage | Workflow
    statusDefinitionId?: StatusDefinitionId

    projectId?: ProjectId
    milestoneId?: MilestoneId

    priority?: Priority
    estimate?: Estimate
    due?: TemporalValue
    labelIds: Set<LabelId>

    firstStartedAt?: Timestamp
    terminalAt?: Timestamp
}
```

#### Context / Status

```text
context = Triage
→ statusDefinitionId = null

context = Workflow
→ statusDefinitionId required
```

Accept 是 context + status 的 composite mutation；不能提交 `Workflow + null status` 的中间非法状态。

#### Project / Milestone

- `projectId = null` → `milestoneId = null`。
- `milestoneId != null` → referenced Milestone.projectId 必须等于 Issue.projectId。
- Move Issue to another Project 时，旧 Milestone 必须在同一 logical mutation 中清除或替换。

#### Estimate

- optional while non-Completed；
- StatusCategory = Completed 时 required；
- Completed 期间不能 clear，但可以改为另一个 legal Estimate。

#### Labels

当前 Issue 可以使用所有注册给 Issue Entity Type 的 LabelGroups；Single / Multiple 规则在最终 record graph 上必须成立。

#### firstStartedAt

- 第一次从非 Started 进入 Started Category 时设置；
- 一旦设置不因 reopen 重置；
- Started Category 内部 StatusDefinition 变化不修改。

#### terminalAt

表示当前 terminal Category 的进入时刻：

- non-terminal → Completed / Canceled：设置 now；
- terminal → non-terminal：清空；
- 同一 terminal Category 内具体 StatusDefinition 切换：保留；
- Completed ↔ Canceled：更新为新的 terminal entry time；
- 不保存 earlier terminal history / reopen count。

### 6.5 CycleRecord

```text
CycleRecord {
    id: CycleId

    startedAt: Timestamp
    plannedEnd: TemporalValue   // precision = day
    endedAt?: Timestamp

    issueIds: Set<IssueId>
}
```

语义：

- `endedAt = null` → Open / Current Cycle；
- `endedAt != null` → Closed / Historical Cycle；
- Workspace invariant：最多一个 `endedAt = null` 的 Cycle；
- `startedAt / endedAt` 是实际 lifecycle boundary facts；
- `plannedEnd` 是该 Cycle 创建时最终确认的计划结束日期，不是 global default rule；
- Open Cycle 的 issueIds 是当前 planning focus，可增删；
- Closed Cycle 的 issueIds 是 final membership，正常 planning mutation 不再改变；
- destructive referential-integrity operation（例如 Delete Issue）可以清理 dead reference，但这不是重新编辑历史 planning membership。

## 7. System / Domain Configuration

System / Domain Configuration 是 singleton configuration domain，可以物理存放在 Obsidian plugin settings、独立 config 文件或其他适合的唯一配置载体中；Physical Model 再决定具体方案。

### 7.1 StatusDefinitionRecord

```text
StatusDefinitionRecord {
    id: StatusDefinitionId
    name: NonEmptyText

    entityType: Project | Issue
    category: StatusCategory
}
```

固定 `StatusCategory`：

```text
Backlog | Unstarted | Started | Completed | Canceled
```

规则：

- Project / Issue 各自使用自己的 concrete definitions；
- rename 只修改 display name；
- Entity record 只引用 ID，不复制 name / category；
- Category 语义变化不是普通 rename，必须作为会影响引用 Entity invariants 的 configuration mutation 处理。

### 7.2 Workflow Defaults

```text
WorkflowDefaults {
    issue: {
        Backlog: StatusDefinitionId
        Unstarted: StatusDefinitionId
        Started: StatusDefinitionId
        Completed: StatusDefinitionId
        Canceled: StatusDefinitionId
    }

    project: {
        Backlog: StatusDefinitionId
        Unstarted: StatusDefinitionId
        Started: StatusDefinitionId
        Completed: StatusDefinitionId
        Canceled: StatusDefinitionId
    }
}
```

每个 Entity Type / Category 至少有一个 StatusDefinition，并指定恰好一个 default。

Default 用于 category-level shortcut：Complete、Cancel、Start、Move to Backlog 等。修改 default 只影响未来 mutation；已有 Entity 的 `statusDefinitionId` 不被批量重解释。

### 7.3 LabelGroupRecord

```text
LabelGroupRecord {
    id: LabelGroupId
    name: NonEmptyText

    selectionMode: Single | Multiple
    registeredEntityTypes: Set<EntityType>
}
```

当前允许注册：

```text
Initiative | Project | Issue
```

架构允许未来扩展其他 Entity Type，但 V1 Milestone 不使用 Trail Labels。

### 7.4 LabelRecord

```text
LabelRecord {
    id: LabelId
    name: NonEmptyText
    groupId: LabelGroupId
}
```

Label 不重复保存 registeredEntityTypes / selectionMode / groupName。

### 7.5 Cycle Configuration

```text
CycleConfig {
    defaultEndRule: EndOfNextWeek
}
```

`EndOfNextWeek`：

- calendar week = Monday ... Sunday；
- 取 start 所在周之后的下一自然周 Sunday；
- Monday start 时，从该 Monday 到 next-week Sunday 共 14 个 calendar days；
- mid-week start 仍落到 next-week Sunday，不是固定 `start + 14 days`。

该规则只计算创建 UI 的 suggested end。用户确认 / 修改后，具体 timestamp+day precision 保存到 `CycleRecord.plannedEnd`。

修改 `defaultEndRule` 不回写已存在 Cycle。

### 7.6 Temporal / Timezone Configuration

```text
TemporalConfig {
    displayTimezone = Asia/Shanghai
    ...future temporal presentation / notification policies
}
```

默认 calendar interpretation / display timezone 为东八区，使用 `Asia/Shanghai` 语义表达。

Reminder / notification policy 可以存在于 configuration，但不因此向 Entity 增加 Reminder field。

## 8. Temporal Logical Contract

### 8.1 Unified Timestamp Foundation

底层 temporal value 统一使用标准 timestamp 作为时间基准，不为 date-only / datetime 分裂两套底层存储模型。

当用户输入精度需要保留时，逻辑值为：

```text
TemporalValue {
    timestamp: Timestamp
    precision: day | hour | minute | second
}
```

具体 timestamp 的物理编码（epoch / ISO string / offset representation）留给 Physical Model。

### 8.2 Precision

Precision 保存用户或字段原本的 temporal granularity，避免把“只选某一天”和“明确选择当天 00:00”混成同一意图。

实际 lifecycle facts，例如 `firstStartedAt / terminalAt / Cycle.startedAt / endedAt`，字段语义本身已经是 real instant，可以直接使用 Timestamp；UI 可按场景显示到秒、分、时、日。

`Due` 和 `Cycle.plannedEnd` 使用 TemporalValue，以保留用户选择的粒度；当前 `plannedEnd.precision = day`。

### 8.3 Timezone

真实 Timestamp 表示 absolute time；展示和 calendar calculation 通过统一 timezone resolver 处理。

默认 timezone：`Asia/Shanghai`。

Day/hour 等 calendar-granularity value 必须按 Trail configured timezone 解释，不能因浏览器 / OS 临时时区变化而意外漂移到前一天或后一天。

### 8.4 Derived Temporal Values

不持久化：

- duration
- overdue
- dueSoon
- actual Project / Initiative / Milestone timeline
- reminder / nextReminderAt / shouldNotify

这些都由 timestamps + precision + timezone + configuration + now 计算。

## 9. Due / Snooze / Reminder Data Contract

### 9.1 Due

Due 是 Entity 当前 user-authored temporal fact。逻辑层只保存一个 `due`；产品上下文决定 presentation / action semantics。

### 9.2 Snooze

不保存：

```text
snoozedUntil
isSnoozed
snoozeState
```

Snooze / Defer 是 `SetDue` / `MoveDue` 的产品 shortcut。

例如：

```text
Snooze to Monday
→ Issue.due = Monday
```

Triage 的排序、弱化、隐藏 / reveal、重新进入 attention 都由 Query + presentation + now 对同一 due 进行解释。

### 9.3 Reminder

不保存：

```text
reminderAt
ReminderEntity
ReminderHistory
```

Reminder / notification 由：

```text
Temporal fact + reminder policy + now
```

动态计算。

独立随手提醒通过普通 project-less Issue + Due（可再加 Label / Custom View）表达，不创建特殊 Reminder Domain。

## 10. User Workspace State

### 10.1 CustomViewConfig

Custom View 是 saved query + presentation：

```text
CustomViewConfig {
    id: CustomViewId
    name: NonEmptyText

    query: QuerySpec
    presentation: PresentationSpec
}
```

Custom View 可以频繁创建、修改、删除；旧版本没有默认历史保留要求。

具体 PresentationSpec 的 Board / List / Table / Calendar 等 schema 留给 UI / Interaction / Technical Design；Logical Model 只冻结 query 与 presentation 分离。

### 10.2 FavoritesState

Favorites 类似 bookmark / pin：

```text
FavoritesState {
    entries: OrderedList<FavoriteReference>
}

FavoriteReference {
    targetType
    targetId
}
```

FavoriteReference 是 polymorphic reference，因此需要 targetType + targetId。

Favorite 不是 Entity 的 `favorite=true` 字段；目标 Entity / Custom View 不需要知道自己是否被收藏。

### 10.3 Dashboard / Page Composition

Dashboard composition 属于 User Workspace State，而不是 Dashboard 私有业务数据。

其具体 ModuleConfig / layout schema 后置到 Interaction / UI architecture；Logical Model 只冻结：

- composition 可以持久化；
- Module / Widget 尽量与其他页面共享；
- Dashboard 不拥有专用 Domain Data / Query engine。

## 11. Runtime Query Contract

所有页面 / View 优先通过同一 Runtime Query 能力工作：

```text
QuerySpec {
    entityType
    where?
    sort?
    group?
}
```

`scope` 不单独成为另一套 Domain 概念；Project / Cycle / Triage scope 都可以表达为 query condition。

例：

```text
Project page
entityType = Issue
where projectId = CurrentProject
```

```text
Current Cycle
entityType = Issue
where belongsToCycle = CurrentCycle
```

```text
Triage
entityType = Issue
where context = Triage
```

### 11.1 Query Inputs

Query 可以消费：

1. Canonical Domain Facts，例如 projectId / milestoneId / priority / due / labels / estimate / context；
2. Configuration-resolved semantics，例如 statusCategory；
3. Runtime Derived Values，例如 overdue / dueSoon / attention / progress / actual activity range；
4. Runtime Context，例如 Now / Today / CurrentCycle / CurrentProject。

### 11.2 Dynamic Temporal Predicates

Saved query 应保存动态逻辑，不把“未来 7 天” materialize 成创建 View 当天的固定日期。

例如：

```text
due within next 7 days
due today
overdue
this week
next week
```

每次执行根据 now + timezone 重新计算。

### 11.3 Boolean / Field Predicates

Logical capability 至少支持：

- AND / OR / NOT；
- equals / not equals / in；
- exists / missing；
- before / after / range；
- suitable text / set predicates。

具体 AST / DSL / TypeScript representation 后置。

### 11.4 Sort / Group

Sort / Group 属于 read/query model，不是 Domain facts。

例如：

```text
Triage:
where context = Triage
sort due ascending, priority descending
```

Snooze 改 Due 后，Query result 自动重新排序，不需要额外 `snoozePosition`。

## 12. Action / Mutation Logical Model

Trail 不使用 Event Sourcing。Action / Mutation 自身不作为 Product Data 持久化。

```text
Action
= user intent

Mutation Plan
= 为实现该 intent 需要改变的一组 canonical facts / configuration / workspace-state references

Committed State
= mutation 完成后的合法 authoritative graph
```

### 12.1 Global Mutation Contract

每个 logical operation：

1. 读取 latest committed state；
2. 解析 Action intent；
3. 计算完整 Mutation Plan；
4. 验证 mutation 后整个 graph 满足 Field Contract / reference integrity；
5. 作为一个 logical atomic unit 提交；
6. Runtime indexes / queries 观察新 committed state。

不能把非法中间状态作为 committed state 暴露。

Optimistic UI、Mutation Queue、file locking、write compensation、reparse / verify 属于后续 Technical Design。

### 12.2 Simple Field Mutation

普通字段入口：

```text
SetTitle
SetDescription
SetPriority
SetEstimate
SetDue
SetLabels
```

Snooze / Pick Due / Move Due +1 day 都可以映射到 `SetDue`。

### 12.3 Status Mutation

```text
ChangeIssueStatus(issueId, targetStatusDefinitionId)
```

Domain 层根据 old / target StatusCategory 维护 lifecycle facts：

- first enter Started → set firstStartedAt if null；
- Started internal change → keep firstStartedAt；
- non-terminal → terminal → set terminalAt；
- terminal → non-terminal → clear terminalAt；
- same terminal Category internal change → keep terminalAt；
- Completed ↔ Canceled → set new terminalAt；
- entering Completed requires legal Estimate。

Category-level `Complete / Cancel / Start / Move to Backlog` 先解析对应 default StatusDefinition，再走相同 Status mutation。

### 12.4 Relationship Mutation

`MoveIssueToProject` 不能只改 projectId；如果旧 milestone 不属于 target Project，必须在同一 plan 中 clear / replace milestoneId。

### 12.5 Accept Triage

Accept 是 composite mutation：

```text
context: Triage → Workflow
statusDefinitionId: null → configured target normal Status
```

UI 可以提供 `Accept & Add to Current Cycle` convenience action，把 Accept 与 Cycle membership 修改组合成一个 atomic logical operation。

### 12.6 Cycle Mutations

Add Issue to Current Cycle：

- target Cycle 必须 Open；
- Issue.context 必须 Workflow；
- 只修改 Cycle.issueIds；
- 不自动修改 Issue Status。

Remove Issue：只移除 membership，不修改 Status。

Close Cycle：设置 `endedAt = now`；Closed Cycle issueIds 变成 final membership。

Create Next Cycle 是独立 user action；Close 后用户可以取消创建，留下没有 Current Cycle 的合法状态。

### 12.7 Project Complete / Reopen

Complete Project：

- 先验证当前 Project 没有 non-terminal Issues；
- 然后修改 Project Status 到 configured Completed default / selected Completed Status；
- 不写 Project completedAt。

Reopen Project：只改变 Project lifecycle Status，不批量修改 Issues。

## 13. Reference Integrity

Reference Integrity 跨越 Domain Data、System Configuration 和 User Workspace State。

例如删除 Label 时，必须处理：

- Domain Data 的 labelIds；
- Custom View 中引用该 labelId 的 predicates；
- 其他持久化 workspace references。

删除 required StatusDefinition 时，必须先提供合法 replacement，并同时修复 workflow defaults 与所有引用 Entity。

Configuration 可以被覆盖 / 删除，但不能留下 dangling IDs。

### 13.1 Configuration Replacement Safety

Configuration 没有 Core Domain Data 那样的业务历史连续性，但替换后的完整 state graph 必须合法。

修改 default 不重写已有 Entity；删除 / changing semantic category 则必须解决当前引用。

## 14. Cross-record Invariants

当前必须成立的主要 invariants：

1. Workspace 最多一个 Open Cycle。
2. Triage Issue 不得成为 Current / Open Cycle member。
3. Workflow Issue 必须有有效 Issue StatusDefinition；Triage Issue 不使用 normal StatusDefinition。
4. Issue.projectId = null → milestoneId = null。
5. Issue.milestoneId != null → Milestone.projectId = Issue.projectId。
6. Completed Issue 必须有 Estimate。
7. Project.statusDefinitionId 必须引用 Project StatusDefinition。
8. Issue.statusDefinitionId 必须引用 Issue StatusDefinition。
9. Completed Project 不能直接接受新的 non-terminal Issue；需要先 Reopen。
10. Complete Project 时当前不能存在 non-terminal child Issue。
11. Label selection 必须满足 registeredEntityTypes 与 Single / Multiple contract。
12. Closed Cycle 的正常 planning membership 不再编辑；仅允许 referential-integrity cleanup 类 destructive repair。
13. default Status reference 必须与 entityType / category 匹配。
14. Configuration / Custom View / Favorite 等不能保留 dangling stable references。

## 15. Derived Activity Timeline

Project / Milestone / Initiative 不保存可以从 Issue facts 聚合出的 actual activity timeline。

### 15.1 Start

```text
actualStart = min(relevant Issue.firstStartedAt)
```

### 15.2 Actual Work End

以当前 scope 下真实 Completed Issues 的 terminal facts 推导工作末端；不能因为一个后来被取消、且从未实际执行的 Issue 而机械延长 actual work timeline。

Project 用户点击 Complete 的时刻不作为 actual work end。

### 15.3 Current-scope Semantics

由于 V1 不保存完整 relation / membership history，Issue / Project membership 变化会影响其当前对 Initiative / Project / Milestone Progress 与 Timeline 的贡献。

这是 minimal-history model 的明确取舍，不是遗漏。

## 16. Runtime Index Model

Canonical persistence 保持单向 normalized；Runtime Store 可以为性能建立任意可重建 index / cache，例如：

```text
issuesByProjectId
issuesByMilestoneId
projectsByInitiativeId
labelsByEntityId
entitiesByLabelId
issuesByCycleId
cyclesByIssueId
currentCycleId
statusDefinitionsByCategory
labelGroupsByEntityType
derived progress / activity caches
```

这些 index 可以增量维护，但必须支持从 authoritative state 全量重建。

## 17. 明确不进入 V1 Logical Data Model

- Sub-issue / parentIssueId；
- generic Related / Blocking relations；
- Duplicate relation / status；
- Area Entity；
- TriageItem；
- snoozedUntil / isSnoozed；
- reminderAt / ReminderEntity；
- Project startedAt / completedAt / closedAt；
- Initiative / Milestone Status；
- manual Progress / Health；
- complete Activity / Event Log；
- CycleParticipationHistory / CycleSnapshot Entity；
- generic createdAt / updatedAt / deletedAt / version；
- runtime sourcePath / sourceRange / fingerprint；
- physical Markdown container / schema decisions。

## 18. Closeout

Logical Data Model 已收口。当前 authoritative chain：

```text
Product Design
→ Canonical Domain
→ Logical Data Model
→ Markdown Physical Model
→ Technical Design
→ Implementation Plan
→ Formal Implementation
```

下一阶段的任务是 **Markdown Physical Model**：决定上述 Domain Data、System Configuration 和 User Workspace State 分别由什么持久化载体承载，以及在 Vault / Markdown / plugin settings 中如何序列化、寻址、更新与恢复。

Physical Model 不得因为某种 Markdown 表达更方便，就重新引入被上层明确删除的 Domain 概念或重复 authoritative truth。
# Trail Markdown Physical Model

> 状态：Markdown Physical Model 已收口
> 最后更新：2026-08-14
> 上游 Product Design：`docs/product-design-baseline.md`
> 上游 Canonical Domain：`docs/canonical-domain-model.md`
> 上游 Logical Data Model：`docs/logical-data-model.md`
> 下游 Technical Design：`docs/technical-design-baseline.md`
> 下游 Implementation Architecture：`docs/implementation-architecture.md`

## 1. 文档定位

本文定义 Trail 第一版正式 persistence physical model：把已经冻结的 Logical Data Model 映射到具体 Vault / Markdown / Obsidian plugin data 载体。

本文决定：

- Domain Markdown 的 managed scope、目录与文件命名；
- Initiative / Project / Milestone / Issue / Cycle 的 Markdown carrier；
- frontmatter、heading、body 与单行 JSON HTML metadata 的职责；
- Domain relationship 与 physical placement 的一致性规则；
- plugin `data.json` 承载的 Configuration 与 User Workspace State；
- Timestamp、optional field、Set、field order 等 serialization rules；
- Physical Schema Registry 的职责；
- validation、corruption isolation、mutation refusal 与 migration policy。

本文不决定：

- Parser / Serializer / Validator 的具体 TypeScript API；
- MetadataCache / Markdown parser 的最终实现组合；
- Runtime Store / Query engine / Mutation Queue 的具体代码结构；
- optimistic UI、reconciliation、file locking、compensation 的正式 Technical Design；
- Home / Board / List 的视觉实现。

POC-era Markdown schema 只作为技术证据，不具有正式 Physical Model 权威性。

## 2. 总体 Persistence Topology

Trail 持久化职责分为四层：

~~~text
Vault
├─ Trail-managed Markdown
│  ├─ Domain Markdown
│  │  ├─ Initiatives
│  │  ├─ Projects
│  │  └─ Collections
│  │     ├─ Triage.md
│  │     ├─ Projectless Issues.md
│  │     └─ Cycles.md
│  └─ Lightweight Utility
│     └─ Collections/Weekly Update.md
│
└─ ordinary Obsidian Markdown
   └─ resources / notes / research / knowledge

.obsidian/plugins/trail/data.json
├─ configuration
└─ workspaceState

Plugin code
└─ Physical Schema Registry

Runtime only
├─ indexes
├─ derived state
├─ label usage counts
├─ selector / result caches
└─ diagnostics / session-local state
~~~

核心原则：

> **用户业务事实进入 Domain Markdown；插件当前规则与可同步的 Workspace State 进入官方 plugin data；格式定义跟代码走；可重建状态不持久化。**

## 3. Trail Managed Scope

正式 Domain Markdown 使用单一 Trail managed root：

~~~text
Trail/
├─ Initiatives/
├─ Projects/
└─ Collections/
   ├─ Triage.md
   ├─ Projectless Issues.md
   ├─ Cycles.md
   └─ Weekly Update.md   # lightweight utility; lazy-created, not Domain Data
~~~

目录表达 **storage type**，不表达 mutable Domain relationship。

因此不建立：

~~~text
Projects/<Initiative>/...
Projects/Active/...
Projects/Completed/...
~~~

Project 修改 Initiative membership 或 Status 时，normal mutation 不因此移动目录。

Trail Domain Parser 先以 managed scope 限定候选，再验证 file kind、结构、identity 与 records。`Weekly Update.md` 是固定路径 lightweight utility，由 WeeklyNoteFileService 管理并从 Domain scan 中显式排除；除该类已注册 utility 外，`Trail/Initiatives/`、`Trail/Projects/`、`Trail/Collections/` 内出现不符合当前 schema 的 Markdown，应报告 persistence validation issue，而不是静默当普通 Note 忽略。

普通用户知识文档不要求进入 Trail managed scope。它们继续作为普通 Obsidian Markdown，通过 native wikilinks 与 Trail file-backed Entity 发生导航关联。

## 4. 文件命名与 Stable Identity

### 4.1 Initiative / Project Filename

Initiative 与 Project 各自拥有独立的 4 位 physical sequence namespace：

~~~text
Initiatives/
├─ 0001 Personal Finance.md
├─ 0002 Trail.md
└─ ...

Projects/
├─ 0001 Mapping Review.md
├─ 0002 Trail Physical Model.md
└─ ...
~~~

Sequence：

- 仅用于 Obsidian file tree lexical sorting；
- 不进入 Domain Record；
- 不进入 frontmatter；
- 不承担 identity；
- 不表达 Initiative membership / Status / Priority；
- Initiative 与 Project 分别计数。

创建时不持久化 allocator / high-water mark：

~~~text
scan 当前 Entity-Type 目录中的合法 sequence
→ max(sequence)
→ next = max + 1
~~~

如果历史最高序号文件被永久删除，未来允许重用该序号。Sequence 不是业务历史事实。

### 4.2 Filename Suffix

文件名 readable suffix 从当前 Entity title 派生：

~~~text
Project.title = Trail Persistence Design
file = 0042 Trail Persistence Design.md
~~~

修改 title 时，Trail 可以同步 rename readable suffix，但 canonical title 仍来自 Entity record，不来自文件名。

如果文件 suffix 与当前 title 临时不一致，Parser 不用 filename 反向覆盖 canonical title。

重复 title 合法，因为 identity 是 stable ID：

~~~text
0042 Research.md
0087 Research.md
~~~

Writer 使用 deterministic filename sanitizer 处理宿主文件系统不允许的字符；sanitizer 只影响 filename projection，不修改 title。

### 4.3 Collections Filenames

以下为固定 singleton containers，不使用 sequence：

~~~text
Collections/Triage.md
Collections/Projectless Issues.md
Collections/Cycles.md
~~~

它们不是 Core Entity，不允许把 filename 当成可自由 rename 的 Entity title。

`Collections/Weekly Update.md` 也是固定路径，但它是 lightweight utility file，不是 Domain container，不要求 `kind` frontmatter，也不进入 Domain Physical Schema Registry。

## 5. File-backed Entity Frontmatter

Initiative / Project file 使用简洁 frontmatter：

~~~yaml
---
kind: project
id: "<stable-id>"
---
~~~

Initiative 对应：

~~~yaml
---
kind: initiative
id: "<stable-id>"
---
~~~

原则：

- 不使用 `trail-kind` / `trail-id`；
- 不在每个字段重复 `trail-` namespace；
- managed scope + structural context 已经提供 Trail namespace；
- `id` 是 file-backed Entity 的 stable identity；
- `kind` 验证预期 Entity Type；
- 不持久化 `schemaVersion` / `trail-schema`。

Container file 使用：

~~~yaml
---
kind: triage
---
~~~

~~~yaml
---
kind: projectless-issues
---
~~~

~~~yaml
---
kind: cycles
---
~~~

具体 allowed kind strings 由 Physical Schema Registry 定义。

## 6. Markdown Structural Grammar

Trail-managed Markdown 使用固定 structural levels：

~~~text
Frontmatter
→ file identity / container kind

H1
→ Trail-managed structural section

H2
→ Entity record boundary + visible title / derived label

Immediately after H2
→ one-line HTML JSON metadata comment

H3–H6 + ordinary Markdown
→ Entity lightweight Markdown-capable body
~~~

### 6.1 Reserved Heading Levels

在 Trail-managed file 中：

- H1 / H2 由 Trail structural grammar 保留；
- H3–H6 可以进入 Entity description/body；
- body 可以包含 lists、tables、code fences、callouts、images/embeds、wikilinks 等普通 Markdown。

如果手工编辑造成 body 中出现与 schema 冲突的 H1 / H2，Parser 报 structural issue，不猜测用户意图。

### 6.2 Metadata Marker

Embedded record 使用 H2 后固定位置的一条单行 HTML comment：

~~~markdown
## 实现 Parser
<!-- data {"id":"issue-id","context":"workflow","statusDefinitionId":"status-id","createdAt":1786464000000} -->
~~~

只使用 `data` marker，不使用 `trail:issue` / `trail:milestone` 等重复 namespace。

Entity Type 来自文件结构与所属 H1 section，例如：

~~~text
Project file
→ # Issues
→ H2 record
→ data comment
~~~

Parser 只在当前 schema 允许的 record position 读取 metadata marker；正文其他位置出现普通 `<!-- data ... -->` 不自动成为 Trail record。

不使用额外 closing HTML marker。Record boundary 由 heading hierarchy 决定。

### 6.3 Description / Body

Entity `description` 的 physical carrier 是该 H2 record 在下一 H1/H2 structural boundary 前的 Markdown body。

它可以使用普通 Markdown，但产品语义仍是 lightweight description，不因此创建独立 Document Domain Entity。

复杂、长期维护的知识内容应继续放普通 Obsidian Note，并通过 wikilink 关联。

## 7. Initiative Physical Shape

~~~markdown
---
kind: initiative
id: "initiative-id"
---

# Initiative

## Household Finance
<!-- data {"priority":"high","due":1786464000000,"labelIds":["label-a"]} -->

长期目标说明。

### Related Notes
- [[Finance Research]]
~~~

Initiative file 只承载 Initiative 自己，不物理嵌套 child Projects。

Canonical relationship 由 `Project.initiativeId` 表达；Project file location 不随 Initiative membership 变化。

## 8. Project Physical Shape

Project file 同时承载：

1. Project 自己；
2. Project-owned Milestones；
3. 当前属于该 Project 的 Issues。

固定 conceptual sections：

~~~markdown
---
kind: project
id: "project-id"
---

# Project

## Trail Markdown Physical Model
<!-- data {"statusDefinitionId":"status-a","initiativeId":"initiative-a","priority":"high","due":1786464000000,"labelIds":["label-a"]} -->

确定 Trail 正式 Markdown persistence model。

### Related Notes
- [[Obsidian API Research]]

# Milestones

## Physical Model 收口
<!-- data {"id":"milestone-a","projectId":"project-id","due":1786464000000} -->

阶段说明。

# Issues

## 验证 Parser
<!-- data {"id":"issue-a","context":"workflow","statusDefinitionId":"status-todo","projectId":"project-id","createdAt":1786464000000} -->

Issue description。

### Test Cases
- ...
~~~

### 8.1 Project Record

Project 自己使用 `# Project` 下唯一 H2 record：

- file frontmatter `id` = Project ID；
- H2 = Project title；
- H2 body = description；
- H2 后 `data` = Project structured mutable fields。

Project `id` 不在 metadata comment 重复保存。

### 8.2 Milestones

Milestone records 位于 `# Milestones` 下：

- 每个 Milestone 一个 H2；
- `id` 保存在 metadata；
- `projectId` 仍显式保存；
- 新 Milestone append 到 Milestone region 末尾；
- physical order 不作为 canonical business order。

Milestone 不通过物理嵌套拥有 Issue。

### 8.3 Issues

Issue records 位于 `# Issues` 下：

- 每个 Issue 一个 H2；
- `id` 保存在 metadata；
- `projectId` 仍显式保存；
- `milestoneId` optional；
- Workflow Issue 保存 immutable `createdAt`；
- 新 Issue append 到 Issue region 末尾；
- physical order 没有 business sorting 语义。

Board / List / Milestone grouping / Priority / Due ordering 都由 Runtime Query 控制，不通过 Markdown record order 表达。

## 9. Relationship Fact vs Physical Placement

统一原则：

> **Stable ID reference 是 canonical Domain relationship；physical container placement 是必须同时满足的 storage invariant，但不是 relationship truth。**

因此以下情况是 inconsistency：

~~~text
Issue physical location = Project A file
Issue.projectId = Project B
~~~

Trail 不自动：

- 因为物理位置而把 `projectId` 改回 A；
- 因为 `projectId` 是 B 而偷偷把 record 搬到 B。

Normal `MoveIssueToProject` 是 identity-preserving logical move，同时修改 relation 与 placement。Physical executor 使用 data-loss-averse 顺序：

1. 读取并验证 source / destination latest snapshot；
2. 计算完整 source' / destination'；
3. **先把同一 stable ID 的 record 写入 destination**；
4. re-read / verify destination 成功；
5. 再从 source 删除旧 record；
6. re-read / verify source；
7. 最终重新 parse / validate 两边并 reconcile Runtime。

选择 destination-first 是为了让极端失败优先退化成可检测 duplicate，而不是 silent data loss。destination 成功但 source delete 失败时，Technical Design 负责 compensation；若 compensation 也失败，则以磁盘事实为准报告 partial / duplicate Data Issue，不猜测。

Move 时还必须 clear / replace invalid `milestoneId`。

Milestone 即使物理位于 Project file 中，也继续保存 required `projectId`。明确 reference 比仅依赖 placement 更适合完整性校验和未来迁移。

## 10. Triage Container

`Collections/Triage.md` 只承载 `context = Triage` 的 Issue。

Conceptual shape：

~~~markdown
---
kind: triage
---

# Issues

## Review new idea
<!-- data {"id":"issue-a","context":"triage","due":1786464000000} -->

description...
~~~

Triage Issue：

- `statusDefinitionId` normally absent；
- Domain 要求 `due` 存在；
- `createdAt` absent；
- 不允许进入 Open Cycle；
- Quick Capture writer 在 create plan 中先通过 temporal policy 把默认 `+7 days` 解析成具体 epoch-ms Due。

Accept **不是**把该 record 搬到 Project / Projectless container：

```text
source Issue A (triage)
→ create new Workflow Issue B with new ID
→ write + verify B in destination container
→ delete A from Triage.md
```

Triage Due 不自动复制为 Workflow Due。target creation 失败时 source 保持原样。

## 11. Projectless Workflow Issues Container

`Collections/Projectless Issues.md` 只承载：

~~~text
Issue.context = Workflow
Issue.projectId = null
Issue.milestoneId = null
~~~

Conceptual shape：

~~~markdown
---
kind: projectless-issues
---

# Issues

## Renew passport
<!-- data {"id":"issue-a","context":"workflow","statusDefinitionId":"status-todo","createdAt":1786464000000,"due":1786464000000} -->
~~~

Triage 与 Projectless Workflow Issues 不合并，因为它们具有不同 Domain context / workflow semantics。

## 12. Cycle Container

所有 Open 与 Historical Cycle records 位于同一个 `Collections/Cycles.md`：

~~~markdown
---
kind: cycles
---

# Cycles

## 2026-08-11
<!-- data {"id":"cycle-a","startedAt":1786464000000,"plannedEnd":1787500800000,"issueIds":["issue-a","issue-b"]} -->

## 2026-07-27
<!-- data {"id":"cycle-b","startedAt":1785168000000,"plannedEnd":1786291200000,"endedAt":1786377600000,"issueIds":["issue-c"]} -->
~~~

Cycle 没有 canonical title / description。

H2 只是从 record temporal fact 派生的 human-readable physical label：

- 不承担 identity；
- 不决定 Current / Historical；
- `endedAt` absent → Open；
- `endedAt` present → Closed。

Cycle record 创建时 append；Close 只更新同一 record 的 `endedAt`，不移动到 history section。

Workspace 最多一个 Open Cycle 由 validation 保证。


## 12.5 Weekly Note Utility

`Collections/Weekly Update.md` 是固定路径 lightweight utility，不是 Domain Data，也不进入 Runtime Domain Store / Domain Physical Schema Registry。文件可以在第一次使用 Weekly Note 时显式创建。

V1 grammar：

~~~markdown
# Current

本周值得汇报的内容……

# Archive

## 2026-08-12

上一期内容……
~~~

只有两个 write use cases：

1. **Edit / Save**：在最新 snapshot 上只替换 `# Current` body。
2. **Archive**：在同一个最新 snapshot 上把 Current 内容追加到 `# Archive` 下的新日期 H2，然后清空 Current。

两者都复用 guarded single-file mutation / lightweight editor / Modal / error handling。Weekly Note 不创建 stable Domain ID、Status、Due、runtime index、query 或自动 Issue/Cycle linkage；V1 不做自动 Archive。

## 13. Field Carriers and Canonical Metadata Order

Physical Schema Registry 为每个 field 定义：

- carrier；
- type；
- `required: boolean`；
- canonical serialization order；
- missing-value interpretation；
- applicable structural context。

不使用 `presence: required|optional` 这类重复 enum；`required: false` 即 optional。

### 13.1 Initiative

| Field | Carrier | Required | Physical rule |
|---|---|---:|---|
| id | frontmatter `id` | yes | stable opaque ID |
| title | H2 under `# Initiative` | yes | non-empty text |
| description | H2 body | no | Markdown-capable lightweight body |
| priority | metadata | no | enum |
| due | metadata | no | Unix epoch milliseconds |
| labelIds | metadata | no | ID array; missing → empty Set |

Canonical metadata order：

~~~text
priority
due
labelIds
~~~

### 13.2 Project

| Field | Carrier | Required | Physical rule |
|---|---|---:|---|
| id | frontmatter `id` | yes | stable opaque ID |
| title | H2 under `# Project` | yes | non-empty text |
| description | H2 body | no | Markdown-capable lightweight body |
| statusDefinitionId | metadata | yes | valid Project StatusDefinition ID |
| initiativeId | metadata | no | Initiative ID |
| priority | metadata | no | enum |
| due | metadata | no | Unix epoch milliseconds |
| labelIds | metadata | no | ID array; missing → empty Set |

Canonical metadata order：

~~~text
statusDefinitionId
initiativeId
priority
due
labelIds
~~~

### 13.3 Milestone

| Field | Carrier | Required | Physical rule |
|---|---|---:|---|
| id | metadata | yes | stable opaque ID |
| title | H2 under `# Milestones` | yes | non-empty text |
| description | H2 body | no | Markdown-capable lightweight body |
| projectId | metadata | yes | owning Project ID |
| due | metadata | no | Unix epoch milliseconds |

Canonical metadata order：

~~~text
id
projectId
due
~~~

### 13.4 Issue

| Field | Carrier | Required | Physical rule |
|---|---|---:|---|
| id | metadata | yes | stable opaque ID |
| title | H2 under Issue section | yes | non-empty text |
| description | H2 body | no | Markdown-capable lightweight body |
| context | metadata | yes | `triage` / `workflow` |
| statusDefinitionId | metadata | no | Domain requires for Workflow; absent for Triage |
| projectId | metadata | no | Project ID |
| milestoneId | metadata | no | same-project Milestone ID |
| priority | metadata | no | enum |
| estimate | metadata | no | Completed Domain state requires value |
| due | metadata | no | Domain requires for Triage; Unix epoch milliseconds |
| labelIds | metadata | no | ID array; missing → empty Set |
| createdAt | metadata | no | Domain requires for Workflow; immutable Unix epoch milliseconds |
| firstStartedAt | metadata | no | Unix epoch milliseconds |
| terminalAt | metadata | no | Unix epoch milliseconds |

Canonical metadata order：

~~~text
id
context
statusDefinitionId
projectId
milestoneId
priority
estimate
due
labelIds
createdAt
firstStartedAt
terminalAt
~~~

Conditional Domain invariants仍由 Domain / Logical validation 处理：Triage requires Due and omits createdAt/status；Workflow requires status + createdAt and Due optional。

### 13.5 Cycle

| Field | Carrier | Required | Physical rule |
|---|---|---:|---|
| id | metadata | yes | stable opaque ID |
| startedAt | metadata | yes | Unix epoch milliseconds |
| plannedEnd | metadata | yes | Unix epoch milliseconds |
| endedAt | metadata | no | absent = Open |
| issueIds | metadata | no | ID array; missing → empty Set |

Canonical metadata order：

~~~text
id
startedAt
plannedEnd
endedAt
issueIds
~~~

H2 derived label 不属于 CycleRecord field。

## 14. Optional Values and Set Serialization

Optional metadata field 没有值时直接省略，不写 `null`。

例如：

~~~json
{"id":"issue-a","context":"workflow","statusDefinitionId":"status-a","projectId":"project-a","createdAt":1786464000000}
~~~

不写：

~~~json
{"id":"issue-a","context":"workflow","statusDefinitionId":"status-a","projectId":"project-a","createdAt":1786464000000,"milestoneId":null,"priority":null,"due":null}
~~~

Logical Set 使用 JSON array 作为 carrier，例如：

- `labelIds`；
- `Cycle.issueIds`；
- `LabelGroup.registeredEntityTypes`。

Set 没有业务顺序，canonical serializer 使用稳定确定性排序后输出 array，避免无语义 Git diff。Stable ID Set 默认按 serialized ID lexical order 排序；enum Set 使用 registry-defined stable enum order。

Parser 不因 array 顺序不同判 invalid；正常下一次 write 时 canonicalize。

## 15. Unified Timestamp Physical Encoding

所有 persisted Timestamp 使用 **Unix epoch milliseconds number**。

例如：

~~~json
{"due":1786464000000}
~~~

不持久化：

- ISO string；
- timezone offset；
- `precision`；
- date-only flag；
- display format；
- dueSoon / overdue。

如果用户只选择日期，Application / temporal policy 在提交 mutation 前按当前 timezone / input policy 转换成具体 Unix timestamp milliseconds。

之后修改 timezone、日期格式、时间格式、relative-time presentation 或 attention thresholds，不批量修改已保存 timestamp。

统一原则：

> **Persistence 保存已确认的 raw time fact；Configuration / Application / Presentation 负责解释、calendar calculation 与展示。**

## 16. Plugin `data.json`

System / Domain Configuration 与 synced User Workspace State 统一存放在 Obsidian plugin `data.json`，逻辑上分为两个 namespace：

~~~json
{
  "configuration": {},
  "workspaceState": {}
}
~~~

这不是两套 persistence subsystem，只是职责分区。

Physical Model 不为了 YAML 额外建立自定义 config file。正式实现优先沿用 Obsidian plugin data persistence path。

### 16.1 Configuration

Conceptual shape：

~~~json
{
  "configuration": {
    "statuses": {},
    "labels": {},
    "cycle": {},
    "temporal": {}
  }
}
~~~

Configuration 表达 Trail 当前如何运行；它不是 Domain Markdown history。

### 16.2 Statuses

Status physical structure 利用固定系统语义轴形成 hierarchy：

~~~json
{
  "statuses": {
    "issue": {
      "backlog": {
        "defaultId": "<id>",
        "definitions": [
          { "id": "<id>", "name": "Backlog" }
        ]
      },
      "unstarted": {
        "defaultId": "<id>",
        "definitions": [
          { "id": "<id>", "name": "Todo" }
        ]
      },
      "started": {
        "defaultId": "<id>",
        "definitions": [
          { "id": "<id>", "name": "In Progress" },
          { "id": "<id>", "name": "Waiting" }
        ]
      },
      "completed": {
        "defaultId": "<id>",
        "definitions": [
          { "id": "<id>", "name": "Done" }
        ]
      },
      "canceled": {
        "defaultId": "<id>",
        "definitions": [
          { "id": "<id>", "name": "Canceled" }
        ]
      }
    },
    "project": {
      "backlog": {},
      "unstarted": {},
      "started": {},
      "completed": {},
      "canceled": {}
    }
  }
}
~~~

`entityType` 与 `category` 不在每条 Definition 内重复，因为稳定 JSON hierarchy 已经表达：

~~~text
statuses.issue.started
~~~

Stable ID 本身保持 opaque，不使用 `status-1` / `status-started` 这类把 type / semantics 编进 identity 的规则。

Logical Model 仍把 StatusDefinition 看作独立 stable-reference definitions；Physical Model 只是利用固定 context 压缩重复字段。

`definitions` array order 是同一 Entity Type / StatusCategory 内的 authoritative display order；外层固定 StatusCategory 顺序由系统定义，不依赖 JSON object property order。

### 16.3 Labels

LabelGroup 与 Label 是用户可变 relation，不把 `groupId` 隐藏在不可变 hierarchy 中：

~~~json
{
  "labels": {
    "groups": [
      {
        "id": "<group-id>",
        "name": "Area",
        "selectionMode": "single",
        "registeredEntityTypes": ["initiative", "project", "issue"]
      }
    ],
    "definitions": [
      {
        "id": "<label-id>",
        "name": "Work",
        "groupId": "<group-id>"
      }
    ]
  }
}
~~~

不持久化 `usageCount`。

Runtime：

~~~text
startup
→ scan authoritative labelIds
→ build labelUsageCount

committed label mutation
→ incrementally update count
~~~

Label picker：

- 无 query：usage count 可以作为主要排序信号；
- 有 fuzzy query：text match relevance 优先，usage count 作为次级排序；
- final tie-breaker 使用稳定 deterministic rule。

### 16.4 Cycle / Temporal Configuration

Conceptual shape：

~~~json
{
  "cycle": {
    "defaultEndRule": "end-of-next-week"
  },
  "temporal": {
    "timezone": "Asia/Shanghai",
    "dateFormat": "yyyy-MM-dd",
    "timeFormat": "HH:mm",
    "dateTimeFormat": "yyyy-MM-dd HH:mm"
  }
}
~~~

具体 temporal settings 在对应 Settings / implementation slice 中按当前 Technical Design boundary 继续收敛，但它们不复制进每个 Domain record。

### 16.5 User Workspace State

Conceptual shape：

~~~json
{
  "workspaceState": {
    "customViews": [],
    "favorites": [],
    "home": {}
  }
}
~~~

`favorites` 是有序列表，array position 是 authoritative 用户排序。

不要因为某个 collection 使用 JSON array 就自动赋予 ordering 语义。每个 collection 单独定义：

- Favorites / Home layout 等产品明确有顺序 → array position authoritative；
- Set-backed references → array 只是 carrier，不拥有 business order；
- Status definitions：同一 Category 内 `definitions` array order 已是 authoritative；
- Label / Custom View definitions：当前仍无 business order，若未来需要再显式加入。

### 16.6 Device / Session-local UI State

Machine-specific、session-local、可重建 UI state 不因为 `workspaceState` 存在就自动进入 synced `data.json`。

例如临时 selection、open modal draft、ephemeral hover / pending state、runtime query cache 等不持久化为 User Workspace State。

极少数真正需要跨 reload 但不应同步的 device-local UI state carrier，由对应 implementation slice 在当前 Technical Design boundary 内决定。

## 17. Physical Schema Registry

完整字段定义不存放在用户 `data.json`，也不写入每个 Markdown file。

插件代码携带一个 **current Physical Schema Registry**，作为 Parser / Serializer / Validator / fixture 的共同 source of truth。

Registry 至少表达：

~~~text
record / file kind
field name
carrier
field type
required: boolean
canonical field order
missing-value behavior
applicable structure
validation hooks / logical invariant binding
~~~

Conceptual example：

~~~typescript
{
  field: "projectId",
  carrier: "metadata",
  type: "id",
  required: false
}
~~~

Title：

~~~typescript
{
  field: "title",
  carrier: "heading",
  type: "non-empty-text",
  required: true
}
~~~

Conditional Domain invariant 不伪装成 simple physical requiredness。例如：

- Issue `statusDefinitionId`：physical `required:false`，但 Workflow Domain state requires；
- Issue `estimate`：physical `required:false`，但 Completed Domain state requires。

Writer 不能各自维护不同的 field whitelist / order；所有 writer 必须消费同一 current registry。

## 18. No Persistent Schema Version

V1 不在 frontmatter / metadata / `data.json` 保存：

~~~text
schemaVersion
trail-schema
physicalVersion
~~~

Trail 不通过 per-record version marker 永久兼容多套 Physical Schema。

正常运行 parser 只支持 **one current Physical Schema**。

未来 Physical Schema 真正发生 breaking change 时，通过明确 migration 把整个 Workspace 升级到新 current schema，然后正常 runtime 只认新格式。

第一次真实 migration 出现前，不提前设计未知版本 detection protocol。

## 19. Validation Layers

启动或 relevant external change 后，validation 分层执行：

~~~text
Physical Validation
→ file / frontmatter / heading / marker / record boundary 是否符合 current schema

Field Validation
→ ID / timestamp / enum / array / text 类型是否合法

Domain Validation
→ conditional field contracts / lifecycle invariants 是否成立

Reference Validation
→ project / milestone / status / label 等 stable reference 是否存在且 scope 正确

Workspace Validation
→ duplicate IDs / max one Open Cycle / config defaults 等 workspace-wide invariant
~~~

错误信息应尽量包含：

- file / container；
- record ID / title（如果可信）；
- field / relation；
- violated rule；
- relevant reference target。

不要退化成单一 `Failed to parse Trail`。

## 20. Corruption Isolation

统一原则：

> **validation 必须识别并保留最小可信故障域；mutation availability 可以按实现阶段采用更粗的 policy。**

例如一个 Project file 内某个 Issue metadata 缺少 Workflow status：

- 该 Issue invalid；
- 同 Project 其他可独立解析 / 验证的 records 仍应保留为可识别的 valid contribution candidate；
- Data Issue 记录 source / entity / field scope。

如果 Project file 的 file identity / core structure 已经不可信，例如 frontmatter `id` 无法解析、required structural section 混乱到无法可靠界定 records，则 fault scope 提升为整个 file。

这些 granular scope 是长期 fault isolation 能力，不能在实现中丢失。但当前 V1 operational policy 可以更保守：只要存在 blocking validation error，就先关闭全局 mutation gate，并在可能时保留 last-known-good state 用于查看；以后再基于真实故障频率利用现有 scope 细化“无关 source 继续可写”，不修改 Physical Schema 或 Validation contract。

## 21. External Modification Policy

Trail Markdown 可读、可检查，但正常 mutation path 仍是 Trail UI / recognized migration tooling。Unexpected managed-persistence change 主要来自 Sync，也可能来自用户或其他工具的直接修改；无论来源，Physical contract 都要求 authoritative reread + current-schema validation，不基于猜测静默改写 Domain relationship。当前 V1 external-change execution policy 可以统一为：

```text
unexpected managed persistence event
→ close mutation gate
→ full authoritative reload
→ validate
→ success: atomic runtime replacement
→ failure: last-known-good view when available + read-only error
```

因此当前不要求每个 record 维护独立 fingerprint / merge state；更细的 affected-source refresh 是未来可替换 strategy，不改变这里的 validation facts。

关系 / placement inconsistency 不自动修复。例如：

~~~text
Issue physically in Project A
projectId = Project B
~~~

结果是 validation issue，不是自动 move 或自动 rewrite ID。

## 22. Mutation Refusal Boundary

每次 mutation 的 **logical affected scope** 必须能够被识别，并且只有在该操作可以证明会产生合法 authoritative graph 时才允许提交。Move Issue A → Project B 至少涉及：

- Issue A；
- source / target Project containers；
- referenced Milestone；
- relevant Status / Label configuration；
- latest source snapshots。

Physical / Validation architecture 保留这些 scope，是为了未来可以实施 source-scoped availability；但 V1 不必立即实现细粒度 mutation gate。当前可以采用 **any blocking error → block all mutations** 的简单 policy。以后若真实使用证明值得细化，再让无关 Project C 的 isolated error 不阻止 A → B，而不改变 source scope、issue shape 或 validation stages。

无论 policy 粗细，如果 mutation target 本身存在 identity ambiguity，例如同一 stable ID 重复出现，都必须拒绝相关 mutation，不能任意选择一个 record。

## 23. `data.json` Failure Boundary

`data.json` 包含 Status / Label definitions、defaults、temporal configuration 以及 Workspace State，并被 Domain Markdown stable references 依赖，因此损坏处理比局部 Markdown record 更保守。

### 23.1 Startup Invalid

如果启动时 `data.json` 无法解析 / 无法满足 configuration integrity：

- 不静默生成一套 default config 覆盖现状；
- 不把原有 referenced Status / Label 当成不存在后继续写；
- 标记 configuration unavailable；
- 暂停会修改 canonical data 的操作；
- 明确报告配置损坏。

### 23.2 Runtime Becomes Invalid

如果运行过程中外部变化导致 `data.json` invalid：

- 可以暂时保留 last-known-good Runtime Snapshot 用于查看；
- 明确标记 stale / error；
- 暂停 persistence mutation；
- 不使用已经和磁盘脱节的旧 configuration 继续写 authoritative data。

## 24. Canonical Normalization

Pure-format divergence 不等于 Domain corruption。

例如合法 metadata fields 只是 JSON property order 不同：

~~~json
{"priority":"high","createdAt":1786464000000,"id":"issue-a","statusDefinitionId":"status-a","context":"workflow"}
~~~

Parser 可以接受。

下次对该 record 发生正常 Trail write 时，Serializer 按 Registry canonical order 输出。

同样：

- optional empty fields canonical omission；
- Set-backed arrays canonical deterministic order；
- metadata property order canonicalized。

Trail **不在启动时仅为了格式统一而批量重写整个 Vault**，避免无意义 Git diff 与同步 churn。

## 25. Initialization vs Missing Data

第一次安装时 `Trail/` 不存在不是 corruption。Trail 可以显式 bootstrap current structure：

~~~text
Trail/
├─ Initiatives/
├─ Projects/
└─ Collections/
   ├─ Triage.md
   ├─ Projectless Issues.md
   ├─ Cycles.md
   └─ Weekly Update.md   # lightweight utility; lazy-created, not Domain Data
~~~

但如果已经存在的 Trail Workspace 后来缺少 required singleton container，例如 `Collections/Triage.md` 被删除：

- 不静默创建一个新空文件掩盖数据丢失；
- 报告 required container missing；
- 提供明确恢复 / recreate action。

缺失可能来自误删、同步冲突或外部移动，自动补空文件会隐藏真实问题。

`Weekly Update.md` 不是 Domain bootstrap prerequisite；第一次使用该 utility 时可以显式初始化。它的缺失不阻塞 Domain Runtime。

## 26. Migration Policy

未来 breaking Physical Schema migration：

~~~text
old persisted data
→ explicit migration workflow
→ preflight / backup-or-recovery boundary
→ transform all affected records
→ full validation
→ commit new current schema
→ runtime uses only new schema
~~~

Migration：

- 是显式一次性升级，不是长期 dual parser；
- 不在普通 plugin startup 中悄悄批量改几百个 Markdown files；
- 失败时必须能够明确知道是否未变、已恢复或部分完成；
- 具体 backup、transaction、resume、diagnostics 机制在真实 migration slice 中按 `docs/technical-design-baseline.md` 的 recovery / mutation boundary 具体化。

## 27. Obsidian-native Links and Related Notes

File-backed Initiative / Project 自然可以成为普通 Obsidian wikilink target。

Entity description/body 可以包含 outgoing native links：

~~~markdown
### Related Notes
- [[Architecture Research]]
~~~

Trail UI 的 “link Note to Project” convenience 可以按用户 intent 同时在普通 Note 与 Project description 中写入 navigational wikilink，但这不是新的 canonical Domain relation，也不要求永久双向一致。

V1 不承诺普通 Note 对 embedded Issue / Milestone 的稳定 native inbound block-link target，因此不为了该场景新增 `relatedDocumentIds` 或强制 block anchors。

## 28. POC Evidence Available to Formal Implementation

POC Exit 已验证的技术能力继续作为 Formal Implementation 的技术证据，而不是 implementation authority：

- managed Markdown discovery；
- snapshot parsing；
- stable UUID identity；
- source range / fingerprint guard；
- guarded single-file edit；
- representative cross-file mutation + compensation outcomes；
- global serial Mutation Queue；
- Runtime Store reconciliation；
- optimistic UI；
- native Obsidian Modal / draft preservation；
- external Vault event reconciliation；
- UTF-8 BOM read-boundary compatibility；
- normal personal-vault scale full-read feasibility。

这些能力证明正式路线可行，但 POC 的 Area / Task / Subtask / Fleeting Note physical schema、`trail` metadata namespace、旧目录等不自动进入正式 Physical Model。

## 29. Implementation Boundary

Markdown Physical Model 已关闭。`docs/technical-design-baseline.md` 定义 conceptual Technical Design，`docs/implementation-architecture.md` 进一步冻结正式 module ownership、standard read/write path、Runtime / Mutation / Repository contracts 与 V1 coarse reliability policy。

因此以下内容不再作为“每个 Feature 自己决定”的开放项：

- Physical Schema Registry / explicit Codec / Markdown Core 的 ownership；
- SourceIO / PluginDataIO 与 DomainSourceRepository boundary；
- normal Trail write 的 latest-source process + authoritative reread / validation；
- global serial queue、Single / Source Transition / Integrity Batch topology；
- Runtime source ownership / reconciliation / Data Issue scope；
- unexpected external change 的 V1 FullWorkspaceRefreshStrategy；
- Diagnostics 与 Product History 的分离。

仍然可以在 implementation slice 内决定的是这些 owner 内部的具体 TypeScript API、MetadataCache 是否用于加速结构定位、具体 error object shape、benchmark-driven optimization，以及第一次真实 breaking migration 出现时的 execution / recovery 细节。它们不得反向改变本文 Physical Schema / carrier / validation facts。

只有真实实现证据证明上游 contract 本身不成立时，才回到相应设计文档修订。项目当前阶段、近期 Slice 与 checkpoint 统一查看 `docs/implementation-plan.md`。

## 30. Closeout

Trail Markdown Physical Model 已收口，并已按后续明确 Product 行为校准 Workflow `createdAt`、Triage Due / Accept、Status ordering 与 Weekly Note utility boundary。

最终核心选择：

~~~text
Domain Data
→ Vault Markdown

Initiative / Project identity
→ YAML frontmatter: kind + id

Embedded structured record data
→ H2 后单行 JSON HTML comment: <!-- data {...} -->

Entity lightweight content
→ H2 body, H3–H6 + ordinary Markdown

Configuration + synced User Workspace State
→ Obsidian plugin data.json

Physical field definitions
→ plugin-shipped current Physical Schema Registry

Runtime / Derived
→ rebuildable, not authoritative persistence
~~~

Trail schema 依靠 managed scope + structural context 定义语义，不在每个 marker / field 上重复 `trail-` namespace。

所有 persisted time fields 统一使用 Unix epoch milliseconds；不保存 temporal precision。

关系 identity 由 stable IDs 定义，physical placement 作为独立 storage invariant 校验。

未来 schema evolution 采用 explicit one-way migration，不通过 per-file version markers 长期维持多套 schema。
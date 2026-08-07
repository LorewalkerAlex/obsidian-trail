# Trail Technical Design

> 状态：Technical Design 当前基线<br>
> 最后更新：2026-08-07<br>
> 适用对象：个人使用<br>
> 上游基线：`./product-domain-hld.md`<br>
> 当前代码基线：`b22de4c41e15a333d4cd35d060d9dd11e557fb28` (`feat: add project workspace drag and drop`)<br>
> 当前目标：以能力验证为单位收敛 POC。单文件 Guarded Markdown Edit 已从 Task Writer 与 Fleeting Note Editor 的重复机械路径中完成公共能力收敛；下一步用 Task Title Modal 验证阻断式 Modal + draft + save / cancel + conflict 的编辑链路，随后重新审视能力矩阵并讨论 POC 是否可以结束。

## 1. 文档边界

本文负责回答：

- Trail 管理文件如何表达 Area、Project、Task、Subtask、Task Note 和 Fleeting Note；
- Obsidian API、Trail Parser、Runtime Store 与 React UI 如何协作；
- Trail 对象如何获得稳定身份；
- UI 操作如何转换为领域命令并精确写回 Markdown；
- 状态、Priority、Due Date、Label 和完成时间如何持久化；
- Fleeting Note 转换、删除、回收站和恢复的技术边界；
- 解析失败、写入失败和外部文件变化如何处理；
- POC 需要验证哪些可复用技术能力，以及哪些产品路径只是这些能力的代表性验证载体。

本文暂不固定：

- 最终视觉样式、颜色、图标和卡片布局；
- 完整 Design System；
- Archive 和 Trash 的最终产品命名；
- 回收站最终保留天数和物理序列化格式；
- Fleeting Note Archive 的最终物理组织方式；
- 完整 Undo 历史、状态事件日志和长期迁移工具；
- 生产级 Low-Level Design 与完整测试矩阵。

### 1.1 POC 评估原则

Trail 当前仍处于 Minimum Demo / POC。POC 的主要目的不是完成第一版产品功能清单，而是用足够真实的产品路径证明正式实现依赖的技术能力可行。

因此：

- Task、Project、Fleeting Note 等领域对象是验证载体，不要求在 POC 中逐个实现所有同类编辑操作；
- 一个能力已经通过两个或更多不同领域场景重复验证时，应优先检查是否需要收敛公共机制，而不是继续复制同一技术路径；
- 通用层只负责机械且跨领域稳定的行为，例如读取最新 Markdown、重新定位、Fingerprint Guard、区域替换、原子写入、写后重新解析与最终 Store 收敛；
- 领域层继续负责对象如何定位、哪些内容允许修改、如何序列化以及写后需要满足什么业务不变量；
- POC 中已经额外实现的具体功能仍然有价值，它们提供了真实路径证据，也能为后续正式设计和 LLD 提供可行实现参考；
- Priority、Due、Label、Subtask、Task Note 等第一版功能若只是复用已经证明的能力，不因为尚未逐项实现就自动阻塞 POC 结束；
- 只有引入新的数据结构、新的写入形态、新的并发语义、新的宿主交互或其他尚未证明的技术假设时，才需要继续增加 POC 实验。

POC 完成判断以第 16 节能力矩阵和第 17 节通过标准为准，不再以“第一版功能是否全部实现”为准。

### 1.2 当前 POC 事实状态

截至 2026-08-07，代码基线 `b22de4c41e15a333d4cd35d060d9dd11e557fb28` 已完成并验证以下代表性路径：

- Markdown Discovery、同一 Snapshot 的 Frontmatter / Body 读取、Area / Project / Task / Subtask / Task Note / Project Note / Fleeting Note 解析、UUID 身份和结构化错误隔离；
- Task 状态 Writer 在最新 Markdown 中按 UUID 重新定位、校验完整 Task Block Fingerprint、最小替换标题行、规范化 checkbox / `completed` 并重新解析确认；
- Active Fleeting Note 编辑在编辑开始时固定预期 Snapshot，只替换可见文本，保留元数据，并在外部修改后拒绝 stale Fingerprint；
- Task 创建、Project 创建、Fleeting Note 创建 / 删除 / 生命周期写入及其写后确认；
- Fleeting Note → Task / Project、Archive、Delete to Trash、Restore 的跨文件编排、补偿和 `unchanged / compensated / partial` 结果；
- Plugin-level Runtime Store、文件事件 Reconciliation、Mutation 刷新边界、通用全局串行 Mutation Queue 与失败隔离；
- Project Board / List、五状态显示、原生跨栏拖拽、Task 局部 optimistic UI、Pending、失败回滚、完成时间写回和未完成 Subtask 完成约束；
- Dashboard Quick Capture、Active Fleeting Note draft 编辑、外部变化冲突拒绝和失败后 draft 保留；
- 正常数据规模下的全量读取策略与真实 Obsidian 自动收敛。

提交前验证基线为 ESLint、27 个测试文件、179 / 179 tests、TypeScript typecheck、production build 与 `git diff --check` 通过；真实 Obsidian 已验证 Project 选择、Board / List、跨状态拖拽、乐观更新、失败回滚、Queue 延续以及前述 Fleeting Note 创建 / 编辑 / 转换 / 生命周期路径。

单文件 Guarded Markdown Edit 收敛已经在当前工作区完成：新增 `trail-guarded-markdown-edit.ts`，由 Task 状态 Writer 与 Active Fleeting Note Editor 共同复用；公共层只处理 expected Fingerprint、调用领域定位回调、比较最新 Fingerprint、校验并替换明确源码范围，以及可选写后验证回调，不理解具体领域对象，也不直接调用 Obsidian Vault API。定向验证报告 5 个测试文件、46 / 46 tests 通过，目标文件 ESLint、TypeScript typecheck 与 `git diff --check` 通过。

当前真正仍需验证或收敛的 POC 能力主要是：

1. **Draft-based Modal 编辑链路**：已有 Fleeting Note 内联编辑证明 draft + conflict，但尚未验证阻断式 Task Modal、底层交互隔离、dirty draft 关闭保护、保存失败保留 Modal / draft，以及关闭后 Workspace 上下文保持；
2. **POC Exit Review**：Modal POC 完成后重新审视能力矩阵，区分仍然未知的技术能力与仅剩的产品功能覆盖，再决定是否结束 POC 并进入 ADR / LLD。

下列事项仍可能是第一版产品需要，但当前不再默认视为 POC 阻塞项：产品化 `partial` 人工恢复入口、Priority / Due / Label 全量编辑、Subtask 与 Task Note 完整 CRUD、Convert to Subtask、Archive / Trash 自动保留期清理和永久删除策略、受影响文件级增量 Reconciliation，以及完整 Search / Design System。

## 2. 已冻结的关键技术决策

当前 POC 阶段，以下内容不再作为开放设计项：

- 公开插件名为 `Trail`；
- 插件 ID、Markdown 元数据命名空间和代码前缀使用 `trail`；
- GitHub 仓库名使用 `obsidian-trail`；
- Task 私有元数据使用单行 JSON HTML comment；
- Area、Project、Task 和 Fleeting Note 创建时生成随机 UUID；
- UUID 创建后永久不变，不随改名、排序、归档或路径变化而改变；
- Runtime Store、React key 和领域命令使用 UUID 识别对象；
- 文件路径、源码范围和 Fingerprint 只用于定位与冲突校验，不承担对象身份；
- 所有 Trail 写入进入一条全局串行 Mutation Queue；
- 同一状态栏不支持手动排序，只允许 Task 在不同状态栏之间移动；
- 状态之间不设置固定流转顺序，目标区域直接决定最终状态；
- 当前产品不支持普通 Task 跨 Project 移动；
- Fleeting Note 转换通过正常 Create Project / Create Task 命令创建新对象；
- 删除进入 Trail Trash，在保留期内支持恢复；
- 正式环境只支持 Trail UI 和认可脚本修改 Trail 管理内容；
- POC 第一运行平台为 Windows Desktop。

## 3. 总体技术架构

```text
Obsidian Vault / Markdown
          │
          ▼
  File Discovery Layer
  TFile / TFolder / Vault
          │
          ▼
 Markdown Snapshot Reader
 cachedRead + Frontmatter parse
          │
          ▼
   Trail Parser
          │
          ▼
 Plugin-level Runtime Store
          │
          ▼
      React UI
          │
          ▼
    Domain Command
          │
          ▼
 Global Mutation Queue
          │
          ▼
    Mutation Service
          │
          ▼
   Vault.process / File API
          │
          ▼
 File Event Reconciliation
```

### 3.1 File Discovery Layer

职责：

- 扫描 Trail 专用管理目录；
- 根据目录约定识别 Area；
- 根据文件约定识别 Project、Area 描述文件和 Fleeting Notes 文件；
- 排除 Archive 与 Trash，不纳入日常 Dashboard、Area 和 Project 统计；
- 发现创建、修改、重命名和删除事件，并只触发受影响范围的重新解析。

当前 POC 使用以下目录约定：

```text
<test-vault>/
├── .obsidian/
└── Trail/
    ├── Areas/
    │   └── <Area>/
    │       ├── Area.md
    │       ├── Project A.md
    │       └── Project B.md
    ├── Fleeting Notes.md
    ├── Archive/
    └── Trash/
```

`Trail/` 是当前 POC 的管理目录名称；是否作为第一版正式目录，以及 Archive 与 Trash 的物理组织，将在写回和同步验证后确认。

### 3.2 Markdown Snapshot Reader

职责：

- 使用 Obsidian Vault API 的 `Vault.cachedRead()` 读取原始 Markdown；
- 使用 `getFrontMatterInfo()` 从该次读取的正文中定位 Frontmatter；
- 使用 `parseYaml()` 解析同一 Markdown Snapshot 中的 Frontmatter；
- 将同一份正文与 Frontmatter 一起交给 Trail Parser；
- 不自行实现完整 Markdown 或 YAML 解析器。

当前领域读取不再从 `MetadataCache.frontmatter` 取 Area / Project Frontmatter，避免 Mutation 刚写完正文但 MetadataCache 尚未收敛时产生短暂不一致。未来若需要 links、tags 或更复杂的 Markdown 结构，可以继续使用 MetadataCache，但同一次领域解析必须保持来源版本一致。

### 3.3 Trail Parser

职责：

- 将 Trail 文件转换为统一领域对象；
- 识别 Area、Project、Overview、Tasks、Notes 和 Fleeting Note；
- 识别 Task、Subtask 和 Task Note；
- 解析单行 JSON HTML 元数据；
- 校验 UUID、状态、Priority、时间、Label 和 checkbox 一致性；
- 检测重复 UUID；
- 输出用于精确写回的源码定位信息；
- 隔离对象级错误，并报告文件级错误。

### 3.4 Runtime Store

插件入口创建唯一的 Runtime Store，并将其传给单实例 Trail View。Store 当前保存：

- 最新一次已确认的 `TrailVaultReadResult`；
- 是否已经完成首次初始化；
- 是否正在刷新；
- View 订阅者；
- 当前刷新 Promise、尾随刷新标记、防抖计时器和 Mutation 深度。

当前行为：

- 首次打开 Trail View 时只初始化一次；
- 重复打开 Trail 只激活已有 View；
- Trail View 关闭后取消订阅，再次打开时继续订阅插件级 Store；
- 刷新期间保留上一份已确认数据，不先清空 UI；
- 刷新进行中再次请求刷新时，合并为一次尾随刷新；
- 文件事件使用短延迟防抖，连续保存不会立即并行读取；
- 主动刷新会取消尚未执行的文件事件防抖刷新；
- `runMutation()` 在执行前取消已安排的事件刷新，并等待正在进行的刷新结束；
- Mutation 期间 `scheduleRefresh()` 不安排中间刷新；
- 最外层 Mutation 在 `finally` 中统一执行一次刷新，因此成功、补偿成功和部分失败都能重新读取最终磁盘状态；
- Vault 读取异常转换为结构化 issue；
- 插件卸载时清理计时器和全部订阅者。

Runtime Store 是缓存和交互状态，不是新的业务事实来源。当前实现使用轻量纯 TypeScript Store，没有引入 Zustand；是否在后续复杂交互中更换 Store 实现，应由实际需求决定。

### 3.5 POC 技术组合

当前已验证的最小读写 POC 采用：

```text
TypeScript
Obsidian 官方 Sample Plugin 结构
esbuild
React
Obsidian ItemView
Vitest
React Testing Library
```

`Modal`、Zustand、dnd-kit、date-fns 和时区辅助库仍是后续通用交互和完整状态操作阶段的候选方案。当前 Runtime Store 和通用全局 Mutation Queue 均使用纯 TypeScript 实现，尚未证明需要引入 Zustand。Project Board 当前只需要跨状态栏移动、不允许同栏排序，因此先使用浏览器原生 HTML5 Drag and Drop，并保留状态下拉框作为键盘与不支持拖拽环境的等价入口；没有安装 dnd-kit。若后续需要移动端、完整键盘拖拽、Drag Overlay、复杂碰撞检测或同栏排序，再重新评估 dnd-kit 或 Pragmatic Drag and Drop。

第一版不引入：

```text
浏览器 Router
并行业务数据库
虚拟列表
复杂表单框架
完整 Undo 框架
时间追踪库
```

## 4. 对象身份

### 4.1 UUID 规则

Area、Project、Task 和 Fleeting Note 创建时生成随机 UUID。

规则：

- UUID 必填；
- 创建后不可修改；
- 对象改名时不改变；
- Task 在 Project 内重新排序时不改变；
- Project 重命名、移动或归档时不改变；
- 删除后不复用；
- Fleeting Note 转换为 Project 或 Task 时，新对象生成新的 UUID；
- Subtask 和普通 Note 第一版不拥有独立 UUID。

随机 UUID 真实碰撞概率可以忽略，但 Parser 仍检测重复 UUID，因为复制 Markdown Block、复制 Project 文件、Git 冲突或错误脚本可能制造重复数据。

检测到重复 UUID 时：

- 所有涉及该 UUID 的对象不进入 Runtime Store；
- 显示错误位置；
- 不自动重新生成 ID。

### 4.2 Runtime Identity 与 Source Location

对象身份：

```text
runtimeKey = object.id
```

React key、Store 索引、打开中的 Modal 和领域命令均使用 UUID。

源码定位单独保存：

```text
filePath
headerStartOffset
headerEndOffset
blockStartOffset
blockEndOffset
sourceFingerprint
```

Offset 允许在重新解析后变化；UUID 不变化。

## 5. Area 与 Project Markdown Schema

### 5.1 Area 描述文件

POC 使用：

```yaml
---
id: "8ea6104f-5638-4abd-a647-a852859b8c62"
created: 2026-08-03
---

Area 的简短说明。
```

规则：

- `id` 必填，随机 UUID；
- `created` 必填；
- Area 名称由目录名表达；
- Area 与 Project 的关系由目录位置表达。

### 5.2 Project Frontmatter

正常 Project：

```yaml
---
id: "670064d1-3fd2-4bb2-b365-190c1c548c46"
created: 2026-08-03
status: active
---
```

Project 状态：

```text
planned
active
completed
archived
```

完成后的 Project：

```yaml
---
id: "670064d1-3fd2-4bb2-b365-190c1c548c46"
created: 2026-08-03
status: completed
completed_at: 2026-10-15
---
```

归档后的 Project：

```yaml
---
id: "670064d1-3fd2-4bb2-b365-190c1c548c46"
created: 2026-08-03
status: archived
completed_at: 2026-10-15
archived_from_area: Work
---
```

规则：

- `id`、`created`、`status` 必填；
- 进入 `completed` 时写入 `completed_at`；
- 从 `completed` 重新打开时删除 `completed_at`；
- 进入 `archived` 时移动到 Archive 并写入 `archived_from_area`；
- 不保存 Project 进度、Task 数量或 Area 字段。

当前 Fleeting Note → Project 创建路径固定生成：

```text
new Project UUID
created=<当前本地日期，YYYY-MM-DD>
status=planned
Overview=<来源 Fleeting Note 文本>
Tasks=空
Notes=空
```

Project 名称由用户确认，可从 Fleeting Note 可见文本生成建议值。名称必须是单行、无 `.md` 后缀、长度不超过当前限制且不包含 Windows 非法字符或保留名称。目标 Area 由用户选择，物理路径为 `Trail/Areas/<Area>/<Project name>.md`。若目标路径已经存在不同文件或文件夹，返回路径冲突，不覆盖现有内容。

Project 生命周期日期第一版使用 `YYYY-MM-DD`。

### 5.3 Project Body

```markdown
## Overview

项目背景、目的和范围。

## Tasks

- [ ] Task 标题 <!-- trail:task {"id":"7ad34339-e96f-4c6d-a9c3-577169c1b830","status":"backlog","priority":"medium","created":"2026-08-03T10:47:00+08:00","labels":[]} -->

## Notes

- Project Note
```

固定区域：

```text
Overview
Tasks
Notes
```

Overview：

- 只包含简短普通段落；
- 可使用简单行内 Markdown；
- 不允许内部 Heading、列表、引用、代码块或表格；
- 长篇项目文档使用独立普通 Note。

Project Notes：

- `## Notes` 下的顶层普通 `-` 列表项是一条 Project Note；
- 允许嵌套普通列表；
- Notes 区域内不允许 checkbox；
- checkbox 出现时视为格式错误。

## 6. Task Markdown Schema

### 6.1 标准 Task

```markdown
- [ ] 完成 Markdown Parser <!-- trail:task {"id":"7ad34339-e96f-4c6d-a9c3-577169c1b830","status":"doing","priority":"high","created":"2026-08-03T10:47:00+08:00","due":"2026-08-10","labels":["type:spike","layer:frontend"]} -->
  - [x] 完成基础解析
  - [ ] 验证异常处理
  - MetadataCache 更新后需要重新读取对应范围。
```

完成后的 Task：

```markdown
- [x] 完成 Markdown Parser <!-- trail:task {"id":"7ad34339-e96f-4c6d-a9c3-577169c1b830","status":"completed","priority":"high","created":"2026-08-03T10:47:00+08:00","due":"2026-08-10","completed":"2026-08-09T18:35:12+08:00","labels":["type:spike","layer:frontend"]} -->
  - [x] 完成基础解析
  - [x] 验证异常处理
  - MetadataCache 更新后需要重新读取对应范围。
```

### 6.2 Task 元数据字段

| 字段 | 必填 | 格式 | 说明 |
|---|---:|---|---|
| `id` | 是 | UUID | 创建后永久不变 |
| `status` | 是 | 枚举 | `backlog / todo / doing / blocked / completed` |
| `priority` | 是 | 枚举 | `low / medium / high / urgent` |
| `created` | 是 | ISO 8601 秒级时间戳 | 固定转换到 `+08:00` |
| `due` | 否 | `YYYY-MM-DD` | 目标日期，只用于排序、展示和快捷调整 |
| `completed` | 条件必填 | ISO 8601 秒级时间戳 | 仅 `status=completed` 时存在 |
| `labels` | 否 | JSON string array | Trail 私有 Label |

新建 Task 默认值：

```text
id=<随机 UUID>
status=backlog
priority=medium
created=<当前东八区秒级时间>
labels=[]
```

### 6.3 JSON 私有元数据语法

标准格式：

```markdown
<!-- trail:task {"id":"...","status":"todo","priority":"medium","created":"...","labels":[]} -->
```

规则：

- 每个 Task 只允许一条 `trail:task`；
- 注释必须与 Task 标题位于同一行；
- JSON 必须是标准单行 JSON；
- Writer 使用 `JSON.stringify` 等价规则；
- Writer 使用稳定字段顺序：`id`、`status`、`priority`、`created`、`due`、`completed`、`labels`；
- 字段顺序不表达业务语义；
- JSON 损坏、必填字段缺失、字段类型错误或值非法时，该 Task 视为异常；
- 不猜测、不自动补全、不静默修复异常对象。

### 6.4 Checkbox 与 Status 一致性

Task checkbox 是完成状态的 Markdown 镜像：

```text
status=completed → [x]
其他 status      → [ ]
```

进入目标状态时，Command 直接生成规范结果，不依赖旧 checkbox：

| 目标区域 | `status` | checkbox | `completed` |
|---|---|---|---|
| Backlog | `backlog` | `[ ]` | 删除 |
| Todo | `todo` | `[ ]` | 删除 |
| Doing | `doing` | `[ ]` | 删除 |
| Blocked | `blocked` | `[ ]` | 删除 |
| Completed | `completed` | `[x]` | 写入当前时间 |

不保存 `previous_status`。从 Completed 拖回其他区域时，目标区域直接决定新状态，并删除 `completed`。

### 6.5 状态与排序

除完成约束外，状态之间允许任意直接转换。

同一状态栏不支持手动排序。统一排序规则：

```text
1. priority：urgent → high → medium → low
2. due：日期越早越靠前，无 due 排在最后
3. created：时间越早越靠前
```

只允许将 Task 拖到其他状态栏；进入目标栏后立即按固定规则重新排序。

### 6.6 Task 完成约束

- 没有 Subtask：可以完成；
- 所有 Subtask 已完成：可以完成；
- 存在任意未完成 Subtask：拒绝进入 `completed`；
- Subtask 全部完成不会自动完成父 Task；
- 父 Task必须由用户在 Board 或 Task Detail Modal 中显式完成。

### 6.7 Subtask

```markdown
  - [ ] 未完成 Subtask
  - [x] 已完成 Subtask
```

规则：

- 必须位于 Task 的缩进范围内；
- 只使用 `[ ] / [x]`；
- 不具有独立 UUID、`status`、Priority、Due Date、Label 或完成时间；
- 不进入 Project Board、Area 聚合或 Dashboard 独立统计；
- Project 卡片可以显示 `已完成数 / 总数` 摘要；
- 完整列表只在 Task Detail Modal 中操作。

### 6.8 Task Note

```markdown
  - 第一行
    第二行
    第三行
```

规则：

- Task 缩进范围内的普通列表项是 Task Note；
- 标准 Markdown 缩进续行属于同一条 Note；
- 与 Subtask 在底层同属 Task Block；
- 在 Task Detail Modal 中分为独立 Notes 区域；
- 允许嵌套普通列表和行内 Markdown；
- 不允许在 Task Note 内创建未声明语义的 checkbox。

Task 标题只允许单行 Inline Markdown。`trail:task` 注释位于标题行末尾。

## 7. Fleeting Notes Schema

### 7.1 Fleeting Notes 文件

当前 POC 使用三个单一 Markdown 文件表达 Fleeting Note 生命周期：

```text
Trail/Fleeting Notes.md
Trail/Archive/Fleeting Notes.md
Trail/Trash/Fleeting Notes.md
```

Active 文件正文不需要标题，可以直接由顶层列表开始：

```markdown
- 调研 Obsidian MetadataCache 的位置稳定性 <!-- trail:fleeting {"id":"6bce718b-03df-4a9a-865d-b374139a962e","created":"2026-08-03T12:43:00+08:00","cleanup_due":"2026-08-10"} -->
- 考虑增加日期视图 <!-- trail:fleeting {"id":"8ae1f03d-5944-4ee2-9882-0e4ed96b1d45","created":"2026-08-03T12:44:00+08:00"} -->
```

Archive 与 Trash 使用同一顶层记录格式，并分别增加生命周期时间戳：

```markdown
- 已归档闪念 <!-- trail:fleeting {"id":"6bce718b-03df-4a9a-865d-b374139a962e","created":"2026-08-03T12:43:00+08:00","archived_at":"2026-08-06T11:47:58+08:00"} -->
- 已删除闪念 <!-- trail:fleeting {"id":"8ae1f03d-5944-4ee2-9882-0e4ed96b1d45","created":"2026-08-03T12:44:00+08:00","deleted_at":"2026-08-06T11:48:30+08:00"} -->
```

规则：

- 每条 Fleeting Note 是顶层普通列表项；
- 每条记录包含唯一 `trail:fleeting` JSON comment；
- `id` 和 `created` 必填；
- `cleanup_due` 可选，格式为 `YYYY-MM-DD`，用于处理提醒；
- Archive 记录必须且只能包含有效 `archived_at`；
- Trash 记录必须且只能包含有效 `deleted_at`；
- Archive、Delete 和 Restore 保留原 UUID、`created` 与 `cleanup_due`；
- Restore 物理上追加到 Active 文件底部，UI 按 `created` 排序，因此显示顺序不受追加位置影响；
- 同一 UUID 同时存在于多个生命周期文件时保留各份真实记录，并报告 `fleeting.id.duplicate`，不得为“去重”隐藏 `partial` 结果；
- Fleeting Note 可以包含简单行内 Markdown；
- 第一版不支持直接转换为 Subtask。

### 7.2 Fleeting Note 操作

当前 POC 的 Quick Capture：

```text
Dashboard 输入一行文本
→ trim 并拒绝空值、多行或 trail:fleeting 元数据标记
→ 生成新 UUID 与当前 +08:00 秒级 created
→ Active 文件存在时追加记录；不存在时一次创建完整文件
→ 重新解析并确认 UUID、文本与 created
→ Runtime Store 最终刷新
```

Capture 通过插件级 Queue 和 `runtimeStore.runMutation()` 执行。成功后清空输入；失败时保留原 draft 并显示错误。Quick Capture 不设置 `cleanup_due`，后续如需该字段由专门的字段编辑能力处理。

Active Fleeting Note 文本编辑：

```text
点击 Edit 时固定当前 Note Snapshot 与 Fingerprint
→ 用户只编辑可见文本
→ Save 在最新 Active Markdown 中按 UUID 重新定位
→ 校验编辑开始时的 Fingerprint
→ 只替换该顶层记录的可见文本
→ 重新解析并确认 UUID、created 与 cleanup_due 未变化
→ Runtime Store 最终刷新
```

运行时文件事件可以刷新 Store 和卡片中的最新数据，但不能替换已经打开的编辑器所持有的预期 Snapshot。外部修改、删除或复制 UUID 时 Save 必须失败并保留 draft；Cancel 放弃 draft 并回到 Store 中的最新记录。标准化后文本未变化时返回原 Markdown，不制造无意义 Diff。

Fleeting Note 卡片支持：

```text
保持
转为 Project
转为 Task
Archive
Delete
```

转为 Project：

```text
用户确认 Project name 与目标 Area
→ CreateProject(new UUID, created=today, status=planned)
→ 将 Fleeting Note 文本写入 Overview
→ 生成并确认标准 Overview / Tasks / Notes Markdown
→ 从 Active Fleeting Notes 文件删除来源记录
→ 来源删除失败时，仅补偿删除仍与创建快照一致的新 Project
```

转为 Task：

```text
用户选择目标 Project
→ CreateTask(new UUID, status=backlog, priority=medium)
→ 确认目标 Task 创建成功
→ 从 Active Fleeting Notes 文件删除来源记录
→ 来源删除失败时补偿删除新 Task
```

新对象不复用 Fleeting Note UUID，因为它是新创建的 Project 或 Task。 Project 创建使用 `Vault.create()`，写后通过 `cachedRead()` 与 Project Parser 确认完整结果；补偿使用 `FileManager.trashFile()`，并在删除前校验目标 Markdown 仍等于创建快照。相同命令遇到完全一致的既有目标时可幂等确认；遇到不同文件或文件夹时返回 `project-path-conflict`。

当前 POC 已实现 Archive、Delete to Trash 和 Restore：先在目标生命周期文件创建并重新解析确认完整记录，再从来源文件精确删除；来源删除失败时补偿删除目标记录。目标生命周期文件不存在时，先在内存生成完整 Markdown，再通过一次 `Vault.create()` 创建，避免写入失败后留下空文件。Fleeting Notes 在实现上复用 UUID、Fingerprint、精确删除、跨文件补偿、全局串行 Queue 和 Runtime Store Mutation 边界，但领域类型仍保持独立。

## 8. Trash 与恢复

删除操作不直接永久清除对象。

删除流程：

```text
创建可恢复快照
→ 写入 Trash
→ 确认 Trash 写入成功
→ 从原位置删除对象
```

通用 Trash 设计需要保存足够的恢复上下文。当前 Fleeting Note POC 因来源固定为 `Trail/Fleeting Notes.md`，Trash 记录保存：

```text
原 Fleeting Note UUID
文本
created
可选 cleanup_due
deleted_at
```

其他对象类型未来仍可能需要额外保存原文件路径、容器 UUID 或等价可恢复上下文。

恢复流程：

```text
读取 Trash 快照
→ 校验目标位置和 UUID
→ 恢复对象
→ 删除 Trash 快照
```

当前 POC 只实现 Fleeting Note 的可恢复 Trash 存放和 Restore，不自动永久删除记录，也没有实现保留期扫描。回收站保留天数、自动清理时机和永久删除交互仍由后续 POC / LLD 决定。

## 9. Parser 规则

### 9.1 Project 识别

Project 文件必须满足：

- 位于有效 Area 目录；
- Frontmatter 可解析；
- `id`、`created` 和 `status` 合法；
- 包含唯一的 `## Overview`、`## Tasks` 和 `## Notes`；
- 三个区域结构可明确定位；
- 不位于 Archive 或 Trash 日常扫描范围。

POC 文件发现规则：

- `Trail/Areas/` 下的直接子目录是 Area；
- `Area.md` 是 Area 描述文件；
- Area 目录下其他直接 `.md` 文件是 Project 候选；
- 候选不满足 Project Schema 时报告文件级错误；
- 普通 Note 不放入 Trail 管理目录。

### 9.2 Task 识别

一个顶层 Task 必须同时满足：

- 位于 `## Tasks` 区域；
- 是该区域的直接顶层 checkbox 列表项；
- 同一 Task 行包含唯一 `trail:task` JSON 注释；
- UUID 唯一；
- 必填字段完整且值合法；
- checkbox、`status` 和 `completed` 满足一致性规则。

Task Block 包含该顶层列表项及其全部缩进子内容。

### 9.3 Fleeting Note 识别

一条 Fleeting Note 必须：

- 位于固定 Fleeting Notes 文件；
- 是顶层普通列表项；
- 同一行包含唯一 `trail:fleeting` JSON 注释；
- UUID 唯一；
- 必填字段合法。

### 9.4 源码定位与重新定位

Parser 为每个可修改对象保存源码位置和 Task Block Fingerprint。

写回时：

1. 根据 UUID 在当前最新文件中重新找到对象；
2. 确认只找到一个匹配对象；
3. 比较对象当前 Fingerprint 与命令创建时的预期版本；
4. 一致则生成最小 Patch；
5. 不一致则中止写入并重新解析。

如果只是在对象上方插入内容，Offset 变化但 UUID 和对象内容未变化，应重新定位后继续，不应误判为冲突。

## 10. Runtime Data Model

以下是概念模型，不是最终 TypeScript 定义：

```ts
interface TrailTask {
  id: string;
  projectId: string;
  projectPath: string;
  title: string;
  status: 'backlog' | 'todo' | 'doing' | 'blocked' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created: string;
  due?: string;
  completed?: string;
  labels: string[];
  subtasks: TrailSubtask[];
  notes: TrailTaskNote[];
  source: TaskSourceLocation;
}
```

```ts
interface TrailFleetingNote {
  id: string;
  text: string;
  created: string;
  cleanupDue?: string;
  source: SourceLocation;
}
```

```ts
interface TrailSubtask {
  text: string;
  completed: boolean;
  source: SourceLocation;
}
```

Store 同时维护派生索引：

```text
UUID → Object
Area → Projects
Project → Tasks by Status
Project → Labels → Tasks
Area → Labels → Tasks
Urgent Tasks
Parse Errors
Trash Metadata
```

所有索引从合法领域对象派生，不写入 Markdown。

## 11. Domain Command 与全局串行写回

### 11.1 领域命令

React 组件只发出领域意图，例如：

```text
CreateProject
CreateTask
MoveTaskStatus
SetTaskPriority
SetTaskDueDate
SetTaskLabels
UpdateTaskTitle
ToggleSubtask
UpdateSubtask
AddTaskNote
UpdateTaskNote
CreateFleetingNote
UpdateFleetingNote
ConvertFleetingToProject
ConvertFleetingToTask
ArchiveFleetingNote
DeleteToTrash
RestoreFromTrash
```

当前不存在 `MoveTaskToProject`。

### 11.2 全局 Mutation Queue

目标架构要求所有 Trail 写入最终进入一条插件级全局串行队列。当前 POC 已将 Queue 泛化为与具体领域对象和 Mutation Service 无关的异步 Command 执行器，并接入 Task 状态修改、Quick Capture、Active Fleeting Note 编辑、Fleeting Note → Task / Project、Archive、Delete to Trash 与 Restore：

```text
Task Status UI Intent
→ 类型化 Task 状态更新函数
→ Queue.enqueue(async Command)
→ runtimeStore.runMutation()
→ Mutation Service 写回并重新解析确认
→ Runtime Store refresh

Quick Capture UI Intent
→ 类型化 Fleeting Note 创建函数
→ Queue.enqueue(async Command)
→ runtimeStore.runMutation()
→ Create / Append Active Record + Parse Confirmation
→ Runtime Store refresh

Active Fleeting Note Edit UI Intent
→ 类型化 Fleeting Note 编辑函数（携带编辑开始时的 Note Snapshot）
→ Queue.enqueue(async Command)
→ runtimeStore.runMutation()
→ UUID Relocation + Fingerprint Check + Minimal Text Replacement
→ Runtime Store refresh

Fleeting Note Convert to Task UI Intent
→ 类型化 Fleeting Note → Task 函数
→ Queue.enqueue(async Command)
→ runtimeStore.runMutation()
→ Create Task / Delete Source / Compensation
→ Runtime Store refresh

Fleeting Note Convert to Project UI Intent
→ 类型化 Fleeting Note → Project 函数
→ Queue.enqueue(async Command)
→ runtimeStore.runMutation()
→ Create Project / Delete Source / Compensation
→ Runtime Store refresh

Fleeting Note Lifecycle UI Intent
→ 类型化 Archive / Delete / Restore 函数
→ Queue.enqueue(async Command)
→ runtimeStore.runMutation()
→ Create Lifecycle Target / Delete Source / Compensation
→ Runtime Store refresh
```

当前 Queue 行为：

- 插件生命周期内只创建一个 Queue；
- `enqueue<Result>()` 可以承载不同返回类型的异步 Command；
- Queue 本身不依赖 `TrailTask`、Task 状态或具体 Mutation Service；
- Command 严格按进入顺序执行，当前 Command 执行期间后续 Command 保留在队列中；
- 单个 Command 失败只拒绝该 Command，Queue 继续执行后续 Command；
- 插件卸载时拒绝尚未开始的 Command；
- 已经开始的 Command 不伪装成可取消操作，允许其自然结束；
- 每个 Command 自行定义内部文件操作、写后确认和返回结果；
- Task 状态 Command、Quick Capture、Active Fleeting Note 编辑、`ConvertFleetingToTask`、`ConvertFleetingToProject` 与 Fleeting Note 生命周期 Command 都将写入调用封装在 `runtimeStore.runMutation()` 中，并分别作为一个 Queue 单元执行；
- Task UI 显示每个 Task 的 Pending 状态；Quick Capture 显示 `Capturing...`；Active 编辑保存时禁用该 Note 的全部操作；Fleeting Notes UI 显示每条 Note 的转换、Archive、Delete 或 Restore Pending 状态，均不提前改变已确认业务状态；
- 任一 Fleeting Note 跨文件 Command 返回 `partial` 时，会阻止该 UUID 在所有生命周期分区中的直接操作，并显示人工复核提示。

通用调度机制已经完成。Task 状态修改、Quick Capture、Active Fleeting Note 编辑、`ConvertFleetingToTask`、`ConvertFleetingToProject`、Archive、Delete to Trash 和 Restore 均已接入插件级 Queue。真实 Obsidian 已验证 lifecycle `partial` 后其他 Note 的 Delete / Restore 仍可继续、Project 转换 `partial` 后另一条 Project 转换仍可完成，也验证 Active 编辑 Fingerprint 冲突后下一次合法编辑仍可保存，Queue 不会被前一失败阻塞。

### 11.3 Mutation Service

Mutation Service 负责：

1. 验证命令前置条件；
2. 根据 UUID 获取当前对象；
3. 接收目标领域状态；
4. 在最新文件内容中重新定位对象；
5. 校验 Fingerprint；
6. 生成最小文本修改；
7. 使用 `Vault.process()` 或等价 Obsidian File API 原子修改文件；
8. 重新解析写入后的 Markdown，确认命令目标已经成立；
9. 返回重新解析后的领域对象或确认删除成立；
10. 为跨文件 Command 提供可验证的目标创建、来源删除和目标补偿原子操作；
11. 由跨文件 Command 编排补偿并返回结构化结果；
12. 失败时由 Runtime Store Mutation 边界重新读取最终文件状态，而不是假设所有失败都完全无写入。

当前 Project Workspace 将既有 Task 状态写回扩展为一个完整 UI 切片：Areas 可选择 Project；Project 页面提供 Board / List、五状态入口、跨栏拖拽、局部 optimistic 状态与失败回滚。当前实现会：

1. 使用 Store Snapshot 中的 Task UUID 和 Fingerprint 表达预期对象版本；
2. React 只在 Project Workspace 内维护 `taskId → targetStatus` 临时覆盖，不修改 Runtime Store 的已确认业务对象；
3. 原生拖拽或状态下拉框提交后，卡片立即按临时目标状态重新分组并只对该 Task 显示 Pending；
4. 类型化 Task 状态更新函数将 Mutation Service 调用封装在 `runtimeStore.runMutation()` 中，并将其作为一个异步 Command 提交到插件级 Queue；
5. 进入 `completed` 时插件入口生成 `+08:00` `completedAt`；离开 `completed` 时不传完成时间，由既有 Writer 移除 `completed` 字段；
6. Queue 按进入顺序执行该 Command；
7. 在 `Vault.process()` 提供的最新文件内容中重新解析 Project Tasks；
8. 按 UUID 重新定位目标 Task，并校验完整 Task Block Fingerprint；
9. 只替换目标 Task 标题行中的 checkbox 与 `trail:task` JSON；
10. 重新解析 `Vault.process()` 返回的 Markdown，确认目标状态；
11. Mutation 边界在命令完成后统一刷新共享 Runtime Store，确认 Snapshot 到达目标状态后移除临时覆盖；
12. Mutation 期间的自身文件事件不触发中间刷新；
13. 失败时同样刷新最终文件状态，移除该 Task 的临时覆盖，使卡片回到已确认状态，并在卡片附近显示错误。

当前通用 Queue 中某一 Task 状态 Command 失败时：

- 当前命令的 Promise 被拒绝；
- UI 只清除并回滚该 Task 的 Pending / optimistic 状态；
- 文件和已确认 Runtime Store 不因失败命令发生变化；
- 后续排队命令继续执行；
- 后续命令仍使用自己的 UUID、Fingerprint 和目标状态重新校验；
- 如果后续命令的预期版本已经过期，则该命令独立失败。

该 optimistic 层是 UI 派生状态，不是新的事实来源。正常成功路径在 Runtime Store 刷新完成前保持目标卡片位置，避免先移动再闪回；失败路径以最终 Store Snapshot 为准回滚。

### 11.4 已收敛的单文件 Guarded Markdown Edit

Task 状态写回与 Active Fleeting Note 文本编辑此前分别实现了高度相同的单文件安全修改骨架。当前工作区已经把其中真正跨领域稳定的机械步骤收敛到：

```text
plugin/src/domain/trail-guarded-markdown-edit.ts
```

公共 API 以纯 Markdown 变换为边界：

```text
applyGuardedMarkdownEdit(...)
→ 检查调用方是否提供 expected Fingerprint
→ 调用领域 locateLatest(latestMarkdown) 重新定位目标
→ 比较 latestTarget.source.fingerprint 与 expected Fingerprint
→ 调用领域 buildEdit(...) 生成明确 startOffset / endOffset / replacement
→ 通过 replaceMarkdownRange(...) 只替换目标区域
→ 如领域提供 verify(...)，对写后 Markdown 执行额外确认
→ 返回 updated Markdown
```

`replaceMarkdownRange()` 只接受合法整数 offset，并拒绝负数、反向范围和超出 Markdown 长度的区域。公共层不会自动理解 Task、Project、Fleeting Note 或其他领域结构。

实际收敛后的边界比事前设想更窄：

**公共 Guarded Markdown Edit 负责：**

- 对调用方提供的当前 Markdown 执行纯文本 guarded edit；
- 检查 expected Fingerprint 是否缺失；
- 在领域完成重新定位后比较最新 Fingerprint；
- 对领域明确给出的源码范围执行最小 replacement；
- 校验 replacement range 的基本文本边界；
- 在确实产生 edit 时调用可选 `verify(updatedMarkdown)`；
- 保持目标范围之外的 Markdown 原样不变。

**领域 Adapter / Writer 继续负责：**

- 使用哪个 Parser，以及如何根据 UUID 或其他稳定身份重新定位对象；
- 文件无效、对象缺失、重复 UUID 等领域错误；
- Fingerprint 覆盖哪个业务对象范围；
- 允许修改哪个源码区域；
- replacement 如何序列化；
- no-op 条件和业务约束；
- 修改后需要重新解析确认哪些领域不变量；
- 将冲突和结构错误转换为具体领域错误类型。

**Mutation Service / Obsidian 接入层继续负责：**

- 通过 `Vault.process()` 获取并提交最新文件内容；
- 将 Writer / Editor 作为纯 Markdown 变换调用；
- 必要的写后领域确认和错误封装；
- 通过 Runtime Store Mutation 边界完成最终磁盘收敛。

当前两个复用场景：

- `trail-task-writer.ts`：领域层使用 `parseProjectTasks()` 处理 Project 文件错误、Task 缺失 / 重复，公共层处理 expected Fingerprint 与最小区域替换，Task Writer 继续负责完成约束、完成时间、header 序列化等规则；
- `trail-fleeting-note-editor.ts`：领域层先规范化可见文本，再使用 `parseFleetingNotes()` 处理文件 / Note 错误，公共层处理 Fingerprint 与 record replacement，并通过领域 `verify()` 确认 text、`created` 和 `cleanup_due` 不变量。

新增 `trail-guarded-markdown-edit.test.ts` 覆盖：目标 offset 因前置文本变化后重新定位、stale Fingerprint 在 build edit 前拒绝、领域自定义 missing-fingerprint error、no-op 不触发 verify，以及非法 replacement range 拒绝。与 Task Writer、Fleeting Note Editor、Mutation Service 和 Fleeting Note create/edit service 的定向回归一起，本轮报告 5 个测试文件、46 / 46 tests 通过；目标文件 ESLint、TypeScript typecheck 与 `git diff --check` 通过。

本次只是纯领域代码收敛，没有新增 Obsidian Host 行为，因此没有为这一内部重构单独增加新的真实 Obsidian 操作路径。下一次真实宿主级能力验证留给 Task Title Modal POC。

这次收敛证明未来 Task title、Project Overview、Task Note 等单文件区域编辑不需要重新复制 guarded edit 骨架；它们仍可能需要自己的 Parser、source range、序列化和领域验证，这些由正式设计按数据结构决定。

### 11.5 代表性跨文件 Mutation POC

当前已实现 `ConvertFleetingToTask` 的领域/服务层 POC：

```text
输入：预期 Fleeting Note、目标 Project、全新 Task UUID、Task created 时间
→ 在目标 Project 中创建 backlog / medium Task
→ 重新解析并确认目标 Task
→ 从 Fleeting Notes 文件删除预期来源记录
→ 重新解析并确认来源记录已不存在
```

该 Command 不复用 Fleeting Note UUID。目标创建和来源删除均使用最新 Markdown、UUID 重新定位、Fingerprint 冲突检查、`Vault.process()` 和写后验证。

失败结果：

```text
目标创建失败
→ unchanged
→ 来源不处理
→ 没有确认成功创建的目标；最终磁盘状态仍以 Mutation 结束后的刷新为准

来源删除失败 + 目标补偿成功
→ compensated
→ 目标 Task 撤销已确认；来源最终状态由刷新结果确认

来源删除失败 + 目标补偿失败
→ partial
→ 目标补偿没有确认成功；来源与目标最终状态由刷新结果确认
→ 保留目标结果、来源错误和补偿错误供人工处理
```

完整成功后使用同一输入重试不会重复创建 Task，也不会因来源已经不存在而失败。跨文件执行器本身可作为一个 Queue Command 执行，保证后续命令不会插入多个文件步骤之间；接入插件时还必须由 `runtimeStore.runMutation()` 包裹，使 UI 只在整个 Command 结束后读取最终状态。

真实 Obsidian 已通过临时宿主级故障注入验证成功、`unchanged`、`compensated` 和 `partial` 路径。`unchanged` 不留下目标 Task，`compensated` 撤销已创建目标并保留来源 Note，`partial` 同时保留来源 Note 与已创建目标 Task 并进入人工复核状态；每种结果都由 Runtime Store 最终刷新收敛到磁盘真实状态，且未出现 Frontmatter Data issues。`partial` 后人工恢复目标文件并重新打开 Trail View，无需重载插件即可再次正常转换，Queue 也能继续执行后续命令。故障注入仅在 Obsidian Developer Console 中临时拦截 `Vault.process()`，没有加入永久生产入口。当前仍缺少产品化人工恢复操作与恢复后自动解除 `Review required` 的交互。最小 UI 不做乐观删除，转换完成后依赖 Runtime Store 最终刷新收敛。

`ConvertFleetingToProject` 复用同一跨文件执行器，并新增可复用的 Project Creation Service：

```text
输入：预期 Fleeting Note、目标 Area、用户确认的 Project name、全新 Project UUID、Project created 日期
→ 校验 Project name 与目标路径
→ 使用 Vault.create() 创建 planned Project
→ cachedRead() 读取创建结果
→ Project Parser 确认 UUID、Area、created、status、Overview、空 Tasks 与空 Notes
→ 从 Active Fleeting Notes 文件删除预期来源记录
→ 来源失败时，通过 FileManager.trashFile() 补偿未变化的新 Project
```

Project 文件名建议值从 Fleeting Note 的可见文本派生，移除 Markdown 链接包装和 Windows 非法字符，保留用户最终编辑权。目标路径已有不同文件或文件夹时返回 `unchanged`，不得覆盖；完全一致的目标可作为幂等重试确认。补偿前比较完整 Markdown 创建快照，目标已经变化时拒绝删除并返回 `partial`。

真实 Obsidian 已验证：成功路径创建一个新 UUID 的 `planned` Project，Frontmatter 与 `Overview / Tasks / Notes` 结构正确，Overview 保留来源 Fleeting Note 文本；同名 `Trail POC.md` 路径冲突返回 `unchanged` 且既有文件未修改；来源删除与 Project 补偿同时失败时返回 `partial`，来源 Note 与新 Project 同时保留并阻止直接重试。人工删除 partial 目标 Project、重新打开 Trail View 后，无需重载插件即可正常再次转换；同一插件实例中的后续 Project 转换也正常完成，证明 Queue 继续执行。故障注入完成后，`Vault.process()` 与 `FileManager.trashFile()` 临时 Hook 均已明确恢复并确认不存在残留。

同一跨文件执行器已经用于 Fleeting Note 生命周期：

```text
Archive / Delete
→ 在 Archive 或 Trash 创建并确认完整记录
→ 从 Active 精确删除来源记录
→ 来源失败时补偿删除生命周期目标记录

Restore
→ 在 Active 创建并确认完整记录
→ 从 Archive 或 Trash 精确删除来源记录
→ 来源失败时补偿删除 Active 目标记录
```

Archive、Delete、Restore 成功路径已在真实 Obsidian 中验证；恢复后 UUID、`created` 和显示顺序保持稳定。代表性 Archive `partial` 通过临时宿主故障注入验证：Active 与 Archive 同时保留同 UUID 记录，Reader 不隐藏任一真实记录，并报告跨生命周期重复 UUID Data issue；UI 在两处均显示 `Review required`。人工删除重复 Archive 记录后 Store 自动收敛，重新打开 Trail View 可继续正常 Archive / Restore，且同一插件实例中的后续 Delete / Restore 命令正常执行。当前仍缺少产品化的 `partial` 恢复动作和恢复后原 View 内自动解除阻断状态。

### 11.6 Quick Capture 与 Active 编辑 POC

Quick Capture 和 Active 文本编辑复用现有生命周期文件 Source、Parser、全局 Queue 与 Runtime Store Mutation 边界，但不使用跨文件补偿执行器。

创建路径接收纯文本、UUID 和 `created`：

- 文本在 Writer 层再次标准化，必须是一个非空单行，且不能包含 `trail:fleeting` 元数据标记；
- Active 文件存在时通过 `Vault.process()` 追加完整记录；文件不存在时通过 `Vault.create()` 一次创建完整 Markdown，不留下空文件；
- 写后重新解析并按 UUID 确认文本与 `created`；
- UI 只在 Command 成功后清空 Capture draft，失败时保留输入。

编辑路径接收“点击 Edit 时的预期 Note Snapshot”和新文本：

- UI 将预期 Note 独立保存在编辑状态中，而不是在每次 Runtime Store 刷新后从最新 props 重建；
- Writer 在 `Vault.process()` 最新 Markdown 中重新解析并按 UUID 定位；
- 最新对象的 Fingerprint 必须等于编辑开始时的 Fingerprint；
- 只替换顶层记录可见文本，复用原元数据 comment；
- 写后确认 UUID、`created` 与可选 `cleanup_due` 保持不变；
- Fingerprint 冲突、记录缺失或重复 UUID 时拒绝写入，编辑器保持打开并保留 draft。

真实 Obsidian 已验证：文件缺失时 Capture 成功创建 Active 文件；正常编辑只更新文本；编辑期间外部脚本把 `QC-User` 改为 `QC-External` 后，Runtime Store 自动刷新但编辑器仍保留 `QC-Draft` 和旧 Fingerprint，Save 返回 `The Fleeting Note changed after it was read.`；Cancel 后卡片显示外部最新文本，随后再次编辑并保存成功。该测试证明编辑预期版本不会被刷新覆盖，冲突不会盲目写回，也不会阻塞后续 Queue Command。

## 12. 写回策略

### 12.1 精确修改

禁止在整个文件中盲目搜索第一个 `- [ ]`、相同标题或旧 Offset。

每次修改：

1. 读取最新文件；
2. 使用 UUID 重新定位目标对象；
3. 验证目标对象和 Fingerprint；
4. 生成最小 Patch；
5. 写回；
6. 重新解析受影响文件；
7. 以解析结果确认最终状态。

### 12.2 规范化目标状态

从任何状态移动到 Doing：

```text
status=doing
checkbox=[ ]
删除 completed
保留 id、due、priority、created、labels
```

从任何状态移动到 Completed：

```text
先检查全部 Subtask
status=completed
checkbox=[x]
completed=<当前东八区时间>
```

### 12.3 时间来源

- 以操作系统时钟为来源；
- Trail 不自行校准错误系统时间；
- Task `created` 和 `completed` 固定转换到 `Asia/Shanghai` / `+08:00`；
- 精确到秒；
- `due` 只保存日期；
- 第一版不记录 `doing_at`、Task 总耗时或状态持续时间。

## 13. Due Date、Priority 与 Label

### 13.1 Due Date

持久化格式：

```text
YYYY-MM-DD
```

Task Detail Modal 提供：

- 选择日期；
- 清除 Due Date；
- `+1`；
- `+7`。

快捷顺延规则：

1. 有 Due Date：以当前 Due Date 为基准增加 N 个自然日；
2. 无 Due Date：以当前东八区日期为基准增加 N 个自然日；
3. 结果落在周六或周日：顺延到下周一。

Due Date 只用于排序、剩余时间展示和后续日期视图，不产生额外 overdue 业务状态，也不自动修改 Priority。

### 13.2 Priority

```text
low
medium
high
urgent
```

默认 `medium`。`urgent` 可以在 Dashboard 中重点聚合，但 Task 仍保留在原 Project Board 中。

### 13.3 Label

Label 是可选横向分类。

第一版查询范围：

```text
Project + Label → 当前 Project Task
Area + Label    → 当前 Area 跨 Project Task
```

不提供 Trail 顶层全局 Label 浏览。

输入联想：

1. 当前 Project 已有 Label；
2. 当前 Area 其他 Project 已有 Label；
3. 允许明确创建新 Label；
4. 不联想其他 Area。

命名优先使用简短、完整、清晰的词，尽量避免非通用缩写。具体 Label 建议内容后续再定。

## 14. UI 行为

### 14.1 Project Board / List

- Areas 中的 Project 是可操作入口，点击后设置当前 Project 并进入 Project 页面；
- 当前 Project 在四个顶层页面切换期间保持；若该 Project 被外部删除，则回退到当前 Snapshot 的第一个 Project；
- Board 与 List 读取同一个当前 Project、同一批 Task 和同一套有效状态；
- Board 按 `backlog / todo / doing / blocked / completed` 分栏；
- 使用原生 HTML5 Drag and Drop，只允许跨状态栏拖拽；
- 同栏不允许手工排序，Drop 到当前状态不提交 Command；
- 状态下拉框与拖拽调用同一个状态更新函数，作为键盘与测试兜底；
- 主 Task 原生 Markdown checkbox 不在卡片中直接显示；
- Task 卡片展示 Priority、Due、Label 和 Subtask 完成摘要；
- Board 每列与 List 均按 Priority（urgent → high → medium → low）、有 Due 优先、Due 升序、Created 升序、UUID 稳定排序；
- Completed 第一版展示当前 Project 的全部已完成 Task；
- Board / List 切换不改变当前 Project、Task optimistic 状态、Pending 或局部错误。

### 14.2 Task Detail Modal

最终产品中的 Task Detail 仍遵循 Product / HLD 已确定的 Modal 方向：点击 Task 后覆盖当前页面并阻断底层交互，关闭后返回原 Project 与原 Workspace 上下文。

最终产品目标区域仍包括：

```text
Task Title
Status / Priority / Due Date / Labels
Created / Completed / Area / Project
Subtasks
Notes
More Actions
```

但 POC 不以一次实现全部 Task 字段为通过条件。当前 Modal POC 只选择 **Task title** 作为代表性 draft 字段，用它验证此前尚未证明的宿主与交互能力：

```text
Project Board / List
→ 点击 Task
→ 打开阻断式 Task Modal
→ 固定 expected Task Snapshot
→ 在 Modal 内维护 title draft
→ Save
→ 进入全局 Queue 与 Runtime Store Mutation 边界
→ 调用领域 Task Adapter + Guarded Markdown Mutation
→ 写后重新解析确认
→ Runtime Store 收敛
→ 关闭 Modal，原 Project 与 Board / List 上下文保持
```

Modal POC 通过标准：

- 使用既定 Obsidian Modal 宿主能力，必要时在其内容区域挂载 React；
- Modal 打开时底层 Trail 页面不可操作；
- Task 身份继续使用 UUID，打开 Modal 时固定 expected Task Snapshot，Store 后续刷新不能静默替换该预期版本；
- title draft 只存在于 Modal 本地状态，不写入 Runtime Store 的已确认对象；
- Save 期间防止重复提交；
- Save 成功后由 Runtime Store 最终 Snapshot 确认新标题，再关闭 Modal；
- Save 失败或 stale Fingerprint 冲突时保留 Modal、draft 和错误，不覆盖最新 Markdown；
- 没有 dirty draft 时允许 Esc 或遮罩关闭；存在 dirty draft 时不得静默丢弃，POC 可以采用最小确认交互；
- Cancel / 关闭后恢复原 Project、Board / List 模式以及已有 Workspace 上下文；
- 中文输入法 composition 不应因 Enter 误触发保存；
- 只实现验证上述能力需要的最小视觉结构，不提前完成正式 Task Detail Design System。

Status、Priority、Due、Label、Subtask 与 Task Note 在这个 POC 中可以只读展示或暂不展示；它们是否进入正式 Modal 编辑属于后续 LLD / Implementation，而不是本轮 POC 的能力通过条件。

### 14.3 Fleeting Notes UI

当前 POC 已实现 Fleeting Note 生命周期页面：

- Dashboard 显示 Active Fleeting Note 数量，并提供一个单行 Quick Capture 输入与 `Capture` 按钮；
- 从 Runtime Store Snapshot 分别读取 Active、Archived 和 Trash 记录；
- 三个分区使用卡片布局，展示数量、文本、创建时间、可选 `cleanup_due` 以及归档 / 删除时间；
- 每个分区没有记录时展示独立空状态；
- Active Note 使用原生 `<select>` 选择目标 Project，默认指向第一个可用 Project；
- Active Note 提供 Edit、`Convert to Project`、`Convert to Task`、Archive 和 Delete；Archived 与 Trash Note 提供 Restore；
- Edit 使用单行输入、Save 与 Cancel；Save 成功后关闭编辑器，失败时保留 draft 与错误；打开编辑器时固定预期 Note Snapshot，Store 刷新不替换该 Snapshot；
- Capture 期间显示 `Capturing...` 并禁用输入；Active 编辑保存期间禁用该 Note 的全部操作；其他操作期间只禁用当前 UUID 的相关控件并显示 `Converting...`、`Archiving...`、`Deleting...` 或 `Restoring...`；
- 成功后不做乐观移动，由 Runtime Store 最终刷新更新三个分区；
- Active、Archived 和 Trash 均按原始 `created` 升序显示，Restore 的物理追加不会改变视觉顺序；
- `unchanged` / `compensated` 显示可重试错误，`partial` 在同 UUID 的所有分区中显示人工复核提示并阻止直接重试；
- 三个生命周期文件及其目录的创建、修改、删除和重命名通过文件事件自动刷新页面。

当前卡片布局只用于改善 POC 可用性，并非最终 Design System。正式交互仍需实现：

- 右键或上下文菜单以及更紧凑的次级操作；
- 更完整的 Project 选择、搜索、窄窗口与移动布局；
- `cleanup_due` 等完整 Fleeting Note 字段编辑与 Convert to Subtask；
- 产品化 `partial` 恢复入口。

## 15. 错误、冲突与 Reconciliation

### 15.1 对象级错误

例如：

- JSON 损坏；
- UUID 缺失或重复；
- 必填字段缺失；
- `status` 或 `priority` 非法；
- checkbox 与 `status` 不一致；
- `completed` 与状态不一致；
- Task 内部结构无法解析但不影响其他 Task。

处理：

- 仅排除该对象；
- 其他合法对象继续进入 Store；
- 汇总显示 Obsidian Notice；
- 不自动修复原 Markdown。

### 15.2 文件级错误

例如：

- Frontmatter 无法解析；
- Project UUID 缺失或重复；
- 必需区域缺失或重复；
- Tasks 区域边界整体无法判断；
- 文件无法读取。

处理：

- 整个 Project 不进入 Trail；
- 显示 Notice；
- 可以保留最后一次可用 Store 快照用于展示；
- 禁止继续写回异常文件。

同一错误未变化时不重复弹出 Notice。

### 15.3 Fingerprint 冲突

冲突定义：

> 命令准备修改的 UUID 对象，在写回前已经被 UI 外部或其他未预期来源修改。

可能来源：

- 认可脚本；
- Git 更新；
- Obsidian Sync；
- 原生 Markdown 手工修改；
- 其他插件；
- 对象被删除或复制。

处理：

```text
拒绝当前写入
→ 保留或恢复最后确认业务状态
→ 重新解析最新文件
→ 保留仍有价值的用户 draft
→ 显示对象级错误或 Notice
```

不自动合并，不盲目重试。Active Fleeting Note 编辑在点击 Edit 时固定预期 Note 与 Fingerprint；之后 Runtime Store 即使因外部文件事件刷新，也不能替换该预期版本。冲突 Save 保持编辑器与 draft，Cancel 后展示最新 Store 记录。未来采用乐观 UI 的操作则需要回滚临时业务状态。

### 15.4 跨文件 Mutation 失败结果

代表性跨文件 Command 不把“抛出错误”等同于“磁盘完全未变化”。调用方必须读取结构化结果：

- `unchanged`：没有确认成功创建的目标，来源步骤未开始；这不是跳过最终磁盘刷新；
- `compensated`：来源处理失败，但目标撤销已经确认；来源最终状态仍由刷新结果确认；
- `partial`：来源处理失败且目标补偿也失败，需要向用户暴露可人工处理的部分结果。

无论哪种结果，Runtime Store Mutation 边界都在 Command 结束后重新读取最终文件状态。`partial` 不进行无依据的自动重试，也不隐藏目标对象。

真实 Obsidian 宿主验证已经覆盖：Fleeting Note → Task 的 `unchanged`、`compensated`、`partial` 和人工恢复；生命周期 Archive / Delete / Restore 成功路径；生命周期 Archive 的代表性 `partial`、跨文件重复 UUID Data issue、人工恢复，以及失败后 Queue 继续执行。正常路径中 Store 与最终磁盘状态一致且没有短暂 Frontmatter Data issues；生命周期 `partial` 则按设计保留两份真实记录并明确报告 Data issue，不把部分结果误判为成功或隐藏。

### 15.5 乐观 UI

Project Workspace 已为 Task 状态流转实现局部 optimistic UI：

- 已确认的 Runtime Store Snapshot 保持不可变，不直接写入临时业务状态；
- Workspace 维护每 Task 的临时目标状态 Map，并据此派生 Board / List 中的有效状态；
- 拖拽或状态选择后卡片立即移动，只有当前 Task 显示 `Updating...`；
- 成功时保持临时目标状态直到 Runtime Store Snapshot 确认相同状态，再清除覆盖，避免可见回跳；
- 失败时清除该 Task 的临时覆盖，卡片回到最终已确认状态，并显示局部错误；
- 其他 Task 不被禁用，仍可进入全局 Queue；
- 切换 Board / List 不丢失当前 Project、optimistic 状态或错误；
- Project 切换会清理上一 Project 的临时交互状态，避免跨 Project 污染。

当前流程：

```text
用户拖拽或选择状态
→ Project Workspace 应用 Task 局部临时目标状态
→ UI 立即更新
→ Command 进入全局串行队列
├── 成功：Runtime Store 最终刷新确认，移除临时覆盖
└── 失败：Runtime Store 最终刷新 + 移除临时覆盖 + 显示局部错误
```

当前 POC 已经证明一类 **Immediate Mutation** 交互：用户点击或拖拽后立即产生临时 UI 状态，随后由 Queue、Mutation、Runtime Store 确认或回滚。

另一类尚待 Task Modal 验证的是 **Draft-based Mutation**：

```text
打开 Editor / Modal
→ 固定 expected Snapshot
→ 用户只修改本地 draft
→ 明确 Save
→ Command 进入全局串行队列
├── 成功：重新解析 + Runtime Store 确认后结束编辑
└── 失败 / 冲突：保留 draft 与编辑上下文，不覆盖最新磁盘内容
```

Priority、Due Date、Label 与 Subtask checkbox 未来可能采用 Immediate Mutation 或 Draft-based Mutation，取决于最终交互设计；POC 不要求逐字段重复证明已经成立的 Queue、Fingerprint、回滚和 Store 收敛机制。

### 15.6 文件事件

当前 POC 在 Obsidian Workspace 完成布局后注册 Vault 事件监听，并由插件生命周期统一管理：

- `create`：新建受管理 Markdown 或相关目录时安排刷新；
- `modify`：受管理 Markdown 保存时安排刷新；
- `delete`：删除受管理 Markdown 或相关目录时安排刷新；
- `rename`：新路径或旧路径任一属于管理范围时安排刷新。

当前读取范围只接受：

```text
Trail/Areas/<Area>/<File>.md
```

事件范围额外接受 `Trail`、`Trail/Areas` 和直接 Area 目录，以便整目录创建、删除或重命名时也能触发 Reconciliation。Trail 范围外文件、嵌套更深的 Markdown 和非 Markdown 文件会被忽略。

事件进入 Runtime Store 后使用短延迟防抖，并在刷新重叠时合并为尾随刷新。`runMutation()` 会在命令开始时取消尚未执行的事件刷新，在命令期间忽略新的调度请求，并在最外层命令结束后统一全量读取一次。这样多文件 Command 不会因第一步写入事件而向 UI 暴露中间状态。

当前 POC 采用防抖后的全量 Trail Vault 重读，已经实机验证：

- 外部编辑 Task 标题时 UI 自动同步；
- Trail 自身双向状态写回不会造成可见闪回；
- Project 文件创建、删除和重命名后 UI 自动收敛；
- 无关 Markdown 修改不会改变 Trail 数据。

主动刷新与防抖刷新协调已经通过自动化测试。正常数据规模验证未显示需要提前引入受影响文件级增量解析；更精确的自身事件标识仍由后续真实交互问题驱动。

### 15.7 正常数据规模验证

`npm run bench:vault` 提供可重复的全量读取基准，但不加入日常测试或 CI 硬阈值。当前公司电脑上，10,000 Tasks 场景平均约 98 ms，25,000 Tasks 压力场景平均约 519 ms。

真实 Obsidian 验证通过 Vault API 创建 20 Areas、500 Projects 和 10,000 Tasks。最后一个文件创建完成约 251 ms 后，Trail 自动收敛到正确数量且没有 Data issues；插件 disable / enable、页面切换和通过 Vault API 批量清理均正常。

当前继续保留防抖后的全量 Trail Vault 重读。只有未来真实交互或更大数据规模出现明确阻塞时，才进入增量解析和局部 Store 更新设计。

### 15.8 真实 Obsidian 测试协议

每次真实 Obsidian 测试开始前必须明确：

1. 当前分支、HEAD、工作区与测试数据状态；
2. Obsidian 是否保持打开，Trail 插件是否需要重新加载；
3. 应打开的 Trail 页面或原生 Markdown 文件；
4. 精确测试数据、目标名称，以及哪些控件保持默认值；
5. 是否需要 Developer Console 故障注入、使用的全局 Hook 名称及恢复命令；
6. UI、文件和 Git 工作区的预期结束状态。

测试数据使用简短且明显不同的名称，避免多个长标题只相差少数字词。当前仍处于能力导向的功能验证 POC，而非 UI 设计阶段；只增加验证功能所需的最小布局，不为测试便利提前扩展产品页面。

每次测试结束必须明确：

- 哪些测试文件保留到下一步，哪些立即清理；
- Trail View 是否保持打开、关闭后重开、重新加载插件或关闭 Obsidian；
- Runtime Store 应收敛到什么状态；
- 临时 Console Hook 是否已经恢复；故障注入结束后必须执行统一恢复命令，并确认对应 `globalThis` Hook 为 `undefined` 后再关闭 Developer Tools；
- 失败现场是否仍需保留用于人工恢复验证。

## 16. Minimum Demo / POC 能力矩阵

POC 以“技术能力是否已经被真实路径证明”为主维度。具体 Task、Project、Fleeting Note 功能用于提供代表性证据；同一能力一旦被多个不同场景证明，不要求继续穷举全部产品字段。

状态定义：

- **已验证**：自动化测试与必要的真实 Obsidian 路径已经证明该能力；
- **部分验证**：核心机制已成立，但仍有一个与正式设计直接相关的新宿主 / 交互 / 通用化问题未证明；
- **待验证**：尚缺决定正式架构所需的关键证据。

| 能力 | 状态 | 当前代表性证据 | 剩余 POC 问题 |
|---|---|---|---|
| Vault Discovery 与 Snapshot 读取 | 已验证 | Trail 管理范围发现；`cachedRead()`；同一 Snapshot Frontmatter / Body | 无当前阻塞项 |
| 领域解析与稳定身份 | 已验证 | Area / Project / Task / Fleeting Note；UUID；重复 UUID；对象 / 文件错误隔离 | 更复杂富文本解析按正式需求增加 |
| Source Range 与 Fingerprint Guard | 已验证 | Task Block、Fleeting Note record；offset 变化后 UUID 重定位；外部修改拒绝 | 无当前阻塞项 |
| 单文件最小区域修改 | 已验证 | `applyGuardedMarkdownEdit()` 被 Task 状态 Writer 与 Active Fleeting Note Editor 共同复用；UUID 重新定位由领域层负责；公共 Fingerprint Guard + range replacement；46 / 46 定向回归 | 新对象继续提供自己的 Parser、source range、序列化和领域验证，不重复 guarded edit 骨架 |
| 单文件创建 / 插入 / 删除 | 已验证 | Quick Capture；Task 创建 / 撤销；Fleeting Note 精确删除 | 新对象类型继续通过领域 Adapter 复用 |
| 写后重新解析与领域确认 | 已验证 | Task 状态、Task / Project 创建、Fleeting Note 创建 / 编辑 / 生命周期 | 无当前阻塞项 |
| 跨文件 Mutation 与补偿 | 已验证 | Fleeting Note → Task / Project；Archive / Delete / Restore；`unchanged / compensated / partial` | `partial` 产品化恢复 UI 不属于基础能力阻塞项 |
| 全局串行 Mutation Queue | 已验证 | 不同返回类型 Command 串行；单命令失败后继续；插件卸载拒绝未开始命令 | 无当前阻塞项 |
| Runtime Store Mutation 边界 | 已验证 | Mutation 期间抑制中间刷新；成功 / 失败后统一读取最终磁盘状态 | 无当前阻塞项 |
| 文件事件 Reconciliation | 已验证 | create / modify / delete / rename；范围过滤；外部修改与自身写回收敛 | 增量 Reconciliation 仅在真实性能需要时再设计 |
| Immediate / Optimistic UI Mutation | 已验证 | Task 跨状态拖拽与 select；局部 Pending；成功无回跳；失败局部回滚 | 其他字段不需要逐项重复验证 |
| Draft-based Editing | 部分验证 | Active Fleeting Note 固定 expected Snapshot、Save / Cancel、冲突保留 draft | 尚缺阻断式 Modal 宿主、dirty close protection 与 Workspace context 保持 |
| Task Modal 宿主与上下文 | 待验证 | Product / HLD 已确定 Modal 方向 | 用 Task title 完成一次最小真实 Modal 纵向验证 |
| 错误与冲突语义 | 已验证 | 对象 / 文件错误、Fingerprint conflict、跨文件结构化失败、Queue continuation | 产品文案和恢复入口后续细化 |
| 正常数据规模与全量刷新 | 已验证 | 10k / 25k Task benchmark；真实 Obsidian 10k Task 自动收敛 | 当前没有引入增量解析的证据 |
| Obsidian 生命周期接入 | 已验证 | ItemView 单实例、插件 reload、Vault 事件、`Vault.process()`、FileManager | Modal 宿主仍需单独完成一次真实验证 |

### 16.1 当前 POC 收敛顺序

```text
第一次文档校准                     已完成
→ 单文件 Guarded Markdown Edit 收敛  已完成
→ 根据真实代码结果第二次更新文档     当前完成
→ Task Title Modal POC               下一步
→ 重新审视能力矩阵
→ 讨论 POC Exit
```

单文件收敛已经证明 Task 与 Fleeting Note 可以共享 guarded region edit 的机械能力。如果只是新增 Task Priority、Due、Label、Project Overview 或其他同类字段，而没有引入新的技术假设，应把它们留到正式设计 / LLD / Implementation，而不是继续扩大 POC。

## 17. POC 通过与退出标准

POC 可以进入结束讨论，需要满足：

- Markdown 作为唯一事实来源的读取、解析、稳定身份和错误隔离路径已经真实可用；
- 单文件修改能够在最新文本上重新定位、Guard stale Fingerprint、只修改目标区域、原子保存并写后重新解析确认；
- 上述单文件机械能力已经从至少两个真实领域场景中收敛出稳定公共边界，而不是继续复制实现；
- 创建、删除和代表性跨文件 Mutation 能明确处理成功、未改变、补偿成功和部分失败；
- Plugin-level Queue 与 Runtime Store Mutation 边界能够保证连续命令、失败隔离和最终磁盘收敛；
- 外部文件事件与自身写回都能让 UI 回到真实 Markdown 状态；
- Immediate / optimistic 交互至少有一个真实路径通过；
- Draft-based Modal 交互至少有一个真实路径通过，包括 Save / Cancel、dirty draft、写入失败、Fingerprint conflict 和关闭后上下文保持；
- 正常个人 Vault 数据规模下，没有证据要求提前引入并行业务数据库、增量 Parser 或复杂缓存架构；
- 剩余未实现事项经过能力矩阵复核后，主要属于已验证能力上的产品功能扩展，而不是仍未知的架构风险。

POC **不要求** 在退出前逐项完成 Task Priority、Due、Label、Subtask、Task Note、Project 生命周期、Search、完整 Trash 产品体验或最终 Design System。若其中某项在后续讨论中暴露新的技术假设，再按需要补做定向 POC。

## 18. 后续实现细节

以下事项不阻塞 POC，不再作为当前重要设计讨论：

- Archive 和 Trash 的最终名称；
- 回收站默认保留天数；
- Trash 使用独立文件还是结构化日志；
- Fleeting Note Archive 的最终文件布局；
- JSON Schema 未来首次发生不兼容变更时是否加入 `schema_version`；
- Fingerprint 的具体 Hash 算法；
- 受影响文件级增量 Reconciliation、性能阈值和更精确的自身事件去重；
- Search 排序与索引结构；
- 最终组件库版本、视觉样式和动画；
- 移动端不在当前产品范围；
- 完整 Undo 历史。

## 19. 下一步

```text
已完成：第一次文档校准
→ 已完成：单文件 Guarded Markdown Edit 公共能力收敛与定向回归
→ 当前完成：第二次文档校准，记录真实 API、边界、复用场景和测试结果
→ 下一步：Task Title Modal POC，验证阻断式 Modal 宿主、draft、Save / Cancel、dirty close protection、Fingerprint conflict、失败保留与 Workspace context
→ Modal 验证完成后重新审视第 16 节能力矩阵
→ 与用户讨论是否仍存在真正未知且会影响正式架构的能力
→ 若无新的关键未知：结束 POC，进入 ADR / LLD / Implementation & Test Plan
```

这一顺序刻意把“能力验证”和“产品功能完成度”分开。后续只有当某个具体功能带来新的结构、并发、宿主或性能问题时，才继续以该功能作为新的 POC 载体。

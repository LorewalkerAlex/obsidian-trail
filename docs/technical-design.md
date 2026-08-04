# Trail Technical Design

> 状态：Technical Design 当前基线<br>
> 最后更新：2026-08-04<br>
> 适用对象：个人使用<br>
> 上游基线：`./product-domain-hld.md`<br>
> 当前目标：以已验证的 Plugin-level Runtime Store 与文件事件 Reconciliation 为起点，继续验证全局 Mutation Queue、通用状态操作和乐观 UI 边界

## 1. 文档边界

本文负责回答：

- Trail 管理文件如何表达 Area、Project、Task、Subtask、Task Note 和 Fleeting Note；
- Obsidian API、Trail Parser、Runtime Store 与 React UI 如何协作；
- Trail 对象如何获得稳定身份；
- UI 操作如何转换为领域命令并精确写回 Markdown；
- 状态、Priority、Due Date、Label 和完成时间如何持久化；
- Fleeting Note 转换、删除、回收站和恢复的技术边界；
- 解析失败、写入失败和外部文件变化如何处理；
- POC 需要验证哪些关键假设。

本文暂不固定：

- 最终视觉样式、颜色、图标和卡片布局；
- 完整 Design System；
- Archive 和 Trash 的最终产品命名；
- 回收站最终保留天数和物理序列化格式；
- Fleeting Note Archive 的最终物理组织方式；
- 完整 Undo 历史、状态事件日志和长期迁移工具；
- 生产级 Low-Level Design 与完整测试矩阵。

### 1.1 当前 POC 事实状态

截至 2026-08-04，当前代码已经验证：

- 仓库根目录同时作为 Obsidian Vault；
- 可见的 `Trail/Areas/<Area>/` 作为当前 POC 数据目录；
- 使用 `Vault.getMarkdownFiles()` 发现文件；
- 使用 `Vault.cachedRead()` 读取原始 Markdown；
- 使用 `MetadataCache` 获取 Frontmatter；
- 纯 TypeScript Parser 可以解析 Area、Project、Task、Subtask、Task Note 和 Project Note；
- 典型对象级和文件级异常可以隔离并形成结构化 issue；
- Dashboard、Areas 和 Project 页面可以展示真实解析结果；
- Task Writer 可以在最新 Markdown 中按 UUID 重新定位 Task、校验完整 Task Block Fingerprint，并只替换目标 Task 标题行；
- Task 状态写回会同步规范化 checkbox 和 `completed`，并在存在未完成 Subtask 时拒绝完成父 Task；
- Mutation Service 使用 `Vault.process()` 原子修改文件，并重新解析其返回的 Markdown 确认写入结果；
- Project 页面提供临时 `Mark doing` 操作，可以将既有 `todo` Task 更新为 `doing`；
- 插件入口创建唯一的 Plugin-level Runtime Store，Trail View 订阅同一份已确认 Snapshot；
- Store 支持一次性初始化、主动刷新、刷新期间保留上一份已确认数据、并发刷新尾随合并、文件事件防抖和销毁清理；
- Vault 在布局完成后监听 `create / modify / delete / rename`，只对 Trail 管理范围内的 Markdown 或相关目录安排刷新；
- `rename` 同时检查新旧路径，Trail 范围外、嵌套过深和非 Markdown 文件不会触发数据刷新；
- 当前事件处理采用防抖后的全量 Trail Vault 重读，而不是受影响文件的增量解析；
- 本地 ESLint、7 个测试文件中的 42 个自动化测试、TypeScript typecheck 和生产构建通过；
- Windows Desktop Obsidian 实机读取、最小状态写回和文件事件 Reconciliation 成功；
- 外部逐字修改 Task 标题时，打开中的 Project 页面可以自动同步；
- Project 文件的创建、删除和重命名可以自动更新 Areas 与 Project 页面；
- Trail 自身写回后 UI 保持 `doing`，没有可见闪回；
- Trail 管理范围外的普通 Markdown 修改不会改变 Trail 数据；
- 插件重新加载后仍能从 Markdown 读取写入后的状态；
- 实机写回后的文件与“只替换目标状态字段”生成的预期文件 SHA-256 完全一致；
- 验证结束后 Fixture 已按原始 SHA-256 精确恢复。

当前尚未实现：

- Fleeting Note Parser；
- 全局 Mutation Queue 与通用 Task 状态操作；
- 乐观 UI 与失败回滚；
- 受影响文件级增量 Reconciliation 和更精确的自身事件去重；
- Task Modal、Board 和拖拽；
- Archive、Trash 和恢复。

当前 Project 页面直接显示 Task 标题字符串，Inline Markdown 尚未渲染为富文本。

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
 Metadata + Source Reader
 MetadataCache + Vault read
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

### 3.2 Metadata + Source Reader

职责：

- 使用 `MetadataCache` 获取 headings、sections、list items、links、tags、frontmatter 和源码位置；
- 使用 Obsidian Vault API 读取原始 Markdown；
- 根据 MetadataCache 提供的范围切片源文本；
- 不自行实现完整 Markdown 解析器。

MetadataCache 只负责提供 Markdown 基础结构。`trail:*` 私有元数据的业务语义由 Trail Parser 解释。

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

插件入口创建唯一的 Runtime Store，并将同一个实例传给所有 Trail View。Store 当前保存：

- 最新一次已确认的 `TrailVaultReadResult`；
- 是否已经完成首次初始化；
- 是否正在刷新；
- View 订阅者；
- 当前刷新 Promise、尾随刷新标记和防抖计时器。

当前行为：

- 首次打开任意 Trail View 时只初始化一次；
- 多个 View 共享同一份 Snapshot；
- 刷新期间保留上一份已确认数据，不先清空 UI；
- 刷新进行中再次请求刷新时，合并为一次尾随刷新；
- 文件事件使用短延迟防抖，连续保存不会立即并行读取；
- Vault 读取异常转换为结构化 issue；
- View 关闭时取消订阅，插件卸载时清理计时器和全部订阅者。

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

`Modal`、Zustand、dnd-kit、date-fns 和时区辅助库仍是后续通用交互、队列和完整状态操作阶段的候选方案。当前 Runtime Store 使用纯 TypeScript 实现，尚未证明需要引入 Zustand；其他候选依赖也尚未安装或验证。

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

Fleeting Notes 使用独立 Markdown 文件，正文不需要标题，可以直接由顶层列表开始：

```markdown
- 调研 Obsidian MetadataCache 的位置稳定性 <!-- trail:fleeting {"id":"6bce718b-03df-4a9a-865d-b374139a962e","created":"2026-08-03T12:43:00+08:00","cleanup_due":"2026-08-10"} -->
- 考虑增加日期视图 <!-- trail:fleeting {"id":"8ae1f03d-5944-4ee2-9882-0e4ed96b1d45","created":"2026-08-03T12:44:00+08:00"} -->
```

规则：

- 每条 Fleeting Note 是顶层普通列表项；
- 每条记录包含唯一 `trail:fleeting` JSON comment；
- `id` 和 `created` 必填；
- `cleanup_due` 可选，格式为 `YYYY-MM-DD`，用于处理提醒；
- Fleeting Note 可以包含简单行内 Markdown；
- 第一版不支持直接转换为 Subtask。

### 7.2 Fleeting Note 操作

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
CreateProject(new UUID, content derived from Fleeting Note)
→ 确认目标 Project 创建成功
→ Archive 或删除原 Fleeting Note
```

转为 Task：

```text
用户选择目标 Project
→ CreateTask(new UUID, status=backlog, priority=medium)
→ 确认目标 Task 创建成功
→ Archive 或删除原 Fleeting Note
```

新对象不复用 Fleeting Note UUID，因为它是新创建的 Project 或 Task。

Fleeting Notes 在实现上可以复用 Task 卡片、UUID、文本编辑、Archive、Delete、Trash 和串行 Mutation 等基础设施，但领域类型仍保持独立。

## 8. Trash 与恢复

删除操作不直接永久清除对象。

删除流程：

```text
创建可恢复快照
→ 写入 Trash
→ 确认 Trash 写入成功
→ 从原位置删除对象
```

Trash 快照至少保存：

```text
原对象 UUID
对象类型
原文件路径或容器 UUID
删除时间
原始 Markdown 内容或等价可恢复数据
```

恢复流程：

```text
读取 Trash 快照
→ 校验目标位置和 UUID
→ 恢复对象
→ 删除 Trash 快照
```

Trail 在启动时和运行期间低频检查 Trash。超过保留期的对象才永久删除。

回收站保留天数和物理文件格式不属于当前重要设计决策，由 POC / LLD 采用简单默认值。

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
ConvertFleetingToProject
ConvertFleetingToTask
ArchiveFleetingNote
DeleteToTrash
RestoreFromTrash
```

当前不存在 `MoveTaskToProject`。

### 11.2 全局 Mutation Queue

所有 Trail 写入进入一条全局串行队列：

```text
Command A
→ 写回并重新解析确认
→ Command B
→ 写回并重新解析确认
→ Command C
```

用户可以连续操作，UI 可以先应用乐观状态，但文件写回按队列顺序执行。

该设计避免：

- 两个命令同时基于旧文件版本写回；
- 后写命令覆盖先写命令；
- 跨文件转换与普通写入交错；
- POC 阶段引入不必要的并发调度。

### 11.3 Mutation Service

Mutation Service 负责：

1. 验证命令前置条件；
2. 根据 UUID 获取当前对象；
3. 生成目标领域状态；
4. 在最新文件内容中重新定位对象；
5. 校验 Fingerprint；
6. 生成最小文本修改；
7. 使用 `Vault.process()` 或等价 Obsidian File API 原子修改文件；
8. 成功后重新解析并确认 Store；
9. 失败时回滚乐观状态并显示 Notice。

当前 POC 已实现一个经过 Plugin-level Runtime Store、但不经过全局队列和乐观 UI 的最小垂直切片：Project 页面将既有 `todo` Task 更新为 `doing`。当前实现会：

1. 使用 Store Snapshot 中的 Task UUID 和 Fingerprint 表达预期对象版本；
2. 在 `Vault.process()` 提供的最新文件内容中重新解析 Project Tasks；
3. 按 UUID 重新定位目标 Task；
4. 校验完整 Task Block Fingerprint；
5. 只替换目标 Task 标题行中的 checkbox 与 `trail:task` JSON；
6. 重新解析 `Vault.process()` 返回的 Markdown，确认目标状态；
7. 成功后主动刷新共享 Runtime Store；
8. 同一写入产生的 Vault 文件事件也进入防抖 Reconciliation，Store 会收敛到 Markdown 最新事实；
9. 失败时保持文件和已确认 Store 数据不变，并在 Project 页面显示错误。

这一实现已经验证单次精确写回、共享 Store 确认和自身文件事件下无可见闪回，但不代表全局 Mutation Queue、通用状态控件或乐观回滚已经完成。

队列中某一命令失败时：

- 当前命令失败并回滚；
- 重新解析受影响文件；
- 后续命令执行前重新校验前置条件；
- 合法则继续，不合法则单独失败；
- 不因一次失败清空整个队列。

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

### 14.1 Project Board

- 按 `backlog / todo / doing / blocked / completed` 分栏；
- 只允许跨状态栏拖拽；
- 同栏不允许手动排序；
- 主 Task 原生 Markdown checkbox 不在卡片中直接显示；
- Task 卡片展示 Priority、Due、Label 和 Subtask 摘要；
- Completed 第一版展示当前 Project 的全部已完成 Task。

### 14.2 Task Detail Modal

主要区域：

```text
Task Title
Status / Priority / Due Date / Labels
Created / Completed / Area / Project
Subtasks
Notes
More Actions
```

行为：

- Status、Priority、Due、Label 和 Subtask checkbox 操作后立即提交 Command；
- 标题、Subtask 文本和 Task Note 点击后进入编辑态；
- `Enter` 确认并保存；
- Note 中 `Shift + Enter` 换行；
- `Esc` 取消；
- 中文输入法处于 composition 状态时，Enter 不触发保存；
- 未确认文本只存在于 Modal draft；
- 有未确认 draft 时，Modal 不直接关闭；
- 关闭后恢复原页面、滚动位置和筛选上下文。

次级菜单包含：

```text
打开并定位源 Markdown
Delete
```

不包含跨 Project Move。

### 14.3 Fleeting Notes UI

- Fleeting Note 以卡片展示；
- 右键或上下文菜单提供转为 Project、转为 Task、Archive、Delete；
- 转为 Task 时选择目标 Project；
- 转换成功后处理原 Fleeting Note；
- Quick Capture 直接创建新的 Fleeting Note UUID 和记录。

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
→ 回滚本次乐观 UI
→ 重新解析最新文件
→ 显示 Notice
```

不自动合并，不盲目重试。

### 15.4 乐观 UI

适用于：

- Board 状态拖拽；
- Priority 修改；
- Due Date 修改；
- Label 修改；
- Subtask checkbox。

流程：

```text
用户操作
→ Store 立即应用目标状态
→ UI 立即更新
→ Command 进入全局串行队列
├── 成功：以重新解析结果确认
└── 失败：回滚到最后确认状态并显示 Notice
```

### 15.5 文件事件

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

事件进入 Runtime Store 后使用短延迟防抖，并在刷新重叠时合并为尾随刷新。当前 POC 采用防抖后的全量 Trail Vault 重读，已经实机验证：

- 外部编辑 Task 标题时 UI 自动同步；
- Trail 自身写回不会造成可见闪回；
- Project 文件创建、删除和重命名后 UI 自动收敛；
- 无关 Markdown 修改不会改变 Trail 数据。

受影响文件级增量解析、更精确的自身事件标识与性能阈值留到数据规模验证后决定。

## 16. Minimum Demo / POC 验证清单

以下为同一个完整 POC 的优先级清单，不拆成多个产品阶段。

当前已经完成并自动化或实机验证的相关子集包括：管理目录扫描、Area / Project / Task 解析、固定区域与 Task Block 边界、Subtask 与 Note 区分、对象级和文件级错误隔离、Task 标题行精确修改、状态与完成字段规范化、完成约束、UUID 重新定位、Fingerprint 冲突拒绝、写后重新解析确认、Windows 换行保持、最小 Git Diff、Plugin-level Runtime Store、共享 Snapshot、刷新尾随合并、文件事件防抖、create / modify / delete / rename Reconciliation、无关路径过滤、自身写回无可见闪回以及重启后从 Markdown 恢复状态。

尚未完成的条目仍保留在同一清单中，不因最小写回和文件事件 Reconciliation 通过而视为完整 POC 已通过。

| 优先级 | 验证内容 | 通过标准 |
|---|---|---|
| P0 | 扫描 Trail 根目录 | 只发现预设管理目录中的对象 |
| P0 | Area 与 Project UUID | 能从 Frontmatter 构建稳定身份并检测重复 UUID |
| P0 | Area 与 Project 识别 | 从目录和文件构建正确层级 |
| P0 | Project Frontmatter | 合法文件载入，非法文件排除 |
| P0 | 固定区域识别 | 唯一识别 `Overview / Tasks / Notes` |
| P0 | JSON HTML 元数据 | 正确解析、校验和规范化 `trail:task` |
| P0 | Task UUID | React、Store、Modal 和 Command 使用同一稳定 ID |
| P0 | Task 识别 | 只识别 Tasks 区域中的顶层 checkbox + `trail:task` |
| P0 | Task Block 边界 | 正确包含全部 Subtask、Task Note 和嵌套内容 |
| P0 | Subtask 与 Note 区分 | checkbox 是 Subtask，普通列表项是 Note |
| P0 | Inline Markdown | 中文、wikilink、粗体和行内代码不破坏解析 |
| P0 | 精确修改标题 | 只修改目标 Task 标题 |
| P0 | 修改元数据字段 | Status、Priority、Due、Labels 不破坏其他字段 |
| P0 | 状态转换 | 目标区域直接决定 Status、checkbox 和 completed |
| P0 | 状态任意转换 | 除完成约束外可直接进入任意状态 |
| P0 | 固定排序 | 不支持同栏手动排序，自动按 Priority、Due、Created 排序 |
| P0 | 完成约束 | 存在未完成 Subtask 时拒绝 Completed |
| P0 | 手动完成规则 | Subtask 全部完成后父 Task 仍不会自动完成 |
| P0 | Subtask 写回 | 勾选、取消、改名、新增、删除不影响其他内容 |
| P0 | Task Note 写回 | 新增、编辑、删除、续行保持正确缩进 |
| P0 | UUID 重新定位 | Offset 变化后仍能找到正确对象 |
| P0 | Fingerprint 冲突 | 外部修改后拒绝盲目写回 |
| P0 | 全局串行队列 | 快速连续操作不会丢失更新 |
| P0 | 队列失败隔离 | 单次失败回滚，后续合法命令继续 |
| P0 | 对象级错误隔离 | 一条坏 Task 不影响其他 Task |
| P0 | 文件级错误隔离 | 结构损坏的 Project 不进入 Store 且禁止写回 |
| P0 | Notice 去重 | 同一错误不会反复弹窗 |
| P0 | Store Reconciliation | 写回后重新解析结果与 UI 状态一致 |
| P0 | 自身文件事件 | Trail 自己写回不会造成重复跳动 |
| P0 | 外部文件事件 | Git、脚本或原生编辑导致的修改能刷新 UI |
| P0 | 乐观拖拽 | 正常写入时卡片不回跳 |
| P0 | 写入失败回滚 | 文件冲突或失败时恢复最后确认状态 |
| P1 | Due 快捷操作 | `+1`、`+7` 和周末顺延正确 |
| P1 | Label 编辑 | 可多选、创建、删除和联想 |
| P1 | Project Label 筛选 | 只筛选当前 Project |
| P1 | Area Label 聚类 | 只聚合当前 Area 下多个 Project |
| P1 | Urgent 聚合 | Dashboard 正确显示未完成 Urgent Task |
| P1 | Task Modal | 正确显示字段、Subtasks 和 Notes |
| P1 | 文本编辑 Draft | Enter 保存、Shift+Enter 换行、Esc 取消 |
| P1 | 中文输入法 | composition 中的 Enter 不误保存 |
| P1 | Modal 上下文 | 关闭后恢复原滚动、筛选和当前 Project |
| P1 | Project 生命周期 | Planned、Active、Completed、Archived 写回正确 |
| P1 | Archive | 归档后移出日常索引并保留 UUID |
| P1 | Fleeting Note 解析 | 直接顶层列表、UUID、created 与可选 cleanup_due 可稳定解析 |
| P1 | Fleeting 转 Project | 创建新 Project 成功后处理原记录 |
| P1 | Fleeting 转 Task | 创建新 Backlog Task 成功后处理原记录 |
| P1 | Fleeting Archive | 不再出现在活动列表且可以恢复或查看 |
| P1 | Delete to Trash | 删除对象先创建可恢复快照 |
| P1 | Restore from Trash | 保留期内能恢复对象 |
| P1 | 普通 Note 打开 | 使用 Obsidian Markdown View，不替换 Trail |
| P1 | 返回 Trail | Project 和页面上下文仍然存在 |
| P1 | 四个顶层页面 | Dashboard、Areas、Project、Fleeting Notes 可切换 |
| P2 | Quick Capture | 能快速创建带 UUID 的 Fleeting Note |
| P2 | Search 基础接入 | 能查找并打开合法 Trail 对象 |
| P2 | Design Tokens | 临时样式与业务组件解耦 |
| P2 | 深色与浅色 | 基础组件在两种模式下可用 |
| P2 | 较大测试数据 | 多 Project、多 Task 时没有明显阻塞 |
| P2 | Windows 换行 | CRLF/LF 不造成位置错误或整文件重写 |
| P2 | Git Diff 质量 | 每次操作仅产生预期最小修改 |
| P2 | 重启恢复 | 重启 Obsidian 后可从 Markdown 完整恢复 Store |

## 17. POC 通过标准

POC 通过至少需要满足：

- 一个真实测试 Vault 可稳定发现和解析；
- Area、Project、Task 和 Fleeting Note UUID 稳定且可检测重复；
- 主要 Task 操作可精确写回且不破坏其他内容；
- 状态、checkbox 与完成时间保持一致；
- Subtask 完成约束正确；
- 固定排序和跨状态栏拖拽正确；
- 全局串行队列不会丢失连续操作；
- 乐观拖拽在正常路径下无可见回跳；
- 写入失败和 Fingerprint 冲突可以回滚；
- 文件外部变化可以重新解析；
- 对象级错误不会拖垮整个 Project；
- 文件级错误不会被 Trail 覆盖；
- Fleeting Note 可以创建、转换、Archive 和 Delete；
- 删除对象可以进入 Trash 并恢复；
- 当前方案不需要并行业务数据库。

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
- 移动端支持；
- 完整 Undo 历史。

## 19. 下一步

```text
已完成：Plugin Shell、真实 Vault 读取、Parser、错误隔离与只读实机验证
→ 已完成：Task 状态 Writer、UUID 重新定位、Fingerprint 冲突检测与最小文本替换
→ 已完成：Vault.process() Mutation Service、写后重新解析与 todo → doing UI 实机验证
→ 已完成：Plugin-level Runtime Store、共享 Snapshot 与文件事件 Reconciliation
→ 下一步：实现全局 Mutation Queue 与通用 Task 状态操作
→ 实现乐观 UI、失败回滚和 Project Board / List
→ 实现 Task Detail Modal
→ 实现 Fleeting Note 与 Trash 薄链路
→ 完成剩余 POC 验证清单
→ 根据结果形成 ADR、LLD 和 Implementation & Test Plan
```

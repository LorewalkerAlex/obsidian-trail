# Trail 产品与高层设计

> 状态：当前设计基线<br>
> 最后更新：2026-08-04<br>
> 适用对象：个人使用<br>
> 当前阶段：Product Brief、Domain Model 与 High-Level Design 已完成，正在通过真实 Obsidian Vault 逐步验证 Minimum Demo / POC<br>
> 本文用途：替代此前过时的设计文档，作为后续 Technical Design、POC、LLD 和实施计划的共同基线

## 1. 产品定位

Trail 是一个内置于 Obsidian 的个人项目与任务管理插件。

它以 Obsidian Vault 和 Markdown 作为长期稳定的数据与文档基础，在此之上提供现代、紧凑、适合日常操作的项目管理界面。目标不是复制完整的 Jira 或 Linear，而是让个人可以在同一个 Obsidian 环境中完成任务捕获、项目推进、状态查看和相关文档阅读。

核心目标：

- 快速了解当前任务和项目状态；
- 方便地创建、修改和推进任务；
- 在 Dashboard、Board、List 等视图中查看同一份数据；
- 将任务管理与 Obsidian 中的设计文档、研究笔记和知识内容连接起来；
- 保持 Markdown 可读、开放、可迁移，不被插件锁定。

## 2. 核心原则

### 2.1 Markdown 是事实来源

Area、Project、Task、Subtask 和 Fleeting Note 的业务事实最终都应能够在 Vault 中找到对应的 Markdown 表达。

插件不建立与 Markdown 并行、需要双向同步的业务数据库。内存数据、缓存、索引和界面状态可以存在，但不能成为新的业务事实来源。

### 2.2 插件是视图与操作层

插件负责聚合、计算、展示和操作：

- Dashboard；
- Areas；
- Project；
- Board / List；
- Task Detail；
- Fleeting Notes；
- 搜索、Quick Capture 和导航。

用户在界面中的操作最终写回 Markdown。

### 2.3 Trail 管理文件由受控通道维护

Trail 管理文件仍采用开放、可读和可迁移的 Markdown 格式，但不把用户直接编辑这些文件作为正式的日常操作方式。

受支持的增删改入口主要包括：

- Trail UI；
- Trail 提供或认可的预设脚本。

这使插件可以围绕稳定的文件结构、文本对象和写入规则实现可靠操作，同时避免建立额外业务数据库。

普通 Note 不受此限制，仍由用户通过 Obsidian 原生 Markdown 工作流自由编辑。

### 2.4 用户负责最终操作

创建、修改、转换、归档、删除和状态调整由用户显式触发。

系统可以计算进度、统计和关联关系；AI 可以提供理解、补充和建议，但不能在未经确认的情况下修改 Vault。

### 2.5 数据模型保持简单，视图可以丰富

核心对象和关系保持稳定。额外的组织方式优先通过标签、链接、筛选、分组和派生视图实现，避免为了不同展示方式不断增加新实体。

## 3. Domain Model

```text
Area
└── Project
    └── Task
        └── Subtask

Fleeting Note
└── 尚未进入正式层级的捕获对象
```

### 3.1 Area

Area 表示长期存在的关注领域，例如工作、阅读或个人生活。

- 一个 Area 可以包含多个 Project；
- Area 是 Trail 管理的长期对象，创建时生成稳定 UUID；
- Area 名称和目录位置可以变化，但 UUID 不随重命名或移动而改变。

### 3.2 Project

Project 表示一个需要持续推进、最终可以完成或归档的阶段性事项。

- 一个 Project 必须属于一个 Area；
- Project 创建时生成稳定 UUID；
- Project 的进度和活跃状态主要由内部 Task 推导；
- 不要求人工维护一份与 Task 状态重复的项目进度数据。

### 3.3 Task

Task 是主要的执行和流转单位。

- 一个 Task 必须且只能属于一个 Project；
- Task 创建时生成稳定 UUID；
- 当前产品不提供普通 Task 跨 Project 移动；
- Task 状态为 `backlog / todo / doing / blocked / completed`；
- 新建 Task 默认进入 `backlog`；
- Task Priority 为 `low / medium / high / urgent`，默认 `medium`；
- Task 可以设置可选 Due Date，用于状态栏内排序、剩余日期展示和快捷调整，不自动产生新的业务状态；
- Task 可以设置可选 Label，用于当前 Project 和 Area 范围内的筛选与聚类；
- Task 必须由用户显式移动或修改为 `completed`，不会由其他对象自动完成。

### 3.4 Subtask

Subtask 用于拆解 Task 内部步骤。

- Subtask 只属于一个 Task；
- Subtask 仅通过未完成 / 已完成 checkbox 表达状态，不拥有独立的工作流状态、Priority、Due Date 或 Label；
- 不作为 Project、Area 或 Dashboard 的独立统计单位；
- 不在高层 Board 中与普通 Task 平铺；
- Subtask 全部完成不会自动完成父 Task；
- 只要仍存在未完成 Subtask，父 Task 就不能被移动或修改为 `completed`；
- 父 Task 的完成必须由用户显式操作。

### 3.5 Fleeting Note

Fleeting Note 是进入正式工作体系之前的快速捕获对象。

- 每条 Fleeting Note 创建时生成稳定 UUID；
- Fleeting Note 以轻量列表记录保存，并在 Fleeting Notes 页面中以卡片展示；
- 第一版支持保持、转换为新 Project、转换为某个 Project 下的新 Task、Archive 和 Delete；
- 第一版不支持直接转换为 Subtask；
- 转换不是移动既有 Task，而是调用正常的 Project / Task 创建能力，目标创建成功后再处理原 Fleeting Note；
- 转换为 Task 时，新 Task 默认进入 `backlog`。

Fleeting Note 可以保留清理 deadline，用于提醒用户定期处理；具体默认期限和提醒方式属于后续实现细节。

### 3.6 Epic 类分组

系统不设置独立 Epic 实体。

需要跨多个 Task 形成主题或阶段时，使用带命名空间的 Label 进行虚拟聚合。第一版主要在当前 Project 和当前 Area 范围内筛选与聚类，不提供 Trail 顶层的全局 Label 浏览。UI 可以隐藏技术前缀并以更友好的名称展示，但底层仍然是 Task 集合。

### 3.7 事实数据与派生数据

以下内容属于派生结果，不应默认作为需要人工同步维护的事实字段：

- Dashboard 统计；
- Project 完成比例；
- Project 活跃程度；
- Area 汇总；
- 各状态 Task 数量。

## 4. High-Level Design

### 4.1 整体结构

```text
Obsidian Vault / Markdown
          ↕
     Obsidian Plugin
          ↕
      Custom View UI
```

首选方案是纯 Obsidian 插件：

- 主要任务管理界面运行在一个 Obsidian Custom View 中；
- 插件内部完成页面切换和业务操作；
- 关联的普通 Note 或长文档交给 Obsidian 原生 Markdown View 打开；
- 当前没有必要引入外部 HTTP 服务。

### 4.2 插件与 Obsidian 的职责边界

插件主视图负责：

- 项目和任务管理；
- Dashboard；
- Board / List；
- Task Detail；
- Fleeting Note 处理；
- 搜索、导航和 Quick Capture。

Obsidian 原生 Markdown View 负责：

- 设计文档；
- 调研和阅读笔记；
- 决策记录；
- 会议记录；
- 长篇内容；
- 普通知识资料。

两者通过 Vault、wikilink 和 backlink 连接。

Trail 不替换 Obsidian 的 Workspace、标签页、分屏、Markdown 编辑器或原生文档系统。它作为 Obsidian Workspace 中的一种独立 Custom View，与 Markdown View、Search、Graph、Canvas 和其他插件 View 并存。

### 4.3 顶层页面

插件内部不再增加独立 Sidebar，只保留四个顶层页面：

```text
Dashboard | Areas | Project | Fleeting Notes
```

搜索和 Quick Capture 是跨页面复用的能力，不单独占据顶层页面。

### 4.4 Dashboard

Dashboard 是可组合的小工具式首页，可参考手机 Widget 的组织方式。

它主要承载：

- 重要 Task 和 Project；
- `urgent` Task 的重点聚合；
- 各类派生统计；
- 可展开和收起的 Area → Project 导航；
- Search 入口；
- Quick Capture 入口。

具体 Widget、尺寸、排列和配置方式不在当前阶段固定。

### 4.5 Areas

Areas 用于查看 Area 以及其下的 Project，并作为进入具体 Project 的主要路径之一。

Area View 可以基于当前 Area 内的 Task Label 进行跨 Project 聚类和筛选，但不扩展为 Trail 顶层的全局 Label 视图。

当前只确定其顶层职责，不提前规定具体卡片、统计和交互布局。

### 4.6 Project

Project 是固定的当前项目工作区，不是项目列表。

- 默认可以恢复上一次打开的 Project；
- 从 Dashboard 或 Areas 打开其他 Project 时，替换当前 Project 页面内容；
- 不为每个 Project 创建新的插件子页面或 Obsidian 标签页；
- Project 不使用 Modal。

Project 使用单一页面，主要由两块内容组成：

```text
Project
├── Overview 区域
└── Board / List 区域
```

Board 和 List 展示同一批 Task，只改变呈现和操作方式。Project View 可以按当前 Project 的 Label 过滤这些 Task，过滤后仍保留相同的状态栏结构和排序规则。

### 4.7 Task Detail

Task 不作为顶层页面。

点击 Task 后打开 Modal：

- 覆盖在当前页面上方；
- 底层页面不可交互；
- 用于编辑 Task 标题、状态、Priority、Due Date 和 Label；
- Subtask 与 Task Note 在 Modal 中分区展示和操作；
- Project Board / List 中不直接展开 Subtask，只展示必要摘要；
- 没有未确认文本草稿时，可点击遮罩层外部或按 Esc 关闭；
- 存在未确认草稿时，应先确认保存或取消编辑，避免静默丢失；
- 关闭后返回原页面并保留原有上下文。

点击 Task 关联的普通 Note 或长文档时，由 Obsidian 原生 Markdown View 打开。Trail View 保留在原有 Leaf / 标签页中，用户通过 Obsidian 原生标签页和分屏机制在任务管理与文档之间切换。

### 4.8 Fleeting Notes

Fleeting Notes 是集中查看和处理闪念的顶层页面。

需要区分：

- Quick Capture：快速创建一条 Fleeting Note 的动作；
- Fleeting Notes：集中查看、提醒、整理和转换这些记录的页面。

Fleeting Note 在 UI 中以轻量卡片展示。卡片的上下文操作包括转换为 Project、转换为 Task、Archive 和 Delete。

### 4.9 底层数据组织

当前 POC 使用 Vault 内可见的 `Trail/` 管理目录。是否将其作为第一版正式目录，将在写回、同步和跨环境验证后确认。

在当前 POC 中，每个 Area 对应 `Trail/Areas/` 下的一个目录：

```text
Trail/
├── Areas/
│   └── <Area>/
│       ├── Area.md
│       ├── Project A.md
│       ├── Project B.md
│       └── ...
├── Fleeting Notes.md
├── Archive/
└── Trash/
```

已确定的大致数据形态：

- Area 使用独立 Markdown 描述文件，并持久化稳定 UUID；
- Project 使用独立 Markdown 文件，并持久化稳定 UUID；
- Project 文件内部承载该 Project 的 Task、嵌套 Subtask 和 Task Note；
- 一个独立 Markdown 文件集中承载全部 Fleeting Note，文件正文可以直接由顶层列表开始；
- 每条 Task 和 Fleeting Note 持久化稳定 UUID；
- Area 与 Project 的所属关系主要由目录组织表达；
- Task 属于其所在的 Project 文件；
- Subtask 通过 Task 下的嵌套结构表达。

普通 Note 使用独立于 Trail 管理文件的笔记目录体系。默认可以按 Area / Project 组织，以方便浏览和检索，但普通 Note 的明确业务关联通过 wikilink 表达，避免把目录位置当作唯一关系来源。

精确 Markdown Schema、字段格式、内部标识和序列化细节由 Technical Design 与 LLD 继续确定。

### 4.10 前端 UI 技术方向

前端主方案采用 React + TypeScript。

```text
Obsidian WorkspaceLeaf
└── Trail ItemView
    └── React Application
        ├── Dashboard
        ├── Areas
        ├── Project
        └── Fleeting Notes
```

主要原则：

- 使用 Obsidian `ItemView` 承载 Trail Custom View；
- 四个顶层页面在同一个 React 应用中切换；
- 当前不需要引入浏览器式 Router；
- Task Detail 使用 Obsidian Modal 的宿主能力，内部复杂内容可以由 React 渲染；
- 文件打开、标签页、分屏、命令和 Workspace 生命周期继续使用 Obsidian 官方能力；
- Board 拖拽、无障碍交互、搜索和虚拟列表优先评估成熟开源库，不从底层重复实现。

当前候选方向包括：

- 拖拽：优先验证 dnd kit，必要时评估 Pragmatic Drag and Drop；
- Headless 交互组件：参考 Radix UI、React Aria、Base UI 等成熟方案；
- 虚拟列表：真实数据证明需要后再评估 TanStack Virtual；
- 搜索：优先使用 Obsidian 自带能力，需求扩大后再评估轻量全文索引方案。

具体库、版本和组合方式由 Technical Design 与 POC 决定。

### 4.11 视觉系统

视觉品质是核心产品要求，不是功能完成后的附加美化。

Trail 可以在 POC 阶段暂时使用 Obsidian 默认样式验证功能，但前端结构从一开始应通过语义化组件和 Design Tokens 隔离业务逻辑与视觉实现。

后续建立 Trail 全局 Design System：

```text
Trail Design System
├── Trail React Components
└── Obsidian Global Theme Layer
    ├── Workspace / Tabs
    ├── Sidebars
    ├── Markdown Editor / Reading View
    ├── Modal / Menu / Input
    └── Other Shared UI
```

它用于统一 Trail 与 Obsidian 原生界面的颜色、字体、间距、圆角、阴影、动画和交互状态，而不是要求 Trail 被动模仿默认 Obsidian 外观。

当前视觉参考方向：

- 主要工作区、信息密度和视觉完成度参考 Linear；
- Search、Quick Capture、快捷选择和键盘交互参考 Raycast；
- Obsidian 全局主题覆盖方式参考 Minimal Theme 等成熟主题；
- 最终形成 Trail 自己的视觉系统，不复制其他产品的品牌或业务模型。

### 4.12 数据与 UI 的交互链路

整体采用成熟的单向数据流：

```text
Trail-managed Markdown
→ Parser / Repository
→ Plugin-level Runtime Store
→ React UI
→ Domain Command
→ Mutation Service
→ Obsidian File API
→ Store / File Event Reconciliation
```

主要职责：

- Trail 启动时扫描并解析自己的管理目录；
- 插件层维护统一的内存数据模型，供 Dashboard、Areas、Project、Board、List、Modal 和 Fleeting Notes 共用；
- React 组件只发出领域操作，不直接拼接或修改 Markdown；
- 同一 Project 文件作为一个完整聚合读取和校验；写回时由领域命令精确修改受影响对象，避免无关内容产生变化；
- 普通 Note 的链接、打开和重命名兼容优先复用 Obsidian 官方能力；
- 管理目录发生创建、修改、重命名或删除时，集中数据层重新解析受影响文件并更新 Store；
- 解析失败时保留最后可用状态，并阻止继续覆盖异常文件。

典型领域操作包括：

- Create / Update / Complete Task；
- Move Task Status；
- Update Task Priority / Due Date / Label；
- Create / Complete / Delete Subtask；
- Create / Update / Delete Task Note；
- Create / Convert / Archive / Delete Fleeting Note；
- Delete / Restore Trail Object；
- Create / Rename / Move / Archive Project；
- Update Area。

当前不存在普通 Task 跨 Project 移动。需要跨文件创建的主要场景是 Fleeting Note 转换：先确认目标 Project 或 Task 创建成功，再归档或删除原 Fleeting Note，以避免内容丢失。

### 4.13 操作反馈与持久化策略

Trail 不对所有操作使用同一种异步反馈方式，而是根据操作的频率、风险、可逆性和结果可预测程度选择成熟策略。

#### 乐观 UI

用于高频、低风险、结果明确的操作：

- Board 拖拽；
- Subtask 勾选；
- Task 状态、顺序、Priority、Due Date 和 Label 调整；
- 其他可可靠回退的常规修改。

```text
用户操作
→ 内存 Store 立即更新
→ UI 立即呈现预期结果
→ 后台写入 Markdown
├── 成功：静默确认
└── 失败：恢复最后确认状态并提示
```

正常情况下，用户不会察觉文件写入过程，卡片不会先弹回原位置再重新移动。

#### 本地草稿与明确提交

用于连续文本编辑：

- Task 标题；
- Subtask 文本；
- Task Note；
- Project Overview；
- Fleeting Note 内容。

文本先进入本地编辑状态，再通过明确提交动作写入 Markdown。未确认的输入不直接修改事实数据；写入失败时保留草稿并提示错误。具体键盘交互留到 Technical Design 或 LLD。

#### Undo 与回收站

删除操作不直接永久清除对象，而是进入 Trail 回收站，并在保留期内支持 Undo / Restore。回收站由系统低频检查，超过保留期后再永久删除。具体保留天数和物理存储格式属于实现细节。

归档和其他可逆操作优先提供明确的恢复入口，而不是所有操作都使用阻塞式二次确认。

#### Pending / 确认后完成

用于创建、转换或其他需要确认目标成功的操作：

- 创建 Project；
- Fleeting Note 转为 Project / Task；
- 其他涉及多个对象或多个文件的操作。

目标创建成功后再完成源对象处理，必要时显示短暂 Pending 状态。

稳定 UUID、串行写回和基本冲突处理由 Technical Design 固定。事件去重、回收站物理格式和更完整的恢复机制由 POC、LLD 与实施阶段继续细化。

## 5. AI 边界

AI 是辅助理解层，不是自动操作员。

AI 可以：

- 梳理和扩写 Idea；
- 总结 Project、Task 或文档上下文；
- 建议 Fleeting Note 的去向；
- 帮助拆解 Task；
- 查找对象和文档之间的关联。

AI 不应默认：

- 自动创建或删除对象；
- 自动修改状态；
- 自动移动 Task；
- 自动替用户决定工作安排；
- 未经确认直接写入 Vault。

没有 AI 时，所有核心管理功能仍应可用。

## 6. 命名与视觉方向

当前阶段使用通用、正式的术语，例如 Dashboard、Area、Project、Task、Subtask、Board、List、Modal 和 Custom View。

未来可以提供显示名称配置，但只改变界面文案，不改变内部标识、对象关系和 Markdown 兼容性。

视觉关键词：

- 现代；
- 紧凑；
- 清晰；
- 高信息密度但不过度拥挤；
- calm；
- focused；
- polished；
- keyboard-friendly；
- document-connected。

视觉系统同时覆盖 Trail 和 Obsidian 原生工作区，并正式支持深色与浅色模式。社区主题兼容范围及用户是否可以关闭 Trail 全局主题，留到后续设计。

## 7. 当前非目标

当前设计不包含：

- 团队成员、权限和多人实时协作；
- 评论、审批和通知系统；
- 企业 Jira 式复杂层级；
- 独立 Epic 实体；
- AI 自动代理执行；
- 将整个 Vault 的所有文档强制纳入任务模型；
- 外部 HTTP 服务；
- 替换 Obsidian 的 Workspace、Markdown 编辑器或原生文档系统；
- 在当前阶段固定完整 Markdown Schema、搜索算法、组件结构和详细页面布局；
- Task 工作时长统计、状态历史、工作量估算和依赖关系；
- 普通 Task 跨 Project 移动。

## 8. Minimum Demo / POC

当前已经完成读取、最小写回、Plugin-level Runtime Store 和文件事件 Reconciliation：

- Obsidian Custom View 和 React 应用可以正常加载；
- 四个顶层页面可以切换；
- `Trail/Areas/` 下的 Area、Project 和 Task Fixture 可以被发现和读取；
- Area、Project、Task、Subtask、Task Note 和 Project Note 可以解析；
- 合法对象、损坏 Task、损坏 Project 和重复 UUID 已有自动化测试；
- 真实 Obsidian 中可以显示 `1 Area · 1 Project · 3 Tasks`；
- 只读链路不会修改 Markdown；
- Task Writer 可以按 UUID 在最新文件内容中重新定位对象、校验完整 Task Block Fingerprint，并只修改目标 Task 标题行；
- 状态写回会同步规范化 checkbox 和 `completed`，并执行父 Task 完成约束；
- Mutation Service 可以通过 `Vault.process()` 原子写入并重新解析确认；
- Project 页面可以将一个既有 `todo` Task 更新为 `doing`；
- 插件入口维护唯一 Runtime Store，Trail View 共享同一份已确认 Snapshot；
- 刷新期间保留上一份数据，并对连续刷新请求和文件事件进行合并与防抖；
- `create / modify / delete / rename` 可以驱动打开中的 Trail 页面自动收敛；
- 外部逐字修改 Task 标题时 UI 自动同步；
- 删除 Project 文件后 Area 仍保留，恢复文件后 Project 与 Task 自动恢复；
- Project 文件重命名不会留下重复或旧 Project；
- Trail 自身写回后没有可见闪回；
- Trail 管理范围外的普通 Markdown 修改不会改变 Trail 数据；
- 重新加载插件后，写入后的状态仍能从 Markdown 恢复；
- 实机字节比较确认除目标 Task 的状态字段外没有其他内容变化；
- 验证结束后 Fixture 已精确恢复；
- 本地 ESLint、7 个测试文件中的 42 个自动化测试、TypeScript typecheck 和生产构建通过。

Fleeting Note、Modal、Board、全局 Mutation Queue、通用状态操作、乐观 UI、失败回滚和恢复机制仍属于后续 POC 范围。当前文件事件实现采用防抖后的全量 Trail Vault 重读，增量 Reconciliation 和更精确的自身事件去重留待后续数据规模验证。

完整 Minimum Demo 的验证范围如下；其中读取链路、既有 Task `todo → doing` 的单次精确写回、Plugin-level Runtime Store 和基础文件事件 Reconciliation 已经完成，其余写回与交互部分仍待验证：

- 打开一个完整的 Obsidian Custom View；
- 使用 React + TypeScript 渲染 Trail；
- 读取测试 Markdown 中的 Area、Project、Task、Subtask、Task Note 和 Fleeting Note；
- 验证 Trail 对象稳定 UUID，以及 Task 单行 JSON 私有元数据、状态、Priority、Due Date 和 Label 的解析；
- 验证异常 Task 可被隔离、异常 Project 可被排除，并通过 Obsidian Notice 提示；
- 展示四个顶层页面的基本切换；
- 展示一个 Project 的 Board 或 List；
- 点击 Task 打开 Modal；
- 拖拽或修改 Task 后精确写回 Markdown；
- 验证进入 `completed` 时同步完成状态与完成时间，离开 `completed` 时恢复未完成状态并移除完成时间；
- 验证存在未完成 Subtask 时不能完成父 Task，全部完成后仍需用户手动完成父 Task；
- 验证拖拽采用乐观 UI，正常写入时不发生可见回退或闪烁；
- 验证写入失败时能够回退并显示错误；
- 验证 Fleeting Note 向 Project 或 Task 的目标创建与源处理流程；
- 验证删除对象进入回收站并可以恢复；
- 预设脚本或受支持的外部文件变化后，UI 能重新解析并刷新；
- 点击关联 Note 后由 Obsidian 原生 Markdown View 打开；
- 返回 Trail View 后，当前 Project、Board / List 和基本页面上下文仍然保留；
- 使用基础 Design Tokens 验证后续能统一修改 Trail 与 Obsidian 原生界面的全局视觉。

POC 可以先使用接近 Obsidian 默认风格的基础样式，不要求完成最终 UI，但不能将业务逻辑直接绑定到临时样式和零散 DOM 结构。

## 9. 后续标准流程

完成 HLD 后，按以下流程推进：

```text
Technical Design / RFC / ADR
→ POC / Minimum Demo
→ Low-Level Design
→ Implementation & Test Plan
→ Delivery / Review / Handoff
```

- Technical Design：展开数据、前端、命令、写回和交互方案；
- RFC：比较存在分歧的技术方案；
- ADR：记录关键技术决策及原因；
- POC：用真实代码验证高风险假设；
- LLD：确定字段、类型、接口、组件、事件和异常处理；
- Implementation & Test Plan：拆分 MVP、任务、测试和验收；
- Handoff：在实际提交和推送完成后记录交付结果。

## 10. 当前未决定内容

以下内容不能从本文直接推断，后续需单独设计或验证：

- 搜索匹配算法和索引结构；
- 最终 Headless 组件、搜索和虚拟列表库；
- 文件事件去重和更完整的冲突恢复实现；
- 回收站保留期限与物理存储格式；
- Dashboard 具体 Widget；
- Project Overview 具体字段；
- Board / List 的详细交互；
- 最终 Design Tokens、组件视觉和动画规则；
- Trail 全局主题与其他社区主题的兼容方式；
- 移动端支持范围；

---

本文是当前有效设计基线。后续方案可以继续细化或通过 POC 修正，但不应无意中恢复旧文档中的只读 MVP、Journey / Quest 领域模型、独立内部 Sidebar、Task 侧边抽屉或 Trail / Documents 双模式等已废弃前提。

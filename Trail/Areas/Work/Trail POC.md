---
id: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6"
created: 2026-08-04
status: active
---

## Overview

验证 Trail 能够从真实 Obsidian Vault 读取并解析 Area、Project 和 Task。

## Tasks

- [ ] 完成 **Markdown** Parser [[Trail]] `POC` <!-- trail:task {"id":"fa3b3a46-f818-416a-9dd0-59aa168bc467","status":"doing","priority":"high","created":"2026-08-04T10:00:00+08:00","due":"2026-08-10","labels":["type:spike","layer:data"]} -->
  - [x] 定义最小 Fixture
  - [ ] 验证异常隔离
  - MetadataCache 更新后重新读取对应文件。
- [ ] 接入 Obsidian Vault Reader <!-- trail:task {"id":"8c774a86-54aa-48d3-9010-99372d0738fc","status":"todo","priority":"medium","created":"2026-08-04T10:05:00+08:00","labels":["layer:integration"]} -->
- [x] 初始化 Plugin Shell <!-- trail:task {"id":"991db9cf-a1c0-4346-9537-01c284ee9767","status":"completed","priority":"low","created":"2026-08-03T09:00:00+08:00","completed":"2026-08-03T18:00:00+08:00","labels":[]} -->

## Notes

- Fixture 会同时覆盖中文、粗体、wikilink 和行内代码。
- 本阶段只验证读取，不修改 Markdown。

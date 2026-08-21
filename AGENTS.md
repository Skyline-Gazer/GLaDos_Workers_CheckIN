# AGENTS.md

本文件供 AI 编码代理与协作者快速了解本仓库的结构与约定。

## 项目简介

GLaDOS Workers Check-IN —— 部署在 Cloudflare Workers 上的 GLaDOS 自动签到服务，使用 D1 存储签到日志与定时任务调度，支持定时/手动触发、状态查询与通知。

## 目录结构

```
├── src/                  # 核心源码（config / glados / schedule / storage / notify / format / types）
├── test/                 # Vitest 测试
├── migrations/           # D1 SQL 迁移
├── scripts/              # D1 配置与迁移脚本
├── .github/workflows/    # CI/CD（部署到 Cloudflare）
├── docs/                 # 文档与参考材料
│   ├── overview.md       # 开发记录 / 变更日志（README 重写、代码审计等历史说明）
│   └── reference/        # 参考实现，仅供阅读，不属于当前架构
│       └── glados_checkin_ql.js  # 青龙面板版签到脚本（第三方参考实现）
├── wrangler.jsonc        # Wrangler 配置
└── worker-configuration.d.ts  # wrangler types 自动生成
```

## 常用命令

- `npm install` — 安装依赖
- `npm run type-check` — TypeScript 类型检查
- `npm test` — 运行 Vitest 测试
- `npm run deploy` — 部署（见 `wrangler.jsonc`）

## 本地工具目录（不进版本库）

以下目录为本地工具产物，已在 `.gitignore` 中忽略，**不要提交**：

- `.reasonix/` — Reasonix 桌面端本地会话/主题元数据
- `.codegraph/` — 本地代码索引数据库与 daemon 日志
- `.workbuddy/` — 本地 AI 工具的会话记忆
- `.DS_Store` — macOS 系统文件

如需查看参考实现或历史记录，请访问 `docs/` 目录，不要移动或删除上述忽略规则。

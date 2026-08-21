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

## 提交与推送规范（强制）

**任何 commit 和 push 都必须以 PR（Pull Request）的形式提交，不允许直接提交/推送到 `main`。** 包括小改动（typo、单文件文档）在内，一律走以下流程：

1. 从 `main` 新建分支：`git checkout -b <类型>/<简短描述>`
2. 在分支上完成修改并本地提交
3. 推送分支：`git push -u origin <分支名>`
4. 创建 PR（`gh pr create` 或网页），合并回 `main`

**分支命名**：`feat/<描述>` / `fix/<描述>` / `chore/<描述>` / `docs/<描述>` / `test/<描述>` / `refactor/<描述>`。

**提交信息**：遵循 Conventional Commits，格式 `<type>: <简短说明>`（如 `fix: cookie 失效检测误判`）。

**PR 要求**：
- PR 标题遵循同一提交信息规范；
- PR 必须通过 CI（`npm test` + `npm run type-check`）才能合并；
- 建议使用 Squash merge 保持 `main` 历史整洁；
- 合并后删除源分支。

**`main` 分支保护（GitHub 侧，需管理员配置）**：开启 branch protection rule —— 禁止直接 push、要求 PR review、要求 CI status checks 通过。

## 提交前检查（每个 commit 前必须满足）

- [ ] `npm test` 全部通过
- [ ] `npm run type-check` 无错误
- [ ] 若已配置 lint：`npm run lint` 无错误
- [ ] 无敏感信息（Cookie / Token / 密钥）混入源码、提交信息或 PR 描述
- [ ] 未包含 `.dev.vars`、`node_modules/`、`.wrangler/` 等忽略产物

## 安全红线

- **绝不**把真实 Cookie、Webhook、Token 写进源码或提交信息；
- `.dev.vars` 永不入库（已忽略），本地开发从 `.dev.vars.example` 复制填写；
- 日志、D1 记录、PR 描述中不得出现任何密钥；日志使用 JSON 行格式。

## 架构与编码约定

- `src/` 分层职责：`config`（环境变量解析）/ `glados`（GLaDOS API）/ `schedule`（定时调度）/ `storage`（D1 读写）/ `notify`（通知）/ `format`（格式化）/ `types`（类型定义）；
- 错误处理统一：内部抛错、入口 `safeError` 收口，响应统一为 `{ ok, error }` JSON；
- 日志统一 `console.log(JSON.stringify({ event, ... }))`；
- 新增环境变量时，必须同步更新 `.dev.vars.example` 与 README「变量速查总表」；
- 新增 D1 迁移：文件命名 `000N_<描述>.sql`（序号递增），并确保 `scripts/` 与 CI 流程兼容。

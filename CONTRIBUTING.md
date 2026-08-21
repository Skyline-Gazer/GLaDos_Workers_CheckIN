# Contributing

感谢你愿意为 GLaDOS Workers Check-In 贡献代码。请先阅读本文件与 [AGENTS.md](./AGENTS.md)（含完整的约束条款与提交规范）。

## 提交与推送规范（强制）

**任何 commit 和 push 都必须以 PR（Pull Request）的形式提交，不允许直接提交/推送到 `main`。**

工作流：

1. 从 `main` 新建分支：`git checkout -b <类型>/<简短描述>`
2. 完成修改，本地提交（提交信息遵循 Conventional Commits：`<type>: <说明>`）
3. 推送分支：`git push -u origin <分支名>`
4. 创建 PR 合并回 `main`，等待 review / CI 通过

分支命名：`feat/`、`fix/`、`chore/`、`docs/`、`test/`、`refactor/` 前缀 + 简短描述。

## 提交前检查清单

- [ ] `npm run lint` 无错误
- [ ] `npm test` 全部通过
- [ ] `npm run type-check` 无错误
- [ ] 无敏感信息（Cookie / Token / 密钥）混入源码或提交信息
- [ ] 未包含 `.dev.vars`、`node_modules/` 等忽略产物

## 环境与命令

```bash
npm install        # 安装依赖
npm run dev        # 本地运行 Worker（http://127.0.0.1:8787）
npm run lint       # ESLint
npm test           # Vitest 测试
npm run type-check # TypeScript 类型检查
```

本地开发前：`cp .dev.vars.example .dev.vars` 并填入真实值（该文件永不入库）。

## 约定速览

- 新增环境变量时，同步更新 `.dev.vars.example` 与 README「变量速查总表」；
- 新增 D1 迁移：文件命名 `000N_<描述>.sql`（序号递增），并确保 `scripts/` 与 CI 流程兼容；
- 错误响应统一为 `{ ok, error }` JSON，日志使用 JSON 行格式。

详见 [AGENTS.md](./AGENTS.md)。

# README 重写完成

## 做了什么

将 GLaDOS Workers Check-In 的 README.md 从特性列表式文档**完整重写**为手把手部署指南。

## 关键改动

| 改动 | 之前 | 之后 |
|------|------|------|
| 结构 | 特性列表优先，配置说明散落各处 | 八步部署流程，排障最后 |
| CF API Token | "建议使用权限最小化的 Cloudflare API Token" | 完整点击路径 + 三行权限矩阵 + 不要用模板的警告 |
| Cookie 获取 | 5 行简单说明 | 7 个子步骤，含 Network 面板筛选、请求头定位 |
| 密钥分离 | GitHub Secrets 和 Cloudflare Variables 混在一起 | 分别在第五步和第六步，明确标注 "仅用于 CI/CD" vs "运行时" |
| 验证 | 几乎没有 | 每步后都有 "应返回"/"应看到" 验证 |
| 排障 | 简单列表 | Q&A 格式，覆盖源码中所有 `throw new Error(...)` 场景 |
| 代码块 | 部分缺少语言标记 | 全部 12 个代码块带语言标记 |

## 方法论输出

创建了 `readme-from-scratch` SKILL（user-level），路径 `~/.workbuddy/skills/readme-from-scratch/`，包含：
- `SKILL.md`: 六阶段方法论（阅读代码→识别缺口→构建大纲→手把手写作→逐步验证→质量检查清单）
- `references/template.md`: 文档骨架模板
- `scripts/check_readme.py`: README 质量自动检查工具

## 提交信息

- Commit: `38ea481` → pushed to `main`
- 变更: 370 行新增, 345 行删除

## 2026-08-06 审计与修复

对项目做了一次完整代码审计，修复了 4 个高优先级 Bug 并强化 Cookie 有效性检测，同时同步更新了本文档与 README.md：

| 改动 | 说明 |
|------|------|
| `/status` 不再写假日志 | 移除 `statusOnlyFetcher`，新增独立的 `runAccountsStatusOnly`，纯查询不签到、不写 D1 |
| Cookie 有效性检测 | 新增 `classifyAccountValidity`，基于状态接口的 HTTP/`code`/message/有效数据综合判定 有效/失效/无法确认 |
| 定时任务失败重试 | 仅无临时性失败（`summary.failed === 0`）才标记当天已执行；5xx/429 由下个 Cron 重试，Cookie 失效视为终态 |
| D1 调度表降级 | `getNextScheduledCheckin` / `shouldRunScheduledCheckin` 包 try/catch，D1 异常不再阻断签到与落库 |
| 状态查询失败不丢结果 | `checkAccountStatus` 调用包 try/catch，保留已成功的签到结果 |
| 死配置清理 | 移除 `AppConfig.adminUser / adminToken / notifyOnStatusOnly` |

验证：`npm run type-check` 通过，`npm test` 46 个测试全部通过。

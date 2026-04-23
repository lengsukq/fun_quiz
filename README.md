# Fun Quiz (Next.js Fullstack)

基于 Next.js App Router 的趣味测验全栈项目，包含：

- 管理端（测验、题目、结果、Token、系统管理）
- H5 答题端（Token 入口、答题、结果页）
- 服务端 API（`src/app/api/**`）
- Drizzle + Neon PostgreSQL 数据访问层

> 当前 Next.js 项目已迁移到仓库根目录运行，不再使用 `next/` 作为项目根。

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Drizzle ORM + Neon (`@neondatabase/serverless`)
- Vitest + Playwright

## Project Structure

```text
src/
  app/                 # 页面与 API 路由
  components/          # UI 与业务组件
  contracts/           # 接口 schema / DTO
  db/                  # Drizzle schema 与 db 实例
  lib/                 # 通用工具（auth/http/env 等）
  server/              # service/repository 业务层
tests/                 # unit / integration / e2e
docs/                  # 项目文档
python/                # 原 Python 项目（迁移参考，不参与 Next 构建）
```

## Quick Start

### 1) 安装依赖

```bash
yarn install
```

### 2) 配置环境变量

复制 `.env.example` 为 `.env`，并按实际环境填写：

```bash
cp .env.example .env
```

关键变量：

- `DATABASE_URL`: Neon/PostgreSQL 连接串
- `APP_JWT_SECRET`: JWT 密钥（至少 16 位）
- `APP_JWT_EXPIRES_IN`: 访问令牌时长（默认 `2h`）
- `BOOTSTRAP_SETUP_SECRET`: 首次系统初始化密钥
- `BOOTSTRAP_ALLOW_IN_PROD`: 生产是否允许 bootstrap/seed（默认 `false`）

H5 结果页 **深度分析**（`POST /api/quiz_play/result/analyze`）请求体除 `token`、`resultId` 外须带 **`style`**：`humor`（幽默诙谐）｜`warm`（温暖共情）｜`rational`（理性客观），与页面三选一风格一致。

大模型走 **OpenAI 兼容的 Chat Completions** 协议，仅使用环境变量名 `LLM_*`：

- `LLM_API_KEY`：鉴权。未设置则结果页不展示深度分析
- `LLM_MODEL`：模型 id，选填，缺省为 `gpt-4o-mini`（应改为你方网关/本地实际模型名）
- `LLM_BASE_URL`：API 根地址，选填（如 Ollama `http://localhost:11434/v1`、自建网关、第三方 OpenAI 兼容服务）；不填时 SDK 使用其默认的 OpenAI 公网端点

### 3) 初始化数据库结构

```bash
yarn db:push
```

### 4) 启动开发环境

```bash
yarn dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## Common Commands

```bash
yarn dev              # 本地开发
yarn build            # 生产构建
yarn start            # 启动生产服务
yarn lint             # ESLint
yarn test             # 全量 Vitest
yarn test:unit
yarn test:integration
yarn test:e2e
yarn db:generate      # 生成 Drizzle migration
yarn db:push          # 推送 schema
yarn db:studio        # 打开 Drizzle Studio
```

## Bootstrap / Seed / Publish Flow

### 系统初始化

- API: `POST /api/system/bootstrap`
- 能力：初始化角色与管理员账号
- 生产环境默认受 `BOOTSTRAP_ALLOW_IN_PROD` 限制

### AI 辅助生成测验结构

- API: `POST /api/quiz/ai_generate`（请求体含 `prompt`，可选 `quizType`、`persist`；需已登录且具备 `quiz:ai_generate` 权限；依赖与深度分析相同的 `LLM_*` 环境变量）

### 一键导入题库（来自 Python seed）

- API: `POST /api/system/seed_quizzes`
- 数据源：`python/doc/generated/*.json`
- 行为：按 `meta.code` 幂等导入（存在则更新，不存在则创建）
- 管理端按钮：测验列表页 `一键导入题库`

### 一键发布草稿

- API: `POST /api/quiz/publish_all`
- 行为：将所有 `draft` 测验批量改为 `published`
- 管理端按钮：测验列表页 `一键发布草稿`

## Quiz Token Notes

- 答题入口页面：`/quiz?token=<token>`
- 答题端只显示：**已发布测验** + **当前 token 可访问测验**
- `token=demo` 为保留演示令牌，支持无限使用（不消耗次数）

## Troubleshooting

### 构建时报错扫到 `python/` 目录 TypeScript

已通过 `tsconfig.json` 将类型检查范围收口到 `src/` 与 `tests/`。如果你修改了 tsconfig，请确保未重新扩大到整个仓库。

### 答题端显示“没有可用测验”

优先检查：

1. 测验是否已发布（`published`）
2. token 是否有效（未过期/未耗尽）
3. token 是否绑定了正确的 `quizIds`

---

更多迁移与业务说明见：`NEXTJS_REPLICA_FUNCTION_DOC.md`。

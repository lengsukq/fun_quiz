# Fun Quiz Python 版本到 Next.js 复刻功能文档

> 目标：基于 `python` 版本前后端实现，输出可直接落地到 `next` 项目的完整业务与技术复刻说明。  
> 范围：覆盖后台管理端 + C 端测验端的主要业务流程。  
> 说明：本文档不展开验证码具体实现细节（按你的要求排除验证码）。

---

## 1. 项目总体架构

## 1.1 当前 Python 版本结构

- 后端：FastAPI，路由自动注册为 `/api/{模块名}`
- 管理端：Vue3 + Vite + Naive UI（`python/web`）
- 移动端：Vue3 + Vite + Vant（`python/mobile`）
- 核心模块：
  - 基础业务：用户、角色、权限、菜单、组织、部门、邀请码、存储
  - 测验业务：测验配置、Token 发放、答题、结果、统计

## 1.2 Next.js 复刻目标结构

- `src/app/api/**/route.ts`：接口入口（参数校验、鉴权、响应包装）
- `src/server/services/**`：业务规则层（核心逻辑）
- `src/server/repositories/**`：数据访问层（SQL/ORM）
- `src/db/schema/**`：数据模型
- `src/lib/auth/**`：会话与权限基础能力
- `src/lib/api-response.ts`：统一响应格式
- `src/lib/errors.ts`：统一业务异常

---

## 2. 通用技术规范（复刻前统一）

- 统一响应结构：`{ code, message, data }`
- 统一鉴权头：
  - `Authorization: Bearer <access_token>`
  - `Space`
  - `Scene`
- 统一异常机制：
  - 业务异常（可预期）
  - 系统异常（500）
- 统一日志信息：
  - 当前用户
  - 请求路径
  - 请求参数（脱敏）
- 统一分页参数：
  - `pageIndex`
  - `pageSize`
  - `search`

---

## 3. 数据库最小复刻模型

## 3.1 用户权限域

- `web_user`
  - `id, name, mobile, email, enabled`
  - `password_hash, password_salt, try_count, reset_password`
  - `avatar_file_info(jsonb), created_at, updated_at`
- `union_user`
  - `id, name, enabled, is_deleted, created_at, updated_at`
- `union_user_user`
  - `id, union_user_id, union_user_user_category, union_user_user_id`
- `role`
  - `id, name, code, brief, enabled, seq`
- `user_role`
  - `id, user_id, user_category, role_id`
- `menu`
  - `id, parent_id, name, code, url, icon, type, seq, enabled`
- `backend_api`
  - `id, name, code, url, cleaned_url, enabled, ignore_auth`
- `permission`
  - `id, name, code, resource_category, resource_id, enabled`
- `permission_assign`
  - `id, permission_id`
  - `grant_type, grant_object_id`
  - `grantee_type, grantee_object_id`
  - `policy, start_time, end_time`

## 3.2 组织与人员关系域

- `organization`
  - `id, name, code, category, address, parent_id, seq, enabled`
- `dept`
  - `id, organization_id, name, code, category, brief, source_category, source_id, parent_id, seq, enabled`
- `web_user_organization`
  - `id, web_user_id, organization_id`
- `web_user_dept`
  - `id, web_user_id, dept_id`

## 3.3 邀请码与文件域

- `invite_code`
  - `id, code, brief, max_limit, register_num, deadline, enabled, deleted`
- `file_storage`
  - `id, original_name, object_name, bucket_name, path, endpoint, size, type, hash`
- `file_info`
  - `id, name, file_storage_id`
- `file_resource`（可选）
  - `id, resource_category, resource_id, relationship, file_info_id`

## 3.4 测验域

- `quiz`
  - `id, name, code, quiz_type, status, source, sort_order`
  - `covers, cover_prompt, share_title, share_desc`
  - `fallback_outcome_code, algo_config, special_rules, result_config`
- `quiz_question`
  - `id, quiz_id, seq, content, images, image_prompt, is_hidden, options, branch_config`
- `quiz_outcome`
  - `id, quiz_id, code, name, avatar, avatar_prompt, summary, detail, tags`
  - `sort_order, is_fallback, is_special, match_config`
- `quiz_token`
  - `id, token, status, max_uses, used_count, source, batch_code, expires_at, extra`
- `quiz_token_quiz`
  - `id, token_id, quiz_id`
- `quiz_result`
  - `id, token_id, quiz_id, answers, calc_result`
  - `outcome_code, outcome_id, score, share_image, created_at`

---

## 4. 业务流程清单（不含验证码）

## 4.1 登录与会话

接口：

- `POST /api/web_user/login`
- `POST /api/union_user/refresh_access_token`
- `POST /api/union_user/logout`
- `POST /api/web_user/change_current_user_role`

规则：

- 用户名 + 密码登录（`sha256(password + salt)`）
- 登录失败累计 `try_count`，超过限制次日恢复
- 登录成功返回 `access_token + refresh_token + union_user_info`
- token 按 `Space/Scene/UnionUser` 维度存储
- 角色切换后刷新 token，更新当前角色上下文

---

## 4.2 统一用户（Union User）管理

接口：

- `POST /api/union_user/auth_code_login`
- `POST /api/union_user/edit_info`
- `POST /api/union_user/delete`

规则：

- `union_user` 是聚合身份主体（WEB_USER/WECOM_USER 等）
- 删除 union user 需要级联清理关联关系与下游用户信息

---

## 4.3 角色管理

接口：

- `GET /api/role/statistics`
- `POST /api/role/page`
- `POST /api/role/edit`
- `POST /api/role/change_enabled`
- `POST /api/role/delete`

规则：

- 超级管理员角色不可删除、不可随意修改
- 角色编辑需超级管理员权限
- 新增角色自动生成序号

---

## 4.4 菜单管理与可见菜单树

接口：

- `POST /api/menu/tree`
- `POST /api/menu/allow_menu_tree`
- `POST /api/menu/page`
- `GET /api/menu/detail/{menuId}`
- `POST /api/menu/edit`
- `POST /api/menu/delete`
- `POST /api/menu/save_seq_and_parent`

规则：

- `allow_menu_tree` 按“角色 + 权限分配”过滤
- 支持树结构排序和父子层级修改
- 新增菜单默认挂在同级末尾（seq 自动递增）

---

## 4.5 权限管理（菜单/API）

接口：

- `POST /api/permission/page`
- `GET /api/permission/detail/{permissionId}`
- `POST /api/permission/edit`
- `POST /api/permission/change_enabled`
- `POST /api/permission/delete`

辅助接口：

- `POST /api/backend_api/page`
- `POST /api/backend_api/change_ignore_auth`

规则：

- 权限资源可绑定到菜单或后端 API
- 编辑权限时可同步更新分配关系 `assign_list`
- 删除权限后删除相关分配记录

---

## 4.6 人员管理（Web 用户）

接口：

- `POST /api/web_user/page`
- `GET /api/web_user/detail/{userId}`
- `POST /api/web_user/add`
- `POST /api/web_user/edit`
- `POST /api/web_user/change_enabled`
- `POST /api/web_user/reset_password`
- `POST /api/web_user/reset_self_password`
- `POST /api/web_user/get_by_id_list`

规则：

- 新增用户：校验用户名 + 密码规则 + 角色绑定 + union_user 绑定 + 组织部门绑定
- 编辑用户：更新基础信息 + 角色 + 组织部门关系
- 禁止修改自己启用状态
- 管理员重置密码后，目标用户强制下线
- 个人改密需校验旧密码，失败次数受限

---

## 4.7 组织与部门管理

组织接口：

- `POST /api/organization/tree`
- `GET /api/organization/detail/{organizationId}`
- `POST /api/organization/edit`
- `POST /api/organization/delete`
- `POST /api/organization/change_enabled`
- `POST /api/organization/save_seq_and_parent`

部门接口：

- `POST /api/dept/tree`
- `GET /api/dept/detail/{deptId}`
- `POST /api/dept/edit`
- `POST /api/dept/delete`
- `POST /api/dept/change_enabled`
- `POST /api/dept/save_seq_and_parent`

规则：

- 树结构维护（拖拽改层级 + 排序）
- 新增时名称查重
- 删除前做存在性校验

---

## 4.8 邀请码管理

接口：

- `POST /api/invite_code/page`
- `GET /api/invite_code/detail/{inviteCodeId}`
- `POST /api/invite_code/edit`
- `POST /api/invite_code/soft_delete`
- `POST /api/invite_code/change_enabled`
- `GET /api/invite_code/statistics`

规则：

- 新建邀请码自动生成高强度随机码
- 校验失效条件：不存在、删除、禁用、超上限、过期
- 注册成功后累计 `register_num`

---

## 4.9 文件上传与访问

接口：

- `POST /api/storage/upload`
- `POST /api/storage/upload_base64`
- `POST /api/storage/file_info_list`
- `GET /api/storage/file_url/{fileInfoId}`

规则：

- 校验上传大小上限
- 计算 hash 去重
- 文件元信息和底层存储分离
- 通过预签名 URL 访问文件

---

## 4.10 测验后台管理

接口：

- `POST /api/quiz/page`
- `POST /api/quiz/detail/{quizId}`
- `POST /api/quiz/edit`
- `POST /api/quiz/delete`
- `POST /api/quiz/change_status`
- `POST /api/quiz/import`
- `POST /api/quiz/questions/{quizId}`
- `POST /api/quiz/questions/batch_save`
- `POST /api/quiz/outcomes/{quizId}`
- `POST /api/quiz/outcomes/batch_save`
- `POST /api/quiz/stats/{quizId}`

规则：

- 发布前校验：
  - 至少一个题目
  - 至少一个结果
  - 至少一个兜底结果
- 已发布测验不可直接删除，需先归档
- 批量保存题目/结果采用覆盖式更新
- 支持导入完整测验定义

---

## 4.11 Token 发放管理

接口：

- `POST /api/quiz_token/generate`
- `POST /api/quiz_token/page`
- `POST /api/quiz_token/detail/{token}`
- `POST /api/quiz_token/update_quiz_ids`

规则：

- 支持批量生成 token
- 每个 token 可配置：
  - 次数上限 `max_uses`
  - 过期时间 `expires_at`
  - 可访问测验集合 `quiz_ids`
- 每次答题提交后 `used_count + 1`，到上限转为 `exhausted`

---

## 4.12 C 端答题全流程（移动端）

接口：

- `POST /api/quiz_play/entry`
- `POST /api/quiz_play/entry/quizzes`
- `POST /api/quiz_play/entry/history`
- `POST /api/quiz_play/play`
- `POST /api/quiz_play/submit`
- `POST /api/quiz_play/result`

流程：

1. 入口校验 token 状态，返回可用信息和历史标记
2. 获取可答测验列表（受 token 授权范围限制）
3. 获取答题数据（题目、选项、素材）
4. 提交答案并计算结果
5. 增加 token 使用次数
6. 查询和展示结果详情

---

## 5. 测验算法体系（核心）

位置：`quiz_play_service` + `quiz_algo/*`

## 5.1 vector 算法

- 按维度累计分数
- 将原始分归档为离散等级
- 和 outcome 向量做距离匹配
- 低于阈值可走 fallback

## 5.2 score 算法

- 计算总分
- 按分数区间命中结果
- 未命中时走 fallback

## 5.3 branch 算法

- 根据选项 `next_question_seq` 进行跳题
- 到终止分支输出 outcome
- 异常路径走 fallback

## 5.4 random 算法

- 按 outcome 权重随机
- 可用于运势类、抽签类测验

## 5.5 special_rules（所有算法前置）

- 命中特殊规则时可直接返回指定结果
- 用于彩蛋、强制分流或运营规则

---

## 6. Next.js 实施映射建议

## 6.1 分层职责

- Route Handler：
  - 解析参数
  - 鉴权
  - 调 service
  - 返回统一响应
- Service：
  - 完整业务规则
  - 权限校验
  - 事务边界
- Repository：
  - SQL/ORM 查询
  - 只做数据存取

## 6.2 服务文件建议

- `auth-service.ts`
- `user-service.ts`
- `union-user-service.ts`
- `role-service.ts`
- `menu-service.ts`
- `permission-service.ts`
- `organization-service.ts`
- `dept-service.ts`
- `invite-code-service.ts`
- `storage-service.ts`
- `quiz-service.ts`
- `quiz-token-service.ts`
- `quiz-play-service.ts`
- `quiz-stats-service.ts`

## 6.3 API 权限码（Next 已实现）

管理类接口在 `requireAuth` 之后使用 `requireAuthWithPermission` + `ct_permission` / `ct_permission_assign`（登录与 bootstrap 会幂等种子）。`SUPER_ADMIN` 角色跳过库权限校验。权限码定义见 [`src/lib/rbac/permission-codes.ts`](src/lib/rbac/permission-codes.ts)，与路由对应关系包括：`quiz:read`（列表/详情/题目结果读/统计）、`quiz:write`、`quiz:delete`、`quiz:publish`（状态/一键发布/种子导入）、`quiz:import`、`quiz:ai_generate`、`quiz:token`；`sys:user`、`sys:org`、`sys:dept`、`sys:invite`、`sys:storage`；`sys:role:read` / `sys:role:admin`；`sys:menu:read` / `sys:menu:admin`；`sys:permission:read` / `sys:permission:admin`；`sys:backend_api:admin`。`POST /api/quiz/ai_generate` 使用 `quiz:ai_generate` 与 `LLM_*`。

---

## 7. 分阶段落地计划（推荐顺序）

## Phase 1：基础能力

- 统一响应
- 统一错误
- 鉴权中间件
- token 刷新链路

## Phase 2：后台账号与权限

- 登录/登出/刷新
- 角色 + 菜单 + 权限
- 用户管理基础流程

## Phase 3：组织、部门、邀请码、存储

- 组织与部门树
- 人员关系绑定
- 邀请码管理
- 文件上传体系

## Phase 4：测验后台

- 测验 CRUD
- 题目与结果配置
- 发布规则与统计

## Phase 5：Token 与 C 端答题

- 发券与授权范围
- 答题流程
- 结果查看与历史
- 算法策略完整接入

---

## 8. 联调用例与验收清单

- 登录失败次数限制是否生效
- token 刷新是否稳定
- 角色切换后菜单是否变化
- 非超管是否无法操作超管
- 发布前校验是否严格执行
- 已发布测验是否禁止直接删除
- token 次数耗尽是否正确
- token 授权测验范围是否生效
- result 是否严格校验 token 归属
- 重置密码后是否强制下线

---

## 9. 风险点与实现建议

- 风险 1：权限只做菜单过滤，接口层未做强约束  
  建议：高风险接口增加强制 RBAC 校验。

- 风险 2：答题提交并发导致 `used_count` 竞争  
  建议：提交与计数放同事务，必要时加乐观锁/行锁。

- 风险 3：题目/结果覆盖保存导致误删  
  建议：保留版本字段或草稿快照。

- 风险 4：JSON 配置结构演进困难  
  建议：给 `algo_config/special_rules/result_config` 做版本号字段。

---

## 10. 结论

该 Python 版本的核心业务闭环非常清晰，适合按“后台配置 + Token 分发 + 移动端答题”模式完整迁移到 Next.js。  
复刻时优先保证以下三件事：

1. 统一鉴权与错误体系；
2. 服务层承载业务规则而不是 route/repository；
3. Token 与答题提交流程的事务一致性。

只要这三点到位，后续扩展新测验类型、新结果策略和多端展示都会非常顺畅。


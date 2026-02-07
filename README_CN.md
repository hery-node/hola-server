# Hola Server

[English](./README.md)

基于**元编程**理念构建 RESTful API 的框架，使用 **Bun + Elysia + MongoDB** 技术栈。通过声明式定义实体模型，自动生成完整的 CRUD API，内置身份认证、角色权限控制、文件处理和向量搜索等功能。

## ✨ 特性

- **元数据驱动 CRUD** — 定义实体模型，自动生成完整的 RESTful API
- **角色权限控制** — 细粒度的实体级别和操作级别权限 (`admin:*`, `user:r`, `editor:cru`)
- **JWT 认证** — 访问令牌 + 刷新令牌，支持 Cookie 和 Authorization Header 混合传递
- **类型系统** — 20+ 内置类型，支持验证和转换，可扩展
- **Schema 验证** — 基于 TypeBox 自动生成请求体验证 Schema
- **文件处理** — 内置 GridFS 文件上传和流式传输
- **向量搜索** — 基于 SQLite 的向量相似度搜索（`sqlite-vec`），适用于 AI 应用
- **实体关联** — 引用（ref）关系支持级联/保留删除行为和引用验证
- **生命周期钩子** — 创建、更新、克隆、删除、读取操作的前置/后置钩子
- **查询构建** — 高级搜索、过滤、比较运算符和分页
- **环境配置** — 支持环境变量的配置加载器（dev/test/prod）
- **全面测试** — 25 个测试文件，覆盖核心、数据库、实体和清理

## 📦 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | [Bun](https://bun.sh) |
| HTTP 框架 | [Elysia](https://elysiajs.com) v1.2+ |
| 数据库 | [MongoDB](https://www.mongodb.com) 6.x |
| 文件存储 | MongoDB GridFS |
| 向量搜索 | [sqlite-vec](https://github.com/asg017/sqlite-vec) + better-sqlite3 |
| 认证 | [@elysiajs/jwt](https://www.npmjs.com/package/@elysiajs/jwt) |
| 语言 | TypeScript 5.7+ |

## 🚀 快速开始

### 安装

```bash
bun install
```

### 1. 定义实体

```typescript
import { init_router } from "hola-server";

export const userRouter = init_router({
  collection: "user",
  primary_keys: ["email"],
  ref_label: "name",

  creatable: true,
  readable: true,
  updatable: true,
  deleteable: true,

  fields: [
    { name: "name", type: "string", required: true },
    { name: "email", type: "string", required: true },
    { name: "age", type: "uint" },
    { name: "role", ref: "role" },
    { name: "avatar", type: "file" },
  ],

  roles: ["admin:*", "user:r", "editor:cru"],
});
```

### 2. 启动服务器

```typescript
import { Elysia } from "elysia";
import { plugins, db, meta } from "hola-server";
import { userRouter } from "./router/user.js";

const app = new Elysia()
  .use(plugins.holaCors({ origin: ["http://localhost:5173"] }))
  .use(plugins.holaBody({ limit: "10mb" }))
  .use(plugins.holaAuth({ secret: process.env.JWT_SECRET! }))
  .use(plugins.holaError())
  .use(userRouter)
  .onStart(async () => {
    await db.get_db();
    meta.validate_all_metas();
    console.log("✓ 服务器已启动，端口 3000");
  })
  .listen(3000);
```

## 📡 API 端点

每个实体路由自动生成以下端点：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/{entity}` | 简单列表查询 |
| `POST` | `/{entity}/list` | 完整列表查询（过滤、排序、分页） |
| `GET` | `/{entity}/:id` | 根据 ID 获取单个实体 |
| `POST` | `/{entity}` | 创建实体 |
| `PUT` | `/{entity}/:id` | 更新实体 |
| `DELETE` | `/{entity}/:id` | 删除实体 |
| `GET` | `/{entity}/meta` | 获取实体元数据和权限 |
| `GET` | `/{entity}/ref` | 获取引用标签 |
| `POST` | `/{entity}/:id/clone` | 克隆实体（如果可克隆） |

## 🏗 实体元数据

### 字段定义

```typescript
interface FieldDefinition {
  name: string;        // 字段名
  type?: string;       // 验证/转换类型（默认："string"）
  required?: boolean;  // 创建时必填
  default?: FieldValue;// 默认值
  ref?: string;        // 引用其他实体（集合名）
  link?: string;       // 链接到其他实体
  delete?: "keep" | "cascade"; // 引用删除行为
  create?: boolean;    // 包含在创建操作中
  list?: boolean;      // 包含在列表响应中
  search?: boolean;    // 启用为搜索字段
  update?: boolean;    // 包含在更新操作中
  clone?: boolean;     // 包含在克隆操作中
  sys?: boolean;       // 系统字段（自动管理）
  secure?: boolean;    // 从客户端响应中排除
  view?: string;       // 基于视图的可见性
  role?: string | string[]; // 基于角色的字段可见性
}
```

### 内置类型

| 类别 | 类型 |
|------|------|
| **字符串** | `string`, `lstr`, `text`, `enum`, `email`, `url`, `ip` |
| **数值** | `number`, `int`, `uint`, `float`, `ufloat`, `decimal`, `percentage`, `currency` |
| **布尔** | `boolean` |
| **日期/时间** | `date`, `datetime` |
| **安全** | `password`（bcrypt 哈希）, `secret`（AES-256 加密） |
| **其他** | `file`, `array`, `obj`, `json`, `log_category` |

可通过 `register_type()` 注册自定义类型。

### 操作标志

```typescript
{
  creatable: true,   // 启用 POST 端点
  readable: true,    // 启用 GET 端点
  updatable: true,   // 启用 PUT 端点
  deleteable: true,  // 启用 DELETE 端点
  cloneable: true,   // 启用克隆端点
  importable: true,  // 启用批量导入
}
```

### 角色配置

格式：`角色名:权限` 或 `角色名:权限:视图`

```typescript
roles: [
  "admin:*",       // 管理员拥有所有权限
  "user:r",        // 用户只能读取
  "editor:cru",    // 编辑者可以创建/读取/更新
  "viewer:r:basic" // 查看者只能以 "basic" 视图读取
]
```

### 生命周期钩子

```typescript
init_router({
  collection: "order",
  // ...字段和选项...

  before_create: async ({ entity, data }) => { /* 插入前验证 */ },
  create: async ({ entity, data }) => { /* 自定义创建逻辑 */ },
  after_create: async ({ entity, data }) => { /* 创建后的副作用 */ },

  before_update: async ({ id, entity, data }) => { /* 更新前检查 */ },
  update: async ({ id, entity, data }) => { /* 自定义更新逻辑 */ },
  after_update: async ({ id, entity, data }) => { /* 更新后操作 */ },

  before_delete: async ({ entity, ids }) => { /* 删除前验证 */ },
  after_delete: async ({ entity, ids }) => { /* 删除后清理 */ },

  after_read: async ({ id, entity, result }) => { /* 转换读取结果 */ },
  list_query: async ({ entity, query }) => { /* 修改列表查询 */ },

  route: (router, meta) => { /* 添加自定义路由 */ },
});
```

## 🔌 插件

```typescript
import { plugins } from "hola-server";

// 跨域配置
app.use(plugins.holaCors({ origin: ["http://localhost:5173"] }));

// 请求体解析，设置大小限制
app.use(plugins.holaBody({ limit: "10mb" }));

// JWT 认证，支持访问令牌 + 刷新令牌
app.use(plugins.holaAuth({
  secret: "your-secret",
  accessExpiry: "15m",     // 默认
  refreshExpiry: "7d",     // 默认
  excludeUrls: ["/health", /^\/public/],
}));

// 认证路由（POST /auth/refresh, POST /auth/logout）
app.use(plugins.holaAuthRoutes());

// 全局错误处理
app.use(plugins.holaError());
```

## 🗄 数据库

```typescript
import { db } from "hola-server";

// 直接访问 MongoDB
const database = await db.get_db();
const users = await database.collection("user").find({}).toArray();

// 实体级操作
const entity = new db.Entity("user");
await entity.create_entity(data, "*");
await entity.read_entity(id, "*", "*");
await entity.update_entity(id, updates, "*");
await entity.delete_entity([id]);
await entity.list_entity(queryParams, query, searchParams, role);
```

## 📁 文件存储 (GridFS)

```typescript
import { db } from "hola-server";

// 从 Buffer 保存文件（FormData 上传）
await db.save_file_from_buffer("avatars", "user_123.png", buffer);

// 读取文件
const fileBuffer = await db.read_file("avatars", "user_123.png");

// 流式读取
const stream = await db.read_file_stream("avatars", "user_123.png");

// 删除文件
await db.delete_file("avatars", "user_123.png");
```

## 🔍 向量搜索

基于 SQLite 的向量相似度搜索，适用于 AI/嵌入应用：

```typescript
import { VectorStore, initVectorStore } from "hola-server";

const store = await initVectorStore({
  dbPath: "./data/vectors.db",
  dimensions: 1536,
  tableName: "embeddings",
});

// 插入向量及元数据
await store.insert("doc_1", embedding, { category: "article" });
await store.insertBatch(records);

// 搜索相似向量
const results = await store.search(queryEmbedding, 10, { category: "article" });
// => [{ id, distance, score, metadata }]

// 管理向量
await store.delete("doc_1");
await store.deleteByFilter({ category: "old" });
const count = await store.count();
```

## ⚙️ 配置

### 基于环境的配置

```typescript
import { config } from "hola-server";

const appConfig = await config.load_config(__dirname + "/config");
// 根据 NODE_ENV 加载 config/dev.ts, config/test.ts 或 config/prod.ts
```

### 设置

```typescript
import { init_settings } from "hola-server";

init_settings({
  mongo: { url: "mongodb://localhost:27017/myapp", pool: 10 },
  encrypt: { key: "my-encryption-key" },
  roles: [{ name: "admin", root: true }, { name: "user" }],
  server: {
    service_port: 8088,
    client_web_url: ["http://localhost:5173"],
    keep_session: true,
    check_user: true,
    exclude_urls: ["/"],
    session: { cookie_max_age: 86400000, secret: "session-secret" },
    threshold: { max_download_size: 5000, body_limit: "10mb", default_list_limit: 1000 },
    routes: ["router"],
  },
  axios: { retry: 3, retry_delay: 1000, proxy: null },
  log: { col_log: "log", log_level: 0, save_db: true },
});
```

## 🧰 核心工具

```typescript
import { array, date, validate, encrypt, random, bash, file, obj, number, lhs } from "hola-server";

// 数组工具
array.unique([1, 2, 2, 3]); // [1, 2, 3]

// 加密
const hashed = encrypt_pwd("password");
const encrypted = encrypt_secret("api-key");
const decrypted = decrypt_secret(encrypted);

// 更多：日期格式化、验证、bash 执行、文件 I/O 等
```

## 🧪 测试

```bash
bun test
```

25 个测试文件覆盖：
- **核心**：array, chart, date, encrypt, file, lhs, meta, number, obj, random, thread, type, validate
- **数据库**：连接、操作、实体类、GridFS
- **实体 CRUD**：创建、读取、更新、删除、克隆、引用过滤

## 📂 项目结构

```
hola-server/
├── src/
│   ├── index.ts          # 公共 API 入口
│   ├── setting.ts        # 应用设置
│   ├── config/           # 基于环境的配置加载器
│   ├── core/             # 核心工具（16 个模块）
│   │   ├── meta.ts       # 实体元数据和生命周期钩子
│   │   ├── type.ts       # 类型系统和验证
│   │   ├── role.ts       # 角色权限控制
│   │   ├── encrypt.ts    # 密码哈希和 AES 加密
│   │   └── ...           # array, bash, chart, date, file 等
│   ├── db/               # 数据库层
│   │   ├── db.ts         # MongoDB 连接和辅助方法
│   │   ├── entity.ts     # 实体 CRUD 操作
│   │   └── gridfs.ts     # GridFS 文件存储
│   ├── meta/             # 元编程
│   │   ├── router.ts     # 自动 RESTful 路由生成
│   │   └── schema.ts     # TypeBox Schema 生成
│   ├── plugins/          # Elysia 插件
│   │   ├── auth.ts       # JWT 认证
│   │   ├── cors.ts       # CORS 配置
│   │   ├── body.ts       # 请求体解析
│   │   └── error.ts      # 错误处理
│   ├── errors/           # 错误类（认证、HTTP、验证）
│   ├── http/             # HTTP 状态码
│   └── tool/             # 工具
│       ├── gen_i18n.ts   # i18n 键生成
│       └── vector_store.ts # 向量相似度搜索
├── test/                 # 测试套件（25 个测试文件）
├── package.json
└── tsconfig.json
```

## 📄 许可证

ISC

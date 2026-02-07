# Hola Server

[中文文档](./README_CN.md)

A meta-programming framework for building RESTful APIs with **Bun + Elysia + MongoDB**. Define entity schemas declaratively and get fully-featured CRUD APIs with built-in authentication, role-based access control, file handling, and vector search — all out of the box.

## ✨ Features

- **Meta-Driven CRUD** — Define entity schemas with metadata, get full RESTful APIs automatically
- **Role-Based Access Control** — Fine-grained permissions per entity and operation (`admin:*`, `user:r`, `editor:cru`)
- **JWT Authentication** — Access + refresh token flow with hybrid delivery (cookies & Authorization header)
- **Type System** — 20+ built-in types with extensible validation and conversion
- **Schema Validation** — Auto-generated TypeBox schemas for request body validation
- **File Handling** — Built-in GridFS integration for file uploads and streaming
- **Vector Search** — SQLite-based vector similarity search via `sqlite-vec` for AI applications
- **Entity Relationships** — References with cascade/keep delete behavior and ref validation
- **Lifecycle Hooks** — Before/after hooks for create, update, clone, delete, and read operations
- **Query Building** — Advanced search, filtering, comparison operators, and pagination
- **Environment Config** — Configuration loader with environment-specific files (dev/test/prod)
- **Comprehensive Testing** — 25 test files covering core, database, entity, and cleanup

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) |
| HTTP Framework | [Elysia](https://elysiajs.com) v1.2+ |
| Database | [MongoDB](https://www.mongodb.com) 6.x |
| File Storage | MongoDB GridFS |
| Vector Search | [sqlite-vec](https://github.com/asg017/sqlite-vec) + better-sqlite3 |
| Auth | [@elysiajs/jwt](https://www.npmjs.com/package/@elysiajs/jwt) |
| Language | TypeScript 5.7+ |

## 🚀 Quick Start

### Installation

```bash
bun install
```

### 1. Define an Entity

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

### 2. Start the Server

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
    console.log("✓ Server ready on port 3000");
  })
  .listen(3000);
```

## 📡 API Endpoints

Each entity router automatically generates these endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/{entity}` | Simple list with query params |
| `POST` | `/{entity}/list` | List entities (full query: filter, sort, paginate) |
| `GET` | `/{entity}/:id` | Get single entity by ID |
| `POST` | `/{entity}` | Create entity |
| `PUT` | `/{entity}/:id` | Update entity |
| `DELETE` | `/{entity}/:id` | Delete entity |
| `GET` | `/{entity}/meta` | Get entity metadata and permissions |
| `GET` | `/{entity}/ref` | Get reference labels |
| `POST` | `/{entity}/:id/clone` | Clone entity (if cloneable) |

## 🏗 Entity Metadata

### Field Definition

```typescript
interface FieldDefinition {
  name: string;        // Field name
  type?: string;       // Type for validation/conversion (default: "string")
  required?: boolean;  // Required on create
  default?: FieldValue;// Default value
  ref?: string;        // Reference to another entity (collection name)
  link?: string;       // Link to another entity
  delete?: "keep" | "cascade"; // Ref delete behavior
  create?: boolean;    // Include in create operation
  list?: boolean;      // Include in list response
  search?: boolean;    // Enable as search field
  update?: boolean;    // Include in update operation
  clone?: boolean;     // Include in clone operation
  sys?: boolean;       // System field (auto-managed)
  secure?: boolean;    // Exclude from client responses
  view?: string;       // View-based visibility
  role?: string | string[]; // Role-based field visibility
}
```

### Built-in Types

| Category | Types |
|----------|-------|
| **String** | `string`, `lstr`, `text`, `enum`, `email`, `url`, `ip` |
| **Numeric** | `number`, `int`, `uint`, `float`, `ufloat`, `decimal`, `percentage`, `currency` |
| **Boolean** | `boolean` |
| **Date/Time** | `date`, `datetime` |
| **Security** | `password` (bcrypt hashed), `secret` (AES-256 encrypted) |
| **Other** | `file`, `array`, `obj`, `json`, `log_category` |

Custom types can be registered via `register_type()`.

### Operation Flags

```typescript
{
  creatable: true,   // Enable POST endpoint
  readable: true,    // Enable GET endpoints
  updatable: true,   // Enable PUT endpoint
  deleteable: true,  // Enable DELETE endpoint
  cloneable: true,   // Enable clone endpoint
  importable: true,  // Enable bulk import
}
```

### Role Configuration

Format: `role_name:permissions` or `role_name:permissions:view`

```typescript
roles: [
  "admin:*",       // Admin can do everything
  "user:r",        // User can only read
  "editor:cru",    // Editor can create/read/update
  "viewer:r:basic" // Viewer can read with "basic" view only
]
```

### Lifecycle Hooks

```typescript
init_router({
  collection: "order",
  // ...fields and options...

  before_create: async ({ entity, data }) => { /* validate before insert */ },
  create: async ({ entity, data }) => { /* custom create logic */ },
  after_create: async ({ entity, data }) => { /* post-create side effects */ },

  before_update: async ({ id, entity, data }) => { /* pre-update checks */ },
  update: async ({ id, entity, data }) => { /* custom update logic */ },
  after_update: async ({ id, entity, data }) => { /* post-update actions */ },

  before_delete: async ({ entity, ids }) => { /* pre-delete validation */ },
  after_delete: async ({ entity, ids }) => { /* cleanup after delete */ },

  after_read: async ({ id, entity, result }) => { /* transform read results */ },
  list_query: async ({ entity, query }) => { /* modify list queries */ },

  route: (router, meta) => { /* add custom routes */ },
});
```

## 🔌 Plugins

```typescript
import { plugins } from "hola-server";

// CORS with allowed origins
app.use(plugins.holaCors({ origin: ["http://localhost:5173"] }));

// Request body parsing with size limit
app.use(plugins.holaBody({ limit: "10mb" }));

// JWT auth with access + refresh tokens
app.use(plugins.holaAuth({
  secret: "your-secret",
  accessExpiry: "15m",     // default
  refreshExpiry: "7d",     // default
  excludeUrls: ["/health", /^\/public/],
}));

// Auth routes (POST /auth/refresh, POST /auth/logout)
app.use(plugins.holaAuthRoutes());

// Global error handling
app.use(plugins.holaError());
```

## 🗄 Database

```typescript
import { db } from "hola-server";

// Direct MongoDB access
const database = await db.get_db();
const users = await database.collection("user").find({}).toArray();

// Entity-level operations
const entity = new db.Entity("user");
await entity.create_entity(data, "*");
await entity.read_entity(id, "*", "*");
await entity.update_entity(id, updates, "*");
await entity.delete_entity([id]);
await entity.list_entity(queryParams, query, searchParams, role);
```

## 📁 File Storage (GridFS)

```typescript
import { db } from "hola-server";

// Save file from buffer (FormData uploads)
await db.save_file_from_buffer("avatars", "user_123.png", buffer);

// Read file
const fileBuffer = await db.read_file("avatars", "user_123.png");

// Stream file
const stream = await db.read_file_stream("avatars", "user_123.png");

// Delete file
await db.delete_file("avatars", "user_123.png");
```

## 🔍 Vector Search

SQLite-based vector similarity search for AI/embedding applications:

```typescript
import { VectorStore, initVectorStore } from "hola-server";

const store = await initVectorStore({
  dbPath: "./data/vectors.db",
  dimensions: 1536,
  tableName: "embeddings",
});

// Insert vectors with metadata
await store.insert("doc_1", embedding, { category: "article" });
await store.insertBatch(records);

// Search similar vectors
const results = await store.search(queryEmbedding, 10, { category: "article" });
// => [{ id, distance, score, metadata }]

// Manage vectors
await store.delete("doc_1");
await store.deleteByFilter({ category: "old" });
const count = await store.count();
```

## ⚙️ Configuration

### Environment-Based Config

```typescript
import { config } from "hola-server";

const appConfig = await config.load_config(__dirname + "/config");
// Loads config/dev.ts, config/test.ts, or config/prod.ts based on NODE_ENV
```

### Settings

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

## 🧰 Core Utilities

```typescript
import { array, date, validate, encrypt, random, bash, file, obj, number, lhs } from "hola-server";

// Array utilities
array.unique([1, 2, 2, 3]); // [1, 2, 3]

// Encryption
const hashed = encrypt_pwd("password");
const encrypted = encrypt_secret("api-key");
const decrypted = decrypt_secret(encrypted);

// And more: date formatting, validation, bash execution, file I/O, etc.
```

## 🧪 Testing

```bash
bun test
```

25 test files covering:
- **Core**: array, chart, date, encrypt, file, lhs, meta, number, obj, random, thread, type, validate
- **Database**: connection, operations, entity class, GridFS
- **Entity CRUD**: create, read, update, delete, clone, ref-filter

## 📂 Project Structure

```
hola-server/
├── src/
│   ├── index.ts          # Public API entry point
│   ├── setting.ts        # Application settings
│   ├── config/           # Environment-based config loader
│   ├── core/             # Core utilities (16 modules)
│   │   ├── meta.ts       # Entity metadata & lifecycle hooks
│   │   ├── type.ts       # Type system & validation
│   │   ├── role.ts       # Role-based access control
│   │   ├── encrypt.ts    # Password hashing & AES encryption
│   │   └── ...           # array, bash, chart, date, file, etc.
│   ├── db/               # Database layer
│   │   ├── db.ts         # MongoDB connection & helpers
│   │   ├── entity.ts     # Entity CRUD operations
│   │   └── gridfs.ts     # GridFS file storage
│   ├── meta/             # Meta programming
│   │   ├── router.ts     # Auto RESTful route generation
│   │   └── schema.ts     # TypeBox schema generation
│   ├── plugins/          # Elysia plugins
│   │   ├── auth.ts       # JWT authentication
│   │   ├── cors.ts       # CORS configuration
│   │   ├── body.ts       # Body parser
│   │   └── error.ts      # Error handling
│   ├── errors/           # Error classes (auth, http, validation)
│   ├── http/             # HTTP status codes
│   └── tool/             # Tools
│       ├── gen_i18n.ts   # i18n key generation
│       └── vector_store.ts # Vector similarity search
├── test/                 # Test suite (25 test files)
├── package.json
└── tsconfig.json
```

## 📄 License

ISC

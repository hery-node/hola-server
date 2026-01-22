# Hola Server

A meta-programming framework for building Bun + Elysia RESTful APIs with MongoDB. Hola Server provides a declarative, metadata-driven approach to building CRUD APIs with built-in JWT authentication, role-based access control, and file handling.

## Features

- **Meta-Driven CRUD**: Define entity schemas with metadata and get full CRUD APIs automatically
- **Role-Based Access Control**: Fine-grained permissions per entity, operation, and view
- **Type System**: Extensible type conversion and validation system
- **File Handling**: Built-in GridFS integration for file uploads
- **JWT Authentication**: Hybrid token delivery via cookies and Authorization header
- **Entity Relationships**: Support for references with cascade/keep delete behavior
- **Query Building**: Advanced search, filtering, and pagination
- **Elysia Plugins**: Composable plugin architecture for CORS, auth, and error handling
- **Comprehensive Testing**: Full test suite with 111+ passing tests

## Installation

```bash
bun install
```

## Quick Start

### 1. Create Entity Router

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
  ],

  roles: ["admin:*", "user:r"],
});
```

### 2. Start Server

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
    console.log("✓ Server ready");
  })
  .listen(3000);

export type App = typeof app;
```

## Entity Metadata

### Field Types

For a complete list of field types and their validation/conversion behavior, see [skills/type.md](skills/type.md).

Common types include: `string`, `int`, `uint`, `float`, `boolean`, `password`, `email`, `date`, `datetime`, `array`, `file`.

### Field Options

For complete field attribute documentation, see [skills/meta.md](skills/meta.md).

Common options include: `required`, `default`, `ref`, `create`, `update`, `list`, `search`, `sys`, `secure`.

### Operation Flags

- `creatable` - Enable POST endpoint
- `readable` - Enable GET endpoints
- `updatable` - Enable PUT endpoint
- `deleteable` - Enable DELETE endpoint
- `cloneable` - Enable clone endpoint

### Role Configuration

Format: `role_name:permissions`

Example:

```typescript
roles: [
  "admin:*", // Admin can do everything
  "user:r", // User can only read
  "editor:cru", // Editor can create/read/update
];
```

## API Endpoints

For an entity router:

- `POST /{entity}/list` - List entities (with filtering, sorting, pagination)
- `GET /{entity}/:id` - Get single entity
- `POST /{entity}` - Create entity
- `PUT /{entity}/:id` - Update entity
- `DELETE /{entity}/:id` - Delete entity
- `GET /{entity}/meta` - Get entity metadata
- `POST /{entity}/:id/clone` - Clone entity (if cloneable)

## Core Utilities

### Database

```typescript
import { db } from "hola-server";

const database = await db.get_db();
const users = await database.collection("user").find({}).toArray();
```

### Entity Operations

```typescript
import { db } from "hola-server";

const entity = new db.Entity(meta);
await entity.create_entity(data, "*");
await entity.read_entity(id, "*", "*");
await entity.update_entity(id, updates, "*");
await entity.delete_entity([id]);
```

### Plugins

See [skills/elysia.md](skills/elysia.md) for complete plugin documentation.

```typescript
import { plugins } from "hola-server";

app.use(plugins.holaCors({ origin: [...] }));
app.use(plugins.holaAuth({ secret: "..." }));
app.use(plugins.holaError());
```

## Testing

```bash
bun test
```

## Project Structure

```
hola-server/
├── core/          # Core utilities (array, date, validate, etc.)
├── db/            # Database layer (connection, entity, gridfs)
├── http/          # Elysia plugins and error classes
├── router/        # CRUD route handlers
├── test/          # Test suite
└── tool/          # Tools (i18n generation)
```

## License

ISC

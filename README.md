# Hola Server

A meta-programming framework for building Node.js RESTful APIs with MongoDB. Hola Server provides a declarative, metadata-driven approach to building CRUD APIs with built-in authentication, role-based access control, and file handling.

## Features

- **Meta-Driven CRUD**: Define entity schemas with metadata and get full CRUD APIs automatically
- **Role-Based Access Control**: Fine-grained permissions per entity, operation, and view
- **Type System**: Extensible type conversion and validation system
- **File Handling**: Built-in GridFS integration for file uploads
- **Session Management**: Express session with MongoDB store
- **Entity Relationships**: Support for references with cascade/keep delete behavior
- **Query Building**: Advanced search, filtering, and pagination
- **Async Context**: Request-scoped context using AsyncLocalStorage
- **Comprehensive Testing**: Full test suite with 111+ passing tests

## Installation

```bash
npm install
```

## Quick Start

### 1. Configure Settings

```javascript
const { init_settings } = require("hola-server");

init_settings({
  mongo: {
    url: "mongodb://localhost/myapp",
    pool: 10,
  },
  server: {
    service_port: 8088,
    client_web_url: ["http://localhost:3000"],
    session: {
      secret: "your-secret-key",
      cookie_max_age: 86400000, // 1 day
    },
  },
  roles: [{ name: "admin", root: true }, { name: "user" }],
});
```

### 2. Define Entity Metadata

```javascript
const { EntityMeta } = require("hola-server");

const user_meta = {
  collection: "user",
  mode: "crud",
  fields: [
    { name: "name", type: "string", required: true },
    { name: "email", type: "string", required: true, primary: true },
    { name: "age", type: "uint" },
    { name: "role", type: "obj", ref: "role" },
  ],
  roles: ["admin:crud:*", "user:r:*"],
};
```

### 3. Create Router

```javascript
const { init_router } = require("hola-server");

const router = init_router(user_meta);
module.exports = router;
```

### 4. Start Server

```javascript
const { init_express_server } = require("hola-server");

init_express_server(__dirname, "service_port", async () => {
  console.log("Server started on port 8088");
});
```

## Entity Metadata

### Field Types

- `string` - String with trim
- `int` - Integer
- `uint` - Unsigned integer
- `float` - Float with 2 decimal places
- `ufloat` - Unsigned float
- `number` - Any number
- `boolean` - Boolean
- `password` - Encrypted password
- `array` - Array type
- `obj` - Object/Reference type
- `file` - File upload

### Field Options

- `required` - Field is required
- `primary` - Primary key (unique)
- `searchable` - Searchable in queries
- `invisible` - Hidden from responses
- `sys` - System field
- `ref` - Reference to another entity
- `delete` - Cascade behavior: `cascade` or `keep`

### CRUD Modes

- `c` - Create
- `r` - Read
- `u` - Update
- `d` - Delete
- `o` - Clone
- `crud` - All operations

### Role Configuration

Format: `role_name:mode:view`

Example:

```javascript
roles: [
  "admin:crud:*", // Admin can do all operations on all views
  "user:r:public", // User can only read public view
  "editor:cru:edit", // Editor can create/read/update edit view
];
```

## API Endpoints

For an entity with `mode: 'crud'`:

- `POST /{entity}/create` - Create entity
- `POST /{entity}/query` - Query entities
- `POST /{entity}/count` - Count entities
- `POST /{entity}/update` - Update entity
- `POST /{entity}/delete` - Delete entity
- `POST /{entity}/clone` - Clone entity (if cloneable)

## Core Utilities

### Database

```javascript
const { get_db } = require("hola-server");

const db = await get_db();
const users = await db.collection("user").find({});
```

### Entity Operations

```javascript
const { Entity } = require("hola-server");

const entity = new Entity(meta);
await entity.create_entity(data);
await entity.find_entity(query);
await entity.update_entity(id, updates);
await entity.delete_entity(id);
```

### Logging

```javascript
const { log_info, log_error } = require("hola-server");

log_info("user", "User logged in", { user_id });
log_error("auth", "Login failed", { email });
```

## Testing

```bash
npm test
```

## Project Structure

```
hola-server/
├── core/          # Core utilities (array, date, validate, etc.)
├── db/            # Database layer (connection, entity, gridfs)
├── http/          # HTTP layer (express, router, middleware)
├── router/        # CRUD route handlers
├── test/          # Test suite
└── tool/          # Tools (i18n generation)
```

## License

ISC

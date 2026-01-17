# Elysia Server Skill

## Overview

The `hola-server` package provides a composable plugin architecture for building Elysia-based REST APIs with JWT authentication, CRUD operations, and meta-driven entity management.

## Quick Start

```typescript
import { Elysia } from 'elysia';
import { plugins, meta, db } from 'hola-server';
import { userRouter } from './router/user.js';

const app = new Elysia()
    .use(plugins.holaCors({ origin: ['http://localhost:5173'] }))
    .use(plugins.holaBody({ limit: '10mb' }))
    .use(plugins.holaAuth({ secret: process.env.JWT_SECRET! }))
    .use(plugins.holaError())
    .use(userRouter)
    .onStart(async () => {
        await db.get_db();
        meta.validate_all_metas();
        console.log('✓ Server ready');
    })
    .listen(3000);
```

---

## Plugins

### `plugins.holaCors(config)`

CORS configuration plugin.

```typescript
.use(plugins.holaCors({
    origin: ['http://localhost:5173'],  // Allowed origins or `true` for all
    methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Optional
    credentials: true  // Optional, default: true
}))
```

### `plugins.holaBody(config)`

Body size limit plugin.

```typescript
.use(plugins.holaBody({
    limit: '10mb'  // Accepts: '1kb', '10mb', '1gb', or bytes
}))
```

### `plugins.holaAuth(config)`

JWT authentication with access + refresh tokens.

```typescript
.use(plugins.holaAuth({
    secret: 'your-jwt-secret',
    accessExpiry: '15m',   // Optional, default: '15m'
    refreshExpiry: '7d',   // Optional, default: '7d'
    excludeUrls: ['/auth/login', '/health']  // Optional
}))
```

**Token Delivery (Hybrid):**
- Cookies for browser clients
- Authorization header for API clients: `Authorization: Bearer <token>`

**Auth Routes (add separately):**
```typescript
.use(plugins.holaAuthRoutes())  // Adds /auth/refresh and /auth/logout
```

### `plugins.holaError()`

Error handling plugin mapping errors to HTTP status codes.

```typescript
.use(plugins.holaError())
```

**Error Classes:**
| Class | HTTP Status | Code |
|-------|-------------|------|
| `AuthError` | 401 | NO_SESSION |
| `TokenExpiredError` | 401 | TOKEN_EXPIRED |
| `ValidationError` | 400 | INVALID |
| `NotFoundError` | 404 | NOT_FOUND |
| `NoRightsError` | 403 | NO_RIGHTS |

---

## Creating Entity Routers

### Using `meta.init_router()`

Creates RESTful CRUD routes from an EntityMeta definition:

```typescript
import { meta } from 'hola-server';

export const userRouter = meta.init_router({
    collection: 'user',
    primary_keys: ['email'],
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    ref_label: 'name',
    fields: [
        { name: 'email', type: 'string', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'role', type: 'string', default: 'user' }
    ]
});
```

**Generated Routes:**

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/user` | List users |
| GET | `/user/:id` | Get single user |
| POST | `/user` | Create user |
| PUT | `/user/:id` | Update user |
| DELETE | `/user/:id` | Delete user |
| GET | `/user/meta` | Get field metadata |
| POST | `/user/:id/clone` | Clone user |

---

## Configuration

### Environment-based Config

```typescript
// config/dev.ts
import { config } from 'hola-server';

export default config.create_base_config({
    port: 3000,
    jwt: { secret: 'dev-secret' },
    cors: { origin: ['http://localhost:5173'] },
    db: { url: 'mongodb://localhost:27017/myapp_dev' }
});

// config/prod.ts
export default {
    port: parseInt(process.env.PORT!),
    jwt: { secret: process.env.JWT_SECRET! },
    cors: { origin: process.env.CORS_ORIGINS!.split(',') },
    db: { url: process.env.MONGO_URL! }
};
```

### Loading Config

```typescript
import { config } from 'hola-server';

const appConfig = await config.load_config(__dirname + '/config');
```

---

## Namespaced Imports

```typescript
import { plugins, errors, db, meta, config } from 'hola-server';

// Plugins
plugins.holaCors({ ... })
plugins.holaBody({ ... })
plugins.holaAuth({ ... })
plugins.holaError()

// Errors
throw new errors.AuthError('not authenticated');
throw new errors.NotFoundError();

// Database
await db.get_db();
const entity = new db.Entity(userMeta);

// Meta
const router = meta.init_router({ ... });
meta.validate_all_metas();

// Config
const cfg = await config.load_config('./config');
```

---

## Complete Example

```typescript
// server/main.ts
import { Elysia } from 'elysia';
import { plugins, meta, db, config } from 'hola-server';
import { userRouter } from './router/user.js';
import { orderRouter } from './router/order.js';
import { authRouter } from './router/auth.js';

const cfg = await config.load_config(__dirname + '/config');

const app = new Elysia()
    // Middleware plugins
    .use(plugins.holaCors(cfg.cors))
    .use(plugins.holaBody(cfg.body))
    .use(plugins.holaAuth({ ...cfg.jwt, excludeUrls: ['/auth/login'] }))
    .use(plugins.holaError())
    
    // Routes
    .use(authRouter)
    .use(userRouter)
    .use(orderRouter)
    
    // Lifecycle
    .onStart(async () => {
        await db.get_db();
        meta.validate_all_metas();
        console.log(`✓ Server running on port ${cfg.port}`);
    })
    
    .listen(cfg.port);
```

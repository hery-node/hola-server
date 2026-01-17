# Hola Server Elysia API Redesign

## Overview

This document describes the redesign of hola-server to be fully Elysia-native, following the plugin composition pattern for maximum flexibility and type safety.

## Design Decisions Summary

| Feature | Current | New Design |
|---------|---------|------------|
| Architecture | Monolithic `init_http_server()` | Composable plugins |
| Sessions | Cookie + MongoDB store | JWT (access + refresh tokens) |
| Token Delivery | Cookies only | Hybrid (cookies + Authorization header) |
| CRUD Routes | POST-based (`/create`, `/list`) | RESTful (`GET`, `POST`, `PUT`, `DELETE`) |
| Validation | Handler-level validation | TypeBox schemas from EntityMeta |
| Context | AsyncLocalStorage | Elysia's `derive` |
| Error Handling | Simple `{ code, err }` | Elysia-native typed errors |
| Router Loading | Dynamic file scanning | Explicit plugin registration |
| API Prefix | Global from settings | Routers define their own |
| Configuration | Centralized settings file | Explicit plugin config + env files |
| Exports | Flat exports | Namespaced (`plugins`, `errors`, `db`, `meta`) |

---

## 1. Package Structure

### 1.1 New Directory Layout

```
src/
├── plugins/                    # Elysia plugins
│   ├── cors.ts                # CORS plugin
│   ├── auth.ts                # JWT auth plugin (access + refresh)
│   ├── body.ts                # Body limit plugin
│   └── error.ts               # Error handling plugin
├── errors/                     # Custom error classes
│   ├── index.ts
│   ├── auth.ts                # AuthError, TokenExpiredError
│   ├── validation.ts          # ValidationError
│   └── http.ts                # NotFoundError, NoRightsError
├── db/                        # Database (unchanged mostly)
│   ├── db.ts
│   ├── entity.ts
│   └── gridfs.ts
├── meta/                      # Meta system (refactored from core/meta.ts)
│   ├── index.ts
│   ├── entity_meta.ts         # EntityMeta class
│   ├── schema.ts              # TypeBox schema generator
│   └── router.ts              # init_router() for CRUD
├── core/                      # Core utilities (unchanged)
│   └── ...
├── config/                    # Configuration loader
│   └── index.ts               # Environment-based config loader
└── index.ts                   # Namespaced exports
```

### 1.2 Namespaced Exports

```typescript
// src/index.ts
export * as plugins from './plugins/index.js';
export * as errors from './errors/index.js';
export * as db from './db/index.js';
export * as meta from './meta/index.js';
export * as config from './config/index.js';

// Re-export commonly used items at top level for convenience
export { EntityMeta, init_router } from './meta/index.js';
export { Entity } from './db/entity.js';
```

---

## 2. Plugin Architecture

### 2.1 CORS Plugin

```typescript
// src/plugins/cors.ts
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

export interface CorsConfig {
    origin: string[] | true;
    methods?: string[];
    credentials?: boolean;
}

export const holaCors = (config: CorsConfig) => 
    new Elysia({ name: 'hola-cors' })
        .use(cors({
            origin: config.origin,
            methods: config.methods ?? ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: config.credentials ?? true
        }));
```

### 2.2 Auth Plugin (JWT)

```typescript
// src/plugins/auth.ts
import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export interface AuthConfig {
    secret: string;
    accessExpiry?: string;   // default: '15m'
    refreshExpiry?: string;  // default: '7d'
    excludeUrls?: (string | RegExp)[];
}

export const holaAuth = (config: AuthConfig) =>
    new Elysia({ name: 'hola-auth' })
        .use(jwt({
            name: 'accessJwt',
            secret: config.secret,
            exp: config.accessExpiry ?? '15m'
        }))
        .use(jwt({
            name: 'refreshJwt', 
            secret: config.secret,
            exp: config.refreshExpiry ?? '7d'
        }))
        .derive(({ headers, cookie, accessJwt }) => {
            // Hybrid: check Authorization header first, then cookie
            const token = headers.authorization?.replace('Bearer ', '') 
                       ?? cookie.access_token?.value;
            return {
                getUser: async () => token ? await accessJwt.verify(token) : null
            };
        })
        .onBeforeHandle(async ({ getUser, path, set }) => {
            // Skip auth for excluded URLs
            if (is_excluded(path, config.excludeUrls)) return;
            
            const user = await getUser();
            if (!user) {
                set.status = 401;
                throw new AuthError('authentication required');
            }
        });
```

### 2.3 Body Limit Plugin

```typescript
// src/plugins/body.ts
import { Elysia } from 'elysia';

export interface BodyConfig {
    limit?: string | number;  // e.g., '10mb' or 10485760
}

const parse_size = (size: string | number): number => {
    if (typeof size === 'number') return size;
    const match = size.match(/^(\d+)(kb|mb|gb)?$/i);
    if (!match) return 1048576; // 1mb default
    const [, num, unit] = match;
    const multipliers: Record<string, number> = { kb: 1024, mb: 1048576, gb: 1073741824 };
    return parseInt(num) * (multipliers[unit?.toLowerCase() ?? 'b'] ?? 1);
};

export const holaBody = (config: BodyConfig = {}) =>
    new Elysia({ 
        name: 'hola-body',
        serve: {
            maxRequestBodySize: parse_size(config.limit ?? '10mb')
        }
    });
```

### 2.4 Error Handling Plugin

```typescript
// src/plugins/error.ts
import { Elysia } from 'elysia';
import { AuthError, ValidationError, NotFoundError, NoRightsError } from '../errors/index.js';

export const holaError = () =>
    new Elysia({ name: 'hola-error' })
        .error({
            AUTH: AuthError,
            VALIDATION: ValidationError,
            NOT_FOUND: NotFoundError,
            NO_RIGHTS: NoRightsError
        })
        .onError(({ code, error, set }) => {
            // Map Elysia error codes to HTTP status
            const statusMap: Record<string, number> = {
                AUTH: 401,
                VALIDATION: 400,
                NOT_FOUND: 404,
                NO_RIGHTS: 403
            };
            
            set.status = statusMap[code] ?? 500;
            
            return {
                code: error.code ?? code,
                err: error.message
            };
        });
```

---

## 3. Error Classes

```typescript
// src/errors/auth.ts
export class AuthError extends Error {
    code = 'NO_SESSION';
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

export class TokenExpiredError extends Error {
    code = 'TOKEN_EXPIRED';
    constructor(message = 'token expired') {
        super(message);
        this.name = 'TokenExpiredError';
    }
}

// src/errors/validation.ts
export class ValidationError extends Error {
    code = 'INVALID';
    fields: string[];
    constructor(message: string, fields: string[] = []) {
        super(message);
        this.name = 'ValidationError';
        this.fields = fields;
    }
}

// src/errors/http.ts
export class NotFoundError extends Error {
    code = 'NOT_FOUND';
    constructor(message = 'resource not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class NoRightsError extends Error {
    code = 'NO_RIGHTS';
    constructor(message = 'no rights') {
        super(message);
        this.name = 'NoRightsError';
    }
}
```

---

## 4. RESTful CRUD Routes

### 4.1 Route Mapping

| Current Route | New RESTful Route | HTTP Method |
|---------------|-------------------|-------------|
| `POST /:collection/create` | `POST /:collection` | POST |
| `POST /:collection/list` | `GET /:collection` | GET |
| `POST /:collection/read_entity` | `GET /:collection/:id` | GET |
| `POST /:collection/update` | `PUT /:collection/:id` | PUT |
| `POST /:collection/delete` | `DELETE /:collection/:id` | DELETE |
| `GET /:collection/meta` | `GET /:collection/meta` | GET (unchanged) |
| `GET /:collection/mode` | `GET /:collection/mode` | GET (unchanged) |
| `GET /:collection/ref` | `GET /:collection/ref` | GET (unchanged) |
| `POST /:collection/read_property` | `GET /:collection/:id/property` | GET |
| `POST /:collection/clone` | `POST /:collection/:id/clone` | POST |

### 4.2 New Router Implementation

```typescript
// src/meta/router.ts
import { Elysia, t } from 'elysia';
import { EntityMeta, MetaDefinition } from './entity_meta.js';
import { meta_to_schema } from './schema.js';
import { Entity } from '../db/entity.js';
import { NoRightsError, ValidationError, NotFoundError } from '../errors/index.js';

export const init_router = (definition: MetaDefinition): Elysia => {
    const meta = new EntityMeta(definition);
    const entity = new Entity(meta);
    const schema = meta_to_schema(meta);

    return new Elysia({ prefix: `/${meta.collection}` })
        // GET /collection - List entities
        .get('/', async ({ query, getUser }) => {
            check_read_rights(await getUser(), meta);
            const result = await entity.list_entity(query._query ?? {}, {}, {}, '*');
            return { code: 'SUCCESS', ...result };
        }, {
            query: t.Object({
                _query: t.Optional(t.String()),
                page: t.Optional(t.Number()),
                limit: t.Optional(t.Number())
            })
        })

        // GET /collection/:id - Read single entity
        .get('/:id', async ({ params, getUser }) => {
            check_read_rights(await getUser(), meta);
            const result = await entity.read_entity(params.id, '*', '*');
            if (!result.data) throw new NotFoundError();
            return { code: 'SUCCESS', data: result.data };
        }, {
            params: t.Object({ id: t.String() })
        })

        // POST /collection - Create entity
        .post('/', async ({ body, getUser }) => {
            check_create_rights(await getUser(), meta);
            const result = await entity.create_entity(body, '*');
            return { code: 'SUCCESS', ...result };
        }, {
            body: schema.create
        })

        // PUT /collection/:id - Update entity
        .put('/:id', async ({ params, body, getUser }) => {
            check_update_rights(await getUser(), meta);
            const result = await entity.update_entity(params.id, body, '*');
            return { code: 'SUCCESS', ...result };
        }, {
            params: t.Object({ id: t.String() }),
            body: schema.update
        })

        // DELETE /collection/:id - Delete entity
        .delete('/:id', async ({ params, getUser }) => {
            check_delete_rights(await getUser(), meta);
            const result = await entity.delete_entity(params.id);
            return { code: 'SUCCESS', ...result };
        }, {
            params: t.Object({ id: t.String() })
        })

        // GET /collection/meta - Get field metadata
        .get('/meta', async ({ getUser }) => {
            const user = await getUser();
            check_read_rights(user, meta);
            return { code: 'SUCCESS', data: build_meta_response(user, meta) };
        })

        // POST /collection/:id/clone - Clone entity
        .post('/:id/clone', async ({ params, getUser }) => {
            check_clone_rights(await getUser(), meta);
            const result = await entity.clone_entity(params.id);
            return { code: 'SUCCESS', ...result };
        }, {
            params: t.Object({ id: t.String() })
        });
};
```

---

## 5. TypeBox Schema Generation

```typescript
// src/meta/schema.ts
import { t, TSchema } from 'elysia';
import { EntityMeta, FieldDefinition } from './entity_meta.js';

const field_to_schema = (field: FieldDefinition): TSchema => {
    const type_map: Record<string, () => TSchema> = {
        string: () => t.String(),
        int: () => t.Number(),
        float: () => t.Number(),
        boolean: () => t.Boolean(),
        date: () => t.String({ format: 'date-time' }),
        array: () => t.Array(t.Unknown()),
        object: () => t.Object({}),
        file: () => t.File()
    };

    const base = type_map[field.type ?? 'string']?.() ?? t.String();
    return field.required ? base : t.Optional(base);
};

export const meta_to_schema = (meta: EntityMeta) => {
    // Create schema - only fields with create !== false
    const create_fields = meta.create_fields.reduce((acc, f) => {
        acc[f.name] = field_to_schema(f);
        return acc;
    }, {} as Record<string, TSchema>);

    // Update schema - only fields with update !== false
    const update_fields = meta.update_fields.reduce((acc, f) => {
        acc[f.name] = t.Optional(field_to_schema(f));
        return acc;
    }, {} as Record<string, TSchema>);

    return {
        create: t.Object(create_fields),
        update: t.Object(update_fields)
    };
};
```

---

## 6. Configuration System

### 6.1 Environment-based Config Files

```
project/
├── config/
│   ├── dev.ts
│   ├── test.ts
│   └── prod.ts
├── server/
│   └── main.ts
```

```typescript
// config/dev.ts
export default {
    port: 3000,
    jwt: {
        secret: 'dev-secret-change-in-production',
        accessExpiry: '1h',
        refreshExpiry: '7d'
    },
    cors: {
        origin: ['http://localhost:5173']
    },
    body: {
        limit: '10mb'
    },
    db: {
        url: 'mongodb://localhost:27017/hola_dev'
    }
};

// config/prod.ts
export default {
    port: parseInt(process.env.PORT || '8080'),
    jwt: {
        secret: process.env.JWT_SECRET!,
        accessExpiry: '15m',
        refreshExpiry: '7d'
    },
    cors: {
        origin: process.env.CORS_ORIGINS!.split(',')
    },
    body: {
        limit: '50mb'
    },
    db: {
        url: process.env.MONGO_URL!
    }
};
```

### 6.2 Config Loader

```typescript
// src/config/index.ts
export interface AppConfig {
    port: number;
    jwt: {
        secret: string;
        accessExpiry: string;
        refreshExpiry: string;
    };
    cors: {
        origin: string[] | true;
    };
    body: {
        limit: string | number;
    };
    db: {
        url: string;
    };
}

export const load_config = async (config_dir: string): Promise<AppConfig> => {
    const env = process.env.NODE_ENV || 'dev';
    const config_path = `${config_dir}/${env}.ts`;
    const module = await import(config_path);
    return module.default as AppConfig;
};
```

---

## 7. Server Composition Example

```typescript
// server/main.ts
import { Elysia } from 'elysia';
import { plugins, meta, db, errors } from 'hola-server';
import { load_config } from './config/index.js';
import { userRouter } from './router/user.js';
import { orderRouter } from './router/order.js';

const config = await load_config(__dirname + '/config');

const app = new Elysia()
    // Plugins
    .use(plugins.holaCors(config.cors))
    .use(plugins.holaBody(config.body))
    .use(plugins.holaAuth(config.jwt))
    .use(plugins.holaError())
    
    // Routers
    .use(userRouter)
    .use(orderRouter)
    
    // Lifecycle
    .onStart(async () => {
        await db.connect(config.db.url);
        meta.validate_all_metas();
        console.log('✓ Server ready');
    })
    
    .listen(config.port);

console.log(`🚀 Server running on http://localhost:${config.port}`);
```

---

## 8. JWT Login/Refresh Endpoints

```typescript
// server/router/auth.ts
import { Elysia, t } from 'elysia';
import { db, errors } from 'hola-server';

export const authRouter = new Elysia({ prefix: '/auth' })
    .post('/login', async ({ body, accessJwt, refreshJwt, cookie, headers }) => {
        const user = await db.Entity.findOne('user', { 
            email: body.email, 
            password: encrypt_pwd(body.password) 
        });
        
        if (!user) throw new errors.AuthError('invalid credentials');
        
        const payload = { sub: user._id, role: user.role };
        const access_token = await accessJwt.sign(payload);
        const refresh_token = await refreshJwt.sign(payload);
        
        // Hybrid delivery: set cookies AND return in body
        const is_browser = headers['user-agent']?.includes('Mozilla');
        
        if (is_browser) {
            cookie.access_token.set({ value: access_token, httpOnly: true, secure: true });
            cookie.refresh_token.set({ value: refresh_token, httpOnly: true, secure: true });
        }
        
        return { 
            code: 'SUCCESS',
            access_token,
            refresh_token,
            expires_in: 900 // 15 minutes
        };
    }, {
        body: t.Object({
            email: t.String({ format: 'email' }),
            password: t.String({ minLength: 1 })
        })
    })
    
    .post('/refresh', async ({ body, cookie, refreshJwt, accessJwt, headers }) => {
        const token = body.refresh_token ?? cookie.refresh_token?.value;
        if (!token) throw new errors.AuthError('refresh token required');
        
        const payload = await refreshJwt.verify(token);
        if (!payload) throw new errors.TokenExpiredError();
        
        const access_token = await accessJwt.sign({ 
            sub: payload.sub, 
            role: payload.role 
        });
        
        const is_browser = headers['user-agent']?.includes('Mozilla');
        if (is_browser) {
            cookie.access_token.set({ value: access_token, httpOnly: true, secure: true });
        }
        
        return { 
            code: 'SUCCESS',
            access_token,
            expires_in: 900
        };
    }, {
        body: t.Object({
            refresh_token: t.Optional(t.String())
        })
    })
    
    .post('/logout', async ({ cookie }) => {
        cookie.access_token.remove();
        cookie.refresh_token.remove();
        return { code: 'SUCCESS' };
    });
```

---

## 9. Migration Path

### Phase 1: Core Infrastructure
1. Create `src/plugins/` directory with new plugins
2. Create `src/errors/` directory with error classes
3. Create `src/config/` with config loader
4. Update `src/index.ts` for namespaced exports

### Phase 2: Meta System
1. Create `src/meta/schema.ts` for TypeBox generation
2. Refactor `src/meta/router.ts` for RESTful routes
3. Update Entity methods if needed

### Phase 3: Remove Legacy
1. Remove `src/http/server.ts` (replaced by plugin composition)
2. Remove `src/http/session.ts` (replaced by JWT)
3. Remove `src/http/context.ts` (replaced by Elysia derive)
4. Update all existing router files

### Phase 4: Documentation
1. Update `skills/express.md` → `skills/elysia.md`
2. Add migration guide for users
3. Update README

---

## 10. Backward Compatibility Notes

> [!WARNING]
> This redesign introduces **breaking changes**. Client applications must be updated:

1. **Route changes**: All CRUD routes change from POST-based to RESTful
2. **Authentication**: Session cookies replaced with JWT tokens
3. **Import paths**: Change from flat imports to namespaced

### Client Migration Example

```typescript
// Before
await fetch('/api/user/create', { method: 'POST', body: data });
await fetch('/api/user/list', { method: 'POST', body: query });

// After
await fetch('/user', { method: 'POST', body: data });
await fetch('/user', { method: 'GET' });
await fetch('/user/123', { method: 'GET' });
```

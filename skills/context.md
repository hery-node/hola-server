# HTTP Context Utilities (Removed)

> **⚠️ REMOVED**: This module (`hola-server/http/context`) has been removed. Use Elysia's native Context object instead.

## Migration Guide

### Old Way (Removed)

```javascript
// ❌ This no longer exists
const { set_context_value, get_context_value } = require("hola-server/http/context");
set_context_value("user", user);
const user = get_context_value("user");
```

### New Way (Elysia Context)

Use the Context object passed to every Elysia handler:

```typescript
import { Elysia } from 'elysia';
import { plugins } from 'hola-server';

const app = new Elysia()
    .use(plugins.holaAuth({ secret: '...' }))
    .get('/profile', ({ user, store }) => {
        // 'user' is available if using holaAuth plugin
        console.log(user); 
        
        // Use 'store' for global mutable state
        return { user };
    });
```

## Key Differences

| Old (AsyncLocalStorage) | New (Elysia Context) |
|-------------------------|----------------------|
| `set_context_value("user", user)` | Derived via `plugins.holaAuth()` |
| `get_context_value("user")` | Destructure from handler: `({ user })` |
| `get_context_value("req")` | Full context available: `(ctx)` |
| Implicit, magic | Explicit, type-safe |

## See Also

- [Elysia Context Documentation](https://elysiajs.com/concept/context.html)
- [hola-server Elysia Plugin Guide](./elysia.md)

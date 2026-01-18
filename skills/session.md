# Auth & Session Management Skill

## Overview

Hola Server uses a **hybrid JWT authentication system** via the `holaAuth` plugin. It supports both bearer tokens (for API clients) and HTTP-only cookies (for browser sessions).

## Accessing User Session

The authenticated user is automatically derived and attached to the Elysia context as `user`.

```typescript
// Define router
app.get('/profile', ({ user, set }) => {
    if (!user) {
        set.status = 401;
        return { error: 'Not authenticated' };
    }
    
    return {
        id: user.sub,
        role: user.role,
        groups: user.groups
    };
});
```

### User Object Structure

The `user` object (JWT Payload) typically contains:

```typescript
interface JwtPayload {
    sub: string;       // User ID (Subject)
    role?: string;     // User Role (e.g., 'admin', 'user')
    groups?: string[]; // Group memberships
    iat?: number;      // Issued At (timestamp)
    exp?: number;      // Expiry (timestamp)
}
```

## Authentication Plugin Usage

See `elysia.md` for full plugin configuration.

```typescript
import { plugins } from 'hola-server';

app.use(plugins.holaAuth({
    secret: process.env.JWT_SECRET!,
    accessExpiry: '15m',
    refreshExpiry: '7d'
}));
```

## Security Best Practices

1.  **Always Check User**: The `user` object is `null` if the user is not authenticated (unless using a guard).
2.  **Role Checks**: Verify `user.role` for privileged actions.
3.  **Ownership Checks**: When accessing resources, verify `user.sub` matches the resource owner.

```typescript
// Example: Ownership Check
app.put('/documents/:id', async ({ user, params, set }) => {
    const doc = await db.documents.findOne({ _id: params.id });
    
    if (!doc) {
        set.status = 404;
        return;
    }
    
    // Check if user owns the document
    if (doc.owner_id !== user.sub && user.role !== 'admin') {
        set.status = 403;
        return { error: 'Forbidden' };
    }
    
    // Proceed with update
});
```

## Login/Logout Logic

The `holaAuthRoutes` plugin provides standard endpoints:

-   `POST /auth/refresh`: Refreshes access token using refresh token.
-   `POST /auth/logout`: Clears authentication cookies.

To implement **Login**:

```typescript
app.post('/login', async ({ body, jwt, cookie, set }) => {
    // 1. Validate credentials against DB
    const user = await validate_credentials(body.username, body.password);
    
    if (!user) {
        set.status = 401;
        return { error: 'Invalid credentials' };
    }
    
    // 2. Generate Tokens
    // (Note: This manual signing is handled by holaAuthRoutes for refresh, 
    // but for initial login you might need to sign manually or standard auth flow)
    
    // Recommended: Use your own login handler that signs the JWT
    // utilizing the configured JWT plugin instance if accessible, 
    // or just use @elysiajs/jwt directly as shown in hola-server source.
});
```


# Session Management Skill

## Overview

The `hola-server/http/session.js` module provides session management utilities using `express-session` with MongoDB storage. It includes helpers for accessing session data and checking ownership permissions.

## Importing

```javascript
const { 
    init_session, 
    get_session_user_id, 
    get_session_user_groups, 
    is_owner 
} = require("hola-server/http/session");
```

## API Reference

### 1. Session Initialization

#### `init_session(app)`
Initializes session middleware with MongoDB storage.

**Called automatically** by `init_express_server()`. You typically don't call this directly.

**Configuration:**
```javascript
// settings.json
{
    "server": {
        "keep_session": true,
        "session": {
            "secret": "your-secret-key-change-in-production",
            "cookie_max_age": 86400000  // 24 hours in ms
        }
    },
    "mongo": {
        "url": "mongodb://localhost:27017/mydb"
    }
}
```

### 2. Session Access

#### `get_session_user_id(req)`
Gets the current user ID from session.

**Returns:** `string|null` - User ID or null if not logged in

```javascript
const user_id = get_session_user_id(req);
if (!user_id) {
    return res.status(401).json({ error: "Not authenticated" });
}
```

#### `get_session_user_groups(req)`
Gets the current user's group IDs from session.

**Returns:** `string[]|null` - Array of group IDs or null

```javascript
const groups = get_session_user_groups(req);
if (!groups || !groups.includes("admin")) {
    return res.status(403).json({ error: "Admin access required" });
}
```

### 3. Ownership Checking

#### `is_owner(req, meta, entity, query)`
Checks if the current user owns the entity being accessed.

**Parameters:**
- `req` (Object): Express request
- `meta` (Object): Entity meta definition
- `entity` (Entity): Entity instance
- `query` (Object): MongoDB query for the entity

**Returns:** `Promise<boolean>` - True if user is owner or root user

```javascript
const can_access = await is_owner(req, meta, entity, { _id: req.params.id });
if (!can_access) {
    return res.status(403).json({ error: "Not authorized" });
}
```

**Logic:**
1. Returns `true` if user is root (via `is_root_user()`)
2. Returns `true` if meta has no `user_field` defined
3. Otherwise, checks if entity's `user_field` matches current user ID

## Session Structure

The framework expects sessions to contain:

```javascript
req.session = {
    user: {
        id: "507f1f77bcf86cd799439011",  // User ObjectId
        name: "John Doe",
        role: "admin",
        // ... other user fields
    },
    group: ["group_id_1", "group_id_2"]  // Optional: user's group memberships
};
```

## Usage Patterns

### Pattern 1: Login Flow

```javascript
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    
    // Authenticate user
    const user = await authenticate(username, password);
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Set session
    req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
    };
    
    if (user.groups) {
        req.session.group = user.groups;
    }
    
    return res.json({ code: SUCCESS, user });
});
```

### Pattern 2: Logout

```javascript
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Logout failed" });
        }
        res.json({ code: SUCCESS });
    });
});
```

### Pattern 3: Protected Routes

```javascript
router.get("/profile", async (req, res) => {
    const user_id = get_session_user_id(req);
    if (!user_id) {
        return res.status(401).json({ code: NO_SESSION });
    }
    
    const user = await user_entity.find_one({ _id: user_id }, {});
    return res.json({ code: SUCCESS, data: user });
});
```

### Pattern 4: Ownership-Based Access

```javascript
// Meta definition with ownership
const meta = {
    collection: "document",
    user_field: "owner_id",  // Links document to user
    fields: [
        { name: "title", type: "string" },
        { name: "owner_id", type: "ref", ref: "user" }
    ]
};

// Route using ownership check
router.delete("/:id", async (req, res) => {
    const query = { _id: req.params.id };
    const entity = new Entity(meta);
    
    if (!await is_owner(req, meta, entity, query)) {
        return res.status(403).json({ error: "Not authorized to delete this document" });
    }
    
    const result = await entity.delete_entity([req.params.id]);
    return res.json(result);
});
```

### Pattern 5: Group-Based Access

```javascript
router.post("/admin/action", async (req, res) => {
    const groups = get_session_user_groups(req);
    
    if (!groups || !groups.includes("admin")) {
        return res.status(403).json({ error: "Admin access required" });
    }
    
    // Perform admin action
    await perform_admin_action(req.body);
    return res.json({ code: SUCCESS });
});
```

### Pattern 6: Auto-Set Owner on Create

```javascript
router.post("/document", async (req, res) => {
    const user_id = get_session_user_id(req);
    if (!user_id) {
        return res.status(401).json({ code: NO_SESSION });
    }
    
    // Automatically set owner
    req.body.owner_id = user_id;
    
    const result = await entity.create_entity(req.body, "*");
    return res.json(result);
});
```

## Session Storage

Sessions are stored in MongoDB via `connect-mongo`:
- Collection: `sessions` (created automatically)
- Expires: Based on `cookie_max_age` setting
- Cleanup: Automatic (expired sessions removed by MongoDB TTL)

## Best Practices

1. **Always validate session**: Check `get_session_user_id()` in protected routes.

2. **Use secure secrets**: Never commit session secret to version control.
```javascript
// Good: from environment
"secret": process.env.SESSION_SECRET

// Bad: hardcoded
"secret": "my-secret-123"
```

3. **Set appropriate cookie age**: Balance security vs. user convenience.
```javascript
"cookie_max_age": 3600000   // 1 hour for high-security
"cookie_max_age": 604800000 // 7 days for convenience
```

4. **Use HTTPS in production**: Session cookies should use `secure` flag.

5. **Implement ownership where applicable**: Use `user_field` in meta for user-owned data.

## Security Considerations

- **Session fixation**: Express-session regenerates session ID on login
- **XSS protection**: Don't expose session data to client-side JavaScript
- **CSRF**: Consider adding CSRF tokens for state-changing operations
- **Session hijacking**: Use HTTPS and secure cookies in production

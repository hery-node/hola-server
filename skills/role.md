# Role & Permission Utilities Skill

## Overview

The `hola-server/core/role.js` module provides utilities for checking user roles and permissions.

## Importing

```typescript
import { 
    is_root_role, is_root_user, 
    validate_meta_role, check_user_role, 
    get_user_role_right, get_session_user 
} from "hola-server/core/role";
```

## API Reference

### 1. Role Validation

#### `validate_meta_role(role_name)`
Checks if a role name exists in the system settings.
- **param**: `role_name` (string)
- **returns**: `boolean`

#### `is_root_role(role_name)`
Checks if a specific role has root privileges (based on settings).
- **returns**: `boolean`

### 2. User & Session Checks

#### `get_session_user(cookie)`
Extracts user object from session cookie (if using internal session store).
> **Note**: In most cases, prefer using `ctx.user` from the Auth plugin.
- **param**: `cookie` (Object) - Cookie object (typically `ctx.cookie` or similar structure).
- **returns**: `Object|null`

#### `is_root_user(cookie)`
Checks if the current session user has root privileges.
- **param**: `cookie` (Object)
- **returns**: `boolean`

### 3. Permission Checking

#### `get_user_role_right(cookie, meta)`
Resolves the current user's permissions for a specific entity based on their role.
- **param**: `cookie` (Object)
- **param**: `meta` (Object) - Entity meta definition.
- **returns**: `[mode, view]` - Tuple of allowed modes (e.g., "crud") and view ID.

#### `check_user_role(cookie, meta, mode, view)`
Verifies if the current user has specific access rights.
- **param**: `cookie` (Object)
- **param**: `mode` (string) - Required operation mode (c/r/u/d).
- **param**: `view` (string) - Required view access.
- **returns**: `boolean` - True if permitted.

```javascript
if (check_user_role(ctx.cookie, productMeta, 'c', '*')) {
    // User can create products
}
```


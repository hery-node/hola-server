# Express Server Initialization Skill

## Overview

The `hola-server/http/express.js` module provides the main entry point for initializing an Express server with all Hola framework middleware and configurations.

## Importing

```javascript
const { init_express_server } = require("hola-server/http/express");
```

## API Reference

### `init_express_server(base_dir, port_attr, callback)`

Initializes and starts an Express server with the Hola framework stack.

**Parameters:**
- `base_dir` (string): Base directory containing router files (e.g., `__dirname + "/router"`)
- `port_attr` (string): Property name in settings.server for the port (e.g., `"port"` or `"api_port"`)
- `callback` (Function, optional): Async function called after server starts

**Returns:** Express app instance

**Throws:** Error if server settings are invalid or port not found

## Initialization Flow

When you call `init_express_server()`, the following happens in order:

1. **CORS Configuration**: `init_cors()` - Sets up cross-origin resource sharing
2. **Body Parser**: Configures JSON and URL-encoded body parsing with optional size limits
3. **Session**: `init_session()` - Sets up session middleware with MongoDB store
4. **Authentication**: Creates middleware to check session and excluded URLs
5. **Context**: Sets up AsyncLocalStorage for request context
6. **Routers**: `init_router_dirs()` - Auto-loads all router files from base directory
7. **Error Handling**: `handle_exception()` - Sets up global error handler
8. **Server Start**: Listens on specified port and invokes callback

## Basic Usage

```javascript
const { init_express_server } = require("hola-server/http/express");

// Start server on port from settings.server.port
init_express_server(__dirname + "/router", "port", async () => {
    console.log("Server started successfully");
});
```

## Configuration

The server relies on settings from `get_settings()`. Required settings structure:

```javascript
// settings.json
{
    "server": {
        "port": 3000,
        "check_user": true,  // Enable authentication
        "exclude_urls": [     // URLs to skip auth
            "/api/login",
            "/api/register",
            "/public/.*"
        ],
        "threshold": {
            "body_limit": "10mb"  // Optional body size limit
        },
        "keep_session": true,
        "session": {
            "secret": "your-secret-key",
            "cookie_max_age": 86400000  // 24 hours
        }
    },
    "mongo": {
        "url": "mongodb://localhost:27017/mydb"
    }
}
```

## Advanced Usage

### Multiple Servers (API + Admin)

```javascript
// Start API server
init_express_server(__dirname + "/api_router", "api_port", async () => {
    console.log("API server started on port from settings.server.api_port");
});

// Start admin server
init_express_server(__dirname + "/admin_router", "admin_port", async () => {
    console.log("Admin server started on port from settings.server.admin_port");
});
```

### With Database Connection

```javascript
const { init_express_server } = require("hola-server/http/express");
const { connect_db } = require("hola-server/db/db");

init_express_server(__dirname + "/router", "port", async () => {
    await connect_db();
    console.log("Server and database ready");
});
```

### With Custom Initialization

```javascript
init_express_server(__dirname + "/router", "port", async () => {
    // Connect to database
    await connect_db();
    
    // Load initial data
    await seed_database();
    
    // Start background jobs
    start_cron_jobs();
    
    console.log("Application fully initialized");
});
```

## Authentication Configuration

### Enable Authentication

```javascript
// settings.json
{
    "server": {
        "check_user": true
    }
}
```

When `check_user` is true:
- All requests require valid session with user
- Returns `{ code: NO_SESSION, err: "authentication required" }` if no session
- Excluded URLs bypass this check

### Exclude URLs from Authentication

```javascript
{
    "server": {
        "check_user": true,
        "exclude_urls": [
            "/api/login",
            "/api/register", 
            "/api/public/.*",   // Regex pattern
            "/health"
        ]
    }
}
```

Patterns are tested as case-insensitive regular expressions against `req.originalUrl`.

## Body Size Limits

```javascript
{
    "server": {
        "threshold": {
            "body_limit": "50mb"  // For file uploads
        }
    }
}
```

If not specified, uses Express defaults (100kb for JSON).

## Session Configuration

### Enable Sessions

```javascript
{
    "server": {
        "keep_session": true,
        "session": {
            "secret": "change-this-in-production",
            "cookie_max_age": 86400000  // 1 day in milliseconds
        }
    }
}
```

### Disable Sessions

```javascript
{
    "server": {
        "keep_session": false  // Or omit keep_session
    }
}
```

## Complete Example

```javascript
// server/main.js
const { init_express_server } = require("hola-server/http/express");
const { connect_db } = require("hola-server/db/db");
const { validate_all_metas } = require("hola-server/core/meta");

init_express_server(__dirname + "/router", "port", async () => {
    try {
        // Connect to MongoDB
        await connect_db();
        console.log("✓ Database connected");
        
        // Validate all entity meta definitions
        validate_all_metas();
        console.log("✓ All meta definitions validated");
        
        console.log("✓ Server ready on port", process.env.PORT || 3000);
    } catch (error) {
        console.error("Server initialization failed:", error);
        process.exit(1);
    }
});
```

## Error Handling

The server automatically handles:
- Invalid settings (throws error before starting)
- Missing port configuration (throws error)
- Duplicate initialization (returns existing app instance)
- Unhandled route errors (via `handle_exception`)

## Best Practices

1. **Call once per server**: `init_express_server()` should be called once per port/app instance.

2. **Use callback for initialization**: Put database connections and setup in the callback.

3. **Validate early**: Run meta validation in the callback before accepting requests.

4. **Environment-specific configs**: Use different settings files for dev/prod.

5. **Graceful shutdown**: Handle `SIGTERM` and `SIGINT` to close connections properly.

```javascript
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    // Close database connections, etc.
    process.exit(0);
});
```

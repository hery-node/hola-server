# HTTP Context Utilities Skill

## Overview

The `hola-server/http/context.js` module provides request-scoped context storage using Node.js `AsyncLocalStorage`. This allows you to store and retrieve values that are tied to the current HTTP request without explicitly passing them through function parameters.

## Importing

```javascript
const { set_context_value, get_context_value } = require("hola-server/http/context");
```

## API Reference

### `set_context_value(key, obj)`
Stores a value in the current request context.

**Parameters:**
- `key` (string): Context key
- `obj` (*): Value to store

```javascript
set_context_value("user_id", "507f1f77bcf86cd799439011");
set_context_value("request_start", Date.now());
```

### `get_context_value(key)`
Retrieves a value from the current request context.

**Parameters:**
- `key` (string): Context key

**Returns:** `*` - Stored value or `null` if not found

```javascript
const user_id = get_context_value("user_id");
const start_time = get_context_value("request_start");
```

## How It Works

The Hola framework automatically initializes AsyncLocalStorage context for each request in the authentication middleware (`http/express.js`). The request object is automatically stored with key `"req"`.

```javascript
// Happens automatically in express.js
asyncLocalStorage.run({}, () => {
    set_context_value("req", req);
    next();
});
```

## Usage Patterns

### Pattern 1: Accessing Request from Deep Functions

Instead of passing `req` through multiple function levels:

```javascript
// Without context (verbose):
async function process_order(req, order_data) {
    const user_id = get_session_user_id(req);
    await create_audit_log(req, "order_created", order_data);
}

async function create_audit_log(req, action, data) {
    const user_id = get_session_user_id(req);
    // ...
}

// With context (clean):
const { get_context_value } = require("hola-server/http/context");

async function process_order(order_data) {
    const req = get_context_value("req");
    const user_id = get_session_user_id(req);
    await create_audit_log("order_created", order_data);
}

async function create_audit_log(action, data) {
    const req = get_context_value("req");
    const user_id = get_session_user_id(req);
    // ...
}
```

### Pattern 2: Request Timing

```javascript
// Middleware to track request duration
app.use((req, res, next) => {
    set_context_value("request_start", Date.now());
    next();
});

// Later in response
router.get("/api/data", async (req, res) => {
    const data = await fetch_data();
    
    const start = get_context_value("request_start");
    const duration = Date.now() - start;
    
    console.log(`Request took ${duration}ms`);
    return res.json(data);
});
```

### Pattern 3: Storing Computed Values

```javascript
// Middleware that resolves user once
app.use(async (req, res, next) => {
    const user_id = get_session_user_id(req);
    if (user_id) {
        const user = await user_entity.find_one({ _id: user_id }, {});
        set_context_value("current_user", user);
    }
    next();
});

// Access anywhere without re-fetching
router.post("/api/order", async (req, res) => {
    const user = get_context_value("current_user");
    const order = await create_order(req.body, user);
    return res.json(order);
});
```

### Pattern 4: Custom Logging Context

```javascript
// Set trace ID for request
app.use((req, res, next) => {
    const trace_id = generate_trace_id();
    set_context_value("trace_id", trace_id);
    next();
});

// Use in logging
function log_info(message, data) {
    const trace_id = get_context_value("trace_id");
    console.log(`[${trace_id}] ${message}`, data);
}

// Anywhere in the request lifecycle
router.get("/api/process", async (req, res) => {
    log_info("Processing started");  // Automatically includes trace_id
    // ...
});
```

## Best Practices

1. **Use for cross-cutting concerns**: Context is ideal for request ID, user info, timing, etc.

2. **Don't overuse**: For values only needed in 1-2 places, pass them directly.

3. **Clear naming**: Use descriptive keys like `"current_user"` not `"u"`.

4. **Document context keys**: If your app uses many context values, document them.

```javascript
// Good: centralized context keys
const CONTEXT_KEYS = {
    REQUEST: "req",
    USER: "current_user",
    TRACE_ID: "trace_id",
    REQUEST_START: "request_start"
};

set_context_value(CONTEXT_KEYS.TRACE_ID, trace_id);
const user = get_context_value(CONTEXT_KEYS.USER);
```

## Limitations

- **Only works in request context**: Cannot use in background jobs, timers, or event handlers unless they originated from a request.
- **Async boundaries**: Works correctly with `async/await` and Promises, but not with callbacks or event emitters.

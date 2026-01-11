# HTTP Parameter Utilities Skill

## Overview

The `hola-server/http/params.js` module provides utilities for extracting and validating parameters from Express request objects (query strings and body).

## Importing

```javascript
const { 
    get_params, post_params, post_update_params,
    required_get_params, required_post_params, required_params
} = require("hola-server/http/params");
```

## API Reference

### 1. Extract Query Parameters

#### `get_params(req, params)`
Extracts specified parameters from `req.query` (only values that are present).

**Parameters:**
- `req` (Object): Express request object
- `params` (string[]): Parameter names to extract

**Returns:** `Object` - Extracted parameters

```javascript
// URL: /api/products?name=iPhone&price=999&stock=50

const params = get_params(req, ["name", "price", "category"]);
// Returns: { name: "iPhone", price: "999" }
// Note: "category" is omitted (not present in query)
```

### 2. Extract Body Parameters

#### `post_params(req, params)`
Extracts specified parameters from `req.body` (only non-empty values).

```javascript
const params = post_params(req, ["name", "email", "age"]);
// Returns only fields that have values
```

#### `post_update_params(req, params)`
Extracts update parameters, **including `null` and empty strings** (but excluding `undefined`).

**Use Case:** Partial updates where empty string means "clear field" and undefined means "no change".

```javascript
// Body: { name: "John", email: "", age: undefined }

const params = post_update_params(req, ["name", "email", "age"]);
// Returns: { name: "John", email: "" }
// Note: "age" is omitted (undefined), "email" is included (empty string is valid)
```

### 3. Required Parameters

#### `required_get_params(req, params)`
Extracts required query parameters. Returns `null` if any are missing.

```javascript
const params = required_get_params(req, ["page", "limit"]);
if (!params) {
    return res.status(400).json({ error: "Missing required query params" });
}
// params contains both page and limit, or null
```

#### `required_post_params(req, params)`
Extracts required body parameters. Returns `null` if any are missing.

```javascript
const params = required_post_params(req, ["username", "password"]);
if (!params) {
    return res.status(400).json({ error: "Missing credentials" });
}
```

#### `required_params(input, params)`
General-purpose required parameter extraction from any object.

```javascript
const params = required_params(req.body, ["name", "email"]);
if (!params) {
    return res.json({ code: NO_PARAMS, err: ["name", "email"] });
}
```

## Usage Patterns

### Pattern 1: Optional Query Parameters

```javascript
router.get("/search", async (req, res) => {
    const search = get_params(req, ["name", "category", "min_price", "max_price"]);
    
    const results = await entity.list_entity(
        { attr_names: "name,price,category", page: 1, limit: 20, sort_by: "price", desc: "false" },
        {},
        search,  // Only includes parameters that were provided
        "*"
    );
    
    return res.json(results);
});
```

### Pattern 2: Required Body Parameters

```javascript
router.post("/login", async (req, res) => {
    const credentials = required_post_params(req, ["username", "password"]);
    
    if (!credentials) {
        return res.status(400).json({ 
            code: NO_PARAMS, 
            err: ["username", "password"] 
        });
    }
    
    // Proceed with authentication
    const user = await authenticate(credentials.username, credentials.password);
    return res.json({ code: SUCCESS, user });
});
```

### Pattern 3: Partial Updates

```javascript
router.put("/:id", async (req, res) => {
    // Use post_update_params to allow clearing fields with empty strings
    const updates = post_update_params(req, ["name", "description", "email", "phone"]);
    
    const result = await entity.update_entity(req.params.id, updates, "*");
    return res.json(result);
});
```

### Pattern 4: Pagination Parameters

```javascript
router.get("/list", async (req, res) => {
    const query_params = get_params(req, ["page", "limit", "sort_by", "desc"]);
    
    // Provide defaults
    query_params.page = query_params.page || 1;
    query_params.limit = query_params.limit || 20;
    query_params.sort_by = query_params.sort_by || "created_at";
    query_params.desc = query_params.desc || "true";
    query_params.attr_names = "name,price,created_at";
    
    const result = await entity.list_entity(query_params, {}, {}, "*");
    return res.json(result);
});
```

### Pattern 5: Combining Query and Body

```javascript
router.post("/filter", async (req, res) => {
    // Extract pagination from query
    const pagination = required_get_params(req, ["page", "limit"]);
    if (!pagination) {
        return res.status(400).json({ error: "Missing pagination params" });
    }
    
    // Extract filter from body
    const filters = post_params(req, ["category", "min_price", "max_price", "brand"]);
    
    const results = await entity.list_entity(
        { ...pagination, attr_names: "name,price", sort_by: "price", desc: "false" },
        {},
        filters,
        "*"
    );
    
    return res.json(results);
});
```

## Best Practices

1. **Use `required_*` functions for validation**: They return `null` if parameters are missing, making validation simple.

2. **Use `post_update_params` for PATCH/PUT**: Distinguishes between "clear field" (empty string) and "no change" (undefined).

3. **Provide defaults for optional params**: After extracting with `get_params` or `post_params`, apply defaults as needed.

4. **Whitelist parameters**: Always specify exact parameter names to avoid exposing internal fields.

```javascript
// Good: explicit whitelist
const params = post_params(req, ["name", "email", "age"]);

// Avoid: accepting all body params
const params = req.body;  // Could include malicious/internal fields
```

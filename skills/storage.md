# Storage System Skill

## Overview

The Hola framework provides a comprehensive dual storage system built on MongoDB:

1. **Entity System** (`hola-server/db/entity.js`): High-level, metadata-driven document storage with automatic validation, type conversion, reference resolution, and lifecycle hooks.
2. **GridFS System** (`hola-server/db/gridfs.js`): Large file storage for handling binary content like images, documents, and media files.

Both systems integrate seamlessly to provide complete data persistence for Hola applications.

---

## 1. Entity System

### 1.1 Overview

The `Entity` class provides a meta-driven abstraction layer over MongoDB collections. It automatically handles:

- **Type Conversion**: Converts field values based on meta type definitions
- **Validation**: Required fields, type validation, reference validation
- **Reference Resolution**: Converts between user-friendly labels and database IDs
- **Link Population**: Auto-fetches related data from referenced entities
- **Lifecycle Hooks**: Custom logic at key points (before/after create, update, delete)
- **Cascade Operations**: Automatic cleanup of related records

### 1.2 Import

```javascript
import { Entity } from "hola-server";
```

### 1.3 Constructor

> **Note:** Throughout this documentation, we use hypothetical entities like "product", "user", and "category" for illustrative purposes. Replace these with your actual entity collection names defined in your meta definitions.

```javascript
// Method 1: Create from meta object
const meta = get_entity_meta("your_entity_name");
const entity = new Entity(meta);

// Method 2: Create from collection name (recommended)
const entity = new Entity("your_entity_name");

// Example with hypothetical "product" entity
const productEntity = new Entity("product");
```

---

## 2. Entity CRUD Operations

### 2.1 Create Entity

**Method:** `create_entity(param_obj, view)`

Creates a new document with full validation and hooks.

**Parameters:**

- `param_obj` (Object): Entity data from client
- `view` (string): View filter (typically `"*"` for all fields)

**Returns:** `{code, err?}`

**Process Flow:**

1. Filter fields by view
2. Convert types using `convert_type()`
3. Run `before_create` hook
4. Validate required fields
5. Check for duplicate primary keys
6. Validate reference fields
7. Run `create` hook or insert document
8. Run `after_create` hook

**Example:**

```javascript
const productEntity = new Entity("product");

const result = await productEntity.create_entity(
  {
    name: "iPhone 15",
    price: 999.99,
    category: "Electronics", // Will be resolved to category ObjectId
    stock: 50,
  },
  "*",
);

if (result.code === SUCCESS) {
  console.log("Product created successfully");
} else {
  console.error("Creation failed:", result.err);
}
```

**Common Error Codes:**

- `NO_PARAMS`: Missing required fields
- `INVALID_PARAMS`: Type conversion failed
- `DUPLICATE_UNIQUE`: Unique field value already exists
- `REF_NOT_FOUND`: Referenced entity doesn't exist
- `REF_NOT_UNIQUE`: Multiple entities match reference label

---

### 2.2 Read Entity

**Method:** `read_entity(_id, attr_names, view)`

Reads a single document with automatic reference and link resolution.

**Parameters:**

- `_id` (string): Entity ObjectId
- `attr_names` (string): Comma-separated field names to fetch
- `view` (string): View filter

**Returns:** `{code, data?, err?}`

**Process Flow:**

1. Validate \_id parameter
2. Filter property fields by view
3. Extract requested attributes, ref fields, and link fields
4. Find document
5. Run `after_read` hook
6. Populate link fields from referenced entities
7. Convert ref ObjectIds to ref_labels

**Example:**

```javascript
const result = await productEntity.read_entity("507f1f77bcf86cd799439011", "name,price,category,category_code", "*");

if (result.code === SUCCESS) {
  console.log(result.data);
  // {
  //   _id: "507f1f77bcf86cd799439011",
  //   name: "iPhone 15",
  //   price: 999.99,
  //   category: "Electronics",      // Converted from ObjectId to label
  //   category_code: "ELEC-001"      // Link field from category entity
  // }
}
```

**Read Property vs Read Entity:**

Use `read_property()` when you don't need reference conversion (faster):

```javascript
const result = await productEntity.read_property("507f1f77bcf86cd799439011", "name,price", "*");
// Returns raw data without ref/link processing
```

---

### 2.3 Update Entity

**Method:** `update_entity(_id, param_obj, view)`

Updates an existing document.

**Parameters:**

- `_id` (string|null): Entity ObjectId, or null to use primary keys from param_obj
- `param_obj` (Object): Update data
- `view` (string): View filter

**Returns:** `{code, err?}`

**Process Flow:**

1. Filter update fields by view
2. Convert types using `convert_update_type()` (preserves empty values)
3. Run `before_update` hook
4. Build query (by \_id or primary keys)
5. Verify entity exists (count must be 1)
6. Validate reference fields
7. Run `update` hook or perform update
8. Run `after_update` hook

**Example:**

```javascript
// Update by ID
const result = await productEntity.update_entity("507f1f77bcf86cd799439011", { price: 899.99, stock: 45 }, "*");

// Update by primary key (if _id is null)
const result2 = await productEntity.update_entity(
  null,
  { sku: "IPHONE-15", price: 899.99 }, // sku is primary key
  "*",
);
```

**Update vs Batch Update:**

For updating multiple entities at once, use `batch_update_entity()`:

```javascript
const ids = ["507f...", "608a...", "709b..."];
await productEntity.batch_update_entity(ids, { discount: 0.1 }, "*");
```

---

### 2.4 Delete Entity

**Method:** `delete_entity(id_array)`

Deletes one or more documents with reference checking and cascade delete.

**Parameters:**

- `id_array` (string[]): Array of entity ObjectIds

**Returns:** `{code, err?}`

**Process Flow:**

1. Validate IDs
2. Run `before_delete` hook
3. Check for referring entities (unless delete mode allows it)
4. Run `delete` hook or perform deletion
5. Process cascade deletes for related entities
6. Run `after_delete` hook

**Example:**

```javascript
const result = await productEntity.delete_entity(["507f1f77bcf86cd799439011"]);

if (result.code === HAS_REF) {
  console.error("Cannot delete: referenced by", result.err);
  // e.g., ["product<-order:ORD-001", "product<-cart:CART-123"]
}
```

**Cascade Delete Behavior:**

Configured in field definition:

```javascript
fields: [
  {
    name: "category",
    ref: "category",
    delete: "keep", // Keep products when category is deleted
  },
  {
    name: "created_by",
    ref: "user",
    delete: "cascade", // Delete products when user is deleted
  },
];
```

---

### 2.5 List Entity

**Method:** `list_entity(query_params, query, param_obj, view)`

Lists entities with pagination, sorting, search, and filtering.

**Parameters:**

- `query_params` (Object): Pagination and sorting config
  - `attr_names` (string): Comma-separated fields to fetch
  - `page` (number): Page number (1-indexed)
  - `limit` (number): Results per page
  - `sort_by` (string): Comma-separated sort fields
  - `desc` (string): Comma-separated boolean flags ("true"/"false")
- `query` (Object): Additional MongoDB query filter
- `param_obj` (Object): Search parameters (field values to match)
- `view` (string): View filter

**Returns:** `{code, total, data, err?}`

**Example:**

```javascript
const result = await productEntity.list_entity(
  {
    attr_names: "name,price,category",
    page: 1,
    limit: 20,
    sort_by: "price,created_at",
    desc: "false,true", // price ascending, created_at descending
  },
  { active: true }, // Additional filter
  { category: "Electronics", price: ">=500" }, // Search params
  "*",
);

if (result.code === SUCCESS) {
  console.log(`Total: ${result.total}`);
  console.log(`Page data:`, result.data);
}
```

**Search Query Syntax:**

The `param_obj` supports advanced search operators:

```javascript
{
    price: ">=100",      // Greater than or equal
    price: "<1000",      // Less than
    stock: ">0",         // Greater than
    name: "phone",       // Regex search (case-insensitive)
    category: "A,B,C",   // Multiple values (OR)
    tags: "sale,new"     // Array contains all (for array fields)
}
```

---

### 2.6 Clone Entity

**Method:** `clone_entity(_id, param_obj, view)`

Creates a copy of an existing entity with modifications.

**Parameters:**

- `_id` (string): Source entity ObjectId
- `param_obj` (Object): New entity data (overrides)
- `view` (string): View filter

**Returns:** `{code, err?}`

**Example:**

```javascript
const result = await productEntity.clone_entity("507f1f77bcf86cd799439011", { name: "iPhone 15 Pro", price: 1199.99 }, "*");
// Creates a new product based on the original, with new name and price
```

---

## 3. Direct Database Operations

For low-level operations without validation and hooks:

### 3.1 Basic CRUD

```javascript
// Create (insert)
const doc = await entity.create({ name: "Test", value: 42 });

// Update
const result = await entity.update(
  { name: "Test" }, // query
  { $set: { value: 100 } }, // update
);

// Delete
const result = await entity.delete({ name: "Test" });

// Find multiple
const docs = await entity.find(
  { active: true }, // query
  { name: 1, value: 1 }, // projection
);

// Find one
const doc = await entity.find_one({ _id: oid }, { name: 1 });

// Count
const count = await entity.count({ active: true });
```

### 3.2 Sorting and Pagination

```javascript
// Find with sort
const docs = await entity.find_sort(
  { active: true },
  { created_at: -1 }, // sort descending
  { name: 1, created_at: 1 },
);

// Paginated find
const docs = await entity.find_page(
  { active: true },
  { price: 1 }, // sort
  2, // page (1-indexed)
  20, // limit
  { name: 1, price: 1 },
);
```

### 3.3 Aggregation

```javascript
// Sum field values
const total = await entity.sum({ category: "Electronics" }, "price");
```

### 3.4 Array Operations

```javascript
// Remove from array field
await entity.pull({ _id: oid }, { tags: "deprecated" });

// Add to array field
await entity.push({ _id: oid }, { tags: "featured" });

// Add unique to array field
await entity.add_to_set({ _id: oid }, { tags: "sale" });
```

### 3.5 Bulk Operations

```javascript
const items = [
  { sku: "A001", price: 99 },
  { sku: "A002", price: 149 },
];

await entity.bulk_update(items, ["sku"]);
// Updates documents matching sku, creates if not exists
```

---

## 4. Reference Field Operations

### 4.1 Find by Reference

```javascript
// Find by ObjectId or ref_label
const products = await entity.find_by_ref_value(
  "Electronics", // Can be ObjectId or ref_label value
  { name: 1, price: 1 }, // projection
  "order", // referring entity name (for ref_filter)
);
```

### 4.2 Validate References

```javascript
const param_obj = {
  name: "iPhone",
  category: "Electronics", // Will be converted to ObjectId
};

const result = await entity.validate_ref(param_obj);
if (result.code === SUCCESS) {
  // param_obj.category now contains ObjectId
  console.log(param_obj.category); // "507f1f77bcf86cd799439011"
}
```

### 4.3 Convert References

```javascript
const elements = [
  { _id: "...", name: "Product 1", category: "507f..." },
  { _id: "...", name: "Product 2", category: "608a..." },
];

const ref_fields = [{ name: "category", ref: "category" }];

const converted = await entity.convert_ref_attrs(elements, ref_fields);
// converted[0].category is now "Electronics" instead of ObjectId
```

### 4.4 Get Reference Labels

```javascript
// Get ref_label values for given IDs
const ids = ["507f...", "608a..."];
const labels = await entity.get_ref_labels(ids);
// Returns array of objects with _id and ref_label
```

---

## 5. GridFS File Storage

### 5.1 Overview

GridFS stores files in MongoDB as chunks, suitable for files larger than 16MB BSON size limit. The Hola framework provides a simplified API for file operations.

### 5.2 Import

```javascript
const {
    save_file, read_file, pipe_file, delete_file,
    save_file_fields_to_db, set_file_fields
} from "hola-server";
```

### 5.3 Save File

**Method:** `save_file(collection, filename, filepath)`

Uploads a file to GridFS, replacing any existing file with the same name.

**Parameters:**

- `collection` (string): Bucket name (typically entity collection name)
- `filename` (string): File identifier
- `filepath` (string): Source file path or readable stream

```javascript
await save_file("product", "iphone_image_01", "/tmp/upload_xyz.jpg");
```

### 5.4 Read File

**Method:** `read_file(collection, filename, response)`

Streams a file directly to HTTP response.

**Parameters:**

- `collection` (string): Bucket name
- `filename` (string): File identifier
- `response` (Object): Response object (use `set.headers` for Elysia)

```typescript
// Elysia route
app.get("/files/:collection/:filename", async ({ params, set }) => {
  const stream = await read_file(params.collection, params.filename);
  set.headers["content-type"] = "application/octet-stream";
  return stream;
});
```

### 5.5 Pipe File

**Method:** `pipe_file(collection, filename, dest_path)`

Downloads a file from GridFS to local disk.

```javascript
await pipe_file("product", "iphone_image_01", "./downloads/product_image.jpg");
```

### 5.6 Delete File

**Method:** `delete_file(collection, filename)`

Removes a file from GridFS.

```javascript
await delete_file("product", "iphone_image_01");
```

---

## 6. File Field Integration

### 6.1 Entity with File Fields

Define file fields in meta:

```javascript
fields: [
  { name: "sku", type: "string", required: true },
  { name: "name", type: "string", required: true },
  { name: "image", type: "file" },
  { name: "manual", type: "file" },
];
```

### 6.2 Handling File Uploads

In router create/update handlers:

```javascript
import { db } from "hola-server";
// Use db.set_file_fields(), db.save_file_fields_to_db()

// In create handler
router.post("/", upload.any(), async (req, res) => {
  set_file_fields(meta, req, req.body);

  const result = await entity.create_entity(req.body, "*");
  if (result.code === SUCCESS) {
    await save_file_fields_to_db(collection, meta.file_fields, req, req.body);
  }

  return res.json(result);
});
```

**What happens:**

1. `set_file_fields()` sets field values based on uploaded files (e.g., `"sku_image"`)
2. `save_file_fields_to_db()` moves temp files to GridFS using the field values as filenames

---

## 7. Best Practices

### 7.1 Use High-Level CRUD Methods

Prefer `create_entity()`, `update_entity()`, etc. over direct database operations for:

- Automatic validation
- Type conversion
- Reference resolution
- Lifecycle hooks
- Consistent error handling

### 7.2 Handle Error Codes

Always check the `code` field in results:

```javascript
const result = await entity.create_entity(data, "*");

switch (result.code) {
  case SUCCESS:
    return res.json({ success: true });
  case NO_PARAMS:
    return res.status(400).json({ error: "Missing fields", fields: result.err });
  case DUPLICATE_UNIQUE:
    return res.status(409).json({ error: "Already exists" });
  case REF_NOT_FOUND:
    return res.status(400).json({ error: "Invalid reference", fields: result.err });
  default:
    return res.status(500).json({ error: "Internal error" });
}
```

### 7.3 Use Views for Field Filtering

Define different views for different contexts:

```javascript
// Admin view - all fields
await entity.read_entity(id, "name,price,cost,margin", "admin");

// Public view - limited fields
await entity.read_entity(id, "name,price", "public");
```

### 7.4 Optimize Queries

Use projections to limit returned fields:

```javascript
// Good - only fetch needed fields
const users = await entity.find({ active: true }, { name: 1, email: 1 });

// Avoid - fetches all fields
const users = await entity.find({ active: true }, {});
```

### 7.5 File Storage Patterns

- Use entity primary key as base for file naming
- Clean up files when deleting entities
- Consider file versioning for updates

```javascript
// Good file naming pattern
const filename = `${entity.primary_key}_${field_name}`;
await save_file(collection, filename, filepath);
```

---

## 8. Common Patterns

### 8.1 Create with File Upload

```javascript
router.post("/", upload.any(), async (req, res) => {
  set_file_fields(meta, req, req.body);

  const result = await entity.create_entity(req.body, "*");

  if (result.code === SUCCESS) {
    await save_file_fields_to_db(collection, meta.file_fields, req, req.body);
    return res.json({ code: SUCCESS });
  }

  return res.json(result);
});
```

### 8.2 Update with File Upload

```javascript
router.put("/:id", upload.any(), async (req, res) => {
  set_file_fields(meta, req, req.body);

  const result = await entity.update_entity(req.params.id, req.body, "*");

  if (result.code === SUCCESS) {
    await save_file_fields_to_db(collection, meta.file_fields, req, req.body);
    return res.json({ code: SUCCESS });
  }

  return res.json(result);
});
```

### 8.3 Delete with Cascade

```javascript
router.delete("/", async (req, res) => {
  const ids = req.body.ids; // Array of IDs

  // Delete files first
  for (const id of ids) {
    const item = await entity.find_one(oid_query(id), {});
    for (const field of meta.file_fields) {
      if (item[field.name]) {
        await delete_file(collection, item[field.name]);
      }
    }
  }

  // Then delete entity (will cascade to related entities)
  const result = await entity.delete_entity(ids);
  return res.json(result);
});
```

### 8.4 Search with References

```javascript
// Client sends category name, server resolves to ID
const result = await entity.list_entity(
  {
    attr_names: "name,price,category",
    page: 1,
    limit: 20,
    sort_by: "price",
    desc: "false",
  },
  {},
  { category: "Electronics" }, // Resolved to ObjectId automatically
  "*",
);
```

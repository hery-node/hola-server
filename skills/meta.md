# Meta Class in Hola Meta-Programming Framework

## Overview

The Hola meta-programming model provides a declarative way to define entity schemas with built-in validation, reference management, field organization, and lifecycle hooks.

> **IMPORTANT**: In practice, you **never directly instantiate `EntityMeta`**. Instead, you always use `init_router()` in your router definition, which internally creates the `EntityMeta` instance for you.

> **⚠️ CRITICAL INITIALIZATION ORDER**: If you use custom types in your entity fields, you MUST register them (`register_types()`) **BEFORE** importing router files. Router files call `init_router()` at import time. See [type.md - Step 1.6: Initialization Order](type.md#step-16-initialization-order-in-maints-critical) for details.

**Developer-Facing API:**

```typescript
// ✅ CORRECT - Use init_router in router files
import { init_router } from "hola-server";

export const router = init_router({
  collection: "user",
  primary_keys: ["email"],
  fields: [...],
  // ... meta attributes
});
```

**Internal Implementation (for reference only):**

```typescript
// ❌ DON'T DO THIS - EntityMeta is internal
import { EntityMeta } from "hola-server";
const meta = new EntityMeta({...}); // Don't use directly
```

This document explains the meta attributes and field definitions you provide to `init_router()`.

## Core Principles

### 1. Meta Attributes

When defining entity metadata, **only the following attributes are allowed**:

**Entity-Level Attributes (from `META_ATTRS`):**

- `collection` - Collection name in MongoDB (required)
- `primary_keys` - Array of field names that form the primary key (required)
- `fields` - Array of field definitions (required)
- `roles` - Array of role access control definitions
- `ref_label` - Field name to use as display label when referenced
- `ref_filter` - Filter object for reference queries
- `user_field` - Field name containing user ID for ownership

**Operation Flags:**

- `creatable` - Allow create operations (default: false)
- `readable` - Allow read operations (default: false)
- `updatable` - Allow update operations (default: false)
- `deleteable` - Allow delete operations (default: false)
- `cloneable` - Allow clone operations (default: false)
- `importable` - Allow import operations (default: false)
- `exportable` - Allow export operations (default: false)

**Lifecycle Callbacks:**

- `after_read` - Called after reading entity
- `list_query` - Modify list query
- `before_create` - Called before creating entity
- `before_clone` - Called before cloning entity
- `before_update` - Called before updating entity
- `before_delete` - Called before deleting entity
- `after_create` - Called after creating entity
- `after_clone` - Called after cloning entity
- `after_update` - Called after updating entity
- `after_delete` - Called after deleting entity
- `create` - Custom create handler
- `clone` - Custom clone handler
- `update` - Custom update handler
- `batch_update` - Custom batch update handler
- `after_batch_update` - Called after batch update
- `delete` - Custom delete handler

> **IMPORTANT**: Any attributes outside this list will cause validation errors during meta initialization.

### 2. Field Attributes

Each field definition supports the following attributes:

**Standard Field Attributes (from `FIELD_ATTRS`):**

- `name` - Field name (required)
- `type` - Data type (default: "string")
- `required` - Whether field is required (default: false)
- `default` - Default value for the field (validated against field type)
- `ref` - Reference to another entity (collection name)
  - **One-to-One Reference**: When field type is `"string"` (or omitted, defaulting to `"string"`), stores a single ObjectId
  - **One-to-Many Reference**: When field type is `"array"`, stores an array of ObjectIds
- `link` - Link to another field in this entity (must be a field of type 'ref')
- `delete` - Deletion behavior for ref fields ("keep" or "cascade")
- `create` - Show in create form (default: true)
- `list` - Show in table list (default: true)
- `search` - Show in search form (default: true)
- `update` - Allow update (default: true)
- `clone` - Include in clone (default: true)
- `sys` - System field (server-side only)
- `secure` - Hidden from client entirely (e.g., password hash)
- `group` - User group sharing control (field name containing group ID)
- `view` - Form view identifier ("\*" for all views, or specific view name)

**Link Field Attributes (from `LINK_FIELD_ATTRS`):**

- `name` - Field name
- `link` - Field to link to
- `list` - Show in list

> **IMPORTANT**: Link fields only support these three attributes. Any other attributes will cause validation errors.

### 3. Deletion Modes

For reference fields, you can specify deletion behavior:

- `"keep"` - Keep this record when referenced entity is deleted
- `"cascade"` - Delete this record when referenced entity is deleted
- `undefined` - No action (default)

```typescript
import { DELETE_MODE } from "hola-server";

// DELETE_MODE.all = ["keep", "cascade"]
// DELETE_MODE.keep = "keep"
// DELETE_MODE.cascade = "cascade"
```

### 4. Role-Based Access Control

Roles are defined in the format: `"role_name:mode"` or `"role_name:mode:view"`

- `role_name` - Must be defined in settings
- `mode` - Access permissions using mode characters:
  - `c` - Create access
  - `r` - Read access (single item)
  - `s` - Read access (search/list)
  - `u` - Update access
  - `d` - Delete access (single item)
  - `b` - Batch delete access
  - `o` - Clone access
  - `i` - Import access
  - `e` - Export access
  - `*` - All modes

**Examples:**

```javascript
roles: [
  "admin:*", // Admin has all permissions
  "editor:crsu", // Editor can create, read, search, update
  "viewer:rs", // Viewer can only read and search
  "moderator:rsdb", // Moderator can read, search, delete
];
```

## EntityMeta Class (Internal Reference)

> **Note**: This section describes the internal `EntityMeta` class for reference purposes. **You should use `init_router()` instead** (see examples below).

The `EntityMeta` class is created internally by `init_router()`. Understanding its structure helps you know what attributes you can pass to `init_router()`.

**What you actually write (in router files):**

```typescript
import { init_router } from "hola-server";

export const router = init_router({
  collection: "user",
  primary_keys: ["email"],
  readable: true,
  creatable: true,
  updatable: true,
  deleteable: true,

  fields: [
    { name: "email", type: "email", required: true },
    { name: "name", type: "string", required: true },
    { name: "age", type: "int" },
  ],
});
```

### Properties

After construction, the `EntityMeta` instance provides these properties:

**Basic Info:**

- `collection` - Collection name
- `primary_keys` - Array of primary key field names
- `roles` - Role definitions
- `user_field` - User ownership field
- `ref_label` - Reference label field
- `ref_filter` - Reference filter object

**Operation Flags:**

- `creatable`, `readable`, `updatable`, `deleteable`, `cloneable`, `importable`, `exportable` - Boolean flags
- `editable` - True if creatable or updatable
- `mode` - String combining allowed operations (e.g., "crsu")

**Field Organization:**

- `fields` - All field definitions (array)
- `fields_map` - Fields indexed by name (object)
- `field_names` - Array of all field names
- `client_fields` - Fields visible to client (excludes sys fields)
- `property_fields` - Fields for display (excludes sys and secure)
- `create_fields` - Fields shown in create form
- `update_fields` - Fields editable in update form
- `search_fields` - Fields shown in search form
- `clone_fields` - Fields included in clone
- `list_fields` - Fields shown in list view
- `primary_key_fields` - Primary key field definitions
- `required_field_names` - Names of required fields
- `file_fields` - Fields of type 'file'
- `upload_fields` - File upload field specs
- `ref_fields` - Fields with ref attribute
- `link_fields` - Fields with link attribute
- `ref_by_metas` - Array of metas that reference this entity

### Methods

#### validate_meta_info()

Validates the entire meta definition. Called automatically after all metas are registered.

```typescript
meta.validate_meta_info();
// Throws Error if validation fails
// Returns true if valid
```

**Validation checks:**

- Collection name is defined
- No unsupported attributes
- Primary keys exist in fields
- Roles are properly formatted
- ref_label and user_field exist in fields
- ref_filter is an object
- All field definitions are valid
- No duplicate field names
- Link fields reference valid ref fields

## Helper Functions

### get_entity_meta(collection)

Get entity meta by collection name.

```typescript
import { get_entity_meta } from "hola-server";

const user_meta = get_entity_meta("user");
console.log(user_meta.collection); // "user"
console.log(user_meta.field_names); // ["email", "name", "age"]
```

### get_all_metas()

Get all registered meta collection names.

```typescript
import { get_all_metas } from "hola-server";

const collections = get_all_metas();
// ["user", "product", "order", ...]
```

### validate_all_metas()

Validate all registered metas. Called after all entity definitions are loaded.

```typescript
import { validate_all_metas } from "hola-server";

validate_all_metas();
// Throws Error if any meta is invalid
```

## Common Use Cases

### Use Case 1: Simple Entity Definition

```typescript
import { init_router } from "hola-server";

export const router = init_router({
  collection: "user",
  primary_keys: ["email"],
  ref_label: "name",

  readable: true,
  creatable: true,
  updatable: true,
  deleteable: true,

  roles: ["admin:*", "user:rs"],

  fields: [
    {
      name: "email",
      type: "email",
      required: true,
    },
    {
      name: "name",
      type: "string",
      required: true,
    },
    {
      name: "age",
      type: "int",
      required: false,
    },
    {
      name: "created_at",
      type: "datetime",
      sys: true,
      create: false,
      update: false,
    },
  ],
});
```

### Use Case 2: Entity with References

```typescript
import { init_router } from "hola-server";

export const router = init_router({
  collection: "task",
  primary_keys: ["title"],
  ref_label: "title",

  readable: true,
  creatable: true,
  updatable: true,
  deleteable: true,

  fields: [
    {
      name: "title",
      type: "string",
      required: true,
    },
    {
      name: "description",
      type: "text",
    },
    {
      name: "assigned_to",
      ref: "user", // References user collection
      delete: "cascade", // Delete task if user is deleted
    },
    {
      name: "assigned_name",
      link: "assigned_to", // Auto-populated from user.name
      list: true,
    },
    {
      name: "status",
      type: "task_status",
      required: true,
      default: 0,
    },
  ],
});
```

### Use Case 3: Reference Relationships (One-to-One vs One-to-Many)

The `ref` attribute supports both one-to-one and one-to-many relationships depending on the field type.

#### One-to-One Reference (Single ObjectId)

When the field type is `"string"` (or omitted, defaulting to `"string"`), and has a `ref` attribute, it stores a single ObjectId reference:

```typescript
import { init_router } from "hola-server";

export const router = init_router({
  collection: "task",
  primary_keys: ["title"],

  fields: [
    {
      name: "title",
      type: "string",
      required: true,
    },
    {
      name: "owner", // No explicit type, defaults to "string"
      ref: "user", // One-to-one: single user reference
      required: true,
      delete: "cascade",
    },
    {
      name: "docker",
      type: "string", // Explicit string type
      ref: "docker", // One-to-one: single docker reference
      required: true,
    },
  ],
});
```

#### One-to-Many Reference (Array of ObjectIds)

When the field type is `"array"` with `ref` attribute, it stores an array of ObjectIds:

```typescript
import { init_router } from "hola-server";

export const router = init_router({
  collection: "exec",
  primary_keys: ["owner", "name", "type"],

  fields: [
    {
      name: "owner", // No explicit type, defaults to "string"
      ref: "user", // One-to-one: single user
      required: true,
      delete: "cascade",
    },
    {
      name: "hosts",
      type: "array",
      ref: "host", // One-to-many: array of hosts
      required: true,
      search: false,
    },
    {
      name: "name",
      type: "string",
      required: true,
    },
    {
      name: "type",
      type: "int",
      required: true,
    },
  ],
});
```

**Key Differences:**

| Aspect         | One-to-One                      | One-to-Many                                     |
| -------------- | ------------------------------- | ----------------------------------------------- |
| **Field Type** | `"string"` (default if omitted) | `"array"`                                       |
| **Stores**     | Single ObjectId                 | Array of ObjectIds                              |
| **Example**    | `{ owner: ObjectId("...") }`    | `{ hosts: [ObjectId("..."), ObjectId("...")] }` |
| **Use Case**   | Single parent, single author    | Multiple assignees, multiple tags               |

### Use Case 4: Link Fields

Link fields automatically populate their values from referenced entities.

```typescript
import { init_router } from "hola-server";

export const router = init_router({
  collection: "order",
  primary_keys: ["order_id"],
  ref_label: "order_id",

  readable: true,
  creatable: true,

  fields: [
    {
      name: "order_id",
      type: "string",
      required: true,
    },
    {
      name: "customer",
      ref: "user",
      delete: "keep", // Keep order if user is deleted
    },
    {
      name: "customer_email",
      link: "customer", // Auto-populated from customer.email
      list: true, // Only name, link, list allowed
    },
  ],
});
```

### Use Case 5: Multiple Form Views

Organize complex entities into different form views.

```typescript
import { init_router } from "hola-server";

export const router = init_router({
  collection: "product",
  primary_keys: ["sku"],
  ref_label: "name",

  creatable: true,
  readable: true,
  updatable: true,

  fields: [
    // Basic view
    {
      name: "sku",
      type: "string",
      required: true,
      view: "basic",
    },
    {
      name: "name",
      type: "string",
      required: true,
      view: "basic",
    },

    // Pricing view
    {
      name: "price",
      type: "decimal",
      view: "pricing",
    },
    {
      name: "cost",
      type: "decimal",
      view: "pricing",
    },

    // Inventory view
    {
      name: "stock",
      type: "int",
      view: "inventory",
    },

    // All views
    {
      name: "category",
      type: "product_category",
      view: "*",
    },
  ],
});
```

### Use Case 6: Lifecycle Callbacks

Add custom logic at various points in the entity lifecycle.

```typescript
import { init_router } from "hola-server";

export const router = init_router({
  collection: "audit_log",
  primary_keys: ["_id"],

  creatable: true,
  readable: true,

  fields: [
    { name: "action", type: "string", required: true },
    { name: "user_id", ref: "user" },
    { name: "timestamp", type: "datetime", sys: true },
  ],

  before_create: async function (param_obj, { user }) {
    // Set timestamp before creating
    param_obj.timestamp = new Date();
    return param_obj;
  },

  after_read: async function (item, { user }) {
    // Mask sensitive data after reading
    if (item.sensitive_data) {
      item.sensitive_data = "***";
    }
    return item;
  },

  list_query: async function (query, { user }) {
    // Filter list by user
    if (user && user.role !== "admin") {
      query.user_id = user.sub;
    }
    return query;
  },

  before_delete: async function (id_array, ctx) {
    // Prevent deletion of critical records
    const critical = await this.find({ _id: { $in: id_array }, critical: true });
    if (critical.length > 0) {
      throw new Error("Cannot delete critical records");
    }
  },
});
```

### Use Case 7: Secure and System Fields

Control field visibility to client and in different operations.

```typescript
import { init_router } from "hola-server";

export const router = init_router({
  collection: "user",
  primary_keys: ["email"],
  ref_label: "name",

  creatable: true,
  readable: true,
  updatable: true,

  fields: [
    {
      name: "email",
      type: "email",
      required: true,
    },
    {
      name: "name",
      type: "string",
      required: true,
    },
    {
      name: "password_hash",
      type: "string",
      secure: true, // Never sent to client
      create: false,
      update: false,
      list: false,
    },
    {
      name: "created_at",
      type: "datetime",
      sys: true, // Server-only, not sent unless requested
      create: false,
      update: false,
    },
    {
      name: "last_login",
      type: "datetime",
      sys: true,
      create: false,
      update: false,
    },
  ],
});
```

### Use Case 8: Deletion Behaviors

Control what happens to records when referenced entities are deleted.

```typescript
// User entity - user.ts
import { init_router } from "hola-server";

export const router = init_router({
  collection: "user",
  primary_keys: ["email"],
  ref_label: "name",
  deleteable: true,
  // ... other config
});

// Task entity with cascade delete - task.ts
export const taskRouter = init_router({
  collection: "task",
  primary_keys: ["title"],
  deleteable: true,

  fields: [
    { name: "title", type: "string", required: true },
    {
      name: "assigned_to",
      ref: "user",
      delete: "cascade", // Tasks deleted when user is deleted
    },
  ],
});

// Comment entity with keep behavior - comment.ts
export const commentRouter = init_router({
  collection: "comment",
  primary_keys: ["_id"],
  deleteable: true,

  fields: [
    { name: "text", type: "text", required: true },
    {
      name: "author",
      ref: "user",
      delete: "keep", // Comments kept when user is deleted
    },
  ],
});
```

## Field Subsets

The `EntityMeta` class automatically organizes fields into useful subsets:

```typescript
import { get_entity_meta } from "hola-server";
const meta = get_entity_meta("product");

// All fields
meta.fields; // All field definitions
meta.field_names; // ["sku", "name", "price", ...]

// Visibility filtering
meta.client_fields; // Excludes sys:true fields
meta.property_fields; // Excludes sys:true and secure:true fields

// Operation filtering
meta.create_fields; // Where create !== false
meta.update_fields; // Where create !== false and update !== false
meta.search_fields; // Where search !== false
meta.clone_fields; // Where clone !== false
meta.list_fields; // Where list !== false (excludes sys and secure)

// Special fields
meta.primary_key_fields; // Primary key field definitions
meta.required_field_names; // Names of required fields
meta.file_fields; // Fields with type:'file'
meta.ref_fields; // Fields with ref attribute
meta.link_fields; // Fields with link attribute
```

## Reference Tracking

The meta system automatically tracks which entities reference each entity:

```typescript
const user_meta = get_entity_meta("user");

// After all metas are loaded and validated:
console.log(user_meta.ref_by_metas);
// [
//   EntityMeta { collection: "task", ... },
//   EntityMeta { collection: "comment", ... },
//   EntityMeta { collection: "order", ... }
// ]

// This is used to enforce referential integrity
// and handle cascade deletions
```

## Best Practices

### 1. Always Define Primary Keys

Primary keys are required and used for:

- Uniqueness validation
- Update operations
- Clone operations
- Reference integrity

```typescript
// ✅ Good
{
  collection: "product",
  primary_keys: ["sku"],
  // ...
}

// ✅ Also good - composite key
{
  collection: "order_item",
  primary_keys: ["order_id", "product_id"],
  // ...
}
```

### 2. Set ref_label for Referenced Entities

If an entity will be referenced by others, define `ref_label`:

```typescript
// ✅ Good - can be referenced
{
  collection: "user",
  ref_label: "name",
  primary_keys: ["email"],
  // ...
}

// ❌ Bad - cannot be referenced
{
  collection: "user",
  primary_keys: ["email"],
  // Missing ref_label
}
```

### 3. Use Link Fields for Denormalization

Instead of joining in queries, use link fields for common display data:

## Overview

The Hola meta-programming model provides a declarative way to define entity schemas with built-in validation, reference management, field organization, and lifecycle hooks.

> **IMPORTANT**: In practice, you **never directly instantiate `EntityMeta`**. Instead, you always use `init_router()` in your router definition, which internally creates the `EntityMeta` instance for you.

**Developer-Facing API:**

```javascript
// ✅ CORRECT - Use init_router in router files
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "user",
  primary_keys: ["email"],
  fields: [...],
  // ... meta attributes
});
```

**Internal Implementation (for reference only):**

```javascript
// ❌ DON'T DO THIS - EntityMeta is internal
import { EntityMeta } from "hola-server";
const meta = new EntityMeta({...}); // Don't use directly
```

This document explains the meta attributes and field definitions you provide to `init_router()`.

## Core Principles

### 1. Meta Attributes

When defining entity metadata, **only the following attributes are allowed**:

**Entity-Level Attributes (from `META_ATTRS`):**

- `collection` - Collection name in MongoDB (required)
- `primary_keys` - Array of field names that form the primary key (required)
- `fields` - Array of field definitions (required)
- `roles` - Array of role access control definitions
- `ref_label` - Field name to use as display label when referenced
- `ref_filter` - Filter object for reference queries
- `route` - Custom route path
- `user_field` - Field name containing user ID for ownership

**Operation Flags:**

- `creatable` - Allow create operations (default: false)
- `readable` - Allow read operations (default: false)
- `updatable` - Allow update operations (default: false)
- `deleteable` - Allow delete operations (default: false)
- `cloneable` - Allow clone operations (default: false)
- `importable` - Allow import operations (default: false)
- `exportable` - Allow export operations (default: false)

**Lifecycle Callbacks:**

- `after_read` - Called after reading entity
- `list_query` - Modify list query
- `before_create` - Called before creating entity
- `before_clone` - Called before cloning entity
- `before_update` - Called before updating entity
- `before_delete` - Called before deleting entity
- `after_create` - Called after creating entity
- `after_clone` - Called after cloning entity
- `after_update` - Called after updating entity
- `after_delete` - Called after deleting entity
- `create` - Custom create handler
- `clone` - Custom clone handler
- `update` - Custom update handler
- `batch_update` - Custom batch update handler
- `after_batch_update` - Called after batch update
- `delete` - Custom delete handler

> **IMPORTANT**: Any attributes outside this list will cause validation errors during meta initialization.

### 2. Field Attributes

Each field definition supports the following attributes:

**Standard Field Attributes (from `FIELD_ATTRS`):**

- `name` - Field name (required)
- `type` - Data type (default: "string")
- `required` - Whether field is required (default: false)
- `default` - Default value for the field (validated against field type)
- `ref` - Reference to another entity (collection name)
  - **One-to-One Reference**: When field type is `"string"` (or omitted, defaulting to `"string"`), stores a single ObjectId
  - **One-to-Many Reference**: When field type is `"array"`, stores an array of ObjectIds
- `link` - Link to another field in this entity (must be a field of type 'ref')
- `delete` - Deletion behavior for ref fields ("keep" or "cascade")
- `create` - Show in create form (default: true)
- `list` - Show in table list (default: true)
- `search` - Show in search form (default: true)
- `update` - Allow update (default: true)
- `clone` - Include in clone (default: true)
- `sys` - System field (server-side only)
- `secure` - Hidden from client entirely (e.g., password hash)
- `group` - User group sharing control (field name containing group ID)
- `view` - Form view identifier ("\*" for all views, or specific view name)

**Link Field Attributes (from `LINK_FIELD_ATTRS`):**

- `name` - Field name
- `link` - Field to link to
- `list` - Show in list

> **IMPORTANT**: Link fields only support these three attributes. Any other attributes will cause validation errors.

### 3. Deletion Modes

For reference fields, you can specify deletion behavior:

- `"keep"` - Keep this record when referenced entity is deleted
- `"cascade"` - Delete this record when referenced entity is deleted
- `undefined` - No action (default)

```javascript
import { DELETE_MODE } from "hola-server";

// DELETE_MODE.all = ["keep", "cascade"]
// DELETE_MODE.keep = "keep"
// DELETE_MODE.cascade = "cascade"
```

### 4. Role-Based Access Control

Roles are defined in the format: `"role_name:mode"` or `"role_name:mode:view"`

- `role_name` - Must be defined in settings
- `mode` - Access permissions using mode characters:
  - `c` - Create access
  - `r` - Read access (single item)
  - `s` - Read access (search/list)
  - `u` - Update access
  - `d` - Delete access (single item)
  - `b` - Batch delete access
  - `o` - Clone access
  - `i` - Import access
  - `e` - Export access
  - `*` - All modes

**Examples:**

```javascript
roles: [
  "admin:*", // Admin has all permissions
  "editor:crsu", // Editor can create, read, search, update
  "viewer:rs", // Viewer can only read and search
  "moderator:rsdb", // Moderator can read, search, delete
];
```

## EntityMeta Class (Internal Reference)

> **Note**: This section describes the internal `EntityMeta` class for reference purposes. **You should use `init_router()` instead** (see examples below).

The `EntityMeta` class is created internally by `init_router()`. Understanding its structure helps you know what attributes you can pass to `init_router()`.

**What you actually write (in router files):**

```javascript
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "user",
  primary_keys: ["email"],
  readable: true,
  creatable: true,
  updatable: true,
  deleteable: true,

  fields: [
    { name: "email", type: "email", required: true },
    { name: "name", type: "string", required: true },
    { name: "age", type: "int" },
  ],
});
```

### Properties

After construction, the `EntityMeta` instance provides these properties:

**Basic Info:**

- `collection` - Collection name
- `primary_keys` - Array of primary key field names
- `roles` - Role definitions
- `user_field` - User ownership field
- `ref_label` - Reference label field
- `ref_filter` - Reference filter object

**Operation Flags:**

- `creatable`, `readable`, `updatable`, `deleteable`, `cloneable`, `importable`, `exportable` - Boolean flags
- `editable` - True if creatable or updatable
- `mode` - String combining allowed operations (e.g., "crsu")

**Field Organization:**

- `fields` - All field definitions (array)
- `fields_map` - Fields indexed by name (object)
- `field_names` - Array of all field names
- `client_fields` - Fields visible to client (excludes sys fields)
- `property_fields` - Fields for display (excludes sys and secure)
- `create_fields` - Fields shown in create form
- `update_fields` - Fields editable in update form
- `search_fields` - Fields shown in search form
- `clone_fields` - Fields included in clone
- `list_fields` - Fields shown in list view
- `primary_key_fields` - Primary key field definitions
- `required_field_names` - Names of required fields
- `file_fields` - Fields of type 'file'
- `upload_fields` - File upload field specs

**Reference Management:**

- `ref_fields` - Fields that reference other entities
- `link_fields` - Fields that link to ref fields
- `ref_by_metas` - Array of metas that reference this entity

### Methods

#### validate_meta_info()

Validates the entire meta definition. Called automatically after all metas are registered.

```javascript
meta.validate_meta_info();
// Throws Error if validation fails
// Returns true if valid
```

**Validation checks:**

- Collection name is defined
- No unsupported attributes
- Primary keys exist in fields
- Roles are properly formatted
- ref_label and user_field exist in fields
- ref_filter is an object
- All field definitions are valid
- No duplicate field names
- Link fields reference valid ref fields

## Helper Functions

### get_entity_meta(collection)

Get entity meta by collection name.

```javascript
import { get_entity_meta } from "hola-server";

const user_meta = get_entity_meta("user");
console.log(user_meta.collection); // "user"
console.log(user_meta.field_names); // ["email", "name", "age"]
```

### get_all_metas()

Get all registered meta collection names.

```javascript
import { get_all_metas } from "hola-server";

const collections = get_all_metas();
// ["user", "product", "order", ...]
```

### validate_all_metas()

Validate all registered metas. Called after all entity definitions are loaded.

```javascript
import { validate_all_metas } from "hola-server";

validate_all_metas();
// Throws Error if any meta is invalid
```

## Common Use Cases

### Use Case 1: Simple Entity Definition

```javascript
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "user",
  primary_keys: ["email"],
  ref_label: "name",

  readable: true,
  creatable: true,
  updatable: true,
  deleteable: true,

  roles: ["admin:*", "user:rs"],

  fields: [
    {
      name: "email",
      type: "email",
      required: true,
    },
    {
      name: "name",
      type: "string",
      required: true,
    },
    {
      name: "age",
      type: "int",
      required: false,
    },
    {
      name: "created_at",
      type: "datetime",
      sys: true,
      create: false,
      update: false,
    },
  ],
});
```

### Use Case 2: Entity with References

```javascript
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "task",
  primary_keys: ["title"],
  ref_label: "title",

  readable: true,
  creatable: true,
  updatable: true,
  deleteable: true,

  fields: [
    {
      name: "title",
      type: "string",
      required: true,
    },
    {
      name: "description",
      type: "text",
    },
    {
      name: "assigned_to",
      ref: "user", // References user collection
      delete: "cascade", // Delete task if user is deleted
    },
    {
      name: "assigned_name",
      link: "assigned_to", // Auto-populated from user.name
      list: true,
    },
    {
      name: "status",
      type: "task_status",
      required: true,
      default: 0,
    },
  ],
});
```

### Use Case 3: Reference Relationships (One-to-One vs One-to-Many)

The `ref` attribute supports both one-to-one and one-to-many relationships depending on the field type.

#### One-to-One Reference (Single ObjectId)

When the field type is `"string"` (or omitted, defaulting to `"string"`), and has a `ref` attribute, it stores a single ObjectId reference:

```javascript
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "task",
  primary_keys: ["title"],

  fields: [
    {
      name: "title",
      type: "string",
      required: true,
    },
    {
      name: "owner", // No explicit type, defaults to "string"
      ref: "user", // One-to-one: single user reference
      required: true,
      delete: "cascade",
    },
    {
      name: "docker",
      type: "string", // Explicit string type
      ref: "docker", // One-to-one: single docker reference
      required: true,
    },
  ],
});
```

#### One-to-Many Reference (Array of ObjectIds)

When the field type is `"array"` with `ref` attribute, it stores an array of ObjectIds:

```javascript
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "exec",
  primary_keys: ["owner", "name", "type"],

  fields: [
    {
      name: "owner", // No explicit type, defaults to "string"
      ref: "user", // One-to-one: single user
      required: true,
      delete: "cascade",
    },
    {
      name: "hosts",
      type: "array",
      ref: "host", // One-to-many: array of hosts
      required: true,
      search: false,
    },
    {
      name: "name",
      type: "string",
      required: true,
    },
    {
      name: "type",
      type: "int",
      required: true,
    },
  ],
});
```

**Key Differences:**

| Aspect         | One-to-One                      | One-to-Many                                     |
| -------------- | ------------------------------- | ----------------------------------------------- |
| **Field Type** | `"string"` (default if omitted) | `"array"`                                       |
| **Stores**     | Single ObjectId                 | Array of ObjectIds                              |
| **Example**    | `{ owner: ObjectId("...") }`    | `{ hosts: [ObjectId("..."), ObjectId("...")] }` |
| **Use Case**   | Single parent, single author    | Multiple assignees, multiple tags               |

### Use Case 4: Link Fields

Link fields automatically populate their values from referenced entities.

```javascript
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "order",
  primary_keys: ["order_id"],
  ref_label: "order_id",

  readable: true,
  creatable: true,

  fields: [
    {
      name: "order_id",
      type: "string",
      required: true,
    },
    {
      name: "customer",
      ref: "user",
      delete: "keep", // Keep order if user is deleted
    },
    {
      name: "customer_email",
      link: "customer", // Auto-populated from customer.email
      list: true, // Only name, link, list allowed
    },
  ],
});
```

### Use Case 5: Multiple Form Views

Organize complex entities into different form views.

```javascript
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "product",
  primary_keys: ["sku"],
  ref_label: "name",

  creatable: true,
  readable: true,
  updatable: true,

  fields: [
    // Basic view
    {
      name: "sku",
      type: "string",
      required: true,
      view: "basic",
    },
    {
      name: "name",
      type: "string",
      required: true,
      view: "basic",
    },

    // Pricing view
    {
      name: "price",
      type: "decimal",
      view: "pricing",
    },
    {
      name: "cost",
      type: "decimal",
      view: "pricing",
    },

    // Inventory view
    {
      name: "stock",
      type: "int",
      view: "inventory",
    },

    // All views
    {
      name: "category",
      type: "product_category",
      view: "*",
    },
  ],
});
```

### Use Case 6: Lifecycle Callbacks

Add custom logic at various points in the entity lifecycle.

```javascript
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "audit_log",
  primary_keys: ["_id"],

  creatable: true,
  readable: true,

  fields: [
    { name: "action", type: "string", required: true },
    { name: "user_id", ref: "user" },
    { name: "timestamp", type: "datetime", sys: true },
  ],

  before_create: async function (param_obj, ctx) {
    // Set timestamp before creating
    param_obj.timestamp = new Date();
    return param_obj;
  },

  after_read: async function (item, ctx) {
    // Mask sensitive data after reading
    if (item.sensitive_data) {
      item.sensitive_data = "***";
    }
    return item;
  },

  list_query: async function (query, ctx) {
    // Filter list by user
    if (ctx.user && !ctx.user.is_admin) {
      query.user_id = ctx.user._id;
    }
    return query;
  },

  before_delete: async function (id_array, ctx) {
    // Prevent deletion of critical records
    const critical = await this.find({ _id: { $in: id_array }, critical: true });
    if (critical.length > 0) {
      throw new Error("Cannot delete critical records");
    }
  },
});
```

### Use Case 7: Secure and System Fields

Control field visibility to client and in different operations.

```javascript
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "user",
  primary_keys: ["email"],
  ref_label: "name",

  creatable: true,
  readable: true,
  updatable: true,

  fields: [
    {
      name: "email",
      type: "email",
      required: true,
    },
    {
      name: "name",
      type: "string",
      required: true,
    },
    {
      name: "password_hash",
      type: "string",
      secure: true, // Never sent to client
      create: false,
      update: false,
      list: false,
    },
    {
      name: "created_at",
      type: "datetime",
      sys: true, // Server-only, not sent unless requested
      create: false,
      update: false,
    },
    {
      name: "last_login",
      type: "datetime",
      sys: true,
      create: false,
      update: false,
    },
  ],
});
```

### Use Case 8: Deletion Behaviors

Control what happens to records when referenced entities are deleted.

```javascript
// User entity - user.js
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "user",
  primary_keys: ["email"],
  ref_label: "name",
  deleteable: true,
  // ... other config
});

// Task entity with cascade delete - task.js
module.exports = init_router({
  collection: "task",
  primary_keys: ["title"],
  deleteable: true,

  fields: [
    { name: "title", type: "string", required: true },
    {
      name: "assigned_to",
      ref: "user",
      delete: "cascade", // Tasks deleted when user is deleted
    },
  ],
});

// Comment entity with keep behavior - comment.js
module.exports = init_router({
  collection: "comment",
  primary_keys: ["_id"],
  deleteable: true,

  fields: [
    { name: "text", type: "text", required: true },
    {
      name: "author",
      ref: "user",
      delete: "keep", // Comments kept when user is deleted
    },
  ],
});
```

## Field Subsets

The `EntityMeta` class automatically organizes fields into useful subsets:

```javascript
const meta = get_entity_meta("product");

// All fields
meta.fields; // All field definitions
meta.field_names; // ["sku", "name", "price", ...]

// Visibility filtering
meta.client_fields; // Excludes sys:true fields
meta.property_fields; // Excludes sys:true and secure:true fields

// Operation filtering
meta.create_fields; // Where create !== false
meta.update_fields; // Where create !== false and update !== false
meta.search_fields; // Where search !== false
meta.clone_fields; // Where clone !== false
meta.list_fields; // Where list !== false (excludes sys and secure)

// Special fields
meta.primary_key_fields; // Primary key field definitions
meta.required_field_names; // Names of required fields
meta.file_fields; // Fields with type:'file'
meta.ref_fields; // Fields with ref attribute
meta.link_fields; // Fields with link attribute
```

## Reference Tracking

The meta system automatically tracks which entities reference each entity:

```javascript
const user_meta = get_entity_meta("user");

// After all metas are loaded and validated:
console.log(user_meta.ref_by_metas);
// [
//   EntityMeta { collection: "task", ... },
//   EntityMeta { collection: "comment", ... },
//   EntityMeta { collection: "order", ... }
// ]

// This is used to enforce referential integrity
// and handle cascade deletions
```

## Best Practices

### 1. Always Define Primary Keys

Primary keys are required and used for:

- Uniqueness validation
- Update operations
- Clone operations
- Reference integrity

```javascript
// ✅ Good
{
  collection: "product",
  primary_keys: ["sku"],
  // ...
}

// ✅ Also good - composite key
{
  collection: "order_item",
  primary_keys: ["order_id", "product_id"],
  // ...
}
```

### 2. Set ref_label for Referenced Entities

If an entity will be referenced by others, define `ref_label`:

```javascript
// ✅ Good - can be referenced
{
  collection: "user",
  ref_label: "name",
  primary_keys: ["email"],
  // ...
}

// ❌ Bad - cannot be referenced
{
  collection: "user",
  primary_keys: ["email"],
  // Missing ref_label
}
```

### 3. Use Link Fields for Denormalization

Instead of joining in queries, use link fields for common display data:

```javascript
{
  collection: "task",
  fields: [
    {
      name: "assigned_to",  // No type, defaults to "string"
      ref: "user"
    },
    {
      name: "assigned_name",  // Auto-populated
      link: "assigned_to",
      list: true              // Show in list view
    }
  ]
}
```

### 4. Choose Delete Behavior Carefully

Consider the business logic when setting delete behavior:

```javascript
// Cascade: Dependent data
{ name: "user_id", ref: "user", delete: "cascade" }  // No type, defaults to "string"

// Keep: Historical data
{ name: "created_by", ref: "user", delete: "keep" }

// Default (no action): Optional references
{ name: "related_item", ref: "item" }
```

### 5. Use Callbacks for Business Logic

Don't put business logic in route handlers - use lifecycle callbacks:

```javascript
{
  collection: "order",

  before_create: async function(param_obj, ctx) {
    // Auto-generate order number
    param_obj.order_number = await generate_order_number();
    return param_obj;
  },

  after_create: async function(item, ctx) {
    // Send notification
    await send_order_confirmation(item);
  },

  before_delete: async function(id_array, ctx) {
    // Check if can delete
    const orders = await this.find({ _id: { $in: id_array } });
    if (orders.some(o => o.status === "shipped")) {
      throw new Error("Cannot delete shipped orders");
    }
  }
}
```

## Common Mistakes to Avoid

### ❌ Don't: Add Unsupported Meta Attributes

```javascript
// ❌ WRONG
module.exports = init_router({
  collection: "product",
  primary_keys: ["sku"],
  custom_attribute: "value", // ❌ Not in META_ATTRS
  // ...
});
```

### ✅ Do: Use Only Supported Attributes

```javascript
// ✅ CORRECT
module.exports = init_router({
  collection: "product",
  primary_keys: ["sku"],
  ref_label: "name",
  creatable: true,
  readable: true,
  // ... only META_ATTRS
});
```

### ❌ Don't: Add Extra Attributes to Link Fields

```javascript
// ❌ WRONG
fields: [
  {
    name: "user_email",
    link: "user_id",
    type: "email", // ❌ Not allowed
    required: true, // ❌ Not allowed
  },
];
```

### ✅ Do: Use Only name, link, list

```javascript
// ✅ CORRECT
fields: [
  {
    name: "user_email",
    link: "user_id",
    list: true, // ✅ Only name, link, list
  },
];
```

### ❌ Don't: Forget to Set Operation Flags

```javascript
// ❌ WRONG - All operations disabled by default
module.exports = init_router({
  collection: "user",
  primary_keys: ["email"],
  fields: [...]
  // Missing: creatable, readable, updatable, deleteable
});
```

### ✅ Do: Explicitly Enable Operations

```javascript
// ✅ CORRECT
module.exports = init_router({
  collection: "user",
  primary_keys: ["email"],
  creatable: true,
  readable: true,
  updatable: true,
  deleteable: true,
  fields: [...]
});
```

### ❌ Don't: Reference Non-existent Collections

```javascript
// ❌ WRONG
fields: [
  {
    name: "category_id",
    ref: "category", // ❌ Category meta not registered (but type:"ref" is also wrong)
  },
];
```

### ✅ Do: Ensure Referenced Metas Exist

```javascript
// ✅ CORRECT - Register category meta first (category.js)
module.exports = init_router({
  collection: "category",
  ref_label: "name",      // ✅ ref_label required for referenced entities
  primary_keys: ["name"],
  fields: [...]
});

// Then reference it in product router (product.js)
module.exports = init_router({
  collection: "product",
  primary_keys: ["sku"],
  fields: [
    {
      name: "category_id",
      ref: "category"     // ✅ Now valid
    }
  ]
});
```

## Router Definition Pattern

This is the standard way to define entity routers in Hola:

```javascript
import { init_router } from "hola-server";

// init_router creates an EntityMeta internally
module.exports = init_router({
  collection: "product",
  primary_keys: ["sku"],
  ref_label: "name",

  creatable: true,
  readable: true,
  updatable: true,
  deleteable: true,

  fields: [
    { name: "sku", type: "string", required: true },
    { name: "name", type: "string", required: true },
    { name: "price", type: "decimal" },
  ],

  before_create: async function (param_obj, ctx) {
    // Custom logic
    return param_obj;
  },
});
```

## Summary

The EntityMeta class provides:

- **Declarative schema definition** - Define entity structure with simple objects
- **Automatic validation** - Validates meta and field definitions
- **Reference management** - Tracks relationships and enforces integrity
- **Field organization** - Automatically groups fields by operation and visibility
- **Lifecycle hooks** - Add custom logic at key points
- **Role-based access** - Control who can perform which operations
- **View filtering** - Organize fields into multiple form views

Follow these guidelines to create robust, maintainable entity definitions in your Hola applications.

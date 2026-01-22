# Type System in Hola Meta-Programming Framework

## Overview

The Hola framework uses a robust type system to ensure data validation, conversion, and consistency across the entire stack. This document explains how to use built-in types and how to define customized types for your entities.

## Core Principles

### 1. Field Attributes Restrictions

When defining entity fields, **only the following attributes are allowed**:

**Standard Field Attributes (from `FIELD_ATTRS`):**

- `name` - Field name (required)
- `type` - Data type (default: "string")
- `required` - Whether field is required
- `default` - Default value for the field (validated against field type)
- `ref` - Reference to another entity collection
- `link` - Link to another field (auto-populated from ref)
- `delete` - Deletion behavior for ref fields ("keep" or "cascade")
- `create` - Show in create form
- `list` - Show in table list
- `search` - Show in search form
- `update` - Allow update
- `clone` - Include in clone
- `sys` - System field (server-side only)
- `secure` - Hidden from client entirely
- `group` - User group sharing control
- `view` - Form view identifier

**Link Field Attributes (from `LINK_FIELD_ATTRS`):**

- `name` - Field name
- `link` - Field to link to
- `list` - Show in list

> **IMPORTANT**: Any attributes outside these lists will cause validation errors. For example, `enum_values`, `max_length`, `accept` are **NOT** valid field attributes in the meta definition.

### 2. Type Attribute Rules

The `type` attribute should **only** use types defined in the core type system:

**Server-Side Types** (from `hola-server/core/type.js`):

- Basic: `obj`, `string`, `lstr`, `text`, `password`, `file`, `date`, `enum`, `log_category`
- Boolean: `boolean`
- Numeric: `number`, `int`, `uint`, `float`, `ufloat`, `decimal`, `percentage`, `currency`
- Date/Time: `datetime`, `time`
- Validation: `email`, `url`, `phone`, `uuid`, `color`, `ip_address`
- Data Structures: `array`, `json`
- Transformations: `slug`
- Domain-Specific: `age`, `gender`, `log_level`

Any type name not in this list is considered a **customized type** and must be registered before use.

### 3. Default Values

The `default` attribute allows you to specify default values that will be automatically populated in create forms when the field is empty:

```javascript
fields: [
  { name: "quantity", type: "int", default: 0 },
  { name: "active", type: "boolean", default: true },
  { name: "price", type: "float", default: 9.99 },
  { name: "category", type: "product_category", default: 0 }, // First enum value
];
```

**Validation Rules:**

- The default value **must be valid** for the field's type
- Validation happens during meta definition loading using `type.convert()`
- If the default value doesn't pass type validation, an error is thrown

**Client-Side Behavior:**

- Default values are applied automatically in `BasicForm.vue` during create operations
- Defaults are only applied when the field value is `undefined`, `null`, or empty string
- User can still override default values by entering different values

### 4. Enumeration Pattern (g18n-Compatible)

The Hola framework follows the **g18n** (global internationalization) pattern for enumerations:

- **Store integer values in database** (e.g., 0, 1, 2)
- **Display translated labels on client side** (e.g., "Male", "Female")
- **Define enums as customized int enum types**, NOT as string enums

**❌ INCORRECT - String Enum:**

```javascript
fields: [
  {
    name: "category",
    type: "enum",
    enum_values: ["Electronics", "Clothing", "Food"], // ❌ NO enum_values attribute
  },
];
```

**✅ CORRECT - Int Enum Type:**

```javascript
// 1. Register customized type using built-in helper
import { register_type, int_enum_type } from "hola-server";

register_type(int_enum_type("product_category", [0, 1, 2]));
// 0=Electronics, 1=Clothing, 2=Food

// 2. Use in field definition
fields: [
  {
    name: "category",
    type: "product_category", // ✅ Custom type
  },
];
```

**Client-Side Labels** (in `hola-web/src/core/type.js`):

```javascript
register_type({
  name: "product_category",
  input_type: "autocomplete",
  items: (vue) => [
    { value: 0, text: vue.$t("product_category.electronics") },
    { value: 1, text: vue.$t("product_category.clothing") },
    { value: 2, text: vue.$t("product_category.food") },
  ],
  format: (value, vue) => {
    const labels = ["electronics", "clothing", "food"];
    return labels[value] ? vue.$t(`product_category.${labels[value]}`) : "";
  },
});
```

**Localized Labels** (in `hola-web/src/locales/en.json`):

```json
{
  "product_category": {
    "electronics": "Electronics",
    "clothing": "Clothing",
    "food": "Food"
  }
}
```

## Built-in Types Reference

### Basic Types

| Type       | Server Conversion           | Client Input   | Use Case                |
| ---------- | --------------------------- | -------------- | ----------------------- |
| `string`   | Trim whitespace, default "" | `v-text-field` | Short text (≤255 chars) |
| `lstr`     | Passthrough string          | `v-textarea`   | Long string             |
| `text`     | Passthrough string          | Rich editor    | Long formatted text     |
| `password` | Encrypt with hash           | Password input | Secure credentials      |
| `file`     | Passthrough                 | File upload    | File attachments        |
| `date`     | Passthrough string          | Date picker    | Date only               |
| `enum`     | Passthrough string          | Autocomplete   | String options          |

### Numeric Types

| Type         | Server Conversion            | Validation                | Client Input        |
| ------------ | ---------------------------- | ------------------------- | ------------------- |
| `number`     | Parse to number              | Any number                | Number input        |
| `int`        | Parse to integer             | Integer only              | Number input        |
| `uint`       | Parse to unsigned int        | Integer ≥ 0               | Number input        |
| `float`      | Parse to 2 decimals          | Float with 2 decimals     | Number input        |
| `ufloat`     | Parse to unsigned 2 decimals | Float ≥ 0 with 2 decimals | Number input        |
| `decimal`    | Parse to decimal             | Any float                 | Number input        |
| `percentage` | Parse to 2 decimals          | Float                     | Number input with % |
| `currency`   | Parse to number              | Number                    | Number input with $ |

### Validation Types

| Type         | Pattern/Rule         | Example                                |
| ------------ | -------------------- | -------------------------------------- |
| `email`      | Email regex pattern  | `user@example.com`                     |
| `url`        | Valid URL structure  | `https://example.com`                  |
| `phone`      | International format | `+1234567890`                          |
| `uuid`       | UUID v1-v5           | `550e8400-e29b-41d4-a716-446655440000` |
| `color`      | Hex color            | `#FF5733` or `#F57`                    |
| `ip_address` | IPv4 format          | `192.168.1.1`                          |

### Domain-Specific Types

| Type        | Valid Values                     | Description  |
| ----------- | -------------------------------- | ------------ |
| `age`       | 0-200 (int)                      | Person age   |
| `gender`    | 0=Male, 1=Female                 | Gender enum  |
| `log_level` | 0=Debug, 1=Info, 2=Warn, 3=Error | Log severity |

## Creating Customized Types

### Step 1: Server-Side Type Registration

Create a type definition in your entity file or a shared types file:

```javascript
import { register_type, ok, err, is_int, int_enum_type, int_range_type, regex_type } from "hola-server";

// Example 1: Int Enum Type
// Use the built-in helper function
register_type(int_enum_type("order_status", [0, 1, 2, 3]));
// 0=Pending, 1=Processing, 2=Shipped, 3=Delivered

// Example 2: Int Range Type
// Use the built-in helper function
register_type(int_range_type("priority", 1, 5));

// Example 3: Min/Max Value Type (like age type)
// Server-side: Use int_range_type helper for integer ranges
register_type(int_range_type("employee_age", 18, 65));
// This creates validation: 18 <= value <= 65

// Example 4: Regex Validation Type
// Use the built-in helper function
register_type(regex_type("sku_code", /^[A-Z]{3}-\d{6}$/));

// Example 5: Custom Business Logic Type
// Use ok() and err() helpers for return values
register_type({
  name: "discount_rate",
  convert: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return err("discount_rate", value);
    if (num < 0 || num > 100) return err("discount_rate", value);
    return ok(parseFloat(num.toFixed(2)));
  },
});

// Example 6: Custom Int Enum with Business Logic
// Use is_int() helper for validation
register_type({
  name: "approval_status",
  convert: (value) => {
    if (!is_int(value)) return err("approval_status", value);
    const int_value = parseInt(value);
    const valid = [0, 1, 2]; // 0=Pending, 1=Approved, 2=Rejected
    return valid.includes(int_value) ? ok(int_value) : err("approval_status", value);
  },
});
```

**Available Helper Functions:**

| Helper                           | Purpose                                        | Example                                                                       |
| -------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `ok(value)`                      | Return success result                          | `ok(42)` → `{value: 42}`                                                      |
| `err(type, value)`               | Return error result                            | `err("int", "abc")` → `{err: "invalid int:abc"}`                              |
| `is_int(value)`                  | Check if value is integer                      | `is_int(42)` → `true`                                                         |
| `int_enum_type(name, values)`    | Create int enum type                           | `int_enum_type("status", [0,1,2])`                                            |
| `int_range_type(name, min, max)` | Create int range type                          | `int_range_type("age", 0, 200)`                                               |
| `regex_type(name, pattern)`      | Create regex validation type                   | `regex_type("email", /.../)`                                                  |
| `string_type(name)`              | Create passthrough string type                 | `string_type("code")`                                                         |
| `register_schema_type(name, fn)` | Register TypeBox schema for request validation | `register_schema_type("status", () => t.Union([t.Literal(0), t.Literal(1)]))` |

### Step 1.5: Register Schema Type for Request Validation

When you create custom types, you also need to register the corresponding **TypeBox schema** so that `init_router` can properly validate incoming request bodies. Without this, custom types will default to `t.String()` schema validation.

```javascript
import { register_type, int_enum_type, register_schema_type } from "hola-server";
import { t } from "elysia";

// 1. Register the validation type (for data conversion)
register_type(int_enum_type("order_status", [0, 1, 2, 3]));

// 2. Register the schema type (for request body validation)
// Use t.Union with t.Literal to restrict to valid enum values
register_schema_type("order_status", () => t.Union([t.Literal(0), t.Literal(1), t.Literal(2), t.Literal(3)]));
```

**Why both registrations are needed:**

- `register_type()` - Defines how to validate and convert values after they pass schema validation
- `register_schema_type()` - Defines the TypeBox schema used by Elysia to validate incoming request bodies

**Common Schema Mappings:**

| Custom Type Pattern | Schema Function                                    |
| ------------------- | -------------------------------------------------- |
| Int enum types      | `() => t.Union([t.Literal(0), t.Literal(1), ...])` |
| Int range types     | `() => t.Number({ minimum: min, maximum: max })`   |
| String patterns     | `() => t.String()`                                 |
| Boolean flags       | `() => t.Boolean()`                                |

### Step 1.6: Initialization Order in main.ts (CRITICAL)

> **⚠️ CRITICAL**: Custom types and schema types MUST be registered **BEFORE** importing router files. Router files call `init_router()` at import time, which generates schemas. If custom types aren't registered yet, they will default to `t.String()`.

**❌ INCORRECT - Static imports execute before `register_types()`:**

```typescript
// main.ts - WRONG ORDER
import { plugins, init_settings } from "hola-server";
import { register_types } from "./core/type.js";
import userRouter from "./router/user.js"; // ❌ init_router() runs HERE at import time
import logRouter from "./router/log.js"; // ❌ Custom types not registered yet!

init_settings(settings);
register_types(); // Too late! Routers already imported with wrong schemas
```

**✅ CORRECT - Dynamic imports AFTER type registration:**

```typescript
// main.ts - CORRECT ORDER
import { plugins, init_settings, validate_all_metas } from "hola-server";
import { register_types } from "./core/type.js";
import { settings } from "./setting.js";

// 1. Initialize settings and register custom types FIRST
init_settings(settings);
register_types();

// 2. Dynamic import routers AFTER types are registered
const userRouter = (await import("./router/user.js")).default;
const logRouter = (await import("./router/log.js")).default;

// 3. Now validate metas (optional but recommended)
validate_all_metas();

// 4. Build the app with properly typed routers
const app = new Elysia()
  .use(plugins.holaCors({ origin: settings.server.client_web_url }))
  .use(userRouter)
  .use(logRouter);
// ...
```

**Why this matters:**

- `init_router()` is called when router files are imported
- `init_router()` generates TypeBox schemas using `meta_to_schema()`
- `meta_to_schema()` looks up custom types from the registry
- If custom types aren't registered yet, it defaults to `t.String()`
- This causes validation errors like "Expected string but found: 1" for int enum fields

### Step 2: Client-Side Type Registration

Register the corresponding client-side type in your Vue app:

```javascript
// hola-web/src/core/type.js or custom types file
import { register_type } from "@/core/type";

// Example 1: Int Enum with i18n
register_type({
  name: "order_status",
  input_type: "autocomplete",
  items: (vue) => [
    { value: 0, text: vue.$t("order_status.pending") },
    { value: 1, text: vue.$t("order_status.processing") },
    { value: 2, text: vue.$t("order_status.shipped") },
    { value: 3, text: vue.$t("order_status.delivered") },
  ],
  format: (value, vue) => {
    const statuses = ["pending", "processing", "shipped", "delivered"];
    return statuses[value] ? vue.$t(`order_status.${statuses[value]}`) : "";
  },
});

// Example 2: Range Input
register_type({
  name: "priority",
  input_type: "slider",
  min: 1,
  max: 5,
  step: 1,
  rule: (vue, field_name) => {
    const err = vue.$t("type.priority", { field: field_name });
    return (value) => {
      const num = parseInt(value);
      return (num >= 1 && num <= 5) || err;
    };
  },
  format: (value) => `Priority ${value}`,
});

// Example 3: Min/Max Value with Suffix (like age type)
// Client-side: Number input with validation and localized suffix
register_type({
  name: "employee_age",
  input_type: "number",
  search_input_type: "text",
  suffix: (vue) => vue.$t("type.age_unit"), // e.g., "years old"
  rule: (vue, field_name) => {
    const err = vue.$t("type.employee_age", { field: field_name });
    return (value) => {
      if (!value) return true;
      const num = parseInt(value);
      return (num >= 18 && num <= 65) || err;
    };
  },
  format: (value, vue) => (value ? `${value} ${vue.$t("type.age_unit")}` : ""),
});

// Example 4: Custom Validation
register_type({
  name: "sku_code",
  input_type: "text",
  rule: (vue, field_name) => {
    const err = vue.$t("type.sku_code", { field: field_name });
    const pattern = /^[A-Z]{3}-\d{6}$/;
    return (value) => !value || pattern.test(value) || err;
  },
});

// Example 4: Formatted Number
register_type({
  name: "discount_rate",
  input_type: "number",
  suffix: "%",
  rule: (vue, field_name) => {
    const err = vue.$t("type.discount_rate", { field: field_name });
    return (value) => {
      if (!value) return true;
      const num = parseFloat(value);
      return (!isNaN(num) && num >= 0 && num <= 100) || err;
    };
  },
  format: (value) => (value ? `${value.toFixed(2)}%` : ""),
});
```

### Step 3: Add i18n Translations

Add translations for your custom types:

```json
// hola-web/src/locales/en.json
{
  "order_status": {
    "pending": "Pending",
    "processing": "Processing",
    "shipped": "Shipped",
    "delivered": "Delivered"
  },
  "type": {
    "priority": "Priority must be between 1 and 5",
    "employee_age": "Age must be between 18 and 65",
    "age_unit": "years old",
    "sku_code": "SKU code must be in format XXX-123456",
    "discount_rate": "Discount rate must be between 0 and 100"
  }
}
```

### Step 4: Use in Entity Definition

```javascript
import { init_router } from "hola-server";

module.exports = init_router({
  collection: "product",
  creatable: true,
  readable: true,
  updatable: true,
  deleteable: true,

  primary_keys: ["sku"],
  ref_label: "name",

  fields: [
    { name: "sku", type: "sku_code", required: true },
    { name: "name", type: "string", required: true },
    { name: "status", type: "order_status", required: true },
    { name: "priority", type: "priority" },
    { name: "age", type: "employee_age" },
    { name: "discount", type: "discount_rate" },
  ],
});
```

## Complete Example: Product Category Type

Here's a complete example showing all steps:

**1. Server Type (`hola-server/router/product.js`):**

```javascript
import { init_router, register_type, int_enum_type, register_schema_type } from "hola-server";
import { t } from "elysia";

// Define custom type using built-in helper
register_type(int_enum_type("product_category", [0, 1, 2]));
// 0=Electronics, 1=Clothing, 2=Food

// Register schema type for request validation
// Use t.Union with t.Literal to restrict to valid enum values
register_schema_type("product_category", () => t.Union([t.Literal(0), t.Literal(1), t.Literal(2)]));

// Use in entity
module.exports = init_router({
  collection: "product",
  creatable: true,
  readable: true,
  updatable: true,
  deleteable: true,

  primary_keys: ["name"],
  ref_label: "name",

  fields: [
    { name: "name", type: "string", required: true },
    { name: "price", type: "decimal", required: true },
    { name: "category", type: "product_category", required: true },
  ],
});
```

**2. Client Type (`hola-web/src/types/product.js`):**

```javascript
import { register_type } from "@/core/type";

register_type({
  name: "product_category",
  input_type: "autocomplete",
  items: (vue) => [
    { value: 0, text: vue.$t("product_category.electronics") },
    { value: 1, text: vue.$t("product_category.clothing") },
    { value: 2, text: vue.$t("product_category.food") },
  ],
  format: (value, vue) => {
    const categories = ["electronics", "clothing", "food"];
    return categories[value] ? vue.$t(`product_category.${categories[value]}`) : "";
  },
});
```

**3. Translations (`hola-web/src/locales/en.json`):**

```json
{
  "product_category": {
    "electronics": "Electronics",
    "clothing": "Clothing",
    "food": "Food"
  }
}
```

## Best Practices

### 1. Use Int Enums for All Enumerations

- Store integers in the database for efficiency and language-independence
- Use i18n labels on the client side for display
- Never use string enums with hardcoded values

### 2. Keep Types DRY

- Use the built-in helper functions exported from `hola-server/core/type` (`int_enum_type`, `int_range_type`, `regex_type`, etc.)
- Share type definitions across multiple entities if appropriate
- Only define custom helpers when you need specialized business logic not covered by built-ins

### 3. Validation Consistency

- Ensure server-side and client-side validation rules match
- Server validation is authoritative; client validation improves UX

### 4. Type Naming Conventions

- Use descriptive names: `order_status`, `product_category`, `priority_level`
- Avoid generic names: `status`, `type`, `category` (too vague)
- Use snake_case for consistency with other Hola conventions

### 5. Error Messages

- Provide clear, actionable error messages
- Use i18n for all user-facing messages
- Include field context in validation errors

### 6. Register Before Use

- Always register custom types before defining entities that use them
- Register in entity file or in a shared types initialization module
- Verify type exists using `get_type(name)` if needed

## Common Mistakes to Avoid

### ❌ Don't: Add Custom Attributes to Fields

```javascript
// ❌ WRONG
fields: [
  {
    name: "category",
    type: "enum",
    enum_values: ["A", "B"], // ❌ Not a valid field attribute
    max_length: 100, // ❌ Not a valid field attribute
  },
];
```

### ✅ Do: Use Customized Types

```javascript
// ✅ CORRECT
register_type({
  name: "my_category",
  convert: (value) => {
    const valid = [0, 1];
    const int_val = parseInt(value);
    return valid.includes(int_val) ? { value: int_val } : { err: "invalid" };
  },
});

fields: [
  { name: "category", type: "my_category", required: true, default: 0 }, // ✅ Valid with default
];
```

### ❌ Don't: Use String Enums

```javascript
// ❌ WRONG - String values
register_type({
  name: "status",
  convert: (value) => {
    const valid = ["active", "inactive"];
    return valid.includes(value) ? { value } : { err: "invalid" };
  },
});
```

### ✅ Do: Use Int Enums

```javascript
// ✅ CORRECT - Int values
register_type({
  name: "status",
  convert: (value) => {
    const int_val = parseInt(value);
    const valid = [0, 1]; // 0=inactive, 1=active
    return valid.includes(int_val) ? { value: int_val } : { err: "invalid" };
  },
});
```

## Summary

The Hola type system provides:

- **Strict field attribute validation** - only predefined attributes allowed
- **Comprehensive built-in types** - covering common data validation needs
- **Customized type support** - extend with your own business logic
- **g18n-compatible enums** - int values in DB, i18n labels in UI
- **Server-client consistency** - matching validation on both sides

Follow these guidelines to create robust, maintainable, and internationalization-ready entities in your Hola applications.

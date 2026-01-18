# Validation Utilities Skill

## Overview

The `hola-server/core/validate.js` module provides basic validation helpers to check for undefined, empty, or missing values.

## Importing

```javascript
const { 
    is_undefined, has_value, validate_required_fields 
} from "hola-server";
```

## API Reference

### `is_undefined(value)`
Checks if a value is strictly `undefined`.
- **param**: `value` (*)
- **returns**: `boolean`

### `has_value(value)`
Checks if a value is "meaningful". Returns `false` for:
- `null`
- `undefined`
- `NaN`
- Empty strings `""` or whitespace-only strings ` "  " `
- **returns**: `boolean`

```javascript
has_value(0);       // true
has_value(false);   // true
has_value("");      // false
has_value("   ");   // false
has_value(null);    // false
```

### `validate_required_fields(obj, field_names)`
Checks an object for missing required properties (using `has_value`).
- **param**: `obj` (Object) - Object to validate.
- **param**: `field_names` (string[]) - List of keys that must be present.
- **returns**: `string[]` - Array of field names that failed validation.

```javascript
const data = { name: "Alice", age: null };
const missing = validate_required_fields(data, ["name", "age", "email"]);
// missing is ["age", "email"]
```

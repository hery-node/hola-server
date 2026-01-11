# Default Field Attribute

Added `default` attribute support to meta field definitions for automatic value population during create operations.

## Changes

### Server: `core/meta.js`

1. Added `default` to `FIELD_ATTRS` array
2. Added validation in `validate_field`:
   - Validates default value against field type using `type.convert()`
   - Throws error if default value is invalid for the field type

```javascript
// Validate default value against field type
if (field.default !== undefined && field.type) {
    const type = get_type(field.type);
    const result = type.convert(field.default);
    if (result.err) throw meta_error(meta.collection, `invalid default value...`);
}
```

### Client: `components/BasicForm.vue`

1. Added `apply_defaults(form)` method that applies default values to empty form fields
2. Called during initialization and form prop changes

```javascript
apply_defaults(form) {
    const result = { ...form };
    for (const field of this.fields) {
        if (field.default !== undefined && 
            (result[field.name] === undefined || result[field.name] === null || result[field.name] === "")) {
            result[field.name] = field.default;
        }
    }
    return result;
}
```

## Usage

```javascript
{
    collection: "products",
    primary_keys: ["name"],
    fields: [
        { name: "name", type: "string", required: true },
        { name: "quantity", type: "int", default: 0 },
        { name: "active", type: "boolean", default: true },
        { name: "price", type: "float", default: 9.99 }
    ]
}
```

When creating a new product, form fields automatically populate with their defined default values.

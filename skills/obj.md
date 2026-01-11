# Object Utilities Skill

## Overview

The `hola-server/core/obj.js` module provides simple object manipulation helpers.

## Importing

```javascript
const { copy_obj, is_object } = require("hola-server/core/obj");
```

## API Reference

### `copy_obj(obj, attrs)`
Creates a shallow copy of an object containing only the specified attributes (whitelisting).
- **param**: `obj` (Object) - Source object.
- **param**: `attrs` (string[]) - Keys to copy.
- **returns**: `Object`

```javascript
const src = { a: 1, b: 2, c: 3 };
const dest = copy_obj(src, ['a', 'c']);
// dest is { a: 1, c: 3 }
```

### `is_object(obj)`
Checks if a value is a plain non-null object (excludes arrays and null).
- **param**: `obj` (*) - Value to check.
- **returns**: `boolean`

```javascript
is_object({}); // true
is_object([]); // false
is_object(null); // false
```

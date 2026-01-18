# Template & VM Utilities Skill (LHS)

## Overview

The `hola-server/core/lhs.js` module provides utilities for safe template execution and string interpolation using Node.js's `vm` module. It creates a sandboxed context with specific helper functions.

## Importing

```javascript
const { 
    get_context, run_in_context, 
    verify_template, execute_template 
} from "hola-server";
```

## API Reference

### `get_context()`
Returns a default context object containing number utility functions (`range`, `scale`, `space`).
- **returns**: `Object` - Context with helpers.

### `run_in_context(code, ctx)`
Executes JavaScript code within a provided context object.
- **param**: `code` (string) - JS code to run.
- **param**: `ctx` (Object) - Context object (modified by execution).
- **returns**: `Object` - The modified context.

```javascript
const ctx = { x: 10 };
run_in_context("y = x * 2", ctx);
// ctx.y is now 20
```

### `verify_template(template, knob)`
Verifies if a template string acts as valid JavaScript template literal when executed.
- **param**: `template` (string) - Template string (content inside backticks).
- **param**: `knob` (Object) - Variables available to the template.
- **returns**: `string|null` - Error message if invalid, `null` if valid.

```javascript
const err = verify_template("Hello ${name}", { name: "World" });
// err is null (valid)
```

### `execute_template(template, knob)`
Executes a template string using the provided variables.
- **param**: `template` (string) - Template content (without backticks).
- **param**: `knob` (Object) - Context variables.
- **returns**: `string` - interpolated result.

```javascript
const result = execute_template("Value: ${val * 2}", { val: 5 });
// result: "Value: 10"
```

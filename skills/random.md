# Random Utilities Skill

## Overview

The `hola-server/core/random.js` module provides simple random generation utilities.

## Importing

```javascript
const { random_code } = require("hola-server/core/random");
```

## API Reference

### `random_code()`
Generates a random 6-digit integer code (0 to 999999).
- **returns**: `number`

```javascript
const code = random_code();
// e.g., 123456
```

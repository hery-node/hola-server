# Random Utilities Skill

## Overview

The `hola-server/core/random.js` module provides simple random generation utilities.

## Importing

```javascript
import { random } from "hola-server";
// Use random.random_code()
```

## API Reference

### `random_code()`
Generates a random 6-digit integer code (0 to 999999).
- **returns**: `number`

```javascript
const code = random_code();
// e.g., 123456
```

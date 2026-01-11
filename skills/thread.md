# Thread Utilities Skill

## Overview

The `hola-server/core/thread.js` module provides utilities for controlling execution flow (threading/timing).

## Importing

```javascript
const { snooze } = require("hola-server/core/thread");
```

## API Reference

### `snooze(ms)`
Pauses execution for a specified duration (Non-blocking sleep).
- **param**: `ms` (number) - Milliseconds to wait.
- **returns**: `Promise<void>`

```javascript
await snooze(1000); // Waits for 1 second
```

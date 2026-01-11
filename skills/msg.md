# Message Utilities Skill

## Overview

The `hola-server/core/msg.js` module wraps the `wxmnode` library to provide a simplified interface for sending messages (e.g., WeChat Work or similar enterprise messengers).

## Importing

```javascript
const { init_wxm, send_msg } = require("hola-server/core/msg");
```

## API Reference

### `init_wxm(name, password)`
Initializes the underlying messaging client with credentials.
- **param**: `name` (string) - Account/Service name.
- **param**: `password` (string) - Credentials.

### `send_msg(content, type, detail)`
Sends a message asynchronously.
- **param**: `content` (string) - Main message body.
- **param**: `type` (string) - Message type identifier.
- **param**: `detail` (Object) - Additional metadata or payload options.
- **returns**: `Promise<Object>` - Result from the messaging service.

```javascript
await init_wxm("bot_account", "secret_token");
await send_msg("System Alert: Disk Full", "text", { priority: "high" });
```

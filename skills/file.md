# File Utilities Skill

## Overview

The `hola-server/core/file.js` module provides helpers for file path manipulation, file system checks, and reading from zip archives.

## Importing

```javascript
const {
    file_extension, file_prefix, is_file_exist, get_file_size,
    read_from_zip_by_extension, read_from_zip_by_prefix
} = require("hola-server/core/file");
```

## API Reference

### Path & File System

#### `file_extension(file_name)`
Gets extension from filename (without dot).
- **param**: `file_name` (string)
- **returns**: `string`

```javascript
file_extension("image.png"); // "png"
```

#### `file_prefix(file_name)`
Gets filename without extension.
- **param**: `file_name` (string)
- **returns**: `string`

```javascript
file_prefix("data.json"); // "data"
```

#### `is_file_exist(path)`
Synchronous check if file exists.
- **param**: `path` (string)
- **returns**: `boolean`

#### `get_file_size(path)`
Asynchronously gets file size in bytes.
- **param**: `path` (string)
- **returns**: `Promise<number>`

### Zip Archive Handling

#### `read_from_zip_by_extension(path, extension)`
Reads entries from a zip file matching the extension.
- **param**: `path` (string) - Path to zip file.
- **param**: `extension` (string) - Extension to filter (e.g., "json").
- **returns**: `Promise<Object[]>` - Array of unzipper file entries.

#### `read_from_zip_by_prefix(path, prefix)`
Reads entries from a zip file matching the filename prefix.
- **param**: `path` (string)
- **param**: `prefix` (string)
- **returns**: `Promise<Object[]>`

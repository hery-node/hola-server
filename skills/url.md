# URL & HTTP Utilities Skill

## Overview

The `hola-server/core/url.js` module provides a factory for creating pre-configured Axios request functions using system settings (like proxy configuration).

## Importing

```javascript
import { url } from "hola-server";
```

## API Reference

### `url(target_url, method)`
Creates a function that performs an HTTP request to the specified target.
- **param**: `target_url` (string) - The URL endpoint.
- **param**: `method` (string) - HTTP method ('GET', 'POST', etc.).
- **returns**: `Function` - `(config) => Promise`

#### Usage Example

```javascript
// 1. Create a reusable request function
const getGithubProfile = url("https://api.github.com/users/octocat", "GET");

// 2. Execute it (optionally passing axios config overrides/headers)
try {
    const response = await getGithubProfile({ headers: { 'User-Agent': 'node' } });
    console.log(response.data);
} catch (err) {
    console.error(err);
}
```

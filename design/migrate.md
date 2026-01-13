# TypeScript Migration for hola-server

Migrate hola-server from vanilla JavaScript to TypeScript with strict mode, ES Modules, updated dependencies, and a clean `src/` → `dist/` directory structure.

## Design Decisions

| Decision | Choice |
|----------|--------|
| TypeScript Mode | Strict (`"strict": true`) |
| Module System | ES Modules (`import/export`) |
| Source Directory | `src/` |
| Build Output | `dist/` |
| Test Files | Keep in JavaScript |
| Dependencies | Update all to latest |
| mongoist | Remove (use native MongoDB driver) |

## Code Quality

- **Use snake_case** for all function names and variable names (e.g., `get_entity_meta`, `user_data`)
- **Keep method calls and definitions on a single line** instead of wrapping arguments across multiple lines when possible
- Apply DRY principle - extract common patterns
- Add type annotations to all function signatures

## Breaking Changes

> [!IMPORTANT]
> This migration breaks backward compatibility. Existing `require('hola-server')` must update to ES Module imports: `import { ... } from 'hola-server'`.

> [!CAUTION]
> MongoDB driver upgrade v4.x → v6.x includes major API changes. The `mongoist` wrapper will be removed.

---

## Directory Structure

```
hola-server/
├── src/                    # TypeScript source
│   ├── core/              # Core utilities (18 files)
│   ├── db/                # Database modules (3 files)
│   ├── http/              # HTTP layer (8 files)
│   ├── router/            # Router handlers (5 files)
│   ├── tool/              # Tools (1 file)
│   ├── index.ts           # Main entry point
│   └── setting.ts         # Settings
├── dist/                   # Compiled JavaScript output
├── test/                   # Tests (remain in JS)
├── tsconfig.json          # TypeScript configuration
└── package.json           # Updated for ESM + TypeScript
```

---

## Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### package.json Updates
```diff
 {
   "name": "hola-server",
-  "version": "1.0.11",
+  "version": "3.0.0",
+  "type": "module",
-  "main": "index.js",
+  "main": "./dist/index.js",
+  "types": "./dist/index.d.ts",
+  "exports": {
+    ".": {
+      "types": "./dist/index.d.ts",
+      "import": "./dist/index.js"
+    }
+  },
   "scripts": {
-    "test": "mocha --timeout 10000 --recursive './test/*/*.js'"
+    "build": "tsc",
+    "test": "npm run build && mocha --timeout 10000 --recursive './test/*/*.js'",
+    "clean": "rm -rf dist"
   }
 }
```

---

## Dependency Updates

| Package | Current | New | Notes |
|---------|---------|-----|-------|
| axios | 0.27.2 | 1.7.0 | Major update |
| mongodb | 4.7.0 | 6.12.0 | Major update |
| mongoist | 2.5.4 | **REMOVE** | Use native driver |
| connect-mongo | 4.6.0 | 5.1.0 | Major update |
| express | 4.18.1 | 4.21.0 | Minor update |
| dateformat | 4.5.1 | 5.0.3 | Major update |
| unzipper | 0.10.11 | 0.14.0 | Minor update |
| node-cron | 3.0.2 | 3.0.3 | Patch |

### New Dev Dependencies
- `typescript`: ^5.7.0
- `@types/node`: ^22.0.0
- `@types/express`: ^5.0.0
- `@types/express-session`: ^1.18.0
- `@types/cors`: ^2.8.17
- `@types/multer`: ^1.4.12

---

## DB Module Changes

The `db/db.ts` module will be significantly refactored to remove `mongoist`:

```typescript
import { MongoClient, Db, Collection, ObjectId, Document } from 'mongodb';

export class DB {
  private client: MongoClient;
  private db: Db;
  
  constructor(url: string, options?: MongoClientOptions) {
    this.client = new MongoClient(url, options);
  }
  
  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db();
  }
  
  col<T extends Document>(name: string): Collection<T> {
    return this.db.collection<T>(name);
  }
}
```

---

## Verification Plan

### Build
```bash
npm run build
```

### Test
```bash
npm test
```

### Type Check
```bash
npx tsc --noEmit
```

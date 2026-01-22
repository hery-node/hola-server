# HTTP Response Codes Skill

## Overview

The `hola-server/http/code.js` module defines standard HTTP response codes used throughout the Hola framework for consistent error handling and status reporting.

**Important:** Hola framework returns all responses as JSON objects with `code` and optional `err` fields. The `code` values follow standard HTTP status codes for semantic clarity.

## Importing

```javascript
const {
    SUCCESS, ERROR,
    NO_SESSION, NO_RIGHTS, NO_PARAMS, NOT_FOUND,
    INVALID_PARAMS, REF_NOT_FOUND, REF_NOT_UNIQUE, HAS_REF,
    DUPLICATE_UNIQUE, NO_RESOURCE,
    IMPORT_EMPTY_KEY, IMPORT_WRONG_FIELDS, IMPORT_DUPLICATE_KEY, IMPORT_NO_FOUND_REF
} from "hola-server";
```

## Response Codes Reference

### Success & General Errors

| Code      | Value | HTTP Status           | Description         | Usage                                |
| --------- | ----- | --------------------- | ------------------- | ------------------------------------ |
| `SUCCESS` | 200   | OK                    | Operation succeeded | All successful operations            |
| `ERROR`   | 500   | Internal Server Error | General error       | Unexpected failures, database errors |

### Authentication & Authorization

| Code         | Value | HTTP Status  | Description              | Usage                                |
| ------------ | ----- | ------------ | ------------------------ | ------------------------------------ |
| `NO_SESSION` | 401   | Unauthorized | No valid session         | User not logged in                   |
| `NO_RIGHTS`  | 403   | Forbidden    | Insufficient permissions | User lacks required role/permissions |

### Validation & Parameters

| Code             | Value | HTTP Status          | Description                 | Usage                                        |
| ---------------- | ----- | -------------------- | --------------------------- | -------------------------------------------- |
| `NO_PARAMS`      | 400   | Bad Request          | Missing required parameters | Required fields not provided                 |
| `NOT_FOUND`      | 404   | Not Found            | Entity not found            | Query returned no results                    |
| `INVALID_PARAMS` | 422   | Unprocessable Entity | Invalid parameter values    | Type conversion failed, validation error     |
| `REF_NOT_FOUND`  | 404   | Not Found            | Referenced entity not found | Foreign key constraint violation             |
| `REF_NOT_UNIQUE` | 409   | Conflict             | Ambiguous reference         | Multiple entities match ref_label            |
| `HAS_REF`        | 409   | Conflict             | Entity has references       | Cannot delete due to foreign key constraints |

### Data Integrity

| Code               | Value | HTTP Status | Description               | Usage                                    |
| ------------------ | ----- | ----------- | ------------------------- | ---------------------------------------- |
| `DUPLICATE_UNIQUE` | 409   | Conflict    | Unique field value exists | Insert/update violates unique constraint |

### Resources

| Code          | Value | HTTP Status | Description        | Usage                          |
| ------------- | ----- | ----------- | ------------------ | ------------------------------ |
| `NO_RESOURCE` | 404   | Not Found   | Resource not found | Static file or route not found |

### Import Operations

| Code                   | Value | HTTP Status | Description                   | Usage                          |
| ---------------------- | ----- | ----------- | ----------------------------- | ------------------------------ |
| `IMPORT_EMPTY_KEY`     | 400   | Bad Request | Empty primary key in import   | CSV row missing key field      |
| `IMPORT_WRONG_FIELDS`  | 400   | Bad Request | Invalid fields in import      | CSV columns don't match entity |
| `IMPORT_DUPLICATE_KEY` | 409   | Conflict    | Duplicate key in import       | Multiple rows with same key    |
| `IMPORT_NO_FOUND_REF`  | 404   | Not Found   | Reference not found in import | Foreign key lookup failed      |

## Usage Examples

### Basic Response Pattern

```typescript
import { Elysia } from "elysia";
import { SUCCESS, NO_PARAMS } from "hola-server";
import { Entity } from "hola-server";

const app = new Elysia().post("/create", async ({ body }) => {
  const { name, email } = body as Record<string, unknown>;

  if (!name || !email) {
    return { code: NO_PARAMS, err: ["name", "email"] };
  }

  const result = await entity.create_entity(body as Record<string, unknown>, "*");
  return result; // Returns { code: SUCCESS } or { code: ERROR_CODE, err: [...] }
});
```

### Standard CRUD Operations

```typescript
import { Elysia } from "elysia";
import { SUCCESS } from "hola-server";

const router = new Elysia({ prefix: "/products" })
  // Create
  .post("/", async ({ body }) => {
    const result = await entity.create_entity(body as Record<string, unknown>, "*");
    return result;
  })

  // Read
  .get("/:id", async ({ params }) => {
    const result = await entity.read_entity(params.id, "name,email,age", "*");
    return result;
  })

  // Update
  .put("/:id", async ({ params, body }) => {
    const result = await entity.update_entity(params.id, body as Record<string, unknown>, "*");
    return result;
  })

  // Delete
  .delete("/:id", async ({ params }) => {
    const result = await entity.delete_entity([params.id]);
    return result;
  })

  // List
  .get("/", async ({ query }) => {
    const result = await entity.list_entity({ attr_names: "name,email", page: 1, limit: 20, sort_by: "created_at", desc: "true" }, {}, query, "*");
    return result;
  });
```

## Client-Side Helpers

The `hola-web/src/core` module provides convenience functions for interacting with the Hola API from Vue.js applications.

### Response Codes

The client-side defines response codes in `hola-web/src/core/code.ts` that mirror the server-side codes:

```typescript
import { SUCCESS, ERROR, NO_SESSION, NO_RIGHTS, NO_PARAMS, NOT_FOUND, INVALID_PARAMS, REF_NOT_FOUND, REF_NOT_UNIQUE, HAS_REF, DUPLICATE_UNIQUE, NO_RESOURCE, isSuccessResponse, isErrorResponse, isDuplicated, isBeenReferred, isNoSession } from "@/core";
```

### Importing Axios Helpers

```typescript
import { initAxios, saveEntity, readEntity, listEntity, deleteEntity, getEntityMeta, getRefLabels } from "@/core";
```

### Initialization

```typescript
// In main.ts or app setup
import { initAxios, NO_SESSION } from "@/core";

initAxios(
  { baseURL: "http://localhost:3000/api" },
  {
    handleResponse: (code, data) => {
      // Custom response handling
      if (code === NO_SESSION) {
        router.push("/login");
      }
    },
  },
);
```

### Response Code Checking

```typescript
import { isSuccessResponse, isDuplicated, isBeenReferred, saveEntity } from "@/core";

const result = await saveEntity("product", formData, false);

if (isSuccessResponse(result.code)) {
  message.success(t("msg.saved_successfully"));
} else if (isDuplicated(result.code)) {
  message.error(t("msg.already_exists"));
} else if (isBeenReferred(result.code)) {
  message.error(t("msg.cannot_delete_referenced", { refs: result.err.join(", ") }));
}
```

**Available Checkers:**

- `isSuccessResponse(code)` - Code is SUCCESS (200)
- `isErrorResponse(code)` - Code is ERROR (500)
- `isDuplicated(code)` - Code is DUPLICATE_UNIQUE (409)
- `isUniqueDuplicated(code)` - Code is DUPLICATE_UNIQUE (409)
- `isBeenReferred(code)` - Code is HAS_REF (423)
- `hasInvalidParams(code)` - Code is INVALID_PARAMS (422)
- `isNoSession(code)` - Code is NO_SESSION (401)
- `isNoRights(code)` - Code is NO_RIGHTS (403)
- `isNotFound(code)` - Code is NOT_FOUND (404)

### Entity Operations

#### Create/Update Entity

```typescript
import { saveEntity, isSuccessResponse } from "@/core";

// Create (editMode = false)
const result = await saveEntity(
  "product",
  {
    name: "iPhone 15",
    price: 999,
    category: "Electronics",
  },
  false,
);

// Update (editMode = true)
const result = await saveEntity(
  "product",
  {
    _id: "507f...",
    price: 899,
  },
  true,
);

// Clone (editMode = true, clone = true)
const result = await saveEntity(
  "product",
  {
    _id: "507f...",
    name: "iPhone 15 Pro",
  },
  true,
  true,
);

if (isSuccessResponse(result.code)) {
  message.success(t("msg.saved_successfully"));
}
```

#### Read Entity

```typescript
import { readEntity, readProperty } from "@/core";

// Read with references expanded
const product = await readEntity("product", "507f...", "name,price,category");
// product.category will be "Electronics" (ref_label)

// Read without reference expansion (faster)
const product = await readProperty("product", "507f...", "name,price,category");
// product.category will be ObjectId
```

#### List Entities

```typescript
import { listEntity, isSuccessResponse } from "@/core";

const result = await listEntity(
  "product",
  { category: "Electronics", min_price: 500 }, // Search params
  {
    attr_names: "name,price,category",
    page: 1,
    limit: 20,
    sort_by: "price",
    desc: "false",
  },
);

if (isSuccessResponse(result.code)) {
  products.value = result.data;
  total.value = result.total;
}
```

#### Query Entities

```typescript
import { queryEntity } from "@/core";

// Get all active products
const result = await queryEntity("product", ["name", "price"], { active: true });

if (is_success_response(result.code)) {
  this.products = result.data;
}
```

#### Delete Entities

```typescript
import { deleteEntity, isSuccessResponse, isBeenReferred } from "@/core";

const result = await deleteEntity("product", ["507f...", "608a..."]);

if (isSuccessResponse(result.code)) {
  message.success("Deleted");
} else if (isBeenReferred(result.code)) {
  message.error("Cannot delete: referenced by " + result.err.join(", "));
}
```

### Metadata Operations

#### Get Entity Meta

```typescript
import { getEntityMeta } from "@/core";

const meta = await getEntityMeta("product");
// Returns meta definition or null
// Result is cached automatically
```

#### Get Reference Labels

```typescript
import { getRefLabels } from "@/core";

// Get all categories for dropdown
const categories = await getRefLabels("category", "product");
// Returns array of { _id, ref_label } objects
```

### File Operations

#### Upload File

```typescript
import { axiosUpload } from "@/core";

const file = fileInputRef.value.files[0];
const result = await axiosUpload("/api/upload", file);
```

#### Download File

```typescript
import { axiosDownload } from "@/core";

axiosDownload("/api/export", "export.csv", { format: "csv" });
// Triggers browser download
```

### Complete Vue Component Example

```vue
<template>
  <div>
    <el-form :model="form">
      <el-form-item label="Name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="Price">
        <el-input-number v-model="form.price" />
      </el-form-item>
      <el-button @click="save">Save</el-button>
    </el-form>

    <el-table :data="list">
      <el-table-column prop="name" label="Name" />
      <el-table-column prop="price" label="Price" />
      <el-table-column>
        <template #default="{ row }">
          <el-button @click="deleteItem(row._id)">Delete</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { saveEntity, listEntity, deleteEntity, isSuccessResponse } from "@/core";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";

const { t } = useI18n();

const form = ref({ name: "", price: 0 });
const list = ref([]);
const total = ref(0);

const save = async () => {
  const result = await saveEntity("product", form.value, false);

  if (isSuccessResponse(result.code)) {
    ElMessage.success(t("msg.saved_successfully"));
    form.value = { name: "", price: 0 };
    loadList();
  } else {
    ElMessage.error(t("msg.save_failed", { err: JSON.stringify(result.err) }));
  }
};

const loadList = async () => {
  const result = await listEntity(
    "product",
    {},
    {
      attr_names: "name,price",
      page: 1,
      limit: 20,
      sort_by: "created_at",
      desc: "true",
    },
  );

  if (isSuccessResponse(result.code)) {
    list.value = result.data;
    total.value = result.total;
  }
};

const deleteItem = async (id: string) => {
  const result = await deleteEntity("product", [id]);

  if (isSuccessResponse(result.code)) {
    ElMessage.success(t("msg.deleted_successfully"));
    loadList();
  } else {
    ElMessage.error(t("msg.delete_failed", { err: JSON.stringify(result.err) }));
  }
};

onMounted(() => {
  loadList();
});
</script>
```

# HTTP Response Codes Skill

## Overview

The `hola-server/http/code.js` module defines standard response codes used throughout the Hola framework for consistent error handling and status reporting.

**Important:** Hola framework returns all responses as JSON objects with `code` and optional `err` fields. Do not map these codes to HTTP status codes - always return `200 OK` with the code in the JSON body.

## Importing

```javascript
const { 
    SUCCESS, ERROR, 
    NO_SESSION, NO_RIGHTS, NO_PARAMS, NOT_FOUND, 
    INVALID_PARAMS, REF_NOT_FOUND, REF_NOT_UNIQUE, HAS_REF,
    DUPLICATE_KEY, NO_RESOURCE,
    IMPORT_EMPTY_KEY, IMPORT_WRONG_FIELDS, IMPORT_DUPLICATE_KEY, IMPORT_NO_FOUND_REF
} from "hola-server";
```

## Response Codes Reference

### Success & General Errors

| Code | Value | Description | Usage |
|------|-------|-------------|-------|
| `SUCCESS` | 1 | Operation succeeded | All successful operations |
| `ERROR` | 0 | General error | Unexpected failures, database errors |

### Authentication & Authorization (200-299)

| Code | Value | Description | Usage |
|------|-------|-------------|-------|
| `NO_SESSION` | 200 | No valid session | User not logged in |
| `NO_RIGHTS` | 201 | Insufficient permissions | User lacks required role/permissions |

### Validation & Parameters (202-207)

| Code | Value | Description | Usage |
|------|-------|-------------|-------|
| `NO_PARAMS` | 202 | Missing required parameters | Required fields not provided |
| `NOT_FOUND` | 203 | Entity not found | Query returned no results |
| `INVALID_PARAMS` | 204 | Invalid parameter values | Type conversion failed, validation error |
| `REF_NOT_FOUND` | 205 | Referenced entity not found | Foreign key constraint violation |
| `REF_NOT_UNIQUE` | 206 | Ambiguous reference | Multiple entities match ref_label |
| `HAS_REF` | 207 | Entity has references | Cannot delete due to foreign key constraints |

### Data Integrity (300-399)

| Code | Value | Description | Usage |
|------|-------|-------------|-------|
| `DUPLICATE_KEY` | 300 | Primary key already exists | Insert/update violates uniqueness |

### Resources (400-499)

| Code | Value | Description | Usage |
|------|-------|-------------|-------|
| `NO_RESOURCE` | 404 | Resource not found | Static file or route not found |

### Import Operations (100-199)

| Code | Value | Description | Usage |
|------|-------|-------------|-------|
| `IMPORT_EMPTY_KEY` | 100 | Empty primary key in import | CSV row missing key field |
| `IMPORT_WRONG_FIELDS` | 101 | Invalid fields in import | CSV columns don't match entity |
| `IMPORT_DUPLICATE_KEY` | 102 | Duplicate key in import | Multiple rows with same key |
| `IMPORT_NO_FOUND_REF` | 103 | Reference not found in import | Foreign key lookup failed |

## Usage Examples

### Basic Response Pattern

```javascript
import { code } from "hola-server";
// Use code.SUCCESS, code.NO_PARAMS, etc.

router.post("/create", async (req, res) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
        return res.json({ code: NO_PARAMS, err: ["name", "email"] });
    }
    
    const result = await entity.create_entity(req.body, "*");
    return res.json(result);  // Returns { code: SUCCESS } or { code: ERROR_CODE, err: [...] }
});
```

### Standard CRUD Operations

```javascript
import { code } from "hola-server";
// Use code.SUCCESS, code.NO_PARAMS, etc.

// Create
router.post("/", async (req, res) => {
    const result = await entity.create_entity(req.body, "*");
    return res.json(result);
});

// Read
router.get("/:id", async (req, res) => {
    const result = await entity.read_entity(req.params.id, "name,email,age", "*");
    return res.json(result);
});

// Update
router.put("/:id", async (req, res) => {
    const result = await entity.update_entity(req.params.id, req.body, "*");
    return res.json(result);
});

// Delete
router.delete("/", async (req, res) => {
    const result = await entity.delete_entity(req.body.ids);
    return res.json(result);
});

// List
router.get("/", async (req, res) => {
    const result = await entity.list_entity(
        { attr_names: "name,email", page: 1, limit: 20, sort_by: "created_at", desc: "true" },
        {},
        {},
        "*"
    );
    return res.json(result);
});
```

## Client-Side Helpers

The `hola-web/src/core/axios.js` module provides convenience functions for interacting with the Hola API from Vue.js applications.

### Importing

```javascript
import { 
    init_axios,
    is_success_response,
    save_entity,
    read_entity,
    list_entity,
    delete_entity,
    get_entity_meta,
    get_ref_labels
} from "@/core/axios";
```

### Initialization

```javascript
// In main.js or app setup
import { init_axios } from "@/core/axios";

init_axios(
    { baseURL: "http://localhost:3000/api" },
    {
        handle_response: (code, data) => {
            // Custom response handling
            if (code === 200) {  // NO_SESSION
                router.push("/login");
            }
        }
    }
);
```

### Response Code Checking

```javascript
import { is_success_response, is_duplicated, is_been_referred } from "@/core/axios";

const result = await save_entity("product", form_data, false);

if (is_success_response(result.code)) {
    this.$message.success(this.$t("msg.saved_successfully"));
} else if (is_duplicated(result.code)) {
    this.$message.error(this.$t("msg.already_exists"));
} else if (is_been_referred(result.code)) {
    this.$message.error(this.$t("msg.cannot_delete_referenced", { refs: result.err.join(", ") }));
}
```

**Available Checkers:**
- `is_success_response(code)` - Code is SUCCESS (1)
- `is_error_response(code)` - Code is ERROR (0)
- `is_duplicated(code)` - Code is DUPLICATE_KEY
- `is_been_referred(code)` - Code is HAS_REF
- `has_invalid_params(code)` - Code is INVALID_PARAMS
- `is_no_session(code)` - Code is NO_SESSION

### Entity Operations

#### Create/Update Entity

```javascript
import { save_entity, is_success_response } from "@/core/axios";

// Create (edit_mode = false)
const result = await save_entity("product", {
    name: "iPhone 15",
    price: 999,
    category: "Electronics"
}, false);

// Update (edit_mode = true)
const result = await save_entity("product", {
    _id: "507f...",
    price: 899
}, true);

// Clone (edit_mode = true, clone = true)
const result = await save_entity("product", {
    _id: "507f...",
    name: "iPhone 15 Pro"
}, true, true);

if (is_success_response(result.code)) {
    this.$message.success(this.$t("msg.saved_successfully"));
}
```

#### Read Entity

```javascript
import { read_entity, read_property } from "@/core/axios";

// Read with references expanded
const product = await read_entity("product", "507f...", "name,price,category");
// product.category will be "Electronics" (ref_label)

// Read without reference expansion (faster)
const product = await read_property("product", "507f...", "name,price,category");
// product.category will be ObjectId
```

#### List Entities

```javascript
import { list_entity } from "@/core/axios";

const result = await list_entity(
    "product",
    { category: "Electronics", min_price: 500 },  // Search params
    {
        attr_names: "name,price,category",
        page: 1,
        limit: 20,
        sort_by: "price",
        desc: "false"
    }
);

if (is_success_response(result.code)) {
    this.products = result.data;
    this.total = result.total;
}
```

#### Query Entities

```javascript
import { query_entity } from "@/core/axios";

// Get all active products
const result = await query_entity(
    "product",
    ["name", "price"],
    { active: true }
);

if (is_success_response(result.code)) {
    this.products = result.data;
}
```

#### Delete Entities

```javascript
import { delete_entity, is_success_response, is_been_referred } from "@/core/axios";

const result = await delete_entity("product", ["507f...", "608a..."]);

if (is_success_response(result.code)) {
    this.$message.success("Deleted");
} else if (is_been_referred(result.code)) {
    this.$message.error("Cannot delete: referenced by " + result.err.join(", "));
}
```

### Metadata Operations

#### Get Entity Meta

```javascript
import { get_entity_meta } from "@/core/axios";

const meta = await get_entity_meta("product");
// Returns meta definition or null
// Result is cached automatically
```

#### Get Reference Labels

```javascript
import { get_ref_labels } from "@/core/axios";

// Get all categories for dropdown
const categories = await get_ref_labels("category", "product");
// Returns array of { _id, ref_label } objects
```

### File Operations

#### Upload File

```javascript
import { axios_upload } from "@/core/axios";

const file = this.$refs.fileInput.files[0];
const result = await axios_upload("/api/upload", file);
```

#### Download File

```javascript
import { axios_download } from "@/core/axios";

axios_download("/api/export", "export.csv", { format: "csv" });
// Triggers browser download
```

### Complete Vue Component Example

```vue
<template>
  <div>
    <el-form :model="form">
      <el-form-item label="Name">
        <el-input v-model="form.name"></el-input>
      </el-form-item>
      <el-form-item label="Price">
        <el-input-number v-model="form.price"></el-input-number>
      </el-form-item>
      <el-button @click="save">Save</el-button>
    </el-form>
    
    <el-table :data="list">
      <el-table-column prop="name" label="Name"></el-table-column>
      <el-table-column prop="price" label="Price"></el-table-column>
      <el-table-column>
        <template #default="{ row }">
          <el-button @click="deleteItem(row._id)">Delete</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { 
    save_entity, 
    list_entity, 
    delete_entity,
    is_success_response 
} from "@/core/axios";

export default {
  data() {
    return {
      form: { name: "", price: 0 },
      list: [],
      total: 0
    };
  },
  
  mounted() {
    this.loadList();
  },
  
  methods: {
    async save() {
      const result = await save_entity("product", this.form, false);
      
      if (is_success_response(result.code)) {
        this.$message.success(this.$t("msg.saved_successfully"));
        this.form = { name: "", price: 0 };
        this.loadList();
      } else {
        this.$message.error(this.$t("msg.save_failed", { err: JSON.stringify(result.err) }));
      }
    },
    
    async loadList() {
      const result = await list_entity("product", {}, {
        attr_names: "name,price",
        page: 1,
        limit: 20,
        sort_by: "created_at",
        desc: "true"
      });
      
      if (is_success_response(result.code)) {
        this.list = result.data;
        this.total = result.total;
      }
    },
    
    async deleteItem(id) {
      const result = await delete_entity("product", [id]);
      
      if (is_success_response(result.code)) {
        this.$message.success(this.$t("msg.deleted_successfully"));
        this.loadList();
      } else {
        this.$message.error(this.$t("msg.delete_failed", { err: JSON.stringify(result.err) }));
      }
    }
  }
};
</script>
```


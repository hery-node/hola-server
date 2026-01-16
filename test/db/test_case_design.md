# Test Case Design for hola-server/db Module

This document outlines detailed test case designs for the API methods in the `db` module. The module consists of three classes:

1. **DB** (`db.js`) - Low-level MongoDB operations wrapper
2. **Entity** (`entity.js`) - Metadata-driven entity CRUD operations
3. **GridFS** (`gridfs.js`) - GridFS file storage utilities

---

## 1. DB Class Test Cases (`db.js`)

### 1.1 ObjectId Utilities

#### `oid(id)`

| Test ID | Description                                   | Input                        | Expected Behavior              |
| ------- | --------------------------------------------- | ---------------------------- | ------------------------------ |
| OID-001 | Create ObjectId from valid 24-char hex string | `"507f1f77bcf86cd799439011"` | Returns valid MongoDB ObjectId |
| OID-002 | Create ObjectId from null                     | `null`                       | Throws error or returns null   |
| OID-003 | Create ObjectId from invalid string           | `"invalid-id"`               | Throws error                   |
| OID-004 | Create ObjectId from empty string             | `""`                         | Throws error                   |

#### `oid_query(id)`

| Test ID  | Description                      | Input                        | Expected Behavior                |
| -------- | -------------------------------- | ---------------------------- | -------------------------------- |
| OIDQ-001 | Build query from valid id string | `"507f1f77bcf86cd799439011"` | Returns `{ _id: ObjectId(...) }` |
| OIDQ-002 | Build query from invalid id      | `"invalid-id"`               | Returns `null`                   |
| OIDQ-003 | Build query from undefined       | `undefined`                  | Returns `null`                   |
| OIDQ-004 | Build query from null            | `null`                       | Returns `null`                   |

#### `oid_queries(ids)`

| Test ID   | Description                           | Input                  | Expected Behavior                 |
| --------- | ------------------------------------- | ---------------------- | --------------------------------- |
| OIDQS-001 | Build $in query from valid id array   | `["id1", "id2"]`       | Returns `{ _id: { $in: [...] } }` |
| OIDQS-002 | Build $in query with some invalid ids | `["valid", "invalid"]` | Returns `null`                    |
| OIDQS-003 | Build $in query from empty array      | `[]`                   | Returns `null` or empty query     |
| OIDQS-004 | Build $in query from mixed valid ids  | Multiple valid ids     | Returns proper $in query          |

---

### 1.2 DB Class Constructor

#### `constructor(url, options, callback)`

| Test ID | Description                       | Input                    | Expected Behavior                    |
| ------- | --------------------------------- | ------------------------ | ------------------------------------ |
| DBC-001 | Initialize with valid MongoDB URL | Valid URL                | DB instance created successfully     |
| DBC-002 | Initialize without URL            | `null` or `undefined`    | Throws "Mongo url is required" error |
| DBC-003 | Initialize with callback          | URL + callback function  | Callback invoked on connection       |
| DBC-004 | Initialize with options           | URL + connection options | Options applied correctly            |

---

### 1.3 CRUD Operations

#### `create(code, obj)`

| Test ID | Description                                | Input                      | Expected Behavior                    |
| ------- | ------------------------------------------ | -------------------------- | ------------------------------------ |
| CRT-001 | Create document with simple fields         | Collection + simple object | Returns inserted document with `_id` |
| CRT-002 | Create document with nested object         | Object with nested data    | Nested data preserved                |
| CRT-003 | Create document with Date field            | Object with Date           | Date stored correctly                |
| CRT-004 | Create document with array field           | Object with array          | Array stored correctly               |
| CRT-005 | Create document with dotted key            | Object with "name.key"     | Dotted key preserved                 |
| CRT-006 | Create document in non-existent collection | New collection name        | Collection auto-created              |

#### `update(code, query, obj)`

| Test ID | Description                    | Input                       | Expected Behavior                  |
| ------- | ------------------------------ | --------------------------- | ---------------------------------- |
| UPD-001 | Update existing document       | Matching query + update obj | Document updated                   |
| UPD-002 | Update with upsert (no match)  | Non-matching query          | New document created               |
| UPD-003 | Update multiple documents      | Query matching multiple     | All matching docs updated          |
| UPD-004 | Update specific fields only    | Partial update object       | Only specified fields changed      |
| UPD-005 | Update with $set operator      | `{ $set: {...} }`           | Correct MongoDB $set behavior      |
| UPD-006 | Update non-existent collection | New collection + upsert     | Document created in new collection |

#### `delete(code, query)`

| Test ID | Description                         | Input                  | Expected Behavior         |
| ------- | ----------------------------------- | ---------------------- | ------------------------- |
| DEL-001 | Delete single document              | Query matching one doc | One document removed      |
| DEL-002 | Delete multiple documents           | Query matching many    | All matching docs removed |
| DEL-003 | Delete with empty query             | `{}`                   | All documents removed     |
| DEL-004 | Delete no match                     | Non-matching query     | No error, 0 deleted       |
| DEL-005 | Delete from non-existent collection | Invalid collection     | No error                  |

---

### 1.4 Query Operations

#### `find(code, query, attr)`

| Test ID | Description                    | Input                  | Expected Behavior              |
| ------- | ------------------------------ | ---------------------- | ------------------------------ |
| FND-001 | Find all documents             | Empty query `{}`       | Returns all documents          |
| FND-002 | Find with simple filter        | `{ name: "test" }`     | Returns matching docs          |
| FND-003 | Find with projection           | Query + `{ name: 1 }`  | Only specified fields returned |
| FND-004 | Find with exclusion projection | `{ password: 0 }`      | Specified field excluded       |
| FND-005 | Find no matches                | Non-matching query     | Returns empty array            |
| FND-006 | Find with comparison operators | `{ age: { $gt: 18 } }` | Returns correct matches        |

#### `find_one(code, query, attr)`

| Test ID | Description                    | Input               | Expected Behavior        |
| ------- | ------------------------------ | ------------------- | ------------------------ |
| FNO-001 | Find one existing document     | Matching query      | Returns single document  |
| FNO-002 | Find one with multiple matches | Query matching many | Returns first match only |
| FNO-003 | Find one no match              | Non-matching query  | Returns `null`           |
| FNO-004 | Find one with projection       | Query + attr        | Only specified fields    |

#### `find_sort(code, query, sort, attr)`

| Test ID | Description              | Input                  | Expected Behavior                 |
| ------- | ------------------------ | ---------------------- | --------------------------------- |
| FNS-001 | Sort ascending by field  | `{ age: 1 }`           | Ascending order                   |
| FNS-002 | Sort descending by field | `{ age: -1 }`          | Descending order                  |
| FNS-003 | Sort by multiple fields  | `{ name: 1, age: -1 }` | Multi-field sort                  |
| FNS-004 | Sort with projection     | Sort + projection      | Sorted with specified fields only |
| FNS-005 | Sort empty collection    | Empty result set       | Returns empty array               |

#### `find_page(code, query, sort, page, limit, attr)`

| Test ID | Description                    | Input                       | Expected Behavior      |
| ------- | ------------------------------ | --------------------------- | ---------------------- |
| FNP-001 | Get first page                 | page=1, limit=10            | First 10 documents     |
| FNP-002 | Get middle page                | page=2, limit=5             | Documents 6-10         |
| FNP-003 | Get last partial page          | page beyond full pages      | Remaining documents    |
| FNP-004 | Page with limit 0              | limit=0                     | Empty array or default |
| FNP-005 | Page with negative page number | page=-1                     | Error or defaults to 1 |
| FNP-006 | Consistent pagination order    | Same params, multiple calls | Same order guaranteed  |
| FNP-007 | Page with sort and projection  | All options combined        | Correct pagination     |

---

### 1.5 Aggregate Operations

#### `count(code, query)`

| Test ID | Description            | Input              | Expected Behavior       |
| ------- | ---------------------- | ------------------ | ----------------------- |
| CNT-001 | Count all documents    | Empty query        | Total document count    |
| CNT-002 | Count with filter      | Filter query       | Matching document count |
| CNT-003 | Count empty collection | Empty collection   | Returns 0               |
| CNT-004 | Count no matches       | Non-matching query | Returns 0               |

#### `sum(code, query, field)`

| Test ID | Description                | Input               | Expected Behavior               |
| ------- | -------------------------- | ------------------- | ------------------------------- |
| SUM-001 | Sum numeric field          | Valid numeric field | Correct sum                     |
| SUM-002 | Sum with filter            | Query + field       | Sum of matching docs only       |
| SUM-003 | Sum empty result           | No matches          | Returns 0                       |
| SUM-004 | Sum non-numeric field      | String field        | Returns 0 or handles gracefully |
| SUM-005 | Sum non-existent field     | Invalid field name  | Returns 0                       |
| SUM-006 | Sum with mixed null values | Some docs have null | Handles nulls correctly         |

---

### 1.6 Array Operations

#### `push(code, query, ele)`

| Test ID | Description                | Input               | Expected Behavior          |
| ------- | -------------------------- | ------------------- | -------------------------- |
| PSH-001 | Push to existing array     | `{ tags: "new" }`   | Element added to array     |
| PSH-002 | Push duplicate element     | Same element twice  | Duplicate added            |
| PSH-003 | Push to non-existent array | New field           | Array created with element |
| PSH-004 | Push to multiple documents | Query matching many | All docs updated           |

#### `pull(code, query, ele)`

| Test ID | Description               | Input                | Expected Behavior         |
| ------- | ------------------------- | -------------------- | ------------------------- |
| PLL-001 | Pull existing element     | Matching element     | Element removed           |
| PLL-002 | Pull non-existent element | Non-matching element | No error, array unchanged |
| PLL-003 | Pull all occurrences      | Duplicate elements   | All occurrences removed   |

#### `add_to_set(code, query, ele)`

| Test ID | Description               | Input            | Expected Behavior  |
| ------- | ------------------------- | ---------------- | ------------------ |
| ATS-001 | Add unique element        | New element      | Element added      |
| ATS-002 | Add duplicate element     | Existing element | No duplicate added |
| ATS-003 | Add to non-existent array | New field        | Array created      |

---

### 1.7 Bulk Operations

#### `bulk_update(col, items, attrs)`

| Test ID | Description                | Input                   | Expected Behavior       |
| ------- | -------------------------- | ----------------------- | ----------------------- |
| BLK-001 | Bulk upsert new items      | New items array         | All items inserted      |
| BLK-002 | Bulk update existing items | Matching attr items     | Items updated           |
| BLK-003 | Bulk mixed insert/update   | Some new, some existing | Correct upsert behavior |
| BLK-004 | Bulk with single attr key  | Single attr in array    | Correct key matching    |
| BLK-005 | Bulk with composite key    | Multiple attrs          | Composite key matching  |
| BLK-006 | Bulk empty items           | Empty array             | No error                |

---

### 1.8 Logging Functions

#### `log_debug/log_info/log_warn/log_error`

| Test ID | Description               | Input                        | Expected Behavior        |
| ------- | ------------------------- | ---------------------------- | ------------------------ |
| LOG-001 | Log debug when enabled    | Debug message                | Log persisted if enabled |
| LOG-002 | Log error with extra data | Message + `{ code: 500 }`    | Extra data saved         |
| LOG-003 | Log when save_db disabled | Any log call                 | No database write        |
| LOG-004 | Log with user session     | Request with user            | user_id captured         |
| LOG-005 | Log categories            | Different LOG\_\* categories | Category saved correctly |
| LOG-006 | Log level filtering       | Lower than configured level  | Log not persisted        |

---

### 1.9 Connection Management

#### `get_db(callback)`

| Test ID | Description                  | Input             | Expected Behavior       |
| ------- | ---------------------------- | ----------------- | ----------------------- |
| GDB-001 | Get singleton instance       | First call        | New DB instance created |
| GDB-002 | Get singleton instance again | Second call       | Same instance returned  |
| GDB-003 | Get with callback            | Callback function | Callback invoked        |

#### `close_db()`

| Test ID | Description           | Input             | Expected Behavior |
| ------- | --------------------- | ----------------- | ----------------- |
| CDB-001 | Close open connection | Active connection | Connection closed |
| CDB-002 | Close already closed  | Closed connection | No error          |

---

## 2. Entity Class Test Cases (`entity.js`)

### 2.1 Constructor & Initialization

#### `constructor(meta)`

| Test ID | Description                              | Input                  | Expected Behavior           |
| ------- | ---------------------------------------- | ---------------------- | --------------------------- |
| ENT-001 | Initialize with meta object              | Meta definition object | Entity initialized          |
| ENT-002 | Initialize with string (collection name) | `"users"`              | Meta resolved from registry |
| ENT-003 | Initialize with undefined meta           | `undefined`            | Error or default behavior   |

---

### 2.2 Entity CRUD Operations

#### `list_entity(query_params, query, param_obj, view)`

| Test ID | Description                    | Input               | Expected Behavior           |
| ------- | ------------------------------ | ------------------- | --------------------------- |
| LST-001 | List all entities              | Empty params        | Returns all with pagination |
| LST-002 | List with search filters       | Search params       | Filtered results            |
| LST-003 | List with pagination           | page=2, limit=10    | Correct page returned       |
| LST-004 | List with sort                 | Sort params         | Sorted results              |
| LST-005 | List with view filter          | Specific view       | View-filtered fields        |
| LST-006 | List returns total count       | Any query           | Total count in response     |
| LST-007 | List with comparison operators | `>=100`, `<50`      | Comparison query built      |
| LST-008 | List with regex search         | String search value | Regex query applied         |

#### `create_entity(param_obj, view)`

| Test ID | Description                        | Input                  | Expected Behavior                   |
| ------- | ---------------------------------- | ---------------------- | ----------------------------------- |
| CRE-001 | Create with valid data             | Required fields        | Entity created with SUCCESS         |
| CRE-002 | Create with missing required field | Incomplete data        | Returns NO_PARAMS or INVALID_PARAMS |
| CRE-003 | Create with duplicate primary key  | Existing key           | Returns DUPLICATE_KEY               |
| CRE-004 | Create triggers before_create hook | Data with hook defined | Hook executed                       |
| CRE-005 | Create triggers after_create hook  | Data with hook defined | Hook executed                       |
| CRE-006 | Create with ref field validation   | Invalid ref value      | Returns REF_NOT_FOUND               |
| CRE-007 | Create with ref_label resolution   | Ref label string       | Resolved to ObjectId                |
| CRE-008 | Create with view-filtered fields   | Fields not in view     | Extra fields ignored                |

#### `update_entity(_id, param_obj, view)`

| Test ID | Description                        | Input                       | Expected Behavior     |
| ------- | ---------------------------------- | --------------------------- | --------------------- |
| UPE-001 | Update existing entity             | Valid \_id + update data    | Entity updated        |
| UPE-002 | Update non-existent entity         | Invalid \_id                | Returns NOT_FOUND     |
| UPE-003 | Update with invalid \_id format    | Malformed \_id              | Returns error         |
| UPE-004 | Update triggers before_update hook | Hook defined                | Hook executed         |
| UPE-005 | Update by primary key              | null \_id + primary key obj | Updated by PK         |
| UPE-006 | Update with invalid ref            | Bad ref value               | Returns REF_NOT_FOUND |
| UPE-007 | Update readonly fields             | Try to update readonly      | Fields unchanged      |

#### `clone_entity(_id, param_obj, view)`

| Test ID | Description                | Input                  | Expected Behavior     |
| ------- | -------------------------- | ---------------------- | --------------------- |
| CLN-001 | Clone existing entity      | Valid source \_id      | New entity created    |
| CLN-002 | Clone with override values | \_id + override params | Overrides applied     |
| CLN-003 | Clone non-existent entity  | Invalid \_id           | Returns NOT_FOUND     |
| CLN-004 | Clone with duplicate key   | Conflicting key        | Returns DUPLICATE_KEY |

#### `batch_update_entity(_ids, param_obj, view)`

| Test ID | Description                    | Input                   | Expected Behavior        |
| ------- | ------------------------------ | ----------------------- | ------------------------ |
| BAT-001 | Batch update multiple entities | Array of \_ids          | All entities updated     |
| BAT-002 | Batch update with some invalid | Mixed valid/invalid ids | Partial success or error |
| BAT-003 | Batch update empty array       | `[]`                    | No-op or error           |

#### `read_entity(_id, attr_names, view)`

| Test ID | Description                   | Input                  | Expected Behavior        |
| ------- | ----------------------------- | ---------------------- | ------------------------ |
| REE-001 | Read existing entity          | Valid \_id             | Returns entity data      |
| REE-002 | Read with specific attributes | \_id + "name,age"      | Only specified attrs     |
| REE-003 | Read non-existent entity      | Invalid \_id           | Returns NOT_FOUND        |
| REE-004 | Read with ref conversion      | Entity with ref fields | Refs resolved to labels  |
| REE-005 | Read with link attributes     | Entity with links      | Link data populated      |
| REE-006 | Read with view filter         | Specific view          | View-allowed fields only |

#### `read_property(_id, attr_names, view)`

| Test ID | Description              | Input            | Expected Behavior              |
| ------- | ------------------------ | ---------------- | ------------------------------ |
| REP-001 | Read raw properties      | Valid \_id       | Returns without ref conversion |
| REP-002 | Read specific properties | \_id + attr list | Only specified attrs           |

#### `delete_entity(id_array)`

| Test ID | Description                        | Input                       | Expected Behavior          |
| ------- | ---------------------------------- | --------------------------- | -------------------------- |
| DLE-001 | Delete single entity               | Single \_id array           | Entity deleted             |
| DLE-002 | Delete multiple entities           | Multiple \_ids              | All deleted                |
| DLE-003 | Delete with references             | Entity referenced elsewhere | Returns HAS_REF            |
| DLE-004 | Delete triggers before_delete hook | Hook defined                | Hook executed              |
| DLE-005 | Delete non-existent                | Invalid \_id                | Returns NOT_FOUND or no-op |
| DLE-006 | Delete with cascade                | Referencing entities exist  | Error or cascade           |

---

### 2.3 Reference Validation

#### `validate_ref(param_obj)`

| Test ID | Description                  | Input             | Expected Behavior      |
| ------- | ---------------------------- | ----------------- | ---------------------- |
| VRF-001 | Validate existing ref value  | Valid ObjectId    | Returns SUCCESS        |
| VRF-002 | Validate by ref_label        | Label string      | Resolves to ObjectId   |
| VRF-003 | Validate non-existent ref    | Invalid ref value | Returns REF_NOT_FOUND  |
| VRF-004 | Validate ambiguous ref_label | Multiple matches  | Returns REF_NOT_UNIQUE |
| VRF-005 | Validate with ref_filter     | Filter applied    | Filtered validation    |

---

### 2.4 Search Query Building

#### `get_search_query(param_obj)`

| Test ID | Description                   | Input                          | Expected Behavior                      |
| ------- | ----------------------------- | ------------------------------ | -------------------------------------- |
| GSQ-001 | Build query from string field | `{ name: "test" }`             | Regex query built                      |
| GSQ-002 | Build query with comparison   | `{ age: ">=18" }`              | `$gte` operator                        |
| GSQ-003 | Build query with exact match  | Boolean/number field           | Exact match query                      |
| GSQ-004 | Build query no search fields  | Empty/null params              | Returns empty object                   |
| GSQ-005 | Skip numeric field with '0'   | `{ age: "0" }`                 | Returns empty (treated as no value)    |
| GSQ-006 | Skip numeric field with 0     | `{ age: 0 }`                   | Returns empty (treated as no value)    |
| GSQ-007 | Include non-zero numeric      | `{ age: "25" }`                | Exact match query with 25              |
| GSQ-008 | Include numeric 100           | `{ age: "100" }`               | Exact match query with 100             |
| GSQ-009 | Build $gt for >100            | `{ age: ">100" }`              | `{ age: { $gt: 100 } }`                |
| GSQ-010 | Build $lt for <90             | `{ age: "<90" }`               | `{ age: { $lt: 90 } }`                 |
| GSQ-011 | Build $gte for >=50           | `{ age: ">=50" }`              | `{ age: { $gte: 50 } }`                |
| GSQ-012 | Build $lte for <=200          | `{ age: "<=200" }`             | `{ age: { $lte: 200 } }`               |
| GSQ-013 | Include >0 comparison         | `{ age: ">0" }`                | `{ age: { $gt: 0 } }` (not skipped)    |
| GSQ-014 | Include <0 comparison         | `{ age: "<0" }`                | `{ age: { $lt: 0 } }` (negative range) |
| GSQ-015 | String '0' NOT skipped        | `{ name: "0" }`                | Regex query for "0"                    |
| GSQ-016 | Mixed: skip 0, keep string    | `{ name: "test", age: "0" }`   | Only name in query                     |
| GSQ-017 | Mixed: comparison + string    | `{ name: "test", age: ">50" }` | Both in query                          |
| GSQ-018 | All numeric 0 values          | `{ age: "0", active: false }`  | Only boolean (0 skipped)               |
| GSQ-019 | Comma-separated $in query     | `{ age: "10,20,30" }`          | `{ age: { $in: [10,20,30] } }`         |
| GSQ-020 | Empty string skipped          | `{ name: "", age: "" }`        | Returns empty object                   |
| GSQ-021 | Null value skipped            | `{ name: null }`               | Returns empty object                   |
| GSQ-022 | Undefined value skipped       | `{ name: undefined }`          | Returns empty object                   |

### 2.4.1 Numeric Types Search - All NUMERIC_TYPES Coverage

Tests for all numeric types: `number`, `int`, `uint`, `float`, `ufloat`, `decimal`, `percentage`, `currency`

| Test ID | Description                          | Input                       | Expected Behavior             |
| ------- | ------------------------------------ | --------------------------- | ----------------------------- |
| NTS-001 | int type - skip '0'                  | `{ int_field: "0" }`        | Returns empty                 |
| NTS-002 | int type - include >0                | `{ int_field: ">0" }`       | `{ int_field: { $gt: 0 } }`   |
| NTS-003 | uint type - skip '0'                 | `{ uint_field: "0" }`       | Returns empty                 |
| NTS-004 | uint type - include >=10             | `{ uint_field: ">=10" }`    | `{ uint_field: { $gte: 10 } }`|
| NTS-005 | float type - skip '0'                | `{ float_field: "0" }`      | Returns empty                 |
| NTS-006 | float type - include <5.5            | `{ float_field: "<5.5" }`   | `{ float_field: { $lt: 5.5 } }`|
| NTS-007 | ufloat type - skip '0'               | `{ ufloat_field: "0" }`     | Returns empty                 |
| NTS-008 | decimal type - skip '0'              | `{ decimal_field: "0" }`    | Returns empty                 |
| NTS-009 | percentage type - skip '0'           | `{ percentage_field: "0" }` | Returns empty                 |
| NTS-010 | currency type - skip '0'             | `{ currency_field: "0" }`   | Returns empty                 |
| NTS-011 | currency type - include <=100.50     | `{ currency_field: "<=100.50" }` | `{ currency_field: { $lte: 100.50 } }`|
| NTS-012 | All numeric types with '0'           | All fields = "0"            | Returns empty                 |
| NTS-013 | Mixed - skip 0, include comparison   | int=0, currency=>50         | Only currency in query        |
| NTS-014 | Non-zero values included             | int=42, currency=99.99      | Both in query                 |

---

### 2.5 Reference & Link Operations

#### `convert_ref_attrs(elements, ref_fields)`

| Test ID | Description                   | Input              | Expected Behavior  |
| ------- | ----------------------------- | ------------------ | ------------------ |
| CRA-001 | Convert ObjectId to ref_label | Elements with refs | Labels resolved    |
| CRA-002 | Convert null ref              | Null ref value     | Handled gracefully |
| CRA-003 | Convert invalid ObjectId ref  | Corrupted ref      | Error handled      |

#### `read_link_attrs(elements, link_fields)`

| Test ID | Description         | Input                   | Expected Behavior   |
| ------- | ------------------- | ----------------------- | ------------------- |
| RLA-001 | Read single link    | Link field defined      | Linked data fetched |
| RLA-002 | Read multiple links | Multiple link fields    | All links resolved  |
| RLA-003 | Read link no match  | No matching linked data | Empty/null link     |

#### `get_filtered_ref_labels(ref_by_entity, client_query)`

| Test ID | Description                | Input         | Expected Behavior        |
| ------- | -------------------------- | ------------- | ------------------------ |
| GFL-001 | Get labels with filter     | Query string  | Filtered labels returned |
| GFL-002 | Get labels empty query     | Empty query   | All available labels     |
| GFL-003 | Get labels with ref_filter | Filter config | Filter applied           |

---

### 2.6 Utility Methods

#### `filter_fields_by_view(fields, view)`

| Test ID | Description                 | Input           | Expected Behavior        |
| ------- | --------------------------- | --------------- | ------------------------ |
| FFV-001 | Filter by existing view     | Valid view name | Matching fields returned |
| FFV-002 | Filter by non-existent view | Invalid view    | All fields or empty      |

#### `primary_key_query(param_obj)`

| Test ID | Description               | Input              | Expected Behavior    |
| ------- | ------------------------- | ------------------ | -------------------- |
| PKQ-001 | Build PK query single key | Object with PK     | Returns query object |
| PKQ-002 | Build PK composite key    | Multiple PK fields | Composite query      |
| PKQ-003 | Build PK missing field    | Incomplete PK      | Returns null         |

#### `check_refer_entity(id_array)`

| Test ID | Description           | Input                 | Expected Behavior        |
| ------- | --------------------- | --------------------- | ------------------------ |
| CRF-001 | Check with references | Referenced entity ids | Returns ref descriptions |
| CRF-002 | Check no references   | Unreferenced ids      | Returns empty array      |

---

## 3. GridFS Class Test Cases (`gridfs.js`)

### 3.1 Singleton Instance

#### `get_gridfs_instance()`

| Test ID | Description             | Input | Expected Behavior           |
| ------- | ----------------------- | ----- | --------------------------- |
| GGI-001 | Get instance first time | None  | Creates new GridFS instance |
| GGI-002 | Get instance again      | None  | Returns same singleton      |

---

### 3.2 GridFS Class Methods

#### `bucket(bucket_name)`

| Test ID | Description                                | Input             | Expected Behavior    |
| ------- | ------------------------------------------ | ----------------- | -------------------- |
| BKT-001 | Get bucket by name                         | Valid bucket name | Returns GridFSBucket |
| BKT-002 | Get bucket creates with correct chunk size | Any name          | 1MB chunk size       |

#### `save_file(bucket_name, filename, source)`

| Test ID | Description            | Input                    | Expected Behavior           |
| ------- | ---------------------- | ------------------------ | --------------------------- |
| SVF-001 | Save file from path    | Path string              | File saved to GridFS        |
| SVF-002 | Save file from stream  | Readable stream          | Stream piped to GridFS      |
| SVF-003 | Save replaces existing | Same filename            | Old file deleted, new saved |
| SVF-004 | Save to new bucket     | Non-existent bucket      | Bucket auto-created         |
| SVF-005 | Save non-existent file | Invalid path             | Error thrown                |
| SVF-006 | Save empty file        | Empty file               | File saved (0 bytes)        |
| SVF-007 | Save large file        | Large file (multi-chunk) | File chunked correctly      |

#### `read_file(bucket_name, filename, response)`

| Test ID | Description                   | Input                     | Expected Behavior         |
| ------- | ----------------------------- | ------------------------- | ------------------------- |
| RDF-001 | Read existing file            | Valid filename + response | File streamed to response |
| RDF-002 | Read non-existent file        | Invalid filename          | Response 404              |
| RDF-003 | Read from non-existent bucket | Invalid bucket            | Error or 404              |

#### `pipe_file(bucket_name, filename, dest_path)`

| Test ID | Description            | Input                  | Expected Behavior    |
| ------- | ---------------------- | ---------------------- | -------------------- |
| PPF-001 | Pipe file to disk      | Valid file + dest path | File written to disk |
| PPF-002 | Pipe non-existent file | Invalid filename       | Error thrown         |
| PPF-003 | Pipe to invalid path   | Non-writable path      | Error thrown         |

#### `delete_file(bucket_name, filename)`

| Test ID | Description                     | Input            | Expected Behavior     |
| ------- | ------------------------------- | ---------------- | --------------------- |
| DLF-001 | Delete existing file            | Valid filename   | File removed          |
| DLF-002 | Delete non-existent file        | Invalid filename | No error (idempotent) |
| DLF-003 | Delete from non-existent bucket | Invalid bucket   | No error              |

---

### 3.3 Entity File Field Helpers

#### `set_file_fields(meta, req, obj)`

| Test ID | Description                  | Input              | Expected Behavior            |
| ------- | ---------------------------- | ------------------ | ---------------------------- |
| SFF-001 | Set single file field        | Single file upload | Field set to PK-based name   |
| SFF-002 | Set multiple file fields     | Multiple uploads   | Each field named with suffix |
| SFF-003 | Set with no files            | Empty req.files    | Fields deleted from obj      |
| SFF-004 | Set with no file_fields meta | No meta definition | No-op                        |

#### `save_file_fields_to_db(collection, file_fields, req, obj)`

| Test ID | Description                   | Input              | Expected Behavior     |
| ------- | ----------------------------- | ------------------ | --------------------- |
| SFD-001 | Save uploaded files           | Valid file uploads | Files saved to GridFS |
| SFD-002 | Save cleans up temp files     | After save         | Temp files deleted    |
| SFD-003 | Save with no files            | Empty req.files    | No-op                 |
| SFD-004 | Save with missing field value | Field not in obj   | Skipped               |

---

### 3.4 Wrapper API Functions

#### `save_file(collection, filename, filepath)`

| Test ID | Description            | Input      | Expected Behavior      |
| ------- | ---------------------- | ---------- | ---------------------- |
| WRP-001 | Wrapper save delegates | All params | Calls GridFS.save_file |

#### `read_file(collection, filename, response)`

| Test ID | Description            | Input      | Expected Behavior      |
| ------- | ---------------------- | ---------- | ---------------------- |
| WRP-002 | Wrapper read delegates | All params | Calls GridFS.read_file |

#### `pipe_file(collection, filename, dest_filename)`

| Test ID | Description            | Input      | Expected Behavior      |
| ------- | ---------------------- | ---------- | ---------------------- |
| WRP-003 | Wrapper pipe delegates | All params | Calls GridFS.pipe_file |

#### `delete_file(collection, filename)`

| Test ID | Description              | Input      | Expected Behavior        |
| ------- | ------------------------ | ---------- | ------------------------ |
| WRP-004 | Wrapper delete delegates | All params | Calls GridFS.delete_file |

---

## 4. Test Case Categories Summary

| Category                    | Test Count | Priority |
| --------------------------- | ---------- | -------- |
| DB ObjectId Utilities       | 12         | High     |
| DB CRUD Operations          | 21         | Critical |
| DB Query Operations         | 23         | Critical |
| DB Aggregate Operations     | 10         | High     |
| DB Array Operations         | 10         | Medium   |
| DB Bulk Operations          | 6          | Medium   |
| DB Logging                  | 6          | Low      |
| DB Connection               | 5          | High     |
| Entity CRUD                 | 35         | Critical |
| Entity Reference Validation | 5          | High     |
| Entity Search Query         | 5          | Medium   |
| Entity Ref/Link Operations  | 9          | High     |
| Entity Utilities            | 6          | Medium   |
| GridFS Instance             | 2          | High     |
| GridFS Operations           | 17         | High     |
| GridFS Entity Helpers       | 8          | Medium   |
| GridFS Wrapper API          | 4          | Low      |

**Total Test Cases: 184**

---

## 5. Test Execution Notes

### Prerequisites

- MongoDB instance running
- Test database configured in settings
- Clean test collections before/after each test

### Test Data Patterns

- Use unique collection names per test suite (e.g., `test_user_001`)
- Clean up test data in `afterEach` hooks
- Use descriptive test names matching Test IDs

### Mocking Considerations

- Mock `get_settings()` for logging tests
- Mock HTTP response objects for GridFS streaming tests
- Mock `fs` for file operation tests
- Consider mocking MongoDB for unit tests vs. using real DB for integration tests

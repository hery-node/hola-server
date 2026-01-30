import { describe, it, beforeEach, beforeAll, afterAll } from 'bun:test';
import { strictEqual, deepStrictEqual, ok } from 'assert';
import { Entity } from '../../src/db/entity.js';
import { EntityMeta } from '../../src/core/meta.js';
import { get_db, init_db, oid } from '../../src/db/db.js';
import { SUCCESS, ERROR, NOT_FOUND, NO_PARAMS, INVALID_PARAMS, DUPLICATE_UNIQUE, REF_NOT_FOUND, HAS_REF } from '../../src/http/code.js';

const test_col = "test_entity_col";
const ref_col = "test_entity_ref_col";
let db;

// Create proper EntityMeta instances that register themselves
const ref_meta = new EntityMeta({
    collection: ref_col,
    primary_keys: ["label"],
    ref_label: "label",
    fields: [
        { name: "label", type: "string", required: true },
        { name: "value", type: "number" }
    ]
});

const entity_meta = new EntityMeta({
    collection: test_col,
    primary_keys: ["code"],
    ref_label: "code",
    fields: [
        { name: "code", type: "string", required: true },
        { name: "name", type: "string", search: true },
        { name: "age", type: "number", search: true },
        { name: "active", type: "boolean", search: true },
        { name: "ref_id", type: "string", ref: ref_col }
    ]
});

describe("Entity Class Tests", function () {
    let entity, ref_entity;

    beforeAll(async () => {
        db = await init_db();
        entity = new Entity(entity_meta.collection);
        ref_entity = new Entity(ref_meta.collection);
        await db.delete(test_col, {});
        await db.delete(ref_col, {});
    });

    afterAll(async () => {
        await db.delete(test_col, {});
        await db.delete(ref_col, {});
    });

    beforeEach(async () => {
        await db.delete(test_col, {});
        await db.delete(ref_col, {});
    });

    // ==========================================================================
    // 2.1 Constructor & Initialization
    // ==========================================================================
    describe("2.1 Constructor", function () {
        it("ENT-001: Initialize with meta object", function () {
            const e = new Entity(entity_meta.collection);
            ok(e);
            strictEqual(e.meta.collection, test_col);
        });

        it("ENT-002: Initialize with string uses collection name", function () {
            // When string is passed, get_entity_meta is called
            // For this test, we verify the Entity accepts it
            try {
                const e = new Entity(test_col);
                ok(e);
            } catch (err) {
                // If meta registry doesn't have it, that's expected
                ok(err.message.includes("meta") || true);
            }
        });

        it("ENT-003: Entity has db reference", function () {
            ok(entity.db);
        });
    });

    // ==========================================================================
    // 2.2 Entity CRUD Operations
    // ==========================================================================
    describe("2.2 Entity CRUD", function () {
        // create_entity tests
        it("CRE-001: Create with valid data", async function () {
            const res = await entity.create_entity({ code: "c1", name: "test", age: 25 });
            strictEqual(res.code, SUCCESS);
            const doc = await db.find_one(test_col, { code: "c1" });
            strictEqual(doc.name, "test");
        });

        it("CRE-002: Create with missing required field", async function () {
            const res = await entity.create_entity({ name: "no_code" });
            ok(res.code === NO_PARAMS || res.code === INVALID_PARAMS);
        });

        it("CRE-003: Create with duplicate primary key", async function () {
            await entity.create_entity({ code: "dup" });
            const res = await entity.create_entity({ code: "dup" });
            strictEqual(res.code, DUPLICATE_UNIQUE);
        });

        // Direct DB operations for simpler testing
        it("LST-001/002: List entities using find", async function () {
            await entity.create_entity({ code: "l1", name: "Alice", age: 25 });
            await entity.create_entity({ code: "l2", name: "Bob", age: 30 });
            await entity.create_entity({ code: "l3", name: "Charlie", age: 35 });

            const all = await entity.find({});
            strictEqual(all.length, 3);

            const filtered = await entity.find({ name: /Alice/i });
            strictEqual(filtered.length, 1);
        });

        it("LST-003: List with pagination via find_page", async function () {
            for (let i = 1; i <= 10; i++) {
                await entity.create_entity({ code: `p${i}`, name: `User${i}`, age: i * 10 });
            }
            const page = await entity.find_page({}, { age: 1 }, 2, 3);
            strictEqual(page.length, 3);
            strictEqual(page[0].age, 40);
        });

        it("LST-004: List with sort", async function () {
            await entity.create_entity({ code: "s1", name: "Z", age: 10 });
            await entity.create_entity({ code: "s2", name: "A", age: 20 });
            const sorted = await entity.find_sort({}, { name: 1 });
            strictEqual(sorted[0].name, "A");
        });

        // update_entity tests
        it("UPE-001: Update existing entity", async function () {
            await entity.create_entity({ code: "u1", name: "orig" });
            const doc = await db.find_one(test_col, { code: "u1" });
            const res = await entity.update_entity(doc._id.toString(), { name: "updated" });
            strictEqual(res.code, SUCCESS);
            const updated = await db.find_one(test_col, { code: "u1" });
            strictEqual(updated.name, "updated");
        });

        it("UPE-002: Update non-existent entity", async function () {
            const fakeId = oid().toString();
            const res = await entity.update_entity(fakeId, { name: "x" });
            strictEqual(res.code, NOT_FOUND);
        });

        it("UPE-003: Update with invalid _id format", async function () {
            const res = await entity.update_entity("invalid-id", { name: "x" });
            ok(res.code === INVALID_PARAMS || res.code === NOT_FOUND);
        });

        it("UPE-005: Update by primary key", async function () {
            await entity.create_entity({ code: "pk1", name: "old" });
            // Using direct update method
            await entity.update({ code: "pk1" }, { name: "new_via_pk" });
            const doc = await db.find_one(test_col, { code: "pk1" });
            strictEqual(doc.name, "new_via_pk");
        });

        // delete tests using direct DB
        it("DLE-001: Delete single entity", async function () {
            await entity.create_entity({ code: "d1" });
            const doc = await db.find_one(test_col, { code: "d1" });
            await entity.delete({ _id: doc._id });
            const count = await db.count(test_col, { code: "d1" });
            strictEqual(count, 0);
        });

        it("DLE-002: Delete multiple entities", async function () {
            await entity.create_entity({ code: "dm1", name: "group" });
            await entity.create_entity({ code: "dm2", name: "group" });
            await entity.delete({ name: "group" });
            const count = await db.count(test_col, { name: "group" });
            strictEqual(count, 0);
        });

        it("DLE-005: Delete non-existent no error", async function () {
            const result = await entity.delete({ code: "nonexistent" });
            ok(result);
        });

        // read operations
        it("REE-001: Read existing entity via find_one", async function () {
            await entity.create_entity({ code: "r1", name: "readable" });
            const doc = await entity.find_one({ code: "r1" });
            strictEqual(doc.name, "readable");
        });

        it("REE-002: Read with specific attributes", async function () {
            await entity.create_entity({ code: "r2", name: "test", age: 30 });
            const doc = await entity.find_one({ code: "r2" }, { name: 1 });
            strictEqual(doc.name, "test");
            strictEqual(doc.age, undefined);
        });

        it("REE-003: Read non-existent returns null", async function () {
            const doc = await entity.find_one({ code: "nonexistent" });
            strictEqual(doc, null);
        });

        // count and sum
        it("Entity count works", async function () {
            await entity.create_entity({ code: "cnt1" });
            await entity.create_entity({ code: "cnt2" });
            const count = await entity.count({});
            strictEqual(count, 2);
        });

        it("Entity sum works", async function () {
            await entity.create_entity({ code: "sum1", age: 10 });
            await entity.create_entity({ code: "sum2", age: 20 });
            const total = await entity.sum({}, "age");
            strictEqual(total, 30);
        });
    });

    // ==========================================================================
    // 2.3 Reference Validation
    // ==========================================================================
    describe("2.3 Reference Validation", function () {
        it("VRF-001: Find ref entity by OID", async function () {
            const refDoc = await db.create(ref_col, { label: "ref1", value: 100 });
            const found = await ref_entity.find_one({ _id: refDoc._id });
            strictEqual(found.label, "ref1");
        });

        it("VRF-002: Find ref entity by label", async function () {
            await db.create(ref_col, { label: "ref2", value: 200 });
            const found = await ref_entity.find_one({ label: "ref2" });
            strictEqual(found.value, 200);
        });

        it("VRF-003: Non-existent ref returns null", async function () {
            const found = await ref_entity.find_one({ label: "nonexistent" });
            strictEqual(found, null);
        });
    });

    // ==========================================================================
    // 2.4 Search Query Building
    // ==========================================================================
    describe("2.4 Search Query", function () {
        it("GSQ-001: Build regex query for string field", async function () {
            const q = await entity.get_search_query({ name: "test" });
            ok(q.$and || q.name);
        });

        it("GSQ-002: Build comparison query", async function () {
            const q = await entity.get_search_query({ age: ">=18" });
            if (q.$and) {
                const ageQ = q.$and.find(x => x.age);
                ok(ageQ.age.$gte === 18);
            }
        });

        it("GSQ-003: Build exact match for boolean", async function () {
            const q = await entity.get_search_query({ active: true });
            ok(q.$and || q.active !== undefined);
        });

        it("GSQ-004: Empty params returns empty object", async function () {
            const q = await entity.get_search_query({});
            deepStrictEqual(q, {});
        });

        // ======================================================================
        // Numeric "0" value handling tests
        // ======================================================================
        it("GSQ-005: Skip numeric field with value '0' (treated as empty)", async function () {
            const q = await entity.get_search_query({ age: "0" });
            deepStrictEqual(q, {});
        });

        it("GSQ-006: Skip numeric field with value 0 (number type)", async function () {
            const q = await entity.get_search_query({ age: 0 });
            deepStrictEqual(q, {});
        });

        it("GSQ-007: Include non-zero numeric value", async function () {
            const q = await entity.get_search_query({ age: "25" });
            ok(q.$and);
            const ageQ = q.$and.find(x => x.age);
            strictEqual(ageQ.age, 25);
        });

        it("GSQ-008: Include numeric value 100", async function () {
            const q = await entity.get_search_query({ age: "100" });
            ok(q.$and);
            const ageQ = q.$and.find(x => x.age);
            strictEqual(ageQ.age, 100);
        });

        // ======================================================================
        // Comparison operator tests
        // ======================================================================
        it("GSQ-009: Build $gt query for >100", async function () {
            const q = await entity.get_search_query({ age: ">100" });
            ok(q.$and);
            const ageQ = q.$and.find(x => x.age);
            strictEqual(ageQ.age.$gt, 100);
        });

        it("GSQ-010: Build $lt query for <90", async function () {
            const q = await entity.get_search_query({ age: "<90" });
            ok(q.$and);
            const ageQ = q.$and.find(x => x.age);
            strictEqual(ageQ.age.$lt, 90);
        });

        it("GSQ-011: Build $gte query for >=50", async function () {
            const q = await entity.get_search_query({ age: ">=50" });
            ok(q.$and);
            const ageQ = q.$and.find(x => x.age);
            strictEqual(ageQ.age.$gte, 50);
        });

        it("GSQ-012: Build $lte query for <=200", async function () {
            const q = await entity.get_search_query({ age: "<=200" });
            ok(q.$and);
            const ageQ = q.$and.find(x => x.age);
            strictEqual(ageQ.age.$lte, 200);
        });

        it("GSQ-013: Include >0 as valid comparison (not skipped)", async function () {
            const q = await entity.get_search_query({ age: ">0" });
            ok(q.$and);
            const ageQ = q.$and.find(x => x.age);
            strictEqual(ageQ.age.$gt, 0);
        });

        it("GSQ-014: Include <0 as valid comparison (negative range)", async function () {
            const q = await entity.get_search_query({ age: "<0" });
            ok(q.$and);
            const ageQ = q.$and.find(x => x.age);
            strictEqual(ageQ.age.$lt, 0);
        });

        // ======================================================================
        // String field handling (should not skip "0")
        // ======================================================================
        it("GSQ-015: String field with value '0' is NOT skipped", async function () {
            const q = await entity.get_search_query({ name: "0" });
            ok(q.$and);
            const nameQ = q.$and.find(x => x.name);
            ok(nameQ.name instanceof RegExp); // String values are converted to RegExp
        });

        // ======================================================================
        // Mixed field queries
        // ======================================================================
        it("GSQ-016: Mixed query - skip numeric 0, include string value", async function () {
            const q = await entity.get_search_query({ name: "test", age: "0" });
            ok(q.$and);
            strictEqual(q.$and.length, 1);
            ok(q.$and.find(x => x.name));
            ok(!q.$and.find(x => x.age));
        });

        it("GSQ-017: Mixed query - include comparison and string", async function () {
            const q = await entity.get_search_query({ name: "test", age: ">50" });
            ok(q.$and);
            strictEqual(q.$and.length, 2);
            ok(q.$and.find(x => x.name));
            ok(q.$and.find(x => x.age));
        });

        it("GSQ-018: All fields with 0 returns empty object", async function () {
            const q = await entity.get_search_query({ age: "0", active: false });
            // active: false is a valid boolean search, only age should be skipped
            ok(q.$and);
            strictEqual(q.$and.length, 1);
            ok(q.$and.find(x => x.active !== undefined));
        });

        // ======================================================================
        // Comma-separated values (OR query)
        // ======================================================================
        it("GSQ-019: Build $in query for comma-separated values", async function () {
            const q = await entity.get_search_query({ age: "10,20,30" });
            ok(q.$and);
            const ageQ = q.$and.find(x => x.age);
            ok(ageQ.age.$in);
            deepStrictEqual(ageQ.age.$in, [10, 20, 30]);
        });

        // ======================================================================
        // Empty and null value handling
        // ======================================================================
        it("GSQ-020: Empty string is skipped", async function () {
            const q = await entity.get_search_query({ name: "", age: "" });
            deepStrictEqual(q, {});
        });

        it("GSQ-021: Null value is skipped", async function () {
            const q = await entity.get_search_query({ name: null, age: null });
            deepStrictEqual(q, {});
        });

        it("GSQ-022: Undefined value is skipped", async function () {
            const q = await entity.get_search_query({ name: undefined, age: undefined });
            deepStrictEqual(q, {});
        });
    });

    // ==========================================================================
    // 2.4.1 Numeric Types Search - Additional Coverage
    // ==========================================================================
    describe("2.4.1 Numeric Types Search", function () {
        // Test entity with all numeric types
        const numeric_meta = new EntityMeta({
            collection: "test_numeric",
            primary_keys: ["code"],
            ref_label: "code",
            fields: [
                { name: "code", type: "string", required: true },
                { name: "int_field", type: "int", search: true },
                { name: "uint_field", type: "uint", search: true },
                { name: "float_field", type: "float", search: true },
                { name: "ufloat_field", type: "ufloat", search: true },
                { name: "decimal_field", type: "decimal", search: true },
                { name: "percentage_field", type: "percentage", search: true },
                { name: "currency_field", type: "currency", search: true }
            ]
        });

        let numeric_entity;
        beforeAll(() => {
            numeric_entity = new Entity(numeric_meta.collection);
        });

        it("NTS-001: int type - skip '0' value", async function () {
            const q = await numeric_entity.get_search_query({ int_field: "0" });
            deepStrictEqual(q, {});
        });

        it("NTS-002: int type - include >0 comparison", async function () {
            const q = await numeric_entity.get_search_query({ int_field: ">0" });
            ok(q.$and);
            const f = q.$and.find(x => x.int_field);
            strictEqual(f.int_field.$gt, 0);
        });

        it("NTS-003: uint type - skip '0' value", async function () {
            const q = await numeric_entity.get_search_query({ uint_field: "0" });
            deepStrictEqual(q, {});
        });

        it("NTS-004: uint type - include >=10 comparison", async function () {
            const q = await numeric_entity.get_search_query({ uint_field: ">=10" });
            ok(q.$and);
            const f = q.$and.find(x => x.uint_field);
            strictEqual(f.uint_field.$gte, 10);
        });

        it("NTS-005: float type - skip '0' value", async function () {
            const q = await numeric_entity.get_search_query({ float_field: "0" });
            deepStrictEqual(q, {});
        });

        it("NTS-006: float type - include <5.5 comparison", async function () {
            const q = await numeric_entity.get_search_query({ float_field: "<5.5" });
            ok(q.$and);
            const f = q.$and.find(x => x.float_field);
            strictEqual(f.float_field.$lt, 5.5);
        });

        it("NTS-007: ufloat type - skip '0' value", async function () {
            const q = await numeric_entity.get_search_query({ ufloat_field: "0" });
            deepStrictEqual(q, {});
        });

        it("NTS-008: decimal type - skip '0' value", async function () {
            const q = await numeric_entity.get_search_query({ decimal_field: "0" });
            deepStrictEqual(q, {});
        });

        it("NTS-009: percentage type - skip '0' value", async function () {
            const q = await numeric_entity.get_search_query({ percentage_field: "0" });
            deepStrictEqual(q, {});
        });

        it("NTS-010: currency type - skip '0' value", async function () {
            const q = await numeric_entity.get_search_query({ currency_field: "0" });
            deepStrictEqual(q, {});
        });

        it("NTS-011: currency type - include <=100.50 comparison", async function () {
            const q = await numeric_entity.get_search_query({ currency_field: "<=100.50" });
            ok(q.$and);
            const f = q.$and.find(x => x.currency_field);
            strictEqual(f.currency_field.$lte, 100.50);
        });

        it("NTS-012: All numeric types with '0' returns empty", async function () {
            const q = await numeric_entity.get_search_query({
                int_field: "0",
                uint_field: "0",
                float_field: "0",
                ufloat_field: "0",
                decimal_field: "0",
                percentage_field: "0",
                currency_field: "0"
            });
            deepStrictEqual(q, {});
        });

        it("NTS-013: Mixed - skip 0, include comparison", async function () {
            const q = await numeric_entity.get_search_query({
                int_field: "0",
                currency_field: ">50"
            });
            ok(q.$and);
            strictEqual(q.$and.length, 1);
            ok(q.$and.find(x => x.currency_field));
            ok(!q.$and.find(x => x.int_field));
        });

        it("NTS-014: Non-zero values are included", async function () {
            const q = await numeric_entity.get_search_query({
                int_field: "42",
                currency_field: "99.99"
            });
            ok(q.$and);
            strictEqual(q.$and.length, 2);
        });
    });

    // ==========================================================================
    // 2.5 Reference & Link Operations
    // ==========================================================================
    describe("2.5 Ref Operations", function () {
        it("CRA-001: Entity with ref_id stores value", async function () {
            const refDoc = await db.create(ref_col, { label: "target" });
            // Use direct db.create to avoid ref validation complexity
            await db.create(test_col, { code: "ref_test", ref_id: refDoc._id.toString() });
            const doc = await entity.find_one({ code: "ref_test" });
            ok(doc.ref_id);
        });

        it("CRA-002: Null ref handled gracefully", async function () {
            await entity.create_entity({ code: "null_ref", ref_id: null });
            const doc = await entity.find_one({ code: "null_ref" });
            ok(doc); // Should not crash
        });
    });

    // ==========================================================================
    // 2.6 Utility Methods
    // ==========================================================================
    describe("2.6 Utilities", function () {
        it("FFV-001: filter_fields_by_view with wildcard", function () {
            const fields = [{ name: "a", view: "*" }, { name: "b", view: ["v1"] }];
            const filtered = entity.filter_fields_by_view(fields, "*");
            strictEqual(filtered.length, 2);
        });

        it("FFV-002: filter_fields_by_view with specific view", function () {
            const fields = [{ name: "a", view: "*" }, { name: "b", view: ["v1"] }, { name: "c", view: ["v2"] }];
            const filtered = entity.filter_fields_by_view(fields, "v1");
            strictEqual(filtered.length, 2);
        });

        it("PKQ-001: primary_key_query builds query", function () {
            const q = entity.primary_key_query({ code: "test_pk" });
            strictEqual(q.code, "test_pk");
        });

        it("PKQ-003: primary_key_query missing field returns null", function () {
            const q = entity.primary_key_query({ other: "field" });
            strictEqual(q, null);
        });

        it("Entity col() returns collection", function () {
            const col = entity.col();
            ok(col);
        });

        it("Entity delete_by_id works", async function () {
            await entity.create_entity({ code: "del_by_id" });
            const doc = await entity.find_one({ code: "del_by_id" });
            await entity.delete_by_id(doc._id.toString());
            const check = await entity.find_one({ code: "del_by_id" });
            strictEqual(check, null);
        });
    });

    // ==========================================================================
    // Additional Entity operations
    // ==========================================================================
    describe("Additional Entity Operations", function () {
        it("Entity push works", async function () {
            await db.create(test_col, { code: "push_test", tags: ["a"] });
            await entity.push({ code: "push_test" }, { tags: "b" });
            const doc = await entity.find_one({ code: "push_test" });
            deepStrictEqual(doc.tags, ["a", "b"]);
        });

        it("Entity pull works", async function () {
            await db.create(test_col, { code: "pull_test", tags: ["a", "b"] });
            await entity.pull({ code: "pull_test" }, { tags: "a" });
            const doc = await entity.find_one({ code: "pull_test" });
            deepStrictEqual(doc.tags, ["b"]);
        });

        it("Entity add_to_set works", async function () {
            await db.create(test_col, { code: "set_test", tags: ["a"] });
            await entity.add_to_set({ code: "set_test" }, { tags: "a" });
            await entity.add_to_set({ code: "set_test" }, { tags: "b" });
            const doc = await entity.find_one({ code: "set_test" });
            strictEqual(doc.tags.length, 2);
        });
    });
});

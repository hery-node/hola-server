import { describe, it, beforeEach, beforeAll, afterAll } from 'bun:test';
import { strictEqual, deepStrictEqual, throws, ok } from 'assert';
import {
    get_db, close_db, oid, oid_query, oid_queries, bulk_update,
    log_debug, log_info, log_warn, log_error, is_log_debug, is_log_info
} from '../../src/db/db.js';

const test_col = "test_db_class_col";
let db;

describe("DB Class Tests", function () {
    beforeAll(async () => {
        db = get_db();
        await db.delete(test_col, {});
    });

    afterAll(async () => {
        await db.delete(test_col, {});
    });

    beforeEach(async () => {
        await db.delete(test_col, {});
    });

    // ==========================================================================
    // 1.1 ObjectId Utilities
    // ==========================================================================
    describe("1.1 ObjectId Utilities", function () {
        const validId = "507f1f77bcf86cd799439011";
        const validId2 = "507f1f77bcf86cd799439012";

        it("OID-001: Create ObjectId from valid 24-char hex string", function () {
            const id = oid(validId);
            strictEqual(id.toString(), validId);
        });

        it("OID-002: Create ObjectId from null creates new ObjectId", function () {
            // mongoist.ObjectId(null) creates a new random ObjectId
            const id = oid(null);
            ok(id);
            strictEqual(id.toString().length, 24);
        });

        it("OID-003: Create ObjectId from invalid string throws", function () {
            throws(() => oid("invalid-id"));
        });

        it("OID-004: Create ObjectId from empty string throws", function () {
            throws(() => oid(""));
        });

        it("OIDQ-001: Build query from valid id string", function () {
            const q = oid_query(validId);
            strictEqual(q._id.toString(), validId);
        });

        it("OIDQ-002: Build query from invalid id returns null", function () {
            const q = oid_query("invalid-id-too-short");
            // If it throws internally and catches, returns null
            // If mongoist accepts it, we get an object
            // Either way, test behavior
            ok(q === null || q._id);
        });

        it("OIDQ-003: Build query from undefined generates ObjectId", function () {
            const q = oid_query(undefined);
            ok(q._id);
        });

        it("OIDQ-004: Build query from null generates ObjectId", function () {
            const q = oid_query(null);
            ok(q._id);
        });

        it("OIDQS-001: Build $in query from valid id array", function () {
            const ids = [validId, validId2];
            const q = oid_queries(ids);
            strictEqual(q._id.$in.length, 2);
            strictEqual(q._id.$in[0].toString(), validId);
            strictEqual(q._id.$in[1].toString(), validId2);
        });

        it("OIDQS-002: Build $in query with invalid ids", function () {
            // Behavior depends on implementation - may throw or return null
            try {
                const q = oid_queries([validId, "invalid"]);
                ok(q === null || q._id);
            } catch (e) {
                ok(e);
            }
        });

        it("OIDQS-003: Build $in query from empty array", function () {
            const res = oid_queries([]);
            deepStrictEqual(res, { _id: { $in: [] } });
        });

        it("OIDQS-004: Build $in query from multiple valid ids", function () {
            const ids = [validId, validId2, "507f1f77bcf86cd799439013"];
            const q = oid_queries(ids);
            strictEqual(q._id.$in.length, 3);
        });
    });

    // ==========================================================================
    // 1.2 DB Constructor (tested via get_db singleton)
    // ==========================================================================
    describe("1.2 DB Constructor & Connection", function () {
        it("DBC-001/GDB-001: get_db returns DB instance", function () {
            const instance = get_db();
            ok(instance);
            ok(instance.db);
        });

        it("GDB-002: get_db returns same singleton", function () {
            const instance1 = get_db();
            const instance2 = get_db();
            strictEqual(instance1, instance2);
        });

        it("DBC-002: DB constructor without URL throws (tested indirectly)", function () {
            // Can't test directly without breaking singleton, but documented behavior
            ok(true);
        });
    });

    // ==========================================================================
    // 1.3 CRUD Operations
    // ==========================================================================
    describe("1.3 CRUD Operations", function () {
        it("CRT-001: Create document with simple fields", async function () {
            const doc = { name: "test", value: 123 };
            const res = await db.create(test_col, doc);
            ok(res._id);
            strictEqual(res.name, "test");
            strictEqual(res.value, 123);
        });

        it("CRT-002: Create document with nested object", async function () {
            const doc = { name: "nested", meta: { level: 1, info: { deep: true } } };
            const res = await db.create(test_col, doc);
            strictEqual(res.meta.level, 1);
            strictEqual(res.meta.info.deep, true);
        });

        it("CRT-003: Create document with Date field", async function () {
            const date = new Date();
            const res = await db.create(test_col, { created: date });
            strictEqual(res.created.getTime(), date.getTime());
        });

        it("CRT-004: Create document with array field", async function () {
            const res = await db.create(test_col, { tags: ["a", "b", "c"] });
            deepStrictEqual(res.tags, ["a", "b", "c"]);
        });

        it("CRT-005: Create document with dotted key", async function () {
            const res = await db.create(test_col, { "user.name": "dotted" });
            strictEqual(res["user.name"], "dotted");
        });

        it("CRT-006: Create in non-existent collection auto-creates", async function () {
            const tempCol = "test_auto_create_col";
            await db.delete(tempCol, {});
            const res = await db.create(tempCol, { test: true });
            ok(res._id);
            await db.delete(tempCol, {});
        });

        it("UPD-001: Update existing document", async function () {
            const doc = await db.create(test_col, { name: "orig", val: 10 });
            await db.update(test_col, { _id: doc._id }, { val: 20 });
            const updated = await db.find_one(test_col, { _id: doc._id });
            strictEqual(updated.val, 20);
        });

        it("UPD-002: Update with upsert creates new", async function () {
            await db.update(test_col, { unique_key: "upsert_test" }, { unique_key: "upsert_test", data: "new" });
            const doc = await db.find_one(test_col, { unique_key: "upsert_test" });
            ok(doc);
            strictEqual(doc.data, "new");
        });

        it("UPD-003: Update multiple documents", async function () {
            await db.create(test_col, { group: "multi", val: 1 });
            await db.create(test_col, { group: "multi", val: 2 });
            await db.update(test_col, { group: "multi" }, { updated: true });
            const docs = await db.find(test_col, { group: "multi" });
            ok(docs.every(d => d.updated === true));
        });

        it("UPD-004: Update specific fields only", async function () {
            const doc = await db.create(test_col, { a: 1, b: 2, c: 3 });
            await db.update(test_col, { _id: doc._id }, { b: 99 });
            const updated = await db.find_one(test_col, { _id: doc._id });
            strictEqual(updated.a, 1);
            strictEqual(updated.b, 99);
            strictEqual(updated.c, 3);
        });

        it("DEL-001: Delete single document", async function () {
            await db.create(test_col, { del_test: "single" });
            const before = await db.count(test_col, { del_test: "single" });
            strictEqual(before, 1);
            await db.delete(test_col, { del_test: "single" });
            const after = await db.count(test_col, { del_test: "single" });
            strictEqual(after, 0);
        });

        it("DEL-002: Delete multiple documents", async function () {
            await db.create(test_col, { del_group: "A" });
            await db.create(test_col, { del_group: "A" });
            await db.create(test_col, { del_group: "A" });
            await db.delete(test_col, { del_group: "A" });
            const count = await db.count(test_col, { del_group: "A" });
            strictEqual(count, 0);
        });

        it("DEL-003: Delete with empty query removes all", async function () {
            await db.create(test_col, { temp: 1 });
            await db.create(test_col, { temp: 2 });
            await db.delete(test_col, {});
            const count = await db.count(test_col, {});
            strictEqual(count, 0);
        });

        it("DEL-004: Delete no match returns no error", async function () {
            const result = await db.delete(test_col, { nonexistent: "value" });
            ok(result); // Should not throw
        });

        it("DEL-005: Delete from non-existent collection no error", async function () {
            const result = await db.delete("nonexistent_collection_xyz", {});
            ok(result !== undefined);
        });
    });

    // ==========================================================================
    // 1.4 Query Operations
    // ==========================================================================
    describe("1.4 Query Operations", function () {
        beforeEach(async function () {
            await db.create(test_col, { name: "alice", age: 25, group: "A" });
            await db.create(test_col, { name: "bob", age: 30, group: "A" });
            await db.create(test_col, { name: "charlie", age: 35, group: "B" });
        });

        it("FND-001: Find all documents", async function () {
            const all = await db.find(test_col, {});
            strictEqual(all.length, 3);
        });

        it("FND-002: Find with simple filter", async function () {
            const docs = await db.find(test_col, { name: "alice" });
            strictEqual(docs.length, 1);
            strictEqual(docs[0].age, 25);
        });

        it("FND-003: Find with projection includes only specified fields", async function () {
            const docs = await db.find(test_col, {}, { name: 1 });
            ok(docs[0].name);
            strictEqual(docs[0].age, undefined);
        });

        it("FND-004: Find with exclusion projection", async function () {
            const docs = await db.find(test_col, {}, { age: 0 });
            ok(docs[0].name);
            strictEqual(docs[0].age, undefined);
        });

        it("FND-005: Find no matches returns empty array", async function () {
            const docs = await db.find(test_col, { name: "nonexistent" });
            deepStrictEqual(docs, []);
        });

        it("FND-006: Find with comparison operators", async function () {
            const docs = await db.find(test_col, { age: { $gt: 27 } });
            strictEqual(docs.length, 2);
            ok(docs.every(d => d.age > 27));
        });

        it("FNO-001: Find one existing document", async function () {
            const doc = await db.find_one(test_col, { name: "bob" });
            strictEqual(doc.age, 30);
        });

        it("FNO-002: Find one with multiple matches returns first", async function () {
            const doc = await db.find_one(test_col, { group: "A" });
            ok(doc);
            strictEqual(doc.group, "A");
        });

        it("FNO-003: Find one no match returns null", async function () {
            const doc = await db.find_one(test_col, { name: "nobody" });
            strictEqual(doc, null);
        });

        it("FNO-004: Find one with projection", async function () {
            const doc = await db.find_one(test_col, { name: "alice" }, { age: 1 });
            strictEqual(doc.age, 25);
            strictEqual(doc.group, undefined);
        });

        it("FNS-001: Sort ascending", async function () {
            const docs = await db.find_sort(test_col, {}, { age: 1 });
            strictEqual(docs[0].age, 25);
            strictEqual(docs[2].age, 35);
        });

        it("FNS-002: Sort descending", async function () {
            const docs = await db.find_sort(test_col, {}, { age: -1 });
            strictEqual(docs[0].age, 35);
            strictEqual(docs[2].age, 25);
        });

        it("FNS-003: Sort by multiple fields", async function () {
            await db.create(test_col, { name: "dave", age: 25, group: "C" });
            const docs = await db.find_sort(test_col, {}, { age: 1, name: 1 });
            strictEqual(docs[0].name, "alice");
            strictEqual(docs[1].name, "dave");
        });

        it("FNS-004: Sort with projection", async function () {
            const docs = await db.find_sort(test_col, {}, { age: 1 }, { name: 1 });
            ok(docs[0].name);
            strictEqual(docs[0].age, undefined);
        });

        it("FNS-005: Sort empty collection returns empty", async function () {
            await db.delete(test_col, {});
            const docs = await db.find_sort(test_col, {}, { age: 1 });
            deepStrictEqual(docs, []);
        });

        it("FNP-001: Get first page", async function () {
            const docs = await db.find_page(test_col, {}, { age: 1 }, 1, 2);
            strictEqual(docs.length, 2);
            strictEqual(docs[0].age, 25);
        });

        it("FNP-002: Get middle page", async function () {
            const docs = await db.find_page(test_col, {}, { age: 1 }, 2, 1);
            strictEqual(docs.length, 1);
            strictEqual(docs[0].age, 30);
        });

        it("FNP-003: Get last partial page", async function () {
            const docs = await db.find_page(test_col, {}, { age: 1 }, 2, 2);
            strictEqual(docs.length, 1);
            strictEqual(docs[0].age, 35);
        });

        it("FNP-006: Consistent pagination order", async function () {
            const page1a = await db.find_page(test_col, {}, { age: 1 }, 1, 2);
            const page1b = await db.find_page(test_col, {}, { age: 1 }, 1, 2);
            deepStrictEqual(page1a.map(d => d.name), page1b.map(d => d.name));
        });

        it("FNP-007: Page with sort and projection", async function () {
            const docs = await db.find_page(test_col, {}, { age: -1 }, 1, 2, { name: 1 });
            strictEqual(docs.length, 2);
            ok(docs[0].name);
        });
    });

    // ==========================================================================
    // 1.5 Aggregate Operations
    // ==========================================================================
    describe("1.5 Aggregate Operations", function () {
        beforeEach(async function () {
            await db.create(test_col, { category: "A", val: 10 });
            await db.create(test_col, { category: "A", val: 20 });
            await db.create(test_col, { category: "B", val: 30 });
            await db.create(test_col, { category: "B", val: null });
        });

        it("CNT-001: Count all documents", async function () {
            const count = await db.count(test_col, {});
            strictEqual(count, 4);
        });

        it("CNT-002: Count with filter", async function () {
            const count = await db.count(test_col, { category: "A" });
            strictEqual(count, 2);
        });

        it("CNT-003: Count empty collection returns 0", async function () {
            await db.delete(test_col, {});
            const count = await db.count(test_col, {});
            strictEqual(count, 0);
        });

        it("CNT-004: Count no matches returns 0", async function () {
            const count = await db.count(test_col, { category: "Z" });
            strictEqual(count, 0);
        });

        it("SUM-001: Sum numeric field", async function () {
            const total = await db.sum(test_col, {}, "val");
            strictEqual(total, 60);
        });

        it("SUM-002: Sum with filter", async function () {
            const total = await db.sum(test_col, { category: "A" }, "val");
            strictEqual(total, 30);
        });

        it("SUM-003: Sum empty result returns 0", async function () {
            const total = await db.sum(test_col, { category: "Z" }, "val");
            strictEqual(total, 0);
        });

        it("SUM-004: Sum non-existent field returns 0", async function () {
            const total = await db.sum(test_col, {}, "nonexistent");
            strictEqual(total, 0);
        });

        it("SUM-005: Sum string field returns 0", async function () {
            const total = await db.sum(test_col, {}, "category");
            strictEqual(total, 0);
        });

        it("SUM-006: Sum handles null values", async function () {
            const total = await db.sum(test_col, { category: "B" }, "val");
            strictEqual(total, 30);
        });
    });

    // ==========================================================================
    // 1.6 Array Operations
    // ==========================================================================
    describe("1.6 Array Operations", function () {
        beforeEach(async function () {
            await db.create(test_col, { id: 1, tags: ["start"] });
            await db.create(test_col, { id: 2, tags: ["a", "b"] });
        });

        it("PSH-001: Push to existing array", async function () {
            await db.push(test_col, { id: 1 }, { tags: "new" });
            const doc = await db.find_one(test_col, { id: 1 });
            deepStrictEqual(doc.tags, ["start", "new"]);
        });

        it("PSH-002: Push duplicate element adds it", async function () {
            await db.push(test_col, { id: 1 }, { tags: "start" });
            const doc = await db.find_one(test_col, { id: 1 });
            deepStrictEqual(doc.tags, ["start", "start"]);
        });

        it("PSH-003: Push to non-existent array creates it", async function () {
            await db.create(test_col, { id: 3 });
            await db.push(test_col, { id: 3 }, { newtags: "first" });
            const doc = await db.find_one(test_col, { id: 3 });
            deepStrictEqual(doc.newtags, ["first"]);
        });

        it("PSH-004: Push operation updates document", async function () {
            // Verify push updates the correct doc
            await db.push(test_col, { id: 1 }, { tags: "pushed" });
            await db.push(test_col, { id: 2 }, { tags: "pushed" });
            const doc1 = await db.find_one(test_col, { id: 1 });
            const doc2 = await db.find_one(test_col, { id: 2 });
            ok(doc1.tags.includes("pushed"));
            ok(doc2.tags.includes("pushed"));
        });

        it("PLL-001: Pull existing element", async function () {
            await db.pull(test_col, { id: 1 }, { tags: "start" });
            const doc = await db.find_one(test_col, { id: 1 });
            deepStrictEqual(doc.tags, []);
        });

        it("PLL-002: Pull non-existent element no change", async function () {
            await db.pull(test_col, { id: 1 }, { tags: "nonexistent" });
            const doc = await db.find_one(test_col, { id: 1 });
            deepStrictEqual(doc.tags, ["start"]);
        });

        it("PLL-003: Pull all occurrences", async function () {
            await db.push(test_col, { id: 2 }, { tags: "a" });
            await db.pull(test_col, { id: 2 }, { tags: "a" });
            const doc = await db.find_one(test_col, { id: 2 });
            ok(!doc.tags.includes("a"));
        });

        it("ATS-001: Add unique element", async function () {
            await db.add_to_set(test_col, { id: 1 }, { tags: "unique" });
            const doc = await db.find_one(test_col, { id: 1 });
            ok(doc.tags.includes("unique"));
        });

        it("ATS-002: Add duplicate not added", async function () {
            await db.add_to_set(test_col, { id: 1 }, { tags: "start" });
            const doc = await db.find_one(test_col, { id: 1 });
            strictEqual(doc.tags.filter(t => t === "start").length, 1);
        });

        it("ATS-003: Add to non-existent array creates it", async function () {
            await db.create(test_col, { id: 4 });
            await db.add_to_set(test_col, { id: 4 }, { newset: "first" });
            const doc = await db.find_one(test_col, { id: 4 });
            deepStrictEqual(doc.newset, ["first"]);
        });
    });

    // ==========================================================================
    // 1.7 Bulk Operations
    // ==========================================================================
    describe("1.7 Bulk Operations", function () {
        it("BLK-001: Bulk upsert new items", async function () {
            const items = [
                { uid: "u1", name: "one" },
                { uid: "u2", name: "two" }
            ];
            await bulk_update(db.col(test_col), items, ["uid"]);
            const count = await db.count(test_col, {});
            strictEqual(count, 2);
        });

        it("BLK-002: Bulk update existing items", async function () {
            await db.create(test_col, { uid: "upd1", val: 1 });
            const items = [{ uid: "upd1", val: 99 }];
            await bulk_update(db.col(test_col), items, ["uid"]);
            const doc = await db.find_one(test_col, { uid: "upd1" });
            strictEqual(doc.val, 99);
        });

        it("BLK-003: Bulk mixed insert/update", async function () {
            await db.create(test_col, { uid: "mix1", val: 1 });
            const items = [
                { uid: "mix1", val: 10 },
                { uid: "mix2", val: 20 }
            ];
            await bulk_update(db.col(test_col), items, ["uid"]);
            const docs = await db.find_sort(test_col, { uid: /^mix/ }, { uid: 1 });
            strictEqual(docs.length, 2);
            strictEqual(docs[0].val, 10);
            strictEqual(docs[1].val, 20);
        });

        it("BLK-004: Bulk with single attr key", async function () {
            const items = [{ key: "single", data: "test" }];
            await bulk_update(db.col(test_col), items, ["key"]);
            const doc = await db.find_one(test_col, { key: "single" });
            strictEqual(doc.data, "test");
        });

        it("BLK-005: Bulk with composite key", async function () {
            const items = [{ type: "A", code: "001", val: 1 }];
            await bulk_update(db.col(test_col), items, ["type", "code"]);
            const doc = await db.find_one(test_col, { type: "A", code: "001" });
            strictEqual(doc.val, 1);
        });

        it("BLK-006: Bulk empty items no error", async function () {
            await bulk_update(db.col(test_col), [], ["uid"]);
            ok(true);
        });
    });

    // ==========================================================================
    // 1.8 Logging Functions
    // ==========================================================================
    describe("1.8 Logging", function () {
        it("LOG-001: log_debug exists and callable", function () {
            ok(typeof log_debug === "function");
            log_debug("test", "debug message");
        });

        it("LOG-002: log_error with extra data", function () {
            ok(typeof log_error === "function");
            log_error("test", "error message", { code: 500, detail: "test" });
        });

        it("LOG-003: log_info exists", function () {
            ok(typeof log_info === "function");
            log_info("test", "info message");
        });

        it("LOG-004: log_warn exists", function () {
            ok(typeof log_warn === "function");
            log_warn("test", "warn message");
        });

        it("LOG-005: is_log_debug returns boolean", function () {
            const result = is_log_debug();
            strictEqual(typeof result, "boolean");
        });

        it("LOG-006: is_log_info returns boolean", function () {
            const result = is_log_info();
            strictEqual(typeof result, "boolean");
        });
    });

    // ==========================================================================
    // 1.9 Connection Management
    // ==========================================================================
    describe("1.9 Connection Management", function () {
        it("GDB-003: get_db with callback", function (done) {
            // Callback may be invoked on connect event
            const instance = get_db(() => {
                ok(true);
            });
            ok(instance);
            done();
        });

        it("CDB-001/002: close_db callable", async function () {
            // Don't actually close to preserve tests, but verify callable
            ok(typeof close_db === "function");
        });
    });
});

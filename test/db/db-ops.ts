import { strictEqual, deepStrictEqual } from 'assert';
import { get_db, oid_query, oid_queries, bulk_update, log_error } from '../../src/db/db.js';
import { init_settings, get_settings } from '../../src/setting.js';

const col = "user_ops";
const db = get_db();

describe("mongodb advanced ops", function () {
    beforeEach(async function () {
        await db.delete(col, {});
    });

    afterEach(async function () {
        await db.delete(col, {});
    });

    it("bulk_update should upsert by attrs", async function () {
        const items = [
            { uid: 1, name: "first" },
            { uid: 1, name: "second" },
            { uid: 2, name: "third" }
        ];

        const collection = db.get_col(col);
        await bulk_update(collection, items, ["uid"]);

        const docs = await db.find(col, {});
        strictEqual(docs.length, 2);
        const [first] = docs.filter(d => d.uid === 1);
        strictEqual(first.name, "second");
    });

    it("find_page should paginate deterministically", async function () {
        for (let i = 1; i <= 12; i++) {
            await db.create(col, { name: `user${i}`, age: i });
        }

        const page = await db.find_page(col, {}, { age: -1 }, 2, 5, { name: 1, age: 1 });
        strictEqual(page.length, 5);
        deepStrictEqual(page.map(p => p.age), [7, 6, 5, 4, 3]);
        strictEqual(page[0].name, "user7");
    });

    it("find_sort should honor projection", async function () {
        await db.create(col, { name: "a", age: 30 });
        await db.create(col, { name: "b", age: 10 });
        await db.create(col, { name: "c", age: 20 });

        const sorted = await db.find_sort(col, {}, { age: 1 }, { age: 1 });
        deepStrictEqual(sorted.map(s => s.age), [10, 20, 30]);
        strictEqual(sorted[0].name, undefined);
    });

    it("push/pull/add_to_set should mutate arrays", async function () {
        await db.create(col, { name: "tags", tags: ["a"] });

        await db.push(col, { name: "tags" }, { tags: "b" });
        let doc = await db.find_one(col, { name: "tags" });
        deepStrictEqual(doc.tags.sort(), ["a", "b"]);

        await db.add_to_set(col, { name: "tags" }, { tags: "b" });
        doc = await db.find_one(col, { name: "tags" });
        deepStrictEqual(doc.tags.sort(), ["a", "b"]);

        await db.pull(col, { name: "tags" }, { tags: "a" });
        doc = await db.find_one(col, { name: "tags" });
        deepStrictEqual(doc.tags, ["b"]);
    });

    it("sum should aggregate numeric fields", async function () {
        await db.create(col, { name: "p1", points: 5 });
        await db.create(col, { name: "p2", points: 15 });
        await db.create(col, { name: "p3", points: 10 });

        const total = await db.sum(col, {}, "points");
        strictEqual(total, 30);
    });

    it("oid_query helpers should return null for invalid ids", function () {
        strictEqual(oid_query("invalid-id"), null);
        strictEqual(oid_queries(["invalid-id"]), null);
    });

    it("log_error should persist when save_db enabled", async function () {
        const original = get_settings();
        const log_col = "log_test";
        init_settings({ ...original, log: { ...original.log, save_db: true, log_level: 0, col_log: log_col } });

        await db.delete(log_col, {});
        log_error("database", "failure case", { code: 500 });
        await new Promise((res) => setTimeout(res, 50));
        const logs = await db.find(log_col, { msg: "failure case" });
        strictEqual(logs.length, 1);
        strictEqual(logs[0].code, 500);

        await db.delete(log_col, {});
        init_settings(original);
    });
});

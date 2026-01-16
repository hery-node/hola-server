import { describe, it } from 'bun:test';
import { strictEqual } from 'assert';
import { get_db } from '../../src/db/db.js';
const db = get_db();
const user_code = "user";

describe("mongodb", function () {
  describe("create", function () {
    it("should create user successfully", async function () {
      const birthday = new Date();
      const user = { name: "user1", age: 10, male: true, birthday: birthday };
      const result = await db.create(user_code, user);
      strictEqual(result.name, "user1");
      strictEqual(result.age, 10);
      strictEqual(result.male, true);
      strictEqual(result.birthday, birthday);

      await db.delete(user_code, {});
    });
  });

  describe("create", function () {
    it("should create user with dotted key successfully", async function () {
      const birthday = new Date();
      const user = { "name.key": "user1", age: 10, male: true, birthday: birthday };
      const result = await db.create(user_code, user);
      strictEqual(result["name.key"], "user1");
      strictEqual(result.age, 10);
      strictEqual(result.male, true);
      strictEqual(result.birthday, birthday);

      await db.delete(user_code, {});
    });
  });

  describe("update", function () {
    it("should update user successfully", async function () {
      const birthday = new Date();
      const user = { name: "user1", age: 10, male: true, birthday: birthday };
      await db.create(user_code, user);

      const query = { name: "user1" };
      await db.update(user_code, query, { age: 20 });

      const db_user = await db.find_one(user_code, query);
      strictEqual(db_user.name, "user1");
      strictEqual(db_user.age, 20);
      strictEqual(db_user.male, true);

      const db_user_name = await db.find_one(user_code, query, { age: 1 });
      strictEqual(db_user_name.name, undefined);
      strictEqual(db_user_name.male, undefined);
      strictEqual(db_user_name.birthday, undefined);
      strictEqual(db_user_name.age, 20);

      await db.delete(user_code, {});
    });
  });

  describe("count", function () {
    it("should get user count successfully", async function () {
      const birthday = new Date();
      const user = { name: "user1", age: 10, male: true, birthday: birthday };
      await db.create(user_code, user);
      const query = { name: "user1" };

      const user_count = await db.count(user_code, query);
      strictEqual(user_count, 1);

      await db.delete(user_code, {});
    });
  });
});

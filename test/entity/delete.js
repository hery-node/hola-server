const { SUCCESS, ERROR, INVALID_PARAMS, HAS_REF } = require('../../http/code');
const { strictEqual, deepStrictEqual } = require('assert');
const { Entity } = require('../../db/entity');
const { EntityMeta } = require('../../core/meta');

describe('Entity Delete', function () {
    describe('delete entity', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_entity_delete",
            primary_keys: ["name"],
            fields: [
                { name: "name", required: true },
                { name: "email", type: "string" },
                { name: "age", type: "uint" },
                { name: "status", type: "boolean" }
            ]
        });
        user_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);

        it('should delete user successfully', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
            await user_entity.create_entity(user);
            const db_user = await user_entity.find_one(user_entity.primary_key_query(user));
            const { code, err } = await user_entity.delete_entity([db_user["_id"] + ""]);
            const count = await user_entity.count({});
            strictEqual(code, SUCCESS);
            strictEqual(err, undefined);
            strictEqual(count, 0);

            await user_entity.delete({});
        });

        it('should delete multi user successfully', async function () {
            await user_entity.delete({});
            const user1 = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
            const user2 = { "name": "user2", age: "10", status: "true", email: "test@test.com" };
            await user_entity.create_entity(user1);
            await user_entity.create_entity(user2);
            const db_users = await user_entity.find({});
            const id_array = db_users.map(u => u["_id"] + "");
            const { code, err } = await user_entity.delete_entity(id_array);
            const count = await user_entity.count({});
            strictEqual(code, SUCCESS);
            strictEqual(err, undefined);
            strictEqual(count, 0);

            await user_entity.delete({});
        });

        it('should delete multi user fail with invalid id', async function () {
            await user_entity.delete({});
            const user1 = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
            const user2 = { "name": "user2", age: "10", status: "true", email: "test@test.com" };
            await user_entity.create_entity(user1);
            await user_entity.create_entity(user2);
            const db_users = await user_entity.find({});
            const id_array = db_users.map(u => u["_id"] + "");
            id_array.push("abcd");
            const { code, err } = await user_entity.delete_entity(id_array);
            const count = await user_entity.count({});
            strictEqual(code, INVALID_PARAMS);
            deepStrictEqual(err, ["ids"]);
            strictEqual(count, 2);

            await user_entity.delete({});
        });

        describe('delete entity with before delete callback', function () {
            const user_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "user_entity_delete_three",
                primary_keys: ["name", "age"],
                fields: [
                    { name: "name", required: true },
                    { name: "email", type: "string" },
                    { name: "age", type: "uint" },
                    { name: "status", type: "boolean", required: true }
                ],
                before_delete: async function (entity, ids) {
                    if (ids.length == 1) {
                        return { code: SUCCESS };
                    } else {
                        return { code: ERROR };
                    }
                },
            });
            user_meta.validate_meta_info();

            const user_entity = new Entity(user_meta);

            it('should delete user with before delete', async function () {
                await user_entity.delete({});
                const user1 = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
                const user2 = { "name": "user2", age: "10", status: "true", email: "test@test.com" };
                await user_entity.create_entity(user1);
                await user_entity.create_entity(user2);
                const db_users = await user_entity.find({});
                const id_array = db_users.map(u => u["_id"] + "");
                const { code, err } = await user_entity.delete_entity(id_array);
                const count = await user_entity.count({});
                strictEqual(code, ERROR);
                deepStrictEqual(err, undefined);
                strictEqual(count, 2);

                const result = await user_entity.delete_entity([id_array[0]]);
                strictEqual(result.code, SUCCESS);
                deepStrictEqual(err, undefined);
                const count2 = await user_entity.count({});
                strictEqual(count2, 1);

                await user_entity.delete({});
            });
        });

        describe('delete entity with delete error callback', function () {
            const user_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "user_entity_delete_four",
                primary_keys: ["name", "age"],
                fields: [
                    { name: "name", required: true },
                    { name: "email", type: "string" },
                    { name: "age", type: "uint" },
                    { name: "status", type: "boolean" }
                ],
                delete: async function (entity, obj) {
                    return { code: ERROR };
                },
            });
            user_meta.validate_meta_info();

            const user_entity = new Entity(user_meta);

            it('should return error code', async function () {
                await user_entity.delete({});
                const user1 = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
                const user2 = { "name": "user2", age: "10", status: "true", email: "test@test.com" };
                await user_entity.create_entity(user1);
                await user_entity.create_entity(user2);
                const db_users = await user_entity.find({});
                const id_array = db_users.map(u => u["_id"] + "");
                const { code, err } = await user_entity.delete_entity(id_array);
                const count = await user_entity.count({});
                strictEqual(code, ERROR);
                deepStrictEqual(err, undefined);
                strictEqual(count, 2);
            });
        });

        describe('delete entity with after callback', function () {
            const user_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "user_entity_delete_five",
                primary_keys: ["name", "age"],
                fields: [
                    { name: "name", required: true },
                    { name: "email", type: "string" },
                    { name: "age", type: "uint" },
                    { name: "status", type: "boolean" }
                ],
                after_delete: async function (entity, obj) {
                    return { code: ERROR };
                },
            });
            user_meta.validate_meta_info();

            const user_entity = new Entity(user_meta);

            it('should delete user fail with after create callback', async function () {
                await user_entity.delete({});
                const user1 = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
                const user2 = { "name": "user2", age: "10", status: "true", email: "test@test.com" };
                await user_entity.create_entity(user1);
                await user_entity.create_entity(user2);
                const db_users = await user_entity.find({});
                const id_array = db_users.map(u => u["_id"] + "");
                const { code, err } = await user_entity.delete_entity(id_array);
                const count = await user_entity.count({});
                strictEqual(code, ERROR);
                deepStrictEqual(err, undefined);
                strictEqual(count, 0);
            });
        });

        describe('delete entity with ref fields', function () {
            const user_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "user_entity_delete_seven",
                primary_keys: ["name"],
                fields: [
                    { name: "name", required: true },
                    { name: "age", type: "uint" },
                    { name: "role", type: "string", ref: "role_delete_seven", required: true },
                ]
            });

            const role_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "role_delete_seven",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", required: true },
                    { name: "desc", type: "string" }
                ]
            });
            user_meta.validate_meta_info();
            role_meta.validate_meta_info();

            const user_entity = new Entity(user_meta);
            const role_entity = new Entity(role_meta);

            it('should delete user successfully with role', async function () {
                await user_entity.delete({});
                await role_entity.delete({});
                await role_entity.create({ "name": "role1" });
                await role_entity.create({ "name": "role2", desc: "role 2" });
                const db_role = await role_entity.find_one(user_entity.primary_key_query({ "name": "role1" }));
                const db_role2 = await role_entity.find_one(user_entity.primary_key_query({ "name": "role2" }));

                const user = { "name": "user1", age: "10", role: "role1" };
                const { code, err } = await user_entity.create_entity(user);
                const query = user_entity.primary_key_query(user);
                const db_user = await user_entity.find_one(query);
                strictEqual(code, SUCCESS);
                strictEqual(err, undefined);
                strictEqual(db_user.role, db_role["_id"] + "");

                const user2 = { "name": "user2", age: "20", role: db_role["_id"] + "" };
                const result = await user_entity.create_entity(user2);
                const query2 = user_entity.primary_key_query(user2);
                const db_user2 = await user_entity.find_one(query2);
                strictEqual(result.code, SUCCESS);
                strictEqual(result.err, undefined);
                strictEqual(db_user2.role, db_role["_id"] + "");

                const delete_ids = [db_role["_id"] + ""];
                const result3 = await role_entity.delete_entity(delete_ids);
                strictEqual(result3.code, HAS_REF);
                deepStrictEqual(result3.err, delete_ids);

                const result4 = await role_entity.delete_entity([db_role2["_id"] + ""]);
                strictEqual(result4.code, SUCCESS);
                strictEqual(result4.err, undefined);

                await user_entity.delete({});
                await role_entity.delete({});
            });
        });

        describe('delete entity with ref and keep delete fields', function () {
            const user_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "user_entity_delete_eight",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", required: true },
                    { name: "age", type: "uint" },
                    { name: "role", type: "string", ref: "role_delete_eight", delete: "keep", required: true },
                ]
            });

            const role_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "role_delete_eight",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", required: true },
                    { name: "desc", type: "string" }
                ]
            });

            const log_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "log_one",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", required: true },
                    { name: "user", type: "string", ref: "user_entity_delete_eight", delete: "cascade", required: true },
                ]
            });

            user_meta.validate_meta_info();
            role_meta.validate_meta_info();
            log_meta.validate_meta_info();

            const user_entity = new Entity(user_meta);
            const role_entity = new Entity(role_meta);
            const log_entity = new Entity(log_meta);

            it('should delete user successfully with role', async function () {
                await user_entity.delete({});
                await role_entity.delete({});
                await log_entity.delete({});
                await role_entity.create({ "name": "role1" });
                await role_entity.create({ "name": "role2", desc: "role 2" });
                const db_role = await role_entity.find_one(user_entity.primary_key_query({ "name": "role1" }));

                const user = { "name": "user1", age: "10", role: "role1" };
                const { code, err } = await user_entity.create_entity(user);
                const query = user_entity.primary_key_query(user);
                const db_user = await user_entity.find_one(query);
                strictEqual(code, SUCCESS);
                strictEqual(err, undefined);
                strictEqual(db_user.role, db_role["_id"] + "");

                const user2 = { "name": "user2", age: "20", role: db_role["_id"] + "" };
                const result = await user_entity.create_entity(user2);
                const query2 = user_entity.primary_key_query(user2);
                const db_user2 = await user_entity.find_one(query2);
                strictEqual(result.code, SUCCESS);
                strictEqual(result.err, undefined);
                strictEqual(db_user2.role, db_role["_id"] + "");

                const log1 = { "name": "log1", user: db_user2["_id"] + "" };
                const resultlog = await log_entity.create_entity(log1);
                const db_log = await log_entity.find_one(log_entity.primary_key_query(log1));
                strictEqual(resultlog.code, SUCCESS);
                strictEqual(resultlog.err, undefined);
                strictEqual(db_log.user, db_user2["_id"] + "");

                const delete_ids = [db_role["_id"] + ""];
                const result3 = await role_entity.delete_entity(delete_ids);
                strictEqual(result3.code, SUCCESS);
                deepStrictEqual(result3.err, undefined);

                strictEqual(await user_entity.count({}), 2);
                strictEqual(await role_entity.count({}), 1);
                strictEqual(await log_entity.count({}), 1);

                const result4 = await user_entity.delete_entity([db_user2["_id"] + ""]);
                strictEqual(result4.code, SUCCESS);
                deepStrictEqual(result4.err, undefined);

                strictEqual(await user_entity.count({}), 1);
                strictEqual(await role_entity.count({}), 1);
                strictEqual(await log_entity.count({}), 0);

                await user_entity.delete({});
                await role_entity.delete({});
                await log_entity.delete({});
            });
        });


        describe('delete entity with ref and cascade delete fields', function () {
            const user_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "user_entity_delete_nine",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", required: true },
                    { name: "age", type: "uint" },
                    { name: "role", type: "string", ref: "role_delete_nine", delete: "cascade", required: true },
                ]
            });

            const role_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "role_delete_nine",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", required: true },
                    { name: "desc", type: "string" }
                ]
            });

            const log_meta = new EntityMeta({
                creatable: true,
                readable: true,
                updatable: true,
                deleteable: true,
                collection: "log_nine",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", required: true },
                    { name: "user", type: "string", ref: "user_entity_delete_nine", delete: "cascade", required: true },
                ]
            });

            user_meta.validate_meta_info();
            role_meta.validate_meta_info();
            log_meta.validate_meta_info();

            const user_entity = new Entity(user_meta);
            const role_entity = new Entity(role_meta);
            const log_entity = new Entity(log_meta);

            it('should delete user successfully with role', async function () {
                await user_entity.delete({});
                await role_entity.delete({});
                await log_entity.delete({});
                await role_entity.create({ "name": "role1" });
                await role_entity.create({ "name": "role2", desc: "role 2" });
                const db_role = await role_entity.find_one(user_entity.primary_key_query({ "name": "role1" }));

                const user = { "name": "user1", age: "10", role: "role1" };
                const { code, err } = await user_entity.create_entity(user);
                const query = user_entity.primary_key_query(user);
                const db_user = await user_entity.find_one(query);
                strictEqual(code, SUCCESS);
                strictEqual(err, undefined);
                strictEqual(db_user.role, db_role["_id"] + "");

                const user2 = { "name": "user2", age: "20", role: db_role["_id"] + "" };
                const result = await user_entity.create_entity(user2);
                const query2 = user_entity.primary_key_query(user2);
                const db_user2 = await user_entity.find_one(query2);
                strictEqual(result.code, SUCCESS);
                strictEqual(result.err, undefined);
                strictEqual(db_user2.role, db_role["_id"] + "");

                const log1 = { "name": "log1", user: db_user2["_id"] + "" };
                const resultlog = await log_entity.create_entity(log1);
                const db_log = await log_entity.find_one(log_entity.primary_key_query(log1));
                strictEqual(resultlog.code, SUCCESS);
                strictEqual(resultlog.err, undefined);
                strictEqual(db_log.user, db_user2["_id"] + "");

                const delete_ids = [db_role["_id"] + ""];
                const result3 = await role_entity.delete_entity(delete_ids);
                strictEqual(result3.code, SUCCESS);
                deepStrictEqual(result3.err, undefined);

                strictEqual(await user_entity.count({}), 0);
                strictEqual(await role_entity.count({}), 1);
                strictEqual(await log_entity.count({}), 0);

                await user_entity.delete({});
                await role_entity.delete({});
                await log_entity.delete({});
            });
        });
    });
}
);

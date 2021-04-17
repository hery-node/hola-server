const { SUCCESS, ERROR, NOT_FOUND, REF_NOT_FOUND } = require('../../http/code');
const { strictEqual } = require('assert');
const { Entity } = require('../../db/entity');
const { EntityMeta } = require('../../core/meta');

describe('Entity Update', function () {
    describe('update entity', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_update_entity",
            primary_keys: ["name"],
            fields: [
                { name: "name", required: true },
                { name: "email", type: "string" },
                { name: "age", type: "uint" },
                { name: "status", type: "boolean", sys: true }
            ]
        });
        user_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);

        it('should update user with id successfully', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
            const { code, err } = await user_entity.create_entity(user);
            strictEqual(err, undefined);
            strictEqual(code, SUCCESS);

            const db_user = await user_entity.find_one(user_entity.primary_key_query(user));
            const result = await user_entity.update_entity(db_user._id + "", { age: "100", status: "true" });
            strictEqual(result.code, SUCCESS);
            strictEqual(result.err, undefined);

            const updated_user = await user_entity.find_by_oid(db_user._id + "");
            strictEqual(updated_user.age, 100);
            strictEqual(updated_user.status, undefined);// ignore user's update for sys property
            await user_entity.delete({});
        });


        it('should update user with primary key successfully', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
            const { code, err } = await user_entity.create_entity(user);
            strictEqual(code, SUCCESS);
            strictEqual(err, undefined);

            const db_user = await user_entity.find_one(user_entity.primary_key_query(user));
            const result = await user_entity.update_entity(undefined, { "name": "user1", age: "100" });
            strictEqual(result.code, SUCCESS);
            strictEqual(result.err, undefined);

            const updated_user = await user_entity.find_by_oid(db_user._id + "");
            strictEqual(updated_user.age, 100);
            await user_entity.delete({});
        });

        it('should update user with fail with invalid id', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
            const result = await user_entity.update_entity(undefined, user);
            strictEqual(result.code, NOT_FOUND);
            await user_entity.delete({});
        });

    });

    describe('update entity with before update callback', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_update_entity_three",
            primary_keys: ["name"],
            fields: [
                { name: "name", type: "string", required: true },
                { name: "email", type: "string" },
                { name: "age", type: "uint" }
            ],
            before_update: async function (_id, entity, obj) {
                obj.age = 100;
                return { code: SUCCESS };
            },
        });
        user_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);

        it('should update user successfully', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10" };
            const { code, err } = await user_entity.create_entity(user);
            strictEqual(code, SUCCESS);
            strictEqual(err, undefined);

            const result = await user_entity.update_entity(undefined, { "name": "user1", age: 20 });
            strictEqual(result.err, undefined);
            strictEqual(result.code, SUCCESS);

            const db_user = await user_entity.find_one(user_entity.primary_key_query(user));
            strictEqual(db_user.age, 100);
            await user_entity.delete({});
        });
    });

    describe('update entity with update error callback', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_update_entity_four",
            primary_keys: ["name"],
            fields: [
                { name: "name", required: true },
                { name: "email", type: "string" },
                { name: "age", type: "uint" },
                { name: "status", type: "boolean" }
            ],
            update: async function (entity, obj) {
                return { code: ERROR };
            },
        });
        user_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);

        it('should return error code', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10" };
            await user_entity.create_entity(user);
            const { code } = await user_entity.update_entity(undefined, { "name": "user1", age: "20" });
            strictEqual(code, ERROR);

            const db_user = await user_entity.find_one(user_entity.primary_key_query(user));
            strictEqual(db_user.age, 10);

            await user_entity.delete({});
        });
    });

    describe('update entity with after callback', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_update_entity_five",
            primary_keys: ["name"],
            fields: [
                { name: "name", required: true },
                { name: "email", type: "string" },
                { name: "age", type: "uint" },
                { name: "status", type: "boolean" }
            ],
            after_update: async function (_id, entity, obj) {
                const query = entity.primary_key_query(obj);
                await entity.update(query, { "status": true });
                return { code: SUCCESS };
            },
        });
        user_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);

        it('should update user successfully with after update callback', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10" };
            await user_entity.create_entity(user);
            const { code, err } = await user_entity.update_entity(undefined, { "name": "user1", age: "20" })
            const query = user_entity.primary_key_query(user);
            const db_user = await user_entity.find_one(query);
            strictEqual(code, SUCCESS);
            strictEqual(err, undefined);
            strictEqual(db_user.age, 20);
            strictEqual(db_user.status, true);

            await user_entity.delete({});
        });
    });

    describe('update entity with ref fields', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_update_seven",
            primary_keys: ["name"],
            fields: [
                { name: "name", required: true },
                { name: "age", type: "uint" },
                { name: "role", type: "string", ref: "role_update_seven", required: true },
            ]
        });

        const role_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "role_update_seven",
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

        it('should create user successfully with role', async function () {
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

            const update_result = await user_entity.update_entity(db_user["_id"] + "", { role: "role2" });
            strictEqual(update_result.code, SUCCESS);
            strictEqual(update_result.err, undefined);
            const update_db_user = await user_entity.find_by_oid(db_user["_id"] + "");
            strictEqual(update_db_user.role, db_role2["_id"] + "");

            const result3 = await user_entity.update_entity(db_user["_id"] + "", { role: "role333" });
            strictEqual(result3.code, REF_NOT_FOUND);

            await user_entity.delete({});
            await role_entity.delete({});
        });
    });

}
);

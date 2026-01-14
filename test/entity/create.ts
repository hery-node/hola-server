import { SUCCESS, ERROR, NO_PARAMS, INVALID_PARAMS, DUPLICATE_KEY, REF_NOT_FOUND } from '../../src/http/code.js';
import { strictEqual, deepStrictEqual } from 'assert';
import { Entity } from '../../src/db/entity.js';
import { EntityMeta } from '../../src/core/meta.js';

describe('Entity Create', function () {
    describe('create entity', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_entity",
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

        it('should create user successfully', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
            const { code, err } = await user_entity.create_entity(user);
            const count = await user_entity.count_by_primary_keys(user);
            strictEqual(count, 1);
            strictEqual(code, SUCCESS);
            strictEqual(err, undefined);

            const db_user = await user_entity.find_one(user_entity.primary_key_query(user));
            strictEqual(db_user.name, "user1");
            strictEqual(db_user.age, 10);
            strictEqual(db_user.status, undefined);// user can't set sys value

            await user_entity.delete({});
        });

        it('check invalid age value', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "abc", status: true, email: "test@test.com" };
            const { code, err } = await user_entity.create_entity(user);
            strictEqual(code, INVALID_PARAMS);
            deepStrictEqual(err, ["age"]);

            await user_entity.delete({});
        });


        it('check primary key', async function () {
            await user_entity.delete({});
            const user = { age: "10", status: true, email: "test@test.com" };
            const { code, err } = await user_entity.create_entity(user);
            strictEqual(code, NO_PARAMS);
            deepStrictEqual(err, ["name"]);

            await user_entity.delete({});
        });

        it('check duplicate name value', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10", status: true, email: "test@test.com" };
            const result = await user_entity.create_entity(user);
            strictEqual(result.code, SUCCESS);
            strictEqual(result.err, undefined);
            const { code } = await user_entity.create_entity(user);
            strictEqual(code, DUPLICATE_KEY);

            await user_entity.delete({});
        });
    });


    describe('create entity with two primary keys', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_entity_two",
            primary_keys: ["name", "age"],
            fields: [
                { name: "name", required: true },
                { name: "email", type: "string" },
                { name: "age", type: "uint" },
                { name: "status", type: "boolean" }
            ]
        });
        user_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);

        it('should create user successfully', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10", status: "true", email: "test@test.com" };
            const { code, err } = await user_entity.create_entity(user);
            const count = await user_entity.count_by_primary_keys(user);
            strictEqual(code, SUCCESS);
            strictEqual(err, undefined);
            strictEqual(count, 1);

            await user_entity.delete({});
        });

        it('check duplicate for two primary key values', async function () {
            await user_entity.delete({});
            const user1 = { "name": "user1", age: "10", status: true, email: "test@test.com" };
            const user2 = { "name": "user1", age: "9", status: true, email: "test@test.com" };
            let result = await user_entity.create_entity(user1);
            strictEqual(result.code, SUCCESS);
            strictEqual(result.err, undefined);
            result = await user_entity.create_entity(user2);
            strictEqual(result.code, SUCCESS);
            strictEqual(result.err, undefined);

            const count = await user_entity.count({});
            strictEqual(count, 2);

            await user_entity.delete({});
        });

        it('check required age for two primary key values', async function () {
            await user_entity.delete({});
            const user1 = { "name": "user1", status: true, email: "test@test.com" };
            let result = await user_entity.create_entity(user1);
            strictEqual(result.code, NO_PARAMS);
            deepStrictEqual(result.err, ["age"]);
            const count = await user_entity.count({});
            strictEqual(count, 0);

            await user_entity.delete({});
        });
    });

    describe('create entity with before create callback', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_entity_three",
            primary_keys: ["name", "age"],
            fields: [
                { name: "name", required: true },
                { name: "email", type: "string" },
                { name: "age", type: "uint" },
                { name: "status", type: "boolean", required: true }
            ],
            before_create: async function (entity, obj) {
                obj.status = true;
                return { code: SUCCESS };
            },
        });
        user_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);

        it('should create user successfully', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10" };
            const { code, err } = await user_entity.create_entity(user);
            const count = await user_entity.count_by_primary_keys(user);
            strictEqual(code, SUCCESS);
            strictEqual(err, undefined);
            strictEqual(count, 1);

            await user_entity.delete({});
        });
    });

    describe('create entity with create error callback', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_entity_four",
            primary_keys: ["name", "age"],
            fields: [
                { name: "name", required: true },
                { name: "email", type: "string" },
                { name: "age", type: "uint" },
                { name: "status", type: "boolean" }
            ],
            create: async function (entity, obj) {
                return { code: ERROR };
            },
        });
        user_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);

        it('should return error code', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10" };
            const { code } = await user_entity.create_entity(user);
            strictEqual(code, ERROR);

            const count = await user_entity.count({});
            strictEqual(count, 0);

            await user_entity.delete({});
        });
    });

    describe('create entity with after callback', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_entity_five",
            primary_keys: ["name", "age"],
            fields: [
                { name: "name", required: true },
                { name: "email", type: "string" },
                { name: "age", type: "uint" },
                { name: "status", type: "boolean" }
            ],
            after_create: async function (entity, obj) {
                const query = entity.primary_key_query(obj);
                await entity.update(query, { "status": true });
                return { code: SUCCESS };
            },
        });
        user_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);

        it('should create user successfully with after create callback', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10" };
            const { code, err } = await user_entity.create_entity(user);
            const query = user_entity.primary_key_query(user);
            const db_user = await user_entity.find_one(query);
            strictEqual(code, SUCCESS);
            strictEqual(err, undefined);
            strictEqual(db_user.age, 10);
            strictEqual(db_user.status, true);

            await user_entity.delete({});
        });
    });

    describe('create entity with create callback', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_entity_six",
            primary_keys: ["name", "age"],
            fields: [
                { name: "name", required: true },
                { name: "email", type: "string" },
                { name: "age", type: "uint" },
                { name: "status", type: "boolean" }
            ],
            create: async function (entity, obj) {
                obj.email = "create@test.com";
                await entity.create(obj);
                return { code: SUCCESS };
            },
        });
        user_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);

        it('should create user successfully with create callback', async function () {
            await user_entity.delete({});
            const user = { "name": "user1", age: "10" };
            const { code, err } = await user_entity.create_entity(user);
            const query = user_entity.primary_key_query(user);
            const db_user = await user_entity.find_one(query);
            strictEqual(code, SUCCESS);
            strictEqual(err, undefined);
            strictEqual(db_user.email, "create@test.com");

            await user_entity.delete({});
        });
    });

    describe('create entity with ref fields', function () {
        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_entity_seven",
            primary_keys: ["name"],
            fields: [
                { name: "name", required: true },
                { name: "age", type: "uint" },
                { name: "role", type: "string", ref: "role_seven", required: true },
            ]
        });

        const role_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "role_seven",
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

            const user3 = { "name": "user3", age: "20", role: "rolef2" };
            const result3 = await user_entity.create_entity(user3);
            strictEqual(result3.code, REF_NOT_FOUND);

            await user_entity.delete({});
            await role_entity.delete({});
        });
    });

    describe('create entity with multi ref fields', function () {
        const role_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "role_eight",
            primary_keys: ["name"],
            ref_label: "name",
            fields: [
                { name: "name", required: true },
                { name: "desc", type: "string" }
            ]
        });

        const area_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "area_eight",
            primary_keys: ["name"],
            ref_label: "name",
            fields: [
                { name: "name", required: true },
                { name: "desc", type: "string" }
            ]
        });

        const user_meta = new EntityMeta({
            creatable: true,
            readable: true,
            updatable: true,
            deleteable: true,
            collection: "user_entity_eight",
            primary_keys: ["name"],
            fields: [
                { name: "name", required: true },
                { name: "role", type: "string", ref: "role_eight" },
                { name: "area", type: "string", ref: "area_eight" }
            ]
        });


        user_meta.validate_meta_info();
        role_meta.validate_meta_info();
        area_meta.validate_meta_info();

        const user_entity = new Entity(user_meta);
        const role_entity = new Entity(role_meta);
        const area_entity = new Entity(area_meta);

        it('should create user successfully with role and area', async function () {
            await user_entity.delete({});
            await role_entity.delete({});
            await area_entity.delete({});
            await role_entity.create({ "name": "role1" });
            await role_entity.create({ "name": "role2", desc: "role 2" });
            await area_entity.create({ "name": "area1" });
            await area_entity.create({ "name": "area2", desc: "area 2" });
            const db_role = await role_entity.find_one(user_entity.primary_key_query({ "name": "role1" }));
            const db_area = await area_entity.find_one(area_entity.primary_key_query({ "name": "area1" }));

            const user = { "name": "user1", age: "10", role: "role1", area: "area1" };
            const { code, err } = await user_entity.create_entity(user);
            const query = user_entity.primary_key_query(user);
            const db_user = await user_entity.find_one(query);
            strictEqual(err, undefined);
            strictEqual(code, SUCCESS);
            strictEqual(db_user.role, db_role["_id"] + "");
            strictEqual(db_user.area, db_area["_id"] + "");

            const result = await user_entity.create_entity({ "name": "user2", age: "10", role: db_role["_id"] + "", area: db_area["_id"] + "" });
            const db_user2 = await user_entity.find_one(user_entity.primary_key_query({ "name": "user1" }));
            strictEqual(result.err, undefined);
            strictEqual(result.code, SUCCESS);
            strictEqual(db_user2.role, db_role["_id"] + "");
            strictEqual(db_user2.area, db_area["_id"] + "");

            const user3 = { "name": "user3", age: "20", role: "rolef2" };
            const result3 = await user_entity.create_entity(user3);
            strictEqual(result3.code, REF_NOT_FOUND);

            await user_entity.delete({});
            await role_entity.delete({});
            await area_entity.delete({});
        });
    });
}
);

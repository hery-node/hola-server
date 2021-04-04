const { SUCCESS, ERROR, NO_PARAMS, INVALID_PARAMS, DUPLICATE_KEY, REF_NOT_FOUND } = require('../../http/code');
const { strictEqual, deepStrictEqual } = require('assert');
const { Entity } = require('../../db/entity');
const { EntityMeta } = require('../../core/meta');

const user = {
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "user_read",
    primary_keys: ["name"],
    fields: [
        { name: "name", required: true },
        { name: "pwd", type: "password", visible: false, required: true },
        { name: "email", type: "string" },
        { name: "age", type: "uint" },
        { name: "role", type: "array", ref: "role_read", required: true },
        { name: "depart", type: "string", ref: "department_read", required: true },
        { name: "status", type: "boolean" },
        { name: "desc", type: "string", searchable: false }
    ]
};

const department = {
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "department_read",
    primary_keys: ["name"],
    ref_label: "name",
    fields: [
        { name: "name", required: true },
        { name: "desc", type: "string" }
    ]
};

const role = {
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "role_read",
    primary_keys: ["name"],
    ref_label: "name",
    ref_filter: { status: true },
    fields: [
        { name: "name", type: "string", required: true },
        { name: "desc", type: "string" },
        { name: "status", type: "boolean" }
    ]
};
const user_meta = new EntityMeta(user);
const role_meta = new EntityMeta(role);
const department_meta = new EntityMeta(department);
user_meta.validate_meta_info();
role_meta.validate_meta_info();
department_meta.validate_meta_info();

const user_entity = new Entity(user_meta);
const role_entity = new Entity(role_meta);
const department_entity = new Entity(department_meta);

const init_db = async () => {
    await user_entity.delete({});
    await role_entity.delete({});

    await role_entity.create_entity({ name: "admin", status: true });
    await role_entity.create_entity({ name: "user", status: true });
    await role_entity.create_entity({ name: "user1", status: false });
    await role_entity.create_entity({ name: "user2", status: true });
    await role_entity.create_entity({ name: "user3", status: true });

    await department_entity.create_entity({ name: "dev" });
    await department_entity.create_entity({ name: "test" });

    const { code, err } = await user_entity.create_entity({ "name": "user1", pwd: "pwd", age: "10", depart: "dev", role: "user", status: "true", email: "test@test.com", desc: "abcd" });
    strictEqual(err, undefined);
    strictEqual(code, SUCCESS);

    await user_entity.create_entity({ "name": "user2", pwd: "pwd", age: "11", depart: "dev", role: "user", status: "true", email: "test@test.com", desc: "abcd" });
    await user_entity.create_entity({ "name": "user3", pwd: "pwd", age: "12", depart: "dev", role: "user", status: "false", email: "test@test.com", desc: "abcd" });
    await user_entity.create_entity({ "name": "user4", pwd: "pwd", age: "13", depart: "dev", role: "user", status: "false", email: "test@test.com", desc: "abcd" });
    await user_entity.create_entity({ "name": "user5", pwd: "pwd", age: "14", depart: "dev", role: "user", status: "false", email: "test@test.com" });
    await user_entity.create_entity({ "name": "user6", pwd: "pwd", age: "15", depart: "dev", role: "user", status: "false", email: "test@test.com" });
    await user_entity.create_entity({ "name": "user7", pwd: "pwd", age: "16", depart: "dev", role: "user", status: "true", email: "test@test.com" });
    await user_entity.create_entity({ "name": "user8", pwd: "pwd", age: "17", depart: "dev", role: "user", status: "true", email: "test@test.com" });
    await user_entity.create_entity({ "name": "user9", pwd: "pwd", age: "18", depart: "test", role: "user", status: "false", email: "test@test.com" });
    await user_entity.create_entity({ "name": "user10", pwd: "pwd", age: "19", depart: "test", role: "user", status: "false", email: "test@google.com" });
    await user_entity.create_entity({ "name": "user11", pwd: "pwd", age: "21", depart: "test", role: "user", status: "true", email: "test@google.com" });
    await user_entity.create_entity({ "name": "user12", pwd: "pwd", age: "22", depart: "test", role: "user", status: "true", email: "test@google.com" });
    await user_entity.create_entity({ "name": "user13", pwd: "pwd", age: "20", depart: "test", role: "user", status: "true", email: "test@google.com" });
    await user_entity.create_entity({ "name": "user14", pwd: "pwd", age: "20", depart: "test", role: "admin", status: "true", email: "test@google.com" });
    await user_entity.create_entity({ "name": "user15", pwd: "pwd", age: "20", depart: "test", role: "admin", status: "true", email: "test@google.com" });
}

describe('Entity Query', function () {
    describe('query entity', function () {
        it('search user by name', async function () {
            await init_db();

            const query = { "attr_names": "name,age", page: "1", limit: "10", sort_by: "name", desc: "true" };
            const params = { age: "20" };

            const { code, err, total, data } = await user_entity.list_entity(query, null, params);
            strictEqual(err, undefined);
            strictEqual(code, SUCCESS);
            strictEqual(total, 3);
            strictEqual(data.length, 3);
            strictEqual(data[0].age, 20);
            strictEqual(data[0].name, "user15");
            strictEqual(data[0].status, undefined);
        });


        it('get filtered ref roles', async function () {
            await init_db();

            const ref_roles = await role_entity.get_filtered_ref_labels();
            strictEqual(ref_roles.length, 4);
            strictEqual(ref_roles[0].name, "admin");
        });

        it('search user test invisible attr', async function () {
            await init_db();

            const query = { "attr_names": "name,age,pwd", page: "1", limit: "10", sort_by: "name", desc: "true" };
            const params = { age: "20" };

            const { code, err, total, data } = await user_entity.list_entity(query, null, params);
            strictEqual(err, undefined);
            strictEqual(code, SUCCESS);
            strictEqual(total, 3);
            strictEqual(data.length, 3);
            strictEqual(data[0].age, 20);
            strictEqual(data[0].name, "user15");
            strictEqual(data[0].pwd, undefined); //invisible attr
            strictEqual(data[0].status, undefined);
        });

        it('search user test age is 11 12 13', async function () {
            await init_db();

            const query = { "attr_names": "name,age", page: "1", limit: "10", sort_by: "age", desc: "true" };
            const params = { age: "11,12,13" };

            const { code, err, total, data } = await user_entity.list_entity(query, null, params);
            strictEqual(err, undefined);
            strictEqual(code, SUCCESS);
            strictEqual(total, 3);
            strictEqual(data.length, 3);
            strictEqual(data[0].age, 13);
            strictEqual(data[0].name, "user4");
        });

        it('search user test age is 17,18,19 and depart is test and role is user', async function () {
            await init_db();

            const query = { "attr_names": "name,age", page: "1", limit: "10", sort_by: "age", desc: "true" };
            const params = { age: "17,18,19", depart: "test", role: "user" };

            const { code, err, total, data } = await user_entity.list_entity(query, null, params);
            strictEqual(err, undefined);
            strictEqual(code, SUCCESS);
            strictEqual(total, 2);
            strictEqual(data.length, 2);
            strictEqual(data[0].age, 19);
            strictEqual(data[0].name, "user10");
        });

        it('search user test age is 17 and success ref_label', async function () {
            await init_db();

            const query = { "attr_names": "name,age,role,depart", page: "1", limit: "10", sort_by: "age", desc: "true" };
            const params = { age: "17" };

            const { code, err, total, data } = await user_entity.list_entity(query, null, params);
            strictEqual(err, undefined);
            strictEqual(code, SUCCESS);
            strictEqual(total, 1);
            strictEqual(data.length, 1);
            strictEqual(data[0].age, 17);
            strictEqual(data[0].name, "user8");
            strictEqual(data[0].depart, "dev");
            deepStrictEqual(data[0].role, ["user"]);
        });

        it('search user test age is 11 and ignore non searchable desc property', async function () {
            await init_db();

            const query = { "attr_names": "name,age", page: "1", limit: "10", sort_by: "age", desc: "true" };
            const params = { age: "11", desc: "desc" };

            const { code, err, total, data } = await user_entity.list_entity(query, null, params);
            strictEqual(err, undefined);
            strictEqual(code, SUCCESS);
            strictEqual(total, 1);
            strictEqual(data.length, 1);
            strictEqual(data[0].age, 11);
            strictEqual(data[0].name, "user2");
        });


        it('search user age more than 15', async function () {
            await init_db();

            const query = { "attr_names": "name,age", page: "1", limit: "5", sort_by: "age", desc: "false" };
            const params = { age: ">15" };

            const { code, err, total, data } = await user_entity.list_entity(query, null, params);
            strictEqual(err, undefined);
            strictEqual(code, SUCCESS);
            strictEqual(total, 9);
            strictEqual(data.length, 5);
            strictEqual(data[0].age, 16);
            strictEqual(data[0].name, "user7");
            strictEqual(data[0].status, undefined);
        });

        it('search user age more than 15 and status true', async function () {
            await init_db();

            const query = { "attr_names": "name,age", page: "1", limit: "5", sort_by: "age", desc: "false" };
            const params = { age: "<15", status: "true" };

            const { code, err, total, data } = await user_entity.list_entity(query, null, params);
            strictEqual(err, undefined);
            strictEqual(code, SUCCESS);
            strictEqual(total, 2);
            strictEqual(data.length, 2);
            strictEqual(data[0].age, 10);
            strictEqual(data[0].name, "user1");
            strictEqual(data[0].status, undefined);
        });
    });

    it('search user age more than 15, status is true and role is admin', async function () {
        await init_db();

        const query = { "attr_names": "name,age", page: "1", limit: "5", sort_by: "name", desc: "false" };
        const params = { age: ">15", status: "true", role: "admin" };

        const { code, err, total, data } = await user_entity.list_entity(query, null, params);
        strictEqual(err, undefined);
        strictEqual(code, SUCCESS);
        strictEqual(total, 2);
        strictEqual(data.length, 2);
        strictEqual(data[0].age, 20);
        strictEqual(data[0].name, "user14");
        strictEqual(data[0].status, undefined);
    });

    it('search user age more than 15, status is true and role is admin or user', async function () {
        await init_db();

        const query = { "attr_names": "name,age", page: "1", limit: "5", sort_by: "age", desc: "false" };
        const params = { age: ">15", status: "true", role: "admin,user" };

        const { code, err, total, data } = await user_entity.list_entity(query, null, params);
        strictEqual(err, undefined);
        strictEqual(code, SUCCESS);
        strictEqual(total, 7);
        strictEqual(data.length, 5);
        strictEqual(data[0].age, 16);
        strictEqual(data[0].name, "user7");
        strictEqual(data[0].status, undefined);
    });
}
);

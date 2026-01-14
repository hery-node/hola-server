import { strictEqual } from 'assert';
import { Entity } from '../../src/db/entity.js';
import { EntityMeta } from '../../src/core/meta.js';
import { SUCCESS } from '../../src/http/code.js';

// Parent with mixed keep/cascade references
const role_mix_meta = new EntityMeta({
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "role_delete_mix",
    primary_keys: ["name"],
    ref_label: "name",
    fields: [
        { name: "name", required: true }
    ]
});

const user_keep_meta = new EntityMeta({
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "user_delete_keep",
    primary_keys: ["name"],
    fields: [
        { name: "name", required: true },
        { name: "role", type: "string", ref: "role_delete_mix", delete: "keep", required: true }
    ]
});

const audit_cascade_meta = new EntityMeta({
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "audit_delete_cascade",
    primary_keys: ["name"],
    fields: [
        { name: "name", required: true },
        { name: "role", type: "string", ref: "role_delete_mix", delete: "cascade", required: true }
    ]
});

role_mix_meta.validate_meta_info();
user_keep_meta.validate_meta_info();
audit_cascade_meta.validate_meta_info();

const role_mix_entity = new Entity(role_mix_meta);
const user_keep_entity = new Entity(user_keep_meta);
const audit_cascade_entity = new Entity(audit_cascade_meta);

// Parent with array ref cascade chain
const role_array_meta = new EntityMeta({
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "role_delete_array",
    primary_keys: ["name"],
    ref_label: "name",
    fields: [
        { name: "name", required: true }
    ]
});

const user_array_meta = new EntityMeta({
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "user_delete_array",
    primary_keys: ["name"],
    ref_label: "name",
    fields: [
        { name: "name", required: true },
        { name: "roles", type: "array", ref: "role_delete_array", delete: "cascade", required: true }
    ]
});

const audit_array_meta = new EntityMeta({
    creatable: true,
    readable: true,
    updatable: true,
    deleteable: true,
    collection: "audit_delete_array",
    primary_keys: ["name"],
    fields: [
        { name: "name", required: true },
        { name: "user", type: "string", ref: "user_delete_array", delete: "cascade", required: true }
    ]
});

role_array_meta.validate_meta_info();
user_array_meta.validate_meta_info();
audit_array_meta.validate_meta_info();

const role_array_entity = new Entity(role_array_meta);
const user_array_entity = new Entity(user_array_meta);
const audit_array_entity = new Entity(audit_array_meta);

describe("Entity delete cascade/keep edges", function () {
    beforeEach(async function () {
        await role_mix_entity.delete({});
        await user_keep_entity.delete({});
        await audit_cascade_entity.delete({});
        await role_array_entity.delete({});
        await user_array_entity.delete({});
        await audit_array_entity.delete({});
    });

    after(async function () {
        await role_mix_entity.delete({});
        await user_keep_entity.delete({});
        await audit_cascade_entity.delete({});
        await role_array_entity.delete({});
        await user_array_entity.delete({});
        await audit_array_entity.delete({});
    });

    it("should cascade deletions while keeping keep-referenced entities", async function () {
        await role_mix_entity.create_entity({ name: "role1" });
        const role = await role_mix_entity.find_one({ name: "role1" });

        const { code: uCode } = await user_keep_entity.create_entity({ name: "u1", role: "role1" });
        strictEqual(uCode, SUCCESS);
        const { code: aCode } = await audit_cascade_entity.create_entity({ name: "a1", role: "role1" });
        strictEqual(aCode, SUCCESS);

        const result = await role_mix_entity.delete_entity([role._id + ""]);
        strictEqual(result.code, SUCCESS);
        strictEqual(await role_mix_entity.count({}), 0);
        strictEqual(await user_keep_entity.count({}), 1);
        strictEqual(await audit_cascade_entity.count({}), 0);
    });

    it("should cascade through array refs and downstream cascades", async function () {
        await role_array_entity.create_entity({ name: "r1" });
        await role_array_entity.create_entity({ name: "r2" });
        const role1 = await role_array_entity.find_one({ name: "r1" });

        const { code: uCode } = await user_array_entity.create_entity({ name: "u1", roles: ["r1", "r2"] });
        strictEqual(uCode, SUCCESS);
        const user = await user_array_entity.find_one({ name: "u1" });
        const { code: aCode } = await audit_array_entity.create_entity({ name: "a1", user: user._id + "" });
        strictEqual(aCode, SUCCESS);

        const result = await role_array_entity.delete_entity([role1._id + ""]);
        strictEqual(result.code, SUCCESS);

        strictEqual(await role_array_entity.count({}), 1); // r2 remains
        strictEqual(await user_array_entity.count({}), 0); // u1 cascaded
        strictEqual(await audit_array_entity.count({}), 0); // a1 cascaded via user deletion
    });
});

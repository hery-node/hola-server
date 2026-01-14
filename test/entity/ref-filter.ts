import { strictEqual } from 'assert';
import { Entity } from '../../src/db/entity.js';
import { EntityMeta } from '../../src/core/meta.js';
import { SUCCESS, REF_NOT_FOUND } from '../../src/http/code.js';

const role_meta = new EntityMeta({
    collection: "role_filter",
    primary_keys: ["name"],
    ref_label: "name",
    fields: [
        { name: "name", type: "string", required: true },
        { name: "status", type: "boolean", required: true }
    ],
    ref_filter: { status: true }
});
role_meta.validate_meta_info();
const role_entity = new Entity(role_meta);

const user_meta = new EntityMeta({
    collection: "user_filter",
    primary_keys: ["name"],
    fields: [
        { name: "name", type: "string", required: true },
        { name: "role", type: "string", ref: "role_filter", required: true }
    ]
});
user_meta.validate_meta_info();
const user_entity = new Entity(user_meta);

describe("Entity ref_filter", function () {
    beforeEach(async function () {
        await role_entity.delete({});
        await user_entity.delete({});
    });

    after(async function () {
        await role_entity.delete({});
        await user_entity.delete({});
    });

    it("should reject ref values filtered out by ref_filter", async function () {
        await role_entity.create_entity({ name: "active", status: true });
        await role_entity.create_entity({ name: "inactive", status: false });

        const { code, err } = await user_entity.create_entity({ name: "u1", role: "inactive" });
        strictEqual(code, REF_NOT_FOUND);
        strictEqual(err[0], "role");

        const { code: ok } = await user_entity.create_entity({ name: "u2", role: "active" });
        strictEqual(ok, SUCCESS);
    });

    it("find_by_ref_value should obey default ref_filter", async function () {
        await role_entity.create_entity({ name: "active", status: true });
        await role_entity.create_entity({ name: "inactive", status: false });

        const active = await role_entity.find_by_ref_value("active", { _id: 1 });
        strictEqual(active.length, 1);

        const inactive = await role_entity.find_by_ref_value("inactive", { _id: 1 });
        strictEqual(inactive.length, 0);
    });
});

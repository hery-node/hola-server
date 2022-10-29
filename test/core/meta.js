const { strictEqual, throws } = require('assert');
const { EntityMeta } = require('../../core/meta');
const { convert_type } = require('../../core/type');
const { encrypt_pwd } = require('../../core/encrypt');

describe('EntityMeta', function () {
    describe('crud', function () {
        it('should crud properties set successfully', function () {
            const entity_meta1 = new EntityMeta({
                collection: "user1",
                primary_keys: ["email"],
                fields: [
                    { name: "email", type: "string", required: true },
                    { name: "pwd", type: "password", required: true, exportable: false },
                    { name: "status", type: "string", required: true }
                ]
            });
            strictEqual(entity_meta1.creatable, false);
            strictEqual(entity_meta1.readable, false);
            strictEqual(entity_meta1.updatable, false);
            strictEqual(entity_meta1.deleteable, false);
            strictEqual(entity_meta1.importable, false);
            strictEqual(entity_meta1.exportable, false);

            const entity_meta2 = new EntityMeta({
                // init create router?
                creatable: true,
                // init read router?
                readable: true,
                // init update router?
                updatable: true,
                // init delete router?
                deleteable: true,
                // init import router?
                importable: true,
                // init export router?
                exportable: true,
                // collection name of the entity
                collection: "user2",
                primary_keys: ["email"],
                fields: [
                    { name: "email", type: "string", required: true },
                    { name: "pwd", type: "password", required: true, exportable: false },
                    { name: "status", type: "string", required: true }
                ]
            });
            strictEqual(entity_meta2.creatable, true);
            strictEqual(entity_meta2.readable, true);
            strictEqual(entity_meta2.updatable, true);
            strictEqual(entity_meta2.deleteable, true);
            strictEqual(entity_meta2.importable, true);
            strictEqual(entity_meta2.exportable, true);
        });
    });

    describe('validate meta info', function () {
        it('should fails for meta without collection', function () {
            throws(() => {
                const entity_meta = new EntityMeta({
                    coll: "user3",
                    primary_keys: ["email"],
                    fields: [
                        { name: "email", type: "string", required: true },
                        { name: "pwd", type: "password", required: true, exportable: false },
                        { name: "status", type: "string", required: true }
                    ]
                });
                entity_meta.validate_meta_info();
            })
        });

        it('should fails for duplicate fields', function () {
            throws(() => {
                const entity_meta = new EntityMeta({
                    collection: "user4",
                    primary_keys: ["email"],
                    fields: [
                        { name: "email", type: "string", required: true },
                        { name: "email", type: "string", required: true },
                    ]
                });

                entity_meta.validate_meta_info();
            });
        });

        it('should fails for wrong field type', function () {
            throws(() => {
                const entity_meta = new EntityMeta({
                    collection: "user6",
                    primary_keys: ["email"],
                    fields: [
                        { name: "email", typ: "string", required: true },
                        { name: "status", type: "string", required: true }
                    ]
                });

                entity_meta.validate_meta_info();
            });
        });

        it('should fails spelling error name', function () {
            throws(() => {
                const entity_meta = new EntityMeta({
                    collection: "user7",
                    primary_keys: ["email"],
                    fields: [
                        { nam: "email", type: "string", required: true },
                    ]
                });

                entity_meta.validate_meta_info();
            });
        });

        it('should fails spelling error required', function () {
            throws(() => {
                const entity_meta = new EntityMeta({
                    collection: "user8",
                    primary_keys: ["email"],
                    fields: [
                        { name: "email", type: "string", require: true },
                    ]
                });

                entity_meta.validate_meta_info();
            });
        });

        it('should fails for wrong field type attr', function () {
            throws(() => {
                const entity_meta = new EntityMeta({
                    collection: "user9",
                    primary_keys: ["email"],
                    fields: [
                        { name: "email", type: "my_str", required: true },
                    ]
                });

                entity_meta.validate_meta_info();
            });
        });

        it('should success for valid meta info', function () {
            const entity_meta1 = new EntityMeta({
                collection: "user10",
                primary_keys: ["name"],
                fields: [
                    { name: "name", type: "string", required: true },
                    { name: "role", type: "string", ref: "role_meta", required: true },
                ]
            });

            const entity_meta2 = new EntityMeta({
                collection: "role_meta",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", type: "string", required: true },
                ]
            });

            strictEqual(entity_meta1.validate_meta_info(), true);
            strictEqual(entity_meta2.validate_meta_info(), true);
        });

        it('should success for valid meta info for cascade delete', function () {
            const entity_meta1 = new EntityMeta({
                collection: "user11",
                primary_keys: ["name"],
                fields: [
                    { name: "name", type: "string", required: true },
                    { name: "role", type: "string", ref: "role_meta1", delete: "cascade", required: true },
                ]
            });

            const entity_meta2 = new EntityMeta({
                collection: "role_meta1",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", type: "string", required: true },
                ]
            });

            strictEqual(entity_meta1.validate_meta_info(), true);
            strictEqual(entity_meta2.validate_meta_info(), true);
        });

        it('should success for valid meta info for keep delete', function () {
            const entity_meta1 = new EntityMeta({
                collection: "user12",
                primary_keys: ["name"],
                fields: [
                    { name: "name", type: "string", required: true },
                    { name: "role", type: "string", ref: "role_meta2", delete: "keep", required: true },
                ]
            });

            const entity_meta2 = new EntityMeta({
                collection: "role_meta2",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", type: "string", required: true },
                ]
            });

            strictEqual(entity_meta1.validate_meta_info(), true);
            strictEqual(entity_meta2.validate_meta_info(), true);
        });

        it('should fails wrong delete value for ref', function () {
            throws(() => {
                const entity_meta1 = new EntityMeta({
                    collection: "user13",
                    primary_keys: ["name"],
                    fields: [
                        { name: "name", type: "string", required: true },
                        { name: "role", type: "string", ref: "role_meta3", delete: "other", required: true },
                    ]
                });

                const entity_meta2 = new EntityMeta({
                    collection: "role_meta3",
                    primary_keys: ["name"],
                    ref_label: "name",
                    fields: [
                        { name: "name", type: "string", required: true },
                    ]
                });
                entity_meta1.validate_meta_info();
                entity_meta2.validate_meta_info();
            });
        });


        it('should fails delete defined for non-ref field', function () {
            throws(() => {
                const entity_meta1 = new EntityMeta({
                    collection: "user14",
                    primary_keys: ["name"],
                    fields: [
                        { name: "name", type: "string", required: true, delete: "keep" },
                        { name: "role", type: "string", ref: "role_meta4", required: true },
                    ]
                });

                const entity_meta2 = new EntityMeta({
                    collection: "role_meta4",
                    primary_keys: ["name"],
                    ref_label: "name",
                    fields: [
                        { name: "name", type: "string", required: true },
                    ]
                });
                entity_meta1.validate_meta_info();
                entity_meta2.validate_meta_info();
            });
        });


        it('should fails for wrong ref ', function () {
            throws(() => {
                const entity_meta1 = new EntityMeta({
                    collection: "user_ref",
                    primary_keys: ["name"],
                    fields: [
                        { name: "name", type: "string", required: true },
                        { name: "role", type: "string", ref: "other", required: true },
                    ]
                });
                entity_meta1.validate_meta_info();
            });
        });

        it('should fails for wrong link ', function () {
            throws(() => {
                const entity_meta1 = new EntityMeta({
                    collection: "user_link1",
                    primary_keys: ["name"],
                    fields: [
                        { name: "name", type: "string", required: true },
                        { name: "role", type: "string", link: "other", required: true },
                    ]
                });
                entity_meta1.validate_meta_info();
            });
            throws(() => {
                const entity_meta1 = new EntityMeta({
                    collection: "user_link2",
                    primary_keys: ["name"],
                    fields: [
                        { name: "name", type: "string", required: true },
                        { name: "role", type: "string", link: "other" },
                    ]
                });
                entity_meta1.validate_meta_info();
            });

            throws(() => {
                const entity_meta1 = new EntityMeta({
                    collection: "user_link3",
                    primary_keys: ["name"],
                    fields: [
                        { name: "name", type: "string", required: true },
                        { name: "role", link: "other" },
                    ]
                });
                entity_meta1.validate_meta_info();
            });
        });

        it('should success for link ', function () {
            const entity_meta1 = new EntityMeta({
                collection: "role_link_other",
                primary_keys: ["name"],
                ref_label: "name",
                fields: [
                    { name: "name", type: "string", required: true },
                    { name: "desc", type: "string", required: true },
                ]
            });

            const entity_meta2 = new EntityMeta({
                collection: "user_link_other",
                primary_keys: ["name"],
                fields: [
                    { name: "name", type: "string", required: true },
                    { name: "user_role", type: "string", ref: "role_link_other", required: true },
                    { name: "desc", link: "user_role", list: true },
                ]
            });

            strictEqual(entity_meta1.validate_meta_info(), true);
            strictEqual(entity_meta2.validate_meta_info(), true);
        });

        it('should fails for wrong primary key type', function () {
            throws(() => {
                const entity_meta1 = new EntityMeta({
                    collection: "user_primary",
                    primary_keys: "name",
                    fields: [
                        { name: "name", type: "string", required: true },
                        { name: "role", type: "string", required: true },
                    ]
                });
                entity_meta1.validate_meta_info();
            });
        });

        it('should fails for wrong primary key value', function () {
            throws(() => {
                const entity_meta1 = new EntityMeta({
                    collection: "user_primary_other",
                    primary_keys: ["nam"],
                    fields: [
                        { name: "name", type: "string", required: true },
                        { name: "role", type: "string", required: true },
                    ]
                });
                entity_meta1.validate_meta_info();
            });
        });

        it('should collection and fields properties set successfully', function () {
            const entity_meta = new EntityMeta({
                collection: "user111",
                primary_keys: ["name"],
                fields: [
                    { name: "email", type: "string", required: true },
                    { name: "pwd", type: "password", required: true, exportable: false },
                    { name: "status", type: "string", required: true }
                ]
            });
            strictEqual(entity_meta.collection, "user111");
            strictEqual(entity_meta.fields.length, 3);
            strictEqual(entity_meta.field_names.join(""), ["email", "pwd", "status"].join(""));
        });
    });

    const entity_meta = new EntityMeta({
        collection: "user_meta",
        primary_keys: ["name"],
        fields: [
            { name: "name" },
            { name: "valid", type: "boolean" },
            { name: "uage", type: "uint" },
            { name: "age", type: "int" },
            { name: "score", type: "float" },
            { name: "uscore", type: "ufloat" },
            { name: "money", type: "number" },
            { name: "pwd", type: "password" },
            { name: "pets", type: "array" }
        ]
    });

    describe('convert', function () {
        it('should convert string field type successfully', function () {
            let { obj, error_field_names } = convert_type({ name: "hery" }, entity_meta.fields);
            strictEqual(obj.name, "hery");
            strictEqual(obj.valid, undefined);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert string field type successfully', function () {
            let { obj, error_field_names } = convert_type({ name: 1234 }, entity_meta.fields);
            strictEqual(obj.name, "1234");
            strictEqual(error_field_names.length, 0);
        });

        it('should convert boolean field with true value successfully', function () {
            let { obj, error_field_names } = convert_type({ valid: "true" }, entity_meta.fields);
            strictEqual(obj.valid, true);
            strictEqual(obj.name, undefined);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert boolean field successfully', function () {
            let { obj, error_field_names } = convert_type({ valid: true }, entity_meta.fields);
            strictEqual(obj.valid, true);
            strictEqual(obj.name, undefined);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert boolean field type successfully', function () {
            let { obj, error_field_names } = convert_type({ valid: "false" }, entity_meta.fields);
            strictEqual(obj.valid, false);
            strictEqual(obj.name, undefined);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert boolean field type successfully', function () {
            let { obj, error_field_names } = convert_type({ valid: "abcd" }, entity_meta.fields);
            strictEqual(obj.valid, undefined);
            strictEqual(obj.name, undefined);
            strictEqual(error_field_names.length, 1);
            strictEqual(error_field_names.join(""), "valid");
        });

        it('should convert uint field type successfully', function () {
            let { obj, error_field_names } = convert_type({ uage: 80 }, entity_meta.fields);
            strictEqual(obj.uage, 80);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert uint field type successfully', function () {
            let { obj, error_field_names } = convert_type({ uage: "80" }, entity_meta.fields);
            strictEqual(obj.uage, 80);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert uint field type successfully', function () {
            let { obj, error_field_names } = convert_type({ uage: "-80" }, entity_meta.fields);
            strictEqual(obj.uage, undefined);
            strictEqual(error_field_names.length, 1);
            strictEqual(error_field_names.join(""), "uage");
        });

        it('should convert uint field type successfully', function () {
            let { obj, error_field_names } = convert_type({ uage: "abcd" }, entity_meta.fields);
            strictEqual(obj.uage, undefined);
            strictEqual(error_field_names.length, 1);
            strictEqual(error_field_names.join(""), "uage");
        });

        it('should convert int field type successfully', function () {
            let { obj, error_field_names } = convert_type({ age: 80 }, entity_meta.fields);
            strictEqual(obj.age, 80);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert int field type successfully', function () {
            let { obj, error_field_names } = convert_type({ age: "80" }, entity_meta.fields);
            strictEqual(obj.age, 80);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert int field type successfully', function () {
            let { obj, error_field_names } = convert_type({ age: "-80" }, entity_meta.fields);
            strictEqual(obj.age, -80);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert int field type successfully', function () {
            let { obj, error_field_names } = convert_type({ age: "abcd" }, entity_meta.fields);
            strictEqual(obj.age, undefined);
            strictEqual(error_field_names.length, 1);
            strictEqual(error_field_names.join(""), "age");
        });

        it('should convert float field type successfully', function () {
            let { obj, error_field_names } = convert_type({ score: 80.123 }, entity_meta.fields);
            strictEqual(obj.score, 80.12);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert float field type successfully', function () {
            let { obj, error_field_names } = convert_type({ score: -80.456 }, entity_meta.fields);
            strictEqual(obj.score, -80.46);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert float field type successfully', function () {
            let { obj, error_field_names } = convert_type({ score: "80.7899" }, entity_meta.fields);
            strictEqual(obj.score, 80.79);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert float field type successfully', function () {
            let { obj, error_field_names } = convert_type({ score: "abcd" }, entity_meta.fields);
            strictEqual(obj.score, undefined);
            strictEqual(error_field_names.length, 1);
            strictEqual(error_field_names.join(""), "score");
        });

        it('should convert ufloat field type successfully', function () {
            let { obj, error_field_names } = convert_type({ uscore: 80.123 }, entity_meta.fields);
            strictEqual(obj.uscore, 80.12);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert ufloat field type successfully', function () {
            let { obj, error_field_names } = convert_type({ uscore: -80.456 }, entity_meta.fields);
            strictEqual(obj.uscore, undefined);
            strictEqual(error_field_names.length, 1);
        });

        it('should convert ufloat field type successfully', function () {
            let { obj, error_field_names } = convert_type({ uscore: "80.7899" }, entity_meta.fields);
            strictEqual(obj.uscore, 80.79);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert ufloat field type successfully', function () {
            let { obj, error_field_names } = convert_type({ uscore: "abcd" }, entity_meta.fields);
            strictEqual(obj.uscore, undefined);
            strictEqual(error_field_names.length, 1);
            strictEqual(error_field_names.join(""), "uscore");
        });

        it('should convert number field type successfully', function () {
            let { obj, error_field_names } = convert_type({ money: -80 }, entity_meta.fields);
            strictEqual(obj.money, -80);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert number field type successfully', function () {
            let { obj, error_field_names } = convert_type({ money: 80 }, entity_meta.fields);
            strictEqual(obj.money, 80);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert number field type successfully', function () {
            let { obj, error_field_names } = convert_type({ money: 80.8085 }, entity_meta.fields);
            strictEqual(obj.money, 80.8085);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert number field type successfully', function () {
            let { obj, error_field_names } = convert_type({ money: "80.8085" }, entity_meta.fields);
            strictEqual(obj.money, 80.8085);
            strictEqual(error_field_names.length, 0);
        });

        it('should convert password field type successfully', function () {
            let { obj, error_field_names } = convert_type({ pwd: "password" }, entity_meta.fields);
            strictEqual(obj.pwd, encrypt_pwd("password"));
            strictEqual(error_field_names.length, 0);
        });

        it('should convert array field type successfully', function () {
            let { obj, error_field_names } = convert_type({ pets: "cat,dog" }, entity_meta.fields);
            strictEqual(obj.pets.length, 2);
            strictEqual(obj.pets.join(""), "catdog");
            strictEqual(error_field_names.length, 0);
        });

        it('should convert array field type successfully', function () {
            let { obj, error_field_names } = convert_type({ pets: ["cat", "dog"] }, entity_meta.fields);
            strictEqual(obj.pets.length, 2);
            strictEqual(obj.pets.join(""), "catdog");
            strictEqual(error_field_names.length, 0);
        });

        it('should convert array field type successfully', function () {
            let { obj, error_field_names } = convert_type({ pets: 123 }, entity_meta.fields);
            strictEqual(obj.pets, undefined);
            strictEqual(error_field_names.length, 1);
            strictEqual(error_field_names.join(""), "pets");
        });
    });
})
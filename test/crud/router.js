const chai = require('chai');
const chai_http = require('chai-http');
const { strictEqual, deepStrictEqual } = require('assert');

const { init_express_server } = require('../../http/express');
const { get_entity_meta } = require('../../core/meta');
const { Entity } = require('../../db/entity');
const { get_settings } = require('../../setting');
const { SUCCESS } = require('../../http/code');

const server = init_express_server(__dirname + "/../");
chai.use(chai_http);

describe('user router controller crud testing', () => {
    const user_entity = new Entity(get_entity_meta("user"));
    const role_entity = new Entity(get_entity_meta("role"));

    beforeEach((done) => {
        user_entity.delete({}).then(_ => {
            role_entity.delete({}).then(_ => {
                done();
            });
        });
    });

    describe('/POST create user', () => {

        it('it should POST a user successfully with all the valid values', async (done) => {
            await role_entity.create_entity({ "name": "admin", desc: "admin role" });
            await role_entity.create_entity({ "name": "user", desc: "user role" });
            const role_count = await role_entity.count({});
            strictEqual(role_count, 2);

            const user = {
                name: "hery",
                email: "hery@easyserver.com",
                role: "admin,user",
                age: "10",
                status: "true"
            }
            chai.request(server)
                .post('/user/create')
                .send(user)
                .end(async (err, res) => {
                    strictEqual(res.status, 200);
                    strictEqual(res.body.code, SUCCESS);

                    const db_user = await user_entity.find_one(user_entity.primary_key_query({ "name": "hery" }));
                    const db_roles = await role_entity.find({});
                    strictEqual(db_user.name, "hery");
                    strictEqual(db_user.age, 10);
                    deepStrictEqual(db_user.role, db_roles.map(r => r["_id"] + ""));
                    done();
                });
        });
    });
});

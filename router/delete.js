const { required_post_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { NO_PARAMS, NO_RIGHTS } = require('../http/code');
const { check_user_role } = require('../core/role');
const { is_owner } = require('../http/session');
const { oid_query } = require('../db/db');
const { wrap_http } = require('../http/error');
const { Entity } = require('../db/entity');

/**
 * init http delete router
 * @param {express router} router 
 * @param {meta info} meta 
 */
const init_delete_router = function (router, meta) {
    const entity = new Entity(meta);

    router.post('/delete', wrap_http(async function (req, res) {
        const has_right = check_user_role(req, meta, "d", "*");
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        const params = required_post_params(req, ["ids"]);
        if (params === null) {
            res.json({ code: NO_PARAMS, err: ["ids"] });
            return;
        }

        const { ids } = params;
        const id_array = ids.split(",");

        for (let i = 0; i < id_array.length; i++) {
            const id_query = oid_query(id_array[i]);
            const owner = await is_owner(req, meta, entity, id_query);
            if (!owner) {
                res.json({ code: NO_RIGHTS, err: "no rights error" });
                return;
            }
        }

        const { code, err } = await entity.delete_entity(id_array);
        if (!has_value(code)) {
            throw new Error("the delete_entity method should return code");
        }

        res.json({ code: code, err: err });
    }));
}

module.exports = { init_delete_router }

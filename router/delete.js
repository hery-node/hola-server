/**
 * @fileoverview Delete router initialization.
 * @module router/delete
 */

const { required_post_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { NO_PARAMS, NO_RIGHTS } = require('../http/code');
const { get_user_role_right } = require('../core/role');
const { is_owner } = require('../http/session');
const { oid_query } = require('../db/db');
const { wrap_http } = require('../http/error');
const { Entity } = require('../db/entity');

/**
 * Initialize HTTP delete router.
 * @param {Object} router - Express router
 * @param {Object} meta - Entity metadata
 */
const init_delete_router = (router, meta) => {
    const entity = new Entity(meta);

    router.post('/delete', wrap_http(async (req, res) => {
        const [role_mode] = get_user_role_right(req, meta);
        if (!role_mode.includes("d")) {
            return res.json({ code: NO_RIGHTS, err: "no rights" });
        }

        const params = required_post_params(req, ["ids"]);
        if (!params) {
            return res.json({ code: NO_PARAMS, err: ["ids"] });
        }

        const ids = params.ids.split(",");

        for (const id of ids) {
            if (!await is_owner(req, meta, entity, oid_query(id))) {
                return res.json({ code: NO_RIGHTS, err: "no ownership rights" });
            }
        }

        const { code, err } = await entity.delete_entity(ids);
        if (!has_value(code)) throw new Error("delete_entity must return code");

        res.json({ code, err });
    }));
};

module.exports = { init_delete_router };

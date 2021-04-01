const { required_post_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { NO_PARAMS } = require('../http/code');
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
        const params = required_post_params(req, ["ids"]);
        if (params === null) {
            res.json({ code: NO_PARAMS, err: ["ids"] });
            return;
        }

        const { ids } = params;
        const id_array = ids.split(",");
        const { code, err } = await entity.delete_entity(id_array);
        if (!has_value(code)) {
            throw new Error("the delete_entity method should return code");
        }

        res.json({ code: code, err: err });
    }));
}

module.exports = { init_delete_router }

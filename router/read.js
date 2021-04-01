const { required_post_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { NO_PARAMS } = require('../http/code');
const { wrap_http } = require('../http/error');
const { Entity } = require('../db/entity');

/**
 * init http read router
 * @param {express router} router 
 * @param {meta info} meta 
 */
const init_read_router = function (router, meta) {
    const entity = new Entity(meta);

    router.get('/searchable', wrap_http(async function (req, res) {
        res.json({ code: SUCCESS, data: meta.search_fields });
    }));

    router.get('/fields', wrap_http(async function (req, res) {
        res.json({ code: SUCCESS, data: meta.fields });
    }));

    router.post('/read', wrap_http(async function (req, res) {
        const query_params = required_post_params(req, ["_query"]);
        if (query_params === null) {
            res.json({ code: NO_PARAMS, err: ["_query"] });
            return;
        }

        const { code, err, total, data } = await entity.list_entity(query_params, null, req.body);
        if (!has_value(code)) {
            throw new Error("the list_entity method should return code");
        }

        res.json({ code: code, err: err, total: total, data: data });
    }));
}

module.exports = { init_read_router }

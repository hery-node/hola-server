const { required_post_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { NO_PARAMS, SUCCESS } = require('../http/code');
const { wrap_http } = require('../http/error');
const { Entity } = require('../db/entity');

/**
 * init http read router
 * @param {express router} router 
 * @param {meta info} meta 
 */
const init_read_router = function (router, meta) {
    const entity = new Entity(meta);

    router.get('/search_fields', wrap_http(async function (req, res) {
        res.json({ code: SUCCESS, data: meta.search_fields });
    }));

    router.get('/fields', wrap_http(async function (req, res) {
        res.json({ code: SUCCESS, data: meta.non_sys_fields });
    }));

    router.get('/ref', wrap_http(async function (req, res) {
        const list = await entity.get_filtered_ref_labels();
        const items = list.map(obj => ({ "text": obj[meta.ref_label], "value": obj["_id"] + "" }));
        res.json({ code: SUCCESS, data: items });
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

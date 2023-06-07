const { required_post_params, get_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { NO_PARAMS, SUCCESS, NO_RIGHTS } = require('../http/code');
const { check_user_role, get_user_role_mode } = require('../core/role');
const { get_session_userid, get_session_user_groups } = require('../http/session');
const { wrap_http } = require('../http/error');
const { Entity } = require('../db/entity');

/**
 * init http read router
 * @param {express router} router 
 * @param {meta info} meta 
 */
const init_read_router = function (router, meta) {
    const entity = new Entity(meta);

    router.get('/meta', wrap_http(async function (req, res) {
        const has_right = check_user_role(req, meta, "r");
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        const entity_meta = {
            creatable: meta.creatable,
            readable: meta.readable,
            updatable: meta.updatable,
            deleteable: meta.deleteable,
            cloneable: meta.cloneable,
            importable: meta.importable,
            exportable: meta.exportable,
            editable: meta.editable,
            user_field: meta.user_field,
            fields: meta.fields
        }
        res.json({ code: SUCCESS, data: entity_meta });
    }));

    router.get('/mode', wrap_http(async function (req, res) {
        const has_right = check_user_role(req, meta, "r");
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        res.json({ code: SUCCESS, data: get_user_role_mode(req, meta) });
    }));

    router.get('/ref', wrap_http(async function (req, res) {
        const has_right = check_user_role(req, meta, "r");
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        const { ref_by_entity } = get_params(req, ["ref_by_entity"]);
        const list = await entity.get_filtered_ref_labels(ref_by_entity);
        const items = list.map(obj => ({ "text": obj[meta.ref_label], "value": obj["_id"] + "" }));
        res.json({ code: SUCCESS, data: items });
    }));

    router.post('/list', wrap_http(async function (req, res) {
        const has_right = check_user_role(req, meta, "r");
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        const query_params = required_post_params(req, ["_query"]);
        if (query_params === null) {
            res.json({ code: NO_PARAMS, err: ["_query"] });
            return;
        }

        const param_obj = req.body;

        if (meta.user_field) {
            const [user_field] = meta.fields.filter(f => f.name == meta.user_field);
            if (user_field && user_field.group == true) {
                const user_ids = get_session_user_groups(req);
                if (user_ids == null) {
                    throw new Error("no user group is found in session");
                }
                param_obj[meta.user_field] = user_ids;
            } else {
                const user_id = get_session_userid(req);
                if (user_id == null) {
                    throw new Error("no user id is found in session");
                }
                param_obj[meta.user_field] = user_id;
            }
        }

        const { code, err, total, data } = await entity.list_entity(query_params["_query"], null, param_obj);
        if (!has_value(code)) {
            throw new Error("the list_entity method should return code");
        }

        res.json({ code: code, err: err, total: total, data: data });
    }));

    router.post('/read_entity', wrap_http(async function (req, res) {
        const has_right = check_user_role(req, meta, "r");
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        let params = required_post_params(req, ["_id", "attr_names"]);
        if (params === null) {
            res.json({ code: NO_PARAMS, err: '[_id,attr_names] checking params are failed!' });
            return;
        }

        const { _id, attr_names } = params;
        const { code, err, data } = await entity.read_entity(_id, attr_names);
        if (!has_value(code)) {
            throw new Error("the method should return code");
        }
        res.json({ code: code, err: err, data: data });
    }));

    router.post('/read_property', wrap_http(async function (req, res) {
        const has_right = check_user_role(req, meta, "r");
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        let params = required_post_params(req, ["_id", "attr_names"]);
        if (params === null) {
            res.json({ code: NO_PARAMS, err: '[_id,attr_names] checking params are failed!' });
            return;
        }

        const { _id, attr_names } = params;
        const { code, err, data } = await entity.read_property(_id, attr_names);
        if (!has_value(code)) {
            throw new Error("the method should return code");
        }
        res.json({ code: code, err: err, data: data });
    }));
}

module.exports = { init_read_router }

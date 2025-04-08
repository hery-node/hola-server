const { required_post_params, get_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { NO_PARAMS, SUCCESS, NO_RIGHTS } = require('../http/code');
const { get_user_role_right } = require('../core/role');
const { get_session_userid, get_session_user_groups, is_owner } = require('../http/session');
const { wrap_http } = require('../http/error');
const { oid_query } = require('../db/db');
const { Entity } = require('../db/entity');

const contain_view = (array, view) => {
    for (let i = 0; i < array.length; i++) {
        if (view.includes(array[i])) {
            return true;
        }
    }
    return false;
}

/**
 * init http read router
 * @param {express router} router 
 * @param {meta info} meta 
 */
const init_read_router = function (router, meta) {
    const entity = new Entity(meta);

    router.get('/meta', wrap_http(async function (req, res) {
        const [role_mode, role_view] = get_user_role_right(req, meta);
        const has_right = role_mode.includes("r");
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        const client_fields = role_view && role_view !== "*" ? meta.client_fields.filter(field => Array.isArray(field.view) ? contain_view(field.view, role_view) || field.view.includes("*") : role_view.includes(field.view) || field.view === "*") : meta.client_fields;
        const entity_meta = {
            creatable: role_mode.includes("c"),
            readable: role_mode.includes("r"),
            updatable: role_mode.includes("u"),
            deleteable: role_mode.includes("d"),
            cloneable: role_mode.includes("o"),
            importable: role_mode.includes("i"),
            exportable: role_mode.includes("e"),
            editable: role_mode.includes("c") || role_mode.includes("u"),
            fields: client_fields
        }
        res.json({ code: SUCCESS, data: entity_meta });
    }));

    router.get('/mode', wrap_http(async function (req, res) {
        const [role_mode, role_view] = get_user_role_right(req, meta);
        const has_right = role_mode.includes("r");

        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        res.json({ code: SUCCESS, mode: role_mode, view: role_view });
    }));

    router.get('/ref', wrap_http(async function (req, res) {
        const [role_mode, role_view] = get_user_role_right(req, meta);
        const has_right = role_mode.includes("r");
        if (!has_right) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        const { ref_by_entity, query } = get_params(req, ["ref_by_entity", "query"]);
        const list = await entity.get_filtered_ref_labels(ref_by_entity, query);
        const items = list.map(obj => ({ "text": obj[meta.ref_label], "value": obj["_id"] + "" }));
        res.json({ code: SUCCESS, data: items });
    }));

    router.post('/list', wrap_http(async function (req, res) {
        const [role_mode, role_view] = get_user_role_right(req, meta);
        const has_right = role_mode.includes("r");
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

        const query = meta.list_query ? await meta.list_query(entity, param_obj, req) : null;
        const { code, err, total, data } = await entity.list_entity(query_params["_query"], query, param_obj, role_view);
        if (!has_value(code)) {
            throw new Error("the list_entity method should return code");
        }

        res.json({ code: code, err: err, total: total, data: data });
    }));

    router.post('/read_entity', wrap_http(async function (req, res) {
        const [role_mode, role_view] = get_user_role_right(req, meta);
        const has_right = role_mode.includes("r");
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

        const owner = await is_owner(req, meta, entity, oid_query(_id));
        if (!owner) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        const { code, err, data } = await entity.read_entity(_id, attr_names, role_view);
        if (!has_value(code)) {
            throw new Error("the method should return code");
        }
        res.json({ code: code, err: err, data: data });
    }));

    router.post('/read_property', wrap_http(async function (req, res) {
        const [role_mode, role_view] = get_user_role_right(req, meta);
        const has_right = role_mode.includes("r");
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

        const owner = await is_owner(req, meta, entity, oid_query(_id));
        if (!owner) {
            res.json({ code: NO_RIGHTS, err: "no rights error" });
            return;
        }

        const { code, err, data } = await entity.read_property(_id, attr_names, role_view);
        if (!has_value(code)) {
            throw new Error("the method should return code");
        }
        res.json({ code: code, err: err, data: data });
    }));
}

module.exports = { init_read_router }

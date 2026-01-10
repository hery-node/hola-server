/**
 * @fileoverview Read router initialization.
 * @module router/read
 */

const { required_post_params, get_params } = require('../http/params');
const { has_value } = require('../core/validate');
const { NO_PARAMS, SUCCESS, NO_RIGHTS } = require('../http/code');
const { get_user_role_right } = require('../core/role');
const { get_session_user_id, get_session_user_groups, is_owner } = require('../http/session');
const { wrap_http } = require('../http/error');
const { oid_query } = require('../db/db');
const { Entity } = require('../db/entity');

/**
 * Check if any array element is contained in view string.
 * @param {string[]} array - View array
 * @param {string} view - Target view
 * @returns {boolean}
 */
const contain_view = (array, view) => array.some(item => view.includes(item));

/**
 * Check read rights and return false with error response if unauthorized.
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Object} meta - Entity metadata
 * @returns {[boolean, string, string]} [hasRights, roleMode, roleView]
 */
const check_read_rights = (req, res, meta) => {
    const [role_mode, role_view] = get_user_role_right(req, meta);
    if (!role_mode.includes("r")) {
        res.json({ code: NO_RIGHTS, err: "no rights" });
        return [false, null, null];
    }
    return [true, role_mode, role_view];
};

/**
 * Filter fields by role view.
 * @param {Object} meta - Entity metadata
 * @param {string} role_view - Role view string
 * @returns {Object[]} Filtered client fields
 */
const filter_fields_by_view = (meta, role_view) => {
    if (!role_view || role_view === "*") return meta.client_fields;

    return meta.client_fields.filter(field => {
        const view = field.view;
        if (Array.isArray(view)) {
            return contain_view(view, role_view) || view.includes("*");
        }
        return role_view.includes(view) || view === "*";
    });
};

/**
 * Build permission flags from role mode.
 * @param {string} role_mode - Role mode string
 * @returns {Object} Permission flags
 */
const build_permissions = (role_mode) => ({
    creatable: role_mode.includes("c"),
    readable: role_mode.includes("r"),
    updatable: role_mode.includes("u"),
    deleteable: role_mode.includes("d"),
    cloneable: role_mode.includes("o"),
    importable: role_mode.includes("i"),
    exportable: role_mode.includes("e"),
    editable: role_mode.includes("c") || role_mode.includes("u")
});

/**
 * Get user ID or group IDs based on user_field config.
 * @param {Object} req - Express request
 * @param {Object} meta - Entity metadata
 * @returns {string|string[]} User ID or group IDs
 */
const get_user_filter = (req, meta) => {
    const [user_field] = meta.fields.filter(f => f.name === meta.user_field);

    if (user_field?.group) {
        const user_ids = get_session_user_groups(req);
        if (!user_ids) throw new Error("no user group found in session");
        return user_ids;
    }

    const user_id = get_session_user_id(req);
    if (!user_id) throw new Error("no user id found in session");
    return user_id;
};

/**
 * Initialize HTTP read router.
 * @param {Object} router - Express router
 * @param {Object} meta - Entity metadata
 */
const init_read_router = (router, meta) => {
    const entity = new Entity(meta);

    router.get('/meta', wrap_http(async (req, res) => {
        const [ok, role_mode, role_view] = check_read_rights(req, res, meta);
        if (!ok) return;

        res.json({
            code: SUCCESS,
            data: {
                ...build_permissions(role_mode),
                fields: filter_fields_by_view(meta, role_view)
            }
        });
    }));

    router.get('/mode', wrap_http(async (req, res) => {
        const [ok, role_mode, role_view] = check_read_rights(req, res, meta);
        if (!ok) return;

        res.json({ code: SUCCESS, mode: role_mode, view: role_view });
    }));

    router.get('/ref', wrap_http(async (req, res) => {
        const [ok] = check_read_rights(req, res, meta);
        if (!ok) return;

        const { ref_by_entity, query } = get_params(req, ["ref_by_entity", "query"]);
        const list = await entity.get_filtered_ref_labels(ref_by_entity, query);
        const items = list.map(obj => ({ text: obj[meta.ref_label], value: String(obj._id) }));
        res.json({ code: SUCCESS, data: items });
    }));

    router.post('/list', wrap_http(async (req, res) => {
        const [ok, , role_view] = check_read_rights(req, res, meta);
        if (!ok) return;

        const query_params = required_post_params(req, ["_query"]);
        if (!query_params) {
            return res.json({ code: NO_PARAMS, err: ["_query"] });
        }

        const param_obj = req.body;
        if (meta.user_field) {
            param_obj[meta.user_field] = get_user_filter(req, meta);
        }

        const query = meta.list_query ? await meta.list_query(entity, param_obj, req) : null;
        const { code, err, total, data } = await entity.list_entity(query_params._query, query, param_obj, role_view);
        if (!has_value(code)) throw new Error("list_entity must return code");

        res.json({ code, err, total, data });
    }));

    router.post('/read_entity', wrap_http(async (req, res) => {
        const [ok, , role_view] = check_read_rights(req, res, meta);
        if (!ok) return;

        const params = required_post_params(req, ["_id", "attr_names"]);
        if (!params) {
            return res.json({ code: NO_PARAMS, err: "[_id, attr_names] required" });
        }

        if (!await is_owner(req, meta, entity, oid_query(params._id))) {
            return res.json({ code: NO_RIGHTS, err: "no ownership rights" });
        }

        const { code, err, data } = await entity.read_entity(params._id, params.attr_names, role_view);
        if (!has_value(code)) throw new Error("read_entity must return code");

        res.json({ code, err, data });
    }));

    router.post('/read_property', wrap_http(async (req, res) => {
        const [ok, , role_view] = check_read_rights(req, res, meta);
        if (!ok) return;

        const params = required_post_params(req, ["_id", "attr_names"]);
        if (!params) {
            return res.json({ code: NO_PARAMS, err: "[_id, attr_names] required" });
        }

        if (!await is_owner(req, meta, entity, oid_query(params._id))) {
            return res.json({ code: NO_RIGHTS, err: "no ownership rights" });
        }

        const { code, err, data } = await entity.read_property(params._id, params.attr_names, role_view);
        if (!has_value(code)) throw new Error("read_property must return code");

        res.json({ code, err, data });
    }));
};

module.exports = { init_read_router };

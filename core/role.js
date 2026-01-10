/**
 * @fileoverview Role-based access control utility functions.
 * @module core/role
 */

const { get_settings } = require("../setting");

/**
 * Find a role by name from settings.
 * @param {string} role_name - Role name to find.
 * @returns {Object|undefined} Role object or undefined if not found.
 */
const find_role = (role_name) => {
    const settings = get_settings();
    return settings.roles ? settings.roles.find((role) => role.name === role_name) : undefined;
};

/**
 * Validate role name exists in settings configuration.
 * @param {string} role_name - Role name to validate.
 * @returns {boolean} True if role is valid and configured.
 */
const validate_meta_role = (role_name) => {
    const settings = get_settings();
    if (!settings.roles) return false;
    return find_role(role_name) !== undefined;
};

/**
 * Check if role name exists in settings.
 * @param {string} role_name - Role name to check.
 * @returns {boolean} True if role exists.
 */
const is_valid_role = (role_name) => find_role(role_name) !== undefined;

/**
 * Check if role has root/admin privileges.
 * @param {string} role_name - Role name to check.
 * @returns {boolean} True if role is root.
 */
const is_root_role = (role_name) => {
    const role = find_role(role_name);
    return role ? role.root === true : true;
};

/**
 * Get user role from session.
 * @param {Object} req - HTTP request object.
 * @returns {string|null} User's role or null.
 */
const get_session_user_role = (req) => {
    const user = req && req.session ? req.session.user : null;
    return user ? user.role : null;
};

/**
 * Get user object from session.
 * @param {Object} req - HTTP request object.
 * @returns {Object|null} User object or null.
 */
const get_session_user = (req) => req && req.session ? req.session.user : null;

/**
 * Check if current user has root privileges.
 * @param {Object} req - HTTP request object.
 * @returns {boolean} True if user is root.
 */
const is_root_user = (req) => is_root_role(get_session_user_role(req));

/**
 * Get user's role permissions for a meta entity.
 * @param {Object} req - HTTP request object.
 * @param {Object} meta - Meta entity definition.
 * @returns {[string, string]} Array of [mode, view] permissions.
 */
const get_user_role_right = (req, meta) => {
    const settings = get_settings();
    if (!settings.roles || !meta.roles) return [meta.mode, "*"];

    const user_role = get_session_user_role(req);
    if (!user_role) return ["", ""];
    if (!is_valid_role(user_role)) return ["", ""];

    for (const role of meta.roles) {
        const role_settings = role.split(":");
        const [role_name, role_mode] = role_settings;
        const role_view = role_settings.length === 3 ? role_settings[2] : "*";
        if (user_role === role_name) {
            return role_mode === "*" ? [meta.mode, role_view] : [role_mode, role_view];
        }
    }
    return ["", ""];
};

/**
 * Check if user has required mode permission on meta.
 * @param {Object} req - HTTP request object.
 * @param {Object} meta - Meta entity definition.
 * @param {string} mode - Required mode (c/r/u/d).
 * @param {string} view - Required view.
 * @returns {boolean} True if user has permission.
 */
const check_user_role = (req, meta, mode, view) => {
    const [role_mode, role_view] = get_user_role_right(req, meta);
    return role_mode.includes(mode) && (role_view === "*" || role_view.includes(view));
};

module.exports = { is_root_role, is_root_user, validate_meta_role, check_user_role, get_user_role_right, get_session_user };
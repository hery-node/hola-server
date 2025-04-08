const { get_settings } = require("../setting");

/**
 * Validate the role defination in meta config
 * @param {*} role_name 
 * @returns 
 */
const validate_meta_role = (role_name) => {
    const settings = get_settings();
    //there is role defined in meta but no roles config in settings
    if (!settings.roles) {
        return false;
    }
    return is_valid_role(role_name);
}

const is_valid_role = (role_name) => {
    const settings = get_settings();
    const roles = settings.roles.filter(role => role.name == role_name);
    return roles.length == 1;
}

const is_root_role = (role_name) => {
    const settings = get_settings();
    //no role defined, then there is no role limition, so treat each user as root
    if (!settings.roles) {
        return true;
    }

    if (is_valid_role(role_name)) {
        return settings.roles.filter(role => role.name == role_name)[0].root == true;
    } else {
        return false;
    }
}

/**
 * get user's role from user session
 * @param {request} req 
 * @returns 
 */
const get_session_user_role = (req) => {
    const user = req && req.session ? req.session.user : null;
    return user ? user.role : null;
}

/**
 * 
 * @param {*} req 
 */
const is_root_user = (req) => {
    return is_root_role(get_session_user_role(req));
}

/**
 * Get the meta mode based on user's role
 * @param {request} req 
 * @param {meta} meta 
 * @returns 
 */
const get_user_role_right = (req, meta) => {
    const settings = get_settings();
    //no role defined in settings or no roles defined in meta, use meta mode
    if (!settings.roles || !meta.roles) {
        return [meta.mode, "*"];
    }

    const user_role = get_session_user_role(req);
    if (!user_role) {
        return ["", ""];
    }

    if (is_valid_role(user_role)) {
        const roles = meta.roles;
        for (let i = 0; i < roles.length; i++) {
            const role = roles[i];
            const role_settings = role.split(":");
            const role_name = role_settings[0];
            const role_mode = role_settings[1];
            const role_view = role_settings.length == 3 ? role_settings[2] : "*";
            if (user_role == role_name) {
                // * stands to get the mode from meta definition
                if (role_mode == "*") {
                    return [meta.mode, role_view];
                } else {
                    return [role_mode, role_view];
                }
            }
        }
    }
    return ["", ""];
}

/**
 * Check whether the user has the mode right on the meta or not
 * @param {http request} req 
 * @param {meta defination} meta 
 * @param {meta mode} mode 
 * @param {view} view
 * @returns 
 */
const check_user_role = (req, meta, mode, view) => {
    const [role_mode, role_view] = get_user_role_right(req, meta);
    return role_mode.includes(mode) && (role_view == "*" || role_view.includes(view));
}

module.exports = { is_root_role, is_root_user, validate_meta_role, check_user_role, get_user_role_right };
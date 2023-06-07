const { get_settings } = require("../setting");

const validate_meta_role = (role_name) => {
    const settings = get_settings();
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
    //no role defined, then every one is root
    if (!settings.roles) {
        return true;
    }

    if (is_valid_role(role_name)) {
        return settings.roles.filter(role => role.name == role_name)[0].root == true;
    } else {
        return false;
    }
}

const get_session_user_role = (req) => {
    const user = req && req.session ? req.session.user : null;
    return user ? user.role : null;
}

const get_user_role_mode = (req, meta) => {
    const settings = get_settings();
    //no role defined in settings or no roles defined in meta, use meta mode
    if (!settings.roles || !meta.roles) {
        return meta.mode;
    }

    const user_role = get_session_user_role(req);
    if (!user_role) {
        return "";
    }

    if (is_valid_role(user_role)) {
        const roles = meta.roles;
        for (let i = 0; i < roles.length; i++) {
            const role = roles[i];
            const role_settings = role.split(":");
            const role_name = role_settings[0];
            const role_mode = role_settings[1];
            if (user_role == role_name) {
                return role_mode;
            }
        }
    }

    return "";
}

const check_user_role = (req, meta, mode) => {
    const role_mode = get_user_role_mode(req, meta);
    return role_mode.includes(mode);
}

module.exports = { is_root_role, validate_meta_role, check_user_role, get_user_role_mode };
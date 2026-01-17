/**
 * Role-based access control utility functions.
 * @module core/role
 */

import { get_settings, Role } from '../setting.js';

interface SessionUser {
    role: string;
    [key: string]: unknown;
}

interface SessionCookie {
    session_id?: { value: string };
    [key: string]: unknown;
}

interface MetaWithRoles {
    mode: string;
    roles?: string[];
}

// In-memory session store reference (imported from session module at runtime)
let session_store: Map<string, { user?: SessionUser }> | null = null;

/** Set the session store reference for role checking. */
export const set_session_store = (store: Map<string, unknown>): void => {
    session_store = store as Map<string, { user?: SessionUser }>;
};

/** Find a role by name from settings. */
const find_role = (role_name: string): Role | undefined => {
    const settings = get_settings();
    return settings.roles ? settings.roles.find((role) => role.name === role_name) : undefined;
};

/** Validate role name exists in settings configuration. */
export const validate_meta_role = (role_name: string): boolean => {
    const settings = get_settings();
    if (!settings.roles) return false;
    return find_role(role_name) !== undefined;
};

/** Check if role name exists in settings. */
const is_valid_role = (role_name: string): boolean => find_role(role_name) !== undefined;

/** Check if role has root/admin privileges. */
export const is_root_role = (role_name: string | null): boolean => {
    if (!role_name) return true;
    const role = find_role(role_name);
    return role ? role.root === true : true;
};

/** Get user role from session cookie. */
const get_session_user_role = (cookie: SessionCookie): string | null => {
    if (!session_store) return null;
    const session_id = cookie?.session_id?.value;
    if (!session_id) return null;
    const session = session_store.get(session_id);
    const user = session?.user;
    return user ? user.role : null;
};

/** Get user object from session. */
export const get_session_user = (cookie: SessionCookie): SessionUser | null => {
    if (!session_store) return null;
    const session_id = cookie?.session_id?.value;
    if (!session_id) return null;
    const session = session_store.get(session_id);
    return session?.user ?? null;
};

/** Check if current user has root privileges. */
export const is_root_user = (cookie: SessionCookie): boolean => is_root_role(get_session_user_role(cookie));

/** Get user's role permissions for a meta entity. Returns [mode, view] permissions. */
export const get_user_role_right = (cookie: SessionCookie, meta: MetaWithRoles): [string, string] => {
    const settings = get_settings();
    if (!settings.roles || !meta.roles) return [meta.mode, "*"];

    const user_role = get_session_user_role(cookie);
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

/** Check if user has required mode permission on meta. */
export const check_user_role = (cookie: SessionCookie, meta: MetaWithRoles, mode: string, view: string): boolean => {
    const [role_mode, role_view] = get_user_role_right(cookie, meta);
    return role_mode.includes(mode) && (role_view === "*" || role_view.includes(view));
};

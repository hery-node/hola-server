/**
 * Session middleware initialization and helpers.
 * @module http/session
 */

import session from 'express-session';
import MongoStore from 'connect-mongo';
import { Express, Request } from 'express';
import { get_settings } from '../setting.js';
import { is_root_user } from '../core/role.js';
import { EntityMeta } from '../core/meta.js';
import { Entity } from '../db/entity.js';

interface SessionUser {
    id: string;
    [key: string]: unknown;
}

interface SessionRequest extends Request {
    session: Request['session'] & { user?: SessionUser; group?: string[] };
}

/** Initialize session middleware with MongoDB store. */
export const init_session = (app: Express): void => {
    const { server, mongo } = get_settings();
    if (!server?.keep_session) return;
    if (!server.session?.secret) throw new Error('Session secret required when keep_session is enabled');

    app.use(session({
        secret: server.session.secret,
        resave: true,
        saveUninitialized: true,
        cookie: { maxAge: server.session.cookie_max_age || 86400000 },
        store: MongoStore.create({ mongoUrl: mongo.url })
    }));
};

/** Get a value from the session. */
export const get_session_value = (req: SessionRequest, key: string): unknown => req?.session?.[key as keyof typeof req.session] ?? null;

/** Get current user ID from session. */
export const get_session_user_id = (req: SessionRequest): string | null => (get_session_value(req, 'user') as SessionUser | null)?.id ?? null;

/** Get current user groups from session. */
export const get_session_user_groups = (req: SessionRequest): string[] | null => {
    const group = get_session_value(req, 'group');
    return Array.isArray(group) ? group : null;
};

/** Check if current user owns the entity. */
export const is_owner = async (req: SessionRequest, meta: EntityMeta, entity: Entity, query: Record<string, unknown>): Promise<boolean> => {
    if (is_root_user(req as unknown as Request) || !meta.user_field) return true;
    const user_id = get_session_user_id(req);
    if (!user_id) throw new Error("no user id found in session");
    return await entity.count({ ...query, [meta.user_field]: user_id }) === 1;
};

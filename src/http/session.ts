/**
 * Session middleware initialization and helpers using Elysia cookies.
 * @module http/session
 */

import { Elysia } from 'elysia';
import { MongoClient, Db } from 'mongodb';
import { get_settings } from '../setting.js';
import { is_root_user, set_session_store } from '../core/role.js';
import { EntityMeta } from '../core/meta.js';
import { Entity } from '../db/entity.js';

interface SessionData {
    id: string;
    user?: { id: string; role: string };
    group?: string[];
    [key: string]: unknown;
}

interface CookieValue {
    value: string;
    set: (options: { value: string; httpOnly?: boolean; maxAge?: number; path?: string }) => void;
}

export interface SessionCookie {
    session_id?: CookieValue;
    [key: string]: CookieValue | undefined;
}

// In-memory session store with MongoDB persistence
const session_store: Map<string, SessionData> = new Map();
let mongo_client: MongoClient | null = null;
let session_db: Db | null = null;

/** Generate a random session ID. */
const generate_session_id = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/** Initialize MongoDB connection for sessions. */
const init_mongo_store = async (): Promise<void> => {
    if (mongo_client) return;

    const { mongo, server } = get_settings();
    if (!server?.keep_session) return;

    try {
        mongo_client = new MongoClient(mongo.url);
        await mongo_client.connect();
        session_db = mongo_client.db();

        // Load existing sessions from MongoDB
        const sessions = await session_db.collection('sessions').find({}).toArray();
        for (const session of sessions) {
            session_store.set(session._id.toString(), session.data as SessionData);
        }
    } catch (error) {
        console.error('Failed to initialize MongoDB session store:', error);
    }
};

/** Save session to MongoDB. */
const save_session = async (session_id: string, data: SessionData): Promise<void> => {
    session_store.set(session_id, data);

    if (session_db) {
        await session_db.collection('sessions').updateOne(
            { _id: session_id as unknown as any },
            { $set: { data, updatedAt: new Date() } },
            { upsert: true }
        );
    }
};

/** Initialize session plugin for Elysia. */
export const init_session = () => {
    const { server } = get_settings();

    // Set session store reference for role module
    set_session_store(session_store);

    return new Elysia({ name: 'session' })
        .onStart(async () => {
            if (server?.keep_session) {
                await init_mongo_store();
            }
        })
        .derive(({ cookie }) => {
            if (!server?.keep_session) {
                return { session: { id: '' } as SessionData };
            }

            let session_id = (cookie as SessionCookie).session_id?.value;

            if (!session_id) {
                session_id = generate_session_id();
                (cookie as SessionCookie).session_id?.set({
                    value: session_id,
                    httpOnly: true,
                    maxAge: server.session?.cookie_max_age || 86400000,
                    path: '/'
                });
            }

            const session_data = session_store.get(session_id) || { id: session_id };

            return {
                session: session_data,
                setSession: async (data: Partial<SessionData>) => {
                    const updated = { ...session_data, ...data };
                    await save_session(session_id!, updated);
                    return updated;
                }
            };
        });
};

/** Get current user ID from session cookie. */
export const get_session_user_id = (cookie: SessionCookie): string | null => {
    const session_id = cookie?.session_id?.value;
    if (!session_id) return null;
    const session = session_store.get(session_id);
    return session?.user?.id ?? null;
};

/** Get current user groups from session. */
export const get_session_user_groups = (cookie: SessionCookie): string[] | null => {
    const session_id = cookie?.session_id?.value;
    if (!session_id) return null;
    const session = session_store.get(session_id);
    const group = session?.group;
    return Array.isArray(group) ? group : null;
};

/** Check if current user owns the entity. */
export const is_owner = async (cookie: SessionCookie, meta: EntityMeta, entity: Entity, query: Record<string, unknown>): Promise<boolean> => {
    if (is_root_user(cookie) || !meta.user_field) return true;
    const user_id = get_session_user_id(cookie);
    if (!user_id) throw new Error("no user id found in session");
    return await entity.count({ ...query, [meta.user_field]: user_id }) === 1;
};

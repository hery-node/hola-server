/**
 * Elysia server initialization and configuration.
 * @module http/server
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { NO_SESSION } from './code.js';
import { init_session, get_session_user_id, SessionCookie } from './session.js';
import { init_router_dirs } from './router.js';
import { handle_exception } from './error.js';
import { get_settings, ServerSettings } from '../setting.js';
import { asyncLocalStorage, set_context_value } from './context.js';
import { get_db } from '../db/db.js';

let app: Elysia<any, any, any, any, any, any, any> | null = null;
let server_initialized = false;

/** Check if URL is in the excluded list. */
const is_excluded_url = (server: ServerSettings, path: string): boolean => {
    const patterns = server.exclude_urls;
    if (!Array.isArray(patterns)) return false;
    return patterns.some(pattern => new RegExp(pattern, "i").test(path));
};

/** Initialize HTTP server with middleware and routes. */
export const init_http_server = async (base_dir: string, port_attr: string, callback?: () => Promise<void> | void): Promise<Elysia<any>> => {
    if (server_initialized && app) return app;

    const settings = get_settings();
    if (!settings?.server) throw new Error('Server settings required for initialization');

    const { server } = settings;
    const port = (server as unknown as Record<string, unknown>)[port_attr] as number;
    if (!port) throw new Error(`Port attribute '${port_attr}' not found in server settings`);

    const client_urls = server.client_web_url;

    const elysia_app = new Elysia()
        // CORS middleware
        .use(cors({
            origin: Array.isArray(client_urls) ? client_urls : true,
            methods: ['GET', 'POST'],
            credentials: true
        }))
        // Session initialization (sets up cookie-based sessions)
        .use(init_session())
        // Authentication middleware
        .onBeforeHandle(({ request, cookie, set, path }) => {
            // Check authentication
            if (server.check_user && !is_excluded_url(server, path)) {
                const user_id = get_session_user_id(cookie as unknown as SessionCookie);
                if (!user_id) {
                    return { code: NO_SESSION, err: "authentication required" };
                }
            }
        })
        // Request context setup using derive
        .derive(({ request }) => {
            // Run in AsyncLocalStorage context
            const store: Record<string, unknown> = {};
            asyncLocalStorage.enterWith(store);
            set_context_value("req", request);
            return {};
        });

    app = elysia_app as any;

    // Load routers
    await init_router_dirs(app as any, base_dir, settings.server.api_prefix);

    // Error handling
    handle_exception(app as any);

    // Start server
    (app as Elysia<any>).listen(port, () => {
        get_db(async () => {
            if (callback) await callback();
        });
    });

    server_initialized = true;
    return app as any;
};

/** Get the Elysia app instance. */
export const get_app = (): Elysia<any> | null => app as any;

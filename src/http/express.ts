/**
 * Express server initialization and configuration.
 * @module http/express
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { init_cors } from './cors.js';
import { NO_SESSION } from './code.js';
import { init_session, get_session_user_id } from './session.js';
import { init_router_dirs } from './router.js';
import { handle_exception } from './error.js';
import { get_settings, ServerSettings } from '../setting.js';
import { asyncLocalStorage, set_context_value } from './context.js';

const app: Express = express();
let server_initialized = false;

/** Check if URL is in the excluded list. */
const is_excluded_url = (server: ServerSettings, req: Request): boolean => {
    const patterns = server.exclude_urls;
    if (!Array.isArray(patterns)) return false;
    return patterns.some(pattern => new RegExp(pattern, "i").test(req.originalUrl));
};

/** Configure body parser middleware with optional size limit. */
const configure_body_parser = (app: Express, body_limit?: string): void => {
    const options: { limit?: string; extended?: boolean } = { extended: true };
    if (body_limit) options.limit = body_limit;
    app.use(express.json(options));
    app.use(express.urlencoded(options as any));
};

/** Create authentication middleware. */
const create_auth_middleware = (server: ServerSettings) => (req: Request, res: Response, next: NextFunction): void => {
    if (server.check_user && !is_excluded_url(server, req)) {
        if (!get_session_user_id(req as any)) {
            res.json({ code: NO_SESSION, err: "authentication required" });
            return;
        }
    }

    asyncLocalStorage.run({}, () => {
        set_context_value("req", req);
        next();
    });
};

/** Initialize Express server with middleware and routes. */
export const init_express_server = async (base_dir: string, port_attr: string, callback?: () => Promise<void> | void): Promise<Express> => {
    if (server_initialized) return app;

    const settings = get_settings();
    if (!settings?.server) throw new Error('Server settings required for initialization');

    const { server } = settings;
    const port = (server as unknown as Record<string, unknown>)[port_attr] as number;
    if (!port) throw new Error(`Port attribute '${port_attr}' not found in server settings`);

    init_cors(app);
    configure_body_parser(app, server.threshold?.body_limit);
    init_session(app);
    app.use(create_auth_middleware(server));
    await init_router_dirs(app, base_dir);
    handle_exception(app);

    app.listen(port, async () => {
        if (callback) await callback();
    });

    server_initialized = true;
    return app;
};

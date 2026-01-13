/**
 * CORS middleware initialization.
 * @module http/cors
 */

import cors from 'cors';
import { Express } from 'express';
import { get_settings } from '../setting.js';

/** Initialize CORS middleware with client URL whitelist. */
export const init_cors = (app: Express): void => {
    const settings = get_settings();
    if (!settings?.server) throw new Error('Server settings required for CORS initialization');

    const client_urls = settings.server.client_web_url;
    if (!Array.isArray(client_urls)) return;

    app.use(cors({ origin: client_urls, methods: ['GET', 'POST'], credentials: true }));
};

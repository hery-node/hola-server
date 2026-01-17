/**
 * CORS plugin for Elysia.
 * @module plugins/cors
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

export interface CorsConfig {
    /** Allowed origins. Use `true` for all origins. */
    origin: string[] | true;
    /** Allowed HTTP methods. Default: ['GET', 'POST', 'PUT', 'DELETE'] */
    methods?: string[];
    /** Allow credentials (cookies). Default: true */
    credentials?: boolean;
}

/**
 * Create CORS plugin with configuration.
 * @param config CORS configuration
 */
export const holaCors = (config: CorsConfig) =>
    new Elysia({ name: 'hola-cors' })
        .use(cors({
            origin: config.origin,
            methods: config.methods ?? ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: config.credentials ?? true
        }));

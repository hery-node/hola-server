/**
 * JWT authentication plugin for Elysia.
 * @module plugins/auth
 */

import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { AuthError, TokenExpiredError } from '../errors/index.js';

export interface AuthConfig {
    /** JWT secret key. Required. */
    secret: string;
    /** Access token expiry. Default: '15m' */
    accessExpiry?: string;
    /** Refresh token expiry. Default: '7d' */
    refreshExpiry?: string;
    /** URL patterns to exclude from auth. Supports regex. */
    excludeUrls?: (string | RegExp)[];
}

export interface JwtPayload {
    sub: string;
    role?: string;
    groups?: string[];
    iat?: number;
    exp?: number;
}

/** Check if URL should be excluded from auth. */
const is_excluded = (path: string, patterns?: (string | RegExp)[]): boolean => {
    if (!patterns?.length) return false;
    return patterns.some(pattern => {
        if (typeof pattern === 'string') {
            return new RegExp(pattern, 'i').test(path);
        }
        return pattern.test(path);
    });
};

/**
 * Create JWT authentication plugin.
 * Provides access + refresh token flow with hybrid delivery (cookies + header).
 * @param config Authentication configuration
 */
export const holaAuth = (config: AuthConfig) =>
    new Elysia({ name: 'hola-auth' })
        .use(jwt({
            name: 'accessJwt',
            secret: config.secret,
            exp: config.accessExpiry ?? '15m'
        }))
        .use(jwt({
            name: 'refreshJwt',
            secret: config.secret,
            exp: config.refreshExpiry ?? '7d'
        }))
        .derive(async (ctx) => {
            const { headers, cookie, accessJwt } = ctx as any;
            // Hybrid: check Authorization header first, then cookie
            const auth_header = headers.authorization;
            const token = auth_header?.startsWith('Bearer ')
                ? auth_header.slice(7)
                : cookie?.access_token?.value;

            let user: JwtPayload | null = null;
            if (token) {
                try {
                    const payload = await accessJwt.verify(token);
                    if (payload) {
                        user = payload as JwtPayload;
                    }
                } catch {
                    // Token invalid or expired
                }
            }

            return {
                user,
                getUser: () => user
            };
        })
        .onBeforeHandle((ctx) => {
            const { user, path, set } = ctx as any;
            // Skip auth for excluded URLs
            if (is_excluded(path, config.excludeUrls)) return;

            if (!user) {
                set.status = 401;
                throw new AuthError('authentication required');
            }
        });

/**
 * Create auth routes plugin for login/refresh/logout.
 * Must be used after holaAuth plugin.
 */
export const holaAuthRoutes = () =>
    new Elysia({ name: 'hola-auth-routes', prefix: '/auth' })
        .post('/refresh', async (ctx) => {
            const { body, cookie, refreshJwt, accessJwt, headers, set } = ctx as any;
            const token = (body as { refresh_token?: string })?.refresh_token ?? cookie?.refresh_token?.value;
            if (!token) {
                set.status = 401;
                throw new AuthError('refresh token required');
            }

            let payload: JwtPayload | null = null;
            try {
                payload = await refreshJwt.verify(token) as JwtPayload | null;
            } catch {
                throw new TokenExpiredError();
            }

            if (!payload) {
                throw new TokenExpiredError();
            }

            const new_access = await accessJwt.sign({
                sub: payload.sub,
                role: payload.role,
                groups: payload.groups
            });

            // Set cookie for browser clients
            const is_browser = headers['user-agent']?.includes('Mozilla');
            if (is_browser && cookie?.access_token) {
                cookie.access_token.set({
                    value: new_access,
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    path: '/'
                });
            }

            return {
                code: 0,
                access_token: new_access,
                expires_in: 900 // 15 minutes default
            };
        })
        .post('/logout', (ctx) => {
            const { cookie } = ctx as any;
            if (cookie?.access_token) cookie.access_token.remove();
            if (cookie?.refresh_token) cookie.refresh_token.remove();
            return { code: 0 };
        });

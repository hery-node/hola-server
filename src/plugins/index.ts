/**
 * Plugins index - exports all Elysia plugins.
 * @module plugins
 */

export { holaCors, type CorsConfig } from './cors.js';
export { holaBody, type BodyConfig } from './body.js';
export { holaAuth, holaAuthRoutes, type AuthConfig, type JwtPayload } from './auth.js';
export { holaError } from './error.js';

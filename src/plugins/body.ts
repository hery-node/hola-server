/**
 * Body limit plugin for Elysia.
 * @module plugins/body
 */

import { Elysia } from 'elysia';

export interface BodyConfig {
    /** Max request body size. e.g., '10mb', '1gb', or bytes as number. Default: '10mb' */
    limit?: string | number;
}

/** Parse size string to bytes. */
const parse_size = (size: string | number): number => {
    if (typeof size === 'number') return size;
    const match = size.match(/^(\d+)(kb|mb|gb)?$/i);
    if (!match) return 10 * 1024 * 1024; // 10mb default
    const [, num, unit] = match;
    const multipliers: Record<string, number> = {
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024
    };
    return parseInt(num) * (multipliers[unit?.toLowerCase() ?? 'b'] ?? 1);
};

/**
 * Create body limit plugin.
 * @param config Body configuration
 */
export const holaBody = (config: BodyConfig = {}) => {
    const max_size = parse_size(config.limit ?? '10mb');

    return new Elysia({ name: 'hola-body' })
        .onBeforeHandle(({ request, set }) => {
            const content_length = request.headers.get('content-length');
            if (content_length && parseInt(content_length) > max_size) {
                set.status = 413;
                return { code: 'PAYLOAD_TOO_LARGE', err: 'request body too large' };
            }
        });
};

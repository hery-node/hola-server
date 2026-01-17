/**
 * Configuration loader for environment-based settings.
 * @module config
 */

export interface AppConfig {
    /** Server port */
    port: number;
    /** JWT configuration */
    jwt: {
        secret: string;
        accessExpiry: string;
        refreshExpiry: string;
    };
    /** CORS configuration */
    cors: {
        origin: string[] | true;
        credentials?: boolean;
    };
    /** Body parser configuration */
    body: {
        limit: string | number;
    };
    /** Database configuration */
    db: {
        url: string;
    };
}

/**
 * Load configuration from environment-specific file.
 * Looks for config files in the specified directory based on NODE_ENV.
 * 
 * @param config_dir Directory containing config files (dev.ts, test.ts, prod.ts)
 * @returns Promise resolving to AppConfig
 * 
 * @example
 * ```typescript
 * const config = await load_config(__dirname + '/config');
 * ```
 */
export const load_config = async (config_dir: string): Promise<AppConfig> => {
    const env = process.env.NODE_ENV || 'dev';
    const config_path = `${config_dir}/${env}`;

    try {
        const module = await import(config_path);
        return module.default as AppConfig;
    } catch (error) {
        throw new Error(`Failed to load config for environment '${env}' from ${config_path}: ${error}`);
    }
};

/**
 * Create a base config with common defaults.
 * Use this as a starting point for environment configs.
 */
export const create_base_config = (overrides: Partial<AppConfig> = {}): AppConfig => ({
    port: 3000,
    jwt: {
        secret: 'change-this-in-production',
        accessExpiry: '15m',
        refreshExpiry: '7d',
        ...overrides.jwt
    },
    cors: {
        origin: ['http://localhost:5173'],
        credentials: true,
        ...overrides.cors
    },
    body: {
        limit: '10mb',
        ...overrides.body
    },
    db: {
        url: 'mongodb://localhost:27017/hola',
        ...overrides.db
    },
    ...overrides
});

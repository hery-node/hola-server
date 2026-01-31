/**
 * Application settings management.
 * @module setting
 */

export interface ProxyConfig {
    host: string;
    port: number;
    auth?: { username: string; password: string };
}

export interface AxiosSettings {
    retry: number;
    retry_delay: number;
    proxy: ProxyConfig | null;
}

export interface EncryptSettings {
    key: string;
}

export interface MongoSettings {
    url: string;
    pool: number;
}

export interface LogSettings {
    col_log: string;
    log_level: number;
    save_db: boolean;
}

export interface Role {
    name: string;
    root?: boolean;
}

export interface SessionSettings {
    cookie_max_age: number;
    secret: string;
}

export interface ThresholdSettings {
    max_download_size: number;
    body_limit: string;
    default_list_limit: number;
}

export interface ServerSettings {
    service_port: number;
    client_web_url: string[];
    keep_session: boolean;
    check_user: boolean;
    exclude_urls: string[];
    session: SessionSettings;
    threshold: ThresholdSettings;
    routes: string[];
    api_prefix?: string;
}

export interface Settings {
    axios: AxiosSettings;
    encrypt: EncryptSettings;
    mongo: MongoSettings;
    log: LogSettings;
    roles: Role[];
    server: ServerSettings;
}

const dev_mode = true;

let settings: Settings = {
    axios: { retry: 3, retry_delay: 1000, proxy: null },
    encrypt: { key: "my_key" },
    mongo: { url: 'mongodb://127.0.0.1/hola', pool: 10 },
    log: { col_log: 'log', log_level: 0, save_db: !dev_mode },
    roles: [{ name: "admin", root: true }, { name: "user" }],
    server: {
        service_port: 8088,
        client_web_url: ['http://localhost:8080'],
        keep_session: true,
        check_user: true,
        exclude_urls: ["/"],
        session: { cookie_max_age: 1000 * 60 * 60 * 24 * 256 * 10, secret: 'BGTDYWJ*)#*$&*%(%#' },
        threshold: { max_download_size: 5000, body_limit: '10mb', default_list_limit: 1000 },
        routes: ['router']
    }
};

/** Initialize application settings with user-provided configuration. */
export const init_settings = (user_setting: Settings): void => { settings = user_setting; };

/** Get current application settings. */
export const get_settings = (): Settings => settings;

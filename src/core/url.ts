/**
 * URL and HTTP request utility functions.
 * @module core/url
 */

export interface UrlRequestConfig {
    headers?: Record<string, string>;
    body?: string | FormData | Blob | ArrayBuffer | URLSearchParams;
    signal?: AbortSignal;
}

export interface UrlResponse {
    status: number;
    ok: boolean;
    headers: Headers;
    data: unknown;
    text: () => Promise<string>;
    json: () => Promise<unknown>;
}

/** Create HTTP request function with preset URL and method using native fetch. */
export const url = (target_url: string, method: string): (config?: UrlRequestConfig) => Promise<UrlResponse> => {
    return async (config?: UrlRequestConfig): Promise<UrlResponse> => {
        const response = await fetch(target_url, {
            method,
            headers: config?.headers,
            body: config?.body,
            signal: config?.signal,
        });

        return {
            status: response.status,
            ok: response.ok,
            headers: response.headers,
            data: null,
            text: () => response.text(),
            json: () => response.json(),
        };
    };
};

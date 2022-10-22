const dev_mode = true;

let settings = {
    encrypt: {
        key: "AhBWt15WFj8PrMnnZhX8AF1IM4V2x0A3"
    },
    mongo: {
        url: 'mongodb://127.0.0.1/hola',
        pool: 10
    },
    log: {
        col_log: 'log',
        log_level: 0,
        save_db: dev_mode == false,
    },
    server: {
        service_port: 8088,
        client_web_url: ['http://localhost:8080'],
        keep_session: true,
        check_user: true,
        exclude_urls: ["/"],
        session: {
            cookie_max_age: 1000 * 60 * 60 * 24 * 256 * 10,// ten years
            secret: 'BGTDYWJ*)#*$&*%(%#'
        },
        threshold: {
            max_download_size: 5000,
            body_limit: '10mb'
        },
        routes: ['router']
    }
};

const init_settings = (user_setting) => {
    settings = user_setting;
}

const get_settings = () => {
    return settings;
}

module.exports = { init_settings, get_settings };

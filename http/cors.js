const cors = require('cors');
const { get_settings } = require('../setting');

const init_cors = (app) => {
    const server = get_settings().server;
    if (server && server.client_web_url) {
        app.use(cors({
            origin: server.client_web_url,
            methods: ['GET', 'POST'],
            credentials: true
        }));
    }
}

module.exports = { init_cors };

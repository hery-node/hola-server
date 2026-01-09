const { close_db } = require('../../db/db');

after(async () => {
    await close_db();
});

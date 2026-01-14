import { close_db } from '../../src/db/db.js';

after(async () => {
    await close_db();
});

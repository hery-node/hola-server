import { afterAll } from 'bun:test';
import { close_db } from '../../src/db/db.js';

afterAll(async () => {
    await close_db();
});

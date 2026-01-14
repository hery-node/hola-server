import { strictEqual } from 'assert';
import { encrypt_pwd } from '../../src/core/encrypt.js';

describe('encrypt', function () {
    describe('encrypt_pwd', function () {
        it('should encrypt_pwd successfully', async function () {
            const pwd = "user1234";
            const p1 = encrypt_pwd(pwd);
            const p2 = encrypt_pwd(pwd);
            strictEqual(p1, p2);
        });
    });
}
);
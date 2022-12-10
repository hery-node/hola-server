const { strictEqual } = require('assert');
const { extract_number } = require('../../core/number');

describe('number', function () {
    describe('test number related method', function () {
        it('should extract number successfully', function () {
            strictEqual(extract_number("123"), 123);
            strictEqual(extract_number("123 abc"), 123);
            strictEqual(extract_number("123 abc . efg"), 123);
            strictEqual(extract_number(" abc 134.56 efg"), 134.56);
            strictEqual(extract_number(" abc 134.56 efg . rg"), 134.56);
            strictEqual(extract_number(" abc 134.56 efg 123 rg"), 0);
            strictEqual(extract_number("123.67"), 123.67);
        });
    });
}
);

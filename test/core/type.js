const { strictEqual, throws } = require('assert');
const { get_type, register_type } = require('../../core/type');

describe('type', function () {
    describe('get_type', function () {
        it('should throw for unregistered type', function () {
            throws(() => get_type('unknown_type'));
        });

        it('should return registered type', function () {
            const type = get_type('string');
            strictEqual(typeof type.convert, 'function');
        });
    });

    describe('string type', function () {
        it('should convert and trim string', function () {
            const type = get_type('string');
            strictEqual(type.convert('  hello  ').value, 'hello');
        });

        it('should handle empty values', function () {
            const type = get_type('string');
            strictEqual(type.convert('').value, '');
            strictEqual(type.convert(null).value, '');
        });
    });

    describe('boolean type', function () {
        it('should convert true values', function () {
            const type = get_type('boolean');
            strictEqual(type.convert(true).value, true);
            strictEqual(type.convert('true').value, true);
        });

        it('should convert false values', function () {
            const type = get_type('boolean');
            strictEqual(type.convert(false).value, false);
            strictEqual(type.convert('false').value, false);
        });

        it('should error for invalid boolean', function () {
            const type = get_type('boolean');
            strictEqual(type.convert('yes').err !== undefined, true);
        });
    });

    describe('int type', function () {
        it('should convert valid integers', function () {
            const type = get_type('int');
            strictEqual(type.convert(42).value, 42);
            strictEqual(type.convert('42').value, 42);
            strictEqual(type.convert(-10).value, -10);
        });

        it('should error for non-integers', function () {
            const type = get_type('int');
            strictEqual(type.convert(3.14).err !== undefined, true);
            strictEqual(type.convert('abc').err !== undefined, true);
        });
    });

    describe('uint type', function () {
        it('should convert positive integers', function () {
            const type = get_type('uint');
            strictEqual(type.convert(42).value, 42);
            strictEqual(type.convert(0).value, 0);
        });

        it('should error for negative integers', function () {
            const type = get_type('uint');
            strictEqual(type.convert(-1).err !== undefined, true);
        });
    });

    describe('float type', function () {
        it('should convert and round to 2 decimals', function () {
            const type = get_type('float');
            strictEqual(type.convert(3.14159).value, 3.14);
            strictEqual(type.convert('2.999').value, 3);
        });

        it('should error for non-numbers', function () {
            const type = get_type('float');
            strictEqual(type.convert('abc').err !== undefined, true);
        });
    });

    describe('ufloat type', function () {
        it('should convert positive floats', function () {
            const type = get_type('ufloat');
            strictEqual(type.convert(3.14).value, 3.14);
        });

        it('should error for negative floats', function () {
            const type = get_type('ufloat');
            strictEqual(type.convert(-3.14).err !== undefined, true);
        });
    });

    describe('number type', function () {
        it('should convert any number', function () {
            const type = get_type('number');
            strictEqual(type.convert(42).value, 42);
            strictEqual(type.convert(-3.14).value, -3.14);
            strictEqual(type.convert('100').value, 100);
        });
    });

    describe('email type', function () {
        it('should accept valid emails', function () {
            const type = get_type('email');
            strictEqual(type.convert('test@example.com').value, 'test@example.com');
        });

        it('should reject invalid emails', function () {
            const type = get_type('email');
            strictEqual(type.convert('invalid-email').err !== undefined, true);
        });
    });

    describe('url type', function () {
        it('should accept valid URLs', function () {
            const type = get_type('url');
            strictEqual(type.convert('https://example.com').value, 'https://example.com');
        });

        it('should reject invalid URLs', function () {
            const type = get_type('url');
            strictEqual(type.convert('not-a-url').err !== undefined, true);
        });
    });

    describe('array type', function () {
        it('should split comma-separated string', function () {
            const type = get_type('array');
            const result = type.convert('a,b,c').value;
            strictEqual(result.length, 3);
            strictEqual(result.join(''), 'abc');
        });

        it('should pass through arrays', function () {
            const type = get_type('array');
            const result = type.convert(['a', 'b']).value;
            strictEqual(result.length, 2);
        });
    });

    describe('json type', function () {
        it('should pass through objects', function () {
            const type = get_type('json');
            const obj = { a: 1 };
            strictEqual(type.convert(obj).value, obj);
        });

        it('should parse JSON strings', function () {
            const type = get_type('json');
            const result = type.convert('{"a":1}').value;
            strictEqual(result.a, 1);
        });

        it('should error for invalid JSON', function () {
            const type = get_type('json');
            strictEqual(type.convert('not json').err !== undefined, true);
        });
    });

    describe('time type', function () {
        it('should accept valid time formats', function () {
            const type = get_type('time');
            strictEqual(type.convert('12:30').value, '12:30');
            strictEqual(type.convert('23:59:59').value, '23:59:59');
        });

        it('should reject invalid time formats', function () {
            const type = get_type('time');
            strictEqual(type.convert('25:00').err !== undefined, true);
        });
    });

    describe('ip_address type', function () {
        it('should accept valid IP addresses', function () {
            const type = get_type('ip_address');
            strictEqual(type.convert('192.168.1.1').value, '192.168.1.1');
        });

        it('should reject invalid IP addresses', function () {
            const type = get_type('ip_address');
            strictEqual(type.convert('256.1.1.1').err !== undefined, true);
            strictEqual(type.convert('not-an-ip').err !== undefined, true);
        });
    });

    describe('slug type', function () {
        it('should convert to slug format', function () {
            const type = get_type('slug');
            strictEqual(type.convert('Hello World!').value, 'hello-world');
            strictEqual(type.convert('  Multiple   Spaces  ').value, 'multiple-spaces');
        });
    });

    describe('age type', function () {
        it('should accept valid ages (0-200)', function () {
            const type = get_type('age');
            strictEqual(type.convert(25).value, 25);
            strictEqual(type.convert(0).value, 0);
            strictEqual(type.convert(200).value, 200);
        });

        it('should reject invalid ages', function () {
            const type = get_type('age');
            strictEqual(type.convert(-1).err !== undefined, true);
            strictEqual(type.convert(201).err !== undefined, true);
        });
    });
});

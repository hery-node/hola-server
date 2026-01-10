const { strictEqual } = require('assert');
const { get_context, verify_template, execute_template } = require('../../core/lhs');

describe('lhs', function () {
    describe('get_context', function () {
        it('should return context with number utilities', function () {
            const ctx = get_context();
            strictEqual(typeof ctx.range, 'function');
            strictEqual(typeof ctx.scale, 'function');
            strictEqual(typeof ctx.space, 'function');
        });
    });

    describe('verify_template', function () {
        it('should return null for valid template', function () {
            const result = verify_template('Hello ${name}!', { name: 'World' });
            strictEqual(result, null);
        });

        it('should return error message for invalid template', function () {
            const result = verify_template('Hello ${name!', { name: 'World' });
            strictEqual(typeof result, 'string');
            strictEqual(result.length > 0, true);
        });
    });

    describe('execute_template', function () {
        it('should execute template with variables', function () {
            const result = execute_template('Hello ${name}!', { name: 'World' });
            strictEqual(result, 'Hello World!');
        });

        it('should support expressions in template', function () {
            const result = execute_template('Sum is ${a + b}', { a: 2, b: 3 });
            strictEqual(result, 'Sum is 5');
        });

        it('should work with number utilities from context', function () {
            const ctx = { ...get_context() };
            const result = execute_template('Range: ${range(3).join(",")}', ctx);
            strictEqual(result, 'Range: 0,1,2');
        });
    });
});

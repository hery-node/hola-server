import { describe, it } from 'bun:test';
import { strictEqual } from 'assert';
import { simple_date, format_date, format_time, format_date_time, parse_date } from '../../src/core/date.js';

describe('date', function () {
    const date_obj = new Date();
    date_obj.setFullYear(2021, 3 - 1, 26);
    date_obj.setHours(16, 30, 50, 0);

    describe('test date related method', function () {
        it('should simple_date successfully', function () {
            const simple = simple_date(date_obj);
            strictEqual(simple, "03/26");
        });

        it('should format_date successfully', function () {
            const date = format_date(date_obj);
            strictEqual(date, "20210326");
        });

        it('should format_time successfully', function () {
            const time = format_time(date_obj);
            strictEqual(time, "16:30");
        });

        it('should format_date_time successfully', function () {
            const date_time = format_date_time(date_obj);
            strictEqual(date_time, "20210326 16:30:50");
        });

        it('should parse_date successfully', function () {
            const date = parse_date("20210326");
            strictEqual(date.getFullYear(), 2021);
            strictEqual(date.getMonth(), 2);
        });
    });
}
);

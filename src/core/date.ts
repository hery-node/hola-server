/**
 * Date formatting and parsing utility functions.
 * @module core/date
 */

import dateformat from 'dateformat';

export const format_time = (date: Date | string | number): string => dateformat(date, "HH:MM");
export const simple_date = (date: Date | string | number): string => dateformat(date, "mm/dd");
export const format_date = (date: Date | string | number): string => dateformat(date, "yyyymmdd");
export const format_date_time = (date: Date | string | number): string => dateformat(date, "yyyymmdd HH:MM:ss");

/** Parse yyyymmdd formatted string to Date object. */
export const parse_date = (date: string): Date => {
    const [year, month, day] = [date.slice(0, 4), date.slice(4, 6), date.slice(6, 8)].map(Number);
    const date_obj = new Date();
    date_obj.setFullYear(year, month - 1, day);
    date_obj.setHours(0, 0, 0, 0);
    return date_obj;
};

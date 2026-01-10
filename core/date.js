/**
 * @fileoverview Date formatting and parsing utility functions.
 * @module core/date
 */

const date_format = require("dateformat");

const format_time = (date) => date_format(date, "HH:MM");
const simple_date = (date) => date_format(date, "mm/dd");
const format_date = (date) => date_format(date, "yyyymmdd");
const format_date_time = (date) => date_format(date, "yyyymmdd HH:MM:ss");

/**
 * Parse yyyymmdd formatted string to Date object.
 * @param {string} date - Date string in yyyymmdd format.
 * @returns {Date} Parsed Date object with time set to 00:00:00.
 */
const parse_date = (date) => {
  const [year, month, day] = [date.slice(0, 4), date.slice(4, 6), date.slice(6, 8)].map(Number);
  const date_obj = new Date();
  date_obj.setFullYear(year, month - 1, day);
  date_obj.setHours(0, 0, 0, 0);
  return date_obj;
};

module.exports = { simple_date, format_date, format_time, format_date_time, parse_date };

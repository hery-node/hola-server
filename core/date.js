/**
 * @fileoverview Date formatting and parsing utility functions.
 * @module core/date
 */

const date_format = require("dateformat");

/**
 * Format date object time part as HH:MM.
 * @param {Date} date - Date object to format.
 * @returns {string} Formatted time string.
 */
const format_time = (date) => date_format(date, "HH:MM");

/**
 * Format date object as mm/dd.
 * @param {Date} date - Date object to format.
 * @returns {string} Formatted date string.
 */
const simple_date = (date) => date_format(date, "mm/dd");

/**
 * Format date object as yyyymmdd.
 * @param {Date} date - Date object to format.
 * @returns {string} Formatted date string.
 */
const format_date = (date) => date_format(date, "yyyymmdd");

/**
 * Format date object as yyyymmdd HH:MM:ss.
 * @param {Date} date - Date object to format.
 * @returns {string} Formatted datetime string.
 */
const format_date_time = (date) => date_format(date, "yyyymmdd HH:MM:ss");

/**
 * Parse yyyymmdd formatted string to Date object.
 * @param {string} date - Date string in yyyymmdd format.
 * @returns {Date} Parsed Date object with time set to 00:00:00.
 */
const parse_date = (date) => {
  const year = parseInt(date.substr(0, 4));
  const month = parseInt(date.substr(4, 2));
  const day = parseInt(date.substr(6, 2));
  const date_obj = new Date();
  date_obj.setFullYear(year, month - 1, day);
  date_obj.setHours(0, 0, 0, 0);
  return date_obj;
};

module.exports = { simple_date, format_date, format_time, format_date_time, parse_date };

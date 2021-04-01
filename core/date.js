const date_format = require('dateformat');

/**
 * Format the date object time part using HH:MM
 * @param {date object to be formatted} date 
 * @returns 
 */
const format_time = (date) => {
    return date_format(date, "HH:MM");
};

/**
 * Format date object using mm/dd
 * @param {date object to be formatted} date 
 * @returns 
 */
const simple_date = date => {
    return date_format(date, "mm/dd");
}

/**
 * Format date obj using yyyymmdd
 * @param {date object to be formatted} date 
 * @returns 
 */
const format_date = date => {
    return date_format(date, "yyyymmdd");
}

/**
 * Format data obj using yyyymmdd hh:mm:ss
 * @param {date object to be formatted} date 
 * @returns 
 */
const format_date_time = date => {
    return date_format(date, "yyyymmdd HH:MM:ss");
}

/**
 * Parse the date object using yyyymmdd format
 * @param {date str to be parsed} date 
 * @returns 
 */
const parse_date = (date) => {
    const year = parseInt(date.substr(0, 4));
    const month = parseInt(date.substr(4, 2));
    const day = parseInt(date.substr(6, 2));
    const dateObj = new Date();
    dateObj.setFullYear(year, month - 1, day);
    dateObj.setHours(0, 0, 0, 0);
    return dateObj;
}

module.exports = { simple_date, format_date, format_time, format_date_time, parse_date }

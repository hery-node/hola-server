/**
 * @fileoverview File system utility functions.
 * @module core/file
 */

const fs = require('fs');
const unzipper = require('unzipper');

/**
 * Get file extension from filename.
 * @param {string} file_name - Name of the file.
 * @returns {string} File extension without dot.
 */
const file_extension = (file_name) => file_name ? file_name.split('.').pop() : "";

/**
 * Get file name without extension.
 * @param {string} file_name - Name of the file.
 * @returns {string} File name prefix.
 */
const file_prefix = (file_name) => file_name ? file_name.split('.')[0] : "";

/**
 * Read files from zip archive with filter.
 * @param {string} path - Path to zip file.
 * @param {Function} predicate - Filter function for files.
 * @returns {Promise<Object[]>} Array of matching file entries.
 */
const read_from_zip = async (path, predicate) => {
    const directory = await unzipper.Open.file(path);
    return directory.files.filter(predicate);
};

const read_from_zip_by_extension = (path, extension) => read_from_zip(path, file => file_extension(file.path) === extension);
const read_from_zip_by_prefix = (path, prefix) => read_from_zip(path, file => file_prefix(file.path) === prefix);

/**
 * Check if file exists at path.
 * @param {string} path - File path to check.
 * @returns {boolean} True if file exists, false otherwise.
 */
const is_file_exist = (path) => fs.existsSync(path);

/**
 * Get file size in bytes.
 * @param {string} path - File path.
 * @returns {Promise<number>} File size in bytes.
 */
const get_file_size = async (path) => (await fs.promises.stat(path)).size;

module.exports = { file_extension, file_prefix, read_from_zip_by_extension, read_from_zip_by_prefix, is_file_exist, get_file_size };
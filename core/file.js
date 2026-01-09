/**
 * @fileoverview File system utility functions.
 * @module core/file
 */

const fs = require('fs');
const fs_promises = require('fs').promises;
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
 * Read files from zip archive filtered by extension.
 * @param {string} path - Path to zip file.
 * @param {string} extension - File extension to filter by.
 * @returns {Promise<Object[]>} Array of matching file entries.
 */
const read_from_zip_by_extension = async (path, extension) => {
    const directory = await unzipper.Open.file(path);
    return directory.files.filter((file) => extension === file_extension(file.path));
};

/**
 * Read files from zip archive filtered by filename prefix.
 * @param {string} path - Path to zip file.
 * @param {string} prefix - Filename prefix to filter by.
 * @returns {Promise<Object[]>} Array of matching file entries.
 */
const read_from_zip_by_prefix = async (path, prefix) => {
    const directory = await unzipper.Open.file(path);
    return directory.files.filter((file) => file_prefix(file.path) === prefix);
};

/**
 * Check if file exists at path.
 * @param {string} path - File path to check.
 * @returns {boolean} True if file exists, false otherwise.
 */
const is_file_exist = (path) => {
    try {
        fs.accessSync(path, fs.F_OK);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Get file size in bytes.
 * @param {string} path - File path.
 * @returns {Promise<number>} File size in bytes.
 */
const get_file_size = async (path) => {
    const stats = await fs_promises.stat(path);
    return stats.size;
};

module.exports = { file_extension, file_prefix, read_from_zip_by_extension, read_from_zip_by_prefix, is_file_exist, get_file_size };
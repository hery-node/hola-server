const fs = require('fs');
const fs_promises = require('fs').promises;

const unzipper = require('unzipper');

const file_extension = file_name => file_name ? file_name.split('.').pop() : "";
const file_prefix = file_name => file_name ? file_name.split('.')[0] : "";

const read_from_zip_by_extension = async (path, extension) => {
    const directory = await unzipper.Open.file(path);
    return directory.files.filter(file => extension == file_extension(file.path));
}

const read_from_zip_by_prefix = async (path, prefix) => {
    const directory = await unzipper.Open.file(path);
    return directory.files.filter(file => file_prefix(file.path) == prefix);
}

/**
 * Check the file exist or not
 * @param {the file path} path 
 * @returns 
 */
const is_file_exist = (path) => {
    try {
        fs.accessSync(path, fs.F_OK);
    } catch (e) {
        return false;
    }
    return true;
}

const get_file_size = async (path) => {
    const stats = await fs_promises.stat(path);
    return stats.size;
}

module.exports = { file_extension, file_prefix, read_from_zip_by_extension, read_from_zip_by_prefix, is_file_exist, get_file_size }
/**
 * @fileoverview GridFS file storage utilities.
 * @module db/gridfs
 */

const fs = require('fs');
const { GridFSBucket, MongoClient } = require('mongodb');
const { get_settings } = require('../setting');

const CHUNK_SIZE = 1024 * 1024; // 1MB

let gridfs_instance;

/**
 * Get or create GridFS singleton instance.
 * @returns {Promise<GridFS>} GridFS instance
 */
const get_gridfs_instance = async () => {
    if (gridfs_instance) return gridfs_instance;

    const { url } = get_settings().mongo;
    const client = await MongoClient.connect(url, { useUnifiedTopology: true, useNewUrlParser: true });

    gridfs_instance = new GridFS(client.db());
    return gridfs_instance;
};

/**
 * Wrap stream in promise.
 * @param {Stream} stream - Stream to wrap
 * @returns {Promise} Resolves on finish, rejects on error
 */
const stream_to_promise = (stream) => new Promise((resolve, reject) => {
    stream.on('error', reject).on('finish', resolve);
});

class GridFS {
    constructor(db) {
        this.db = db;
    }

    /**
     * Get GridFS bucket.
     * @param {string} bucket_name - Bucket name
     * @returns {GridFSBucket} Bucket instance
     */
    bucket(bucket_name) {
        return new GridFSBucket(this.db, { chunkSizeBytes: CHUNK_SIZE, bucketName: bucket_name });
    }

    /**
     * Save file to GridFS (replaces existing if found).
     * @param {string} bucket_name - Bucket name
     * @param {string} filename - File name
     * @param {string|Stream} source - File path or readable stream
     * @returns {Promise} Upload result
     */
    async save_file(bucket_name, filename, source) {
        const bucket = this.bucket(bucket_name);

        // Delete existing file if present
        const existing = await bucket.find({ filename }).toArray();
        if (existing.length > 0) {
            await bucket.delete(existing[0]._id);
        }

        // Create read stream from path if string
        const read_stream = typeof source === 'string' ? fs.createReadStream(source) : source;
        return stream_to_promise(read_stream.pipe(bucket.openUploadStream(filename)));
    }

    /**
     * Stream file to HTTP response.
     * @param {string} bucket_name - Bucket name
     * @param {string} filename - File name
     * @param {Response} response - HTTP response object
     */
    read_file(bucket_name, filename, response) {
        const stream = this.bucket(bucket_name).openDownloadStreamByName(filename);
        stream.on('data', chunk => response.write(chunk));
        stream.on('error', () => response.sendStatus(404));
        stream.on('end', () => response.end());
    }

    /**
     * Pipe file from GridFS to disk.
     * @param {string} bucket_name - Bucket name
     * @param {string} filename - Source file name
     * @param {string} dest_path - Destination file path
     * @returns {Promise} Pipe result
     */
    pipe_file(bucket_name, filename, dest_path) {
        const stream = this.bucket(bucket_name).openDownloadStreamByName(filename);
        return stream_to_promise(stream.pipe(fs.createWriteStream(dest_path)));
    }

    /**
     * Delete file by name.
     * @param {string} bucket_name - Bucket name
     * @param {string} filename - File name
     */
    async delete_file(bucket_name, filename) {
        const bucket = this.bucket(bucket_name);
        const files = await bucket.find({ filename }).toArray();
        if (files.length > 0) {
            await bucket.delete(files[0]._id);
        }
    }
}

/**
 * Set file field values on entity object based on uploaded files.
 * @param {Object} meta - Entity meta info
 * @param {Request} req - HTTP request
 * @param {Object} obj - Entity object
 */
const set_file_fields = (meta, req, obj) => {
    const { file_fields, primary_keys } = meta;
    if (!file_fields?.length || !req.files) return;

    const primary_key = primary_keys.map(key => obj[key]).join('_');

    for (const field of file_fields) {
        const files = req.files[field.name];
        if (files?.length > 0) {
            obj[field.name] = file_fields.length === 1 ? primary_key : `${primary_key}_${field.name}`;
        } else {
            delete obj[field.name];
        }
    }
};

/**
 * Save uploaded file fields to GridFS.
 * @param {string} collection - MongoDB collection name
 * @param {Object[]} file_fields - File field definitions
 * @param {Request} req - HTTP request
 * @param {Object} obj - Entity object
 */
const save_file_fields_to_db = async (collection, file_fields, req, obj) => {
    if (!file_fields?.length || !req.files) return;

    const instance = await get_gridfs_instance();

    for (const field of file_fields) {
        if (!obj[field.name]) continue;

        const [file] = req.files[field.name];
        await instance.save_file(collection, obj[field.name], file.path);
        fs.unlinkSync(file.path);
    }
};

// Wrapper functions for external API
const save_file = async (collection, filename, filepath) => {
    const instance = await get_gridfs_instance();
    await instance.save_file(collection, filename, filepath);
};

const read_file = async (collection, filename, response) => {
    const instance = await get_gridfs_instance();
    instance.read_file(collection, filename, response);
};

const pipe_file = async (collection, filename, dest_filename) => {
    const instance = await get_gridfs_instance();
    await instance.pipe_file(collection, filename, dest_filename);
};

const delete_file = async (collection, filename) => {
    const instance = await get_gridfs_instance();
    await instance.delete_file(collection, filename);
};

module.exports = { set_file_fields, save_file_fields_to_db, save_file, read_file, pipe_file, delete_file };

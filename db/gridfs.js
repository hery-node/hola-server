const fs = require('fs');
const { GridFSBucket, MongoClient } = require('mongodb');
const { get_settings } = require('../setting');

let gridfs_instance;

const get_gridfs_instance = async () => {
    if (gridfs_instance) {
        return gridfs_instance;
    } else {
        const mongo = get_settings().mongo;
        gridfs_instance = new GridFS();
        const client = await gridfs_instance.connect(mongo.url);
        gridfs_instance.db = client.db();
        return gridfs_instance;
    }
}

class GridFS {
    /**
     * Connect to mongodb
     * @param {url of mongo} url 
     * @returns 
     */
    connect(url) {
        return new Promise((resolve, reject) => {
            MongoClient.connect(url, { useUnifiedTopology: true, useNewUrlParser: true }, (err, client) => {
                if (err) return reject(err);
                resolve(client);
            });
        });
    }

    /**
     * 
     * @param {mongodb bucket name} bucketname 
     * @param {the file name} filename 
     * @param {the file path} filepath 
     * @returns 
     */
    async save_file(bucketname, filename, filepath) {
        const bucket = new GridFSBucket(this.db, { chunkSizeBytes: 1024 * 1024, bucketName: bucketname });
        const files = await bucket.find({ filename: filename }).toArray();
        if (files && files.length > 0) {
            await delete_file(bucket, files[0]._id);
        }
        return new Promise((resolve, reject) => {
            if (typeof filepath === 'string') {
                fs.createReadStream(filepath).pipe(bucket.openUploadStream(filename))
                    .on('error', err => reject(err))
                    .on('finish', item => resolve(item));
            } else {
                filepath.pipe(bucket.openUploadStream(filename))
                    .on('error', err => reject(err))
                    .on('finish', item => resolve(item));
            }
        });
    }

    /**
     * 
     * @param {mongodb bucket name} bucketname 
     * @param {the file name} filename 
     * @param {http response} response 
     */
    read_file(bucketname, filename, response) {
        const bucket = new GridFSBucket(this.db, { chunkSizeBytes: 1024 * 1024, bucketName: bucketname });
        const stream = bucket.openDownloadStreamByName(filename);
        stream.on('data', (chunk) => {
            response.write(chunk);
        });
        stream.on('error', () => {
            response.sendStatus(404);
        });
        stream.on('end', () => {
            response.end();
        });
    }

    /**
     * Delete the file using id
     * @param {mongodb bucket name} bucket 
     * @param {id of the file} id 
     * @returns 
     */
    delete_file(bucket, id) {
        return new Promise((resolve, reject) => {
            bucket.delete(id, (async (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            }));
        });
    }
}

/**
 * set file fields of the entity
 * @param {meta info} meta 
 * @param {http request} req 
 * @param {entity object} obj 
 */
const set_file_fields = function (meta, req, obj) {
    const file_fields = meta.file_fields;

    if (file_fields && file_fields.length > 0 && req.files) {
        const primary_key = meta.primary_keys.map(key => obj[key]).join("_");
        file_fields.forEach(function (field) {
            const files = req.files[field.name];

            if (files && files.length > 0) {
                if (file_fields.length == 1) {
                    obj[field.name] = primary_key;
                } else {
                    obj[field.name] = primary_key + "_" + field.name;
                }
            } else {
                delete obj[field.name];
            }
        });
    }
}

/**
 * 
 * @param {mongodb collection name} collection 
 * @param {file fields of the entity} file_fields 
 * @param {http request object} req 
 * @param {entity object} obj 
 */
const save_file_fields_to_db = async function (collection, file_fields, req, obj) {
    if (file_fields && file_fields.length > 0 && req.files) {
        for (let i = 0; i < file_fields.length; i++) {
            const field = file_fields[i];
            if (obj[field.name]) {
                const file = req.files[field.name][0];
                const instance = await get_gridfs_instance();
                await instance.save_file(collection, obj[field.name], file.path);
                fs.unlinkSync(file.path);
            }
        }
    }
}

/**
 * Save file to gridfs file
 * @param {collection name} collection 
 * @param {file name} filename 
 * @param {file full path} filepath 
 */
const save_file = async (collection, filename, filepath) => {
    const instance = await get_gridfs_instance();
    await instance.save_file(collection, filename, filepath);
}


/**
 * read file from gridfs
 * @param {collection name} collection 
 * @param {file name} filename 
 * @param {http response} response
 */
const read_file = async (collection, filename, response) => {
    const instance = await get_gridfs_instance();
    await instance.read_file(collection, filename, response);
}

module.exports = { set_file_fields, save_file_fields_to_db, save_file, read_file };

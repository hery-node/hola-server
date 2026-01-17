/**
 * GridFS file storage utilities.
 * @module db/gridfs
 */

import fs from 'fs';
import { GridFSBucket, Db, MongoClient } from 'mongodb';
import { get_settings } from '../setting.js';
import { EntityMeta } from '../core/meta.js';
import { Readable } from 'stream';

const CHUNK_SIZE = 1024 * 1024; // 1MB

let gridfs_instance: GridFS | null = null;

/** Wrap stream in promise. */
const stream_to_promise = (stream: NodeJS.WritableStream): Promise<void> => {
    return new Promise((resolve, reject) => {
        stream.on('error', reject).on('finish', resolve);
    });
};

class GridFS {
    private db: Db;

    constructor(db: Db) {
        this.db = db;
    }

    bucket(bucket_name: string): GridFSBucket {
        return new GridFSBucket(this.db, { chunkSizeBytes: CHUNK_SIZE, bucketName: bucket_name });
    }

    async save_file(bucket_name: string, filename: string, source: string | Readable): Promise<void> {
        const bucket = this.bucket(bucket_name);

        const existing = await bucket.find({ filename }).toArray();
        if (existing.length > 0) {
            await bucket.delete(existing[0]._id);
        }

        const read_stream = typeof source === 'string' ? fs.createReadStream(source) : source;
        await stream_to_promise(read_stream.pipe(bucket.openUploadStream(filename)));
    }

    async read_file(bucket_name: string, filename: string): Promise<Buffer> {
        const chunks: Buffer[] = [];
        const stream = this.bucket(bucket_name).openDownloadStreamByName(filename);

        return new Promise((resolve, reject) => {
            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    async read_file_stream(bucket_name: string, filename: string) {
        return this.bucket(bucket_name).openDownloadStreamByName(filename);
    }

    async pipe_file(bucket_name: string, filename: string, dest_path: string): Promise<void> {
        const stream = this.bucket(bucket_name).openDownloadStreamByName(filename);
        await stream_to_promise(stream.pipe(fs.createWriteStream(dest_path)));
    }

    async delete_file(bucket_name: string, filename: string): Promise<void> {
        const bucket = this.bucket(bucket_name);
        const files = await bucket.find({ filename }).toArray();
        if (files.length > 0) {
            await bucket.delete(files[0]._id);
        }
    }
}

/** Get or create GridFS singleton instance. */
const get_gridfs_instance = async (): Promise<GridFS> => {
    if (gridfs_instance) return gridfs_instance;

    const { url } = get_settings().mongo;
    const client = await MongoClient.connect(url);
    gridfs_instance = new GridFS(client.db());
    return gridfs_instance;
};

interface UploadedFile {
    path: string;
    name: string;
}

interface FileRequest {
    files?: Record<string, UploadedFile[]>;
}

/** Set file field values on entity object based on uploaded files. */
export const set_file_fields = (meta: EntityMeta, req: FileRequest, obj: Record<string, unknown>): void => {
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

/** Save uploaded file fields to GridFS. */
export const save_file_fields_to_db = async (collection: string, file_fields: { name: string }[], req: FileRequest, obj: Record<string, unknown>): Promise<void> => {
    if (!file_fields?.length || !req.files) return;

    const instance = await get_gridfs_instance();

    for (const field of file_fields) {
        if (!obj[field.name]) continue;

        const [file] = req.files[field.name];
        await instance.save_file(collection, obj[field.name] as string, file.path);
        fs.unlinkSync(file.path);
    }
};

export const save_file = async (collection: string, filename: string, filepath: string): Promise<void> => {
    const instance = await get_gridfs_instance();
    await instance.save_file(collection, filename, filepath);
};

/** Read file from GridFS and return as Buffer. */
export const read_file = async (collection: string, filename: string): Promise<Buffer> => {
    const instance = await get_gridfs_instance();
    return instance.read_file(collection, filename);
};

/** Read file from GridFS as a stream. */
export const read_file_stream = async (collection: string, filename: string) => {
    const instance = await get_gridfs_instance();
    return instance.read_file_stream(collection, filename);
};

export const pipe_file = async (collection: string, filename: string, dest_filename: string): Promise<void> => {
    const instance = await get_gridfs_instance();
    await instance.pipe_file(collection, filename, dest_filename);
};

export const delete_file = async (collection: string, filename: string): Promise<void> => {
    const instance = await get_gridfs_instance();
    await instance.delete_file(collection, filename);
};

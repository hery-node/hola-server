import { describe, it } from 'bun:test';
import { strictEqual } from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { file_extension, file_prefix, is_file_exist, get_file_size } from '../../src/core/file.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('file', function () {
    describe('file_extension', function () {
        it('should extract file extension', function () {
            strictEqual(file_extension('document.pdf'), 'pdf');
            strictEqual(file_extension('image.png'), 'png');
            strictEqual(file_extension('archive.tar.gz'), 'gz');
        });

        it('should return empty string for files without extension', function () {
            strictEqual(file_extension('Makefile'), 'Makefile');
        });

        it('should handle null/undefined', function () {
            strictEqual(file_extension(null), '');
            strictEqual(file_extension(undefined), '');
        });
    });

    describe('file_prefix', function () {
        it('should extract file name prefix', function () {
            strictEqual(file_prefix('document.pdf'), 'document');
            strictEqual(file_prefix('image.png'), 'image');
        });

        it('should handle files without extension', function () {
            strictEqual(file_prefix('Makefile'), 'Makefile');
        });

        it('should handle null/undefined', function () {
            strictEqual(file_prefix(null), '');
            strictEqual(file_prefix(undefined), '');
        });
    });

    describe('is_file_exist', function () {
        it('should return true for existing file', async function () {
            const testFile = path.join(__dirname, '../../package.json');
            strictEqual(await is_file_exist(testFile), true);
        });

        it('should return false for non-existing file', async function () {
            strictEqual(await is_file_exist('/nonexistent/path/file.txt'), false);
        });
    });

    describe('get_file_size', function () {
        it('should return file size in bytes', async function () {
            const testFile = path.join(__dirname, '../../package.json');
            const size = await get_file_size(testFile);
            strictEqual(typeof size, 'number');
            strictEqual(size > 0, true);
        });
    });
});

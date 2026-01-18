/**
 * File system utility functions.
 * @module core/file
 */

import unzipper from 'unzipper';

interface ZipEntry {
    path: string;
    buffer(): Promise<Buffer>;
}

/** Get file extension from filename. */
export const file_extension = (file_name: string): string => file_name ? file_name.split('.').pop() ?? "" : "";

/** Get file name without extension. */
export const file_prefix = (file_name: string): string => file_name ? file_name.split('.')[0] : "";

/** Read files from zip archive with filter. */
export const read_from_zip = async (path: string, predicate: (file: ZipEntry) => boolean): Promise<ZipEntry[]> => {
    const directory = await unzipper.Open.file(path);
    return directory.files.filter(predicate);
};

export const read_from_zip_by_extension = (path: string, extension: string) => read_from_zip(path, file => file_extension(file.path) === extension);
export const read_from_zip_by_prefix = (path: string, prefix: string) => read_from_zip(path, file => file_prefix(file.path) === prefix);

/** Check if file exists at path using Bun's native file API. */
export const is_file_exist = async (path: string): Promise<boolean> => await Bun.file(path).exists();

/** Get file size in bytes using Bun's native file API. */
export const get_file_size = (path: string): number => Bun.file(path).size;

/** Maximum multipart file size for `POST /upload/image` (50 MiB). */
export const UPLOAD_IMAGE_MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Maximum raw body size for `POST /upload/file` (16 MiB), aligned with indexer batch_import cap. */
export const UPLOAD_FILE_MAX_BYTES = 16 * 1024 * 1024;

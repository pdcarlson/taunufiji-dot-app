export interface IStorageService {
  /**
   * Generates a signed URL for uploading a file directly to S3 (Client -> S3)
   */
  getUploadUrl(key: string, contentType: string): Promise<string>;

  /**
   * Generates a signed URL for reading a file (Private Bucket -> Client)
   * @param filename Optional filename to force download behavior
   */
  getReadUrl(key: string, filename?: string): Promise<string>;

  /**
   * Uploads a file buffer directly to S3 (Server -> S3)
   */
  uploadFile(buffer: Buffer, key: string, contentType: string): Promise<any>;
}

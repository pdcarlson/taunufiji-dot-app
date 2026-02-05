/**
 * S3 Storage Service
 *
 * Provides signed URL generation and direct upload capabilities for S3.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/infrastructure/config/env";

import { IStorageService } from "@/lib/domain/ports/storage.service.port";

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
});

export class S3StorageService implements IStorageService {
  /**
   * Generates a signed URL for uploading a file directly to S3 (Client -> S3)
   */
  async getUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(s3, command, { expiresIn: 3600 });
  }

  /**
   * Generates a signed URL for reading a file (Private Bucket -> Client)
   * @param filename Optional filename to force download behavior
   */
  async getReadUrl(key: string, filename?: string) {
    const command = new GetObjectCommand({
      Bucket: env.AWS_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: filename
        ? `attachment; filename="${filename}"`
        : undefined,
    });
    // 2 Minute Expiry for security (prevents scraping/sharing)
    return await getSignedUrl(s3, command, { expiresIn: 120 });
  }

  /**
   * Uploads a file buffer directly to S3 (Server -> S3)
   */
  async uploadFile(buffer: Buffer, key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    return await s3.send(command);
  }
}

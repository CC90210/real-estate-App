import 'server-only';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  const accountId = requireEnv('R2_ACCOUNT_ID');
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
  return _client;
}

export const r2 = {
  get bucket(): string {
    return process.env.R2_BUCKET ?? 'propflow-splat-renders';
  },

  photoKey(jobId: string, photoIdx: number, ext: string): string {
    const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    return `walkthroughs/${jobId}/photos/${String(photoIdx).padStart(4, '0')}.${safeExt}`;
  },

  photoPrefix(jobId: string): string {
    return `walkthroughs/${jobId}/photos/`;
  },

  splatKey(jobId: string): string {
    return `walkthroughs/${jobId}/scene.ply`;
  },

  async signedUploadUrl(key: string, contentType: string, ttlSeconds = 3600): Promise<string> {
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(client(), cmd, { expiresIn: ttlSeconds });
  },

  async signedDownloadUrl(key: string, ttlSeconds = 3600): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(client(), cmd, { expiresIn: ttlSeconds });
  },
};

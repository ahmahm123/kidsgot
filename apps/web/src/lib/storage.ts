import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

let client: S3Client | null = null;

function getClient() {
  if (
    !env.S3_ENDPOINT ||
    !env.S3_REGION ||
    !env.S3_ACCESS_KEY_ID ||
    !env.S3_SECRET_ACCESS_KEY ||
    !env.S3_BUCKET
  ) {
    throw new Error("S3 env vars are not fully configured.");
  }

  if (!client) {
    client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY
      },
      forcePathStyle: true
    });
  }
  return client;
}

export async function createUploadUrl(key: string, contentType: string) {
  if (!env.S3_BUCKET) {
    throw new Error("Missing S3_BUCKET");
  }
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType
  });
  const url = await getSignedUrl(getClient(), command, { expiresIn: 60 * 5 });
  return {
    url,
    publicUrl: `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`
  };
}

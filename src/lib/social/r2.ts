import "server-only";

import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SOCIAL_POST_IMAGE_MIME_EXTENSIONS } from "@/lib/social/validators";

let r2Client: S3Client | null = null;

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
    throw new Error("Missing Cloudflare R2 environment variables.");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
  };
}

function getR2Client() {
  if (r2Client) return r2Client;

  const config = getR2Config();
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return r2Client;
}

export interface UploadedSocialPostImage {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadSocialPostImage(userId: string, file: File): Promise<UploadedSocialPostImage> {
  const config = getR2Config();
  const extension = SOCIAL_POST_IMAGE_MIME_EXTENSIONS[file.type];

  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  const storageKey = `social-posts/${userId}/${crypto.randomUUID()}.${extension}`;
  const body = new Uint8Array(await file.arrayBuffer());

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: storageKey,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    storageKey,
    publicUrl: `${config.publicBaseUrl}/${storageKey}`,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export async function deleteSocialPostImages(storageKeys: string[]) {
  if (storageKeys.length === 0) return;

  const config = getR2Config();

  await getR2Client().send(
    new DeleteObjectsCommand({
      Bucket: config.bucketName,
      Delete: {
        Objects: storageKeys.map((Key) => ({ Key })),
        Quiet: true,
      },
    })
  );
}

import { unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { UPLOAD_DIR } from '../middleware/upload.js';
import { env, isCloudinaryConfigured } from '../config/env.js';

export interface StoredImage {
  url: string;
  publicId: string;
}

/**
 * Persists uploaded image files and returns secure URLs.
 * Uses Cloudinary when configured, otherwise stores locally in backend/uploads/
 * and serves them from /uploads (never in the database).
 */
export async function persistImages(files: Express.Multer.File[]): Promise<StoredImage[]> {
  const results: StoredImage[] = [];
  for (const file of files) {
    if (isCloudinaryConfigured()) {
      results.push(await uploadToCloudinary(file));
    } else {
      results.push({
        url: `/uploads/${file.filename}`,
        publicId: file.filename,
      });
    }
  }
  return results;
}

async function uploadToCloudinary(file: Express.Multer.File): Promise<StoredImage> {
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'findsity',
      resource_type: 'image',
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    console.error('[uploads] cloudinary upload failed, falling back to local storage', err);
    return { url: `/uploads/${file.filename}`, publicId: file.filename };
  }
}

export function deleteStoredImage(publicIdOrUrl: string): void {
  if (!publicIdOrUrl) return;
  if (publicIdOrUrl.startsWith('/uploads/')) {
    const filename = publicIdOrUrl.replace('/uploads/', '');
    const path = join(UPLOAD_DIR, filename);
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {
      /* ignore */
    }
  }
}

export function cleanupFailedUpload(files?: Express.Multer.File[]): void {
  if (!files) return;
  for (const file of files) {
    deleteStoredImage(`/uploads/${file.filename}`);
  }
}
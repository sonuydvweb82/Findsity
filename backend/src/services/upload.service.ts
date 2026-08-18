import { unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ApiError } from '../utils/errors.js';
import { UPLOAD_DIR } from '../middleware/upload.js';
import { env, isCloudinaryConfigured } from '../config/env.js';

export interface StoredImage {
  url: string;
  publicId: string;
}

function localImage(file: Express.Multer.File): StoredImage {
  return { url: `/uploads/${file.filename}`, publicId: file.filename };
}

/**
 * Persists uploaded image files and returns permanent URLs.
 * Uses Cloudinary when configured. Local storage is a development-only
 * fallback: Render's filesystem is ephemeral, so production requires
 * Cloudinary and fails loudly instead of storing a broken /uploads URL.
 */
export async function persistImages(files: Express.Multer.File[]): Promise<StoredImage[]> {
  const results: StoredImage[] = [];
  for (const file of files) {
    if (!isCloudinaryConfigured()) {
      if (env.isProd) {
        throw new ApiError(
          500,
          'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
          'CLOUDINARY_NOT_CONFIGURED',
        );
      }
      results.push(localImage(file));
      continue;
    }
    results.push(await uploadToCloudinary(file));
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
    try {
      unlinkSync(file.path);
    } catch {
      /* temp file already gone */
    }
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    if (env.isProd) {
      console.error('[uploads] cloudinary upload failed', err);
      throw new ApiError(502, 'Image upload failed. Please try again.', 'CLOUDINARY_UPLOAD_FAILED');
    }
    console.error('[uploads] cloudinary upload failed, falling back to local storage', err);
    return localImage(file);
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
    return;
  }
  if (publicIdOrUrl.includes('res.cloudinary.com')) {
    const match = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?([^?]+)/);
    if (match) {
      const publicId = match[1].replace(/\.[a-zA-Z0-9]+$/, '');
      void destroyCloudinary(publicId);
    }
    return;
  }
  if (isCloudinaryConfigured()) {
    void destroyCloudinary(publicIdOrUrl);
  }
}

async function destroyCloudinary(publicId: string): Promise<void> {
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[uploads] cloudinary delete failed', err);
  }
}

export function cleanupFailedUpload(files?: Express.Multer.File[]): void {
  if (!files) return;
  for (const file of files) {
    try {
      if (existsSync(file.path)) unlinkSync(file.path);
    } catch {
      /* ignore */
    }
  }
}
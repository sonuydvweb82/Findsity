import type { Request, Response } from 'express';
import { persistImages, deleteStoredImage } from '../services/upload.service.js';
import { cleanupFailedUpload } from '../services/upload.service.js';

export async function uploadItemImages(req: Request, res: Response): Promise<void> {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  if (files.length === 0) {
    res.status(400).json({ error: 'No files uploaded', code: 'NO_FILES' });
    return;
  }
  try {
    const images = await persistImages(files);
    res.status(201).json({ images });
  } catch (err) {
    cleanupFailedUpload(files);
    throw err;
  }
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded', code: 'NO_FILES' });
    return;
  }
  try {
    const [image] = await persistImages([file]);
    res.status(201).json({ image });
  } catch (err) {
    cleanupFailedUpload([file]);
    throw err;
  }
}

export async function deleteImage(req: Request, res: Response): Promise<void> {
  const { publicId } = req.params;
  deleteStoredImage(publicId);
  res.json({ message: 'Image removed' });
}
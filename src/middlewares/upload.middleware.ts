import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import fs from 'fs';
import path from 'path';

// --- Uploader for Company Logos ---
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const imageFileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed.'));
  }
};

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/logos';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `logo-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});


// --- Uploader for General Files ---
const generalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/general';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const uploadGeneralFile = multer({
  storage: generalStorage,
});

// --- Uploader for Quote Generation (Image + Audio) ---
const quoteFileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  // Allow both image and audio files
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and audio are allowed.'));
  }
};

const quoteStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/quotes';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const uploadQuoteFiles = multer({
  storage: quoteStorage,
  fileFilter: quoteFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
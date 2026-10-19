const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. የ Cloudinary መረጃዎችን ከ Environment Variables ማንበብ
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. ፎቶዎች በCloudinary ውስጥ የት እንደሚቀመጡ ማዋቀር
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'food-delivery-uploads', // በCloudinary አካውንትህ ውስጥ የሚፈጠረው ፎልደር ስም
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

// 3. የፋይል ዓይነት ማረጋገጫ (File Filter)
function fileFilter(_req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
}

// 4. የ Multer ማዋቀሪያ
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // እስከ 5MB የሚደርስ ፎቶ ብቻ
});

module.exports = { upload };
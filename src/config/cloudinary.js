// backend/src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true 
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    
    // 1. CAS VIDÉOS (Correction : Plus souple)
    if (file.mimetype.startsWith('video')) {
      return {
        folder: 'kevyspace_videos',
        resource_type: 'video',
        // ON RETIRE 'allowed_formats' strict.
        // On laisse Cloudinary accepter tout ce qui ressemble à une vidéo.
        // Cela règle le souci des formats mobiles spécifiques (HEVC, etc.)
      };
    } 
    // 2. CAS IMAGES
    else if (file.mimetype.startsWith('image')) {
      return {
        folder: 'kevyspace_avatars',
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }]
      };
    }
    // 3. CAS DOCUMENTS (PDF, etc.)
    else {
      return {
        folder: 'kevyspace_docs',
        resource_type: 'raw',
        use_filename: true,
      };
    }
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
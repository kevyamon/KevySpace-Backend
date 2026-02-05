// backend/src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config(); // Assure-toi que dotenv est chargé ici aussi

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    
    // 1. CAS VIDÉOS (Cours)
    if (file.mimetype.startsWith('video')) {
      return {
        folder: 'kevyspace_videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'avi', 'mkv'],
      };
    } 
    // 2. CAS IMAGES (Avatars ou Miniatures) - NOUVEAU
    else if (file.mimetype.startsWith('image')) {
      return {
        folder: 'kevyspace_images', // Dossier séparé pour les images
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      };
    }
    // 3. CAS DOCUMENTS (PDF, Certificats)
    else {
      return {
        folder: 'kevyspace_docs',
        resource_type: 'raw', // 'raw' est impératif pour les PDF pour éviter que Cloudinary ne les corrompe
        use_filename: true,
      };
    }
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
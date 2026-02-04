const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // LOGIQUE DYNAMIQUE : Vidéo ou Document ?
    if (file.mimetype.startsWith('video')) {
      return {
        folder: 'kevyspace_videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'avi', 'mkv'],
      };
    } else {
      // Pour les PDF et Images (Certificats / Ressources)
      return {
        folder: 'kevyspace_docs',
        resource_type: 'auto', // Laisse Cloudinary détecter (raw pour pdf, image pour img)
        // Note: 'raw' est souvent mieux pour les PDF non-image
        // use_filename: true,
      };
    }
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
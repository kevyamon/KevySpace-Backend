const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    
    // 1. CAS VIDÉOS
    if (file.mimetype.startsWith('video')) {
      return {
        folder: 'kevyspace_videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'avi', 'mkv'],
      };
    } 
    // 2. CAS IMAGES (Profil) - C'est ici qu'on ajoute la magie
    else if (file.mimetype.startsWith('image')) {
      return {
        folder: 'kevyspace_avatars', // Dossier spécifique avatars
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        // 👇 LE SECRET : On demande à Cloudinary de centrer sur le visage
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }]
      };
    }
    // 3. CAS DOCUMENTS
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
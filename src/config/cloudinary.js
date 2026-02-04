const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Configuration de Cloudinary avec tes clés
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configuration du moteur de stockage (Le Pont)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kevyspace_videos', // Nom du dossier dans ton Cloudinary
    resource_type: 'video', // IMPORTANT : On précise qu'on attend des vidéos
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv'], // Formats acceptés
  },
});

// 3. Initialisation de Multer avec ce stockage
const upload = multer({ storage: storage });

// On exporte l'instance Cloudinary (pour supprimer plus tard) et le middleware upload
module.exports = {
  cloudinary,
  upload
};
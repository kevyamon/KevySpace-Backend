// src/routes/videos.js
const express = require('express');
const { 
    getVideos, 
    getVideo, 
    createVideo, 
    deleteVideo, 
    likeVideo, 
    commentVideo,
    viewVideo // <--- AJOUT
} = require('../controllers/videos');

// On importe les vigiles (Protection et Rôles)
const { protect, authorize } = require('../middleware/auth');

// On importe le middleware d'upload Cloudinary
const { upload } = require('../config/cloudinary');

const router = express.Router();

// --- RÈGLE GLOBALE ---
// Toutes les routes ci-dessous nécessitent d'être connecté
router.use(protect);

// Routes pour "/" (ex: /api/videos)
router
    .route('/')
    .get(getVideos) // Tout le monde peut voir la liste
    .post(
        authorize('admin'),       // 1. Seul l'admin passe
        upload.single('video'),   // 2. On upload le fichier nommé 'video' vers Cloudinary
        createVideo               // 3. On crée l'entrée en base de données
    );

// Routes pour "/:id" (ex: /api/videos/123)
router
    .route('/:id')
    .get(getVideo) // Voir une vidéo
    .delete(authorize('admin'), deleteVideo); // Seul l'admin peut supprimer

// Routes d'interaction
router.put('/:id/like', likeVideo); // Liker
router.post('/:id/comment', commentVideo); // Commenter
router.put('/:id/view', viewVideo); // Voir (Compteur vues)

module.exports = router;
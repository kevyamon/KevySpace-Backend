// src/routes/videos.js
const express = require('express');
const { 
    getVideos, 
    getVideo, 
    createVideo, 
    deleteVideo, 
    likeVideo, 
    commentVideo,
    deleteComment, // <--- NOUVEAU
    updateComment, // <--- NOUVEAU
    viewVideo
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
router.put('/:id/view', viewVideo); // Voir (Compteur vues)

// Routes Commentaires
router.post('/:id/comment', commentVideo); // Ajouter
router.delete('/:id/comment/:commentId', deleteComment); // Supprimer (Propriétaire ou Admin)
router.put('/:id/comment/:commentId', updateComment); // Modifier (Propriétaire)

module.exports = router;
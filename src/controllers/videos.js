const Video = require('../models/Video');
// On importe l'instance cloudinary configurée pour pouvoir supprimer des vidéos
const { cloudinary } = require('../config/cloudinary');

// @desc    Récupérer toutes les vidéos
// @route   GET /api/videos
// @access  Privé (Utilisateurs connectés)
exports.getVideos = async (req, res, next) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 }).populate('user', 'name avatar');

    res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// @desc    Récupérer une seule vidéo
// @route   GET /api/videos/:id
// @access  Privé
exports.getVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('user', 'name avatar')
      .populate('comments.user', 'name avatar');

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    res.status(200).json({
      success: true,
      data: video
    });
  } catch (err) {
    res.status(400).json({ success: false, error: 'ID Vidéo invalide' });
  }
};

// @desc    Créer une vidéo (ADMIN + UPLOAD CLOUDINARY)
// @route   POST /api/videos
// @access  Privé (Admin)
exports.createVideo = async (req, res, next) => {
  try {
    // 1. Vérification : Est-ce qu'un fichier a bien été envoyé ?
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Veuillez uploader une vidéo' });
    }

    // 2. Récupération des infos envoyées par Cloudinary (via Multer)
    // req.file.path contient l'URL sécurisée de la vidéo sur le cloud
    // req.file.filename contient l'ID unique (public_id) nécessaire pour la suppression
    const { path, filename } = req.file;

    // 3. Préparation des données pour la base de données
    const videoData = {
      ...req.body, // Titre, Description...
      videoUrl: path, // L'URL Cloudinary
      cloudinaryId: filename, // L'ID Cloudinary
      user: req.user.id // L'Admin connecté
    };

    // 4. Création en base
    const video = await Video.create(videoData);

    // --- TEMPS RÉEL (SOCKET.IO) ---
    const io = req.app.get('io');
    io.emit('video_added', video);

    res.status(201).json({
      success: true,
      data: video
    });
  } catch (err) {
    // Si ça plante, on essaie de nettoyer (supprimer la vidéo uploadée pour rien) si possible
    if (req.file && req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Supprimer une vidéo (DB + CLOUDINARY)
// @route   DELETE /api/videos/:id
// @access  Privé (Admin)
exports.deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    // 1. Suppression du fichier sur Cloudinary
    if (video.cloudinaryId) {
        await cloudinary.uploader.destroy(video.cloudinaryId, { resource_type: 'video' });
    }

    // 2. Suppression de la base de données
    await video.deleteOne();

    // --- TEMPS RÉEL ---
    const io = req.app.get('io');
    io.emit('video_deleted', req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Liker / Unliker une vidéo
// @route   PUT /api/videos/:id/like
// @access  Privé
exports.likeVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    const index = video.likes.findIndex(userId => userId.toString() === req.user.id);

    if (index === -1) {
      video.likes.push(req.user.id);
    } else {
      video.likes.splice(index, 1);
    }

    await video.save();

    const io = req.app.get('io');
    io.emit('video_updated', { id: video._id, likes: video.likes });

    res.status(200).json({
      success: true,
      data: video.likes
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Ajouter un commentaire
// @route   POST /api/videos/:id/comment
// @access  Privé
exports.commentVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    const newComment = {
      user: req.user.id,
      text: req.body.text,
      name: req.user.name,
      avatar: req.user.avatar
    };

    video.comments.unshift(newComment);

    await video.save();

    const io = req.app.get('io');
    io.emit('video_comments_updated', { id: video._id, comments: video.comments });

    res.status(201).json({
      success: true,
      data: video.comments
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
// src/controllers/videos.js
const Video = require('../models/Video');
const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');

// @desc    Récupérer toutes les vidéos
// @route   GET /api/videos
// @access  Privé
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
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Veuillez uploader une vidéo' });
    }

    const { path, filename } = req.file;

    const videoData = {
      ...req.body,
      videoUrl: path,
      cloudinaryId: filename,
      user: req.user.id
    };

    const video = await Video.create(videoData);

    // Socket.io
    const io = req.app.get('io');
    io.emit('video_added', video);

    res.status(201).json({
      success: true,
      data: video
    });
  } catch (err) {
    if (req.file && req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Supprimer une vidéo
// @route   DELETE /api/videos/:id
// @access  Privé (Admin)
exports.deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    if (video.cloudinaryId) {
        await cloudinary.uploader.destroy(video.cloudinaryId, { resource_type: 'video' });
    }

    await video.deleteOne();

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

    // Vérifier si déjà liké
    const index = video.likes.findIndex(userId => userId.toString() === req.user.id);

    if (index === -1) {
      // Pas encore liké -> On ajoute
      video.likes.push(req.user.id);
    } else {
      // Déjà liké -> On retire (Toggle)
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

    // Ajout au début du tableau
    video.comments.unshift(newComment);

    await video.save();
    
    // On repopulate pour renvoyer l'objet complet (avec avatar à jour)
    await video.populate('comments.user', 'name avatar');

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

// @desc    Supprimer un commentaire
// @route   DELETE /api/videos/:id/comment/:commentId
// @access  Privé
exports.deleteComment = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });

    // Trouver le commentaire
    const comment = video.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: 'Commentaire introuvable' });

    // Vérifier l'appartenance (Ou admin)
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Non autorisé' });
    }

    // Suppression
    comment.deleteOne();
    await video.save();
    await video.populate('comments.user', 'name avatar');

    const io = req.app.get('io');
    io.emit('video_comments_updated', { id: video._id, comments: video.comments });

    res.status(200).json({ success: true, data: video.comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Modifier un commentaire
// @route   PUT /api/videos/:id/comment/:commentId
// @access  Privé
exports.updateComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });

    const comment = video.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: 'Commentaire introuvable' });

    // Vérifier l'appartenance
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Non autorisé' });
    }

    comment.text = text;
    await video.save();
    await video.populate('comments.user', 'name avatar');

    const io = req.app.get('io');
    io.emit('video_comments_updated', { id: video._id, comments: video.comments });

    res.status(200).json({ success: true, data: video.comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Incrémenter les vues ET Ajouter à l'historique
// @route   PUT /api/videos/:id/view
// @access  Privé
exports.viewVideo = async (req, res, next) => {
  try {
    // 1. Incrémenter le compteur de la vidéo
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    // 2. Ajouter à l'historique de l'utilisateur (Gestion intelligente)
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { watchHistory: { video: req.params.id } }
    });

    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        watchHistory: {
          $each: [{ video: req.params.id, watchedAt: Date.now() }],
          $position: 0 
        }
      }
    });

    res.status(200).json({
      success: true,
      data: video
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
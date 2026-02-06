// src/controllers/videos.js
const Video = require('../models/Video');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { cloudinary } = require('../config/cloudinary');

// @desc    Récupérer toutes les vidéos
// @route   GET /api/videos
exports.getVideos = async (req, res, next) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 }).populate('user', 'name avatar');
    res.status(200).json({ success: true, count: videos.length, data: videos });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// @desc    Récupérer une seule vidéo
// @route   GET /api/videos/:id
exports.getVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('user', 'name avatar')
      .populate('comments.user', 'name avatar');

    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });

    res.status(200).json({ success: true, data: video });
  } catch (err) {
    res.status(400).json({ success: false, error: 'ID Vidéo invalide' });
  }
};

// @desc    Créer une vidéo (ADMIN)
// @route   POST /api/videos
exports.createVideo = async (req, res, next) => {
  try {
    // 1. Vérification du fichier
    if (!req.file) return res.status(400).json({ success: false, error: 'Veuillez uploader un fichier vidéo' });

    // 2. Vérification des champs obligatoires
    if (!req.body.title || !req.body.description) {
        // Nettoyage Cloudinary si erreur de validation
        if (req.file.filename) {
            await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' });
        }
        return res.status(400).json({ success: false, error: 'Titre et description sont requis.' });
    }

    const { path, filename } = req.file;
    
    // 3. Création sécurisée
    const videoData = { 
        ...req.body, 
        videoUrl: path, 
        cloudinaryId: filename, 
        user: req.user.id 
    };

    const video = await Video.create(videoData);

    // 4. SOCKET : Diffusion temps réel
    const io = req.app.get('io');
    io.emit('video_added', video);

    // 5. NOTIFICATION GLOBALE : Tous les utilisateurs sont notifiés
    const allUsers = await User.find({ _id: { $ne: req.user.id } }); // Tous sauf l'admin
    
    const notificationPromises = allUsers.map(user => 
      Notification.create({
        user: user._id,
        title: "Nouveau cours disponible ! 🎓",
        message: `"${video.title}" vient d'être publié. Découvrez-le maintenant !`,
        type: 'success',
        link: `/watch/${video._id}`,
        metadata: {
          videoId: video._id
        }
      })
    );

    await Promise.all(notificationPromises);

    // Diffusion Socket pour chaque utilisateur
    if (io) {
      allUsers.forEach(user => {
        io.emit('new_notification', {
          notification: {
            user: user._id,
            title: "Nouveau cours disponible ! 🎓",
            message: `"${video.title}" vient d'être publié. Découvrez-le maintenant !`,
            type: 'success',
            link: `/watch/${video._id}`,
            createdAt: new Date()
          },
          targetUserId: user._id.toString()
        });
      });
    }

    res.status(201).json({ success: true, data: video });
  } catch (err) {
    // Nettoyage Cloudinary en cas de crash Mongo ou Timeout
    if (req.file && req.file.filename) {
        cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' }).catch(e => console.log(e));
    }
    console.error("❌ Erreur Upload Vidéo:", err);
    res.status(500).json({ success: false, error: "Erreur lors de la publication (Vérifiez les logs serveur)" });
  }
};

// @desc    Supprimer une vidéo
// @route   DELETE /api/videos/:id
exports.deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });

    if (video.cloudinaryId) await cloudinary.uploader.destroy(video.cloudinaryId, { resource_type: 'video' });

    await video.deleteOne();

    // SOCKET : Diffusion temps réel
    const io = req.app.get('io');
    io.emit('video_deleted', req.params.id);

    // NOTIFICATION GLOBALE : Tous les utilisateurs sont notifiés
    const allUsers = await User.find({ _id: { $ne: req.user.id } });
    
    const notificationPromises = allUsers.map(user => 
      Notification.create({
        user: user._id,
        title: "Cours retiré 📚",
        message: `Le cours "${video.title}" n'est plus disponible.`,
        type: 'warning',
        link: '/home'
      })
    );

    await Promise.all(notificationPromises);

    // Diffusion Socket
    if (io) {
      allUsers.forEach(user => {
        io.emit('new_notification', {
          notification: {
            user: user._id,
            title: "Cours retiré 📚",
            message: `Le cours "${video.title}" n'est plus disponible.`,
            type: 'warning',
            link: '/home',
            createdAt: new Date()
          },
          targetUserId: user._id.toString()
        });
      });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Liker / Unliker
// @route   PUT /api/videos/:id/like
exports.likeVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });

    const index = video.likes.findIndex(userId => userId.toString() === req.user.id);
    if (index === -1) video.likes.push(req.user.id);
    else video.likes.splice(index, 1);

    await video.save();

    // SOCKET : Diffusion des Likes
    const io = req.app.get('io');
    io.emit('video_updated', { id: video._id, likes: video.likes });

    res.status(200).json({ success: true, data: video.likes });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Ajouter commentaire
// @route   POST /api/videos/:id/comment
exports.commentVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });

    const newComment = {
      user: req.user.id,
      text: req.body.text,
      name: req.user.name,
      avatar: req.user.avatar,
      createdAt: new Date()
    };

    video.comments.unshift(newComment);
    await video.save();
    await video.populate('comments.user', 'name avatar');

    const io = req.app.get('io');
    io.emit('video_comments_updated', { id: video._id, comments: video.comments });

    res.status(201).json({ success: true, data: video.comments });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Supprimer commentaire
// @route   DELETE /api/videos/:id/comment/:commentId
exports.deleteComment = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });

    const comment = video.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: 'Commentaire introuvable' });

    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Non autorisé' });
    }

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

// @desc    Modifier commentaire
// @route   PUT /api/videos/:id/comment/:commentId
exports.updateComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });

    const comment = video.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: 'Commentaire introuvable' });

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

// @desc    Incrémenter les vues
// @route   PUT /api/videos/:id/view
exports.viewVideo = async (req, res, next) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) return res.status(404).json({ success: false, error: 'Vidéo introuvable' });

    // Gestion historique
    await User.findByIdAndUpdate(req.user.id, { $pull: { watchHistory: { video: req.params.id } } });
    await User.findByIdAndUpdate(req.user.id, { $push: { watchHistory: { $each: [{ video: req.params.id, watchedAt: Date.now() }], $position: 0 } } });

    const io = req.app.get('io');
    io.emit('video_viewed', { id: video._id, views: video.views }); 

    res.status(200).json({ success: true, data: video });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
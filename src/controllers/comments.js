// src/controllers/comments.js
const Comment = require('../models/Comment');
const Video = require('../models/Video');
const ErrorResponse = require('../utils/errorResponse'); // Si tu as un gestionnaire d'erreur, sinon on fera simple

// @desc    Obtenir les commentaires d'une vidéo
// @route   GET /api/videos/:videoId/comments
exports.getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ video: req.params.videoId })
      .populate({
        path: 'user',
        select: 'name profilePicture' // On récupère juste ce qu'il faut pour l'affichage
      })
      .sort({ createdAt: -1 }); // Le plus récent en haut

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// @desc    Ajouter un commentaire
// @route   POST /api/videos/:videoId/comments
exports.addComment = async (req, res, next) => {
  try {
    req.body.video = req.params.videoId;
    req.body.user = req.user.id; // L'auteur est celui qui est connecté

    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo non trouvée' });
    }

    const comment = await Comment.create(req.body);

    // Mettre à jour la vidéo pour ajouter l'ID du commentaire (pour le compteur)
    video.comments.push(comment._id);
    await video.save();

    // On repopule l'utilisateur pour l'envoyer au frontend tout de suite
    const populatedComment = await Comment.findById(comment._id).populate('user', 'name profilePicture');

    res.status(201).json({
      success: true,
      data: populatedComment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// @desc    Modifier un commentaire
// @route   PUT /api/comments/:id
exports.updateComment = async (req, res, next) => {
  try {
    let comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Commentaire non trouvé' });
    }

    // Vérifier si l'utilisateur est bien l'auteur (ou admin)
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Non autorisé à modifier ce commentaire' });
    }

    comment = await Comment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user', 'name profilePicture');

    res.status(200).json({
      success: true,
      data: comment
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// @desc    Supprimer un commentaire
// @route   DELETE /api/comments/:id
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Commentaire non trouvé' });
    }

    // Vérifier propriétaire
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Non autorisé à supprimer ce commentaire' });
    }

    // On retire le commentaire de la liste de la vidéo
    await Video.findByIdAndUpdate(comment.video, {
      $pull: { comments: comment._id }
    });

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
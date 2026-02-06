// src/controllers/comments.js
const Comment = require('../models/Comment');
const Video = require('../models/Video');
const Notification = require('../models/Notification'); 

// @desc    Obtenir les commentaires d'une vidéo
// @route   GET /api/videos/:videoId/comments
exports.getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ video: req.params.videoId })
      .populate({
        path: 'user',
        select: 'name profilePicture' 
      })
      .populate({ // On récupère aussi les infos si c'est une réponse
         path: 'parentComment',
         select: 'user',
         populate: { path: 'user', select: 'name' }
      })
      .sort({ createdAt: -1 }); 

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (err) {
    console.error("Erreur Get Comments:", err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// @desc    Ajouter un commentaire (ou une réponse)
// @route   POST /api/videos/:videoId/comments
exports.addComment = async (req, res, next) => {
  try {
    // 1. Préparation des données
    const { text, parentComment } = req.body;
    
    // Payload pour la création
    const commentData = {
        text,
        video: req.params.videoId,
        user: req.user.id
    };
    
    // Si c'est une réponse, on ajoute l'ID du parent
    if (parentComment) {
        commentData.parentComment = parentComment;
    }

    // 2. Vérification vidéo
    const video = await Video.findById(req.params.videoId).populate('user'); // On a besoin du user de la vidéo (Admin)
    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo non trouvée' });
    }

    // 3. Création du commentaire
    const comment = await Comment.create(commentData);

    // 4. Mise à jour de la vidéo (CORRECTIF BUG: On push l'ID, pas l'objet)
    video.comments.push(comment._id);
    await video.save();

    // 5. Populer le nouveau commentaire pour le renvoyer
    const populatedComment = await Comment.findById(comment._id)
        .populate('user', 'name profilePicture')
        .populate('parentComment');

    // --- 6. INTELLIGENCE NOTIFICATION ---
    
    let notifyUserId = null;
    let notifTitle = "";
    let notifMessage = "";

    if (parentComment) {
        // CAS 1 : C'est une réponse -> On notifie l'auteur du commentaire parent
        const parent = await Comment.findById(parentComment);
        if (parent && parent.user.toString() !== req.user.id) {
            notifyUserId = parent.user;
            notifTitle = "Nouvelle réponse ↩️";
            notifMessage = `${req.user.name} a répondu à votre commentaire`;
        }
    } else {
        // CAS 2 : Commentaire racine -> On notifie l'Admin (Propriétaire vidéo)
        if (video.user._id.toString() !== req.user.id) {
            notifyUserId = video.user._id;
            notifTitle = "Nouveau commentaire 💬";
            notifMessage = `${req.user.name} a commenté votre vidéo "${video.title}"`;
        }
    }

    // Envoi de la notification si nécessaire
    if (notifyUserId) {
        const notification = await Notification.create({
            user: notifyUserId,
            title: notifTitle,
            message: notifMessage,
            type: 'info',
            link: `/watch/${video._id}`, 
            metadata: {
                videoId: video._id,
                commentId: comment._id
            }
        });

        // SOCKET IO
        const io = req.app.get('io');
        if (io) {
            io.emit('new_notification', {
                notification,
                targetUserId: notifyUserId.toString()
            });
        }
    }
    // -------------------------------------

    res.status(201).json({
      success: true,
      data: populatedComment
    });
  } catch (err) {
    console.error("Erreur Add Comment:", err);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de l\'ajout' });
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

    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Non autorisé' });
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

    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Non autorisé' });
    }

    // Retirer de la liste vidéo
    await Video.findByIdAndUpdate(comment.video, {
      $pull: { comments: comment._id }
    });

    // Si c'est un parent, on pourrait vouloir supprimer les réponses (Cascade)
    // Pour l'instant on supprime juste le commentaire lui-même
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
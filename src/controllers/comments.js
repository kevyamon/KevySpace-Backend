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
      .populate({
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
    const { text, parentComment } = req.body;
    
    const commentData = {
        text,
        video: req.params.videoId,
        user: req.user.id
    };
    
    if (parentComment) {
        commentData.parentComment = parentComment;
    }

    const video = await Video.findById(req.params.videoId).populate('user');
    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo non trouvée' });
    }

    const comment = await Comment.create(commentData);

    video.comments.push(comment._id);
    await video.save();

    const populatedComment = await Comment.findById(comment._id)
        .populate('user', 'name profilePicture')
        .populate('parentComment');

    // --- SOCKET IO : ÉMISSION TEMPS RÉEL (AJOUT) ---
    const io = req.app.get('io');
    if (io) {
      io.emit('comment_action', {
        type: 'add',
        data: populatedComment,
        videoId: req.params.videoId,
        userId: req.user.id
      });
    }

    // --- INTELLIGENCE NOTIFICATION ---
    let notifyUserId = null;
    let notifTitle = "";
    let notifMessage = "";

    if (parentComment) {
        const parent = await Comment.findById(parentComment);
        if (parent && parent.user.toString() !== req.user.id) {
            notifyUserId = parent.user;
            notifTitle = "Nouvelle réponse ↩️";
            notifMessage = `${req.user.name} a répondu à votre commentaire`;
        }
    } else {
        if (video.user._id.toString() !== req.user.id) {
            notifyUserId = video.user._id;
            notifTitle = "Nouveau commentaire 💬";
            notifMessage = `${req.user.name} a commenté votre vidéo "${video.title}"`;
        }
    }

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

        if (io) {
            io.emit('new_notification', {
                notification,
                targetUserId: notifyUserId.toString()
            });
        }
    }

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

    // On garde le videoId avant la mise à jour
    const videoId = comment.video.toString();

    comment = await Comment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user', 'name profilePicture');

    // --- SOCKET IO : ÉMISSION TEMPS RÉEL (MODIFICATION) ---
    const io = req.app.get('io');
    if (io) {
      io.emit('comment_action', {
        type: 'update',
        data: comment,
        videoId: videoId,
        userId: req.user.id
      });
    }

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

    // On garde les IDs avant suppression
    const videoId = comment.video.toString();
    const commentId = comment._id.toString();

    await Video.findByIdAndUpdate(comment.video, {
      $pull: { comments: comment._id }
    });

    await comment.deleteOne();

    // --- SOCKET IO : ÉMISSION TEMPS RÉEL (SUPPRESSION) ---
    const io = req.app.get('io');
    if (io) {
      io.emit('comment_action', {
        type: 'delete',
        id: commentId,
        videoId: videoId,
        userId: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
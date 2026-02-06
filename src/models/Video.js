// src/models/Video.js
const mongoose = require('mongoose');

// On supprime l'ancien Schema "CommentSchema" qui était embedded ici.
// Les commentaires sont désormais gérés par leur propre modèle (src/models/Comment.js)

const VideoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Veuillez ajouter un titre'],
    trim: true,
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    maxlength: [5000, 'La description ne peut pas dépasser 5000 caractères']
  },
  videoUrl: {
    type: String,
    required: [true, 'Veuillez ajouter une vidéo']
  },
  thumbnailUrl: {
    type: String,
    default: 'no-photo.jpg'
  },
  cloudinaryId: String,
  views: {
    type: Number,
    default: 0
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  // MODIFICATION ICI : On stocke uniquement les IDs des commentaires
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', VideoSchema);
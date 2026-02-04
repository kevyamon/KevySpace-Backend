// src/models/Video.js
const mongoose = require('mongoose');

// Schéma des commentaires (Sous-document)
const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: String,   // On garde le nom en cache pour l'affichage rapide
  avatar: String, // On garde l'avatar en cache
  text: {
    type: String,
    required: [true, 'Veuillez ajouter un commentaire']
  }
}, { timestamps: true }); // <--- MAGIE ICI : Crée createdAt et updatedAt automatiquement pour chaque commentaire

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
  comments: [CommentSchema], // On utilise le schéma défini plus haut
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', VideoSchema);
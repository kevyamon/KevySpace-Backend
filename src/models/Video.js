const mongoose = require('mongoose');

// --- SOUS-SCHEMA : COMMENTAIRES ---
// On crée un petit schéma pour les commentaires qui seront imbriqués dans la vidéo
const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Le commentaire ne peut pas être vide'],
    trim: true
  },
  name: {
    type: String // On garde le nom pour l'afficher vite sans refaire une requête
  },
  avatar: {
    type: String // Idem pour l'avatar
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// --- SCHEMA PRINCIPAL : VIDÉO ---
const VideoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Veuillez ajouter un titre à la vidéo'],
    trim: true,
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    required: [true, 'Veuillez ajouter une description'],
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  // L'URL de lecture sécurisée venant de Cloudinary
  videoUrl: {
    type: String,
    required: [true, 'URL de la vidéo manquante']
  },
  // L'ID unique Cloudinary (Indispensable pour pouvoir SUPPRIMER la vidéo du cloud plus tard)
  cloudinaryId: {
    type: String,
    required: true
  },
  // Une miniature (Générée auto par Cloudinary ou uploadée)
  thumbnailUrl: {
    type: String
  },
  // Compteur de vues
  views: {
    type: Number,
    default: 0
  },
  // Les Likes : On stocke les IDs des utilisateurs qui ont liké
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  // Les Commentaires (Tableau du schéma défini plus haut)
  comments: [CommentSchema],
  
  // L'auteur (Toi, l'Admin)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', VideoSchema);
// src/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error'],
    default: 'info'
  },
  // AJOUT : Lien de redirection (ex: /watch/VIDEO_ID)
  link: {
    type: String,
    default: null
  },
  // AJOUT : Métadonnées pour le frontend si besoin
  metadata: {
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
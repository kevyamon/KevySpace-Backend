// src/routes/comments.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
  getComments,
  addComment,
  updateComment,
  deleteComment
} = require('../controllers/comments');

// --- ROUTES LIÉES À UNE VIDÉO ---
// /api/videos/:videoId/comments
router.get('/videos/:videoId/comments', protect, getComments);
router.post('/videos/:videoId/comments', protect, addComment);

// --- ROUTES DIRECTES (CRUD) ---
// /api/comments/:id
router.put('/comments/:id', protect, updateComment);
router.delete('/comments/:id', protect, deleteComment);

module.exports = router;
// src/routes/auth.js
const express = require('express');
const { 
  register, 
  login, 
  logout, 
  getAllUsers, 
  deleteUser,
  toggleBlockUser,
  getHistory,
  updateDetails // <--- NOUVEL IMPORT
} = require('../controllers/auth');

const { protect, authorize } = require('../middleware/auth'); 

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);

// Route Historique
router.get('/history', protect, getHistory);

// Route Mise à jour Profil (NOUVEAU)
router.put('/updatedetails', protect, updateDetails);

// Routes Admin
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/block', protect, authorize('admin'), toggleBlockUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
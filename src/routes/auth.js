// src/routes/auth.js
const express = require('express');
const { 
  register, 
  login, 
  logout, 
  getAllUsers, // <--- On importe les nouvelles fonctions
  deleteUser   // <--- On importe les nouvelles fonctions
} = require('../controllers/auth');

const { protect, authorize } = require('../middleware/auth'); 

const router = express.Router();

// Routes Publiques
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);

// --- ROUTES ADMIN (ZONE INTERDITE AUX USERS) ---
// 1. Voir la liste des utilisateurs
router.get('/users', protect, authorize('admin'), getAllUsers);

// 2. Bannir/Supprimer un utilisateur
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
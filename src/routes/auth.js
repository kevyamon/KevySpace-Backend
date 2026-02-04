const express = require('express');
const { 
  register, 
  login, 
  logout, 
  getAllUsers, 
  deleteUser,
  toggleBlockUser,
  getHistory,
  updateDetails // <--- 1. IMPORT AJOUTÉ
} = require('../controllers/auth');

const { protect, authorize } = require('../middleware/auth'); 

const router = express.Router();

// Routes Publiques
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);

// --- ROUTES UTILISATEUR CONNECTÉ ---
// Historique
router.get('/history', protect, getHistory);

// Mise à jour profil (CELLE QUI MANQUAIT POUR L'ERREUR 404)
router.put('/updatedetails', protect, updateDetails);

// --- ROUTES ADMIN (ZONE INTERDITE AUX USERS) ---
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/block', protect, authorize('admin'), toggleBlockUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
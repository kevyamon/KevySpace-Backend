const express = require('express');
const { 
  register, 
  login, 
  logout, 
  getAllUsers, 
  deleteUser,
  toggleBlockUser // <--- IMPORT
} = require('../controllers/auth');

const { protect, authorize } = require('../middleware/auth'); 

const router = express.Router();

// Routes Publiques
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);

// --- ROUTES ADMIN (ZONE INTERDITE AUX USERS) ---
// 1. Voir la liste
router.get('/users', protect, authorize('admin'), getAllUsers);

// 2. Bloquer/Débloquer (Nouveau)
router.put('/users/:id/block', protect, authorize('admin'), toggleBlockUser);

// 3. Bannir définitivement
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
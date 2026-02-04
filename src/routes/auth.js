// src/routes/auth.js
const express = require('express');
const { register, login, logout, getAllUsers, deleteUser } = require('../controllers/auth');
const { protect, authorize } = require('../middleware/auth'); // On s'assure que c'est sécurisé

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);

// ROUTES ADMIN (Protégées + Rôle Admin requis)
router.get('/users', protect, authorize('admin'), getAllUsers);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
const express = require('express');
const { 
  register, 
  login, 
  logout, 
  getAllUsers, 
  deleteUser,
  toggleBlockUser,
  getHistory,
  updateDetails,
  updatePassword // <--- IMPORT AJOUTÉ
} = require('../controllers/auth');

const { protect, authorize } = require('../middleware/auth'); 

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);

// --- ROUTES USER ---
router.get('/history', protect, getHistory);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword); // <--- ROUTE AJOUTÉE

// --- ROUTES ADMIN ---
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/block', protect, authorize('admin'), toggleBlockUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
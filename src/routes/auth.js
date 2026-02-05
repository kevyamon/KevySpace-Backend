const express = require('express');
const multer = require('multer'); // <--- 1. IMPORT MULTER
const upload = multer({ dest: 'uploads/' }); // <--- 2. CONFIG SIMPLE

const { 
  register, 
  login, 
  logout, 
  getAllUsers, 
  deleteUser,
  toggleBlockUser,
  getHistory,
  updateDetails,
  updatePassword,
  updateProfilePicture // <--- 3. IMPORT FONCTION
} = require('../controllers/auth');

const { protect, authorize } = require('../middleware/auth'); 

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);

// --- ROUTES USER ---
router.get('/history', protect, getHistory);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

// NOUVELLE ROUTE PHOTO DE PROFIL
// On utilise 'image' car c'est le nom du champ dans le FormData du frontend (formData.append('image', file))
router.put('/profile-picture', protect, upload.single('image'), updateProfilePicture);

// --- ROUTES ADMIN ---
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/block', protect, authorize('admin'), toggleBlockUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
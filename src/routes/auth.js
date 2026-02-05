const express = require('express');
// ON RETIRE l'ancien multer local
// const multer = require('multer'); 
// const upload = multer({ dest: 'uploads/' });

// 👇 ON IMPORTE NOTRE CONFIG BLINDÉE
const { upload } = require('../config/cloudinary');

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
  updateProfilePicture
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

// ✅ Route Photo : On utilise le middleware 'upload' de Cloudinary directement
router.put('/profile-picture', protect, upload.single('image'), updateProfilePicture);

// --- ROUTES ADMIN ---
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/block', protect, authorize('admin'), toggleBlockUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
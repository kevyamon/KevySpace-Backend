const express = require('express');
const { 
  createResource, getResources, 
  awardCertificate, getMyCertificates 
} = require('../controllers/assets');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

const router = express.Router();

router.use(protect);

// --- RESSOURCES ---
router.route('/resources')
  .get(getResources)
  .post(authorize('admin'), upload.single('file'), createResource);

// --- CERTIFICATS ---
router.route('/certificates')
  .get(getMyCertificates)
  .post(authorize('admin'), upload.single('file'), awardCertificate);

module.exports = router;
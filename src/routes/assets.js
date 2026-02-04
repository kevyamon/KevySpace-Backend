// src/routes/assets.js
const express = require('express');
const { 
  createResource, getResources, deleteResource,
  awardCertificate, getMyCertificates, getAllCertificates, deleteCertificate 
} = require('../controllers/assets');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

const router = express.Router();

router.use(protect);

// --- RESSOURCES ---
router.route('/resources')
  .get(getResources)
  .post(authorize('admin'), upload.single('file'), createResource);

router.route('/resources/:id')
  .delete(authorize('admin'), deleteResource); // <--- AJOUT DELETE

// --- CERTIFICATS ---
router.route('/certificates')
  .get(getMyCertificates)
  .post(authorize('admin'), upload.single('file'), awardCertificate);

router.route('/certificates/all') // <--- AJOUT LISTE ADMIN
  .get(authorize('admin'), getAllCertificates);

router.route('/certificates/:id')
  .delete(authorize('admin'), deleteCertificate); // <--- AJOUT DELETE

module.exports = router;
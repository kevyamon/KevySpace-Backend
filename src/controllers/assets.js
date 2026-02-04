const Resource = require('../models/Resource');
const Certificate = require('../models/Certificate');
const { cloudinary } = require('../config/cloudinary');

// --- RESSOURCES (PUBLIQUES POUR LES USER) ---

// @desc    Ajouter une ressource (Admin)
// @route   POST /api/resources
exports.createResource = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "Aucun fichier" });

    // Calcul basique de la taille (bytes -> MB/KB)
    const sizeBytes = req.file.size || 0; 
    const size = sizeBytes > 1000000 
      ? (sizeBytes / 1000000).toFixed(1) + ' MB' 
      : (sizeBytes / 1000).toFixed(0) + ' KB';

    const type = req.file.mimetype.split('/')[1].toUpperCase();

    const resource = await Resource.create({
      title: req.body.title,
      fileUrl: req.file.path,
      cloudinaryId: req.file.filename,
      type: type === 'PDF' ? 'PDF' : 'IMG', // Simplification
      size
    });

    res.status(201).json({ success: true, data: resource });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Voir les ressources
// @route   GET /api/resources
exports.getResources = async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: resources });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// --- CERTIFICATS (PRIVÉS) ---

// @desc    Décernet un certificat (Admin)
// @route   POST /api/certificates
exports.awardCertificate = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "Aucun fichier" });
    
    // On attend user_id dans le body
    const certificate = await Certificate.create({
      user: req.body.user_id, 
      title: req.body.title,
      fileUrl: req.file.path,
      cloudinaryId: req.file.filename
    });

    res.status(201).json({ success: true, data: certificate });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Voir MES certificats
// @route   GET /api/certificates
exports.getMyCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find({ user: req.user.id }).sort({ awardedAt: -1 });
    res.status(200).json({ success: true, data: certs });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};
// src/controllers/assets.js
const Resource = require('../models/Resource');
const Certificate = require('../models/Certificate');
const { cloudinary } = require('../config/cloudinary');

// --- RESSOURCES (PUBLIQUES) ---

// @desc    Ajouter une ressource
// @route   POST /api/resources
exports.createResource = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "Aucun fichier" });

    const sizeBytes = req.file.size || 0; 
    const size = sizeBytes > 1000000 
      ? (sizeBytes / 1000000).toFixed(1) + ' MB' 
      : (sizeBytes / 1000).toFixed(0) + ' KB';

    const type = req.file.mimetype.split('/')[1].toUpperCase();

    const resource = await Resource.create({
      title: req.body.title,
      fileUrl: req.file.path,
      cloudinaryId: req.file.filename,
      type: type.includes('PDF') ? 'PDF' : 'IMG',
      size
    });

    // ⚡ TEMPS RÉEL : On prévient tout le monde
    const io = req.app.get('io');
    io.emit('resource_action', { type: 'add', data: resource });

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

// @desc    Supprimer une ressource
// @route   DELETE /api/resources/:id
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, error: "Non trouvé" });

    // Suppression Cloudinary
    await cloudinary.uploader.destroy(resource.cloudinaryId, { resource_type: 'raw' }); // 'raw' pour les fichiers génériques
    // Note: Si c'est une image, parfois il faut resource_type: 'image'. Cloudinary est capricieux.
    // Pour assurer le coup, on tente les deux si besoin ou on gère les erreurs silencieusement.
    
    await resource.deleteOne();

    // ⚡ TEMPS RÉEL
    const io = req.app.get('io');
    io.emit('resource_action', { type: 'delete', id: req.params.id });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Erreur suppression" });
  }
};

// --- CERTIFICATS (PRIVÉS) ---

// @desc    Décernet un certificat
// @route   POST /api/certificates
exports.awardCertificate = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "Aucun fichier" });
    
    const certificate = await Certificate.create({
      user: req.body.user_id, 
      title: req.body.title,
      fileUrl: req.file.path,
      cloudinaryId: req.file.filename
    });

    // ⚡ TEMPS RÉEL : On envoie l'info (le front filtrera si ça le concerne)
    const io = req.app.get('io');
    io.emit('certificate_action', { type: 'add', data: certificate });

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

// @desc    Voir TOUS les certificats (Admin)
// @route   GET /api/certificates/all
exports.getAllCertificates = async (req, res) => {
  try {
    // Populate pour avoir le nom de l'élève
    const certs = await Certificate.find().populate('user', 'name email').sort({ awardedAt: -1 });
    res.status(200).json({ success: true, data: certs });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Supprimer un certificat
// @route   DELETE /api/certificates/:id
exports.deleteCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, error: "Non trouvé" });

    await cloudinary.uploader.destroy(cert.cloudinaryId);
    await cert.deleteOne();

    // ⚡ TEMPS RÉEL
    const io = req.app.get('io');
    io.emit('certificate_action', { type: 'delete', id: req.params.id, userId: cert.user });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur suppression" });
  }
};
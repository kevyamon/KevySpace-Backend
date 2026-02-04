// src/controllers/assets.js
const Resource = require('../models/Resource');
const Certificate = require('../models/Certificate');
const { cloudinary } = require('../config/cloudinary');

// --- RESSOURCES (PUBLIQUES) ---

// @desc    Ajouter une ressource
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

    // ⚡ SOCKET (Public)
    const io = req.app.get('io');
    if (io) io.emit('resource_action', { type: 'add', data: resource });

    res.status(201).json({ success: true, data: resource });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Voir les ressources
exports.getResources = async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: resources });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Supprimer une ressource
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, error: "Non trouvé" });

    await cloudinary.uploader.destroy(resource.cloudinaryId, { resource_type: 'raw' });
    await resource.deleteOne();

    // ⚡ SOCKET
    const io = req.app.get('io');
    if (io) io.emit('resource_action', { type: 'delete', id: req.params.id });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Erreur suppression" });
  }
};

// --- CERTIFICATS (PRIVÉS) ---

// @desc    Décernet un certificat
exports.awardCertificate = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "Aucun fichier" });
    
    // CORRECTION ICI : On accepte 'user_id' OU 'user' pour être sûr de choper l'ID
    const userId = req.body.user_id || req.body.user;

    if (!userId) {
        return res.status(400).json({ success: false, error: "Utilisateur (user_id) manquant" });
    }

    const certificate = await Certificate.create({
      user: userId, 
      title: req.body.title,
      fileUrl: req.file.path,
      cloudinaryId: req.file.filename
    });

    // ⚡ SOCKET : IMPORTANT
    const io = req.app.get('io');
    if (io) {
      io.emit('certificate_action', { 
        type: 'add', 
        data: certificate, 
        targetUserId: userId.toString() // On force en String pour la comparaison frontend
      });
    }

    res.status(201).json({ success: true, data: certificate });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Voir MES certificats
exports.getMyCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find({ user: req.user.id }).sort({ awardedAt: -1 });
    res.status(200).json({ success: true, data: certs });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Voir TOUS les certificats (Admin)
exports.getAllCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find().populate('user', 'name email').sort({ awardedAt: -1 });
    res.status(200).json({ success: true, data: certs });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Supprimer un certificat
exports.deleteCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, error: "Non trouvé" });

    // On garde l'ID et on le convertit en String TOUT DE SUITE
    const targetUserId = cert.user.toString();

    await cloudinary.uploader.destroy(cert.cloudinaryId);
    await cert.deleteOne();

    // ⚡ SOCKET
    const io = req.app.get('io');
    if (io) {
      io.emit('certificate_action', { 
        type: 'delete', 
        id: req.params.id, 
        targetUserId: targetUserId // String garantie
      });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Erreur suppression" });
  }
};
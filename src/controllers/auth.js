const User = require('../models/User');
const Notification = require('../models/Notification'); // <--- 1. IMPORT DU MODÈLE NOTIFICATION

// --- UTILITAIRE : Envoyer le Token ---
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        profilePicture: user.profilePicture || user.avatar
      }
    });
};

// @desc    Inscrire un nouvel utilisateur
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const role = email === process.env.ADMIN_MAIL ? 'admin' : 'user';

    // 1. Création de l'utilisateur
    const user = await User.create({ name, email, password, phone, role });

    // 2. CRÉATION DE LA NOTIFICATION DE BIENVENUE (C'est ça qui active la cloche)
    await Notification.create({
      user: user._id,
      title: "Bienvenue sur KevySpace ! 🚀",
      message: `Ravi de vous compter parmi nous, ${name}. Votre parcours commence maintenant. N'hésitez pas à compléter votre profil.`,
      type: 'success',
      isRead: false // Important pour le point rouge
    });

    // 3. Envoi du token
    sendTokenResponse(user, 201, res);
  } catch (err) {
    let message = err.message;
    if (err.code === 11000) {
      if (err.keyPattern.email) message = "Cet email est déjà utilisé.";
      else if (err.keyPattern.phone) message = "Ce numéro de téléphone est déjà utilisé.";
    }
    res.status(400).json({ success: false, error: message });
  }
};

// @desc    Connecter un utilisateur
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Veuillez fournir email et mot de passe' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, error: 'Identifiants invalides' });

    if (user.isBlocked) return res.status(403).json({ success: false, error: "Compte suspendu par l'administrateur." });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Identifiants invalides' });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Déconnexion
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
  res.status(200).json({ success: true, data: {} });
};

// --- FONCTIONS UTILISATEUR CONNECTÉ ---

// @desc    Historique
exports.getHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'watchHistory.video',
      select: 'title description thumbnailUrl views createdAt user likes comments',
      populate: { path: 'user', select: 'name avatar profilePicture' }
    });
    const validHistory = user.watchHistory.filter(item => item.video !== null);
    res.status(200).json({ success: true, count: validHistory.length, data: validHistory });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Mise à jour infos (Nom, Email, Tel)
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone
    };
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    let message = err.message;
    if (err.code === 11000) message = "Email ou téléphone déjà utilisé.";
    res.status(400).json({ success: false, error: message });
  }
};

// @desc    Mise à jour Mot de Passe
// @route   PUT /api/auth/updatepassword
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, error: "Le mot de passe actuel est incorrect" });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Mise à jour Photo de Profil
// @route   PUT /api/auth/profile-picture
exports.updateProfilePicture = async (req, res, next) => {
  try {
    // Si le middleware n'a pas renvoyé de fichier, c'est qu'il y a eu un souci ou pas d'envoi
    if (!req.file) {
      return res.status(400).json({ message: "Aucune image fournie." });
    }

    // 🚀 LA CORRECTION EST ICI :
    // On ne fait plus "cloudinary.uploader.upload" manuellement.
    // Le middleware l'a déjà fait, et l'URL est disponible dans req.file.path
    const imageUrl = req.file.path; 

    // Mise à jour DB
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        profilePicture: imageUrl,
        avatar: imageUrl 
      },
      { new: true }
    ).select('-password');

    res.status(200).json({ 
      success: true, 
      message: "Photo de profil mise à jour !", 
      user: updatedUser 
    });

  } catch (error) {
    console.error("Erreur Backend Upload:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de l'enregistrement." });
  }
};

// --- FONCTIONS ADMIN ---

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: "Impossible de supprimer" });
  }
};

exports.toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};
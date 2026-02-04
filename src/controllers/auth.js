// src/controllers/auth.js
const User = require('../models/User');

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
        avatar: user.avatar
      }
    });
};

// @desc    Inscrire un nouvel utilisateur
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Admin automatique si c'est ton email
    const role = email === process.env.ADMIN_MAIL ? 'admin' : 'user';

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    let message = err.message;

    // GESTION INTELLIGENTE DES DOUBLONS (Code MongoDB 11000)
    // C'est TA partie importante qu'on garde précieusement
    if (err.code === 11000) {
      if (err.keyPattern.email) {
        message = "Cet email est déjà utilisé.";
      } else if (err.keyPattern.phone) {
        message = "Ce numéro de téléphone est déjà utilisé par un autre compte.";
      }
    }

    res.status(400).json({
      success: false,
      error: message
    });
  }
};

// @desc    Connecter un utilisateur
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Veuillez fournir un email et un mot de passe' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Déconnexion
// @route   GET /api/auth/logout
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), 
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
};

// ==========================================
// 👇 NOUVELLES FONCTIONS ADMIN (AJOUTÉES) 👇
// ==========================================

// @desc    Voir tous les utilisateurs (ADMIN SEULEMENT)
// @route   GET /api/auth/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find(); // Récupère tout le monde
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de la récupération des utilisateurs"
    });
  }
};

// @desc    Supprimer un utilisateur (ADMIN SEULEMENT)
// @route   DELETE /api/auth/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Impossible de supprimer l'utilisateur"
    });
  }
};
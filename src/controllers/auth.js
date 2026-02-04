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
    if (err.code === 11000) {
      if (err.keyPattern.email) {
        message = "Cet email est déjà utilisé.";
      } else if (err.keyPattern.phone) {
        message = "Ce numéro de téléphone est déjà utilisé par un autre compte.";
      }
    }
    res.status(400).json({ success: false, error: message });
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

    // --- SÉCURITÉ BLOCAGE ---
    if (user.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        error: "Votre compte est temporairement suspendu. Contactez l'administrateur." 
      });
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
  res.status(200).json({ success: true, data: {} });
};

// ==========================================
// 👇 FONCTIONS ADMIN (GOD MODE) 👇
// ==========================================

// @desc    Voir tous les utilisateurs
// @route   GET /api/auth/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// @desc    Supprimer un utilisateur
// @route   DELETE /api/auth/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: "Impossible de supprimer" });
  }
};

// @desc    Bloquer/Débloquer un utilisateur
// @route   PUT /api/auth/users/:id/block
exports.toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }
    // On inverse l'état
    user.isBlocked = !user.isBlocked;
    await user.save();
    
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// ==========================================
// 👇 NOUVELLE FONCTION HISTORIQUE 👇
// ==========================================

// @desc    Obtenir l'historique de visionnage
// @route   GET /api/auth/history
// @access  Privé
exports.getHistory = async (req, res, next) => {
  try {
    // On récupère l'user connecté et on "populate" son historique
    const user = await User.findById(req.user.id).populate({
      path: 'watchHistory.video',
      // On sélectionne les champs importants de la vidéo à afficher
      select: 'title description thumbnailUrl views createdAt user likes comments', 
      // On peut même populer l'auteur de la vidéo si besoin
      populate: { path: 'user', select: 'name avatar' } 
    });

    // Nettoyage : Si une vidéo a été supprimée de la DB, elle apparaîtra comme null dans l'historique
    // On filtre pour ne garder que les entrées valides
    const validHistory = user.watchHistory.filter(item => item.video !== null);

    res.status(200).json({
      success: true,
      count: validHistory.length,
      data: validHistory
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erreur lors de la récupération de l'historique" });
  }
};
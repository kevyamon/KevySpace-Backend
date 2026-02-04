const User = require('../models/User');

// --- UTILITAIRE : Envoyer le Token dans un Cookie (DRY) ---
const sendTokenResponse = (user, statusCode, res) => {
  // Créer le token
  const token = user.getSignedJwtToken();

  // Options du cookie
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    httpOnly: true, // Sécurité : Empêche le JS côté client d'accéder au cookie (Anti-XSS)
    secure: process.env.NODE_ENV === 'production' // Secure (HTTPS) uniquement en prod (Render)
  };

  res
    .status(statusCode)
    .cookie('token', token, options) // On injecte le cookie dans la réponse
    .json({
      success: true,
      token, // On renvoie aussi le token au cas où, mais le cookie est prioritaire
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
};

// @desc    Inscrire un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // --- LOGIQUE ADMIN AUTOMATIQUE ---
    // Si l'email correspond à celui dans le .env, on le met ADMIN direct.
    // Sinon, c'est un 'user' classique.
    const role = email === process.env.ADMIN_MAIL ? 'admin' : 'user';

    // Création de l'utilisateur
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    // Envoi de la réponse avec Token
    sendTokenResponse(user, 201, res);
  } catch (err) {
    // Gestion des erreurs (ex: Email déjà pris)
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Connecter un utilisateur
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Veuillez fournir un email et un mot de passe' });
    }

    // Vérifier l'email (on inclut le mot de passe qui est caché par défaut)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    // Vérifier le mot de passe
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Déconnecter l'utilisateur / Effacer le cookie
// @route   GET /api/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // Expire dans 10 secondes
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
};
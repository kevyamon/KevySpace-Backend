// src/controllers/auth.js
const User = require('../models/User');

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
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
        phone: user.phone, // On renvoie aussi le numéro
        role: user.role,
        avatar: user.avatar
      }
    });
};

// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    // ON AJOUTE 'phone' ICI 👇
    const { name, email, password, phone } = req.body;

    const role = email === process.env.ADMIN_MAIL ? 'admin' : 'user';

    const user = await User.create({
      name,
      email,
      password,
      phone, // ET LÀ 👇
      role
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

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
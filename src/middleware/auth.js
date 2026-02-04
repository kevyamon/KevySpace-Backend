const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- LE VIGILE (Vérifie si tu es connecté) ---
exports.protect = async (req, res, next) => {
  let token;

  // 1. On cherche le token à deux endroits :
  // Option A : Dans le Header 'Authorization' (Bearer token...)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Option B : Dans les Cookies (C'est notre méthode préférée et sécurisée)
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Si pas de token, dehors !
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Accès non autorisé. Veuillez vous connecter.' 
    });
  }

  try {
    // 3. On vérifie la validité du token (Signature)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. On cherche l'utilisateur dans la base de données
    // (On s'assure qu'il existe toujours et n'a pas été supprimé entre temps)
    req.user = await User.findById(decoded.id);

    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Utilisateur introuvable.' 
          });
    }

    // 5. Tout est bon, on laisse passer
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token invalide ou expiré.' 
    });
  }
};

// --- LE VIP (Vérifie ton rôle : Admin ou User) ---
// Cette fonction accepte une liste de rôles (ex: 'admin')
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // req.user est disponible car 'protect' a tourné juste avant
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Le rôle ${req.user.role} n'est pas autorisé à accéder à cette route.` 
      });
    }
    next();
  };
};
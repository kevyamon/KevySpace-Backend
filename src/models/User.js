const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Veuillez ajouter un nom'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, 'Veuillez ajouter un email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez ajouter un email valide'
    ]
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Veuillez ajouter un mot de passe'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Sécurité : Ne jamais renvoyer le mot de passe lors d'une requête GET
  },
  avatar: {
    type: String,
    default: 'no-photo.jpg' // On gérera l'avatar par défaut côté Frontend ou via Cloudinary plus tard
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Champs pour la récupération de mot de passe (futur)
  resetPasswordToken: String,
  resetPasswordExpire: Date
});

// --- MIDDLEWARE MONGOOSE ---

// 1. Crypter le mot de passe avec Bcrypt avant de sauvegarder
UserSchema.pre('save', async function(next) {
  // Si le mot de passe n'a pas été modifié, on passe (pour éviter de le re-crypter)
  if (!this.isModified('password')) {
    next();
  }

  // Génération du "Salt" (grain de sel) niveau 10
  const salt = await bcrypt.genSalt(10);
  // Hachage du mot de passe
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// --- MÉTHODES PERSONNALISÉES ---

// 2. Signer le JWT (Créer le token d'identité)
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: '30d' // Le token expire dans 30 jours
  });
};

// 3. Vérifier le mot de passe (Lors du Login)
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
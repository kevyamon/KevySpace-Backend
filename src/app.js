const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

// Import des fichiers de routes
const auth = require('./routes/auth');

const app = express();

// --- SÉCURITÉ (FORTERESSE) ---

// 1. Headers HTTP sécurisés
app.use(helmet());

// 2. Gestion des Cookies
app.use(cookieParser());

// 3. CORS (Autoriser le Frontend à nous parler)
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true // Important pour les cookies/sessions
}));

// 4. Limiter la taille des données reçues (Anti-Crash)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Nettoyage des données (Anti-Injection NoSQL & XSS)
app.use(mongoSanitize()); // Empêche les attaques type { "$gt": "" } dans MongoDB
app.use(xss()); // Nettoie le code HTML malveillant
app.use(hpp()); // Prévient la pollution des paramètres HTTP

// --- MONTAGE DES ROUTES ---
// Chaque fois que quelqu'un tape /api/auth/..., ça ira dans le fichier auth.js
app.use('/api/auth', auth);

// --- ROUTE DE TEST ---
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Bienvenue sur l\'API de KevySpace 🚀', 
        status: 'Online' 
    });
});

// --- GESTION DES ERREURS 404 (CORRECTION DÉFINITIVE) ---
app.use((req, res, next) => {
    res.status(404).json({ 
        status: 'fail', 
        message: `La route ${req.originalUrl} n'existe pas sur ce serveur.` 
    });
});

module.exports = app;
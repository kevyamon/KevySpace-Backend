const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

// Import des fichiers de routes
const auth = require('./routes/auth');
const videos = require('./routes/videos');

const app = express();

// --- SÉCURITÉ (FORTERESSE) ---

// 1. Headers HTTP sécurisés
app.use(helmet());

// 2. Gestion des Cookies
app.use(cookieParser());

// 3. CORS (Autoriser le Frontend à nous parler)
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
}));

// 4. Limiter la taille des données reçues
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Nettoyage des données (ULTIMATE SANITIZER : NoSQL + XSS)
// Cette fonction remplace mongoSanitize ET xss-clean qui plantent sur Render.
app.use((req, res, next) => {
    const sanitize = (obj) => {
        if (!obj) return;
        for (const key in obj) {
            // A. Protection NoSQL (Anti-Injection $)
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key]; 
                continue;
            } 
            
            // B. Protection XSS (Anti-Script HTML)
            if (typeof obj[key] === 'string') {
                // On remplace les chevrons < et > pour empêcher les scripts de s'exécuter
                obj[key] = obj[key]
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
            } 
            // C. Récursivité (On descend dans les sous-objets)
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
            }
        }
    };

    // On nettoie tout ce qui rentre
    sanitize(req.body);
    sanitize(req.query);
    sanitize(req.params);

    next();
});

// 6. Autres sécurités
app.use(hpp()); // Prévient la pollution des paramètres HTTP

// --- MONTAGE DES ROUTES ---
app.use('/api/auth', auth);
app.use('/api/videos', videos);

// --- ROUTE DE TEST ---
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Bienvenue sur l\'API de KevySpace 🚀', 
        status: 'Online' 
    });
});

// --- GESTION DES ERREURS 404 ---
app.use((req, res, next) => {
    res.status(404).json({ 
        status: 'fail', 
        message: `La route ${req.originalUrl} n'existe pas sur ce serveur.` 
    });
});

module.exports = app;
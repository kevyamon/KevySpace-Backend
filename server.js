require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// 1. Normalisation du port
const normalizePort = val => {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
};
const port = normalizePort(process.env.PORT || '5000');

// 2. Création du serveur HTTP natif (nécessaire pour Socket.io)
const server = http.createServer(app);

// 3. Initialisation de Socket.io (Temps réel)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // On autorisera le frontend ici
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// On stocke io dans l'application pour pouvoir l'utiliser dans les contrôleurs
app.set('io', io);

// 4. Gestion des événements Socket.io (Mise sur écoute)
io.on('connection', (socket) => {
  // console.log('✅ Un utilisateur est connecté au Socket (ID:', socket.id, ')');

  socket.on('disconnect', () => {
    // console.log('❌ Utilisateur déconnecté (ID:', socket.id, ')');
  });
});

// 5. Connexion à la Base de Données et Lancement du serveur
const startServer = async () => {
  try {
    // Connexion Standard pour la Production (Render)
    await mongoose.connect(process.env.MONGO_URI); 
    console.log('✅ Connecté à MongoDB Atlas');

    server.listen(port, () => {
      console.log(`🚀 Serveur KevySpace démarré sur le port ${port}`);
    });
  } catch (error) {
    console.log("⚠️ Mode Développement 'Aveugle' ou Erreur DB détectée.");
    console.log("❌ Erreur détail:", error.message);
    // On ne coupe PAS le processus ici pour te permettre de continuer à coder sans crash
    // process.exit(1); 
  }
};

startServer();
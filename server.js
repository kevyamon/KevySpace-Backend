// backend/server.js
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

// 2. Création du serveur HTTP natif
const server = http.createServer(app);

// 3. Initialisation de Socket.io (Temps réel)
const io = new Server(server, {
  cors: {
    // MODIFICATION ICI : On passe un tableau (comme dans app.js)
    origin: [
        "http://localhost:5173",          // Ton Frontend Local
        "http://localhost:3000",          // Au cas où
        process.env.FRONTEND_URL          // Ton site en Prod (Render)
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// On stocke io dans l'application
app.set('io', io);

// 4. Gestion des événements Socket.io
io.on('connection', (socket) => {
  // console.log('✅ Socket connecté:', socket.id);
  socket.on('disconnect', () => {
    // console.log('❌ Socket déconnecté:', socket.id);
  });
});

// 5. Connexion DB et Lancement
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); 
    console.log('✅ Connecté à MongoDB Atlas');

    server.listen(port, () => {
      console.log(`🚀 Serveur KevySpace démarré sur le port ${port}`);
    });
  } catch (error) {
    console.log("❌ Erreur DB:", error.message);
  }
};

startServer();
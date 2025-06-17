const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

// ✅ OPTIONS CORS — compatible dev + prod
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://qvslv-site.onrender.com',
      'https://qvslv-site-front.vercel.app',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

    // Autoriser les requêtes sans origine (ex: curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par la politique CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 🧩 Middleware CORS
app.use(cors(corsOptions));

// ⚠️ OPTIONS pour toutes les routes (important pour les requêtes prévols)
app.options('*', cors(corsOptions));

// 📦 Middleware pour lire les corps de requêtes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🌐 Connexion MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch(err => {
    console.error('❌ Erreur MongoDB :', err);
    process.exit(1);
  });

// 🔐 Routes d'auth
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 🔍 Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 🚫 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// 🚀 Lancer serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});

// 🧼 Fermeture propre
const closeApp = (signal) => {
  console.log(`🔄 Arrêt du serveur (${signal})...`);
  mongoose.connection.close(() => {
    console.log('📴 Connexion MongoDB fermée');
    process.exit(0);
  });
};

process.on('SIGTERM', () => closeApp('SIGTERM'));
process.on('SIGINT', () => closeApp('CTRL+C'));

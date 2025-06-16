const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

// Configuration CORS
app.use(cors({
    origin: [
        'https://qvslv-site.onrender.com',
        'https://qvslv-site-front.vercel.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connexion à MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connecté à MongoDB'))
    .catch(err => {
        console.error('❌ Erreur MongoDB :', err);
        process.exit(1);
    });

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Test de santé
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Route 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Lancement du serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});

// Arrêt propre
process.on('SIGTERM', () => {
    console.log('🔄 Arrêt du serveur...');
    mongoose.connection.close(() => {
        console.log('📴 Connexion MongoDB fermée');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔄 Arrêt du serveur (CTRL+C)...');
    mongoose.connection.close(() => {
        console.log('📴 Connexion MongoDB fermée');
        process.exit(0);
    });
});

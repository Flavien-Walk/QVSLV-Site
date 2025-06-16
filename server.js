const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

// Middleware de logging
const logRequest = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${ip}`);
    console.log(`User-Agent: ${userAgent}`);
    
    next();
};

// Configuration CORS pour Render
app.use(cors({
    origin: [
        'https://qvslv-site.onrender.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(logRequest);

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Connexion MongoDB avec logs détaillés
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connecté à MongoDB');
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    })
    .catch((err) => {
        console.error('❌ Erreur MongoDB :', err);
        process.exit(1);
    });

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Route de test
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Route pour servir les pages HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Erreur serveur:`, err);
    
    res.status(500).json({
        error: 'Erreur serveur interne',
        timestamp
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`❌ Route non trouvée: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Route non trouvée' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur QVSLV lancé sur le port ${PORT}`);
    console.log(`📡 URL: ${process.env.NODE_ENV === 'production' ? 'https://qvslv-site.onrender.com' : `http://localhost:${PORT}`}`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('🔄 Arrêt gracieux du serveur...');
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
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Middleware de logging pour l'auth
const logAuthActivity = (action, req, details = {}) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`[${timestamp}] AUTH - ${action}`);
    console.log(`IP: ${ip}`);
    console.log(`Details:`, details);
    console.log('---');
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            username,
            email,
            password,
            specialization,
            motivation = ''
        } = req.body;

        logAuthActivity('REGISTRATION_ATTEMPT', req, { 
            username, 
            email, 
            specialization 
        });

        // Validation des champs
        if (!firstName || !lastName || !username || !email || !password || !specialization) {
            logAuthActivity('REGISTRATION_FAILED', req, { 
                reason: 'Champs manquants' 
            });
            return res.status(400).json({
                error: 'Tous les champs obligatoires doivent être remplis.'
            });
        }

        // Vérifier si email ou nom de code déjà utilisé
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            logAuthActivity('REGISTRATION_FAILED', req, { 
                reason: 'Email ou username déjà utilisé',
                conflictField: existingUser.email === email ? 'email' : 'username'
            });
            return res.status(400).json({
                error: 'Email ou nom de code déjà utilisé.'
            });
        }

        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(password, 12);

        // Création et sauvegarde du nouvel utilisateur
        const newUser = new User({
            firstName,
            lastName,
            username,
            email,
            password: hashedPassword,
            specialization,
            motivation
        });

        await newUser.save();

        logAuthActivity('REGISTRATION_SUCCESS', req, { 
            userId: newUser._id,
            username: newUser.username 
        });

        return res.status(201).json({
            message: 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.',
            user: {
                id: newUser._id,
                username: newUser.username,
                role: newUser.role
            }
        });

    } catch (err) {
        logAuthActivity('REGISTRATION_ERROR', req, { 
            error: err.message 
        });
        console.error('❌ Erreur lors de l\'inscription :', err);
        return res.status(500).json({
            error: 'Erreur serveur. Veuillez réessayer plus tard.'
        });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        logAuthActivity('LOGIN_ATTEMPT', req, { username });

        // Validation des champs
        if (!username || !password) {
            logAuthActivity('LOGIN_FAILED', req, { 
                reason: 'Champs manquants' 
            });
            return res.status(400).json({
                error: 'Nom d\'agent et code d\'accès requis.'
            });
        }

        // Chercher l'utilisateur
        const user = await User.findOne({ username });
        if (!user) {
            logAuthActivity('LOGIN_FAILED', req, { 
                reason: 'Utilisateur non trouvé',
                username 
            });
            return res.status(401).json({
                error: 'Identifiants invalides.'
            });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logAuthActivity('LOGIN_FAILED', req, { 
                reason: 'Mot de passe incorrect',
                userId: user._id 
            });
            return res.status(401).json({
                error: 'Identifiants invalides.'
            });
        }

        // Vérifier si le compte est actif
        if (!user.isActive) {
            logAuthActivity('LOGIN_FAILED', req, { 
                reason: 'Compte désactivé',
                userId: user._id 
            });
            return res.status(403).json({
                error: 'Compte désactivé. Contactez un administrateur.'
            });
        }

        // Générer le token JWT
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username,
                role: user.role 
            },
            process.env.JWT_SECRET || 'qvslv_secret_key_change_in_production',
            { expiresIn: '24h' }
        );

        // Mettre à jour la dernière connexion
        user.lastLogin = new Date();
        await user.save();

        logAuthActivity('LOGIN_SUCCESS', req, { 
            userId: user._id,
            username: user.username,
            role: user.role 
        });

        return res.status(200).json({
            message: 'Connexion réussie !',
            token,
            user: {
                id: user._id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                specialization: user.specialization
            }
        });

    } catch (err) {
        logAuthActivity('LOGIN_ERROR', req, { 
            error: err.message 
        });
        console.error('❌ Erreur lors de la connexion :', err);
        return res.status(500).json({
            error: 'Erreur serveur. Veuillez réessayer plus tard.'
        });
    }
});

// GET /api/auth/verify - Vérifier le token
router.get('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token manquant' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qvslv_secret_key_change_in_production');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Token invalide' });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                specialization: user.specialization
            }
        });

    } catch (err) {
        console.error('❌ Erreur vérification token :', err);
        return res.status(401).json({ error: 'Token invalide' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    logAuthActivity('LOGOUT', req);
    return res.status(200).json({ message: 'Déconnexion réussie' });
});

module.exports = router;
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

        // Validation de l'email
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            logAuthActivity('REGISTRATION_FAILED', req, { 
                reason: 'Email invalide' 
            });
            return res.status(400).json({
                error: 'Format d\'email invalide.'
            });
        }

        // Validation du mot de passe
        if (password.length < 6) {
            logAuthActivity('REGISTRATION_FAILED', req, { 
                reason: 'Mot de passe trop court' 
            });
            return res.status(400).json({
                error: 'Le mot de passe doit contenir au moins 6 caractères.'
            });
        }

        // Validation de la spécialisation
        const validSpecializations = ['archives', 'ancient', 'social', 'tech', 'consciousness', 'symbols', 'crypto', 'research'];
        if (!validSpecializations.includes(specialization)) {
            logAuthActivity('REGISTRATION_FAILED', req, { 
                reason: 'Spécialisation invalide' 
            });
            return res.status(400).json({
                error: 'Domaine de spécialisation invalide.'
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
            
            const conflictMessage = existingUser.email === email 
                ? 'Cette adresse email est déjà utilisée.' 
                : 'Ce nom de code est déjà pris.';
                
            return res.status(400).json({
                error: conflictMessage
            });
        }

        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(password, 12);

        // Création et sauvegarde du nouvel utilisateur
        const newUser = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            specialization,
            motivation: motivation.trim(),
            role: 'VÉRIFIÉ' // Niveau de base après inscription
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
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role,
                specialization: newUser.specialization
            }
        });

    } catch (err) {
        logAuthActivity('REGISTRATION_ERROR', req, { 
            error: err.message 
        });
        console.error('❌ Erreur lors de l\'inscription :', err);
        
        // Gestion des erreurs MongoDB spécifiques
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            const message = field === 'email' ? 'Cette adresse email est déjà utilisée.' : 'Ce nom de code est déjà pris.';
            return res.status(400).json({ error: message });
        }
        
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

        // Chercher l'utilisateur (insensible à la casse pour le username)
        const user = await User.findOne({ 
            username: { $regex: new RegExp('^' + username + '$', 'i') }
        });
        
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

        // Mettre à jour la dernière connexion et incrémenter le compteur
        user.lastLogin = new Date();
        user.loginCount += 1;
        await user.save();

        logAuthActivity('LOGIN_SUCCESS', req, { 
            userId: user._id,
            username: user.username,
            role: user.role,
            loginCount: user.loginCount
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
                specialization: user.specialization,
                lastLogin: user.lastLogin,
                loginCount: user.loginCount
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
            return res.status(401).json({ error: 'Token invalide ou compte désactivé' });
        }

        // Vérifier si le token n'est pas trop ancien (optionnel)
        const tokenAge = Date.now() - (decoded.iat * 1000);
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures
        
        if (tokenAge > maxAge) {
            return res.status(401).json({ error: 'Token expiré' });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                specialization: user.specialization,
                lastLogin: user.lastLogin
            }
        });

    } catch (err) {
        console.error('❌ Erreur vérification token :', err);
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token invalide' });
        } else if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expiré' });
        }
        
        return res.status(401).json({ error: 'Erreur de validation du token' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    logAuthActivity('LOGOUT', req, { 
        hasToken: !!token 
    });
    
    // Dans une implémentation complète, vous pourriez blacklister le token
    // ou le stocker dans Redis avec une expiration
    
    return res.status(200).json({ 
        message: 'Déconnexion réussie',
        timestamp: new Date().toISOString()
    });
});

// GET /api/auth/profile - Obtenir le profil utilisateur (protégé)
router.get('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token manquant' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qvslv_secret_key_change_in_production');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                specialization: user.specialization,
                motivation: user.motivation,
                lastLogin: user.lastLogin,
                loginCount: user.loginCount,
                createdAt: user.createdAt
            }
        });

    } catch (err) {
        console.error('❌ Erreur récupération profil :', err);
        return res.status(401).json({ error: 'Token invalide' });
    }
});

module.exports = router;
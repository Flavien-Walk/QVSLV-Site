const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, username, email, password, specialization, motivation = '' } = req.body;

        if (!firstName || !lastName || !username || !email || !password || !specialization) {
            return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
        }

        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Format d\'email invalide.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
        }

        const validSpecializations = ['archives', 'ancient', 'social', 'tech', 'consciousness', 'symbols', 'crypto', 'research'];
        if (!validSpecializations.includes(specialization)) {
            return res.status(400).json({ error: 'Domaine de spécialisation invalide.' });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({ $or: [{ email: cleanEmail }, { username: cleanUsername }] });
        if (existingUser) {
            const conflictMessage = existingUser.email === cleanEmail ? 'Cette adresse email est déjà utilisée.' : 'Ce nom de code est déjà pris.';
            return res.status(400).json({ error: conflictMessage });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: cleanUsername,
            email: cleanEmail,
            password: hashedPassword,
            specialization,
            motivation: motivation.trim(),
            role: 'VÉRIFIÉ'
        });

        await newUser.save();

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
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            const message = field === 'email' ? 'Cette adresse email est déjà utilisée.' : 'Ce nom de code est déjà pris.';
            return res.status(400).json({ error: message });
        }
        return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer plus tard.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Nom d\'agent et code d\'accès requis.' });
        }

        const cleanUsername = username.trim();
        const user = await User.findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') } });
        if (!user) {
            return res.status(401).json({ error: 'Identifiants invalides.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Compte désactivé. Contactez un administrateur.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Identifiants invalides.' });
        }

        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                role: user.role,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.JWT_SECRET || 'qvslv_secret_key_change_in_production',
            { expiresIn: '7d' }
        );

        user.lastLogin = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();

        return res.status(200).json({
            message: 'Connexion réussie !',
            token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
        return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer plus tard.' });
    }
});

module.exports = router;
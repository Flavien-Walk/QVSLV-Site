const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

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

        // Vérifier si email ou nom de code déjà utilisé
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'Email ou nom de code déjà utilisé.'
            });
        }

        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

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

        return res.status(201).json({
            message: 'Utilisateur enregistré avec succès.'
        });

    } catch (err) {
        console.error('❌ Erreur lors de l’inscription :', err);
        return res.status(500).json({
            error: 'Erreur serveur. Veuillez réessayer plus tard.'
        });
    }
});

module.exports = router;

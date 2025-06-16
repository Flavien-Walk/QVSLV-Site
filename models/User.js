const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 50
    },
    lastName: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 50
    },
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    specialization: { 
        type: String, 
        required: true,
        enum: [
            'archives',
            'ancient', 
            'social',
            'tech',
            'consciousness',
            'symbols',
            'crypto',
            'research'
        ]
    },
    motivation: { 
        type: String, 
        default: '',
        maxlength: 500
    },
    role: { 
        type: String, 
        default: 'ANONYME',
        enum: ['ANONYME', 'VÉRIFIÉ', 'CHERCHEUR', 'EXPERT', 'GARDIEN', 'ADMIN']
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginCount: {
        type: Number,
        default: 0
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware pour mettre à jour updatedAt
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Méthode pour incrémenter le compteur de connexions
userSchema.methods.incrementLoginCount = function() {
    this.loginCount += 1;
    this.lastLogin = new Date();
    return this.save();
};

// Index pour optimiser les recherches
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
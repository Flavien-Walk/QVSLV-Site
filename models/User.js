const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    username:  { type: String, required: true, unique: true },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    specialization: { type: String, required: true },
    motivation:     { type: String, default: '' },
    role:           { type: String, default: 'ANONYME' },
    isActive:       { type: Boolean, default: true },
    createdAt:      { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);

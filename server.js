const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

app.use(cors());
app.use(express.json());

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connecté à MongoDB'))
    .catch((err) => console.error('❌ Erreur MongoDB :', err));

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Serveur QVSLV lancé sur http://localhost:${PORT}`);
});

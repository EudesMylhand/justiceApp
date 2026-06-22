require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const { testConnection } = require('../config/database');
const { errorHandler } = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const territoireRoutes = require('./routes/territoireRoutes');
const commissariatRoutes = require('./routes/commissariatRoutes');
const brigadeRoutes = require('./routes/brigadeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const plainteRoutes = require('./routes/plainteRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares globaux ---
app.use(helmet({
    contentSecurityPolicy: false, // désactivé ici pour simplifier le développement du frontend statique ; à affiner en production
}));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Récupération de l'IP réelle même derrière un proxy/reverse-proxy
app.set('trust proxy', true);

// --- Fichiers statiques (frontend vanilla HTML/CSS/JS) ---
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Routes API ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/territoire', territoireRoutes);
app.use('/api/commissariats', commissariatRoutes);
app.use('/api/brigades', brigadeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/plaintes', plainteRoutes);

// --- Healthcheck ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Fallback : redirige vers la page de connexion pour les routes frontend inconnues ---
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '..', 'public', 'connexion.html'));
});

// --- Gestion centralisée des erreurs (doit être en dernier) ---
app.use(errorHandler);

async function startServer() {
    const dbOk = await testConnection();
    if (!dbOk) {
        console.warn('⚠️  Le serveur démarre malgré l\'échec de connexion à la base de données.');
        console.warn('   Vérifiez votre fichier .env puis lancez "npm run migrate".');
    }

    app.listen(PORT, () => {
        console.log(`\n🚀 Plateforme Justice & Sécurité — serveur démarré sur le port ${PORT}`);
        console.log(`   Local : http://localhost:${PORT}`);
        console.log(`   API health check : http://localhost:${PORT}/api/health\n`);
    });
}

startServer();

module.exports = app;

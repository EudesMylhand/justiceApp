require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const { testConnection } = require('../config/database');
const { errorHandler } = require('./middlewares/errorHandler');

/**
 * Normalise un import de routeur Express.
 *
 * Cause racine du crash "Router.use() requires a middleware function but got a Object" :
 * un fichier de routes exporte un OBJET (`module.exports = { router }`) au lieu du
 * routeur lui-même (`module.exports = router`). Express attend une fonction.
 *
 * Ce helper accepte les trois formes courantes et renvoie toujours une fonction
 * middleware valide, sinon il échoue avec un message explicite indiquant le coupable.
 */
function resolveRouter(mod, name) {
    // module.exports = router  (forme attendue)
    if (typeof mod === 'function') return mod;
    // module.exports = { router }
    if (mod && typeof mod.router === 'function') return mod.router;
    // export default (code transpilé ESM -> CommonJS)
    if (mod && typeof mod.default === 'function') return mod.default;

    throw new TypeError(
        `[routes] "${name}" doit exporter un routeur Express (une fonction), ` +
        `mais a exporté: ${mod === null ? 'null' : typeof mod}. ` +
        `Corrigez le fichier avec "module.exports = router;".`
    );
}

const authRoutes = resolveRouter(require('./routes/authRoutes'), 'authRoutes');
const userRoutes = resolveRouter(require('./routes/userRoutes'), 'userRoutes');
const territoireRoutes = resolveRouter(require('./routes/territoireRoutes'), 'territoireRoutes');
const commissariatRoutes = resolveRouter(require('./routes/commissariatRoutes'), 'commissariatRoutes');
const brigadeRoutes = resolveRouter(require('./routes/brigadeRoutes'), 'brigadeRoutes');
const dashboardRoutes = resolveRouter(require('./routes/dashboardRoutes'), 'dashboardRoutes');
const plainteRoutes = resolveRouter(require('./routes/plainteRoutes'), 'plainteRoutes');

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
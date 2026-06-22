const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const INACTIVITY_TIMEOUT = parseInt(process.env.SESSION_INACTIVITY_TIMEOUT_MINUTES, 10) || 15;

/**
 * Vérifie la présence et la validité du token JWT (envoyé via header Authorization: Bearer <token>).
 * Vérifie également l'inactivité de session si un session-id est fourni (header X-Session-Id).
 */
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'AUTHENTIFICATION_REQUISE', message: 'Token d\'authentification manquant.' });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'TOKEN_EXPIRE', message: 'Votre session a expiré, veuillez vous reconnecter.' });
        }
        return res.status(401).json({ error: 'TOKEN_INVALIDE', message: 'Token invalide.' });
    }

    // Vérification de l'inactivité si une session est associée
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(401).json({ error: 'SESSION_INVALIDE', message: 'Session introuvable ou révoquée.' });
        }
        const expiredByInactivity = await Session.isExpiredByInactivity(sessionId, INACTIVITY_TIMEOUT);
        if (expiredByInactivity) {
            await Session.revoke(sessionId);
            return res.status(401).json({
                error: 'SESSION_INACTIVE',
                message: `Déconnexion automatique après ${INACTIVITY_TIMEOUT} minutes d'inactivité.`,
            });
        }
        await Session.touchActivity(sessionId);
        req.sessionId = sessionId;
    }

    req.user = {
        id: payload.sub,
        matricule: payload.matricule,
        role: payload.role,
        permissions: payload.permissions || [],
    };

    next();
}

module.exports = { requireAuth };

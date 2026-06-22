/**
 * Middleware factory : vérifie que l'utilisateur authentifié possède
 * AU MOINS UNE des permissions listées.
 *
 * Usage : router.get('/commissariats', requireAuth, requirePermission('COMMISSARIAT_VIEW_ALL', 'COMMISSARIAT_VIEW_OWN'), handler)
 */
function requirePermission(...permissionsRequired) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'AUTHENTIFICATION_REQUISE', message: 'Utilisateur non authentifié.' });
        }

        const userPermissions = req.user.permissions || [];
        const hasPermission = permissionsRequired.some((p) => userPermissions.includes(p));

        if (!hasPermission) {
            return res.status(403).json({
                error: 'ACCES_REFUSE',
                message: 'Vous n\'avez pas les droits nécessaires pour effectuer cette action.',
            });
        }

        next();
    };
}

/**
 * Vérifie que l'utilisateur a un rôle précis (utile pour des routes réservées, ex: SUPER_ADMIN).
 */
function requireRole(...rolesAllowed) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'AUTHENTIFICATION_REQUISE', message: 'Utilisateur non authentifié.' });
        }
        if (!rolesAllowed.includes(req.user.role)) {
            return res.status(403).json({
                error: 'ACCES_REFUSE',
                message: 'Ce rôle n\'est pas autorisé à accéder à cette ressource.',
            });
        }
        next();
    };
}

module.exports = { requirePermission, requireRole };

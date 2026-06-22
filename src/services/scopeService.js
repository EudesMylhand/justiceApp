const User = require('../models/User');

/**
 * Détermine la portée d'accès aux plaintes pour un utilisateur donné :
 * - 'ALL' si l'utilisateur a la permission PLAINTE_VIEW_ALL (vue nationale)
 * - 'UNIT' sinon, restreint à son commissariat ou sa brigade de rattachement
 *
 * Retourne également l'identifiant de commissariat/brigade pour filtrer la recherche.
 */
async function determinerPorteePlaintes(reqUser) {
    const permissions = reqUser.permissions || [];

    if (permissions.includes('PLAINTE_VIEW_ALL')) {
        return { scope: 'ALL', commissariatId: null, brigadeId: null };
    }

    // Récupération du rattachement réel de l'utilisateur (commissariat ou brigade)
    const user = await User.findById(reqUser.id);
    return {
        scope: 'UNIT',
        commissariatId: user ? user.commissariat_id : null,
        brigadeId: user ? user.brigade_id : null,
    };
}

module.exports = { determinerPorteePlaintes };

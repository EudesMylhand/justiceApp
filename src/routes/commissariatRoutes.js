const express = require('express');
const router = express.Router();

const commissariatController = require('../controllers/commissariatController');
const authModule = require('../middlewares/auth');
const rbacModule = require('../middlewares/rbac');

/**
 * Résout une middleware quelle que soit la forme d'export du module :
 *   module.exports = fn
 *   module.exports = { name: fn }
 *   module.exports = { default: fn }
 * Échoue avec un message clair si rien de valide n'est trouvé.
 */
function resolveMiddleware(mod, name) {
  const candidate =
    typeof mod === 'function'
      ? mod
      : mod && (mod[name] || mod.default);

  if (typeof candidate !== 'function') {
    throw new TypeError(
      `Middleware "${name}" introuvable ou invalide : attendu une fonction, reçu ${typeof candidate}. ` +
        `Vérifiez l'export du module correspondant.`
    );
  }
  return candidate;
}

const requireAuth = resolveMiddleware(authModule, 'requireAuth');
const requirePermission = resolveMiddleware(rbacModule, 'requirePermission');

// Authentification obligatoire pour toutes les routes commissariat
router.use(requireAuth);

router.get(
  '/',
  requirePermission('COMMISSARIAT_VIEW_ALL', 'COMMISSARIAT_VIEW_OWN'),
  commissariatController.list
);
router.get(
  '/:id',
  requirePermission('COMMISSARIAT_VIEW_ALL', 'COMMISSARIAT_VIEW_OWN'),
  commissariatController.getOne
);
router.post(
  '/',
  requirePermission('COMMISSARIAT_CREATE'),
  commissariatController.create
);
router.put(
  '/:id',
  requirePermission('COMMISSARIAT_UPDATE_ALL', 'COMMISSARIAT_UPDATE_OWN'),
  commissariatController.update
);
router.post(
  '/:id/deactivate',
  requirePermission('COMMISSARIAT_DELETE'),
  commissariatController.deactivate
);
router.post(
  '/:id/reactivate',
  requirePermission('COMMISSARIAT_DELETE'),
  commissariatController.reactivate
);

module.exports = router;
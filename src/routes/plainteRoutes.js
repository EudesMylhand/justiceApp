const express = require('express');
const router = express.Router();
const plainteController = require('../controllers/plainteController');
const { requireAuth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const { uploadPieceJointe } = require('../middlewares/upload');

router.use(requireAuth);

// --- Plaintes ---
router.get(
    '/',
    requirePermission('PLAINTE_VIEW_ALL', 'PLAINTE_VIEW_SERVICE', 'PLAINTE_VIEW_UNIT'),
    plainteController.search
);
router.get(
    '/:id',
    requirePermission('PLAINTE_VIEW_ALL', 'PLAINTE_VIEW_SERVICE', 'PLAINTE_VIEW_UNIT'),
    plainteController.getOne
);
router.post('/', requirePermission('PLAINTE_CREATE'), plainteController.create);
router.put('/:id', requirePermission('PLAINTE_UPDATE'), plainteController.update);
router.post('/:id/statut', requirePermission('PLAINTE_UPDATE'), plainteController.updateStatut);

// --- Victimes / Témoins / Suspects ---
router.post('/:id/victimes', requirePermission('PLAINTE_UPDATE'), plainteController.addVictime);
router.post('/:id/temoins', requirePermission('PLAINTE_UPDATE'), plainteController.addTemoin);
router.post('/:id/suspects', requirePermission('PLAINTE_UPDATE'), plainteController.addSuspect);
router.post('/:id/suspects/:suspectId/statut', requirePermission('PLAINTE_UPDATE'), plainteController.updateSuspectStatut);

// --- Pièces jointes ---
router.post(
    '/:id/pieces-jointes',
    requirePermission('PLAINTE_ADD_PIECE_JOINTE'),
    uploadPieceJointe.single('fichier'),
    plainteController.uploadPieceJointe
);
router.get(
    '/:id/pieces-jointes/:pieceId/telecharger',
    requirePermission('PLAINTE_VIEW_ALL', 'PLAINTE_VIEW_SERVICE', 'PLAINTE_VIEW_UNIT'),
    plainteController.downloadPieceJointe
);
router.delete(
    '/:id/pieces-jointes/:pieceId',
    requirePermission('PLAINTE_DELETE_PIECE_JOINTE'),
    plainteController.deletePieceJointe
);

module.exports = router;

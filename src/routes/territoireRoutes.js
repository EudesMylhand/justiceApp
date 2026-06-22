const express = require('express');
const router = express.Router();
const territoireController = require('../controllers/territoireController');
const { requireAuth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');

router.use(requireAuth);

router.get('/departements', requirePermission('TERRITOIRE_VIEW', 'TERRITOIRE_MANAGE'), territoireController.getDepartements);
router.get('/departements/:departementId/villes', requirePermission('TERRITOIRE_VIEW', 'TERRITOIRE_MANAGE'), territoireController.getVilles);
router.get('/villes/:villeId/arrondissements', requirePermission('TERRITOIRE_VIEW', 'TERRITOIRE_MANAGE'), territoireController.getArrondissements);
router.get('/arrondissements/:arrondissementId/quartiers', requirePermission('TERRITOIRE_VIEW', 'TERRITOIRE_MANAGE'), territoireController.getQuartiers);

router.post('/departements', requirePermission('TERRITOIRE_MANAGE'), territoireController.createDepartement);
router.post('/villes', requirePermission('TERRITOIRE_MANAGE'), territoireController.createVille);
router.post('/arrondissements', requirePermission('TERRITOIRE_MANAGE'), territoireController.createArrondissement);
router.post('/quartiers', requirePermission('TERRITOIRE_MANAGE'), territoireController.createQuartier);

module.exports = router;

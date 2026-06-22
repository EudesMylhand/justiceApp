const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');

router.use(requireAuth);

router.get(
    '/vue-ensemble',
    requirePermission('DASHBOARD_NATIONAL_VIEW', 'DASHBOARD_SERVICE_VIEW', 'DASHBOARD_UNIT_VIEW'),
    dashboardController.vueEnsemble
);
router.get(
    '/statistiques-rh',
    requirePermission('DASHBOARD_NATIONAL_VIEW', 'DASHBOARD_SERVICE_VIEW'),
    dashboardController.statistiquesRH
);
router.get(
    '/carte',
    requirePermission('DASHBOARD_NATIONAL_VIEW', 'DASHBOARD_SERVICE_VIEW'),
    dashboardController.carteInteractive
);
router.get('/journaux', requirePermission('AUDIT_VIEW'), dashboardController.journaux);

module.exports = router;

const express = require('express');
const router = express.Router();
const brigadeController = require('../controllers/brigadeController');
const { requireAuth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');

router.use(requireAuth);

router.get('/', requirePermission('BRIGADE_VIEW_ALL', 'BRIGADE_VIEW_OWN'), brigadeController.list);
router.get('/:id', requirePermission('BRIGADE_VIEW_ALL', 'BRIGADE_VIEW_OWN'), brigadeController.getOne);
router.post('/', requirePermission('BRIGADE_CREATE'), brigadeController.create);
router.put('/:id', requirePermission('BRIGADE_UPDATE_ALL', 'BRIGADE_UPDATE_OWN'), brigadeController.update);
router.post('/:id/deactivate', requirePermission('BRIGADE_DELETE'), brigadeController.deactivate);
router.post('/:id/reactivate', requirePermission('BRIGADE_DELETE'), brigadeController.reactivate);

module.exports = router;

const express = require('express');
const router = express.Router();
const commissariatController = require('../controllers/commissariatController');
const { requireAuth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');

router.use(requireAuth);

router.get('/', requirePermission('COMMISSARIAT_VIEW_ALL', 'COMMISSARIAT_VIEW_OWN'), commissariatController.list);
router.get('/:id', requirePermission('COMMISSARIAT_VIEW_ALL', 'COMMISSARIAT_VIEW_OWN'), commissariatController.getOne);
router.post('/', requirePermission('COMMISSARIAT_CREATE'), commissariatController.create);
router.put('/:id', requirePermission('COMMISSARIAT_UPDATE_ALL', 'COMMISSARIAT_UPDATE_OWN'), commissariatController.update);
router.post('/:id/deactivate', requirePermission('COMMISSARIAT_DELETE'), commissariatController.deactivate);
router.post('/:id/reactivate', requirePermission('COMMISSARIAT_DELETE'), commissariatController.reactivate);

module.exports = router;

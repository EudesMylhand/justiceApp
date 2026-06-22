const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');

router.use(requireAuth);

router.get('/roles', requirePermission('USERS_VIEW_ALL', 'USERS_VIEW_SERVICE', 'USERS_VIEW_UNIT', 'USERS_CREATE'), userController.listRoles);
router.get('/', requirePermission('USERS_VIEW_ALL', 'USERS_VIEW_SERVICE', 'USERS_VIEW_UNIT'), userController.list);
router.get('/:id', requirePermission('USERS_VIEW_ALL', 'USERS_VIEW_SERVICE', 'USERS_VIEW_UNIT'), userController.getOne);
router.post('/', requirePermission('USERS_CREATE'), userController.create);
router.put('/:id', requirePermission('USERS_UPDATE'), userController.update);
router.post('/:id/deactivate', requirePermission('USERS_DELETE'), userController.deactivate);
router.post('/:id/reactivate', requirePermission('USERS_DELETE'), userController.reactivate);

module.exports = router;

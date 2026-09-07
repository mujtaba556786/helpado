const router = require('express').Router();
const { handleAsync, requireAuth, requireSelfParam, forceBodyUser } = require('../middleware/auth');
const ctrl   = require('../controllers/notificationController');

router.get('/:userId',              requireSelfParam('userId'),  handleAsync(ctrl.getByUser));
router.get('/:userId/unread-count', requireSelfParam('userId'),  handleAsync(ctrl.getUnreadCount));
router.put('/:id/read',             requireAuth,                 handleAsync(ctrl.markRead));
router.put('/read-all/:userId',     requireSelfParam('userId'),  handleAsync(ctrl.markAllRead));
router.post('/device-token',        forceBodyUser('userId'),     handleAsync(ctrl.saveDeviceToken));
router.delete('/device-token',      requireAuth,                 handleAsync(ctrl.deleteDeviceToken));

module.exports = router;

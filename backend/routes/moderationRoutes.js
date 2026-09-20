const router = require('express').Router();
const { requireAuth, requireAdmin, handleAsync } = require('../middleware/auth');
const ctrl   = require('../controllers/moderationController');

// Admin reads the conversation between a report's two parties — and only that one.
router.get('/admin/reports/:id/conversation', requireAdmin, handleAsync(ctrl.getReportConversation));
router.put('/admin/messages/:id/remove',      requireAdmin, handleAsync(ctrl.removeMessage));
router.delete('/admin/users/:id',             requireAdmin, handleAsync(ctrl.adminEraseUser));

// Account owner erases their own account (privacy policy: "delete your account at any time").
router.delete('/users/me',                    requireAuth,  handleAsync(ctrl.eraseMe));

module.exports = router;

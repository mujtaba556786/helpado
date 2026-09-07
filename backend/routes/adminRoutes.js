const router   = require('express').Router();
const { handleAsync, requireAdmin, requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s        = require('../middleware/schemas');
const ctrl     = require('../controllers/adminController');

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats',                     requireAdmin, handleAsync(ctrl.getStats));

// ── Reviews ───────────────────────────────────────────────────────────────────
router.get('/admin/reviews',             requireAdmin, handleAsync(ctrl.getReviews));
router.put('/admin/reviews/:id/approve', requireAdmin, handleAsync(ctrl.approveReview));
router.put('/admin/reviews/:id/reject',  requireAdmin, handleAsync(ctrl.rejectReview));
router.delete('/admin/reviews/:id',      requireAdmin, handleAsync(ctrl.deleteReview));

// ── Admin blocks ──────────────────────────────────────────────────────────────
router.get('/admin/blocks',              requireAdmin, handleAsync(ctrl.getBlocks));
router.delete('/admin/blocks/:id',       requireAdmin, handleAsync(ctrl.deleteBlock));

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/admin/reports',             requireAdmin, handleAsync(ctrl.getReports));
router.put('/admin/reports/:id/action',  requireAdmin, validate(s.actionReport), handleAsync(ctrl.actionReport));

// ── Flagged users & user actions ──────────────────────────────────────────────
router.get('/admin/flagged-users',       requireAdmin, handleAsync(ctrl.getFlaggedUsers));
router.put('/admin/users/:id/action',    requireAdmin, validate(s.actionUser),   handleAsync(ctrl.actionUser));

// ── User-side blocking ────────────────────────────────────────────────────────
router.post('/users/:id/block',          requireAuth,  handleAsync(ctrl.blockUser));
router.delete('/users/:id/block',        requireAuth,  handleAsync(ctrl.unblockUser));
router.get('/users/me/blocks',           requireAuth,  handleAsync(ctrl.getMyBlocks));

// ── Reporting ─────────────────────────────────────────────────────────────────
router.post('/reports',                  requireAuth,  validate(s.submitReport), handleAsync(ctrl.submitReport));

// ── Subscription + featured management (admin) ────────────────────────────────
router.patch('/admin/users/:id/subscription', requireAdmin, handleAsync(ctrl.setSubscriptionPlan));
router.post('/admin/users/:id/feature',       requireAdmin, handleAsync(ctrl.featureProvider));
router.delete('/admin/users/:id/feature',     requireAdmin, handleAsync(ctrl.unfeatureProvider));

module.exports = router;

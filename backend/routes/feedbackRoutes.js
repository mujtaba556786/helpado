const router   = require('express').Router();
const { requireAuth, requireAdmin, handleAsync } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s        = require('../middleware/schemas');
const ctrl     = require('../controllers/feedbackController');

// The sender is always the logged-in user (req.userId from the token), never
// a body field — same rule as reports.
router.post('/feedback',                   requireAuth,  validate(s.submitFeedback), handleAsync(ctrl.submitFeedback));
router.get('/admin/feedback',              requireAdmin, handleAsync(ctrl.getFeedback));
router.put('/admin/feedback/:id/status',   requireAdmin, validate(s.actionFeedback), handleAsync(ctrl.actionFeedback));

module.exports = router;

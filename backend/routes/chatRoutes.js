const router = require('express').Router();
const { handleAsync, requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/chatController');

// Hidden feature, but the endpoint is live and calls a paid provider: signed-in
// callers only.
router.post('/', requireAuth, handleAsync(ctrl.chat));

module.exports = router;

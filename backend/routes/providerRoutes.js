const router = require('express').Router();
const { handleAsync, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

// GET /api/providers          — list all providers (optionally filter by ?category=)
// GET /api/providers/:id/ratings — approved+pending ratings for a provider
router.get('/',                optionalAuth, handleAsync(ctrl.getProviders));
router.get('/:id/ratings',     handleAsync(ctrl.getProviderRatings));

module.exports = router;

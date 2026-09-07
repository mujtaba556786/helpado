const router = require('express').Router();
const { handleAsync, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/servicesController');

// The catalogue is public to read. Writing to it was open to anyone, which let
// any caller rewrite the service list for the whole marketplace.
router.get('/',       handleAsync(ctrl.getAll));
router.post('/',      requireAdmin, handleAsync(ctrl.create));
router.put('/:id',    requireAdmin, handleAsync(ctrl.update));
router.delete('/:id', requireAdmin, handleAsync(ctrl.remove));

module.exports = router;

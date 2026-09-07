const router   = require('express').Router();
const {
    handleAsync, requireAdmin, requireSelfParam, forceBodyUser, requireBookingParticipant
} = require('../middleware/auth');
const validate = require('../middleware/validate');
const s        = require('../middleware/schemas');
const ctrl     = require('../controllers/bookingController');

// customer_id is taken from the token, never from the body: a caller used to be
// able to create bookings in someone else's name.
router.get('/',                  requireAdmin,                                 handleAsync(ctrl.getAllAdmin));
router.post('/',                 forceBodyUser('customer_id'),
                                 validate(s.createBooking),                    handleAsync(ctrl.createBooking));
router.get('/user/:id',          requireSelfParam('id'),                       handleAsync(ctrl.getByUser));
router.put('/user/:id/mark-seen', requireSelfParam('id'),                      handleAsync(ctrl.markSeen));
// Only the customer or the provider may move a booking's status. This is also
// what protects the rating gate — 'completed' was reachable by anyone.
router.put('/:id/status',        requireBookingParticipant,
                                 validate(s.updateBookingStatus),              handleAsync(ctrl.updateStatus));

module.exports = router;

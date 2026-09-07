const router   = require('express').Router();
const { handleAsync, forceBodyUser } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s        = require('../middleware/schemas');
const ctrl     = require('../controllers/userController');

// user_id is the reviewer. Taking it from the token stops a caller from posting
// reviews in someone else's name; UserService.createRating still requires a
// completed booking between the two.
router.post('/', forceBodyUser('user_id'), validate(s.createRating), handleAsync(ctrl.createRating));

module.exports = router;

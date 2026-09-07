const router   = require('express').Router();
const {
    handleAsync, requireAuth, forceBodyUser, requireTaskOwner, requireTaskParticipant
} = require('../middleware/auth');
const validate = require('../middleware/validate');
const s        = require('../middleware/schemas');
const ctrl     = require('../controllers/taskController');

// Tasks carry addresses and budgets, so the feed is for signed-in users; the
// poster/applicant is taken from the token rather than the request body.
router.post('/',           forceBodyUser('poster_id'),
                           validate(s.createTask),        handleAsync(ctrl.createTask));
router.get('/',            requireAuth,                   handleAsync(ctrl.listTasks));
router.get('/:id',         requireAuth,                   handleAsync(ctrl.getTask));
router.post('/:id/apply',  forceBodyUser('provider_id'),
                           validate(s.applyToTask),       handleAsync(ctrl.applyToTask));
router.put('/:id/assign',  requireTaskOwner,
                           validate(s.assignTask),        handleAsync(ctrl.assignTask));
// Either side may move the status; only the poster may assign or delete.
router.put('/:id/status',  requireTaskParticipant,
                           validate(s.updateTaskStatus),  handleAsync(ctrl.updateStatus));
router.delete('/:id',      forceBodyUser('user_id'),
                           validate(s.deleteTask),        handleAsync(ctrl.deleteTask));

module.exports = router;

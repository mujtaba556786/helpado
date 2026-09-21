const router      = require('express').Router();
const {
    handleAsync, requireAuth, requireSelfParam, forceBodyUser, requireConversationParticipant
} = require('../middleware/auth');
const validate    = require('../middleware/validate');
const s           = require('../middleware/schemas');
const msgThrottle = require('../middleware/msgThrottle');
const ctrl        = require('../controllers/messageController');

// Every one of these used to trust an id from the URL or body, so any caller
// could read a stranger's DMs or send messages as them.
router.get('/conversations/:userId',          requireSelfParam('userId'),        handleAsync(ctrl.getConversations));
router.post('/conversations',                 forceBodyUser('user1_id'),
                                              validate(s.createConversation),    handleAsync(ctrl.createConversation));
router.get('/messages/:conversationId',       requireConversationParticipant,    handleAsync(ctrl.getMessages));
router.post('/messages',  msgThrottle,        forceBodyUser('sender_id'),
                                              validate(s.sendMessage),
                                              requireConversationParticipant,    handleAsync(ctrl.sendMessage));
router.put('/messages/:conversationId/read',  forceBodyUser('user_id'),
                                              validate(s.markMessagesRead),
                                              requireConversationParticipant,    handleAsync(ctrl.markRead));
router.get('/messages/unread-count/:userId',  requireSelfParam('userId'),        handleAsync(ctrl.getUnreadCount));

// Own-message edit / unsend: the service checks sender === caller (403 otherwise).
// Declared after the two-segment /messages/:conversationId/read so Express does
// not confuse a message id with a conversation id.
router.put('/messages/:messageId',            requireAuth, validate(s.editMessage), handleAsync(ctrl.editMessage));
router.delete('/messages/:messageId',         requireAuth,                       handleAsync(ctrl.unsendMessage));
// "Chat löschen" for the caller only.
router.delete('/conversations/:conversationId/me', requireConversationParticipant, handleAsync(ctrl.hideConversation));

module.exports = router;

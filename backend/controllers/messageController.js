const MessageService = require('../services/MessageService');

async function getConversations(req, res) {
    const result = await MessageService.getConversations(req.params.userId);
    res.json({ success: true, ...result });
}

async function createConversation(req, res) {
    const { user1_id, user2_id } = req.body;
    if (!user1_id || !user2_id) return res.status(400).json({ success: false, error: 'user1_id and user2_id required' });
    const result = await MessageService.findOrCreateConversation(user1_id, user2_id);
    res.json({ success: true, ...result });
}

async function getMessages(req, res) {
    const messages = await MessageService.getMessages(req.params.conversationId, req.userId);
    res.json({ success: true, messages });
}

async function editMessage(req, res) {
    await MessageService.editMessage(req.params.messageId, req.userId, req.body.content);
    res.json({ success: true });
}

async function unsendMessage(req, res) {
    const r = await MessageService.unsendMessage(req.params.messageId, req.userId);
    res.json({ success: true, already: r.already });
}

async function hideConversation(req, res) {
    await MessageService.hideConversation(req.params.conversationId, req.userId);
    res.json({ success: true });
}

async function sendMessage(req, res) {
    const { conversation_id, sender_id, content } = req.body;
    const result = await MessageService.sendMessage(conversation_id, sender_id, content);
    res.json({ success: true, messageId: result.messageId });
}

async function markRead(req, res) {
    const { user_id } = req.body;
    await MessageService.markMessagesRead(req.params.conversationId, user_id);
    res.json({ success: true });
}

async function getUnreadCount(req, res) {
    const count = await MessageService.getUnreadCount(req.params.userId);
    res.json({ success: true, count });
}

module.exports = { getConversations, createConversation, getMessages, sendMessage, markRead, getUnreadCount, editMessage, unsendMessage, hideConversation };

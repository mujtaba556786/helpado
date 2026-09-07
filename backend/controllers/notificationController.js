const NotificationService = require('../services/NotificationService');
const PushService         = require('../services/PushService');

async function getByUser(req, res) {
    const notifications = await NotificationService.getByUser(req.params.userId);
    res.json({ success: true, notifications });
}

async function getUnreadCount(req, res) {
    const count = await NotificationService.getUnreadCount(req.params.userId);
    res.json({ success: true, count });
}

async function markRead(req, res) {
    await NotificationService.markRead(req.params.id, req.userId);
    res.json({ success: true });
}

async function markAllRead(req, res) {
    await NotificationService.markAllRead(req.params.userId);
    res.json({ success: true });
}

async function saveDeviceToken(req, res) {
    const { userId, token, platform } = req.body;
    if (!userId || !token) return res.status(400).json({ success: false, error: 'userId and token required' });
    await PushService.saveToken(userId, token, platform || 'android');
    res.json({ success: true });
}

async function deleteDeviceToken(req, res) {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'token required' });
    await PushService.removeToken(token, req.userId);
    res.json({ success: true });
}

module.exports = { getByUser, getUnreadCount, markRead, markAllRead, saveDeviceToken, deleteDeviceToken };

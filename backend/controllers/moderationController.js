const svc = require('../services/ModerationService');

async function getReportConversation(req, res) {
    const data = await svc.getReportConversation(req.params.id);
    res.json({ success: true, ...data });
}

async function removeMessage(req, res) {
    const r = await svc.removeMessage(req.params.id);
    res.json({ success: true, already: r.already });
}

async function adminEraseUser(req, res) {
    const r = await svc.eraseUser(req.params.id, { by: 'admin' });
    res.json({ success: true, already: r.already });
}

async function eraseMe(req, res) {
    const r = await svc.eraseUser(req.userId, { by: 'self' });
    res.json({ success: true, already: r.already });
}

module.exports = { getReportConversation, removeMessage, adminEraseUser, eraseMe };

const svc = require('../services/FeedbackService');

async function submitFeedback(req, res) {
    const result = await svc.submitFeedback(req.userId, req.body);
    res.status(201).json({ success: true, id: result.id });
}

async function getFeedback(req, res) {
    const rows = await svc.getFeedback({ status: req.query.status, limit: req.query.limit });
    res.json({ success: true, feedback: rows });
}

async function actionFeedback(req, res) {
    await svc.setFeedbackStatus(req.params.id, req.body.status);
    res.json({ success: true });
}

module.exports = { submitFeedback, getFeedback, actionFeedback };

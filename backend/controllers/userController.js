const svc = require('../services/UserService');

async function getAll(req, res) {
    const users = await svc.getAll();
    res.json(users);
}

async function updateUser(req, res) {
    await svc.updateUser(req.params.id, req.body);
    res.json({ success: true });
}

async function uploadAvatar(req, res) {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    // Cloudinary gives req.file.path (full https URL); local disk gives req.file.filename
    const avatarUrl = await svc.uploadAvatar(req.params.id, req.file.path || req.file.filename);
    res.json({ success: true, avatarUrl });
}

async function getProviders(req, res) {
    const providers = await svc.getProviders(req.query.category, req.userId);
    res.json({ success: true, providers });
}

async function getProviderRatings(req, res) {
    const ratings = await svc.getProviderRatings(req.params.id);
    res.json({ success: true, ratings });
}

async function createRating(req, res) {
    const result = await svc.createRating(req.body);
    res.json({ success: true, ...result, pending: true });
}

async function updateStatus(req, res) {
    await svc.updateStatus(req.params.id, req.body.status);
    res.json({ success: true });
}

async function approveUser(req, res) {
    await svc.approveUser(req.params.id);
    res.json({ success: true });
}

async function onboardUser(req, res) {
    const status = await svc.onboardUser(req.params.id, req.body);
    res.json({ success: true, status });
}

async function updateProfile(req, res) {
    await svc.updateProfile(req.params.id, req.body);
    res.json({ success: true });
}

module.exports = {
    getAll, updateUser, uploadAvatar, getProviders, getProviderRatings,
    createRating, updateStatus, approveUser, onboardUser, updateProfile
};

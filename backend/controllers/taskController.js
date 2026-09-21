const TaskService = require('../services/TaskService');

async function createTask(req, res) {
    const result = await TaskService.createTask(req.body);
    res.json({ success: true, taskId: result.taskId });
}

async function listTasks(req, res) {
    const tasks = await TaskService.listTasks(req.query, req.userId);
    res.json({ success: true, tasks });
}

async function getTask(req, res) {
    const { task, applications } = await TaskService.getTask(req.params.id);
    res.json({ success: true, task, applications });
}

async function applyToTask(req, res) {
    const { provider_id, message } = req.body;
    const result = await TaskService.applyToTask(req.params.id, provider_id, message);
    res.json({ success: true, applicationId: result.applicationId });
}

async function assignTask(req, res) {
    const { provider_id } = req.body;
    await TaskService.assignTask(req.params.id, provider_id);
    res.json({ success: true });
}

async function updateStatus(req, res) {
    const { status } = req.body;
    await TaskService.updateStatus(req.params.id, status);
    res.json({ success: true });
}

async function deleteTask(req, res) {
    const { user_id } = req.body;
    await TaskService.deleteTask(req.params.id, user_id);
    res.json({ success: true });
}

module.exports = { createTask, listTasks, getTask, applyToTask, assignTask, updateStatus, deleteTask };

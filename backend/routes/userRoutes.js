const router   = require('express').Router();
const path     = require('path');
const multer   = require('multer');
const { v4: uuidv4 } = require('uuid');
const { handleAsync, requireAdmin, requireSelfParam } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s        = require('../middleware/schemas');
const ctrl     = require('../controllers/userController');
const { avatarStorage, isConfigured } = require('../config/cloudinary');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const localDiskStorage = multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar_${req.params.id}_${uuidv4()}${ext}`);
    }
});

const avatarUpload = multer({
    storage: isConfigured() ? avatarStorage : localDiskStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        ALLOWED_MIME.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
    }
});

// Every one of these took the target user from the URL and did no checking, so
// any caller could edit a stranger's profile — or approve themselves as a
// verified provider. Self-service routes are pinned to the caller's own id;
// moderation routes are admin-only. The public helper list lives on
// /api/providers, so the full user dump is admin-only too.
router.get('/',            requireAdmin,                                    handleAsync(ctrl.getAll));
router.put('/:id',         requireSelfParam('id'), validate(s.updateUser),  handleAsync(ctrl.updateUser));
router.post('/:id/avatar', requireSelfParam('id'),
                           avatarUpload.single('avatar'),                   handleAsync(ctrl.uploadAvatar));
router.put('/:id/status',  requireAdmin, validate(s.updateStatus),          handleAsync(ctrl.updateStatus));
router.put('/:id/approve', requireAdmin,                                    handleAsync(ctrl.approveUser));
router.put('/:id/onboard', requireSelfParam('id'), validate(s.onboardUser), handleAsync(ctrl.onboardUser));
router.put('/:id/profile', requireSelfParam('id'), validate(s.updateProfile), handleAsync(ctrl.updateProfile));

module.exports = router;

const { z } = require('zod');

// ── Reusable primitives ───────────────────────────────────────────────────────
const email    = z.string().trim().email('Invalid email address').max(200);
const userId   = z.string().trim().min(1, 'User ID is required').max(50);
const shortStr = (label) => z.string().trim().min(1, `${label} is required`).max(200);

// ── Auth ──────────────────────────────────────────────────────────────────────
const googleLogin = z.object({
    idToken: z.string().min(1, 'idToken is required')
});

const facebookLogin = z.object({
    accessToken: z.string().min(1, 'accessToken is required')
});

const passwordlessLogin = z.object({
    email,
    role:     z.enum(['Customer', 'Provider', 'Admin']).optional(),
    provider: z.string().max(20).optional()
});

const sendMagicLink = z.object({
    email
});

const verifyOtp = z.object({
    email,
    code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits')
});

const adminLogin = z.object({
    password: z.string().min(1, 'Password is required').max(200)
});

const refreshToken = z.object({
    refreshToken: z.string().min(1, 'refreshToken is required')
});

const logout = z.object({
    refreshToken: z.string().optional()
});

// ── Users ─────────────────────────────────────────────────────────────────────
const updateUser = z.object({
    name:               z.string().trim().max(100).optional(),
    bio:                z.string().trim().max(1000).optional(),
    languages:          z.string().trim().max(100).optional(),
    years:              z.coerce.number().int().min(0).max(60).optional(),
    phone:              z.string().trim().max(50).optional(),
    rate:               z.coerce.number().min(0).max(10000).optional(),
    availability:       z.union([z.array(z.string()), z.string()]).optional(),
    serviceCategories:  z.union([z.array(z.string()), z.string()]).optional(),
    street_name:        z.string().trim().max(100).optional(),
    street_number:      z.string().trim().max(20).optional(),
    city:               z.string().trim().max(100).optional(),
    state:              z.string().trim().max(100).optional(),
    country:            z.string().trim().max(100).optional(),
    pincode:            z.string().trim().regex(/^[A-Za-z0-9\s\-]{3,10}$/, 'Invalid postal code format').optional(),
    lat:                z.coerce.number().min(-90).max(90).optional(),
    lng:                z.coerce.number().min(-180).max(180).optional()
}).strict();

const onboardUser = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    role: z.enum(['Customer', 'Provider']),
    bio:  z.string().trim().max(1000).optional()
});

const updateProfile = z.object({
    name:   z.string().trim().max(100).optional(),
    bio:    z.string().trim().max(1000).optional(),
    avatar: z.string().url('Invalid avatar URL').optional().or(z.literal(''))
});

const updateStatus = z.object({
    status: z.enum(['Active', 'Suspended', 'Blocked', 'Pending Approval'])
});

// ── Ratings ───────────────────────────────────────────────────────────────────
const createRating = z.object({
    provider_id:   userId,
    user_id:       userId,
    reviewer_name: z.string().trim().max(100).optional(),
    stars:         z.coerce.number().int().min(1, 'stars must be 1–5').max(5, 'stars must be 1–5'),
    comment:       z.string().trim().max(2000).optional()
});

// ── Bookings ──────────────────────────────────────────────────────────────────
const createBooking = z.object({
    customer_id:     userId,
    provider_id:     userId,
    service:         z.string().trim().max(100).optional(),
    scheduled_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    scheduled_time:  z.string().trim().max(20).optional(),
    message:         z.string().trim().max(2000).optional()
});

const updateBookingStatus = z.object({
    status: z.enum(['pending', 'confirmed', 'declined', 'completed', 'cancelled'])
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
const createTask = z.object({
    poster_id:   userId,
    title:       z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().trim().max(5000).optional(),
    category:    shortStr('category'),
    budget:      z.coerce.number().min(0).max(1000000).optional(),
    task_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    location:    z.string().trim().max(200).optional(),
    lat:         z.coerce.number().min(-90).max(90).optional(),
    lng:         z.coerce.number().min(-180).max(180).optional()
});

const applyToTask = z.object({
    provider_id: userId,
    message:     z.string().trim().max(2000).optional()
});

const assignTask = z.object({
    provider_id: userId
});

const updateTaskStatus = z.object({
    status: z.enum(['open', 'assigned', 'completed'])
});

const deleteTask = z.object({
    user_id: userId
});

// ── Messages ──────────────────────────────────────────────────────────────────
const createConversation = z.object({
    user1_id: userId,
    user2_id: userId
});

const sendMessage = z.object({
    conversation_id: z.string().trim().min(1, 'conversation_id is required').max(50),
    sender_id:       userId,
    content:         z.string().trim().min(1, 'Message cannot be empty').max(5000)
});

const markMessagesRead = z.object({
    user_id: userId
});

const editMessage = z.object({
    content: z.string().trim().min(1, 'Message cannot be empty').max(5000)
});

// ── Reports ───────────────────────────────────────────────────────────────────
const submitReport = z.object({
    reported_type: z.enum(['user', 'post', 'message']),
    reported_id:   userId,
    category:      z.enum(['spam', 'harassment', 'scam_fraud', 'inappropriate_content', 'fake_profile', 'other']),
    description:   z.string().trim().max(2000).optional()
});

// ── Feedback ──────────────────────────────────────────────────────────────────
const submitFeedback = z.object({
    type:      z.enum(['idea', 'problem', 'praise']),
    message:   z.string().trim().min(3).max(2000),
    app_build: z.string().trim().max(20).optional(),
    platform:  z.string().trim().max(20).optional()
});
const actionFeedback = z.object({
    status: z.enum(['new', 'read', 'done'])
});

// ── Admin ─────────────────────────────────────────────────────────────────────
const actionReport = z.object({
    status: z.enum(['reviewed', 'actioned'])
});

const actionUser = z.object({
    action: z.enum(['warn', 'restrict', 'ban', 'clear'])
});

module.exports = {
    // auth
    googleLogin, facebookLogin, passwordlessLogin, sendMagicLink, verifyOtp, adminLogin, refreshToken, logout,
    // users
    updateUser, onboardUser, updateProfile, updateStatus,
    // ratings
    createRating,
    // bookings
    createBooking, updateBookingStatus,
    // tasks
    createTask, applyToTask, assignTask, updateTaskStatus, deleteTask,
    // messages
    createConversation, sendMessage, markMessagesRead,
    // reports & admin
    submitReport, actionReport, actionUser,
    submitFeedback, actionFeedback,
    editMessage
};

const pool                    = require('../db/pool');
const { calculateTrustScore } = require('./TrustService');
const { createAndPush }       = require('./NotificationService');

async function createBooking({ customer_id, provider_id, service, scheduled_date, scheduled_time, message }) {
    if (!customer_id || !provider_id) {
        const err = new Error('customer_id and provider_id are required');
        err.statusCode = 400;
        throw err;
    }

    const id = 'B' + Date.now();
    await pool.execute(
        'INSERT INTO bookings (id, customer_id, provider_id, service, scheduled_date, scheduled_time, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, customer_id, provider_id, service || null, scheduled_date || null, scheduled_time || null, message || null]
    );

    const [[customer]] = await pool.query('SELECT name FROM users WHERE id = ?', [customer_id]);
    const [[provider]] = await pool.query('SELECT name FROM users WHERE id = ?', [provider_id]);
    const customerName = customer?.name || 'Someone';

    await createAndPush(
        provider_id,
        'booking_request',
        `New booking request from ${customerName}`,
        `${customerName} wants to book ${service || 'your service'}${scheduled_date ? ' on ' + scheduled_date : ''}${scheduled_time ? ' at ' + scheduled_time : ''}.`,
        id
    );

    return { bookingId: id };
}

async function getBookingsByUser(userId) {
    const [rows] = await pool.query(
        `SELECT b.*,
                c.name AS customer_name, c.avatar AS customer_avatar,
                p.name AS provider_name, p.avatar AS provider_avatar,
                p.service_categories AS provider_service
         FROM bookings b
         LEFT JOIN users c ON c.id = b.customer_id
         LEFT JOIN users p ON p.id = b.provider_id
         WHERE b.customer_id = ? OR b.provider_id = ?
         ORDER BY b.created_at DESC`,
        [userId, userId]
    );
    const newCount = rows.filter(b => !b.is_seen).length;
    return { bookings: rows, newCount };
}

async function markSeen(userId) {
    await pool.execute(
        'UPDATE bookings SET is_seen = 1 WHERE (customer_id = ? OR provider_id = ?) AND is_seen = 0',
        [userId, userId]
    );
}

const VALID_STATUSES = ['confirmed', 'declined', 'completed', 'cancelled'];

async function updateStatus(bookingId, status) {
    if (!VALID_STATUSES.includes(status)) {
        const err = new Error('Invalid status');
        err.statusCode = 400;
        throw err;
    }

    // Reviews are gated on a booking being 'completed', so completion cannot be a
    // free-for-all: otherwise anyone could create a booking, mark it completed and
    // review a helper they never met. A booking may only be completed if it was
    // actually confirmed and its scheduled date is not still in the future.
    if (status === 'completed') {
        const [[current]] = await pool.query(
            'SELECT status, scheduled_date FROM bookings WHERE id = ?', [bookingId]
        );
        if (!current) {
            throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
        }
        if (current.status !== 'confirmed') {
            throw Object.assign(
                new Error('Only a confirmed booking can be marked completed'),
                { statusCode: 409 }
            );
        }
        if (current.scheduled_date) {
            const dScheduled = new Date(current.scheduled_date);
            const dToday = new Date(); dToday.setHours(0, 0, 0, 0);
            if (dScheduled > dToday) {
                throw Object.assign(
                    new Error('This booking has not taken place yet'),
                    { statusCode: 409 }
                );
            }
        }
    }

    await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);

    const [[booking]] = await pool.query(
        'SELECT b.*, p.name AS provider_name, c.name AS customer_name FROM bookings b LEFT JOIN users p ON p.id = b.provider_id LEFT JOIN users c ON c.id = b.customer_id WHERE b.id = ?',
        [bookingId]
    );

    if (booking) {
        let notifyUserId, title, msg;
        if (status === 'cancelled') {
            notifyUserId = booking.provider_id;
            title = `Booking cancelled by ${booking.customer_name || 'customer'}`;
            msg = `The booking for ${booking.service || 'a service'} has been cancelled.`;
        } else if (status === 'confirmed') {
            notifyUserId = booking.customer_id;
            title = `${booking.provider_name} confirmed your booking!`;
            msg = `Your booking for ${booking.service || 'a service'} has been confirmed.`;
        } else if (status === 'declined') {
            notifyUserId = booking.customer_id;
            title = `${booking.provider_name} declined your booking`;
            msg = `Your booking for ${booking.service || 'a service'} was declined. Try another helper.`;
        } else {
            notifyUserId = booking.customer_id;
            title = `Booking completed`;
            msg = `Your booking with ${booking.provider_name} is marked as completed.`;
        }

        const typeMap = { confirmed: 'booking_accepted', declined: 'booking_declined', completed: 'booking_completed', cancelled: 'booking_cancelled' };
        await createAndPush(notifyUserId, typeMap[status] || ('booking_' + status), title, msg, bookingId);

        // Also notify the customer when they cancel so it appears in their own bell
        if (status === 'cancelled' && booking.customer_id !== booking.provider_id) {
            await createAndPush(
                booking.customer_id,
                'booking_cancelled',
                `You cancelled your booking`,
                `Your booking for ${booking.service || 'a service'} with ${booking.provider_name || 'the helper'} has been cancelled.`,
                bookingId
            );
        }

        if (status === 'completed') {
            calculateTrustScore(booking.customer_id).catch(() => {});
            calculateTrustScore(booking.provider_id).catch(() => {});

            // Accumulate monthly booking value on the provider for GMV cap tracking
            const [[bRow]] = await pool.query('SELECT total_price FROM bookings WHERE id = ?', [bookingId]);
            if (bRow && bRow.total_price) {
                await pool.query(
                    `UPDATE users
                     SET monthly_booking_value = monthly_booking_value + ?
                     WHERE id = ?`,
                    [bRow.total_price, booking.provider_id]
                ).catch(() => {});
            }
        }
    }
}

async function getAllBookings() {
    const [rows] = await pool.query(
        `SELECT b.*,
                c.name AS customer_name, c.avatar AS customer_avatar,
                p.name AS provider_name, p.avatar AS provider_avatar
         FROM bookings b
         LEFT JOIN users c ON c.id = b.customer_id
         LEFT JOIN users p ON p.id = b.provider_id
         ORDER BY b.created_at DESC`
    );
    return rows;
}

module.exports = { createBooking, getBookingsByUser, markSeen, updateStatus, getAllBookings };

const pool = require('../db/pool');
const Anthropic = require('@anthropic-ai/sdk').default;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function streamChat(res, { provider_id, messages, user_id }) {
    if (!provider_id || !Array.isArray(messages)) {
        res.status(400).json({ success: false, error: 'provider_id and messages[] required' });
        return;
    }

    // Notify provider on first message in session
    if (messages.length === 1 && user_id && user_id !== provider_id) {
        try {
            const [[sender]] = await pool.query('SELECT name FROM users WHERE id = ?', [user_id]);
            const senderName = sender ? sender.name : 'Someone';
            await pool.execute(
                'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
                [provider_id, 'chat', '💬 New Chat Message', `${senderName} started a chat with your profile`]
            );
        } catch (e) { console.error('Chat notification error:', e.message); }
    }

    const [rows] = await pool.query(
        `SELECT name, bio, rating, rate, city, country, languages, years,
                availability, service_categories, phone
         FROM users WHERE id = ?`, [provider_id]
    );
    const p = rows[0];
    if (!p) {
        res.status(404).json({ success: false, error: 'Provider not found' });
        return;
    }

    const systemPrompt = `You are an AI assistant for ${p.name}, a service provider on Helpado.

Here is ${p.name}'s profile:
- Service: ${p.service_categories || 'General'}
- Rating: ${p.rating || 5}/5
- Rate: €${p.rate || 0}/hr
- Experience: ${p.years || 0} years
- Location: ${[p.city, p.country].filter(Boolean).join(', ') || 'Not specified'}
- Languages: ${p.languages || 'Not specified'}
- Availability: ${p.availability || 'Flexible'}
- About: ${p.bio || 'Professional service provider on Helpado.'}

Your job is to help users learn about ${p.name}, answer questions about their services, availability, and pricing. Be friendly, professional, and helpful. If asked about booking, tell them to use the Helpado booking system. Do not make up information not provided above.`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const stream = await anthropic.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.content }))
        });

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
            }
        }
        res.write('data: [DONE]\n\n');
    } catch (err) {
        console.error('Chat AI error:', err.message);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    }
    res.end();
}

module.exports = { streamChat };

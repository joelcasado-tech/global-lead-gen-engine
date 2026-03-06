import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import 'dotenv/config';
import { generateObject } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { z } from 'zod';

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allowing requests with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy: This origin is not allowed'), false);
    }
    return callback(null, true);
  }
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many leads processed. Take a coffee break!' }
});

app.use('/api/', limiter);

app.get('/', (req, res) => {
  res.send('Global Lead-Gen Engine is Live');
});

app.post('/api/triage', async (req, res) => {
  const { leadMessage } = req.body;

  try {
    const result = await generateObject({
      model: mistral('mistral-large-latest'),
      schema: z.object({
        language: z.string(),
        intent: z.enum(['Hot', 'Warm', 'Cold']),
        confidence_score: z.number().min(0).max(100),
        summary: z.string(),
        draft_response: z.string(),
      }),
      prompt: `Analyze this business inquiry: "${leadMessage}". Categorize intent, include a confidence_score (0-100) for the intent classification as an integer, summarize in 1 sentence, and draft a 3-sentence professional reply in the same language.`,
    });

    res.json(result.object);
  } catch (error) {
    console.error('AI Triage Error:', error);
    res.status(500).json({ error: 'Failed to process lead.' });
  }
});

app.post('/api/sync', async (req, res) => {
  const webhook = process.env.CRM_WEBHOOK || 'https://script.google.com/macros/s/AKfycby5nOKAlbibLqBMnPYnFtdoa22E3_aUJ_RFTPfxdW5mGlLj1XVzHoUIx_dWMIq4W-uz/exec';
  try {
    const resp = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.error('CRM webhook responded with error', resp.status, text);
      return res.status(502).json({ error: 'CRM webhook error', status: resp.status, body: text });
    }
    return res.json({ ok: true, status: resp.status, body: text });
  } catch (err) {
    console.error('Error relaying to CRM webhook:', err);
    return res.status(500).json({ error: 'Failed to reach CRM webhook', message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Engine running on port ${PORT}`));
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { generateObject } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/triage', async (req, res) => {
  const { leadMessage } = req.body;

  try {
    const result = await generateObject({
      model: mistral('mistral-large-latest'),
      schema: z.object({
        language: z.string(),
        intent: z.enum(['Hot', 'Warm', 'Cold']),
        summary: z.string(),
        draft_response: z.string(),
      }),
      prompt: `Analyze this business inquiry: "${leadMessage}". 
               Categorize intent, summarize in 1 sentence, and draft a 3-sentence professional reply in the same language.`,
    });

    res.json(result.object);
  } catch (error) {
    console.error("AI Triage Error:", error);
    res.status(500).json({ error: "Failed to process lead." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Engine running on port ${PORT}`));
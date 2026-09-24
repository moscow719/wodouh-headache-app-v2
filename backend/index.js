require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const redFlagQuestions = require('./data/redFlags');
const { getSpecialtyForType } = require('./data/specialties');

const app = express();
const PORT = 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running successfully');
});

app.get('/api/red-flags', (req, res) => {
  res.json(redFlagQuestions);
});

app.get('/api/test-ai', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const result = await model.generateContent('Say hello in one short sentence.');
    const text = result.response.text();
    res.json({ success: true, message: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyzes the user's free-text description of their headache symptoms.
// The AI only classifies the headache type from a FIXED list - it never
// decides the medical specialty itself. The specialty mapping is explicit
// code logic (see data/specialties.js), not an AI decision.
app.post('/api/analyze-symptoms', async (req, res) => {
  const { description } = req.body;

  if (!description || description.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Description is required' });
  }

  const systemInstructions = `
You are a headache-awareness assistant inside a medical triage tool.
The user has already been screened for emergency Red Flags and none were found.

FIRST, you must check: does the user's message actually describe a headache or head pain symptoms?
- If the message is unrelated to headaches (e.g. it describes pain in another body part, is a random sentence, a greeting, or has no medical content at all), you must set "isHeadacheRelated" to false, leave "analysis" as an empty string, "primaryType" as null, and "confidence" as 0.
- Only proceed with analysis if the message genuinely describes headache-related symptoms.

If it IS headache-related, follow these strict rules:
- Never give a final diagnosis. Only mention possible patterns with an approximate confidence level.
- Never recommend specific medications, dosages, or treatment plans.
- Never claim certainty. Always use cautious language like "may be consistent with" or "some overlap with".
- Always end the "analysis" text by reminding the user that only a doctor can confirm a real diagnosis.
- Keep the "analysis" text short: 3 to 5 sentences maximum.
- If the user writes in Arabic, write the "analysis" field in Arabic. If they write in English, write it in English.

You must respond ONLY with valid JSON in exactly this shape, with no extra text before or after it:
{
  "isHeadacheRelated": true or false,
  "analysis": "the short explanatory paragraph, or empty string if not headache-related",
  "primaryType": "one of: tension, migraine, cluster, sinus, eye_strain, dehydration, or null if not headache-related",
  "confidence": a number from 0 to 100, or 0 if not headache-related
}

The "primaryType" MUST be exactly one of the six listed values, chosen as the closest match, or null. Never invent a different value.
`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-lite-latest',
    systemInstruction: systemInstructions,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(description);
      const rawText = result.response.text();
      const parsed = JSON.parse(rawText);

      if (!parsed.isHeadacheRelated) {
        return res.json({
          success: true,
          isHeadacheRelated: false,
        });
      }

      const specialty = getSpecialtyForType(parsed.primaryType);

      return res.json({
        success: true,
        isHeadacheRelated: true,
        analysis: parsed.analysis,
        primaryType: parsed.primaryType,
        confidence: parsed.confidence,
        specialty,
      });
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);

      const isOverloaded = error.status === 503;
      const isLastAttempt = attempt === maxRetries;

      if (!isOverloaded || isLastAttempt) {
        return res.status(500).json({
          success: false,
          error: 'The AI service is currently unavailable. Please try again in a moment.',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
});
// Finds nearby doctors, clinics, and hospitals using OpenStreetMap's
// free Overpass API - no API key or credit card required.
app.get('/api/nearby-doctors', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
  }

  const radiusMeters = 5000;

  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"~"doctors|clinic|hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"~"doctors|clinic|hospital"](around:${radiusMeters},${lat},${lng});
    );
    out center 15;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'WodouhHeadacheApp/1.0',
        Accept: '*/*',
      },
      body: 'data=' + encodeURIComponent(overpassQuery),
    });

    if (!response.ok) {
      throw new Error(`Overpass API returned status ${response.status}`);
    }

    const data = await response.json();

    const places = data.elements
      .map((el) => {
        const coords = el.center || { lat: el.lat, lon: el.lon };
        return {
          name: el.tags?.name || 'غير معروف الاسم',
          type: el.tags?.amenity,
          lat: coords.lat,
          lon: coords.lon,
        };
      })
      .filter((place) => place.name !== 'غير معروف الاسم')
      .slice(0, 10);

    res.json({ success: true, places });
  } catch (error) {
    console.error('Overpass API error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch nearby places' });
  }
});
// A conversational assistant that can reference the user's latest
// assessment as context, but follows the same strict safety rules:
// no diagnosis, no medication advice, no treatment plans.
app.post('/api/chat', async (req, res) => {
  const { message, context, history } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  const contextText = context
    ? `The user's most recent assessment suggested a possible pattern of "${context.primaryType}" with ${context.confidence}% confidence. Recommended specialty: ${context.specialty?.en}.`
    : 'The user has no previous assessment on record.';

  const systemInstructions = `
You are a friendly, helpful assistant inside a headache-awareness tool called "Wodouh".

Context about this user:
${contextText}

You can chat naturally about anything the user brings up, even if it's not about headaches - be warm and conversational, like a helpful assistant would. If a question is completely unrelated to health, just answer it normally and briefly.

However, when the topic IS about headaches or the user's health, follow these strict rules:
- Never give a final diagnosis, even if asked directly.
- Never recommend specific medications, dosages, or treatment plans.
- Never claim certainty about the user's condition.
- Always encourage seeing a doctor for anything serious or persistent.
- If the user describes new severe or alarming symptoms (sudden severe pain, vision loss, confusion, weakness), tell them to seek emergency care immediately instead of continuing the conversation normally.

Keep responses conversational and concise: 2 to 4 sentences usually.
If the user writes in Arabic, reply in Arabic. If they write in English, reply in English.
Reply in plain text only, not JSON.
`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-lite-latest',
    systemInstruction: systemInstructions,
  });

  // Gemini requires the conversation history to start with a user message,
  // so we drop any leading assistant messages (like the initial greeting).
  const rawHistory = history || [];
  const firstUserIndex = rawHistory.findIndex((msg) => msg.role === 'user');
  const validHistory = firstUserIndex === -1 ? [] : rawHistory.slice(firstUserIndex);

  const chatHistory = validHistory.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(message);
      const text = result.response.text();
      return res.json({ success: true, reply: text });
    } catch (error) {
      console.error(`Chat attempt ${attempt} failed:`, error.message);

      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        return res.status(500).json({
          success: false,
          error: 'The AI service is currently unavailable. Please try again in a moment.',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
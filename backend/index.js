require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const redFlagQuestions = require('./data/redFlags');
const { getSpecialtyForType } = require('./data/specialties');

const app = express();

const PORT = process.env.PORT || 3000;

const allowedOrigin =
  process.env.FRONTEND_URL || 'http://localhost:5173';

const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_CHAT_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 2000;

const ALLOWED_HEADACHE_TYPES = new Set([
  'tension',
  'migraine',
  'cluster',
  'sinus',
  'eye_strain',
  'dehydration',
]);

const VALID_RED_FLAG_ANSWER_VALUES = new Set([
  'yes',
  'no',
  'unknown',
]);

const RED_FLAG_IDS = new Set(
  redFlagQuestions
    .filter(
      (question) =>
        question &&
        typeof question.id === 'string' &&
        question.id.trim().length > 0
    )
    .map((question) => question.id)
);

if (RED_FLAG_IDS.size === 0) {
  console.error(
    'No valid red flag questions are configured.'
  );
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error(
    'Missing GEMINI_API_KEY environment variable.'
  );
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

app.use(
  cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

app.use(express.json({ limit: '20kb' }));

// --------------------------------------------------
// Simple in-memory rate limiter
// --------------------------------------------------

const rateLimitStore = new Map();

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']
      ?.split(',')[0]
      ?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function rateLimit(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (
    !existing ||
    now - existing.start >= RATE_LIMIT_WINDOW_MS
  ) {
    rateLimitStore.set(ip, {
      start: now,
      count: 1,
    });

    return next();
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error:
        'Too many requests. Please try again in a moment.',
    });
  }

  existing.count += 1;

  return next();
}

setInterval(() => {
  const now = Date.now();

  for (const [ip, data] of rateLimitStore.entries()) {
    if (now - data.start >= RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS).unref();

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function isValidString(value, maxLength) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isValidLatitude(value) {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= -90 &&
    number <= 90
  );
}

function isValidLongitude(value) {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= -180 &&
    number <= 180
  );
}

function isValidConfidence(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function validateAIAnalysis(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }

  if (typeof parsed.isHeadacheRelated !== 'boolean') {
    return false;
  }

  if (typeof parsed.analysis !== 'string') {
    return false;
  }

  if (!isValidConfidence(parsed.confidence)) {
    return false;
  }

  if (
    parsed.primaryType !== null &&
    !ALLOWED_HEADACHE_TYPES.has(parsed.primaryType)
  ) {
    return false;
  }

  if (!parsed.isHeadacheRelated) {
    return (
      parsed.analysis === '' &&
      parsed.primaryType === null &&
      parsed.confidence === 0
    );
  }

  if (!parsed.primaryType) {
    return false;
  }

  if (parsed.analysis.trim().length === 0) {
    return false;
  }

  return true;
}

function validateRedFlagAnswers(redFlagAnswers) {
  if (!Array.isArray(redFlagAnswers)) {
    return {
      valid: false,
      code: 'INVALID_RED_FLAG_ANSWERS',
      message:
        'Red flag answers must be provided as an array.',
    };
  }

  if (redFlagAnswers.length !== RED_FLAG_IDS.size) {
    return {
      valid: false,
      code: 'INCOMPLETE_RED_FLAG_SCREENING',
      message:
        'All red flag screening questions must be answered.',
    };
  }

  const seenIds = new Set();

  for (const answer of redFlagAnswers) {
    if (
      !answer ||
      typeof answer !== 'object' ||
      typeof answer.id !== 'string' ||
      !VALID_RED_FLAG_ANSWER_VALUES.has(answer.answer)
    ) {
      return {
        valid: false,
        code: 'INVALID_RED_FLAG_ANSWERS',
        message:
          'Invalid red flag answer format.',
      };
    }

    const id = answer.id.trim();

    if (!RED_FLAG_IDS.has(id)) {
      return {
        valid: false,
        code: 'INVALID_RED_FLAG_QUESTION',
        message:
          'An unknown red flag question was submitted.',
      };
    }

    if (seenIds.has(id)) {
      return {
        valid: false,
        code: 'DUPLICATE_RED_FLAG_QUESTION',
        message:
          'A red flag question was submitted more than once.',
      };
    }

    seenIds.add(id);
  }

  if (seenIds.size !== RED_FLAG_IDS.size) {
    return {
      valid: false,
      code: 'INCOMPLETE_RED_FLAG_SCREENING',
      message:
        'All red flag screening questions must be answered.',
    };
  }

  const hasPositiveAnswer = redFlagAnswers.some(
    (answer) => answer.answer === 'yes'
  );

  if (hasPositiveAnswer) {
    return {
      valid: false,
      emergency: true,
      code: 'RED_FLAG_TRIGGERED',
      message:
        'A red flag was identified during screening. Urgent medical evaluation is recommended.',
    };
  }

  return {
    valid: true,
    emergency: false,
    uncertainQuestionIds: redFlagAnswers
      .filter((answer) => answer.answer === 'unknown')
      .map((answer) => answer.id),
  };
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((msg) => {
      return (
        msg &&
        typeof msg === 'object' &&
        (msg.role === 'user' ||
          msg.role === 'model' ||
          msg.role === 'assistant') &&
        typeof msg.text === 'string' &&
        msg.text.trim().length > 0 &&
        msg.text.length <= MAX_HISTORY_MESSAGE_LENGTH
      );
    })
    .slice(-MAX_HISTORY_MESSAGES);
}

function buildContextText(context) {
  if (!context || typeof context !== 'object') {
    return 'The user has no previous assessment on record.';
  }

  const primaryType = ALLOWED_HEADACHE_TYPES.has(
    context.primaryType
  )
    ? context.primaryType
    : 'unknown';

  const confidence = isValidConfidence(
    context.confidence
  )
    ? context.confidence
    : 'unknown';

  let specialty = 'not specified';

  if (
    context.specialty &&
    typeof context.specialty === 'object' &&
    typeof context.specialty.en === 'string' &&
    context.specialty.en.length <= 500
  ) {
    specialty = context.specialty.en;
  }

  const contextText = `The user's most recent assessment suggested a possible pattern of "${primaryType}" with ${confidence}% pattern-match confidence. Recommended specialty: ${specialty}.`;

  return contextText.slice(0, MAX_CONTEXT_LENGTH);
}

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is running successfully',
  });
});

// --------------------------------------------------
// Red flags
// --------------------------------------------------

app.get('/api/red-flags', (req, res) => {
  res.json(redFlagQuestions);
});

// --------------------------------------------------
// Development-only AI test endpoint
// --------------------------------------------------

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test-ai', async (req, res) => {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-lite-latest',
      });

      const result = await model.generateContent(
        'Say hello in one short sentence.'
      );

      const text = result.response.text();

      res.json({
        success: true,
        message: text,
      });
    } catch (error) {
      console.error(
        'Test AI error:',
        error.message
      );

      res.status(500).json({
        success: false,
        error: 'AI test failed',
      });
    }
  });
}

// --------------------------------------------------
// Analyze headache symptoms
// --------------------------------------------------

app.post(
  '/api/analyze-symptoms',
  rateLimit,
  async (req, res) => {
    const {
      description,
      redFlagAnswers,
    } = req.body || {};

    if (typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Description must be a text value',
      });
    }

    const trimmedDescription = description.trim();

    if (trimmedDescription.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Description is required',
      });
    }

    if (
      trimmedDescription.length >
      MAX_DESCRIPTION_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`,
      });
    }

    // --------------------------------------------------
    // Server-side red flag gate
    // This MUST happen before any AI analysis.
    // --------------------------------------------------

    const redFlagValidation =
      validateRedFlagAnswers(redFlagAnswers);

    if (!redFlagValidation.valid) {
      if (redFlagValidation.emergency) {
        return res.status(409).json({
          success: false,
          emergency: true,
          code: redFlagValidation.code,
          error: redFlagValidation.message,
        });
      }

      return res.status(400).json({
        success: false,
        emergency: false,
        code: redFlagValidation.code,
        error: redFlagValidation.message,
      });
    }

    const uncertainQuestions = redFlagQuestions
      .filter((question) =>
        redFlagValidation.uncertainQuestionIds.includes(question.id)
      )
      .map((question) => question.question);

    const uncertaintyInstruction =
      uncertainQuestions.length > 0
        ? `
SCREENING UNCERTAINTY:

The user was unsure about one or more urgent warning-sign questions: ${uncertainQuestions.join('; ')}.
Do not treat these warning signs as absent or say that the screening ruled them out.
Avoid reassurance based on the screening and advise the user to seek medical evaluation if the uncertain symptom may be present or symptoms are severe or worsening.
`
        : '';

    const systemInstructions = `
You are a headache-awareness assistant inside a medical triage tool.

IMPORTANT SAFETY RULES:

- You are NOT a doctor.
- Never provide a final diagnosis.
- Never claim certainty.
- Never recommend specific medications, dosages, or treatment plans.
- Only describe possible symptom patterns.
- The confidence value is only an approximate pattern-match score, NOT a medical probability or diagnostic certainty.
- If symptoms sound severe, sudden, alarming, or potentially emergent, do not reassure the user that the condition is harmless.
- The application separately handles emergency red-flag screening BEFORE this AI analysis.

FIRST, determine whether the user's message actually describes headache or head-pain symptoms.

If the message is unrelated to headaches, describes another body part, is a greeting, is random text, or contains no meaningful medical information:

- isHeadacheRelated = false
- analysis = ""
- primaryType = null
- confidence = 0

Only proceed with headache-pattern analysis if the message genuinely describes headache-related symptoms.

If it IS headache-related:

- Use only one of these primaryType values:
  tension, migraine, cluster, sinus, eye_strain, dehydration
- Never invent another type.
- Ensure every sentence in analysis is consistent with primaryType; do not describe a different headache pattern as though it supports the selected type.
- Use cautious language such as "may be consistent with" or "some overlap with".
- Keep analysis between 3 and 5 sentences maximum.
- Always end the analysis by reminding the user that only a doctor can confirm a real diagnosis.
- If the user writes in Arabic, write the analysis in Arabic.
- If the user writes in English, write the analysis in English.
${uncertaintyInstruction}

You must respond ONLY with valid JSON in exactly this shape:

{
  "isHeadacheRelated": true or false,
  "analysis": "short explanatory paragraph, or empty string if not headache-related",
  "primaryType": "tension, migraine, cluster, sinus, eye_strain, dehydration, or null",
  "confidence": 0 to 100
}
`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-lite-latest',
      systemInstruction: systemInstructions,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const maxRetries = 3;

    for (
      let attempt = 1;
      attempt <= maxRetries;
      attempt++
    ) {
      try {
        const result =
          await model.generateContent(
            trimmedDescription
          );

        const rawText = result.response.text();

        let parsed;

        try {
          parsed = JSON.parse(rawText);
        } catch (parseError) {
          console.error(
            'Invalid JSON returned by Gemini:',
            parseError.message
          );

          throw new Error(
            'Invalid AI response format'
          );
        }

        if (!validateAIAnalysis(parsed)) {
          console.error(
            'AI response failed validation:',
            parsed
          );

          throw new Error(
            'AI response failed validation'
          );
        }

        if (!parsed.isHeadacheRelated) {
          return res.json({
            success: true,
            isHeadacheRelated: false,
          });
        }

        let specialty;

        try {
          specialty = getSpecialtyForType(
            parsed.primaryType
          );
        } catch (specialtyError) {
          console.error(
            'Specialty mapping error:',
            specialtyError.message
          );

          specialty = null;
        }

        return res.json({
          success: true,
          isHeadacheRelated: true,
          analysis: parsed.analysis,
          primaryType: parsed.primaryType,
          confidence: parsed.confidence,
          specialty,
        });
      } catch (error) {
        console.error(
          `Symptom analysis attempt ${attempt} failed:`,
          error.message
        );

        const isOverloaded =
          error.status === 503 ||
          error.status === 429 ||
          /overload|rate limit/i.test(
            error.message || ''
          );

        const isLastAttempt =
          attempt === maxRetries;

        if (!isOverloaded || isLastAttempt) {
          return res.status(500).json({
            success: false,
            error:
              'The AI service is currently unavailable. Please try again in a moment.',
          });
        }

        const delay = attempt * 2000;

        await new Promise((resolve) =>
          setTimeout(resolve, delay)
        );
      }
    }

    return res.status(500).json({
      success: false,
      error:
        'Unable to analyze symptoms at this time.',
    });
  }
);

// --------------------------------------------------
// Nearby doctors / clinics / hospitals
// --------------------------------------------------

app.get('/api/nearby-doctors', async (req, res) => {
  const { lat, lng } = req.query;

  if (
    !isValidLatitude(lat) ||
    !isValidLongitude(lng)
  ) {
    return res.status(400).json({
      success: false,
      error:
        'Valid latitude and longitude are required',
    });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  const radiusMeters = 5000;

  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"~"doctors|clinic|hospital"](around:${radiusMeters},${latitude},${longitude});
      way["amenity"~"doctors|clinic|hospital"](around:${radiusMeters},${latitude},${longitude});
    );
    out center 15;
  `;

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    30000
  );

  try {
    const response = await fetch(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
          'User-Agent':
            'WodouhHeadacheApp/1.0',
          Accept: 'application/json',
        },
        body:
          'data=' +
          encodeURIComponent(overpassQuery),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Overpass API returned status ${response.status}`
      );
    }

    const data = await response.json();

    if (
      !data ||
      !Array.isArray(data.elements)
    ) {
      throw new Error(
        'Invalid response from Overpass API'
      );
    }

    const places = data.elements
      .map((el) => {
        const coords = el.center || {
          lat: el.lat,
          lon: el.lon,
        };

        return {
          name:
            el.tags?.name ||
            'غير معروف الاسم',
          type: el.tags?.amenity,
          lat: coords.lat,
          lon: coords.lon,
        };
      })
      .filter(
        (place) =>
          place.name !== 'غير معروف الاسم' &&
          Number.isFinite(Number(place.lat)) &&
          Number.isFinite(Number(place.lon))
      )
      .slice(0, 10);

    return res.json({
      success: true,
      places,
    });
  } catch (error) {
    console.error(
      'Overpass API error:',
      error.message
    );

    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error:
          'Nearby places service timed out',
      });
    }

    return res.status(500).json({
      success: false,
      error:
        'Failed to fetch nearby places',
    });
  } finally {
    clearTimeout(timeout);
  }
});

// --------------------------------------------------
// Conversational AI assistant
// --------------------------------------------------

app.post('/api/chat', rateLimit, async (req, res) => {
  const {
    message,
    context,
    history,
  } = req.body || {};

  if (typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Message must be a text value',
    });
  }

  const trimmedMessage = message.trim();

  if (trimmedMessage.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Message is required',
    });
  }

  if (
    trimmedMessage.length >
    MAX_CHAT_MESSAGE_LENGTH
  ) {
    return res.status(400).json({
      success: false,
      error: `Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer`,
    });
  }

  const contextText = buildContextText(context);

  const sanitizedHistory =
    sanitizeHistory(history);

  const firstUserIndex =
    sanitizedHistory.findIndex(
      (msg) => msg.role === 'user'
    );

  const validHistory =
    firstUserIndex === -1
      ? []
      : sanitizedHistory.slice(firstUserIndex);

  const chatHistory = validHistory.map(
    (msg) => ({
      role:
        msg.role === 'assistant'
          ? 'model'
          : msg.role,
      parts: [
        {
          text: msg.text,
        },
      ],
    })
  );

  const systemInstructions = `
You are a friendly assistant inside a headache-awareness tool called "NeuroPath".

Context about the user's latest assessment:

${contextText}

IMPORTANT SAFETY RULES:

- You are NOT a doctor.
- Never provide a final diagnosis.
- Never recommend specific medications, dosages, or treatment plans.
- Never claim certainty about a medical condition.
- Do not present the assessment's confidence score as a medical probability.
- When discussing headache symptoms, describe possibilities cautiously.
- Encourage medical evaluation for serious, persistent, worsening, or unusual symptoms.
- If the user describes sudden severe headache, new weakness, confusion, loss of consciousness, major vision loss, seizure, or another potentially emergency symptom, advise them to seek emergency medical care immediately.
- Do not attempt to rule out an emergency condition through chat.

The user may also ask completely unrelated questions. For non-health topics, answer naturally and briefly.

Keep responses conversational and concise: usually 2 to 4 sentences.

If the user writes in Arabic, reply in Arabic.

If the user writes in English, reply in English.

Reply in plain text only, not JSON.
`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-lite-latest',
    systemInstruction:
      systemInstructions,
  });

  const maxRetries = 3;

  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt++
  ) {
    try {
      const chat = model.startChat({
        history: chatHistory,
      });

      const result =
        await chat.sendMessage(
          trimmedMessage
        );

      const text =
        result.response.text();

      if (
        !text ||
        text.trim().length === 0
      ) {
        throw new Error(
          'Empty AI response'
        );
      }

      return res.json({
        success: true,
        reply: text.trim(),
      });
    } catch (error) {
      console.error(
        `Chat attempt ${attempt} failed:`,
        error.message
      );

      const isOverloaded =
        error.status === 503 ||
        error.status === 429 ||
        /overload|rate limit/i.test(
          error.message || ''
        );

      const isLastAttempt =
        attempt === maxRetries;

      if (
        !isOverloaded ||
        isLastAttempt
      ) {
        return res.status(500).json({
          success: false,
          error:
            'The AI service is currently unavailable. Please try again in a moment.',
        });
      }

      const delay = attempt * 2000;

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }

  return res.status(500).json({
    success: false,
    error:
      'Unable to process the message at this time.',
  });
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `Server is running on port ${PORT}`
    );
  });
}

module.exports = app;
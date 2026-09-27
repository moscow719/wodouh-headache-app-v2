import { useEffect, useRef, useState } from 'react';
import { getLatestAssessment } from '../utils/storage';
import { API_URL } from '../config';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CHAT_MESSAGES = 20;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;

const INITIAL_MESSAGE = Object.freeze({
  role: 'model',
  text:
    'أهلًا، اسألني عن الصداع أو عن المعلومات المسجلة عندك، وأنا هساعدك تفهمها بشكل عام. المساعد مش بديل عن الطبيب ومش بيقدّم تشخيصًا نهائيًا.',
});

function isValidChatMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    !Array.isArray(message) &&
    (message.role === 'user' ||
      message.role === 'model') &&
    typeof message.text === 'string' &&
    message.text.trim().length > 0 &&
    message.text.length <=
      MAX_HISTORY_MESSAGE_LENGTH
  );
}

function sanitizeChatMessage(message) {
  if (!isValidChatMessage(message)) {
    return null;
  }

  return {
    role: message.role,
    text: message.text
      .trim()
      .slice(
        0,
        MAX_HISTORY_MESSAGE_LENGTH
      ),
  };
}

function sanitizeHistory(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map(sanitizeChatMessage)
    .filter(Boolean)
    .slice(-MAX_CHAT_MESSAGES);
}

function sanitizeContext(context) {
  if (
    !context ||
    typeof context !== 'object' ||
    Array.isArray(context)
  ) {
    return null;
  }

  const safeContext = {};

  if (
    typeof context.primaryType ===
      'string' &&
    context.primaryType.length <= 100
  ) {
    safeContext.primaryType =
      context.primaryType;
  }

  if (
    typeof context.confidence ===
      'number' &&
    Number.isFinite(
      context.confidence
    ) &&
    context.confidence >= 0 &&
    context.confidence <= 100
  ) {
    safeContext.confidence =
      context.confidence;
  }

  if (
    context.specialty &&
    typeof context.specialty ===
      'object' &&
    !Array.isArray(
      context.specialty
    )
  ) {
    const specialty = {};

    if (
      typeof context.specialty.ar ===
        'string' &&
      context.specialty.ar.length <= 100
    ) {
      specialty.ar =
        context.specialty.ar;
    }

    if (
      typeof context.specialty.en ===
        'string' &&
      context.specialty.en.length <= 100
    ) {
      specialty.en =
        context.specialty.en;
    }

    if (
      Object.keys(specialty)
        .length > 0
    ) {
      safeContext.specialty =
        specialty;
    }
  }

  return Object.keys(safeContext)
    .length > 0
    ? safeContext
    : null;
}

function Assistant() {
  const [messages, setMessages] =
    useState([INITIAL_MESSAGE]);

  const [input, setInput] =
    useState('');

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState(null);

  const abortControllerRef =
    useRef(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function handleSend() {
    if (sending) {
      return;
    }

    const normalizedInput =
      input.trim();

    if (!normalizedInput) {
      return;
    }

    if (
      normalizedInput.length >
      MAX_MESSAGE_LENGTH
    ) {
      setError(
        `السؤال طويل جدًا. الحد الأقصى ${MAX_MESSAGE_LENGTH} حرف.`
      );
      return;
    }

    setError(null);

    const userMessage = {
      role: 'user',
      text: normalizedInput,
    };

    const previousMessages =
      messages.filter(
        isValidChatMessage
      );

    const updatedMessages = [
      ...previousMessages,
      userMessage,
    ];

    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    const controller =
      new AbortController();

    abortControllerRef.current =
      controller;

    try {
      let context = null;

      try {
        const latestAssessment =
          await getLatestAssessment();

        context =
          sanitizeContext(
            latestAssessment
          );
      } catch (contextError) {
        console.error(
          'Failed to load latest assessment for chat:',
          contextError
        );
      }

      const history =
        sanitizeHistory(
          previousMessages
        );

      const response = await fetch(
        `${API_URL}/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            message:
              normalizedInput,
            context,
            history,
          }),
          signal:
            controller.signal,
        }
      );

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          'Invalid server response'
        );
      }

      if (
        !response.ok ||
        !data?.success ||
        typeof data.reply !==
          'string' ||
        !data.reply.trim()
      ) {
        throw new Error(
          typeof data?.error ===
            'string'
            ? data.error
            : 'Chat request failed'
        );
      }

      setMessages((previous) => [
        ...previous
          .filter(
            isValidChatMessage
          )
          .slice(
            -(
              MAX_CHAT_MESSAGES - 1
            )
          ),
        {
          role: 'model',
          text: data.reply
            .trim()
            .slice(
              0,
              MAX_MESSAGE_LENGTH
            ),
        },
      ]);
    } catch (err) {
      if (
        err?.name ===
        'AbortError'
      ) {
        return;
      }

      console.error(
        'Assistant request failed:',
        err
      );

      setError(
        'تعذر الحصول على رد من المساعد حاليًا.'
      );

      setMessages((previous) => [
        ...previous
          .filter(
            isValidChatMessage
          )
          .slice(
            -(
              MAX_CHAT_MESSAGES - 1
            )
          ),
        {
          role: 'model',
          text:
            'مش قادر أوصل للمساعد حاليًا. حاول تاني بعد شوية، ولو عندك أعراض شديدة أو مفاجئة ما تعتمدش على المساعد واطلب تقييمًا طبيًا عاجلًا.',
        },
      ]);
    } finally {
      if (
        abortControllerRef.current ===
        controller
      ) {
        abortControllerRef.current =
          null;
      }

      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (!sending) {
        handleSend();
      }
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>
            المساعد الذكي
          </h1>

          <p className="muted-text">
            اسأل عن الصداع أو عن المعلومات
            المسجلة عندك. الإجابات للتوعية
            العامة ومش تشخيص طبي.
          </p>
        </div>
      </div>

      <div
        className="card medication-note"
        role="note"
        style={{
          marginBottom: 18,
        }}
      >
        <strong>مهم:</strong>{' '}
        المساعد لا يحدد جرعات الأدوية،
        ولا يؤكد تشخيصًا، ولا يغني عن
        تقييم الطبيب. لو عندك أعراض شديدة
        أو مفاجئة أو علامة خطر، اطلب
        المساعدة الطبية العاجلة بدل
        الاعتماد على المحادثة.
      </div>

      <div className="card chat-card">
        <div
          className="chat-messages"
          role="log"
          aria-live="polite"
          aria-label="محادثة المساعد الذكي"
          aria-busy={sending}
        >
          {messages
            .filter(
              isValidChatMessage
            )
            .map(
              (
                message,
                index
              ) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`bubble ${
                    message.role ===
                    'user'
                      ? 'user'
                      : 'bot'
                  }`}
                >
                  {message.text}
                </div>
              )
            )}

          {sending && (
            <div
              className="bubble bot"
              role="status"
              aria-live="polite"
            >
              جارٍ الكتابة...
            </div>
          )}
        </div>

        {error && (
          <p
            className="analysis-error"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}

        <div className="chat-input-row">
          <label
            htmlFor="assistant-message"
            className="sr-only"
          >
            اكتب سؤالك للمساعد
          </label>

          <textarea
            id="assistant-message"
            className="chat-input"
            placeholder="اكتب سؤالك هنا..."
            value={input}
            onChange={(event) => {
              setInput(
                event.target.value.slice(
                  0,
                  MAX_MESSAGE_LENGTH
                )
              );

              if (error) {
                setError(null);
              }
            }}
            onKeyDown={
              handleKeyDown
            }
            rows={2}
            maxLength={
              MAX_MESSAGE_LENGTH
            }
            aria-describedby="assistant-message-limit"
            disabled={sending}
          />

          <button
            type="button"
            className="btn primary"
            onClick={handleSend}
            disabled={
              sending ||
              !input.trim()
            }
            aria-busy={sending}
          >
            {sending
              ? 'جارٍ الإرسال...'
              : 'إرسال'}
          </button>
        </div>

        <p
          id="assistant-message-limit"
          className="muted-text"
          style={{
            marginTop: 8,
          }}
        >
          {input.length} /{' '}
          {MAX_MESSAGE_LENGTH}{' '}
          حرف — اضغط Enter للإرسال أو
          Shift + Enter لسطر جديد.
        </p>
      </div>
    </div>
  );
}

export default Assistant;
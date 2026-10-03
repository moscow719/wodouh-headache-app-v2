import { useEffect, useRef, useState } from 'react';
import { getLatestAssessment } from '../utils/storage';
import { API_URL } from '../config';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CHAT_MESSAGES = 20;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;
const SUGGESTED_QUESTIONS = Object.freeze([
  'ما الفرق بين الصداع العنقودي والصداع النصفي؟',
  'ما المحفزات الشائعة للصداع؟',
  'ماذا أخبر طبيبي في الزيارة؟',
]);

const INITIAL_MESSAGE = Object.freeze({
  role: 'model',
  text:
    'أهلًا بك. يمكنني مساعدتك على فهم المعلومات المسجلة لديك والإجابة عن أسئلتك العامة حول الصداع. أنا مساعد ذكاء اصطناعي، ولست بديلًا عن الطبيب ولا أقدم تشخيصًا طبيًا.',
});

function normalizeForEmergencyCheck(text) {
  return text
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function mayDescribeEmergency(text) {
  const normalized = normalizeForEmergencyCheck(text);
  const neurologicalSymptoms =
    /(?:^|\s)(?:ضعف|تنميل|خدر|شلل|تشنج|اغماء|فقدان الوعي|صعوبة في الكلام|ثقل اللسان|اضطراب الرؤيه|فقدان الرؤيه)(?:$|\s)/u;
  const severeSuddenHeadache =
    /صداع.{0,45}(?:مفاجئ|شديد|قوي جدا|فظيع|اشد|الاسوا)|(?:مفاجئ|شديد|قوي جدا|فظيع|اشد|الاسوا).{0,45}صداع/u;

  return (
    neurologicalSymptoms.test(normalized) ||
    severeSuddenHeadache.test(normalized)
  );
}

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

  const messagesEndRef = useRef(null);
  const abortControllerRef =
    useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      block: 'end',
      behavior: 'smooth',
    });
  }, [messages, sending]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function handleSend(question = input) {
    if (sending) {
      return;
    }

    const normalizedInput = question.trim();

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
      ).slice(-(MAX_CHAT_MESSAGES - 1));

    const updatedMessages = [
      ...previousMessages,
      userMessage,
    ];

    if (mayDescribeEmergency(normalizedInput)) {
      setMessages([
        ...updatedMessages.slice(
          -(MAX_CHAT_MESSAGES - 1)
        ),
        {
          role: 'model',
          emergency: true,
          text:
            'قد تشير الأعراض التي وصفتها إلى حالة تستدعي تقييمًا عاجلًا. اطلب المساعدة الطبية العاجلة الآن عبر خدمات الطوارئ المحلية أو توجّه إلى أقرب قسم طوارئ. لا تقد السيارة بنفسك، واطلب من شخص قريب البقاء معك. هذا التنبيه احترازي ولا يشخّص حالتك.',
        },
      ]);
      setInput('');
      setError(null);
      return;
    }

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
            'تعذر الاتصال بالمساعد حاليًا. حاول مرة أخرى لاحقًا. إذا كانت لديك أعراض شديدة أو مفاجئة، فاطلب المساعدة الطبية العاجلة ولا تنتظر رد المساعد.',
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

  return (
    <div className="assistant-page">
      <div className="assistant-scroll">
        <header className="assistant-heading">
          <h1>مساعد وضوح</h1>
          <p>
            ذكاء اصطناعي للإجابة عن أسئلتك العامة حول الصداع
          </p>
        </header>

        <div
          className="assistant-safety-notice"
          role="note"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M12 3 2.8 20h18.4L12 3Z" />
            <path d="M12 9v5m0 3h.01" />
          </svg>
          <div>
            <strong>
              إذا كانت أعراضك شديدة أو مفاجئة، فاطلب مساعدة طبية عاجلة.
            </strong>
            <p>
              الإجابات للتوعية العامة فقط؛ لا تشخّص الحالة ولا تحدد جرعات الأدوية، وقد لا يرصد التنبيه كل الحالات.
            </p>
          </div>
        </div>

        <div
          className="chat-messages"
          role="log"
          aria-live="polite"
          aria-label="محادثة مساعد وضوح"
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
                message.role === 'user' ? (
                  <div
                    key={`${message.role}-${index}`}
                    className="bubble user"
                  >
                    {message.text}
                  </div>
                ) : (
                  <article
                    key={`${message.role}-${index}`}
                    className={`assistant-reply${
                      message.emergency
                        ? ' assistant-emergency'
                        : ''
                    }`}
                    role={message.emergency ? 'alert' : undefined}
                  >
                    <div className="assistant-reply-label">
                      <span>مساعد وضوح، ذكاء اصطناعي</span>
                      <span>إجابة عامة للتوعية، وليست تشخيصًا</span>
                    </div>
                    {message.emergency && (
                      <h2>اطلب مساعدة طبية عاجلة</h2>
                    )}
                    <p>{message.text}</p>
                  </article>
                )
              )
            )}

          {messages.length === 1 && (
            <section
              className="assistant-suggestions"
              aria-label="أسئلة مقترحة"
            >
              <h2>يمكنك البدء بأحد هذه الأسئلة</h2>
              <div className="assistant-suggestion-list">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="assistant-suggestion"
                    onClick={() => handleSend(question)}
                    disabled={sending}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </section>
          )}

          {sending && (
            <article
              className="assistant-reply"
              role="status"
              aria-live="polite"
            >
              <div className="assistant-reply-label">
                <span>مساعد وضوح، ذكاء اصطناعي</span>
                <span>إجابة عامة للتوعية، وليست تشخيصًا</span>
              </div>
              <p>جارٍ إعداد الرد...</p>
            </article>
          )}
          <div ref={messagesEndRef} />
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
      </div>

      <form
        className="chat-input-row"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
      >
        <label
          htmlFor="assistant-message"
          className="sr-only"
        >
          اكتب سؤالك
        </label>
        <input
          type="text"
          id="assistant-message"
          className="chat-input"
          placeholder="اكتب سؤالك"
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
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={sending}
        />
        <button
          type="submit"
          className="assistant-send-button"
          disabled={sending || !input.trim()}
          aria-label="إرسال السؤال"
          aria-busy={sending}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m22 2-7 20-4-9-9-4 20-7Z" />
            <path d="M22 2 11 13" />
          </svg>
          <span className="sr-only">إرسال</span>
        </button>
      </form>
      <p className="assistant-privacy-note">
        تُرسل رسالتك وملخص تقييمك الأخير إلى خدمة الذكاء الاصطناعي لمعالجة الرد.
        لا يحفظ التطبيق سجل المحادثة بعد مغادرة الصفحة؛ وقد يعالج مزوّد الخدمة
        البيانات وفق سياساته.
      </p>
    </div>
  );
}

export default Assistant;
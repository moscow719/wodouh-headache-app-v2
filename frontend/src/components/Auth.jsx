import { useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;

function translateError(message = '') {
  const normalizedMessage =
    String(message).toLowerCase();

  if (
    normalizedMessage.includes(
      'invalid login credentials'
    ) ||
    normalizedMessage.includes(
      'invalid credentials'
    )
  ) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }

  if (
    normalizedMessage.includes(
      'already registered'
    ) ||
    normalizedMessage.includes(
      'user already registered'
    )
  ) {
    return 'البريد الإلكتروني مسجل بالفعل، جرّب تسجل دخول.';
  }

  if (
    normalizedMessage.includes(
      'password should be'
    ) ||
    normalizedMessage.includes(
      'password must'
    ) ||
    normalizedMessage.includes(
      'password is too short'
    )
  ) {
    return `كلمة المرور قصيرة جدًا، لازم تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`;
  }

  if (
    normalizedMessage.includes(
      'email'
    ) &&
    (
      normalizedMessage.includes(
        'invalid'
      ) ||
      normalizedMessage.includes(
        'format'
      )
    )
  ) {
    return 'من فضلك تأكد من صحة البريد الإلكتروني.';
  }

  if (
    normalizedMessage.includes(
      'rate limit'
    ) ||
    normalizedMessage.includes(
      'too many'
    )
  ) {
    return 'محاولات كثيرة في وقت قصير. استنى شوية وحاول تاني.';
  }

  if (
    normalizedMessage.includes(
      'email not confirmed'
    )
  ) {
    return 'لازم تأكد بريدك الإلكتروني قبل تسجيل الدخول.';
  }

  return 'حصل خطأ أثناء العملية، حاول تاني.';
}

function isValidEmail(email) {
  if (
    typeof email !== 'string' ||
    !email ||
    email.length >
      MAX_EMAIL_LENGTH
  ) {
    return false;
  }

  const basicEmailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return basicEmailPattern.test(
    email
  );
}

function Auth() {
  const [isSignUp, setIsSignUp] =
    useState(false);

  const [
    isForgotPassword,
    setIsForgotPassword,
  ] = useState(false);

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [
    infoMessage,
    setInfoMessage,
  ] = useState(null);

  const [emailError, setEmailError] =
    useState(null);

  const [passwordError, setPasswordError] =
    useState(null);

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  function resetMessages() {
    setError(null);
    setInfoMessage(null);
    setEmailError(null);
    setPasswordError(null);
  }

  function resetPasswordField() {
    setPassword('');
    setShowPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    resetMessages();

    if (!isSignUp && !isForgotPassword) {
      let firstInvalidField = null;

      if (!isValidEmail(normalizedEmail)) {
        setEmailError(
          'أدخل بريداً إلكترونياً صحيحاً.'
        );
        firstInvalidField = emailInputRef;
      }

      if (password.length < MIN_PASSWORD_LENGTH) {
        setPasswordError(
          'يجب ألا تقل كلمة المرور عن 6 أحرف.'
        );
        firstInvalidField ??= passwordInputRef;
      }

      if (firstInvalidField) {
        firstInvalidField.current?.focus();
        return;
      }
    }

    if (!normalizedEmail) {
      setError(
        'من فضلك اكتب البريد الإلكتروني.'
      );
      return;
    }

    if (
      normalizedEmail.length >
      MAX_EMAIL_LENGTH
    ) {
      setError(
        'البريد الإلكتروني طويل جدًا.'
      );
      return;
    }

    if (
      !isValidEmail(
        normalizedEmail
      )
    ) {
      setError(
        'أدخل بريداً إلكترونياً صحيحاً.'
      );
      return;
    }

    if (
      !isForgotPassword &&
      password.length <
        MIN_PASSWORD_LENGTH
    ) {
      setError(
        'يجب ألا تقل كلمة المرور عن 6 أحرف.'
      );
      return;
    }

    if (
      !isForgotPassword &&
      password.length >
        MAX_PASSWORD_LENGTH
    ) {
      setError(
        `كلمة المرور طويلة جدًا. الحد الأقصى ${MAX_PASSWORD_LENGTH} حرف.`
      );
      return;
    }

    setLoading(true);

    try {
      if (isForgotPassword) {
        const {
          error: resetError,
        } =
          await supabase.auth.resetPasswordForEmail(
            normalizedEmail,
            {
              redirectTo:
                `${window.location.origin}/reset-password`,
            }
          );

        if (resetError) {
          setError(
            translateError(
              resetError.message
            )
          );
          return;
        }

        setInfoMessage(
          'لو البريد الإلكتروني مرتبط بحساب، هيوصلك عليه رابط لإعادة تعيين كلمة المرور. راجع كمان مجلد الرسائل غير المرغوب فيها.'
        );

        return;
      }

      if (isSignUp) {
        const {
          data,
          error: signUpError,
        } =
          await supabase.auth.signUp({
            email:
              normalizedEmail,
            password,
          });

        if (signUpError) {
          setError(
            translateError(
              signUpError.message
            )
          );
          return;
        }

        if (
          data?.session
        ) {
          setInfoMessage(
            'تم إنشاء الحساب وتسجيل الدخول بنجاح.'
          );
        } else {
          setInfoMessage(
            'تم إنشاء الحساب بنجاح. لو مطلوب تأكيد البريد الإلكتروني، راجع بريدك قبل تسجيل الدخول.'
          );
        }

        setIsSignUp(false);
        setIsForgotPassword(
          false
        );
        resetPasswordField();
      } else {
        const {
          error: signInError,
        } =
          await supabase.auth.signInWithPassword(
            {
              email:
                normalizedEmail,
              password,
            }
          );

        if (signInError) {
          setError(
            'تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور ثم حاول مرة أخرى.'
          );
        }
      }
    } catch (err) {
      console.error(
        'Authentication operation failed:',
        err
      );

      setError(
        !isSignUp && !isForgotPassword
          ? 'تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور ثم حاول مرة أخرى.'
          : 'تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.'
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    if (loading) {
      return;
    }

    setIsForgotPassword(
      false
    );

    setIsSignUp(
      (previous) => !previous
    );

    resetMessages();
    resetPasswordField();
  }

  function openForgotPassword() {
    if (loading) {
      return;
    }

    setIsForgotPassword(
      true
    );

    setIsSignUp(false);

    resetMessages();
    resetPasswordField();
  }

  function backToLogin() {
    if (loading) {
      return;
    }

    setIsForgotPassword(
      false
    );

    setIsSignUp(false);

    resetMessages();
    resetPasswordField();
  }

  let title =
    'تسجيل الدخول';

  if (isForgotPassword) {
    title =
      'استعادة كلمة المرور';
  } else if (isSignUp) {
    title =
      'إنشاء حساب جديد';
  }

  const isLogin = !isSignUp && !isForgotPassword;

  return (
    <main className={`auth-page${isLogin ? ' auth-page-login' : ''}`}>
      <div className="auth-decor auth-decor-top" aria-hidden="true" />
      <div className="auth-decor auth-decor-bottom" aria-hidden="true" />

      <div className="auth-layout" aria-busy={loading}>
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-brand">
            <svg
              width="44"
              height="44"
              viewBox="0 0 100 100"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="9"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M8 70C30 70 44 66 54 50C64 34 56 18 44 22C32 26 36 46 54 52" stroke="currentColor" />
              <path d="M54 52C68 57 76 56 86 56" stroke="#14A8A0" />
              <circle cx="93" cy="56" r="6" fill="#14A8A0" stroke="none" />
            </svg>
            <div className="auth-brand-name">
              <span>wodouh</span>
              <span>وضوح</span>
            </div>
          </div>

          <h1 id="auth-title">{title}</h1>

          {isForgotPassword && (
            <p className="auth-intro">
              اكتب البريد الإلكتروني المرتبط بحسابك، وستصلك تعليمات إعادة تعيين كلمة المرور.
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="auth-form"
            noValidate
          >
            <div className="auth-field">
              <label htmlFor="auth-email">
                البريد الإلكتروني
              </label>
              <input
                ref={emailInputRef}
                id="auth-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(event) => {
                  const nextEmail = event.target.value;
                  setEmail(nextEmail);
                  setError(null);
                  setInfoMessage(null);
                  if (
                    emailError &&
                    isValidEmail(nextEmail.trim().toLowerCase())
                  ) {
                    setEmailError(null);
                  }
                }}
                required
                maxLength={MAX_EMAIL_LENGTH}
                className="auth-input"
                disabled={loading}
                aria-invalid={emailError ? 'true' : undefined}
                aria-describedby="auth-email-help"
              />
              <p
                id="auth-email-help"
                className={`auth-helper${emailError ? ' auth-field-error' : ''}`}
              >
                {emailError || 'استخدم البريد الإلكتروني المرتبط بحسابك.'}
              </p>
            </div>

            {!isForgotPassword && (
              <div className="auth-field">
                <label htmlFor="auth-password">
                  كلمة المرور
                </label>
                <div className="auth-password-wrap">
                  <input
                    ref={passwordInputRef}
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    dir="ltr"
                    value={password}
                    onChange={(event) => {
                      const nextPassword = event.target.value;
                      setPassword(nextPassword);
                      setError(null);
                      if (
                        passwordError &&
                        nextPassword.length >= MIN_PASSWORD_LENGTH
                      ) {
                        setPasswordError(null);
                      }
                    }}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    maxLength={MAX_PASSWORD_LENGTH}
                    className="auth-input"
                    disabled={loading}
                    aria-invalid={passwordError ? 'true' : undefined}
                    aria-describedby="auth-password-help"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? 'إخفاء كلمة المرور'
                        : 'إظهار كلمة المرور'
                    }
                    aria-pressed={showPassword}
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
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                      {showPassword && <path d="M4 4 20 20" />}
                    </svg>
                  </button>
                </div>
                <p
                  id="auth-password-help"
                  className={`auth-helper${passwordError ? ' auth-field-error' : ''}`}
                >
                  {passwordError || 'يجب ألا تقل كلمة المرور عن 6 أحرف.'}
                </p>
              </div>
            )}

            {infoMessage && (
              <p className="auth-info" role="status" aria-live="polite">
                {infoMessage}
              </p>
            )}

            <button
              className="auth-submit"
              type="submit"
              aria-busy={loading}
            >
              {loading
                ? 'جارٍ تسجيل الدخول...'
                : isForgotPassword
                  ? 'إرسال رابط الاستعادة'
                  : isSignUp
                    ? 'إنشاء الحساب'
                    : 'تسجيل الدخول'}
            </button>

            {error && (
              <p className="auth-server-error" role="alert" aria-live="assertive">
                {error}
              </p>
            )}
          </form>

          <nav className="auth-links" aria-label="روابط الحساب">
            {!isForgotPassword && (
              <button
                type="button"
                className="auth-link"
                onClick={openForgotPassword}
                disabled={loading}
              >
                نسيت كلمة المرور؟
              </button>
            )}
            <div className="auth-link-divider" />
            {isForgotPassword ? (
              <button
                type="button"
                className="auth-link"
                onClick={backToLogin}
                disabled={loading}
              >
                الرجوع لتسجيل الدخول
              </button>
            ) : (
              <p>
                {isSignUp ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}{' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={toggleMode}
                  disabled={loading}
                >
                  {isSignUp ? 'تسجيل الدخول' : 'أنشئ حساباً'}
                </button>
              </p>
            )}
          </nav>

          <p className="auth-footer">
            وضوح أداة توعية ومتابعة، وليست بديلاً عن التشخيص الطبي.
          </p>
        </section>

        <aside className="auth-art" aria-hidden="true">
          <LoginArt />
          <div className="auth-art-copy">
            <h2>افهم صداعك بوضوح</h2>
            <p>
              تتبّع الأعراض، وافهم الأنماط، وناقش طبيبك بثقة.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function LoginArt() {
  return (
    <svg
      className="auth-art-svg"
      viewBox="0 0 500 560"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="wodouh-paper-shadow" x="-30%" y="-5%" width="160%" height="110%">
          <feDropShadow
            dx="-6"
            dy="3"
            stdDeviation="7"
            floodColor="#000000"
            floodOpacity="0.3"
          />
        </filter>
        <radialGradient id="wodouh-art-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7FD0F2" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7FD0F2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="500" height="560" fill="#0B1F3A" />
      <circle cx="105" cy="250" r="150" fill="url(#wodouh-art-glow)" />
      <circle
        cx="105"
        cy="250"
        r="96"
        fill="none"
        stroke="#14A8A0"
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      <circle
        cx="105"
        cy="250"
        r="58"
        fill="none"
        stroke="#7FD0F2"
        strokeOpacity="0.4"
        strokeWidth="2"
      />
      <path
        filter="url(#wodouh-paper-shadow)"
        fill="#0F7F78"
        d="M500 0H225C195 110 255 190 210 285S185 405 235 480S205 548 230 560H500Z"
      />
      <path
        filter="url(#wodouh-paper-shadow)"
        fill="#14A8A0"
        d="M500 0H283C253 90 313 190 268 280S243 400 293 475S263 545 288 560H500Z"
      />
      <path
        filter="url(#wodouh-paper-shadow)"
        fill="#8ED6F2"
        d="M500 0H342C312 100 372 180 327 270S302 395 352 470S322 540 342 560H500Z"
      />
      <path
        filter="url(#wodouh-paper-shadow)"
        fill="#E6F4F9"
        d="M500 0H397C367 90 427 170 387 255S357 385 407 460S377 535 397 560H500Z"
      />
      <g
        transform="translate(34,150) scale(3.5)"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      >
        <path
          d="M8 70C30 70 44 66 54 50C64 34 56 18 44 22C32 26 36 46 54 52"
          stroke="#FFFFFF"
        />
        <path d="M54 52C68 57 76 56 86 56" stroke="#FFFFFF" />
      </g>
      <circle
        cx="361"
        cy="346"
        r="11"
        fill="#FFFFFF"
        stroke="#0F7F78"
        strokeWidth="5"
      />
    </svg>
  );
}

export default Auth;
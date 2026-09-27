import { useState } from 'react';
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

  function resetMessages() {
    setError(null);
    setInfoMessage(null);
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
        'من فضلك اكتب بريدًا إلكترونيًا صحيحًا.'
      );
      return;
    }

    if (
      !isForgotPassword &&
      password.length <
        MIN_PASSWORD_LENGTH
    ) {
      setError(
        `كلمة المرور لازم تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`
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
            translateError(
              signInError.message
            )
          );
        }
      }
    } catch (err) {
      console.error(
        'Authentication operation failed:',
        err
      );

      setError(
        'تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.'
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

  return (
    <div className="disclaimer-screen">
      <div
        className="card disclaimer-card"
        role="region"
        aria-labelledby="auth-title"
        aria-busy={loading}
      >
        <div
          className="disclaimer-icon"
          aria-hidden="true"
        >
          🌤️
        </div>

        <h1 id="auth-title">
          {title}
        </h1>

        {isForgotPassword && (
          <p
            className="muted-text"
            style={{
              marginTop: 8,
            }}
          >
            اكتب البريد الإلكتروني
            المرتبط بحسابك، وهتوصلك
            تعليمات إعادة تعيين كلمة
            المرور.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="auth-form"
          noValidate
        >
          <label htmlFor="auth-email">
            البريد الإلكتروني
          </label>

          <input
            id="auth-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(event) => {
              setEmail(
                event.target.value
              );
              resetMessages();
            }}
            required
            maxLength={
              MAX_EMAIL_LENGTH
            }
            className="auth-input"
            disabled={loading}
            aria-describedby="auth-email-help"
          />

          <p
            id="auth-email-help"
            className="muted-text"
            style={{
              marginTop: 4,
            }}
          >
            استخدم البريد الإلكتروني
            المرتبط بحسابك.
          </p>

          {!isForgotPassword && (
            <>
              <label htmlFor="auth-password">
                كلمة المرور
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems:
                    'stretch',
                }}
              >
                <input
                  id="auth-password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete={
                    isSignUp
                      ? 'new-password'
                      : 'current-password'
                  }
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(event) => {
                    setPassword(
                      event.target.value
                    );
                    setError(null);
                  }}
                  required
                  minLength={
                    MIN_PASSWORD_LENGTH
                  }
                  maxLength={
                    MAX_PASSWORD_LENGTH
                  }
                  className="auth-input"
                  disabled={loading}
                  style={{
                    flex: 1,
                  }}
                  aria-describedby="auth-password-help"
                />

                <button
                  type="button"
                  className="why-button"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? 'إخفاء كلمة المرور'
                      : 'إظهار كلمة المرور'
                  }
                  aria-pressed={
                    showPassword
                  }
                  style={{
                    whiteSpace:
                      'nowrap',
                    padding:
                      '8px 12px',
                  }}
                >
                  {showPassword
                    ? 'إخفاء'
                    : 'إظهار'}
                </button>
              </div>

              <p
                id="auth-password-help"
                className="muted-text"
                style={{
                  marginTop: 4,
                }}
              >
                كلمة المرور لازم تكون
                على الأقل{' '}
                {MIN_PASSWORD_LENGTH}{' '}
                أحرف.
              </p>
            </>
          )}

          {error && (
            <p
              className="analysis-error"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}

          {infoMessage && (
            <p
              className="specialty-box"
              role="status"
              aria-live="polite"
            >
              {infoMessage}
            </p>
          )}

          <button
            className="btn primary"
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading
              ? 'جارٍ المعالجة...'
              : isForgotPassword
                ? 'إرسال رابط الاستعادة'
                : isSignUp
                  ? 'إنشاء الحساب'
                  : 'تسجيل الدخول'}
          </button>
        </form>

        {!isForgotPassword && (
          <button
            type="button"
            className="why-button"
            style={{
              marginTop: 16,
            }}
            onClick={
              openForgotPassword
            }
            disabled={loading}
          >
            نسيت كلمة المرور؟
          </button>
        )}

        {isForgotPassword ? (
          <button
            type="button"
            className="why-button"
            style={{
              marginTop: 10,
            }}
            onClick={
              backToLogin
            }
            disabled={loading}
          >
            الرجوع لتسجيل الدخول
          </button>
        ) : (
          <button
            type="button"
            className="why-button"
            style={{
              marginTop: 10,
            }}
            onClick={
              toggleMode
            }
            disabled={loading}
          >
            {isSignUp
              ? 'عندك حساب بالفعل؟ سجل دخول'
              : 'لسه معندكش حساب؟ اعمل واحد'}
          </button>
        )}
      </div>
    </div>
  );
}

export default Auth;
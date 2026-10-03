import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

function translateError(message = '') {
  const normalizedMessage = String(message).toLowerCase();

  if (
    normalizedMessage.includes('same password') ||
    normalizedMessage.includes('different from the old password')
  ) {
    return 'كلمة المرور الجديدة لازم تكون مختلفة عن القديمة.';
  }

  if (
    normalizedMessage.includes('password should be') ||
    normalizedMessage.includes('password must') ||
    normalizedMessage.includes('password is too short')
  ) {
    return `كلمة المرور لازم تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`;
  }

  if (
    normalizedMessage.includes('session') ||
    normalizedMessage.includes('expired') ||
    normalizedMessage.includes('invalid')
  ) {
    return 'رابط إعادة تعيين كلمة المرور غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.';
  }

  return 'حصل خطأ أثناء تحديث كلمة المرور. حاول تاني.';
}

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!isMounted) {
          return;
        }

        setHasRecoverySession(Boolean(session));
      } catch (sessionError) {
        console.error(
          'Failed to check password recovery session:',
          sessionError
        );

        if (isMounted) {
          setHasRecoverySession(false);
        }
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (
        event === 'PASSWORD_RECOVERY' ||
        Boolean(session)
      ) {
        setHasRecoverySession(Boolean(session));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `كلمة المرور لازم تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`
      );
      return;
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      setError(
        `كلمة المرور طويلة جدًا. الحد الأقصى ${MAX_PASSWORD_LENGTH} حرف.`
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        setError(translateError(updateError.message));
        return;
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (updateError) {
      console.error(
        'Password update failed:',
        updateError
      );

      setError(
        'تعذر تحديث كلمة المرور. حاول مرة أخرى.'
      );
    } finally {
      setLoading(false);
    }
  }

  function goToLogin() {
    window.history.replaceState({}, '', '/');
    window.location.reload();
  }

  if (checkingSession) {
    return (
      <div className="disclaimer-screen">
        <div
          className="card disclaimer-card"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <img
            className="disclaimer-icon"
            src="/wodouh-mark.svg"
            alt=""
            aria-hidden="true"
          />

          <h1>جارٍ التحقق...</h1>

          <p
            className="muted-text"
            style={{ marginTop: 8 }}
          >
            بنراجع رابط إعادة تعيين كلمة المرور.
          </p>
        </div>
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div className="disclaimer-screen">
        <div
          className="card disclaimer-card"
          role="alert"
        >
          <div
            className="disclaimer-icon"
            aria-hidden="true"
          >
            ⚠️
          </div>

          <h1>الرابط غير صالح</h1>

          <p
            className="muted-text"
            style={{ marginTop: 8 }}
          >
            رابط إعادة تعيين كلمة المرور غير صالح أو
            انتهت صلاحيته. ارجع لتسجيل الدخول واطلب
            رابط استعادة جديد.
          </p>

          <button
            type="button"
            className="btn primary"
            style={{ marginTop: 20 }}
            onClick={goToLogin}
          >
            الرجوع لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="disclaimer-screen">
        <div
          className="card disclaimer-card"
          role="status"
          aria-live="polite"
        >
          <div
            className="disclaimer-icon"
            aria-hidden="true"
          >
            ✓
          </div>

          <h1>تم تغيير كلمة المرور</h1>

          <p
            className="muted-text"
            style={{ marginTop: 8 }}
          >
            كلمة المرور اتغيرت بنجاح. تقدر تكمل
            استخدام حسابك.
          </p>

          <button
            type="button"
            className="btn primary"
            style={{ marginTop: 20 }}
            onClick={goToLogin}
          >
            المتابعة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="disclaimer-screen">
      <div
        className="card disclaimer-card"
        role="region"
        aria-labelledby="reset-password-title"
        aria-busy={loading}
      >
        <div
          className="disclaimer-icon"
          aria-hidden="true"
        >
          🔐
        </div>

        <h1 id="reset-password-title">
          تغيير كلمة المرور
        </h1>

        <p
          className="muted-text"
          style={{ marginTop: 8 }}
        >
          اختار كلمة مرور جديدة لحسابك.
        </p>

        <form
          onSubmit={handleSubmit}
          className="auth-form"
          noValidate
        >
          <label htmlFor="new-password">
            كلمة المرور الجديدة
          </label>

          <input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="كلمة المرور الجديدة"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            required
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={MAX_PASSWORD_LENGTH}
            className="auth-input"
            disabled={loading}
            aria-describedby="new-password-help"
          />

          <label htmlFor="confirm-password">
            تأكيد كلمة المرور
          </label>

          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="أعد كتابة كلمة المرور"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError(null);
            }}
            required
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={MAX_PASSWORD_LENGTH}
            className="auth-input"
            disabled={loading}
            aria-describedby="new-password-help"
          />

          <p
            id="new-password-help"
            className="muted-text"
            style={{ marginTop: 4 }}
          >
            كلمة المرور لازم تكون على الأقل{' '}
            {MIN_PASSWORD_LENGTH} أحرف.
          </p>

          <button
            type="button"
            className="why-button"
            onClick={() =>
              setShowPassword((previous) => !previous)
            }
            disabled={loading}
            aria-pressed={showPassword}
            style={{ marginTop: 8 }}
          >
            {showPassword
              ? 'إخفاء كلمة المرور'
              : 'إظهار كلمة المرور'}
          </button>

          {error && (
            <p
              className="analysis-error"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn primary"
            disabled={loading}
            aria-busy={loading}
          >
            {loading
              ? 'جارٍ تحديث كلمة المرور...'
              : 'تغيير كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
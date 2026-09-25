import { useState } from 'react';
import { supabase } from '../supabaseClient';

function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(translateError(error.message));
      } else {
        setInfoMessage('تم إنشاء الحساب بنجاح، تقدر تسجل دخول دلوقتي.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(translateError(error.message));
      }
    }
  }

  function translateError(message) {
    if (message.includes('Invalid login credentials')) {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    }
    if (message.includes('already registered')) {
      return 'البريد الإلكتروني مسجل بالفعل، جرب تسجل دخول.';
    }
    if (message.includes('Password should be')) {
      return 'كلمة المرور قصيرة جدًا، لازم تكون 6 أحرف على الأقل.';
    }
    return 'حصل خطأ، حاول تاني.';
  }

  return (
    <div className="disclaimer-screen">
      <div className="card disclaimer-card">
        <div className="disclaimer-icon">🌤️</div>
        <h1>{isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="auth-input"
          />

          {error && <p className="analysis-error">{error}</p>}
          {infoMessage && <p className="specialty-box">{infoMessage}</p>}

          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'جارٍ التحميل...' : isSignUp ? 'إنشاء الحساب' : 'تسجيل الدخول'}
          </button>
        </form>

        <button
          className="why-button"
          style={{ marginTop: 16 }}
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setInfoMessage(null);
          }}
        >
          {isSignUp ? 'عندك حساب بالفعل؟ سجل دخول' : 'لسه معندكش حساب؟ اعمل واحد'}
        </button>
      </div>
    </div>
  );
}

export default Auth;
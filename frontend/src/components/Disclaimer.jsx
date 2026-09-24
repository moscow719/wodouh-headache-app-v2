import { useState } from 'react';

function Disclaimer({ onAgree }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="disclaimer-screen">
      <div className="card disclaimer-card">
        <div className="disclaimer-icon">🌤️</div>
        <h1>قبل ما نبدأ</h1>

        <p>
          <strong>وضوح</strong> أداة توعية بتساعدك تفهم صداعك وتعرف تتوجه لمين — مش بديل عن
          تشخيص طبيب.
        </p>

        <p>
          الاحتمالات اللي هيديهالك الموقع مبنية على وصفك للأعراض بس، ومش تشخيص نهائي بأي شكل.
          التشخيص الحقيقي محتاج فحص من طبيب مختص.
        </p>

        <p className="emergency-note">
          لو حسيت إن حالتك عاجلة أو خطيرة، روح لأقرب طوارئ فورًا من غير ما تستخدم الموقع.
        </p>

        <label className="agree-checkbox">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          أوافق وأفهم طبيعة الأداة واستخداماتها
        </label>

        <button className="btn primary" disabled={!checked} onClick={onAgree}>
          ابدأ استخدام وضوح
        </button>
      </div>
    </div>
  );
}

export default Disclaimer;
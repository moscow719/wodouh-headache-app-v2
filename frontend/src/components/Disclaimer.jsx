import { useId, useState } from 'react';

function Disclaimer({ onAgree }) {
  const [checked, setChecked] = useState(false);

  const checkboxId = useId();

  function handleAgree() {
    if (!checked) {
      return;
    }

    onAgree();
  }

  return (
    <div className="disclaimer-screen">
      <div
        className="card disclaimer-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        aria-describedby="disclaimer-description"
      >
        <div
          className="disclaimer-icon"
          aria-hidden="true"
        >
          🌤️
        </div>

        <h1 id="disclaimer-title">
          قبل ما نبدأ
        </h1>

        <div id="disclaimer-description">
          <p>
            <strong>NeuroPath</strong> أداة توعية ومتابعة
            بتساعدك تسجل أعراض الصداع وتفهم بعض الأنماط
            الشائعة وتتعرف على التخصص الطبي المناسب
            للمناقشة بشكل مبدئي. الأداة مش بديل عن
            التشخيص أو التقييم الطبي.
          </p>

          <p>
            النتائج والمعلومات اللي هتظهر لك مبنية على
            البيانات اللي تدخلها وعلى نماذج أو قواعد
            توعوية، وممكن تكون غير كاملة أو غير دقيقة.
            ظهور نمط معين أو تخصص معين لا يعني إن عندك
            تشخيصًا محددًا.
          </p>

          <p>
            NeuroPath لا يحدد لك علاجًا شخصيًا، ولا يحدد
            جرعات الأدوية، ولا يُفترض الاعتماد عليه
            لاتخاذ قرار طبي منفرد.
          </p>

          <p
            className="emergency-note"
            role="note"
          >
            <strong>مهم:</strong>{' '}
            لو عندك أعراض شديدة أو مفاجئة، أو ظهرت
            علامات تستدعي مساعدة عاجلة، ما تعتمدش على
            الموقع في تقييم الحالة. اطلب المساعدة الطبية
            العاجلة أو توجّه لأقرب طوارئ فورًا.
          </p>
        </div>

        <label
          className="agree-checkbox"
          htmlFor={checkboxId}
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={checked}
            onChange={(event) =>
              setChecked(
                event.target.checked
              )
            }
          />

          <span>
            أوافق وأفهم إن NeuroPath أداة توعوية
            ومتابعة فقط، وإن استخدامها لا يُغني عن
            التقييم الطبي ولا يُعتبر تشخيصًا أو خطة علاج.
          </span>
        </label>

        <button
          type="button"
          className="btn primary"
          disabled={!checked}
          onClick={handleAgree}
          aria-disabled={!checked}
        >
          ابدأ استخدام NeuroPath
        </button>
      </div>
    </div>
  );
}

export default Disclaimer;
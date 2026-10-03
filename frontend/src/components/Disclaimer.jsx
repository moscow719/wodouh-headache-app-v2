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
    <main className="disclaimer-screen">
      <section
        className="disclaimer-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        aria-describedby="disclaimer-description"
      >
        <div className="disclaimer-brand">
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
          <div>
            <span>wodouh</span>
            <span>وضوح</span>
          </div>
        </div>

        <h1 id="disclaimer-title">
          قبل ما نبدأ
        </h1>

        <div id="disclaimer-description">
          <p>
            <strong>وضوح</strong> أداة توعية ومتابعة تساعدك
            على تسجيل أعراض الصداع وفهم بعض الأنماط الشائعة،
            والتعرّف على التخصص الطبي المناسب لمناقشته.
            وهي ليست بديلًا عن التشخيص أو التقييم الطبي.
          </p>

          <p>
            تعتمد النتائج والمعلومات المعروضة على البيانات
            التي تدخلها وعلى نماذج أو قواعد توعوية، وقد تكون
            غير مكتملة أو غير دقيقة. ظهور نمط أو تخصص معين
            لا يعني وجود تشخيص محدد.
          </p>

          <p>
            لا يحدد وضوح علاجًا شخصيًا أو جرعات للأدوية،
            ولا ينبغي الاعتماد عليه لاتخاذ قرار طبي منفرد.
          </p>

          <p
            className="emergency-note"
            role="note"
          >
            <strong>
              إذا كانت أعراضك شديدة أو مفاجئة، فاطلب مساعدة
              طبية عاجلة.
            </strong>{' '}
            لا تعتمد على الموقع لتقييم الحالة؛ اطلب المساعدة
            الطبية العاجلة أو توجّه إلى أقرب قسم طوارئ فورًا.
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
            أوافق وأفهم أن وضوح أداة توعوية ومتابعة فقط،
            وأن استخدامها لا يغني عن التقييم الطبي ولا يُعد
            تشخيصًا أو خطة علاج.
          </span>
        </label>

        <button
          type="button"
          className="disclaimer-submit"
          disabled={!checked}
          onClick={handleAgree}
          aria-disabled={!checked}
        >
          ابدأ استخدام وضوح
        </button>
      </section>
    </main>
  );
}

export default Disclaimer;
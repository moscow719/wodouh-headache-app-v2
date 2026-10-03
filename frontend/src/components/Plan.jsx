import { useEffect, useState } from 'react';
import { getAssessmentStats } from '../utils/storage';
import { getPlanForType } from '../data/preventionPlans';
import MedicationTracker from './MedicationTracker';
import MedicationSchedule from './MedicationSchedule';

const typeLabels = Object.freeze({
  tension: 'صداع توتري',
  migraine: 'صداع نصفي',
  cluster: 'صداع عنقودي',
  sinus: 'نمط مرتبط بالجيوب الأنفية',
  eye_strain: 'إجهاد العين',
  dehydration: 'نمط مرتبط بالجفاف',
});

const validTypes = new Set(
  Object.keys(typeLabels)
);

function isValidPlan(plan) {
  return (
    plan &&
    typeof plan === 'object' &&
    !Array.isArray(plan)
  );
}

function Plan({ onNavigate }) {
  const [mostCommonType, setMostCommonType] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const stats =
          await getAssessmentStats();

        if (
          !stats ||
          typeof stats !== 'object' ||
          Array.isArray(stats)
        ) {
          throw new Error(
            'Invalid assessment stats'
          );
        }

        const type =
          typeof stats.mostCommonType === 'string' &&
          validTypes.has(stats.mostCommonType)
            ? stats.mostCommonType
            : null;

        if (isMounted) {
          setMostCommonType(type);
          setError(null);
        }
      } catch (err) {
        console.error(
          'Failed to load prevention information:',
          err
        );

        if (isMounted) {
          setError(
            'تعذر تحميل معلومات الوقاية. من فضلك حاول مرة أخرى.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <p
        className="muted-text"
        role="status"
        aria-live="polite"
      >
        جارٍ تحميل المعلومات...
      </p>
    );
  }

  if (error) {
    return (
      <div className="card" role="alert">
        <h2>تعذر تحميل المعلومات</h2>

        <p className="muted-text">
          {error}
        </p>

        <button
          type="button"
          className="btn primary"
          onClick={() => window.location.reload()}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!mostCommonType) {
    return (
      <div className="card">
        <h2>لا توجد بيانات كافية بعد</h2>

        <p className="muted-text">
          أجرِ تقييمًا واحدًا على الأقل لعرض معلومات
          توعوية مرتبطة بالأنماط المسجلة في تقييماتك.
        </p>

        <button
          type="button"
          className="btn primary"
          onClick={() => onNavigate('assess')}
          style={{ marginTop: 12 }}
        >
          ابدأ تقييم الآن
        </button>
      </div>
    );
  }

  const plan =
    getPlanForType(mostCommonType);

  if (!isValidPlan(plan)) {
    return (
      <div className="card" role="alert">
        <h2>المعلومات غير متاحة</h2>

        <p className="muted-text">
          لا توجد معلومات توعوية متاحة لهذا النمط حاليًا.
        </p>
      </div>
    );
  }

  const typeLabel =
    typeLabels[mostCommonType];

  const nutrition = Array.isArray(
    plan.nutrition
  )
    ? plan.nutrition.filter(
        (item) => typeof item === 'string' && item.trim()
      )
    : [];

  const lifestyle = Array.isArray(
    plan.lifestyle
  )
    ? plan.lifestyle.filter(
        (item) => typeof item === 'string' && item.trim()
      )
    : [];

  const medication = Array.isArray(
    plan.medication
  )
    ? plan.medication.filter(
        (item) => typeof item === 'string' && item.trim()
      )
    : [];

  return (
    <div className="plan-page">
      <div className="page-head">
        <div>
          <h1>معلومات للوقاية والمتابعة</h1>

          <p className="muted-text">
            المعلومات التالية توعوية عامة، وقد ترتبط
            بالنمط الأكثر تكرارًا في تقييماتك. لا تمثل
            تشخيصًا أو خطة علاج شخصية.
          </p>

          <p className="muted-text">
            النمط الأكثر تكرارًا في تقييماتك:{' '}
            <strong>{typeLabel}</strong>
          </p>
        </div>
      </div>

      <div
        className="plan-safety-notice"
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
          <strong>للتوعية العامة فقط</strong>
          <p>
            لا تبدأ دواءً جديدًا، ولا توقف دواءً موصوفًا،
            ولا تغيّر الجرعة اعتمادًا على هذه الصفحة.
            استشر طبيبًا عند استمرار الصداع أو تكراره
            أو اختلافه عن المعتاد.
          </p>
        </div>
      </div>

      <div
        className="plan-sections"
        aria-label="معلومات توعوية"
      >
        <details className="card plan-section" open>
          <summary className="plan-section-heading">
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
              <path d="M12 20V10m0 0c-4.5 0-7-2.2-7-6 4.8 0 7 2.2 7 6Zm0 2c0-3.7 2.5-5.8 7-5.8 0 4.3-2.4 6.2-7 6.2Z" />
            </svg>
            نصائح غذائية
          </summary>

          {nutrition.length > 0 ? (
            <ul>
              {nutrition.map((item, index) => (
                <li
                  key={`${mostCommonType}-nutrition-${index}`}
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-text">
              لا توجد معلومات متاحة حاليًا.
            </p>
          )}
        </details>

        <details className="card plan-section">
          <summary className="plan-section-heading">
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
              <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />
            </svg>
            نمط الحياة
          </summary>

          {lifestyle.length > 0 ? (
            <ul>
              {lifestyle.map((item, index) => (
                <li
                  key={`${mostCommonType}-lifestyle-${index}`}
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-text">
              لا توجد معلومات متاحة حاليًا.
            </p>
          )}
        </details>

        <details className="card plan-section">
          <summary className="plan-section-heading">
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
              <path d="m10.5 13.5 3-3m-7.7 7.7a4.2 4.2 0 0 1 0-5.9l5.5-5.5a4.2 4.2 0 0 1 5.9 5.9l-5.5 5.5a4.2 4.2 0 0 1-5.9 0Z" />
            </svg>
            معلومات عامة عن الأدوية
          </summary>

          {medication.length > 0 ? (
            <ul>
              {medication.map((item, index) => (
                <li
                  key={`${mostCommonType}-medication-${index}`}
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-text">
              لا توجد معلومات متاحة حاليًا.
            </p>
          )}
        </details>
      </div>

      <MedicationTracker />

      <div style={{ marginTop: 18 }}>
        <MedicationSchedule />
      </div>
    </div>
  );
}

export default Plan;
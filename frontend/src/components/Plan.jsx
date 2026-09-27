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
        <h2>مفيش بيانات كافية لسه</h2>

        <p className="muted-text">
          اعمل تقييم واحد على الأقل عشان تظهر لك معلومات
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
    <div>
      <div className="page-head">
        <div>
          <h1>معلومات للوقاية والمتابعة</h1>

          <p className="muted-text">
            المعلومات التالية مبنية على النمط الذي ظهر
            بشكل متكرر في تقييماتك. هي معلومات توعوية
            عامة وليست تشخيصًا أو خطة علاج شخصية.
          </p>

          <p className="muted-text">
            النمط المسجل بشكل متكرر في تقييماتك:{' '}
            <strong>{typeLabel}</strong>
          </p>
        </div>
      </div>

      <div
        className="plan-grid"
        aria-label="معلومات توعوية"
      >
        <div className="card plan-col">
          <h4>
            <span aria-hidden="true">🍎</span>{' '}
            نصائح غذائية
          </h4>

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
        </div>

        <div className="card plan-col">
          <h4>
            <span aria-hidden="true">🌙</span>{' '}
            نمط الحياة
          </h4>

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
        </div>

        <div className="card plan-col">
          <h4>
            <span aria-hidden="true">💊</span>{' '}
            معلومات عامة عن الأدوية
          </h4>

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
        </div>
      </div>

      <div
        className="emergency-note"
        style={{ marginTop: 18 }}
        role="note"
      >
        <strong>مهم:</strong>{' '}
        المعلومات الموجودة هنا للتوعية العامة فقط.
        لا تبدأ دواءً جديدًا، ولا توقف دواءً موصوفًا،
        ولا تغيّر الجرعة اعتمادًا على هذه الصفحة.
        لو الصداع مستمر أو متكرر أو مختلف عن المعتاد،
        ناقش الأعراض مع طبيب.
      </div>

      <MedicationTracker />

      <div style={{ marginTop: 18 }}>
        <MedicationSchedule />
      </div>
    </div>
  );
}

export default Plan;
import { useEffect, useState } from 'react';
import {
  getAssessmentStats,
  getLatestAssessment,
} from '../utils/storage';
import FamilyHistory from './FamilyHistory';

const typeLabels = Object.freeze({
  tension: 'صداع توتري',
  migraine: 'صداع نصفي',
  cluster: 'صداع عنقودي',
  sinus: 'نمط مرتبط بالجيوب الأنفية',
  eye_strain: 'إجهاد العين',
  dehydration: 'نمط مرتبط بالجفاف',
});

const validTypes = new Set(Object.keys(typeLabels));

function formatDate(isoDate) {
  if (!isoDate) {
    return null;
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isValidLatestAssessment(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    !Number.isNaN(new Date(value.date).getTime())
  );
}

function normalizeStats(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new Error('Invalid assessment stats');
  }

  const totalAssessments = Number(
    value.totalAssessments
  );

  return {
    totalAssessments:
      Number.isInteger(totalAssessments) &&
      totalAssessments >= 0
        ? totalAssessments
        : 0,

    mostCommonType:
      typeof value.mostCommonType === 'string' &&
      validTypes.has(value.mostCommonType)
        ? value.mostCommonType
        : null,
  };
}

function Home({ onNavigate }) {
  const [stats, setStats] = useState({
    totalAssessments: 0,
    mostCommonType: null,
  });

  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [statsData, latestData] =
          await Promise.all([
            getAssessmentStats(),
            getLatestAssessment(),
          ]);

        const normalizedStats =
          normalizeStats(statsData);

        const normalizedLatest =
          isValidLatestAssessment(latestData)
            ? latestData
            : null;

        if (!isMounted) {
          return;
        }

        setStats(normalizedStats);
        setLatest(normalizedLatest);
        setError(null);
      } catch (err) {
        console.error(
          'Failed to load home data:',
          err
        );

        if (isMounted) {
          setError(
            'تعذر تحميل بيانات الصفحة الرئيسية. من فضلك حاول مرة أخرى.'
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
        جارٍ تحميل الصفحة...
      </p>
    );
  }

  if (error) {
    return (
      <div className="card" role="alert">
        <h2>تعذر تحميل البيانات</h2>

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

  const formattedDate = formatDate(
    latest?.date
  );

  const mostCommonType =
    stats.mostCommonType &&
    typeLabels[stats.mostCommonType]
      ? typeLabels[stats.mostCommonType]
      : 'لا توجد بيانات كافية';

  const latestType =
    latest?.primaryType &&
    typeLabels[latest.primaryType]
      ? typeLabels[latest.primaryType]
      : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>أهلًا بيك في NeuroPath</h1>

          <p className="muted-text">
            نظرة سريعة على تقييماتك السابقة والمعلومات
            المسجلة في حسابك.
          </p>
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={() => onNavigate('assess')}
        >
          ابدأ تقييم جديد
        </button>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-num">
            {stats.totalAssessments}
          </span>

          <span className="stat-label">
            إجمالي التقييمات
          </span>
        </div>

        <div className="card stat-card">
          <span className="stat-num">
            {mostCommonType}
          </span>

          <span className="stat-label">
            أكثر نمط مسجل تكرارًا
          </span>
        </div>
      </div>

      <div
        className="card"
        style={{ marginTop: 18 }}
      >
        <h3 style={{ marginTop: 0 }}>
          آخر تقييم لك
        </h3>

        {!latest && (
          <>
            <p className="muted-text">
              لسه معملتش أي تقييم. دوس على "ابدأ تقييم
              جديد" عشان تبدأ أول تقييم ليك.
            </p>

            <button
              type="button"
              className="btn primary"
              style={{ marginTop: 12 }}
              onClick={() => onNavigate('assess')}
            >
              ابدأ أول تقييم
            </button>
          </>
        )}

        {latest && (
          <>
            {formattedDate && (
              <p
                className="muted-text"
                style={{ marginBottom: 10 }}
              >
                {formattedDate}
              </p>
            )}

            {latestType && (
              <div
                className="specialty-box"
                style={{ marginBottom: 12 }}
              >
                <strong>النمط المسجل في التقييم:</strong>{' '}
                {latestType}
              </div>
            )}

            {latest.analysis ? (
              <p>{latest.analysis}</p>
            ) : (
              <p className="muted-text">
                لا يوجد ملخص متاح لهذا التقييم.
              </p>
            )}

            <p
              className="muted-text"
              style={{ marginTop: 12 }}
            >
              النتائج المعروضة هنا للمساعدة في متابعة
              الأعراض والأنماط المسجلة، وليست تشخيصًا
              طبيًا.
            </p>

            {latest.specialty?.ar && (
              <div
                className="specialty-box"
                style={{ marginTop: 12 }}
              >
                <strong>التخصص المناسب للمناقشة:</strong>{' '}
                {latest.specialty.ar}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <FamilyHistory />
      </div>
    </div>
  );
}

export default Home;
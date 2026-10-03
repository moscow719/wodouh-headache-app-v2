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
      <div className="home-dashboard">
        <p
          className="muted-text"
          role="status"
          aria-live="polite"
        >
          جارٍ تحميل الصفحة...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-dashboard">
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
    <div className="home-dashboard">
      <header className="home-header">
        <img
          className="home-brand"
          src="/wodouh-logo.svg"
          alt="وضوح Wodouh"
        />
      </header>

      <section className="home-welcome">
        <h1>أهلًا بك في وضوح</h1>
        <p>
          نظرة سريعة على تقييماتك السابقة والمعلومات المسجلة في حسابك.
        </p>
      </section>

      <button
        type="button"
        className="home-start-button"
        onClick={() => onNavigate('assess')}
      >
        ابدأ تقييمًا جديدًا
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
          <path d="M12 5v14m-7-7h14" />
        </svg>
      </button>

      <div className="home-stats">
        <div className="home-panel home-stat-card">
          <span className="home-stat-label">
            إجمالي التقييمات
          </span>
          <strong className="home-stat-value">
            {stats.totalAssessments}
          </strong>
        </div>

        <div className="home-panel home-stat-card">
          <span className="home-stat-label">
            النمط الأكثر تكرارًا
          </span>
          <strong className="home-stat-value home-stat-text">
            {mostCommonType}
          </strong>
        </div>
      </div>

      <section className="home-panel home-latest">
        <div className="home-section-heading">
          <h2>آخر تقييم</h2>
          {formattedDate && (
            <time dateTime={latest.date}>
              {formattedDate}
            </time>
          )}
        </div>

        {!latest && (
          <div className="home-empty-state">
            <p>
              لسه معملتش أي تقييم. ابدأ تقييمك الأول عشان تتابع الأعراض والأنماط المسجلة.
            </p>
          </div>
        )}

        {latest && (
          <>
            {latestType && (
              <div className="home-highlight home-pattern">
                <span>النمط المسجل:</span>
                <strong>{latestType}</strong>
              </div>
            )}

            <p className="home-analysis">
              {latest.analysis ||
                'لا يوجد ملخص متاح لهذا التقييم.'}
            </p>

            <p className="home-safety-note">
              <span aria-hidden="true">ⓘ</span>
              هذه النتائج للمساعدة في متابعة الأعراض فقط، وليست تشخيصًا طبيًا.
            </p>

            {latest.specialty?.ar && (
              <div className="home-highlight home-specialty">
                <span>التخصص المناسب للنقاش:</span>
                <strong>{latest.specialty.ar}</strong>
              </div>
            )}
          </>
        )}
      </section>

      <section className="home-family">
        <FamilyHistory />
      </section>

      <footer className="home-footer">
        وضوح أداة توعية ومتابعة، وليست بديلًا عن التشخيص الطبي.
      </footer>
    </div>
  );
}

export default Home;
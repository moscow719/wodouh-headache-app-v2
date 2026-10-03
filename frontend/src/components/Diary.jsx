import { useEffect, useState } from 'react';
import { getAssessments } from '../utils/storage';
import CalendarView from './CalendarView';

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

function formatDate(dateValue) {
  if (!dateValue) {
    return '—';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(
    'ar-EG-u-nu-latn',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

function formatConfidence(confidence) {
  const numericConfidence =
    Number(confidence);

  if (
    !Number.isFinite(
      numericConfidence
    ) ||
    numericConfidence < 0 ||
    numericConfidence > 100
  ) {
    return '—';
  }

  return `${Math.round(
    numericConfidence
  )}%`;
}

function getTypeLabel(primaryType) {
  if (
    typeof primaryType !== 'string' ||
    !validTypes.has(primaryType)
  ) {
    return 'غير محدد';
  }

  return typeLabels[primaryType];
}

function getSpecialtyLabel(specialty) {
  if (
    !specialty ||
    typeof specialty !== 'object' ||
    Array.isArray(specialty)
  ) {
    return '—';
  }

  if (
    typeof specialty.ar === 'string' &&
    specialty.ar.trim()
  ) {
    return specialty.ar;
  }

  if (
    typeof specialty.en === 'string' &&
    specialty.en.trim()
  ) {
    return specialty.en;
  }

  return '—';
}

function isValidAssessment(assessment) {
  return (
    assessment &&
    typeof assessment === 'object' &&
    !Array.isArray(assessment) &&
    typeof assessment.date === 'string' &&
    !Number.isNaN(
      new Date(
        assessment.date
      ).getTime()
    )
  );
}

function Diary({ onNavigate }) {
  const [assessments, setAssessments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data =
          await getAssessments();

        if (!Array.isArray(data)) {
          throw new Error(
            'Invalid assessments data'
          );
        }

        const validAssessments =
          data.filter(
            isValidAssessment
          );

        if (isMounted) {
          setAssessments(
            validAssessments
          );
          setError(null);
        }
      } catch (err) {
        console.error(
          'Failed to load assessments:',
          err
        );

        if (isMounted) {
          setError(
            'تعذر تحميل سجل التقييمات. من فضلك حاول مرة أخرى.'
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
        جارٍ تحميل سجل التقييمات...
      </p>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        role="alert"
      >
        <h2>
          تعذر تحميل السجل
        </h2>

        <p className="muted-text">
          {error}
        </p>

        <button
          type="button"
          className="btn primary"
          onClick={() =>
            window.location.reload()
          }
          style={{
            marginTop: 12,
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="diary-page">
      <div className="page-head">
        <div>
          <h1>
            سجل التقييمات
          </h1>

          <p className="muted-text">
            يعرض هذا السجل نتائج تقييماتك من الأحدث إلى
            الأقدم، ولا يمثل سجلًا مؤكدًا لنوبات الصداع.
          </p>
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={() =>
            onNavigate('assess')
          }
        >
          + تقييم جديد
        </button>
      </div>

      {assessments.length === 0 && (
        <div className="card coming-soon">
          <h2>
            لا توجد تقييمات بعد
          </h2>

          <p className="muted-text">
            ستظهر نتائجك هنا بعد إكمال التقييم.
          </p>

          <button
            type="button"
            className="btn primary"
            onClick={() =>
              onNavigate('assess')
            }
          >
            ابدأ أول تقييم
          </button>
        </div>
      )}

      {assessments.length > 0 && (
        <>
          <CalendarView />

          <div className="card diary-records-card">
            <div className="diary-confidence-context" role="note">
              * نسبة التوافق مؤشر خوارزمي للمقارنة فقط؛
              وليست احتمالًا للإصابة أو تشخيصًا طبيًا.
            </div>
            <table className="diary-table">
              <caption className="sr-only">
                نتائج التقييمات المسجلة
              </caption>

              <thead>
                <tr>
                  <th scope="col">
                    التاريخ والوقت
                  </th>

                  <th scope="col">
                    النمط المسجل
                  </th>

                  <th scope="col">
                    نسبة التوافق*
                  </th>

                  <th scope="col">
                    التخصص المناسب للمناقشة
                  </th>
                </tr>
              </thead>

              <tbody>
                {assessments.map(
                  (item, index) => {
                    const rowKey =
                      typeof item.id ===
                        'string' &&
                      item.id
                        ? item.id
                        : `${item.date}-${index}`;

                    return (
                      <tr key={rowKey}>
                        <td>
                          {formatDate(
                            item.date
                          )}
                        </td>

                        <td>
                          {getTypeLabel(
                            item.primaryType
                          )}
                        </td>

                        <td>
                          {formatConfidence(
                            item.confidence
                          )}
                        </td>

                        <td>
                          {getSpecialtyLabel(
                            item.specialty
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>

            <div className="diary-mobile-list">
              {assessments.map((item, index) => {
                const rowKey =
                  typeof item.id === 'string' && item.id
                    ? item.id
                    : `${item.date}-${index}`;

                return (
                  <article
                    className="diary-mobile-entry"
                    key={rowKey}
                  >
                    <h2>{getTypeLabel(item.primaryType)}</h2>
                    <dl>
                      <div>
                        <dt>التاريخ والوقت</dt>
                        <dd>{formatDate(item.date)}</dd>
                      </div>
                      <div>
                        <dt>نسبة التوافق*</dt>
                        <dd>{formatConfidence(item.confidence)}</dd>
                      </div>
                      <div>
                        <dt>التخصص المناسب للمناقشة</dt>
                        <dd>{getSpecialtyLabel(item.specialty)}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Diary;
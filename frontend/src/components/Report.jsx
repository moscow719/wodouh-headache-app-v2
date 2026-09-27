import { useEffect, useMemo, useState } from 'react';
import { getAssessments } from '../utils/storage';

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

function isValidAssessment(item) {
  return (
    item &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    typeof item.date === 'string' &&
    !Number.isNaN(
      new Date(item.date).getTime()
    )
  );
}

function getSafeConfidence(value) {
  const numericValue = Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0 ||
    numericValue > 100
  ) {
    return null;
  }

  return Math.round(numericValue);
}

function formatDate(date) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    return 'تاريخ غير متاح';
  }

  return date.toLocaleDateString(
    'ar-EG',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );
}

function formatMonth(date) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    return '—';
  }

  return date.toLocaleDateString(
    'ar-EG',
    {
      month: 'short',
      year: 'numeric',
    }
  );
}

function getTypeLabel(type) {
  if (
    typeof type !== 'string' ||
    !validTypes.has(type)
  ) {
    return 'نمط غير محدد';
  }

  return typeLabels[type];
}

function Report({ onNavigate }) {
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

        const validAssessments = data
          .filter(isValidAssessment)
          .sort(
            (a, b) =>
              new Date(b.date).getTime() -
              new Date(a.date).getTime()
          );

        if (isMounted) {
          setAssessments(
            validAssessments
          );
          setError(null);
        }
      } catch (err) {
        console.error(
          'Failed to load report data:',
          err
        );

        if (isMounted) {
          setError(
            'تعذر تحميل بيانات التقرير. حاول مرة أخرى.'
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

  const reportData = useMemo(() => {
    if (assessments.length === 0) {
      return {
        totalCount: 0,
        avgConfidence: null,
        typeCounts: {},
        sortedTypes: [],
        monthlyEntries: [],
        firstDate: null,
        lastDate: null,
      };
    }

    const confidenceValues =
      assessments
        .map((assessment) =>
          getSafeConfidence(
            assessment.confidence
          )
        )
        .filter(
          (value) => value !== null
        );

    const avgConfidence =
      confidenceValues.length > 0
        ? Math.round(
            confidenceValues.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
              confidenceValues.length
          )
        : null;

    const typeCounts = {};

    assessments.forEach(
      (assessment) => {
        const type =
          assessment.primaryType;

        if (
          typeof type === 'string' &&
          validTypes.has(type)
        ) {
          typeCounts[type] =
            (typeCounts[type] || 0) + 1;
        }
      }
    );

    const sortedTypes =
      Object.entries(
        typeCounts
      ).sort(
        (a, b) => b[1] - a[1]
      );

    const monthlyData = {};

    assessments.forEach(
      (assessment) => {
        const date = new Date(
          assessment.date
        );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return;
        }

        const year =
          date.getFullYear();

        const month = String(
          date.getMonth() + 1
        ).padStart(2, '0');

        const key = `${year}-${month}`;

        if (!monthlyData[key]) {
          monthlyData[key] = {
            count: 0,
            date: new Date(
              year,
              date.getMonth(),
              1
            ),
          };
        }

        monthlyData[key].count += 1;
      }
    );

    const monthlyEntries =
      Object.entries(
        monthlyData
      )
        .sort(
          ([a], [b]) =>
            a.localeCompare(b)
        )
        .slice(-6);

    const newestDate =
      new Date(
        assessments[0].date
      );

    const oldestDate =
      new Date(
        assessments[
          assessments.length - 1
        ].date
      );

    return {
      totalCount:
        assessments.length,
      avgConfidence,
      typeCounts,
      sortedTypes,
      monthlyEntries,
      firstDate: oldestDate,
      lastDate: newestDate,
    };
  }, [assessments]);

  function buildSummaryText() {
    const {
      totalCount,
      avgConfidence,
      sortedTypes,
      firstDate,
      lastDate,
    } = reportData;

    const typeSummary =
      sortedTypes.length > 0
        ? sortedTypes
            .map(
              ([type, count]) =>
                `${getTypeLabel(type)}: ${count} تقييم`
            )
            .join('، ')
        : 'لا توجد أنماط مسجلة';

    return `ملخص تقييمات NeuroPath

عدد التقييمات: ${totalCount}

متوسط نسبة التوافق مع الأنماط المسجلة: ${
      avgConfidence !== null
        ? `${avgConfidence}%`
        : 'غير متاح'
    }

الفترة الزمنية: ${formatDate(
      firstDate
    )} - ${formatDate(lastDate)}

توزيع نتائج التقييم:
${typeSummary}

هذا الملخص مبني على البيانات التي أدخلها المستخدم، وهو لأغراض التوعية والمتابعة ولا يمثل تشخيصًا طبيًا نهائيًا.`;
  }

  function handleWhatsAppShare() {
    const confirmed =
      window.confirm(
        'هتشارك ملخصًا يحتوي على معلومات صحية عبر واتساب. تأكد إنك موافق على مشاركة البيانات مع جهة خارجية قبل المتابعة.'
      );

    if (!confirmed) {
      return;
    }

    const text =
      encodeURIComponent(
        buildSummaryText()
      );

    const shareUrl =
      `https://wa.me/?text=${text}`;

    const shareWindow =
      window.open(
        shareUrl,
        '_blank'
      );

    if (shareWindow) {
      shareWindow.opener = null;
    }
  }

  function handleEmailShare() {
    const confirmed =
      window.confirm(
        'هتشارك ملخصًا يحتوي على معلومات صحية عبر البريد الإلكتروني. تأكد من عنوان المستلم ومن الجهة التي هتستلم البيانات قبل المتابعة.'
      );

    if (!confirmed) {
      return;
    }

    const subject =
      encodeURIComponent(
        'ملخص تقييمات NeuroPath'
      );

    const body =
      encodeURIComponent(
        buildSummaryText()
      );

    window.location.href =
      `mailto:?subject=${subject}&body=${body}`;
  }

  if (loading) {
    return (
      <p
        className="muted-text"
        role="status"
        aria-live="polite"
      >
        جارٍ تحميل التقرير...
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
          تعذر تحميل التقرير
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
          حاول مرة أخرى
        </button>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="card coming-soon">
        <h2>
          مفيش بيانات كافية للتقرير
        </h2>

        <p className="muted-text">
          لازم تعمل تقييم واحد على الأقل
          عشان يظهر التقرير هنا.
        </p>

        <button
          type="button"
          className="btn primary"
          onClick={() =>
            onNavigate('assess')
          }
        >
          ابدأ تقييم الآن
        </button>
      </div>
    );
  }

  const {
    totalCount,
    avgConfidence,
    sortedTypes,
    monthlyEntries,
    firstDate,
    lastDate,
  } = reportData;

  const maxCount = Math.max(
    ...monthlyEntries.map(
      ([, value]) =>
        value.count
    ),
    1
  );

  return (
    <div>
      <div className="page-head no-print">
        <div>
          <h1>
            ملخص التقييمات
          </h1>

          <p className="muted-text">
            ملخص للبيانات المسجلة في
            NeuroPath يمكن عرضه على الطبيب
            للمساعدة في مراجعة التاريخ الذي
            سجله المستخدم.
          </p>
        </div>

        <div className="report-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              window.print()
            }
          >
            ⬇ طباعة / حفظ PDF
          </button>

          <button
            type="button"
            className="btn whatsapp-btn"
            onClick={
              handleWhatsAppShare
            }
          >
            📱 مشاركة عبر واتساب
          </button>

          <button
            type="button"
            className="btn ghost"
            onClick={
              handleEmailShare
            }
          >
            ✉️ مشاركة عبر إيميل
          </button>
        </div>
      </div>

      <div className="printable-report">
        <h1 className="print-only-title">
          ملخص تقييمات NeuroPath
        </h1>

        <div className="stats-grid stats-grid-3">
          <div className="card stat-card">
            <span className="stat-num">
              {totalCount}
            </span>

            <span className="stat-label">
              عدد التقييمات
            </span>
          </div>

          <div className="card stat-card">
            <span className="stat-num">
              {avgConfidence !== null
                ? `${avgConfidence}%`
                : '—'}
            </span>

            <span className="stat-label">
              متوسط نسبة التوافق مع الأنماط
            </span>
          </div>

          <div className="card stat-card">
            <span
              className="stat-num"
              style={{
                fontSize: '1rem',
              }}
            >
              {formatDate(
                firstDate
              )}{' '}
              —{' '}
              {formatDate(
                lastDate
              )}
            </span>

            <span className="stat-label">
              الفترة الزمنية للتقييمات
            </span>
          </div>
        </div>

        {monthlyEntries.length > 1 && (
          <div
            className="card"
            style={{
              marginTop: 18,
            }}
          >
            <h3
              style={{
                marginTop: 0,
              }}
            >
              عدد التقييمات عبر الأشهر
            </h3>

            <p
              className="muted-text"
              style={{
                marginBottom: 16,
              }}
            >
              الرسم يوضح عدد التقييمات
              المسجلة خلال كل شهر، وليس عدد
              نوبات الصداع أو شدتها.
            </p>

            <div
              className="trend-chart"
              aria-label="عدد التقييمات المسجلة خلال آخر ستة أشهر"
            >
              {monthlyEntries.map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="trend-bar-col"
                  >
                    <div
                      className="trend-bar"
                      style={{
                        height: `${
                          (value.count /
                            maxCount) *
                          100
                        }%`,
                      }}
                      role="img"
                      aria-label={`${formatMonth(
                        value.date
                      )}: ${value.count} تقييم`}
                    >
                      <span className="trend-bar-value">
                        {value.count}
                      </span>
                    </div>

                    <span className="trend-bar-label">
                      {formatMonth(
                        value.date
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div
          className="card"
          style={{
            marginTop: 18,
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            توزيع نتائج التقييمات
          </h3>

          <p
            className="muted-text"
            style={{
              marginBottom: 16,
            }}
          >
            النسب دي بتوضح نسبة كل نمط من
            إجمالي نتائج التقييمات المسجلة
            في التطبيق، وليست احتمالات تشخيصية.
          </p>

          {sortedTypes.length === 0 && (
            <p className="muted-text">
              لا توجد أنماط مسجلة.
            </p>
          )}

          {sortedTypes.length > 0 && (
            <div className="prob-list">
              {sortedTypes.map(
                ([type, count]) => {
                  const percentage =
                    totalCount > 0
                      ? Math.round(
                          (count /
                            totalCount) *
                            100
                        )
                      : 0;

                  const label =
                    getTypeLabel(
                      type
                    );

                  return (
                    <div
                      className="prob-row"
                      key={type}
                    >
                      <span className="prob-label">
                        {label}
                      </span>

                      <div
                        className="prob-track"
                        role="progressbar"
                        aria-label={`نسبة نتائج تقييم ${label}`}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow={
                          percentage
                        }
                      >
                        <div
                          className="prob-fill"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <span className="prob-value">
                        {count} (
                        {percentage}%)
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        <div
          className="card no-print"
          style={{
            marginTop: 18,
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            مشاركة التقرير
          </h3>

          <p className="muted-text">
            مشاركة التقرير اختيارية. راجع
            محتواه قبل إرساله لأي شخص لأن
            البيانات قد تتضمن معلومات صحية شخصية.
          </p>

          <div
            className="medication-note"
            style={{
              marginTop: 12,
            }}
            role="note"
          >
            لأمان وخصوصية بياناتك، NeuroPath
            لا يرسل بيانات التقرير إلى خدمة QR
            خارجية.
          </div>
        </div>

        <div
          className="print-only-disclaimer"
          role="note"
        >
          هذا الملخص من أداة NeuroPath ومبني
          على البيانات التي أدخلها المستخدم.
          الغرض منه التوعية والمتابعة ومساعدة
          المستخدم على عرض معلوماته على الطبيب،
          وليس تشخيصًا طبيًا نهائيًا أو بديلًا
          عن التقييم الطبي.
        </div>
      </div>
    </div>
  );
}

export default Report;
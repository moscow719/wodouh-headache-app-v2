import { useEffect, useMemo, useState } from 'react';
import {
  getAssessments,
  getMedications,
  getProfile,
} from '../utils/storage';

const REPORT_DETAILS_PREFIX =
  'wodouh_report_details';

const typeLabels = Object.freeze({
  tension: 'صداع توتري',
  migraine: 'صداع نصفي',
  cluster: 'صداع عنقودي',
  sinus: 'نمط مرتبط بالجيوب الأنفية',
  eye_strain: 'إجهاد العين',
  dehydration: 'نمط مرتبط بالجفاف',
});

const familyHistoryLabels = Object.freeze({
  migraine: 'صداع نصفي في العائلة',
  neurological: 'تاريخ عائلي لمشكلات عصبية',
  none: 'لا يوجد تاريخ عائلي معروف',
});

const redFlagQuestions = Object.freeze({
  sudden_severe_onset:
    'هل بدأ الصداع فجأة ووصل إلى أشد درجاته خلال ثوانٍ أو دقائق؟',
  worst_headache_ever:
    'هل هذا أشد صداع شعرت به في حياتك؟',
  head_injury:
    'هل بدأ الصداع بعد إصابة في الرأس أو حادث قوي؟',
  neurological_symptoms:
    'هل يصاحب الصداع ضعف أو تنميل أو صعوبة في الكلام أو تغير شديد في الرؤية أو ارتباك أو فقدان للوعي أو تشنج؟',
  fever_neck_stiffness:
    'هل لديك حمى شديدة أو تيبّس شديد في الرقبة مع الصداع؟',
  new_unusual_pattern:
    'هل هذا الصداع جديد أو مختلف بوضوح عن المعتاد أو يزداد سوءًا تدريجيًا؟',
});

const answerLabels = Object.freeze({
  yes: 'نعم',
  no: 'لا',
  unknown: 'لست متأكدًا',
});

const regionLabels = Object.freeze({
  forehead: 'الجبهة',
  left_temple: 'الصدغ الأيسر',
  right_temple: 'الصدغ الأيمن',
  left_side: 'الجانب الأيسر',
  right_side: 'الجانب الأيمن',
  back: 'خلف الرأس',
  around_eyes: 'حول العين',
  top: 'أعلى الرأس',
});

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

function getConfidenceLevel(value) {
  if (value === null) {
    return 'غير متاح';
  }

  if (value >= 70) {
    return 'مرتفع';
  }

  if (value >= 40) {
    return 'متوسط';
  }

  return 'منخفض';
}

function formatDate(value, includeTime = false) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'تاريخ غير متاح';
  }

  return date.toLocaleString(
    'ar-EG-u-nu-latn',
    includeTime
      ? {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
  );
}

function getTypeLabel(type) {
  return typeof type === 'string' && typeLabels[type]
    ? typeLabels[type]
    : 'نمط غير محدد';
}

function parseFamilyHistory(value) {
  if (typeof value !== 'string') {
    return [];
  }

  return [...new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) =>
        Object.hasOwn(familyHistoryLabels, item)
      )
  )].map((item) => familyHistoryLabels[item]);
}

function readAssessmentDetails(userId) {
  if (!userId) {
    return null;
  }

  const storageKey =
    `${REPORT_DETAILS_PREFIX}_${userId}`;

  let rawValue;

  try {
    rawValue = localStorage.getItem(storageKey);
  } catch (error) {
    console.error(
      'Failed to read saved report details:',
      error
    );
    throw new Error(
      'تعذر تحميل تفاصيل التقييم المحفوظة على هذا الجهاز.'
    );
  }

  if (!rawValue) {
    return null;
  }

  let details;

  try {
    details = JSON.parse(rawValue);
  } catch (error) {
    console.error(
      'Invalid saved report details:',
      error
    );
    throw new Error(
      'تعذر قراءة تفاصيل التقييم المحفوظة على هذا الجهاز.'
    );
  }

  if (
    !details ||
    typeof details !== 'object' ||
    Array.isArray(details) ||
    typeof details.assessmentId !== 'string'
  ) {
    throw new Error(
      'بيانات تفاصيل التقييم المحفوظة غير صالحة.'
    );
  }

  const redFlagAnswers =
    Array.isArray(details.redFlagAnswers)
      ? details.redFlagAnswers.filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            Object.hasOwn(redFlagQuestions, item.id) &&
            Object.hasOwn(answerLabels, item.answer)
        )
      : [];

  return {
    assessmentId: details.assessmentId,
    redFlagAnswers,
    selectedRegion:
      typeof details.selectedRegion === 'string' &&
      Object.hasOwn(regionLabels, details.selectedRegion)
        ? details.selectedRegion
        : null,
    painLevel:
      Number.isInteger(details.painLevel) &&
      details.painLevel >= 1 &&
      details.painLevel <= 10
        ? details.painLevel
        : null,
    description:
      typeof details.description === 'string'
        ? details.description.slice(0, 5000)
        : '',
  };
}

function isValidAssessment(item) {
  return (
    item &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    typeof item.date === 'string' &&
    !Number.isNaN(new Date(item.date).getTime())
  );
}

function isValidMedication(item) {
  return (
    item &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0
  );
}

function Report({ onNavigate, userId }) {
  const [assessments, setAssessments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [familyHistory, setFamilyHistory] = useState([]);
  const [assessmentDetails, setAssessmentDetails] =
    useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReportData() {
      try {
        const [
          assessmentData,
          medicationData,
          profile,
        ] = await Promise.all([
          getAssessments(),
          getMedications(),
          getProfile(),
        ]);

        if (
          !Array.isArray(assessmentData) ||
          !Array.isArray(medicationData)
        ) {
          throw new Error('Invalid report data');
        }

        const validAssessments = assessmentData
          .filter(isValidAssessment)
          .sort(
            (a, b) =>
              new Date(b.date).getTime() -
              new Date(a.date).getTime()
          );

        const latestAssessment =
          validAssessments[0] || null;

        const savedDetails =
          latestAssessment && userId
            ? readAssessmentDetails(userId)
            : null;

        if (!isMounted) {
          return;
        }

        setAssessments(validAssessments);
        setMedications(
          medicationData.filter(isValidMedication)
        );
        setFamilyHistory(
          parseFamilyHistory(profile?.family_history)
        );
        setAssessmentDetails(
          savedDetails?.assessmentId === latestAssessment?.id
            ? savedDetails
            : null
        );
        setError(null);
      } catch (loadError) {
        console.error(
          'Failed to load report data:',
          loadError
        );

        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'تعذر تحميل بيانات التقرير.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadReportData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const reportData = useMemo(() => {
    const sortedAssessments = [...assessments].sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );

    const confidenceValues = sortedAssessments
      .map((item) => getSafeConfidence(item.confidence))
      .filter((value) => value !== null);

    const averageConfidence =
      confidenceValues.length > 0
        ? Math.round(
            confidenceValues.reduce(
              (sum, value) => sum + value,
              0
            ) / confidenceValues.length
          )
        : null;

    const typeCounts = {};

    sortedAssessments.forEach((item) => {
      if (typeof item.primaryType === 'string') {
        typeCounts[item.primaryType] =
          (typeCounts[item.primaryType] || 0) + 1;
      }
    });

    const mostCommonType =
      Object.entries(typeCounts).sort(
        ([typeA, countA], [typeB, countB]) =>
          countB - countA ||
          typeA.localeCompare(typeB)
      )[0]?.[0] || null;

    const firstDate =
      sortedAssessments.length > 0
        ? new Date(
            sortedAssessments[
              sortedAssessments.length - 1
            ].date
          )
        : null;

    const lastDate =
      sortedAssessments.length > 0
        ? new Date(sortedAssessments[0].date)
        : null;

    return {
      totalCount: sortedAssessments.length,
      averageConfidence,
      mostCommonType,
      firstDate,
      lastDate,
      latestAssessment: sortedAssessments[0] || null,
    };
  }, [assessments]);

  function buildSummaryText() {
    const latest = reportData.latestAssessment;
    const latestDetails =
      assessmentDetails?.assessmentId === latest?.id
        ? assessmentDetails
        : null;

    const assessmentLines = latestDetails
      ? [
          `مكان الألم: ${
            latestDetails.selectedRegion
              ? regionLabels[latestDetails.selectedRegion]
              : 'غير محدد'
          }`,
          `شدة الألم المسجلة: ${
            latestDetails.painLevel ?? 'غير متاحة'
          } من 10`,
          `وصف الأعراض: ${
            latestDetails.description || 'غير متاح'
          }`,
          ...latestDetails.redFlagAnswers.map(
            (item) =>
              `${redFlagQuestions[item.id]}: ${answerLabels[item.answer]}`
          ),
        ]
      : [
          'التفاصيل التفصيلية لإجابات التقييم الأخير غير محفوظة على هذا الجهاز.',
        ];

    const medicationLines =
      medications.length > 0
        ? medications
            .slice(0, 10)
            .map(
              (item) =>
                `- ${item.name}${
                  item.dose ? `، الجرعة المسجلة: ${item.dose}` : ''
                }`
            )
        : ['لا توجد أدوية مسجلة.'];

    return [
      'تقرير صحي للمراجعة مع الطبيب',
      '',
      `عدد التقييمات: ${reportData.totalCount}`,
      `الفترة: ${formatDate(reportData.firstDate)}${
        reportData.firstDate &&
        reportData.lastDate &&
        reportData.firstDate.toDateString() !==
          reportData.lastDate.toDateString()
          ? ` إلى ${formatDate(reportData.lastDate)}`
          : ''
      }`,
      `النمط الأكثر تكرارًا في التقييمات: ${getTypeLabel(
        reportData.mostCommonType
      )}`,
      `مستوى التوافق الخوارزمي: ${getConfidenceLevel(
        reportData.averageConfidence
      )}`,
      'هذا مؤشر آلي لمطابقة الأنماط، وليس احتمالًا للإصابة.',
      '',
      'تفاصيل التقييم الأخير:',
      ...assessmentLines,
      '',
      'التاريخ العائلي:',
      ...(familyHistory.length > 0
        ? familyHistory.map((item) => `- ${item}`)
        : ['لا يوجد تاريخ عائلي مسجل.']),
      '',
      'الأدوية المسجلة:',
      ...medicationLines,
      '',
      'هذا التقرير مبني على المعلومات المسجلة، ولا يمثل تشخيصًا طبيًا.',
    ].join('\n');
  }

  function confirmHealthDataShare(method) {
    return window.confirm(
      `ستشارك معلومات صحية شخصية عبر ${method}. راجع محتوى التقرير وتأكد من المستلم قبل المتابعة.`
    );
  }

  function handleWhatsAppShare() {
    if (!confirmHealthDataShare('واتساب')) {
      return;
    }

    const shareWindow = window.open(
      `https://wa.me/?text=${encodeURIComponent(
        buildSummaryText()
      )}`,
      '_blank',
      'noopener,noreferrer'
    );

    if (!shareWindow) {
      window.alert(
        'تعذر فتح واتساب. تحقق من إعدادات حظر النوافذ المنبثقة في المتصفح.'
      );
    }
  }

  function handleEmailShare() {
    if (!confirmHealthDataShare('البريد الإلكتروني')) {
      return;
    }

    const subject = encodeURIComponent(
      'تقرير صحي للمراجعة مع الطبيب'
    );
    const body = encodeURIComponent(buildSummaryText());

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
        جارٍ إعداد تقرير الطبيب...
      </p>
    );
  }

  if (error) {
    return (
      <div className="card" role="alert">
        <h2>تعذر تحميل التقرير</h2>
        <p className="muted-text">{error}</p>
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

  if (assessments.length === 0) {
    return (
      <div className="card coming-soon">
        <h2>لا توجد بيانات كافية للتقرير</h2>
        <p className="muted-text">
          أكمل تقييمًا واحدًا على الأقل لإعداد ملخص
          لمراجعته مع الطبيب.
        </p>
        <button
          type="button"
          className="btn primary"
          onClick={() => onNavigate('assess')}
        >
          ابدأ تقييمًا
        </button>
      </div>
    );
  }

  const detailsAvailable =
    assessmentDetails?.assessmentId ===
    reportData.latestAssessment?.id;

  const familyHistoryText =
    familyHistory.length > 0
      ? familyHistory
      : ['لا يوجد تاريخ عائلي مسجل.'];

  return (
    <main className="report-page">
      <header className="report-header no-print">
        <div>
          <h1>تقرير الطبيب</h1>
          <p>
            ملخص لبياناتك المسجلة يمكنك عرضه على الطبيب
            لمساعدتك في مراجعة تاريخك الصحي.
          </p>
        </div>
        <button
          type="button"
          className="report-print-button"
          onClick={() => window.print()}
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
            <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 14h12v7H6z" />
          </svg>
          طباعة أو حفظ PDF
        </button>
      </header>

      <h1 className="print-only-title">
        تقرير الطبيب
      </h1>

      <div className="report-review-notice" role="note">
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
        <span>
          راجع التقرير قبل مشاركته. هذا ملخص لما سجلته
          في التطبيق، وليس تشخيصًا، وقد يتضمن معلومات
          صحية شخصية.
        </span>
      </div>

      <div className="report-summary-grid">
        <section className="report-stat-card">
          <span className="report-stat-label">
            عدد التقييمات
          </span>
          <strong>{reportData.totalCount}</strong>
        </section>
        <section className="report-stat-card">
          <span className="report-stat-label">
            الفترة
          </span>
          <strong className="report-stat-text">
            {formatDate(reportData.firstDate)}
            {reportData.firstDate &&
              reportData.lastDate &&
              reportData.firstDate.toDateString() !==
                reportData.lastDate.toDateString() &&
              ` — ${formatDate(reportData.lastDate)}`}
          </strong>
        </section>
        <section className="report-stat-card">
          <span className="report-stat-label">
            النمط الأكثر تكرارًا
          </span>
          <strong className="report-stat-text">
            {getTypeLabel(reportData.mostCommonType)}
          </strong>
        </section>
        <section className="report-stat-card">
          <span className="report-stat-label">
            مستوى التوافق الخوارزمي
          </span>
          <strong className="report-stat-text">
            {getConfidenceLevel(
              reportData.averageConfidence
            )}
          </strong>
          <span className="report-stat-help">
            مؤشر آلي لمطابقة الأنماط، وليس احتمالًا للإصابة.
          </span>
        </section>
      </div>

      <section className="report-section">
        <h2>معلومات آخر تقييم</h2>
        {detailsAvailable ? (
          <>
            <dl className="report-detail-list">
              <div>
                <dt>تاريخ التقييم</dt>
                <dd>
                  {formatDate(
                    reportData.latestAssessment.date,
                    true
                  )}
                </dd>
              </div>
              <div>
                <dt>مكان الألم</dt>
                <dd>
                  {assessmentDetails.selectedRegion
                    ? regionLabels[
                        assessmentDetails.selectedRegion
                      ]
                    : 'لم يُحدد'}
                </dd>
              </div>
              <div>
                <dt>شدة الألم المسجلة</dt>
                <dd>
                  {assessmentDetails.painLevel
                    ? `${assessmentDetails.painLevel} من 10`
                    : 'غير متاحة'}
                </dd>
              </div>
              <div>
                <dt>النمط المسجل</dt>
                <dd>
                  {getTypeLabel(
                    reportData.latestAssessment.primaryType
                  )}
                </dd>
              </div>
            </dl>

            <div className="report-subsection">
              <h3>إجابات أسئلة الفحص الأولي</h3>
              {assessmentDetails.redFlagAnswers.length > 0 ? (
                <ul className="report-answer-list">
                  {assessmentDetails.redFlagAnswers.map(
                    (item) => (
                      <li key={item.id}>
                        <span>{redFlagQuestions[item.id]}</span>
                        <strong>
                          {answerLabels[item.answer]}
                        </strong>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="report-muted">
                  لا تتوفر إجابات الفحص الأولي لهذا التقييم.
                </p>
              )}
            </div>

            <div className="report-subsection">
              <h3>وصف الأعراض المسجل</h3>
              <p className="report-description">
                {assessmentDetails.description ||
                  'لم يُسجل وصف للأعراض.'}
              </p>
              <p className="report-muted">
                لم يُسجل سؤال مستقل عن مدة الصداع؛ راجع
                الوصف أعلاه واذكر المدة للطبيب.
              </p>
            </div>
          </>
        ) : (
          <p className="report-muted">
            إجابات التقييم التفصيلية للتقييمات السابقة
            غير محفوظة في السجل الحالي. يظهر هنا ملخص
            النمط المحفوظ فقط.
          </p>
        )}
      </section>

      <section className="report-section">
        <h2>معلومات إضافية</h2>
        <div className="report-additional-grid">
          <div className="report-subsection">
            <h3>التاريخ العائلي</h3>
            <ul className="report-simple-list">
              {familyHistoryText.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="report-subsection">
            <h3>الأدوية المسجلة</h3>
            {medications.length > 0 ? (
              <ul className="report-simple-list">
                {medications.slice(0, 10).map(
                  (item, index) => (
                    <li
                      key={
                        item.id ||
                        `${item.name}-${item.taken_at}-${index}`
                      }
                    >
                      <span>{item.name}</span>
                      {item.dose && (
                        <span>
                          الجرعة المسجلة: {item.dose}
                        </span>
                      )}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="report-muted">
                لا توجد أدوية مسجلة.
              </p>
            )}
            <p className="report-muted">
              تسجيل الدواء للتوثيق فقط، ولا يعني أن
              الجرعة أو الاستخدام مناسب طبيًا.
            </p>
          </div>
        </div>
      </section>

      <section className="report-section report-sharing no-print">
        <h2>مشاركة التقرير</h2>
        <p>
          المشاركة اختيارية. أرسل التقرير فقط إلى جهة
          تثق بها وبعد مراجعته.
        </p>
        <div className="report-privacy-note" role="note">
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
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
          </svg>
          <span>
            تظل بيانات التقرير داخل التطبيق ما لم تختر
            مشاركتها عبر واتساب أو البريد الإلكتروني.
          </span>
        </div>
        <div className="report-share-buttons">
          <button
            type="button"
            className="report-share-button"
            onClick={handleWhatsAppShare}
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
              <path d="M20 11.5a8.4 8.4 0 0 1-1.2 4.3 8.5 8.5 0 0 1-7.3 4.2 8.4 8.4 0 0 1-4.1-1.1L3 20l1.2-4.1a8.4 8.4 0 0 1-1.1-4.1A8.5 8.5 0 0 1 7.3 4.5 8.4 8.4 0 0 1 11.5 3H12a8.5 8.5 0 0 1 8 8v.5Z" />
              <path d="M8 8c1 4 3 6 7 8l1.5-1.5-2.5-1.5-1.2 1c-1.3-.6-2.2-1.5-2.8-2.8l1-1.2L9.5 7 8 8Z" />
            </svg>
            مشاركة عبر واتساب
          </button>
          <button
            type="button"
            className="report-share-button"
            onClick={handleEmailShare}
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
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            مشاركة عبر البريد
          </button>
        </div>
      </section>

      <p className="report-disclaimer">
        وضوح أداة توعوية ومتابعة، وليس بديلًا عن
        التقييم الطبي أو التشخيص.
      </p>
    </main>
  );
}

export default Report;

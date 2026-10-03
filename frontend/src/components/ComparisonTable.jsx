import { useEffect, useState } from 'react';
import { getAssessmentStats } from '../utils/storage';

const comparisonData = Object.freeze([
  {
    id: 'tension',
    type: 'صداع توتري',
    location:
      'غالبًا على جانبي الرأس أو حوله، وقد يمتد إلى الرقبة أو الوجه.',
    quality:
      'غالبًا إحساس بالضغط أو الشد، ولا يكون نابضًا عادةً.',
    duration:
      'قد يستمر من نحو 30 دقيقة إلى عدة أيام.',
    associated:
      'لا يصاحبه الغثيان أو القيء عادةً، وقد تصاحبه حساسية للضوء أو الصوت.',
    triggers:
      'قد يرتبط بالتوتر أو اضطراب النوم أو إجهاد العضلات، أو بعوامل أخرى.',
  },
  {
    id: 'migraine',
    type: 'صداع نصفي (الشقيقة)',
    location:
      'قد يكون في جانب واحد أو في جانبي الرأس.',
    quality:
      'غالبًا نابض أو خافق، وقد يزداد مع النشاط.',
    duration:
      'غالبًا يستمر من 4 إلى 72 ساعة لدى البالغين.',
    associated:
      'قد يصاحبه غثيان أو قيء وحساسية للضوء أو الصوت، وقد تظهر أعراض بصرية أو حسية لدى بعض الأشخاص.',
    triggers:
      'قد يرتبط لدى بعض الأشخاص بقلة النوم أو التوتر أو التغيرات الهرمونية أو الضوء أو محفزات شخصية أخرى.',
  },
  {
    id: 'cluster',
    type: 'صداع عنقودي',
    location:
      'عادةً حول عين واحدة أو في جانب واحد من الرأس.',
    quality:
      'ألم شديد جدًا، وقد يوصف بأنه حارق أو طاعن.',
    duration:
      'تستمر النوبة عادةً من نحو 15 دقيقة إلى 3 ساعات، وقد تتكرر خلال فترات معينة.',
    associated:
      'قد يحدث في جانب الألم نفسه دمع أو احمرار في العين، أو احتقان أو سيلان الأنف، أو أعراض أخرى.',
    triggers:
      'قد يرتبط الكحول بفترات نشاط الصداع، كما قد توجد عوامل أخرى تختلف بين الأشخاص.',
  },
]);

const rows = Object.freeze([
  {
    key: 'location',
    label: 'مكان الألم',
  },
  {
    key: 'quality',
    label: 'طبيعة الألم',
  },
  {
    key: 'duration',
    label: 'المدة الشائعة',
  },
  {
    key: 'associated',
    label: 'أعراض مصاحبة محتملة',
  },
  {
    key: 'triggers',
    label: 'محفزات أو ارتباطات محتملة',
  },
]);

const validTypeIds = new Set(
  comparisonData.map((item) => item.id)
);

function getDefaultPair(mostCommonType) {
  if (validTypeIds.has(mostCommonType)) {
    const otherType =
      mostCommonType === 'cluster'
        ? 'migraine'
        : comparisonData.find(
            (item) => item.id !== mostCommonType
          ).id;

    return [mostCommonType, otherType];
  }

  return comparisonData.slice(0, 2).map((item) => item.id);
}

function ComparisonTable() {
  const [mostCommonType, setMostCommonType] =
    useState(null);
  const [selectedTypes, setSelectedTypes] =
    useState(['tension', 'migraine']);
  const [loadingPattern, setLoadingPattern] =
    useState(true);
  const [patternError, setPatternError] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMostCommonType() {
      try {
        const stats = await getAssessmentStats();

        if (
          !stats ||
          typeof stats !== 'object' ||
          Array.isArray(stats)
        ) {
          throw new Error('Invalid assessment stats');
        }

        const type =
          typeof stats.mostCommonType === 'string' &&
          validTypeIds.has(stats.mostCommonType)
            ? stats.mostCommonType
            : null;

        if (isMounted) {
          setMostCommonType(type);
          setSelectedTypes(getDefaultPair(type));
        }
      } catch (error) {
        console.error(
          'Failed to load comparison pattern:',
          error
        );

        if (isMounted) {
          setPatternError(true);
        }
      } finally {
        if (isMounted) {
          setLoadingPattern(false);
        }
      }
    }

    void loadMostCommonType();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedColumns = comparisonData.filter(
    (item) => selectedTypes.includes(item.id)
  );

  function selectPattern(typeId) {
    if (selectedTypes.includes(typeId)) {
      return;
    }

    setSelectedTypes((current) => [
      ...current.slice(1),
      typeId,
    ]);
  }

  return (
    <div className="comparison-page">
      <div className="page-head">
        <div>
          <h1>مقارنة أنماط الصداع</h1>

          <p className="muted-text">
            تساعدك هذه المقارنة على فهم صفات بعض أنماط
            الصداع وملاحظة الأعراض بصورة أفضل.
          </p>
        </div>
      </div>

      <div className="comparison-safety-notice" role="note">
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

      <section
        className="comparison-pattern-picker"
        aria-labelledby="comparison-picker-title"
      >
        <div className="comparison-picker-heading">
          <h2 id="comparison-picker-title">
            اختر نمطين للمقارنة
          </h2>
          {loadingPattern && (
            <span role="status" aria-live="polite">
              جارٍ تحميل النمط المسجل...
            </span>
          )}
          {!loadingPattern && patternError && (
            <span role="status">
              تعذر تحديد نمطك المسجل؛ يمكنك اختيار أي نمطين.
            </span>
          )}
        </div>

        <div className="comparison-pattern-options">
          {comparisonData.map((item) => {
            const selected =
              selectedTypes.includes(item.id);
            const isUserPattern =
              item.id === mostCommonType;

            return (
              <button
                key={item.id}
                type="button"
                className={`comparison-pattern-option${
                  selected ? ' selected' : ''
                }`}
                aria-pressed={selected}
                onClick={() => selectPattern(item.id)}
              >
                <span>{item.type}</span>
                {isUserPattern && (
                  <span className="comparison-user-badge">
                    نمطك
                  </span>
                )}
                {selected && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="comparison-desktop-table">
        <table className="comparison-table">
          <caption className="sr-only">
            مقارنة توعوية بين أنماط الصداع الشائعة
          </caption>
          <thead>
            <tr>
              <th scope="col">الخاصية</th>
              {comparisonData.map((item) => (
                <th
                  key={item.id}
                  scope="col"
                  className={
                    item.id === mostCommonType
                      ? 'comparison-user-column'
                      : ''
                  }
                >
                  {item.type}
                  {item.id === mostCommonType && (
                    <span className="comparison-user-badge">
                      نمطك
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="comparison-label"
                >
                  {row.label}
                </th>
                {comparisonData.map((item) => (
                  <td
                    key={item.id}
                    className={
                      item.id === mostCommonType
                        ? 'comparison-user-column'
                        : ''
                    }
                  >
                    {item[row.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="comparison-mobile-cards">
        {rows.map((row) => (
          <section
            className="comparison-property"
            key={row.key}
            aria-labelledby={`comparison-${row.key}`}
          >
            <h3 id={`comparison-${row.key}`}>
              {row.label}
            </h3>
            <div className="comparison-property-values">
              {selectedColumns.map((item) => (
                <div
                  key={item.id}
                  className={`comparison-value${
                    item.id === mostCommonType
                      ? ' comparison-user-column'
                      : ''
                  }`}
                >
                  <h4>
                    {item.type}
                    {item.id === mostCommonType && (
                      <span className="comparison-user-badge">
                        نمطك
                      </span>
                    )}
                  </h4>
                  <p>{item[row.key]}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default ComparisonTable;

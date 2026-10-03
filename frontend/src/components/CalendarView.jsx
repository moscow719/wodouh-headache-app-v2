import { useEffect, useMemo, useState } from 'react';
import { getAssessments } from '../utils/storage';

const monthNames = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const dayNames = [
  'أحد',
  'اثنين',
  'ثلاثاء',
  'أربعاء',
  'خميس',
  'جمعة',
  'سبت',
];

function toLocalDateOnly(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function isSameMonth(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth()
  );
}

function CalendarView() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(
    () => new Date()
  );

  useEffect(() => {
    let isMounted = true;

    async function loadAssessments() {
      try {
        const data = await getAssessments();

        if (!Array.isArray(data)) {
          throw new Error(
            'Invalid assessments data'
          );
        }

        if (isMounted) {
          setAssessments(data);
          setError(null);
        }
      } catch (err) {
        console.error(
          'Failed to load calendar assessments:',
          err
        );

        if (isMounted) {
          setError(
            'تعذر تحميل بيانات التقويم. من فضلك حاول مرة أخرى.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAssessments();

    return () => {
      isMounted = false;
    };
  }, []);

  const today = useMemo(() => {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(
    year,
    month,
    1
  ).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const currentMonthStart = useMemo(
    () => new Date(year, month, 1),
    [year, month]
  );

  const currentMonthEnd = useMemo(
    () =>
      new Date(
        year,
        month,
        daysInMonth
      ),
    [year, month, daysInMonth]
  );

  const currentMonthIsFuture =
    currentMonthStart > today;

  const currentMonthIsCurrent =
    isSameMonth(
      currentMonthStart,
      today
    );

  const daysWithAssessments = useMemo(() => {
    const days = new Set();

    assessments.forEach((assessment) => {
      if (
        !assessment ||
        typeof assessment !== 'object' ||
        !assessment.date
      ) {
        return;
      }

      const assessmentDate =
        toLocalDateOnly(
          assessment.date
        );

      if (!assessmentDate) {
        return;
      }

      if (
        assessmentDate >= currentMonthStart &&
        assessmentDate <= currentMonthEnd &&
        assessmentDate <= today
      ) {
        days.add(
          assessmentDate.getDate()
        );
      }
    });

    return days;
  }, [
    assessments,
    currentMonthStart,
    currentMonthEnd,
    today,
  ]);

  const cells = useMemo(() => {
    const calendarCells = [];

    for (
      let index = 0;
      index < firstDayOfMonth;
      index += 1
    ) {
      calendarCells.push(null);
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day += 1
    ) {
      calendarCells.push(day);
    }

    return calendarCells;
  }, [
    firstDayOfMonth,
    daysInMonth,
  ]);

  function prevMonth() {
    setCurrentDate(
      new Date(
        year,
        month - 1,
        1
      )
    );
  }

  function nextMonth() {
    if (
      currentMonthIsCurrent ||
      currentMonthIsFuture
    ) {
      return;
    }

    setCurrentDate(
      new Date(
        year,
        month + 1,
        1
      )
    );
  }

  function getCellClass(day) {
    if (!day) {
      return '';
    }

    const cellDate = new Date(
      year,
      month,
      day
    );

    if (cellDate > today) {
      return 'future-day';
    }

    return daysWithAssessments.has(day)
      ? 'has-assessment'
      : 'no-assessment';
  }

  function getCellLabel(day) {
    if (!day) {
      return undefined;
    }

    const cellDate = new Date(
      year,
      month,
      day
    );

    const dateLabel =
      cellDate.toLocaleDateString(
        'ar-EG-u-nu-latn',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }
      );

    if (cellDate > today) {
      return `${dateLabel} - تاريخ قادم`;
    }

    if (
      daysWithAssessments.has(day)
    ) {
      return `${dateLabel} - يوجد تقييم مسجل`;
    }

    return `${dateLabel} - لا يوجد تقييم مسجل`;
  }

  const canGoNext =
    !currentMonthIsCurrent &&
    !currentMonthIsFuture;

  if (loading) {
    return (
      <p
        className="muted-text"
        role="status"
        aria-live="polite"
      >
        جارٍ تحميل التقويم...
      </p>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        role="alert"
      >
        <h3>
          تعذر تحميل التقويم
        </h3>

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
    <details
      className="card calendar-card"
    >
      <summary className="calendar-disclosure-summary">
        <span className="calendar-disclosure-title">
          التقويم الشهري
        </span>
        <span className="calendar-disclosure-meta">
          {monthNames[month]} {year} · {daysWithAssessments.size}{' '}
          أيام بتقييم
        </span>
      </summary>

      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav"
          onClick={prevMonth}
          aria-label="الشهر السابق"
        >
          ‹
        </button>

        <h3 aria-live="polite">
          {monthNames[month]} {year}
        </h3>

        <button
          type="button"
          className="calendar-nav"
          onClick={nextMonth}
          disabled={!canGoNext}
          aria-label="الشهر التالي"
          aria-disabled={!canGoNext}
        >
          ›
        </button>
      </div>

      <div
        className="calendar-grid calendar-labels"
        aria-hidden="true"
      >
        {dayNames.map((dayName) => (
          <div
            key={dayName}
            className="calendar-label"
          >
            {dayName}
          </div>
        ))}
      </div>

      <div
        className="calendar-grid"
        role="grid"
        aria-label={`تقويم ${monthNames[month]} ${year}`}
      >
        {cells.map((day, index) => (
          <div
            key={`${year}-${month}-${day || 'empty'}-${index}`}
            className={`calendar-cell ${getCellClass(day)}`}
            role="gridcell"
            aria-label={getCellLabel(day)}
            aria-colindex={
              day
                ? ((firstDayOfMonth + day - 1) %
                    7) + 1
                : undefined
            }
          >
            {day || ''}
          </div>
        ))}
      </div>

      <div
        className="calendar-legend"
        aria-label="مفتاح التقويم"
      >
        <span
          className="legend-dot legend-neutral"
          aria-hidden="true"
        />

        <span>يوم فيه تقييم مسجل</span>

        <span
          className="legend-dot legend-empty"
          aria-hidden="true"
        />

        <span>يوم دون تقييم مسجل</span>
      </div>

      <p
        className="muted-text"
        style={{ marginTop: 12 }}
      >
        يوضح التقويم الأيام التي سُجل فيها تقييم، وليس
        بالضرورة أيام حدوث نوبة صداع.
      </p>
    </details>
  );
}

export default CalendarView;
import { useState, useEffect } from 'react';
import { getAssessments } from '../utils/storage';

const monthNames = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function CalendarView() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    getAssessments().then((data) => {
      setAssessments(data);
      setLoading(false);
    });
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const daysWithHeadache = new Set(
    assessments
      .filter((a) => {
        const d = new Date(a.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((a) => new Date(a.date).getDate())
  );

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function getCellClass(day) {
    if (!day) return '';

    const cellDate = new Date(year, month, day);
    const isFuture = cellDate > today;
    if (isFuture) return '';

    return daysWithHeadache.has(day) ? 'has-headache' : 'good-day';
  }

  if (loading) return <p className="muted-text">جارٍ التحميل...</p>;

  return (
    <div className="card calendar-card">
      <div className="calendar-header">
        <button className="calendar-nav" onClick={prevMonth}>‹</button>
        <h3>{monthNames[month]} {year}</h3>
        <button className="calendar-nav" onClick={nextMonth}>›</button>
      </div>

      <div className="calendar-grid calendar-labels">
        {['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map((d) => (
          <div key={d} className="calendar-label">{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((day, i) => (
          <div key={i} className={`calendar-cell ${getCellClass(day)}`}>
            {day || ''}
          </div>
        ))}
      </div>

      <div className="calendar-legend">
        <span className="legend-dot legend-red"></span> يوم فيه نوبة صداع
        <span className="legend-dot legend-green" style={{ marginRight: 16 }}></span> يوم بدون صداع
      </div>
    </div>
  );
}

export default CalendarView;
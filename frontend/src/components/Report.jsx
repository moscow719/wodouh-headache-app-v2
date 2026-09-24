import { useState, useEffect } from 'react';
import { getAssessments } from '../utils/storage';

const typeLabels = {
  tension: 'صداع توتري',
  migraine: 'صداع نصفي',
  cluster: 'صداع عنقودي',
  sinus: 'صداع جيوب أنفية',
  eye_strain: 'إجهاد عين',
  dehydration: 'جفاف',
};

function Report({ onNavigate }) {
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    setAssessments(getAssessments());
  }, []);

  if (assessments.length === 0) {
    return (
      <div className="card coming-soon">
        <h2>مفيش بيانات كافية للتقرير</h2>
        <p className="muted-text">لازم تعمل تقييم واحد على الأقل عشان يظهر التقرير هنا.</p>
        <button className="btn primary" onClick={() => onNavigate('assess')}>
          ابدأ تقييم الآن
        </button>
      </div>
    );
  }

  const totalCount = assessments.length;

  const avgConfidence = Math.round(
    assessments.reduce((sum, a) => sum + (a.confidence || 0), 0) / totalCount
  );

  const typeCounts = {};
  assessments.forEach((a) => {
    if (a.primaryType) {
      typeCounts[a.primaryType] = (typeCounts[a.primaryType] || 0) + 1;
    }
  });

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  const firstDate = new Date(assessments[assessments.length - 1].date);
  const lastDate = new Date(assessments[0].date);

  function formatDate(date) {
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <div>
      <div className="page-head no-print">
        <div>
          <h1>تقرير الطبيب</h1>
          <p className="muted-text">ملخص جاهز يوفر وقت الكشف ويوضح الصورة كاملة.</p>
        </div>
        <button className="btn primary" onClick={() => window.print()}>
          ⬇ تحميل PDF
        </button>
      </div>

      <div className="printable-report">
        <h1 className="print-only-title">تقرير الطبيب — وضوح</h1>

        <div className="stats-grid stats-grid-3">
          <div className="card stat-card">
            <span className="stat-num">{totalCount}</span>
            <span className="stat-label">عدد التقييمات</span>
          </div>
          <div className="card stat-card">
            <span className="stat-num">{avgConfidence}%</span>
            <span className="stat-label">متوسط نسبة التوافق</span>
          </div>
          <div className="card stat-card">
            <span className="stat-num" style={{ fontSize: '1rem' }}>
              {formatDate(firstDate)} — {formatDate(lastDate)}
            </span>
            <span className="stat-label">الفترة الزمنية</span>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h3 style={{ marginTop: 0 }}>توزيع الأنماط المحتملة</h3>
          <div className="prob-list">
            {sortedTypes.map(([type, count]) => {
              const percentage = Math.round((count / totalCount) * 100);
              return (
                <div className="prob-row" key={type}>
                  <span className="prob-label">{typeLabels[type] || type}</span>
                  <div className="prob-track">
                    <div className="prob-fill" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <span className="prob-value">
                    {count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="print-only-disclaimer">
          هذا التقرير من أداة "وضوح" لأغراض التوعية فقط، وليس تشخيصًا طبيًا نهائيًا.
        </p>
      </div>
    </div>
  );
}

export default Report;
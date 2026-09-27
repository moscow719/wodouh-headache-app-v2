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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getAssessments();
      setAssessments(data);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <p className="muted-text">جارٍ التحميل...</p>;
  }

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

  // Group assessments by month to show a trend over time.
  const monthlyData = {};
  assessments.forEach((a) => {
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthlyData[key]) {
      monthlyData[key] = { count: 0, totalConfidence: 0, label: d.toLocaleDateString('ar-EG', { month: 'short' }) };
    }
    monthlyData[key].count += 1;
    monthlyData[key].totalConfidence += a.confidence || 0;
  });

  const monthlyEntries = Object.entries(monthlyData)
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .slice(-6);

  const maxCount = Math.max(...monthlyEntries.map(([, v]) => v.count), 1);

  const firstDate = new Date(assessments[assessments.length - 1].date);
  const lastDate = new Date(assessments[0].date);

  function formatDate(date) {
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function buildSummaryText() {
    return `تقرير NeuroPath للصداع:
عدد التقييمات: ${totalCount}
متوسط نسبة التوافق: ${avgConfidence}%
الفترة: ${formatDate(firstDate)} - ${formatDate(lastDate)}
أكثر الأنماط: ${sortedTypes.map(([type]) => typeLabels[type] || type).join(', ')}

(تم إنشاء هذا التقرير عبر تطبيق NeuroPath، وهو لأغراض التوعية فقط وليس تشخيصًا طبيًا)`;
  }

  function handleWhatsAppShare() {
    const text = encodeURIComponent(buildSummaryText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function handleEmailShare() {
    const subject = encodeURIComponent('تقرير وضوح للصداع');
    const body = encodeURIComponent(buildSummaryText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div>
      <div className="page-head no-print">
        <div>
          <h1>تقرير الطبيب</h1>
          <p className="muted-text">ملخص جاهز يوفر وقت الكشف ويوضح الصورة كاملة.</p>
        </div>
        <div className="report-actions">
          <button className="btn primary" onClick={() => window.print()}>
            ⬇ تحميل PDF
          </button>
          <button className="btn whatsapp-btn" onClick={handleWhatsAppShare}>
            📱 مشاركة عبر واتساب
          </button>
          <button className="btn ghost" onClick={handleEmailShare}>
            ✉️ مشاركة عبر إيميل
          </button>
        </div>
      </div>

      <div className="printable-report">
        <h1 className="print-only-title">تقرير الطبيب — NeuroPath</h1>

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

        {monthlyEntries.length > 1 && (
          <div className="card" style={{ marginTop: 18 }}>
            <h3 style={{ marginTop: 0 }}>عدد النوبات عبر الأشهر</h3>
            <div className="trend-chart">
              {monthlyEntries.map(([key, v]) => (
                <div key={key} className="trend-bar-col">
                  <div
                    className="trend-bar"
                    style={{ height: `${(v.count / maxCount) * 100}%` }}
                  >
                    <span className="trend-bar-value">{v.count}</span>
                  </div>
                  <span className="trend-bar-label">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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

        <div className="card no-print" style={{ marginTop: 18, textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>QR Code لملخص التقرير</h3>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(buildSummaryText())}`}
            alt="QR Code"
            style={{ margin: '10px auto', display: 'block' }}
          />
          <p className="muted-text">امسح الكود عشان توصل لملخص التقرير بسرعة.</p>
        </div>

        <p className="print-only-disclaimer">
          هذا التقرير من أداة "NeuroPath" لأغراض التوعية فقط، وليس تشخيصًا طبيًا نهائيًا.
        </p>
      </div>
    </div>
  );
}

export default Report;
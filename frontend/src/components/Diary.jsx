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

function Diary({ onNavigate }) {
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    setAssessments(getAssessments());
  }, []);

  function formatDate(isoDate) {
    return new Date(isoDate).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>سجل الصداع</h1>
          <p className="muted-text">كل التقييمات اللي عملتها، من الأحدث للأقدم.</p>
        </div>
        <button className="btn primary" onClick={() => onNavigate('assess')}>
          + تقييم جديد
        </button>
      </div>

      {assessments.length === 0 && (
        <div className="card coming-soon">
          <h2>مفيش تقييمات لسه</h2>
          <p className="muted-text">لما تعمل تقييم، هيظهر هنا في السجل.</p>
        </div>
      )}

      {assessments.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="diary-table">
            <thead>
              <tr>
                <th>التاريخ والوقت</th>
                <th>النمط المحتمل</th>
                <th>نسبة التوافق</th>
                <th>التخصص المقترح</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.date)}</td>
                  <td>{typeLabels[item.primaryType] || '—'}</td>
                  <td>{item.confidence ? `${item.confidence}%` : '—'}</td>
                  <td>{item.specialty?.ar || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Diary;
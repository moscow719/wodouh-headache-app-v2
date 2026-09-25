import { useState, useEffect } from 'react';
import { getAssessmentStats, getLatestAssessment } from '../utils/storage';
import FamilyHistory from './FamilyHistory';

const typeLabels = {
  tension: 'صداع توتري',
  migraine: 'صداع نصفي',
  cluster: 'صداع عنقودي',
  sinus: 'صداع جيوب أنفية',
  eye_strain: 'إجهاد عين',
  dehydration: 'جفاف',
};

function Home({ onNavigate }) {
  const [stats, setStats] = useState({ totalAssessments: 0, mostCommonType: null });
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [statsData, latestData] = await Promise.all([
        getAssessmentStats(),
        getLatestAssessment(),
      ]);
      setStats(statsData);
      setLatest(latestData);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <p className="muted-text">جارٍ التحميل...</p>;
  }

  const formattedDate = latest
    ? new Date(latest.date).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>أهلًا بيك في وضوح</h1>
          <p className="muted-text">نظرة سريعة على حالتك بناءً على تقييماتك السابقة.</p>
        </div>
        <button className="btn primary" onClick={() => onNavigate('assess')}>
          ابدأ تقييم جديد
        </button>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-num">{stats.totalAssessments}</span>
          <span className="stat-label">إجمالي التقييمات</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num">
            {stats.mostCommonType ? typeLabels[stats.mostCommonType] : '—'}
          </span>
          <span className="stat-label">أكثر نمط تكرارًا</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>آخر تقييم لك</h3>

        {!latest && (
          <p className="muted-text">
            لسه معملتش أي تقييم. دوس "ابدأ تقييم جديد" عشان تبدأ أول تقييم ليك.
          </p>
        )}

        {latest && (
          <>
            <p className="muted-text" style={{ marginBottom: 10 }}>{formattedDate}</p>
            <p>{latest.analysis}</p>
            <div className="specialty-box">
              <strong>التخصص المقترح:</strong> {latest.specialty?.ar}
            </div>
          </>
        )}
</div>

      <div style={{ marginTop: 18 }}>
        <FamilyHistory />
      </div>
    </div>
  );
}

export default Home;
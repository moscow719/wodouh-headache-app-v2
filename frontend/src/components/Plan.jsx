import { useState, useEffect } from 'react';
import { getAssessmentStats } from '../utils/storage';
import { getPlanForType } from '../data/preventionPlans';

const typeLabels = {
  tension: 'صداع توتري',
  migraine: 'صداع نصفي',
  cluster: 'صداع عنقودي',
  sinus: 'صداع جيوب أنفية',
  eye_strain: 'إجهاد عين',
  dehydration: 'جفاف',
};

function Plan({ onNavigate }) {
  const [mostCommonType, setMostCommonType] = useState(null);

  useEffect(() => {
    const stats = getAssessmentStats();
    setMostCommonType(stats.mostCommonType);
  }, []);

  if (!mostCommonType) {
    return (
      <div className="card coming-soon">
        <h2>لسه معملتش تقييم</h2>
        <p className="muted-text">اعمل تقييم واحد على الأقل عشان نقدر نديك خطة وقاية مناسبة.</p>
        <button className="btn primary" onClick={() => onNavigate('assess')}>
          ابدأ تقييم الآن
        </button>
      </div>
    );
  }

  const plan = getPlanForType(mostCommonType);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>خطة الوقاية</h1>
          <p className="muted-text">
            مبنية على النمط الأكثر تكرارًا في تقييماتك: <strong>{typeLabels[mostCommonType]}</strong>
          </p>
        </div>
      </div>

      <div className="plan-grid">
        <div className="card plan-col">
          <h4>🍎 نصائح غذائية</h4>
          <ul>
            {plan.nutrition.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card plan-col">
          <h4>🌙 نمط الحياة</h4>
          <ul>
            {plan.lifestyle.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card plan-col">
          <h4>💊 الأدوية (عام)</h4>
          <ul>
            {plan.medication.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="emergency-note" style={{ marginTop: 18 }}>
        ⚠️ لو الصداع استمر لأكثر من 3 أيام أو زادت شدته، لازم تراجع طبيب.
      </div>
    </div>
  );
}

export default Plan;
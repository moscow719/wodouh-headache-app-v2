import { supabase } from '../supabaseClient';

function Sidebar({ activeView, onNavigate, fontScale, setFontScale, highContrast, setHighContrast }) {
  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: '🏠' },
    { id: 'assess', label: 'تقييم الصداع', icon: '💬' },
    { id: 'results', label: 'النتائج والتخصص', icon: '📊' },
    { id: 'plan', label: 'خطة الوقاية', icon: '🌿' },
    { id: 'compare', label: 'مقارنة الأنواع', icon: '⚖️' },
    { id: 'diary', label: 'سجل الصداع', icon: '📅' },
    { id: 'report', label: 'تقرير الطبيب', icon: '📄' },
    { id: 'assistant', label: 'المساعد الذكي', icon: '🤍' },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">🌤️</span> وضوح
      </div>

      <nav className="nav" aria-label="التنقل الرئيسي">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeView === item.id ? 'active' : ''}
            onClick={() => onNavigate(item.id)}
            aria-current={activeView === item.id ? 'page' : undefined}
          >
            <span className="icon" aria-hidden="true">{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>

      <div className="a11y-controls" role="group" aria-label="إعدادات إمكانية الوصول">
        <span className="a11y-label">حجم الخط</span>
        <div className="a11y-row">
          <button aria-label="تصغير الخط" onClick={() => setFontScale(Math.max(0.85, fontScale - 0.1))}>A-</button>
          <button aria-label="الحجم الافتراضي" onClick={() => setFontScale(1)}>A</button>
          <button aria-label="تكبير الخط" onClick={() => setFontScale(Math.min(1.4, fontScale + 0.1))}>A+</button>
        </div>
        <button
          className={`a11y-contrast ${highContrast ? 'active' : ''}`}
          onClick={() => setHighContrast(!highContrast)}
          aria-pressed={highContrast}
        >
          {highContrast ? '✓ تباين عالٍ مفعّل' : 'تفعيل تباين عالٍ'}
        </button>
      </div>

      <button className="logout-button" onClick={handleLogout}>
        <span className="icon" aria-hidden="true">🚪</span> تسجيل الخروج
      </button>

      <div className="sidebar-footer">
        وضوح — أداة توعية، وليست بديلًا عن تشخيص الطبيب.
      </div>
    </aside>
  );
}

export default Sidebar;
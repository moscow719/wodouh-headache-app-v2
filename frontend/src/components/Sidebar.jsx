function Sidebar({ activeView, onNavigate }) {
  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: '🏠' },
    { id: 'assess', label: 'تقييم الصداع', icon: '💬' },
    { id: 'results', label: 'النتائج والتخصص', icon: '📊' },
    { id: 'plan', label: 'خطة الوقاية', icon: '🌿' },
    { id: 'diary', label: 'سجل الصداع', icon: '📅' },
    { id: 'report', label: 'تقرير الطبيب', icon: '📄' },
    { id: 'assistant', label: 'المساعد الذكي', icon: '🤍' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">🌤️</span> وضوح
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeView === item.id ? 'active' : ''}
            onClick={() => onNavigate(item.id)}
          >
            <span className="icon">{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        وضوح — أداة توعية، وليست بديلًا عن تشخيص الطبيب.
      </div>
    </aside>
  );
}

export default Sidebar;
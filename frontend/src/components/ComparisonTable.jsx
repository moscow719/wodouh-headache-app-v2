const comparisonData = [
  {
    type: 'صداع توتري',
    location: 'الرأس بالكامل، زي حزام ضاغط',
    quality: 'ضغط أو شد، مش نابض',
    duration: '30 دقيقة إلى عدة أيام',
    associated: 'نادرًا ما يصاحبه غثيان',
    triggers: 'التوتر، إجهاد العين، قلة النوم',
  },
  {
    type: 'صداع نصفي (ميجرين)',
    location: 'غالبًا جانب واحد من الرأس',
    quality: 'نابض أو خافق',
    duration: '4 إلى 72 ساعة',
    associated: 'غثيان، حساسية للضوء والصوت',
    triggers: 'هرمونات، أطعمة معينة، قلة نوم، ضوء ساطع',
  },
  {
    type: 'صداع عنقودي',
    location: 'حول عين واحدة أو جانب واحد',
    quality: 'حاد جدًا وحارق',
    duration: '15 دقيقة إلى 3 ساعات، بنوبات متكررة',
    associated: 'دموع، احمرار العين، انسداد الأنف من جهة واحدة',
    triggers: 'الكحول، التدخين، تغير أوقات النوم',
  },
];

const rows = [
  { key: 'location', label: 'مكان الألم' },
  { key: 'quality', label: 'طبيعة الألم' },
  { key: 'duration', label: 'المدة المعتادة' },
  { key: 'associated', label: 'أعراض مصاحبة' },
  { key: 'triggers', label: 'محفزات شائعة' },
];

function ComparisonTable() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>مقارنة أنواع الصداع</h1>
          <p className="muted-text">فهم الفروق بين الأنواع الشائعة يساعدك تلاحظ نمط حالتك بنفسك.</p>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th></th>
              {comparisonData.map((col) => (
                <th key={col.type}>{col.type}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="comparison-label">{row.label}</td>
                {comparisonData.map((col) => (
                  <td key={col.type}>{col[row.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="emergency-note" style={{ marginTop: 18 }}>
        ⚠️ الجدول ده للتوعية العامة بس، وموجود عشان يساعدك تفهم حالتك أكتر — مش أداة تشخيص.
        التشخيص الفعلي محتاج فحص طبيب.
      </div>
    </div>
  );
}

export default ComparisonTable;
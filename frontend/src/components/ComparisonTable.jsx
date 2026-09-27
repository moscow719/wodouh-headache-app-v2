const comparisonData = [
  {
    type: 'صداع توتري',
    location:
      'غالبًا على جانبي الرأس أو حول الرأس، وقد يمتد للرقبة أو الوجه',
    quality:
      'ضغط أو شد، وغالبًا لا يكون نابضًا',
    duration:
      'قد يستمر من نحو 30 دقيقة إلى عدة أيام',
    associated:
      'عادةً لا يصاحبه غثيان أو قيء، وقد توجد حساسية للضوء أو الصوت',
    triggers:
      'قد يرتبط بالتوتر، اضطراب النوم، إجهاد العضلات، أو عوامل أخرى',
  },
  {
    type: 'صداع نصفي (ميجرين)',
    location:
      'قد يكون في جانب واحد أو جانبي الرأس',
    quality:
      'غالبًا نابض أو خافق، وقد يزداد مع النشاط',
    duration:
      'غالبًا يستمر من 4 إلى 72 ساعة عند البالغين',
    associated:
      'قد يصاحبه غثيان أو قيء وحساسية للضوء أو الصوت، وقد تظهر أعراض بصرية أو حسية لدى بعض الأشخاص',
    triggers:
      'قد يرتبط لدى بعض الأشخاص بقلة النوم، التوتر، تغيرات هرمونية، الضوء، أو محفزات شخصية أخرى',
  },
  {
    type: 'صداع عنقودي',
    location:
      'عادةً حول عين واحدة أو في جانب واحد من الرأس',
    quality:
      'ألم شديد جدًا قد يوصف بأنه حارق أو طاعن',
    duration:
      'عادةً تستمر النوبة من نحو 15 دقيقة إلى 3 ساعات، وقد تتكرر خلال فترات معينة',
    associated:
      'قد يحدث في نفس جانب الألم دموع أو احمرار بالعين، واحتقان أو سيلان بالأنف، أو أعراض أخرى',
    triggers:
      'قد يرتبط الكحول خلال فترات نشاط الصداع وبعض العوامل الأخرى، وقد تختلف المحفزات بين الأشخاص',
  },
];

const rows = [
  {
    key: 'location',
    label: 'مكان الألم',
  },
  {
    key: 'quality',
    label: 'طبيعة الألم',
  },
  {
    key: 'duration',
    label: 'المدة الشائعة',
  },
  {
    key: 'associated',
    label: 'أعراض مصاحبة محتملة',
  },
  {
    key: 'triggers',
    label: 'محفزات أو ارتباطات محتملة',
  },
];

function ComparisonTable() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>مقارنة بعض أنماط الصداع</h1>

          <p className="muted-text">
            المعلومات التالية تعرض صفات شائعة لبعض أنماط
            الصداع، بهدف مساعدتك على فهم وصف الأعراض
            وملاحظتها بشكل أفضل.
          </p>
        </div>
      </div>

      <div
        className="card"
        style={{ overflowX: 'auto' }}
      >
        <table className="comparison-table">
          <caption className="sr-only">
            مقارنة توعوية بين بعض أنماط الصداع الشائعة
          </caption>

          <thead>
            <tr>
              <th scope="col">
                الخاصية
              </th>

              {comparisonData.map((column) => (
                <th
                  key={column.type}
                  scope="col"
                >
                  {column.type}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="comparison-label"
                >
                  {row.label}
                </th>

                {comparisonData.map((column) => (
                  <td key={column.type}>
                    {column[row.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="emergency-note"
        style={{ marginTop: 18 }}
        role="note"
      >
        <strong>مهم:</strong>{' '}
        الجدول ده للتوعية العامة فقط، ومش أداة لتشخيص نوع
        الصداع. الصفات والمدة والأعراض ممكن تختلف من شخص
        للتاني، وممكن تتشابه بين أنماط مختلفة. لو الصداع
        جديد، شديد بشكل غير معتاد، متكرر، أو مختلف عن
        نمطك المعتاد، ناقش الأعراض مع طبيب.
      </div>
    </div>
  );
}

export default ComparisonTable;
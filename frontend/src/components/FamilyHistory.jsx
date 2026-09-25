import { useState, useEffect } from 'react';
import { getProfile, saveFamilyHistory } from '../utils/storage';

const options = [
  { id: 'migraine', label: 'صداع نصفي (ميجرين) في العائلة' },
  { id: 'neurological', label: 'مشاكل عصبية أخرى في العائلة' },
  { id: 'none', label: 'لا يوجد تاريخ عائلي معروف' },
];

function FamilyHistory() {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    getProfile().then((profile) => {
      if (profile?.family_history) {
        setSelected(profile.family_history.split(','));
      }
      setLoading(false);
    });
  }, []);

  function toggleOption(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSavedMessage(false);
  }

  async function handleSave() {
    setSaving(true);
    await saveFamilyHistory(selected.join(','));
    setSaving(false);
    setSavedMessage(true);
  }

  if (loading) return <p className="muted-text">جارٍ التحميل...</p>;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>👨‍👧 التاريخ العائلي</h3>
      <p className="muted-text">
        وجود صداع نصفي أو مشاكل عصبية في العائلة عامل مهم في فهم حالتك — المعلومة دي هتفيد أي
        طبيب تراجعه.
      </p>

      <div className="family-options">
        {options.map((opt) => (
          <label key={opt.id} className="family-checkbox">
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              onChange={() => toggleOption(opt.id)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <button className="btn primary" onClick={handleSave} disabled={saving} style={{ marginTop: 16 }}>
        {saving ? 'جارٍ الحفظ...' : 'حفظ'}
      </button>

      {savedMessage && <p className="specialty-box" style={{ marginTop: 12 }}>تم الحفظ بنجاح.</p>}
    </div>
  );
}

export default FamilyHistory;
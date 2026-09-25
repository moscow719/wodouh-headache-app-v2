import { useState, useEffect } from 'react';
import { saveMedication, getMedications } from '../utils/storage';

function MedicationTracker() {
  const [medications, setMedications] = useState([]);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedications();
  }, []);

  async function loadMedications() {
    const data = await getMedications();
    setMedications(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (name.trim().length === 0) return;

    setSaving(true);
    await saveMedication(name.trim(), dose.trim());
    setName('');
    setDose('');
    setSaving(false);
    loadMedications();
  }

  function formatDate(isoDate) {
    return new Date(isoDate).toLocaleString('ar-EG', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Count medications taken in the last 24 hours to flag possible overuse.
  const last24hCount = medications.filter((m) => {
    const takenAt = new Date(m.taken_at);
    const hoursSince = (Date.now() - takenAt.getTime()) / (1000 * 60 * 60);
    return hoursSince <= 24;
  }).length;

  return (
    <div className="card medication-tracker">
      <h3 style={{ marginTop: 0 }}>💊 متتبع الأدوية</h3>
      <p className="muted-text">سجّل أي دواء تاخده عشان تتابع استخدامه بمرور الوقت.</p>

      <div className="medication-form">
        <input
          type="text"
          placeholder="اسم الدواء (مثال: إيبوبروفين)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="auth-input"
        />
        <input
          type="text"
          placeholder="الجرعة (اختياري، مثال: 400 مج)"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          className="auth-input"
        />
        <button className="btn primary" onClick={handleAdd} disabled={saving || name.trim().length === 0}>
          {saving ? 'جارٍ الحفظ...' : '+ تسجيل جرعة'}
        </button>
      </div>

      {last24hCount >= 3 && (
        <div className="emergency-note" style={{ marginTop: 16 }}>
          ⚠️ سجّلت {last24hCount} جرعات خلال آخر 24 ساعة. الإفراط في استخدام مسكنات الصداع قد
          يسبب بنفسه صداع الارتداد (Medication-Overuse Headache). استشر طبيب لو ده بيتكرر معاك.
        </div>
      )}

      <div className="medication-note">
        ملحوظة: مانقدرش نتأكد من التفاعلات الدوائية بدقة بين الأدوية المختلفة — دي معلومة لازم
        تتاخد من طبيب أو صيدلي مباشرة، خصوصًا لو بتاخد أدوية تانية بانتظام.
      </div>

      {loading && <p className="muted-text" style={{ marginTop: 16 }}>جارٍ التحميل...</p>}

      {!loading && medications.length === 0 && (
        <p className="muted-text" style={{ marginTop: 16 }}>مفيش أدوية مسجلة لسه.</p>
      )}

      {!loading && medications.length > 0 && (
        <ul className="medication-list">
          {medications.slice(0, 8).map((m) => (
            <li key={m.id}>
              <span>{m.name}{m.dose ? ` — ${m.dose}` : ''}</span>
              <span className="muted-text">{formatDate(m.taken_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MedicationTracker;
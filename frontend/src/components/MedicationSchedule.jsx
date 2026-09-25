import { useState, useEffect } from 'react';

const STORAGE_KEY = 'wodouh_medication_schedule';
const defaultTimes = [
  { id: 'morning', label: '8:00 صباحًا' },
  { id: 'noon', label: '2:00 ظهرًا' },
  { id: 'night', label: '8:00 مساءً' },
];

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function MedicationSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('morning');
  const [takenStatus, setTakenStatus] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSchedule(JSON.parse(saved));
    }

    const todayKey = `wodouh_taken_${getTodayKey()}`;
    const savedTaken = localStorage.getItem(todayKey);
    if (savedTaken) {
      setTakenStatus(JSON.parse(savedTaken));
    }
  }, []);

  function persistSchedule(updated) {
    setSchedule(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function handleAddSchedule() {
    if (newName.trim().length === 0) return;

    const updated = [...schedule, { id: Date.now().toString(), name: newName.trim(), timeId: newTime }];
    persistSchedule(updated);
    setNewName('');
  }

  function handleRemove(id) {
    persistSchedule(schedule.filter((s) => s.id !== id));
  }

  function toggleTaken(scheduleId) {
    const updated = { ...takenStatus, [scheduleId]: !takenStatus[scheduleId] };
    setTakenStatus(updated);
    localStorage.setItem(`wodouh_taken_${getTodayKey()}`, JSON.stringify(updated));
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>⏰ جدول الجرعات اليومي</h3>
      <p className="muted-text">
        حدد مواعيد أدويتك اليومية، وتابع إيه اللي أخدته النهاردة.
      </p>

      <div className="schedule-form">
        <input
          type="text"
          placeholder="اسم الدواء"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="auth-input"
        />
        <select value={newTime} onChange={(e) => setNewTime(e.target.value)} className="auth-input">
          {defaultTimes.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <button className="btn primary" onClick={handleAddSchedule} disabled={newName.trim().length === 0}>
          + إضافة
        </button>
      </div>

      {schedule.length === 0 && (
        <p className="muted-text" style={{ marginTop: 16 }}>مفيش مواعيد مضافة لسه.</p>
      )}

      {schedule.length > 0 && (
        <ul className="schedule-list">
          {schedule.map((item) => {
            const timeLabel = defaultTimes.find((t) => t.id === item.timeId)?.label;
            const isTaken = !!takenStatus[item.id];

            return (
              <li key={item.id} className={`schedule-item ${isTaken ? 'taken' : ''}`}>
                <label className="schedule-checkbox">
                  <input type="checkbox" checked={isTaken} onChange={() => toggleTaken(item.id)} />
                  <span className="bell-icon">🔔</span>
                  <span>{item.name}</span>
                  <span className="muted-text">{timeLabel}</span>
                </label>
                <span className={`taken-status ${isTaken ? 'yes' : 'no'}`}>
                  {isTaken ? 'تم تناوله' : 'لم يُتناول بعد'}
                </span>
                <button className="schedule-remove" onClick={() => handleRemove(item.id)}>✕</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MedicationSchedule;
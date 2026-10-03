import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const STORAGE_KEY_PREFIX =
  'neuropath_medication_schedule_';

const TAKEN_STORAGE_PREFIX =
  'neuropath_medication_taken_';

const MAX_NAME_LENGTH = 100;
const MAX_SCHEDULE_ITEMS = 30;
const MAX_ID_LENGTH = 100;

const defaultTimes = Object.freeze([
  {
    id: 'morning',
    label: '8:00 صباحًا',
  },
  {
    id: 'noon',
    label: '2:00 ظهرًا',
  },
  {
    id: 'night',
    label: '8:00 مساءً',
  },
]);

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');
  const day = String(
    now.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getUserStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function getTakenStorageKey(userId) {
  return `${TAKEN_STORAGE_PREFIX}${userId}_${getTodayKey()}`;
}

function isValidScheduleItem(item) {
  return (
    item &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    item.id.length <= MAX_ID_LENGTH &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0 &&
    item.name.trim().length <=
      MAX_NAME_LENGTH &&
    typeof item.timeId === 'string' &&
    defaultTimes.some(
      (time) =>
        time.id === item.timeId
    )
  );
}

function normalizeSchedule(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set();

  return value
    .filter(isValidScheduleItem)
    .filter((item) => {
      if (seenIds.has(item.id)) {
        return false;
      }

      seenIds.add(item.id);
      return true;
    })
    .slice(0, MAX_SCHEDULE_ITEMS)
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      timeId: item.timeId,
    }));
}

function normalizeTakenStatus(
  value,
  validScheduleIds
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {};
  }

  const normalized = {};

  Object.entries(value).forEach(
    ([id, status]) => {
      if (
        typeof id === 'string' &&
        id.length > 0 &&
        id.length <= MAX_ID_LENGTH &&
        status === true &&
        validScheduleIds.has(id)
      ) {
        normalized[id] = true;
      }
    }
  );

  return normalized;
}

function readJsonFromStorage(
  key,
  fallback
) {
  try {
    const rawValue =
      localStorage.getItem(key);

    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    console.error(
      `Failed to read localStorage key "${key}":`,
      error
    );

    return fallback;
  }
}

function createScheduleId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return crypto.randomUUID();
  }

  return `schedule-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function MedicationSchedule() {
  const [userId, setUserId] =
    useState(null);

  const [schedule, setSchedule] =
    useState([]);

  const [newName, setNewName] =
    useState('');

  const [newTime, setNewTime] =
    useState('morning');

  const [takenStatus, setTakenStatus] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadForUser(user) {
      if (!user?.id) {
        if (!isMounted) {
          return;
        }

        setUserId(null);
        setSchedule([]);
        setTakenStatus({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const scheduleKey =
          getUserStorageKey(
            user.id
          );

        const takenKey =
          getTakenStorageKey(
            user.id
          );

        const savedSchedule =
          readJsonFromStorage(
            scheduleKey,
            []
          );

        const validSchedule =
          normalizeSchedule(
            savedSchedule
          );

        const validScheduleIds =
          new Set(
            validSchedule.map(
              (item) => item.id
            )
          );

        const savedTaken =
          readJsonFromStorage(
            takenKey,
            {}
          );

        const validTaken =
          normalizeTakenStatus(
            savedTaken,
            validScheduleIds
          );

        if (!isMounted) {
          return;
        }

        setUserId(user.id);
        setSchedule(
          validSchedule
        );
        setTakenStatus(
          validTaken
        );
        setError(null);
      } catch (err) {
        console.error(
          'Failed to load medication schedule:',
          err
        );

        if (isMounted) {
          setUserId(user.id);
          setSchedule([]);
          setTakenStatus({});
          setError(
            'تعذر تحميل جدول الأدوية. حاول مرة أخرى.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    async function initialize() {
      try {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        await loadForUser(user);
      } catch (err) {
        console.error(
          'Failed to load authenticated user:',
          err
        );

        if (isMounted) {
          setUserId(null);
          setSchedule([]);
          setTakenStatus({});
          setError(
            'تعذر تحميل بيانات المستخدم. حاول مرة أخرى.'
          );
          setLoading(false);
        }
      }
    }

    initialize();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          const nextUser =
            session?.user || null;

          loadForUser(nextUser);
        }
      );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function persistSchedule(
    updatedSchedule
  ) {
    if (!userId) {
      setError(
        'لا يمكن حفظ جدول الأدوية بدون تسجيل الدخول.'
      );
      return false;
    }

    const normalizedSchedule =
      normalizeSchedule(
        updatedSchedule
      );

    try {
      localStorage.setItem(
        getUserStorageKey(userId),
        JSON.stringify(
          normalizedSchedule
        )
      );

      setSchedule(
        normalizedSchedule
      );

      setError(null);

      return true;
    } catch (error) {
      console.error(
        'Failed to save medication schedule:',
        error
      );

      setError(
        'تعذر حفظ جدول الأدوية على الجهاز.'
      );

      return false;
    }
  }

  function persistTakenStatus(
    updatedStatus,
    currentSchedule = schedule
  ) {
    if (!userId) {
      setError(
        'لا يمكن حفظ حالة الدواء بدون تسجيل الدخول.'
      );
      return false;
    }

    const validScheduleIds =
      new Set(
        currentSchedule.map(
          (item) => item.id
        )
      );

    const normalizedStatus =
      normalizeTakenStatus(
        updatedStatus,
        validScheduleIds
      );

    try {
      localStorage.setItem(
        getTakenStorageKey(userId),
        JSON.stringify(
          normalizedStatus
        )
      );

      setTakenStatus(
        normalizedStatus
      );

      setError(null);

      return true;
    } catch (error) {
      console.error(
        'Failed to save medication taken status:',
        error
      );

      setError(
        'تعذر حفظ حالة الدواء على الجهاز.'
      );

      return false;
    }
  }

  function handleAddSchedule() {
    if (loading) {
      return;
    }

    if (!userId) {
      setError(
        'لا يمكن إضافة موعد بدون تسجيل الدخول.'
      );
      return;
    }

    if (
      schedule.length >=
      MAX_SCHEDULE_ITEMS
    ) {
      setError(
        `لا يمكن إضافة أكثر من ${MAX_SCHEDULE_ITEMS} موعدًا إلى الجدول.`
      );
      return;
    }

    const normalizedName =
      newName.trim();

    if (!normalizedName) {
      setError(
        'من فضلك اكتب اسم الدواء.'
      );
      return;
    }

    if (
      normalizedName.length >
      MAX_NAME_LENGTH
    ) {
      setError(
        `اسم الدواء طويل جدًا. الحد الأقصى ${MAX_NAME_LENGTH} حرف.`
      );
      return;
    }

    const selectedTimeExists =
      defaultTimes.some(
        (time) =>
          time.id === newTime
      );

    if (!selectedTimeExists) {
      setError(
        'موعد التناول غير صالح.'
      );
      return;
    }

    const newItem = {
      id: createScheduleId(),
      name: normalizedName,
      timeId: newTime,
    };

    const updatedSchedule = [
      ...schedule,
      newItem,
    ];

    const saved =
      persistSchedule(
        updatedSchedule
      );

    if (!saved) {
      return;
    }

    setNewName('');
    setError(null);
  }

  function handleRemove(id) {
    if (
      !userId ||
      typeof id !== 'string'
    ) {
      return;
    }

    const updatedSchedule =
      schedule.filter(
        (item) => item.id !== id
      );

    const updatedTaken = {
      ...takenStatus,
    };

    delete updatedTaken[id];

    const scheduleSaved =
      persistSchedule(
        updatedSchedule
      );

    if (!scheduleSaved) {
      return;
    }

    const takenSaved =
      persistTakenStatus(
        updatedTaken,
        updatedSchedule
      );

    if (!takenSaved) {
      return;
    }

    setError(null);
  }

  function toggleTaken(
    scheduleId
  ) {
    if (
      !userId ||
      typeof scheduleId !== 'string'
    ) {
      return;
    }

    const scheduleExists =
      schedule.some(
        (item) =>
          item.id === scheduleId
      );

    if (!scheduleExists) {
      return;
    }

    const updated = {
      ...takenStatus,
      [scheduleId]:
        !takenStatus[scheduleId],
    };

    persistTakenStatus(
      updated
    );
  }

  return (
    <div className="card schedule-card">
      <h3 style={{ marginTop: 0 }}>
        <span
          className="section-title-icon"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>{' '}
        جدول الأدوية اليومي
      </h3>

      <p className="muted-text">
        استخدم الجدول كتذكير وتسجيل
        للأدوية حسب المواعيد التي حددها
        لك طبيبك أو الصيدلي.
      </p>

      {error && (
        <p
          className="analysis-error"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}

      <div className="schedule-form">
        <label htmlFor="schedule-medication-name">
          اسم الدواء
        </label>

        <input
          id="schedule-medication-name"
          type="text"
          placeholder="اسم الدواء"
          value={newName}
          onChange={(event) => {
            setNewName(
              event.target.value.slice(
                0,
                MAX_NAME_LENGTH
              )
            );
            setError(null);
          }}
          className="auth-input"
          maxLength={
            MAX_NAME_LENGTH
          }
          autoComplete="off"
          disabled={loading}
        />

        <label
          htmlFor="schedule-medication-time"
          style={{ marginTop: 10 }}
        >
          موعد التناول
        </label>

        <select
          id="schedule-medication-time"
          value={newTime}
          onChange={(event) => {
            const value =
              event.target.value;

            if (
              defaultTimes.some(
                (time) =>
                  time.id === value
              )
            ) {
              setNewTime(value);
            }

            setError(null);
          }}
          className="auth-input"
          disabled={loading}
        >
          {defaultTimes.map(
            (time) => (
              <option
                key={time.id}
                value={time.id}
              >
                {time.label}
              </option>
            )
          )}
        </select>

        <button
          type="button"
          className="btn secondary schedule-submit"
          onClick={
            handleAddSchedule
          }
          disabled={
            loading
          }
          aria-busy={loading}
        >
          إضافة إلى الجدول
        </button>
      </div>

      {!loading && userId && (
        <p className="schedule-storage-note" role="note">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M8 22h8m-4-4v4m-6-9 3-3 3 3 2-2 3 3" />
          </svg>
          <span>
            الجدول محفوظ على هذا الجهاز فقط. قد تفقده
            عند تغيير الجهاز أو مسح بيانات المتصفح.
          </span>
        </p>
      )}

      {loading && (
        <p
          className="muted-text"
          style={{ marginTop: 16 }}
          role="status"
          aria-live="polite"
        >
          جارٍ تحميل جدول الأدوية...
        </p>
      )}

      {!loading &&
        schedule.length === 0 && (
          <p
            className="muted-text"
            style={{ marginTop: 16 }}
          >
            لا توجد مواعيد مضافة بعد.
          </p>
        )}

      {!loading &&
        schedule.length > 0 && (
          <ul className="schedule-list">
            {schedule.map(
              (item) => {
                const timeLabel =
                  defaultTimes.find(
                    (time) =>
                      time.id ===
                      item.timeId
                  )?.label ||
                  'موعد غير محدد';

                const isTaken =
                  takenStatus[
                    item.id
                  ] === true;

                return (
                  <li
                    key={item.id}
                    className={`schedule-item ${
                      isTaken
                        ? 'taken'
                        : ''
                    }`}
                  >
                    <label className="schedule-checkbox">
                      <input
                        type="checkbox"
                        checked={isTaken}
                        onChange={() =>
                          toggleTaken(
                            item.id
                          )
                        }
                        aria-label={`تسجيل ${item.name} ${
                          isTaken
                            ? 'تم تسجيل تناوله'
                            : 'لم يتم تسجيل تناوله'
                        }`}
                      />

                      <span
                        className="bell-icon"
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          focusable="false"
                        >
                          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12a2 2 0 0 0 4 0" />
                        </svg>
                      </span>

                      <span>
                        {item.name}
                      </span>

                      <span className="muted-text">
                        {timeLabel}
                      </span>
                    </label>

                    <span
                      className={`taken-status ${
                        isTaken
                          ? 'yes'
                          : 'no'
                      }`}
                      aria-live="polite"
                    >
                      {isTaken
                        ? 'تم تسجيل التناول'
                        : 'لم يُسجل بعد'}
                    </span>

                    <button
                      type="button"
                      className="schedule-remove"
                      onClick={() =>
                        handleRemove(
                          item.id
                        )
                      }
                      aria-label={`حذف موعد ${item.name}`}
                      title="حذف الموعد"
                    >
                      <span aria-hidden="true">
                        ✕
                      </span>
                    </button>
                  </li>
                );
              }
            )}
          </ul>
        )}

      {!loading &&
        schedule.length > 0 && (
          <p
            className="muted-text"
            style={{ marginTop: 16 }}
          >
            تخص حالة التناول المسجلة هذا اليوم فقط،
            وتُعاد تلقائيًا عند بدء يوم جديد. تُسجّل الحالة
            يدويًا للتوثيق.
          </p>
        )}
    </div>
  );
}

export default MedicationSchedule;
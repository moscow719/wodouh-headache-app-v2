import { useEffect, useRef, useState } from 'react';
import {
  saveMedication,
  getMedications,
} from '../utils/storage';

const MAX_NAME_LENGTH = 100;
const MAX_DOSE_LENGTH = 100;
const MAX_VISIBLE_MEDICATIONS = 8;

function formatDate(isoDate) {
  if (typeof isoDate !== 'string' || !isoDate) {
    return 'تاريخ غير متاح';
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return 'تاريخ غير صالح';
  }

  return date.toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isValidMedication(item) {
  return (
    item &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    (item.id === undefined ||
      typeof item.id === 'string') &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0 &&
    item.name.trim().length <=
      MAX_NAME_LENGTH &&
    (item.dose === undefined ||
      item.dose === null ||
      (typeof item.dose === 'string' &&
        item.dose.trim().length <=
          MAX_DOSE_LENGTH)) &&
    typeof item.taken_at === 'string' &&
    !Number.isNaN(
      new Date(item.taken_at).getTime()
    )
  );
}

function sortMedications(items) {
  return [...items].sort(
    (a, b) =>
      new Date(b.taken_at).getTime() -
      new Date(a.taken_at).getTime()
  );
}

function MedicationTracker() {
  const [medications, setMedications] =
    useState([]);

  const [name, setName] =
    useState('');

  const [dose, setDose] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [savedMessage, setSavedMessage] =
    useState(false);

  const successTimeoutRef =
    useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMedications() {
      try {
        const data =
          await getMedications();

        if (!Array.isArray(data)) {
          throw new Error(
            'Invalid medications data'
          );
        }

        const validMedications =
          sortMedications(
            data.filter(
              isValidMedication
            )
          );

        if (!isMounted) {
          return;
        }

        setMedications(
          validMedications
        );
        setError(null);
      } catch (err) {
        console.error(
          'Failed to load medications:',
          err
        );

        if (isMounted) {
          setError(
            'تعذر تحميل سجل الأدوية. من فضلك حاول مرة أخرى.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadMedications();

    return () => {
      isMounted = false;

      if (
        successTimeoutRef.current
      ) {
        window.clearTimeout(
          successTimeoutRef.current
        );
      }
    };
  }, []);

  async function refreshMedications() {
    const data =
      await getMedications();

    if (!Array.isArray(data)) {
      throw new Error(
        'Invalid medications data'
      );
    }

    return sortMedications(
      data.filter(
        isValidMedication
      )
    );
  }

  async function handleAdd() {
    if (saving) {
      return;
    }

    const normalizedName =
      name.trim();

    const normalizedDose =
      dose.trim();

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

    if (
      normalizedDose.length >
      MAX_DOSE_LENGTH
    ) {
      setError(
        `بيانات الجرعة طويلة جدًا. الحد الأقصى ${MAX_DOSE_LENGTH} حرف.`
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSavedMessage(false);

    try {
      await saveMedication(
        normalizedName,
        normalizedDose
      );

      setName('');
      setDose('');
      setSavedMessage(true);

      if (
        successTimeoutRef.current
      ) {
        window.clearTimeout(
          successTimeoutRef.current
        );
      }

      successTimeoutRef.current =
        window.setTimeout(() => {
          setSavedMessage(false);
          successTimeoutRef.current =
            null;
        }, 4000);

      try {
        const refreshed =
          await refreshMedications();

        setMedications(
          refreshed
        );
      } catch (refreshError) {
        console.error(
          'Medication saved but refresh failed:',
          refreshError
        );

        setError(
          'تم تسجيل الدواء، لكن تعذر تحديث السجل المعروض. أعد تحميل الصفحة للمحاولة مرة أخرى.'
        );
      }
    } catch (err) {
      console.error(
        'Failed to save medication:',
        err
      );

      setError(
        'تعذر تسجيل الدواء. من فضلك حاول مرة أخرى.'
      );
    } finally {
      setSaving(false);
    }
  }

  const recentMedications =
    medications.filter(
      (medication) => {
        const takenAt =
          new Date(
            medication.taken_at
          ).getTime();

        if (
          !Number.isFinite(
            takenAt
          )
        ) {
          return false;
        }

        const hoursSince =
          (Date.now() - takenAt) /
          (1000 * 60 * 60);

        return (
          hoursSince >= 0 &&
          hoursSince <= 24
        );
      }
    );

  const last24hCount =
    recentMedications.length;

  return (
    <div className="card medication-tracker">
      <h3 style={{ marginTop: 0 }}>
        <span
          aria-hidden="true"
        >
          💊
        </span>{' '}
        متتبع الأدوية
      </h3>

      <p className="muted-text">
        سجّل الأدوية اللي بتستخدمها
        عشان تراجع سجل الاستخدام بمرور
        الوقت وتقدر تعرضه على طبيبك أو
        الصيدلي.
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

      <div className="medication-form">
        <label htmlFor="medication-name">
          اسم الدواء
        </label>

        <input
          id="medication-name"
          type="text"
          placeholder="مثال: إيبوبروفين"
          value={name}
          onChange={(event) => {
            setName(
              event.target.value.slice(
                0,
                MAX_NAME_LENGTH
              )
            );
            setSavedMessage(false);
            setError(null);
          }}
          className="auth-input"
          maxLength={
            MAX_NAME_LENGTH
          }
          autoComplete="off"
          disabled={saving}
        />

        <label
          htmlFor="medication-dose"
          style={{ marginTop: 10 }}
        >
          الجرعة
        </label>

        <input
          id="medication-dose"
          type="text"
          placeholder="اختياري، مثال: 400 مج"
          value={dose}
          onChange={(event) => {
            setDose(
              event.target.value.slice(
                0,
                MAX_DOSE_LENGTH
              )
            );
            setSavedMessage(false);
            setError(null);
          }}
          className="auth-input"
          maxLength={
            MAX_DOSE_LENGTH
          }
          autoComplete="off"
          disabled={saving}
          aria-describedby="medication-dose-help"
        />

        <p
          id="medication-dose-help"
          className="muted-text"
          style={{ marginTop: 6 }}
        >
          الجرعة اختيارية للتوثيق فقط،
          ومش بيتم التحقق هنا من كونها
          مناسبة ليك.
        </p>

        <button
          type="button"
          className="btn primary"
          onClick={handleAdd}
          disabled={
            saving ||
            !name.trim()
          }
          aria-busy={saving}
        >
          {saving
            ? 'جارٍ الحفظ...'
            : '+ تسجيل استخدام'}
        </button>
      </div>

      {savedMessage && (
        <p
          className="specialty-box"
          style={{ marginTop: 12 }}
          role="status"
          aria-live="polite"
        >
          تم تسجيل استخدام الدواء
          بنجاح.
        </p>
      )}

      {last24hCount > 0 && (
        <div
          className="medication-note"
          style={{ marginTop: 16 }}
          role="note"
        >
          سجّلت {last24hCount} عملية
          استخدام خلال آخر 24 ساعة.
          العدد وحده ما يكفيش للحكم على
          أمان الاستخدام؛ ده بيختلف حسب
          الدواء والتركيز والجرعة الموصوفة
          وحالتك الصحية.
        </div>
      )}

      <div
        className="medication-note"
        style={{ marginTop: 12 }}
        role="note"
      >
        مهم: السجل ده للتوثيق والمتابعة
        فقط. التطبيق مش بيحدد الجرعة
        المناسبة ومش بيقيّم التفاعلات
        الدوائية. لو مش متأكد من الجرعة،
        أو بتستخدم أكتر من دواء، اسأل
        طبيبًا أو صيدليًا قبل تعديل
        الاستخدام.
      </div>

      {loading && (
        <p
          className="muted-text"
          style={{ marginTop: 16 }}
          role="status"
          aria-live="polite"
        >
          جارٍ تحميل سجل الأدوية...
        </p>
      )}

      {!loading &&
        medications.length === 0 && (
          <p
            className="muted-text"
            style={{ marginTop: 16 }}
          >
            مفيش أدوية مسجلة لسه.
          </p>
        )}

      {!loading &&
        medications.length > 0 && (
          <ul className="medication-list">
            {medications
              .slice(
                0,
                MAX_VISIBLE_MEDICATIONS
              )
              .map(
                (
                  medication,
                  index
                ) => {
                  const cleanName =
                    medication.name.trim();

                  const cleanDose =
                    typeof medication.dose ===
                      'string'
                      ? medication.dose.trim()
                      : '';

                  const key =
                    typeof medication.id ===
                      'string' &&
                    medication.id
                      ? medication.id
                      : `${medication.taken_at}-${cleanName}-${index}`;

                  return (
                    <li key={key}>
                      <span>
                        {cleanName}
                        {cleanDose
                          ? ` — ${cleanDose}`
                          : ''}
                      </span>

                      <span className="muted-text">
                        {formatDate(
                          medication.taken_at
                        )}
                      </span>
                    </li>
                  );
                }
              )}
          </ul>
        )}

      {!loading &&
        medications.length >
          MAX_VISIBLE_MEDICATIONS && (
          <p
            className="muted-text"
            style={{ marginTop: 12 }}
          >
            بيتم عرض آخر{' '}
            {MAX_VISIBLE_MEDICATIONS}{' '}
            تسجيلات فقط.
          </p>
        )}
    </div>
  );
}

export default MedicationTracker;